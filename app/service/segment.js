'use strict';

const Service = require('egg').Service;
const {
  assemblyFlight,
  assemblyShopping,
  filterCabinType,
} = require('../public/segment');
const timeHelper = require('../extend/time');
const moment = require('moment');
const { analysisPrice, analysisRT } = require('../public/analysis');

class SegmentService extends Service {
  async analysisGDSSchema(flightType, passenger, redisCode, currency, cabinType) {
    const { ctx, app } = this;
    /** Redis库名 */
    const redisDBName = flightType === 'OW' ? 'db0' : 'db1';
    /** 出发日期 */
    const departureDateStr = redisCode.substr(0, 4);
    /** redis查询结果集 */
    const gdsSchemaList = await app.redis.get(redisDBName).smembers(redisCode);
    /** 汇率部分-Start */
    const currencyRedisCode = 'EUR2' + currency;
    let currencyRate = await app.redis.get('db2').smembers(currencyRedisCode);
    if (currencyRate && currencyRate.length > 0) {
      currencyRate = currencyRate[0];
    } else {
      ctx.logger.info('currencyRate is null');
      return [];
    }
    /** 汇率部分-End */

    /** 组 */
    const flightDetailList = [];
    try {
      if (flightType === 'OW') {
        gdsSchemaList.forEach(schema => {
          /** 航段字符串 */
          const segmentString = schema.split('|')[0];
          if (!filterCabinType(segmentString, cabinType)) { return; }
          /** 价格字符串 */
          const priceString = schema.split('|')[1];
          /** 航班 */
          const flightGroupInfoList = [];
          flightGroupInfoList.push(
            assemblyFlight(segmentString, departureDateStr)
          );
          const priceInfo = analysisPrice(priceString, currencyRate);
          const baggageInfoList = [];
          const penaltyInfoList = [];
          assemblyShopping(
            flightDetailList,
            flightGroupInfoList,
            priceInfo,
            passenger,
            currency,
            baggageInfoList,
            penaltyInfoList,
            redisCode,
            schema,
            currencyRate
          );
        });
      } else {
        const arrivalDateStr = redisCode.substr(-4, 4);
        const flightGroupSchemaList = analysisRT(gdsSchemaList);
        flightGroupSchemaList &&
        flightGroupSchemaList.forEach(group => {
          const fwtSchema = group.F;
          const bwtSchema = group.B;
          /** 去程航段字符串 */
          const fwtSegmentString = fwtSchema.split('|')[0];
          if (!filterCabinType(fwtSegmentString, cabinType)) { return; }
          /** 回程航段字符串 */
          const bwtSegmentString = bwtSchema.split('|')[0];
          if (!filterCabinType(bwtSegmentString, cabinType)) { return; }
          /** 价格字符串 */
          const priceString = fwtSchema.split('|')[1];
          /** 航班 */
          const flightGroupInfoList = [];
          flightGroupInfoList.push(
            assemblyFlight(fwtSegmentString, departureDateStr)
          );
          flightGroupInfoList.push(
            assemblyFlight(bwtSegmentString, arrivalDateStr)
          );
          const priceInfo = analysisPrice(priceString, currencyRate);
          const baggageInfoList = [];
          const penaltyInfoList = [];
          assemblyShopping(
            flightDetailList,
            flightGroupInfoList,
            priceInfo,
            passenger,
            currency,
            baggageInfoList,
            penaltyInfoList,
            redisCode,
            fwtSchema + '@' + bwtSchema,
            currencyRate
          );
        });
      }
      return flightDetailList;
    } catch (e) {
      this.service.trace.createTrace({
        traceType: 'error',
        dateTime: timeHelper.nowDateTime(),
        pageType: 'book',
        api: 'analysisGDSSchema',
        content: `input:${gdsSchemaList},error:${e.message}`,
      });
    }
  }

  /**
   * 取Redis Schema结果
   * @param {*} flightType
   * @param {*} segment
   * @param {*} dateStart
   * @param {*} dateEnd
   */
  async getRedisList(flightType, segment, dateStart, dateEnd) {
    const { app } = this;
    const searchRedisKeyList = [];
    if (flightType === 'OW') {
      let mDate = moment(dateStart);
      const mEndDate = moment(dateEnd);

      searchRedisKeyList.push(mDate.format('MMDD') + segment);

      while (!mDate.isSame(mEndDate)) {
        mDate = mDate.add(1, 'd');
        searchRedisKeyList.push(mDate.format('MMDD') + segment);
      }
    } else {
      const mDate = moment(dateStart);
      const mEndDate = moment(dateEnd);
      const durationDays = mEndDate.diff(mDate, 'day');

      for (let i = 0; i < durationDays; i++) {
        const fromDate = moment(dateStart).add(i, 'd');
        for (let j = 0; j < durationDays; j++) {
          const nextDate = moment(dateStart).add(j + 1, 'd');
          searchRedisKeyList.push(
            fromDate.format('MMDD') + segment + nextDate.format('MMDD')
          );
        }
      }
    }

    // console.log(searchRedisKeyList);

    /** Redis库名 */
    const redisDBName = flightType === 'OW' ? 'db0' : 'db1';

    const redisList = [];

    for (let i = 0; i < searchRedisKeyList.length; i++) {
      const redisCode = searchRedisKeyList[i];
      const redisSchemaList = await app.redis
        .get(redisDBName)
        .smembers(redisCode);
      if (flightType === 'OW') {
        redisSchemaList.forEach(s => {
          redisList.push({
            flightType,
            segment,
            number: s.split('-')[3],
            company: s.split('-')[2],
            cabin: s.split('-')[4].split('&')[1],
            date: redisCode.substring(0, 4),
            priceInfo: analysisPrice(s.split('|')[1], 1), // todo 接入币种
            percent: 100,
          });
        });
      } else {
        const flightGroupSchemaList = analysisRT(redisSchemaList);

        flightGroupSchemaList.forEach(s => {
          // todo 过滤匹配

          redisList.push({
            flightType,
            segment,
            number: s.F.split('-')[3] + '|' + s.B.split('-')[3],
            company: s.F.split('-')[2] + '|' + s.B.split('-')[2],
            cabin:
              s.F.split('-')[4].split('&')[1] +
              '|' +
              s.B.split('-')[4].split('&')[1],
            date: redisCode.substring(0, 4) + '|' + redisCode.substring(10, 14),
            priceInfo: analysisPrice(s.F.split('|')[1], 1), // todo 接入币种
            percent: 100,
          });
        });
      }
    }

    return redisList;
  }
}

module.exports = SegmentService;
