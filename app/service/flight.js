'use strict';

const Service = require('egg').Service;
const { assemblyReqParams, assemblyFlight } = require('../public/segment');
const { filterByFlightNo } = require('../public/analysis');
const timeHelper = require('../extend/time');
const { getRandomCacheMachine } = require('../extend/utils');

class FlightService extends Service {
  async getFlightInfoList(payload) {
    const { service } = this;
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
    const flightList = await service.segment.analysisGDSSchema(
      flightType,
      passenger,
      redisCode,
      currency,
      cabinType
    );

    return flightList;
  }

  /**
   * redisSchema生成flightGroupInfoList
   *
   * @param {*} flightType
   * @param {*} redisSchema
   * @param {*} departTime
   * @param {*} returnTime
   * @return {*}
   * @memberof FlightService
   */
  async generateFlightInfo(flightType, redisSchema, departTime, returnTime) {
    try {
      /** 出发日期 */
      departTime = departTime.substr(4, 4);
      /** 航班 */
      const flightGroupInfoList = [];

      if (flightType === 'OW') {
        /** 航段字符串 */
        const segmentSchema = redisSchema.split('|')[0];

        flightGroupInfoList.push(assemblyFlight(segmentSchema, departTime));
      } else {
        /** 返程日期 */
        returnTime = returnTime.substr(4, 4);

        const fwtSegmentSchema = redisSchema.split('@')[0].split('|')[0];
        const bwtSegmentSchema = redisSchema.split('@')[1].split('|')[0];

        flightGroupInfoList.push(assemblyFlight(fwtSegmentSchema, departTime));
        flightGroupInfoList.push(assemblyFlight(bwtSegmentSchema, returnTime));
      }
      return flightGroupInfoList;
    } catch (e) {
      this.service.trace.createTrace({
        traceType: 'error',
        dateTime: timeHelper.nowDateTime(),
        pageType: 'book',
        api: 'generateFlightInfo',
        content: `input:${redisSchema},error:${e.message}`,
      });
    }
  }

  async getPolicy(flightList, payload, group) {
    const { service, app } = this;
    const { flightType, passenger, tripSearch, currency } = payload;

    /** 汇率部分-Start */
    let cnyRate = await app.redis.get('db2').smembers(`CNY2${currency}`);
    if (cnyRate && cnyRate.length > 0) {
      cnyRate = cnyRate[0];
    } else {
      cnyRate = 1;
    }
    /** 汇率部分-End */

    for (let i = 0; i < flightList.length; i++) {
      const flightDetail = flightList[i];

      /**
       * 扣率处理
       */
      await service.profit.analysisProfit(
        flightType,
        tripSearch,
        flightDetail,
        cnyRate,
        passenger,
        group
      );

      /**
       * 退改处理
       */
      await service.penalty.analysisPenalty(
        flightType,
        tripSearch,
        flightDetail,
        group
      );
    }
    return filterByFlightNo(flightList);
  }

  async matchPolicy(flightList, payload, group, IPCC) {
    const { service, app } = this;
    const { flightType, passenger, tripSearch, currency } = payload;

    /** 汇率部分-Start */
    let cnyRate = await app.redis.get('db2').smembers(`CNY2${currency}`);
    if (cnyRate && cnyRate.length > 0) {
      cnyRate = cnyRate[0];
    } else {
      cnyRate = 1;
    }
    /** 汇率部分-End */

    /**
     * 航线符合的行李额
     */
    const allBaggageInfoList = await this.service.baggage.getBaggageInfoList({
      flightType,
      from: tripSearch[0].depart,
      to: tripSearch[0].arrive,
    });

    for (let i = 0; i < flightList.length; i++) {
      const flightDetail = flightList[i];
      /**
       * 扣率处理
       */
      await service.profit.analysisProfit(
        flightType,
        tripSearch,
        flightDetail,
        cnyRate,
        passenger,
        group
      );
      /**
       * 退改处理
       */
      await service.penalty.analysisPenalty(
        flightType,
        tripSearch,
        flightDetail,
        group
      );
      /**
       * 行李额处理
       */
      const baggageInfo = service.baggage.generateBaggageInfo(
        allBaggageInfoList,
        flightDetail,
        group,
        IPCC
      );
      flightDetail.policyInfo.baggageInfoList = baggageInfo;
    }
    return flightList;
  }

  async refreshFlightCache(tripSearch, isAsync = true, IPCC) {
    // 判断tripSearch存在，并且是数组
    if (!tripSearch || !Array.isArray(tripSearch)) {
      return null;
    }

    tripSearch.forEach(trip => {
      trip.from = trip.depart;
      trip.to = trip.arrive;
      trip.departureDate = trip.departTime;
    });

    if (isAsync) {
      try {
        this.ctx.curl(getRandomCacheMachine() + ':9001/check', {
          // this.ctx.curl("http://127.0.0.1:9001/check", {
          method: 'POST',
          contentType: 'json',
          dataType: 'json',
          headers: {},
          data: {
            leg: tripSearch,
            IPCC,
          },
          timeout: 20000, // 设置超时时间为 5 秒
        });
      } catch (e) {
        this.ctx.logger.error(e);
      }
    } else {
      try {
        const GDSRes = await this.ctx.curl(
          getRandomCacheMachine() + ':9001/check',
          {
            // this.ctx.curl("http://127.0.0.1:9001/check", {
            method: 'POST',
            contentType: 'json',
            dataType: 'json',
            headers: {},
            data: {
              leg: tripSearch,
              IPCC,
            },
            timeout: 20000, // 设置超时时间为 5 秒
          }
        );
        return GDSRes;
      } catch (e) {
        return null;
      }
    }
  }

  /**
   * 存储商品数据
   * @param {*} flightDetailList
   */
  async saveFlightInfo(shoppingInfo) {
    if (shoppingInfo.shoppingId) {
      const result = await this.ctx.model.Shopping.findOne({
        shoppingId: shoppingInfo.shoppingId,
      });
      if (result) {
        await this.ctx.model.Shopping.deleteMany({ shoppingId: shoppingInfo.shoppingId });
        await this.ctx.model.Price.deleteMany({ shoppingId: shoppingInfo.shoppingId });
        await this.ctx.model.Flight.deleteMany({ shoppingId: shoppingInfo.shoppingId });
        await this.ctx.model.Segment.deleteMany({ shoppingId: shoppingInfo.shoppingId });
      }
    } else {
      return;
    }
    await this.ctx.model.Shopping.create({
      shoppingId: shoppingInfo.shoppingId,
      currency: shoppingInfo.currency,
      policyInfo: JSON.stringify(shoppingInfo.policyInfo), // TODO 分开存
      sessionId: '',
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
  }

  /**
   * 验舱验价
   */
  async checkFlight(flightType, tripSearch, fareBasisCode, IPCC) {
    const { ctx, app, service } = this;
    const checkResult = {
      /** -1 售完; 0 没有变价; 1 变价 */
      verifyResult: 0,
      priceInfo: {},
      penaltyInfoList: [],
      baggageInfoList: [],
      isPriceChange: false,
      isPenaltyChange: false,
      isBaggageChange: false,
    };
    /** Redis库名 */
    let redisDBName = 'db0';
    if (flightType == 'RT') {
      redisDBName = 'db1';
    }

    /** redisCode */
    const redisCode = assemblyReqParams(flightType, tripSearch);

    /** redis查询结果集 */
    let schemaList = await app.redis.get(redisDBName).smembers(redisCode);

    schemaList = schemaList.filter(s => s.includes(IPCC));

    if (!schemaList || schemaList.length === 0) {
      checkResult.verifyResult = -1;
      return checkResult;
    }

    /** 确认是否售罄 */
    const isSaleOut =
      schemaList.filter(o => o.includes(fareBasisCode)).length == 0; // 如果不包含fareBasisCode，说明售罄
    if (isSaleOut) {
      checkResult.verifyResult = -1;
      return checkResult;
    }

    return checkResult;
  }
}

module.exports = FlightService;
