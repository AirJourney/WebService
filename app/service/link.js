'use strict';

const Service = require('egg').Service;
const timeHelper = require('../extend/time');

class LinkService extends Service {
  async BookingDeepLink(linkParams, flightList) {
    const {
      locale,
      language,
      currency,
      passenger,
      flightType,
      cabinType,
      tripSearch,
      mktportal = 'customer',
    } = linkParams;
    const referer = this.ctx.request.headers.referer;
    const referIndex = referer && referer.split('?')[0].lastIndexOf('/') + 1;
    const refererPath = referer && referer.substring(0, referIndex || 0);
    let hostName;
    if (
      refererPath &&
      (refererPath.includes('skywingtrip') || refererPath.includes('localhost'))
    ) {
      hostName = refererPath;
    } else {
      if (mktportal === 'skyscanner' && locale === 'CN') {
        hostName = 'https://www.skywingtrip.cn/';
      } else {
        hostName = 'https://www.skywingtrip.com/';
      }
    }
    let path = 'book';
    if (mktportal !== 'customer' && mktportal !== 'kayka') {
      path = 'transferad';
    }
    const landingPageType = 'booking';

    const deepLinkTokenId = 'v-1.3';
    const campaign = 'flight';
    // flightType, cabinType, passenger, currency,locale,language
    const adult =
      passenger.filter(p => p.flag === 'ADT').length > 0
        ? passenger.filter(p => p.flag === 'ADT')[0].count
        : 0;
    const children =
      passenger.filter(p => p.flag === 'CHD').length > 0
        ? passenger.filter(p => p.flag === 'CHD')[0].count
        : 0;
    const infant =
      passenger.filter(p => p.flag === 'INF').length > 0
        ? passenger.filter(p => p.flag === 'INF')[0].count
        : 0;

    const departCity = tripSearch[0].depart;
    const arriveCity = tripSearch[0].arrive;
    const departTime = timeHelper.displayMoment(
      tripSearch[0].departTime,
      'YYYYMMDD'
    );
    const returnTime =
      tripSearch.length > 1
        ? timeHelper.displayMoment(tripSearch[1].departTime, 'YYYYMMDD')
        : '';

    for (let i = 0; i < flightList.length; i++) {
      const flightDetail = flightList[i];
      const redisCode = encodeURIComponent(flightDetail.redisCode);
      const segmentSchema = encodeURIComponent(flightDetail.redisSchema);

      flightDetail.deeplink = `${hostName}${path}?landingPage=${landingPageType}&locale=${locale}&mktportal=${mktportal}&language=${language}&currency=${currency}&deepLinkTokenId=${deepLinkTokenId}&campaign=${campaign}&redisCode=${redisCode}&segmentSchema=${segmentSchema}&tripType=${flightType}&cabinType=${cabinType}&departCity=${departCity}&arriveCity=${arriveCity}&departTime=${departTime}&returnTime=${returnTime}&adult=${adult}&children=${children}&infant=${infant}`;
    }

    return flightList;
  }

  flightBasicLink(linkParams) {
    const { locale, language, mktportal = 'customer' } = linkParams;
    const referer = this.ctx.request.headers.referer;
    const referIndex = referer && referer.split('?')[0].lastIndexOf('/') + 1;
    const refererPath = referer && referer.substring(0, referIndex || 0);
    let hostName;
    if (
      refererPath &&
      (refererPath.includes('skywingtrip') || refererPath.includes('localhost'))
    ) {
      hostName = refererPath;
    } else {
      if (mktportal === 'skyscanner' && locale === 'CN') {
        hostName = 'https://www.skywingtrip.cn/';
      } else {
        hostName = 'https://www.skywingtrip.com/';
      }
    }
    let path = 'book';
    if (mktportal !== 'customer' && mktportal !== 'kayka') {
      path = 'transferad';
    }
    const landingPageType = 'booking';

    const deepLinkTokenId = 'v-1.6';
    const campaign = 'flight';

    return `${hostName}${path}?landingPage=${landingPageType}&locale=${locale}&language=${language}&mktportal=${mktportal}&deepLinkTokenId=${deepLinkTokenId}&campaign=${campaign}`;
  }

  flightBookingLink(basicLink, linkParams, flightList) {
    const {
      language,
      currency,
      passenger,
      flightType,
      cabinType,
      tripSearch,
      IPCC,
      group,
      skuType,
    } = linkParams;

    const adult =
      passenger.filter(p => p.flag === 'ADT').length > 0
        ? passenger.filter(p => p.flag === 'ADT')[0].count
        : 0;
    const children =
      passenger.filter(p => p.flag === 'CHD').length > 0
        ? passenger.filter(p => p.flag === 'CHD')[0].count
        : 0;
    const infant =
      passenger.filter(p => p.flag === 'INF').length > 0
        ? passenger.filter(p => p.flag === 'INF')[0].count
        : 0;

    const departCity = tripSearch[0].depart;
    const arriveCity = tripSearch[0].arrive;
    const departTime = timeHelper.displayMoment(
      tripSearch[0].departTime,
      'YYYYMMDD'
    );
    const returnTime =
      tripSearch.length > 1
        ? timeHelper.displayMoment(tripSearch[1].departTime, 'YYYYMMDD')
        : '';

    for (let i = 0; i < flightList.length; i++) {
      const flightDetail = flightList[i];
      const redisCode = flightDetail.redisCode
        ? encodeURIComponent(flightDetail.redisCode)
        : '';

      const revenueId = flightDetail.policyDetailInfo.revenueInfo.revenueId;
      const profitId = flightDetail.policyDetailInfo.profitInfo._id;
      const currencyRate = flightDetail.currencyRate;

      const segmentSchema = this.assemblySegmentSchema(
        flightDetail.redisSchema,
        flightDetail,
        IPCC,
        group
      );

      const queryParams = {
        redisCode,
        segmentSchema,
        flightType,
        cabinType,
        departCity,
        arriveCity,
        departTime,
        returnTime,
        adult,
        children,
        infant,
        revenueId,
        profitId,
        currencyRate,
        skuType,
      };

      // 将原始sku值转换为字符串
      const skuString = JSON.stringify(queryParams);

      // 使用Base64编码来压缩sku字符串
      const encodedSku = btoa(skuString);

      flightDetail.deeplink = `${basicLink}&language=${language}&currency=${currency}&sku=${encodedSku}`;
    }

    return flightList;
  }

  assemblySegmentSchema(redisSchema, flightDetail, IPCC, group) {
    if (!redisSchema) {
      /** 自有缓存 */
      if (redisSchema.includes('@')) {
        /** RT */
        const rtSchemaArr = redisSchema.split('@');
        const fwtSchemaArr = rtSchemaArr[0].split('|');
        fwtSchemaArr[0] = fwtSchemaArr[0] + '-' + group;
        const bwtSchemaArr = rtSchemaArr[1].split('|');
        bwtSchemaArr[0] = bwtSchemaArr[0] + '-' + group;
        return encodeURIComponent(
          fwtSchemaArr.join('|') + '@' + bwtSchemaArr.join('|')
        );
      }
      const redisSchemaArr = redisSchema.split('|');
      redisSchemaArr[0] = redisSchemaArr[0] + '-' + group;
      return encodeURIComponent(redisSchemaArr.join('|'));
    }
    /** 直连接口

       */
    return encodeURIComponent(this.generateSchema(flightDetail, IPCC, group));
  }

  generateSchema(flightDetail, IPCC) {
    const flightType =
      flightDetail.flightGroupInfoList.length > 1 ? 'RT' : 'OW';
    let redisSchema = '';
    const priceInfo = flightDetail.policyDetailInfo;
    const generateSegment = segment => {
      const departTime = `${timeHelper.getTimeByTimezone(
        segment.dDateTime,
        'H'
      )}${timeHelper.getTimeByTimezone(
        segment.dDateTime,
        'M'
      )}${timeHelper.getTimeByTimezone(segment.dDateTime, 'Z')}`;
      const arriveTime = `${timeHelper.getTimeByTimezone(
        segment.aDateTime,
        'H'
      )}${timeHelper.getTimeByTimezone(
        segment.aDateTime,
        'M'
      )}${timeHelper.getTimeByTimezone(segment.aDateTime, 'Z')}`;

      const duration = segment.durationInfo.hour.padStart(2, '0') + segment.durationInfo.min.padStart(2, '0');
      const company = segment.airlineInfo.code;
      const flightNo = segment.flightNo;
      const cabinClass =
        segment.cabinClass === 'Economy' ||
        segment.cabinClass === 'PremiumEconomy'
          ? 'E'
          : 'B';
      const subClass = segment.subClass;
      const departAirport = segment.dPortInfo.code;
      const arriveAirport = segment.aPortInfo.code;
      const departTerminal = segment.dPortInfo.terminal || 'T0';
      const arriveTerminal = segment.aPortInfo.terminal || 'T0';

      const planType = segment.craftInfo.craftType || 'unknown';
      const fareCode = segment.fareBasisCode || null;

      return {
        departTime,
        duration,
        company,
        flightNo,
        cabinClass,
        subClass,
        departAirport,
        arriveAirport,
        departTerminal,
        arriveTerminal,
        planType,
        fareCode,
        arriveTime,
        originDepartTime: segment.dDateTime,
        originArriveTime: segment.aDateTime,
        baggage: null,
      };
    };

    const generateFlight = flightInfo => {
      const segmentSchemaList = [];
      flightInfo.flightSegments.forEach(segment => {
        const segmentSchemaObj = generateSegment(segment);
        segmentSchemaList.push(segmentSchemaObj);
      });

      const adultPrice = priceInfo.adultPrice.salePrice;
      const adultTax = priceInfo.adultPrice.tax;
      const childPrice = priceInfo.childPrice.salePrice;
      const childTax = priceInfo.childPrice.tax;
      const intPrice = priceInfo.infantPrice ? priceInfo.infantPrice.salePrice : null;
      const intTax = priceInfo.infantPrice ? priceInfo.infantPrice.tax : null;

      let prevSegmentArrivel;
      segmentSchemaList.forEach((s, sid) => {
        if (sid !== 0) {
          redisSchema += '/';
          const transOffsetObj = timeHelper.diffTime(
            prevSegmentArrivel,
            s.originDepartTime
          );
          const transOffset =
            (transOffsetObj.h.length > 1
              ? transOffsetObj.h
              : '0' + transOffsetObj.h) +
            (transOffsetObj.m.length > 1
              ? transOffsetObj.m
              : '0' + transOffsetObj.m);
          redisSchema += `${transOffset}*`;
        }
        redisSchema += `${s.departTime}-${s.duration}-${s.company}-${s.flightNo}-${s.cabinClass}&${s.subClass}-${s.departAirport}-${s.departTerminal}-${s.arriveAirport}-${s.arriveTerminal}-${s.baggage}-${s.planType}-${s.fareCode}-${s.arriveTime}-${IPCC}`;
        prevSegmentArrivel = s.originArriveTime;
      });

      redisSchema += `|${adultPrice}-${adultTax}-${childPrice}-${childTax}-${intPrice}-${intTax}`;
    };
    if (flightType === 'OW') {
      const flightInfo = flightDetail.flightGroupInfoList[0];
      generateFlight(flightInfo);
    } else {
      const fwtFlightInfo = flightDetail.flightGroupInfoList[0];
      generateFlight(fwtFlightInfo);
      redisSchema += '@';
      const bwtFlightInfo = flightDetail.flightGroupInfoList[1];
      generateFlight(bwtFlightInfo);
    }
    return redisSchema;
  }

  /**
   * 解压缩SKU参数字符串
   *
   * @param {*} decodeSkuValue
   * @return {*}
   * @memberof LinkService
   */
  async decodeSkuValue(encodeSkuUrl) {
    // 使用Base64解码来还原原始sku字符串
    const decodedSkuString = atob(encodeSkuUrl);

    // 将还原的字符串转换回JavaScript对象

    const urlParams = new URLSearchParams(decodedSkuString);
    const decodedSkuValue = Object.fromEntries(urlParams);

    console.log(decodedSkuValue);

    return decodedSkuValue;
  }
}

module.exports = LinkService;

/**
 * https://www.skywingtrip.com/book?landingPage=PASSENGER&locale=zh_TW&mktportal=skyscanner&language=zh_TW&
 * currency=HKD&shoppingId=12b6c7f3cc1142bf9c5c4fba4dfd6391&deepLinkTokenId=2023-03-25T14:59:28&campaign=FLIGHT&
 * redisCode=0327MNLSFO&segmentSchema=0910-0440-NH-820-B&P-MNL-T3-NRT-T1-2-781/0210*1600-0935-NH-8-B&P-NRT-T1-SFO-TI-2-77W&
 * tripType=OW&cabinType=B&adult=1&children=1&infant=1
 *
 *
 * 拆解
 * https://www.skywingtrip.com/book?
 * landingPage=PASSENGER&
 * locale=zh_TW&
 * mktportal=skyscanner&
 * language=zh_TW&
 * currency=HKD&
 * shoppingId=12b6c7f3cc1142bf9c5c4fba4dfd6391&
 * deepLinkTokenId=2023-03-25T14:59:28&
 * campaign=FLIGHT&
 * redisCode=0327MNLSFO&
 * segmentSchema=0910-0440-NH-820-B&P-MNL-T3-NRT-T1-2-781/0210*1600-0935-NH-8-B&P-NRT-T1-SFO-TI-2-77W&
 * tripType=OW&
 * cabinType=B&
 * adult=1&
 * children=1&
 * infant=1
 * */

/** 直连接口
       * 0650(+8)-0210-CI-110-E&H-TPE-T2-FUK-TI-1-333-HL-1000(+9)-P3570601/
         TransOffset*
        0650(+8)-0210-CI-110-E&H-TPE-T2-FUK-TI-1-333-HL-1000(+9)-P3570601
         |316.00-92.95-237.00-89.85-237.00-68.89
       * @
       * 2035(+9)-0245-CI-117-E&H-FUK-TI-TPE-T2-1-333-HL-2220(+8)-P3570601|316.00-92.95-237.00-89.85-237.00-68.89"
       *
       *
       */
