'use strict';

const Service = require('egg').Service;
const {
  assemblyReqParams,
  assemblyPenalty,
  integratePrice,
} = require('../public/segment');
const { analysisPrice, filterByFlightNo } = require('../public/analysis');
const { priceChange } = require('../public/shopping');
const timeHelper = require('../extend/time');

class ShoppingService extends Service {
  async getShoppingList(payload) {
    const { ctx, app } = this;
    /*
    flightType: OW / RT
    cabinType：E/B
    currency: HKD
    passenger: TPassenger[],
              name: string,
              count: number,
              flag: ADT / CHD / INF
    tripSearch: TTripSearch[]  单程和往返  length=1，多程>1
               depart: string,
               arrive: string,
               departTime: string
    */

    const { flightType, cabinType, passenger, tripSearch, currency } = payload;

    const redisCode = assemblyReqParams(flightType, tripSearch);

    /**
     * 服务最终返回报文
     */
    const flightDetailList = await ctx.service.segment.analysisGDSSchema(
      flightType,
      passenger,
      redisCode,
      currency,
      cabinType
    );

    /** 汇率部分-Start */
    let cnyRate = await app.redis.get('db2').smembers(`CNY2${currency}`);
    if (cnyRate && cnyRate.length > 0) {
      cnyRate = cnyRate[0];
    } else {
      cnyRate = 1;
    }
    /** 汇率部分-End */

    for (let i = 0; i < flightDetailList.length; i++) {
      const flightDetail = flightDetailList[i];

      /**
       * 扣率处理
       */
      await ctx.service.profit.analysisProfit(
        flightType,
        tripSearch,
        flightDetail,
        cnyRate,
        passenger
      );

      /**
       * 退改处理
       */
      await ctx.service.penalty.analysisPenalty(
        flightType,
        tripSearch,
        flightDetail
      );
    }

    /**
     * 判断是否有相同运价
     * 后续再处理 TODO
     */
    if (new Set(flightDetailList).size !== flightDetailList.length) {
      console.log('有相同的元素--------Yes');
    } else {
      console.log('没有相同的元素------No');
    }
    return filterByFlightNo(flightDetailList);
  }

  /**
   * 存储商品数据
   * @param {*} flightDetailList
   */
  async saveShoppingInfo(flightDetailList, sessionId) {
    flightDetailList.forEach(async shoppingInfo => {
      await this.ctx.model.Shopping.create({
        shoppingId: shoppingInfo.shoppingId,
        currency: shoppingInfo.currency,
        policyInfo: JSON.stringify(shoppingInfo.policyInfo),
        sessionId,
        redisCode: shoppingInfo.redisCode,
        redisSchema: shoppingInfo.redisSchema,
        deepLink: shoppingInfo.deeplink,
        createDateTime: timeHelper.nowDateTime(),
      });

      await this.ctx.model.Price.create({
        shoppingId: shoppingInfo.shoppingId,
        priceId: shoppingInfo.policyDetailInfo.priceId,
        adultPrice: JSON.stringify(shoppingInfo.policyDetailInfo.adultPrice),
        childPrice: JSON.stringify(shoppingInfo.policyDetailInfo.childPrice),
        infantPrice: JSON.stringify(shoppingInfo.policyDetailInfo.infantPrice),
        avgPrice: shoppingInfo.policyDetailInfo.avgPrice,
        totalPrice: shoppingInfo.policyDetailInfo.totalPrice,
        ticketDeadlineType: shoppingInfo.policyDetailInfo.ticketDeadlineType,
      });

      shoppingInfo.flightGroupInfoList.forEach(async flightInfo => {
        await this.ctx.model.Flight.create({
          shoppingId: shoppingInfo.shoppingId,
          flightId: flightInfo.flightId,
          arriveMultCityName: flightInfo.arriveMultCityName,
          departMultCityName: flightInfo.departMultCityName,
          arriveDateTimeFormat: flightInfo.arriveDateTimeFormat,
          departDateTimeFormat: flightInfo.departDateTimeFormat,
          duration: JSON.stringify(flightInfo.duration),
        });

        flightInfo.flightSegments.forEach(async segmentInfo => {
          await this.ctx.model.Segment.create({
            flightId: flightInfo.flightId,
            shoppingId: shoppingInfo.shoppingId,
            segmentId: segmentInfo.segmentId,
            aDateTime: segmentInfo.aDateTime,
            dDateTime: segmentInfo.dDateTime,
            dCityInfo: JSON.stringify(segmentInfo.dCityInfo),
            aCityInfo: JSON.stringify(segmentInfo.aCityInfo),
            dPortInfo: JSON.stringify(segmentInfo.dPortInfo),
            aPortInfo: JSON.stringify(segmentInfo.aPortInfo),
            acrossDays: segmentInfo.acrossDays,
            airlineInfo: JSON.stringify(segmentInfo.airlineInfo),
            craftInfo: JSON.stringify(segmentInfo.craftInfo),
            cabinClass: segmentInfo.cabinClass,
            subClass: segmentInfo.subClass,
            durationInfo: JSON.stringify(segmentInfo.durationInfo),
            transferDurationInfo: JSON.stringify(
              segmentInfo.transferDurationInfo
            ),
            flightNo: segmentInfo.flightNo,
            segmentNo: segmentInfo.segmentNo,
            fareBasisCode: segmentInfo.fareBasisCode,
            IPCC: segmentInfo.IPCC,
          });
        });
      });
    });
  }

  async getShoppingInfo(payload) {
    const ctx = this.ctx;
    const { shoppingId, passenger = null } = payload;

    let shoppingInfo = await ctx.model.Shopping.aggregate([
      {
        $lookup: {
          from: 'flight',
          localField: 'shoppingId',
          foreignField: 'shoppingId',
          as: 'flightGroupInfoList',
        },
      },
      {
        $lookup: {
          from: 'price',
          localField: 'shoppingId',
          foreignField: 'shoppingId',
          as: 'policyDetailInfo',
        },
      },
      {
        $match: {
          shoppingId,
        },
      },
    ]);

    if (shoppingInfo.length > 0) {
      shoppingInfo = shoppingInfo[0];
      if (
        shoppingInfo.policyDetailInfo &&
        shoppingInfo.policyDetailInfo.length > 0
      ) {
        shoppingInfo.policyDetailInfo = shoppingInfo.policyDetailInfo[0];
      }
      if (shoppingInfo.policyInfo) {
        shoppingInfo.policyInfo = JSON.parse(shoppingInfo.policyInfo);
      }
    } else {
      return null;
    }

    const priceKeyList = [ 'adultPrice', 'childPrice', 'infantPrice' ];

    priceKeyList.forEach(key => {
      if (
        shoppingInfo.policyDetailInfo &&
        shoppingInfo.policyDetailInfo[key] &&
        shoppingInfo.policyDetailInfo[key] !== 'null'
      ) {
        shoppingInfo.policyDetailInfo[key] = JSON.parse(
          shoppingInfo.policyDetailInfo[key]
        );
      }
    });

    // 总价和平均价计算逻辑
    if (passenger) {
      const priceInfo = {
        adtBase: '',
        adtTaxes: '',
        chdBase: '',
        chdTaxes: '',
        infBase: '',
        infTaxes: '',
      };

      const { adultPrice, childPrice, infantPrice } =
        shoppingInfo.policyDetailInfo;
      priceInfo.adtBase = adultPrice.salePrice;
      priceInfo.adtTaxes = adultPrice.tax;
      priceInfo.chdBase = childPrice.salePrice;
      priceInfo.chdTaxes = childPrice.tax;
      priceInfo.infBase = infantPrice.salePrice;
      priceInfo.infTaxes = infantPrice.tax;

      const integratePriceResult = integratePrice(priceInfo, passenger);
      shoppingInfo.policyDetailInfo.avgPrice = Number(
        integratePriceResult.avgPrice
      );
      shoppingInfo.policyDetailInfo.totalPrice = Number(
        integratePriceResult.totalPrice
      );

      await this.ctx.model.Price.findByIdAndUpdate(
        shoppingInfo.policyDetailInfo._id,
        {
          avgPrice: shoppingInfo.policyDetailInfo.avgPrice,
          totalPrice: shoppingInfo.policyDetailInfo.totalPrice,
        }
      );
    }

    for (let i = 0; i < shoppingInfo.flightGroupInfoList.length; i++) {
      const segmentList = await ctx.model.Segment.aggregate([
        {
          $match: {
            flightId: shoppingInfo.flightGroupInfoList[i].flightId,
          },
        },
      ]);

      const segKeyList = [
        'dCityInfo',
        'aCityInfo',
        'dPortInfo',
        'aPortInfo',
        'airlineInfo',
        'craftInfo',
        'durationInfo',
        'transferDurationInfo',
      ];
      segmentList.forEach(seg => {
        segKeyList.forEach(key => {
          if (seg[key] != 'null') {
            seg[key] = JSON.parse(seg[key]);
          }
        });
      });
      shoppingInfo.flightGroupInfoList[i].duration = JSON.parse(
        shoppingInfo.flightGroupInfoList[i].duration
      );
      shoppingInfo.flightGroupInfoList[i].flightSegments = segmentList;
    }

    return shoppingInfo;
  }

  async getShoppingListByRedisKey(redisCode, currency = 'HKD') {
    const { ctx } = this;
    const flightType = redisCode.length > 10 ? 'RT' : 'OW';
    const passenger = [
      { name: 'Adult', count: 1, flag: 'ADT' },
      { name: 'Children', count: 0, flag: 'CHD' },
      { name: 'Infants', count: 0, flag: 'INF' },
    ];
    /**
     * 服务最终返回报文
     */
    const flightDetailList = await ctx.service.segment.analysisGDSSchema(
      flightType,
      passenger,
      redisCode,
      currency,
      'E'
    );
    return flightDetailList;
  }

  async checkShoppingSchema(
    redisCode,
    redisSchema,
    currency,
    shoppingId,
    priceId,
    passengerList
  ) {
    // 1855-0130-BA-8753-E&O-BHD-T0-LCY-T0-0-E90|89.00-79.08-89.00-47.58-89.00-47.58|1/1/60-GBP$1/1/60-GBP$1/1/60-GBP
    // @
    // 1440-0125-BA-1414-E&O-LHR-T5-BHD-T0-0-319|89.00-79.08-89.00-47.58-89.00-47.58|1/1/60-GBP$1/1/60-GBP$1/1/60-GBP,

    const { ctx, app, service } = this;

    /** Redis库名 */
    let redisDBName = 'db0';
    if (redisCode.length > 10) {
      redisDBName = 'db1';
    }

    const checkResult = {
      redisSchema,
      /** -1 售完; 0 没有变价; 1 变价 */
      verifyResult: 0,
      priceInfo: {},
      penalty: [],
    };
    let isPriceChange = false;
    let isPenaltyChange = false;

    const penaltyConfig = await service.info.getConfig('penalty');

    /** redis查询结果集 */
    const schemaList = await app.redis.get(redisDBName).smembers(redisCode);

    if (!schemaList || schemaList.length === 0) {
      checkResult.verifyResult = -1;
      ctx.logger.info('schemaList is null');
      return checkResult;
    }

    const currencyRedisCode = 'EUR2' + currency;
    let currencyRate = await app.redis.get('db2').smembers(currencyRedisCode);
    if (currencyRate && currencyRate.length > 0) {
      currencyRate = currencyRate[0];
    } else {
      checkResult.verifyResult = -1;
      ctx.logger.info('currencyRate is null');
      return checkResult;
    }

    /**
     * 单程多个匹配：舱位问题
     * 多次多个匹配：组合问题，需要组合去看
     */

    const currentSchemaList = redisSchema.split('@');

    const priceChange = (schema, curSchema) => {
      const priceSchema = schema.split('|')[1];
      const curPriceSchema = curSchema.split('|')[1];

      if (priceSchema !== curPriceSchema) {
        isPriceChange = 1;
        const analysisPriceResult = analysisPrice(priceSchema, currencyRate);
        const adtCount =
          passengerList.filter(p => p.flag === 'ADT').length > 0
            ? passengerList.filter(p => p.flag === 'ADT')[0].count
            : 0;
        const chdCount =
          passengerList.filter(p => p.flag === 'CHD').length > 0
            ? passengerList.filter(p => p.flag === 'CHD')[0].count
            : 0;
        const infCount =
          passengerList.filter(p => p.flag === 'INF').length > 0
            ? passengerList.filter(p => p.flag === 'INF')[0].count
            : 0;
        const totalPrice = (
          parseFloat(
            Number(analysisPriceResult.adtBase) +
              Number(analysisPriceResult.adtTaxes)
          ) *
            adtCount +
          parseFloat(
            Number(analysisPriceResult.chdBase) +
              Number(analysisPriceResult.chdTaxes)
          ) *
            chdCount +
          parseFloat(
            Number(analysisPriceResult.infBase) +
              Number(analysisPriceResult.infTaxes)
          ) *
            infCount
        ).toFixed(0);

        const avgPrice = (
          totalPrice /
          (adtCount + chdCount + infCount)
        ).toFixed(0);

        checkResult.priceInfo = {
          adultPrice: {
            salePrice: analysisPriceResult.adtBase,
            tax: analysisPriceResult.adtTaxes,
          },
          childPrice: {
            salePrice: analysisPriceResult.chdBase,
            tax: analysisPriceResult.chdTaxes,
          },
          infantPrice: {
            salePrice: analysisPriceResult.infBase,
            tax: analysisPriceResult.infTaxes,
          },
          avgPrice,
          totalPrice,
        };
      }
    };

    const penaltyChange = (schema, curSchema) => {
      const penaltyInfoList = [];
      if (penaltyConfig === 'default' || penaltyConfig === 'price') {
        /** 默认情况下，由于没有GDS字符，不走变更比较逻辑 */
        return;
      }
      const penaltySchema = schema.split('|')[2];
      const curPenaltySchema = curSchema.split('|')[2];

      if (penaltySchema !== curPenaltySchema) {
        isPenaltyChange = 1;

        assemblyPenalty(penaltyInfoList, penaltySchema, currencyRate);
        checkResult.penalty = penaltyInfoList;
      }
    };

    const diff = (schemaList, curSchema) => {
      const curFlightSchema = curSchema.split('|')[0];
      let diffSchema = '';
      for (let i = 0; i < schemaList.length; i++) {
        const schema = schemaList[i];
        if (schema.includes(curFlightSchema)) {
          priceChange(schema, curSchema);
          penaltyChange(schema, curSchema);
          diffSchema = schema;
          break;
        }
      }

      return diffSchema;
    };

    const contain = (list, str) => {
      return list.filter(o => o.includes(str)).length > 0;
    };

    if (currentSchemaList.length > 1) {
      // 往返

      const fwtSchemaList = schemaList.filter(s => s.includes('FWT'));
      const bwtSchemaList = schemaList.filter(s => s.includes('BWT'));

      if (
        contain(fwtSchemaList, currentSchemaList[0]) &&
        contain(bwtSchemaList, currentSchemaList[1])
      ) {
        return checkResult;
      }
      const diffFWTSchema = diff(fwtSchemaList, currentSchemaList[0]);
      if (diffFWTSchema === '') {
        checkResult.verifyResult = -1;
        ctx.logger.info('currencyRate is null');
        return checkResult;
      }
      /** 去程和回程价格行李额一致，无需再分析 */
      const number = diffFWTSchema.split('FWT')[1].split('#')[0];
      const bwtSchema =
        bwtSchemaList.filter(s => s.includes('BWT' + number + '#')).length > 0
          ? bwtSchemaList.filter(s => s.includes('BWT' + number + '#'))[0]
          : '';
      // change(bwtSchema, currentSchemaList[1]);

      const profitInfo = await service.info.getProfit({
        flightType: 'RT',
        segment: redisCode.substring(4, 10), // redisCode.substr(4, 6),
        company: '',
        cabin: '',
        date: redisCode.substring(0, 4) + '|' + redisCode.substring(10, 14),
      });

      const matchPercent = await service.profit.matchProfit(
        profitInfo,
        diffFWTSchema.split('-')[3] + '|' + bwtSchema.split('-')[3],
        diffFWTSchema.split('-')[2] + '|' + bwtSchema.split('-')[2],
        diffFWTSchema.split('-')[4].split('&')[1] +
          '|' +
          bwtSchema.split('-')[4].split('&')[1]
      );
      checkResult.priceInfo = await service.profit.profitPrice(
        matchPercent,
        checkResult.priceInfo
      );
    } else {
      // 单程
      if (contain(schemaList, currentSchemaList[0])) {
        return checkResult;
      }
      const diffSchema = diff(schemaList, currentSchemaList[0]);
      if (diffSchema === '') {
        checkResult.verifyResult = -1;
        ctx.logger.info('currencyRate is null');
        return checkResult;
      }
      const profitInfo = await service.info.getProfit({
        flightType: 'OW',
        segment: redisCode.substring(4, 10), // redisCode.substr(4, 6),
        company: '',
        cabin: '',
        date: redisCode.substring(0, 4),
      });

      const matchPercent = await service.profit.matchProfit(
        profitInfo,
        redisSchema.split('-')[3],
        redisSchema.split('-')[2],
        redisSchema.split('-')[4].split('&')[1]
      );
      checkResult.priceInfo = await service.profit.profitPrice(
        matchPercent,
        checkResult.priceInfo
      );
    }

    checkResult.verifyResult =
      (isPriceChange || isPenaltyChange) === true
        ? 1
        : checkResult.verifyResult;
    if (checkResult.verifyResult === 1) {
      let shoppingInfo = await ctx.model.Shopping.findOne({
        shoppingId,
      });

      shoppingInfo = JSON.parse(JSON.stringify(shoppingInfo));

      shoppingInfo.redisSchema = checkResult.redisSchema;

      if (isPenaltyChange) {
        shoppingInfo.policyInfo = JSON.parse(shoppingInfo.policyInfo);
        shoppingInfo.policyInfo.penaltyInfoList = checkResult.penalty;
        shoppingInfo.policyInfo = JSON.stringify(shoppingInfo.policyInfo);
      }

      await ctx.model.Shopping.findOneAndUpdate(
        {
          shoppingId,
        },
        shoppingInfo
      );

      if (isPriceChange) {
        checkResult.priceInfo.adultPrice = JSON.stringify(
          checkResult.priceInfo.adultPrice
        );
        checkResult.priceInfo.childPrice = JSON.stringify(
          checkResult.priceInfo.childPrice
        );
        checkResult.priceInfo.infantPrice = JSON.stringify(
          checkResult.priceInfo.infantPrice
        );

        await ctx.model.Price.findOneAndUpdate(
          {
            priceId,
          },
          checkResult.priceInfo
        );
      }
    }

    return checkResult;
  }

  async checkShopping(
    redisCode,
    redisSchema,
    currency,
    shoppingId,
    priceId,
    passengerList
  ) {
    const { ctx, app, service } = this;
    const checkResult = {
      redisSchema,
      /** -1 售完; 0 没有变价; 1 变价 */
      verifyResult: 0,
      priceInfo: {},
      penalty: [],
      isPriceChange: false,
      isPenaltyChange: false,
    };
    /** Redis库名 */
    let redisDBName = 'db0';
    if (redisCode.length > 10) {
      redisDBName = 'db1';
    }
    /** redis查询结果集 */
    const schemaList = await app.redis.get(redisDBName).smembers(redisCode);

    if (!schemaList || schemaList.length === 0) {
      checkResult.verifyResult = -1;
      return checkResult;
    }

    const firstSchemaLen = redisSchema.split('|')[0].split('-').length;
    const fareBasisCode = redisSchema.split('|')[0].split('-')[
      firstSchemaLen - 4
    ];
    /** 确认是否售罄 */
    const isSaleOut =
      schemaList.filter(o => o.includes(fareBasisCode)).length == 0; // 如果不包含fareBasisCode，说明售罄
    if (isSaleOut) {
      checkResult.verifyResult = -1;
      return checkResult;
    }
    return checkResult;
  }

  /**
   * 变更乘机人引起变价
   * @param {*} priceId
   * @param {*} changePassenger
   * @return
   */
  async changePrice(priceId, changePassenger) {
    const { ctx } = this;
    let priceInfo = await ctx.model.Price.findOne({
      priceId,
    });
    if (!priceInfo) return null;

    priceInfo = JSON.parse(JSON.stringify(priceInfo));

    let { adultPrice, childPrice, infantPrice } = priceInfo;
    adultPrice = JSON.parse(adultPrice);
    childPrice = JSON.parse(childPrice);
    infantPrice = JSON.parse(infantPrice);

    const getPsgCount = (passengerList, psgType) => {
      return passengerList.filter(p => p.flag === psgType).length > 0
        ? passengerList.filter(p => p.flag === psgType)[0].count
        : 0;
    };

    const changeAdtCount = getPsgCount(changePassenger, 'ADT');
    const changeChdCount = getPsgCount(changePassenger, 'CHD');
    const changeInfCount = getPsgCount(changePassenger, 'INF');

    priceInfo.totalPrice = (
      (Number(adultPrice.salePrice) + Number(adultPrice.tax)) * changeAdtCount +
      (Number(childPrice.salePrice) + Number(childPrice.tax)) * changeChdCount +
      (Number(infantPrice.salePrice) + Number(infantPrice.tax)) * changeInfCount
    ).toFixed(0);

    priceInfo.avgPrice = (
      priceInfo.totalPrice /
      (changeAdtCount + changeChdCount + changeInfCount)
    ).toFixed(0);

    await ctx.model.Price.findOneAndUpdate(
      {
        priceId,
      },
      priceInfo
    );

    priceInfo.adultPrice = JSON.parse(priceInfo.adultPrice);
    priceInfo.childPrice = JSON.parse(priceInfo.childPrice);
    priceInfo.infantPrice = JSON.parse(priceInfo.infantPrice);

    return priceInfo;
  }

  async changeCurrency(shoppingId, priceId, changePassenger, currency) {
    const { ctx, app } = this;

    let shoppingInfo = await ctx.model.Shopping.findOne({
      shoppingId,
    });
    shoppingInfo = JSON.parse(JSON.stringify(shoppingInfo));
    const originCurrency = shoppingInfo.currency;

    if (shoppingInfo.policyInfo) {
      shoppingInfo.policyInfo = JSON.parse(shoppingInfo.policyInfo);
    }
    const penaltyInfoList = shoppingInfo.policyInfo.penaltyInfoList;
    let priceInfo = await ctx.model.Price.findOne({
      priceId,
    });
    priceInfo = JSON.parse(JSON.stringify(priceInfo));
    if (currency === originCurrency) {
      return priceInfo;
    }

    /** 汇率部分-Start */
    const currencyRedisCode = `${originCurrency}2${currency}`;
    let currencyRate = null;
    currencyRate = await app.redis.get('db2').smembers(currencyRedisCode);
    if (currencyRate && currencyRate.length > 0) {
      currencyRate = currencyRate[0];
    } else {
      ctx.logger.info('changeCurrency error');
      return {};
    }

    const currencyChangePrice = personPriceInfo => {
      personPriceInfo = JSON.parse(personPriceInfo);
      personPriceInfo.salePrice = Number(
        (Number(personPriceInfo.salePrice) * Number(currencyRate)).toFixed(0)
      );
      personPriceInfo.tax = Number(
        (Number(personPriceInfo.tax) * Number(currencyRate)).toFixed(0)
      );
      return personPriceInfo;
    };

    let { adultPrice, childPrice, infantPrice } = priceInfo;
    adultPrice = currencyChangePrice(adultPrice);
    childPrice = currencyChangePrice(childPrice);
    infantPrice = currencyChangePrice(infantPrice);

    const getPsgCount = (passengerList, psgType) => {
      return passengerList.filter(p => p.flag === psgType).length > 0
        ? passengerList.filter(p => p.flag === psgType)[0].count
        : 0;
    };

    const changeAdtCount = getPsgCount(changePassenger, 'ADT');
    const changeChdCount = getPsgCount(changePassenger, 'CHD');
    const changeInfCount = getPsgCount(changePassenger, 'INF');

    priceInfo.totalPrice = Number(
      (
        (Number(adultPrice.salePrice) + Number(adultPrice.tax)) *
          changeAdtCount +
        (Number(childPrice.salePrice) + Number(childPrice.tax)) *
          changeChdCount +
        (Number(infantPrice.salePrice) + Number(infantPrice.tax)) *
          changeInfCount
      ).toFixed(0)
    );

    priceInfo.avgPrice = Number(
      (
        priceInfo.totalPrice /
        (changeAdtCount + changeChdCount + changeInfCount)
      ).toFixed(0)
    );

    priceInfo.adultPrice = JSON.stringify(adultPrice);
    priceInfo.childPrice = JSON.stringify(childPrice);
    priceInfo.infantPrice = JSON.stringify(infantPrice);

    const penaltyCurrencyChangePrice = personList => {
      personList.forEach(a => {
        a.specialText = (Number(a.specialText) * Number(currencyRate))
          .toFixed(0)
          .toString();
      });
      return personList;
    };

    const penaltyInfoKey = [ 'cancelInfo', 'changeInfo' ];
    // penaltyPersonKey = ['adultList','childList','infantList']
    penaltyInfoList.forEach(p => {
      penaltyInfoKey.forEach(k => {
        const { adultList, childList, infantList } = p[k].formatted;
        penaltyCurrencyChangePrice(adultList);
        penaltyCurrencyChangePrice(childList);
        penaltyCurrencyChangePrice(infantList);
      });
    });

    await ctx.model.Price.findOneAndUpdate(
      {
        priceId,
      },
      priceInfo
    );

    shoppingInfo.currency = currency;
    shoppingInfo.policyInfo = JSON.stringify(shoppingInfo.policyInfo);
    await ctx.model.Shopping.findOneAndUpdate(
      {
        shoppingId,
      },
      shoppingInfo
    );

    priceInfo.adultPrice = adultPrice;
    priceInfo.childPrice = childPrice;
    priceInfo.infantPrice = infantPrice;

    return { priceInfo, penaltyInfoList };
  }
}

module.exports = ShoppingService;
