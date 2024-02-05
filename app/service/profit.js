'use strict';

const Service = require('egg').Service;
const {
  resolverFlightInfoWithTransit,
  resolverTripInfo,
} = require('../public/segment');
const timeHelper = require('../extend/time');

class ProfitService extends Service {
  /**
   * 加价计算
   * @param {*} profitPercent
   * @param {*} priceInfo
   * @return
   */
  profitPrice(profitPercent) {
    const priceInfo = {
      adultPrice: '',
      childPrice: '',
      infantPrice: '',
      avgPrice: 0,
      totalPrice: 0,
    };
    Object.keys(priceInfo).forEach(k => {
      if (typeof priceInfo[k] === 'object') {
        Object.keys(priceInfo[k]).forEach(p => {
          priceInfo[k][p] = (
            (Number(priceInfo[k][p]) * Number(profitPercent)) /
            100
          )
            .toFixed(0)
            .toString();
        });
      } else {
        priceInfo[k] = ((Number(priceInfo[k]) * Number(profitPercent)) / 100)
          .toFixed(0)
          .toString();
      }
    });

    return priceInfo;
  }

  /**
   * 匹配扣率
   * @param {*} profitInfo
   * @param {*} checkNumber
   * @param {*} checkCompany
   * @param {*} checkCabin
   * @return
   */
  matchProfit(profitInfo, checkNumber, checkCompany, checkCabin) {
    const { conditionProfit, defaultProfit } = profitInfo;

    let matchResultPercent = 100;

    if (!conditionProfit || conditionProfit.length === 0) {
      /** 默认扣率 */
      matchResultPercent = defaultProfit.percent;
    } else {
      /** 扣率存在设置情况 */

      /** 通用扣率 */
      const initMatchProfit = conditionProfit.filter(
        c => c.company === '' && c.cabin === '' && c.number === ''
      );

      if (
        conditionProfit.filter(
          c =>
            c.company === checkCompany &&
            c.cabin === checkCabin &&
            c.number === checkNumber
        ).length > 0
      ) {
        /** 航司、舱位、航班号均匹配 */
        const matchProfit = conditionProfit.filter(
          c =>
            c.company === checkCompany &&
            c.cabin === checkCabin &&
            c.number === checkNumber
        )[0];
        matchResultPercent = matchProfit.percent;
      } else if (
        conditionProfit.filter(
          c =>
            c.company === checkCompany &&
            c.cabin === checkCabin &&
            c.number !== checkNumber
        ).length > 0
      ) {
        /** 2c+!n */
        const matchProfit = conditionProfit.filter(
          c =>
            c.company === checkCompany &&
            c.cabin === checkCabin &&
            c.number !== checkNumber
        )[0];
        matchResultPercent = matchProfit.percent;
      } else if (
        conditionProfit.filter(
          c =>
            c.company !== checkCompany &&
            c.cabin === checkCabin &&
            c.number === checkNumber
        ).length > 0
      ) {
        /** n+ca+!co */
        const matchProfit = conditionProfit.filter(
          c =>
            c.company !== checkCompany &&
            c.cabin === checkCabin &&
            c.number === checkNumber
        )[0];
        matchResultPercent = matchProfit.percent;
      } else if (
        conditionProfit.filter(
          c =>
            c.company === checkCompany &&
            c.cabin !== checkCabin &&
            c.number === checkNumber
        ).length > 0
      ) {
        /** n+co+!ca */
        const matchProfit = conditionProfit.filter(
          c =>
            c.company === checkCompany &&
            c.cabin !== checkCabin &&
            c.number === checkNumber
        )[0];
        matchResultPercent = matchProfit.percent;
      } else if (
        conditionProfit.filter(
          c =>
            c.company !== checkCompany &&
            c.cabin !== checkCabin &&
            c.number === checkNumber
        ).length > 0
      ) {
        /** n+!co+!ca */
        const matchProfit = conditionProfit.filter(
          c =>
            c.company !== checkCompany &&
            c.cabin !== checkCabin &&
            c.number === checkNumber
        )[0];
        matchResultPercent = matchProfit.percent;
      } else if (
        conditionProfit.filter(
          c =>
            (c.company =
              checkCompany && c.cabin !== checkCabin && c.number !== checkNumber)
        ).length > 0
      ) {
        /** !n+co+!ca */
        const matchProfit = conditionProfit.filter(
          c =>
            (c.company =
              checkCompany && c.cabin !== checkCabin && c.number !== checkNumber)
        )[0];
        matchResultPercent = matchProfit.percent;
      } else if (
        conditionProfit.filter(
          c =>
            c.company !== checkCompany &&
            c.cabin === checkCabin &&
            c.number !== checkNumber
        ).length > 0
      ) {
        /** !n+!co+ca */
        const matchProfit = conditionProfit.filter(
          c =>
            c.company !== checkCompany &&
            c.cabin === checkCabin &&
            c.number !== checkNumber
        )[0];
        matchResultPercent = matchProfit.percent;
      } else {
        /** 均不匹配 */
        matchResultPercent = initMatchProfit.percent;
      }
    }
    return matchResultPercent;
  }

  async updateProfit(profitInfo) {
    const { ctx } = this;
    const { flightType, segment, number, company, cabin, date, percent } =
      profitInfo;
    const queryArray = [];
    const assemblyQueryField = (fieldKey, fieldVal) => {
      if (fieldVal && fieldVal !== '') {
        const queryStr = `{"${fieldKey}":"${fieldVal}"}`;
        queryArray.push(JSON.parse(queryStr));
      }
    };

    assemblyQueryField('flightType', flightType);
    assemblyQueryField('segment', segment);
    assemblyQueryField('number', number);
    assemblyQueryField('company', company);
    assemblyQueryField('cabin', cabin);
    assemblyQueryField('date', date);

    const conditionProfit = await ctx.model.Profit.find({
      $and: queryArray,
    });

    if (conditionProfit.length > 0) {
      /** 已存在则更新 */
      const newProfitInfo = await this.ctx.model.Profit.findByIdAndUpdate(
        conditionProfit[0]._id,
        {
          percent,
        },
        { new: true }
      );
      return newProfitInfo;
    }
    return this.ctx.model.Profit.create({
      flightType,
      segment,
      number,
      company,
      cabin,
      date,
      percent,
    });

  }

  /**
   * 获取默认扣率
   */
  async getDefaultProfit(group) {
    const defaultProfit = await this.ctx.model.Profit.find({
      flightType: '',
      segment: '',
      isValid: true,
      group,
    });
    if (!defaultProfit || defaultProfit.length === 0) {
      return null;
    }
    return defaultProfit[0];
  }

  /**
   * 获取航线扣率
   *
   * @param {*} flightType
   * @param {*} flightGroupInfo
   * @param {*} group
   * @return {*}
   * @memberof ProfitService
   */
  async getFlightProfit(flightType, tripSearch, resolverFlightInfo, group) {
    if (!flightType || !resolverFlightInfo) {
      return null;
    }

    const { transit, dateStart, flightInfoList } = resolverFlightInfo;
    // const { transit,company, cabin, number, dateStart } = flightInfo;

    const { depart, arrive } = resolverTripInfo(tripSearch);

    let profitList = [];
    // 查询对应的扣率
    if (flightType === 'OW') {
      profitList = await this.ctx.model.Profit.find({
        transit,
        flightType,
        segment: `${depart}-${arrive}`,
        isValid: true,
        group,
      });
    } else {
      const forwardProfitList = await this.ctx.model.Profit.find({
        transit,
        flightType,
        segment: `${depart}-${arrive}`,
        isValid: true,
        group,
      });

      const backwardProfitList = await this.ctx.model.Profit.find({
        transit,
        flightType,
        segment: `${arrive}-${depart}`,
        isValid: true,
        group,
      });

      if (forwardProfitList.length > 0) {
        profitList = forwardProfitList;
      } else {
        profitList = backwardProfitList;
      }
    }

    if (profitList.length === 0) {
      return null;
    }

    // 时间段匹配的扣率政策集合
    const dateMatchProfitList = profitList.filter(p =>
      timeHelper.betweenMoment(dateStart, p.dateStart, p.dateEnd, 'day', '[]')
    );

    if (dateMatchProfitList.length > 0) {
      const filterOneKey = (
        companyAdj,
        cabinAdj,
        numberAdj,
        company,
        cabin,
        number
      ) => {
        const filterList = dateMatchProfitList.filter(
          p =>
            (companyAdj === true
              ? p.company.includes(company)
              : p.company === '') &&
            (cabinAdj === true ? p.cabin.includes(cabin) : p.cabin === '') &&
            (numberAdj === true ? p.number.includes(number) : p.number === '')
        );
        if (filterList.length > 0) {
          return filterList[0];
        }
        return null;

      };

      const filterTransit = (companyAdj, cabinAdj, numberAdj) => {
        if (transit == 'true') {
          const { company, cabin, number } = flightInfoList[0];
          const transitFirst = filterOneKey(
            companyAdj,
            cabinAdj,
            numberAdj,
            company,
            cabin,
            number
          );

          const {
            company: company2,
            cabin: cabin2,
            number: number2,
          } = flightInfoList[1];
          const transitSecond = filterOneKey(
            companyAdj,
            cabinAdj,
            numberAdj,
            company2,
            cabin2,
            number2
          );

          if (transitFirst && transitSecond) {
            return transitFirst;
          }
          return null;

        }
        const { company, cabin, number } = flightInfoList[0];
        return filterOneKey(
          companyAdj,
          cabinAdj,
          numberAdj,
          company,
          cabin,
          number
        );
      };

      /** 通用扣率 */
      const normalMatchProfitList = dateMatchProfitList.filter(
        p => p.company === '' && p.cabin === '' && p.number === ''
      );

      // 全匹配的扣率政策集合
      if (filterTransit(true, true, true)) {
        /** com & cab & num */
        return filterTransit(true, true, true);
      } else if (filterTransit(true, true, false)) {
        /** com & cab & !num */
        return filterTransit(true, true, false);
      } else if (filterTransit(false, true, true)) {
        /** !com & cab & num */
        return filterTransit(false, true, true);
      } else if (filterTransit(true, false, true)) {
        /** com & !cab & num */
        return filterTransit(true, false, true);
      } else if (filterTransit(false, false, true)) {
        /** !com & !cab & num */
        return filterTransit(false, false, true);
      } else if (filterTransit(false, true, false)) {
        /** !com & cab & !num */
        return filterTransit(false, true, false);
      } else if (filterTransit(true, false, false)) {
        /** com & !cab & !num */
        return filterTransit(true, false, false);
      }
      if (normalMatchProfitList.length > 0) {
        return normalMatchProfitList[0];
      }
      return null;
    }
    return null;
  }

  raisePrice(profitInfo, priceInfo, cnyRate, passengerList) {
    const { profitType, percent, trim } = profitInfo;

    if (profitType === 'percent' || !profitType) {
      const calculatePrice = (price, needTrim = false) => {
        return ((Number(price) * Number(percent)) / 100 + (needTrim ? trim : 0))
          .toFixed(0)
          .toString();
      };

      priceInfo.adultPrice.salePrice = calculatePrice(
        priceInfo.adultPrice.salePrice,
        true
      ); // 成人价需要计算trim
      priceInfo.adultPrice.tax = calculatePrice(priceInfo.adultPrice.tax);
      priceInfo.childPrice.salePrice = calculatePrice(
        priceInfo.childPrice.salePrice
      );
      priceInfo.childPrice.tax = calculatePrice(priceInfo.childPrice.tax);
      priceInfo.infantPrice.salePrice = calculatePrice(
        priceInfo.infantPrice.salePrice
      );
      priceInfo.infantPrice.tax = calculatePrice(priceInfo.infantPrice.tax);

      priceInfo.avgPrice = calculatePrice(priceInfo.avgPrice, true);
      priceInfo.totalPrice = calculatePrice(priceInfo.totalPrice, true); // 总价需要计算trim

      priceInfo.percent = percent;
      priceInfo.trim = trim;
    } else if (profitType === 'fixed') {
      let { fixedPrice, fixedTax } = profitInfo;
      fixedPrice = Number((fixedPrice * cnyRate).toFixed(0));
      fixedTax = Number((fixedTax * cnyRate).toFixed(0));

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

      priceInfo.adultPrice.salePrice = fixedPrice.toString();
      priceInfo.adultPrice.tax = fixedTax.toString();
      priceInfo.childPrice.salePrice = fixedPrice.toString();
      priceInfo.childPrice.tax = fixedTax.toString();
      priceInfo.infantPrice.salePrice = fixedPrice.toString();
      priceInfo.infantPrice.tax = fixedTax.toString();

      priceInfo.totalPrice = (
        (fixedPrice + fixedTax) *
        (adtCount + chdCount + infCount)
      )
        .toFixed(0)
        .toString();
      priceInfo.avgPrice = (
        priceInfo.totalPrice /
        (adtCount + chdCount + infCount)
      )
        .toFixed(0)
        .toString();
    }

    priceInfo.profitInfo = profitInfo;
    priceInfo.cnyRate = cnyRate;

    return priceInfo;
  }

  async analysisProfit(
    flightType,
    tripSearch,
    flightDetail,
    cnyRate,
    passengerList,
    group = 'LLTrip'
  ) {
    const defaultProfit = await this.getDefaultProfit(group);
    if (!defaultProfit) {
      return;
    }
    const { flightGroupInfoList } = flightDetail;
    const flightGroupInfo = flightGroupInfoList[0];
    const resolverFlightInfo = resolverFlightInfoWithTransit(flightGroupInfo);
    if (resolverFlightInfo == null) {
      return;
    }
    const matchProfit = await this.getFlightProfit(
      flightType,
      tripSearch,
      resolverFlightInfo,
      group
    );
    if (!matchProfit) {
      this.raisePrice(defaultProfit, flightDetail.policyDetailInfo);
    } else {
      this.raisePrice(
        matchProfit,
        flightDetail.policyDetailInfo,
        cnyRate,
        passengerList
      );
    }
  }

  async getMatchProfit(flightType, tripSearch, flightInfo, group = 'LLTrip') {
    const defaultProfit = await this.getDefaultProfit(group);
    if (!defaultProfit) {
      return;
    }

    // TODO xiugai
    const matchProfit = await this.getFlightProfit(
      flightType,
      tripSearch,
      flightInfo,
      group
    );
    if (!matchProfit) {
      return defaultProfit;
    }
    return matchProfit;
  }
}

module.exports = ProfitService;
