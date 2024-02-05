'use strict';
const timeHelper = require('../extend/time');
const helper = require('../extend/helper');
const moment = require('moment');
const {
  analysisSegment,
  analysisTrans,
} = require('./analysis');

/**
 * 拼装redis查询参数
 * @param {*} flightType
 * @param {*} tripSearch
 * @return
 */
const assemblyReqParams = (flightType, tripSearch) => {
  let reqParams = '';
  switch (flightType) {
    case 'OW': {
      const searchInfo = tripSearch[0];
      const splitTime = searchInfo.departTime.split('-');
      const dTimeParam = splitTime[1] + splitTime[2];
      reqParams = dTimeParam + searchInfo.depart + searchInfo.arrive;
      break;
    }
    case 'RT': {
      const forwardSearchInfo = tripSearch[0];
      const fSplitTime = forwardSearchInfo.departTime.split('-');
      const fTimeParam = fSplitTime[1] + fSplitTime[2];
      const backwardSearchInfo = tripSearch[1];
      const bSplitTime = backwardSearchInfo.departTime.split('-');
      const bTimeParam = bSplitTime[1] + bSplitTime[2];
      reqParams =
        fTimeParam +
        forwardSearchInfo.depart +
        forwardSearchInfo.arrive +
        bTimeParam;
      break;
    }
    default:
      break;
  }
  return reqParams;
};

/**
 * 组合航段信息
 * @param {*} segmentString
 * @param {*} departureDateStr
 * @return
 */
const assemblySegments = (segmentString, departureDateStr) => {
  /** 航段列表 */
  const segmentList = [];
  if (segmentString.includes('*')) {
    // 中转
    const mulitSegList = segmentString.split('*'); // 只存在一程中转，即mulitSegList.length<=2
    let secondSegDep;

    mulitSegList.forEach((seg, segIdx) => {
      let flightInfo = null;
      if (seg.includes('/')) {
        // 前一程
        const departureDate = timeHelper.momentDate(departureDateStr);
        flightInfo = analysisSegment(
          seg.split('/')[0],
          departureDate
        );
        flightInfo.transferDurationInfo = analysisTrans(seg.split('/')[1]);
        let secondSegDepTmp = timeHelper.timeAdd(
          flightInfo.aDateTime,
          flightInfo.transferDurationInfo.hour,
          'h'
        );
        secondSegDepTmp = timeHelper.timeAdd(
          secondSegDepTmp,
          flightInfo.transferDurationInfo.min,
          'm',
          'YYYY-MM-DD'
        );
        secondSegDep = moment(secondSegDepTmp);
      } else {
        // 后一程
        flightInfo = analysisSegment(seg, secondSegDep);
      }
      flightInfo.segmentNo = segIdx + 1;
      segmentList.push(flightInfo);
    });
  } else {
    // 直飞
    const flightInfo = analysisSegment(
      segmentString,
      timeHelper.momentDate(departureDateStr)
    );
    flightInfo.segmentNo = 1;
    segmentList.push(flightInfo);
  }
  return segmentList;
};

/**
 * 整合航段信息
 * @param {*} flightSegments
 * @return
 */
const integrateDuration = flightSegments => {
  const duration = {
    h: 0,
    m: 0,
  };
  flightSegments.forEach(seg => {
    const durationInfo = seg.durationInfo;
    const transferDurationInfo = seg.transferDurationInfo || { hour: 0, min: 0 };
    duration.h += (Number(durationInfo.hour) + Number(transferDurationInfo.hour));
    duration.m += (Number(durationInfo.min) + Number(transferDurationInfo.min));
  });

  if (duration.m >= 60) {
    duration.h += Math.floor(duration.m / 60);
    duration.m = duration.m % 60;
  }

  duration.h = duration.h.toString();
  duration.m = duration.m.toString();

  return duration;
};

/**
 * 整合价格信息
 * @param {*} priceInfo
 * @param {*} passengerList
 * @return
 */
const integratePrice = (priceInfo, passengerList) => {
  let totalPrice = 0;

  /*
    passenger: TPassenger[],
              name: string,
              count: number,
              flag: ADT / CHD / INF
  */

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

  totalPrice = (
    parseFloat(Number(priceInfo.adtBase) + Number(priceInfo.adtTaxes)) *
      adtCount +
    parseFloat(Number(priceInfo.chdBase) + Number(priceInfo.chdTaxes)) *
      chdCount +
    parseFloat(Number(priceInfo.infBase) + Number(priceInfo.infTaxes)) *
      infCount
  ).toFixed(0);

  const avgPrice = (totalPrice / (adtCount + chdCount + infCount)).toFixed(0);

  return {
    avgPrice,
    totalPrice,
  };
};

/**
 * 拼装航线
 * @param {*} segmentString
 * @param {*} departureDateStr
 * @return
 */
const assemblyFlight = (segmentString, departureDateStr, cabinType) => {
  const flightSegments = assemblySegments(
    segmentString,
    departureDateStr,
    cabinType
  );
  const flightGroupInfo = {
    flightId: helper.GUID(),
    /** 到达城市 */
    arriveMultCityName:
      flightSegments[flightSegments.length - 1].aCityInfo.name,
    arriveDateTimeFormat: flightSegments[flightSegments.length - 1].aDateTime,
    /** 出发Date */
    departDateTimeFormat: flightSegments[0].dDateTime,
    /** 出发城市 */
    departMultCityName: flightSegments[0].dCityInfo.name,
    /** 航程标题 */
    flightTripTitle: 'string;',
    /** 航程飞行时长 */
    duration: integrateDuration(flightSegments),
    /** 航程飞行日期-格式化 */
    dDateFormat: 'string;',
    flightSegments,
  };
  return flightGroupInfo;
};

/**
 * 拼装退改
 *
 * @param {*} penaltyAnalysisInfo
 */
const assemblyPenalty = penaltyAnalysisInfo => {
  const penaltyInfo = {
    cancelInfo: {
      note: '',
      formatted: {
        adultList: [
          {
            specialText: penaltyAnalysisInfo.adtBCXL,
            timeText: 'Before departure',
            specialType: 0,
          },
          {
            specialText: penaltyAnalysisInfo.adtACXL,
            timeText: 'After departure',
            specialType: 0,
          },
        ],
        childList: [
          {
            specialText: penaltyAnalysisInfo.chdBCXL,
            timeText: 'Before departure',
            specialType: 0,
          },
          {
            specialText: penaltyAnalysisInfo.chdACXL,
            timeText: 'After departure',
            specialType: 0,
          },
        ],
        infantList: [
          {
            specialText: penaltyAnalysisInfo.infBCXL,
            timeText: 'Before departure',
            specialType: 0,
          },
          {
            specialText: penaltyAnalysisInfo.infACXL,
            timeText: 'After departure',
            specialType: 0,
          },
        ],
        concurrentDescription: '',
      },
      originText: {
        adult: false,
        child: false,
        infant: false,
      },
      notAllowed: penaltyAnalysisInfo.noCXL,
      firstTimeChangeFreeNote: null,
    },
    changeInfo: {
      note: '',
      formatted: {
        adultList: [
          {
            specialText: penaltyAnalysisInfo.adtBCHG,
            timeText: 'Before departure',
            specialType: 0,
          },
          {
            specialText: penaltyAnalysisInfo.adtACHG,
            timeText: 'After departure',
            specialType: 0,
          },
        ],
        childList: [
          {
            specialText: penaltyAnalysisInfo.chdBCHG,
            timeText: 'Before departure',
            specialType: 0,
          },
          {
            specialText: penaltyAnalysisInfo.chdACHG,
            timeText: 'After departure',
            specialType: 0,
          },
        ],
        infantList: [
          {
            specialText: penaltyAnalysisInfo.infBCHG,
            timeText: 'Before departure',
            specialType: 0,
          },
          {
            specialText: penaltyAnalysisInfo.infACHG,
            timeText: 'After departure',
            specialType: 0,
          },
        ],
        concurrentDescription: '',
      },
      originText: {
        adult: false,
        child: false,
        infant: false,
      },
      notAllowed: penaltyAnalysisInfo.noCHG,
      firstTimeChangeFreeNote: null,
    },
    endorsementNote: 'No endorsement.',
    specialNote: '',
    noShowCondition: '',
    flagInfoList: [],
    partialUseChangeInfo: null,
    isNoShow: penaltyAnalysisInfo.isNoShow,
    noShow: penaltyAnalysisInfo.noShow,
    penaltyInfo: penaltyAnalysisInfo.penaltyInfo,
  };

  return penaltyInfo;
};

/**
 * 拼装商品
 * @param {*} flightDetailList
 * @param {*} flightGroupInfoList
 * @param {*} priceInfo
 * @param {*} passengerList
 */
const assemblyShopping = (
  flightDetailList,
  flightGroupInfoList,
  priceInfo,
  passengerList,
  currency,
  baggageInfoList,
  penaltyInfoList,
  redisCode,
  redisSchema,
  currencyRate
) => {
  const integPrice = integratePrice(priceInfo, passengerList);
  const shoppingInfo = {
    shoppingId: helper.GUID(),
    redisCode,
    redisSchema,
    segmentSchema: redisSchema.split('|')[0],
    currency,
    currencyRate,
    flightGroupInfoList,
    policyDetailInfo: {
      priceId: helper.GUID(),
      avgPrice: integPrice.avgPrice,
      totalPrice: integPrice.totalPrice,
      /** 1:快速出票,2:出票慢, */
      ticketDeadlineType: 1,
      /** 成人运价 */
      adultPrice: {
        /** 当前币种售价 （售卖价 或 公布运价） */
        salePrice: priceInfo.adtBase,
        /** 当前币种税费 */
        tax: priceInfo.adtTaxes,
      },
      childPrice: {
        /** 当前币种售价 （售卖价 或 公布运价） */
        salePrice: priceInfo.chdBase,
        /** 当前币种税费 */
        tax: priceInfo.chdTaxes,
      },
      infantPrice: {
        /** 当前币种售价 （售卖价 或 公布运价） */
        salePrice: priceInfo.infBase,
        /** 当前币种税费 */
        tax: priceInfo.infTaxes,
      },

      /** 限制信息 */
      limitInfo: {
        adultLimitInfo: null,
        childLimitInfo: null,
        /** 剩余票量 */
        availableSeatCount: 0,
        /** 限制的国籍 */
        nationalityLimit: [],
        /** 国籍限制类型，0-不限，1-允许，2-不允许 */
        nationalityLimitType: 0,
      },
      /** 产品提示信息 */
      productNoticeInfo: null,
      /** 公共提示信息 */
      noticeInfoList: [],
      /** 最晚出票时间 */
      ticketDeadlineInfo: null,
    },
    policyInfo: {
      baggageInfoList,
      penaltyInfoList,
    },
  };
  flightDetailList.push(shoppingInfo);
};

const filterCabinType = (segmentString, cabinType) => {
  let filterResult = true;

  const regexp = /\([-+]?\d+\)/g;

  if (segmentString.includes('*')) {
    // 中转
    const mulitSegList = segmentString.split('*'); // 只存在一程中转，即mulitSegList.length<=2

    const prevChildSegmentInfoList = mulitSegList[0].split('/')[0].replaceAll(regexp, '').split('-');
    if (prevChildSegmentInfoList[4].split('&')[0] !== cabinType) {
      filterResult = false;
    }

    const nextChildSegmentInfoList = mulitSegList[1].split('/')[0].replaceAll(regexp, '').split('-');
    if (nextChildSegmentInfoList[4].split('&')[0] !== cabinType) {
      filterResult = false;
    }
  } else {
    const segmentInfoList = segmentString.replaceAll(regexp, '').split('-');
    if (segmentInfoList[4].split('&')[0] !== cabinType) {
      filterResult = false;
    }
  }

  return filterResult;
};

const resolverTripInfo = tripSearch => {
  const searchInfo = tripSearch[0];
  return {
    depart: searchInfo.depart,
    arrive: searchInfo.arrive,
  };
};

/**
 * 解析Flight内容
 * @param {*} flightGroupInfo
 * @return
 */
const resolverFlightInfo = flightGroupInfo => {
  if (!flightGroupInfo) {
    return null;
  }
  let dateStart,
    dateEnd = '';
  dateStart = flightGroupInfo.departDateTimeFormat;
  dateEnd = flightGroupInfo.arriveDateTimeFormat;
  const { flightSegments } = flightGroupInfo;

  if (flightSegments && flightSegments.length > 0) {
    if (flightSegments.length == 1) {
      // 非中转
      const segment = flightSegments[0];
      const { company, cabin, number, depart, arrive } =
        resolverSegmentInfo(segment);
      return {
        company,
        cabin,
        number,
        dateStart,
        dateEnd,
        depart,
        arrive,
      };
    }
    // 中转
    const segment = flightSegments[0];
    const { company, cabin, number, depart, arrive } =
        resolverSegmentInfo(segment);
    const segment2 = flightSegments[flightSegments.length - 1];
    const {
      company: company2,
      cabin: cabin2,
      number: number2,
      depart: depart2,
      arrive: arrive2,
    } = resolverSegmentInfo(segment2);
    return {
      company,
      cabin,
      number,
      dateStart,
      dateEnd,
      depart,
      arrive: arrive2,
    };

  }
  return null;

};

/**
 * 解析Segment内容
 * @param {*} segment
 * @return
 */
const resolverSegmentInfo = segment => {
  if (!segment) {
    return null;
  }
  const { dPortInfo, aPortInfo, airlineInfo, subClass, flightNo } = segment;

  return {
    company: airlineInfo.code,
    cabin: subClass, // cabinClass == "Economy" ? "E" : "B",
    number: flightNo,
    depart: dPortInfo.code,
    arrive: aPortInfo.code,
  };
};

const resolverFlightInfoWithTransit = flightGroupInfo => {
  if (!flightGroupInfo) {
    return null;
  }

  let dateStart,
    dateEnd = '';
  dateStart = flightGroupInfo.departDateTimeFormat;
  dateEnd = flightGroupInfo.arriveDateTimeFormat;

  const resolverFlightInfo = {
    transit: 'false',
    dateStart,
    dateEnd,
    flightInfoList: [],
  };

  const { flightSegments } = flightGroupInfo;

  if (flightSegments && flightSegments.length > 0) {
    if (flightSegments.length == 1) {
      // 非中转
      const segment = flightSegments[0];

      resolverFlightInfo.flightInfoList.push(resolverSegmentInfo(segment));
    } else {
      resolverFlightInfo.transit = 'true';
      // 中转
      const segment = flightSegments[0];
      resolverFlightInfo.flightInfoList.push(resolverSegmentInfo(segment));

      const segment2 = flightSegments[flightSegments.length - 1];
      resolverFlightInfo.flightInfoList.push(resolverSegmentInfo(segment2));
    }
  } else {
    return null;
  }
  return resolverFlightInfo;
};

module.exports = {
  assemblyReqParams,
  assemblySegments,
  assemblyFlight,
  assemblyShopping,
  assemblyPenalty,
  filterCabinType,
  integratePrice,
  resolverFlightInfo,
  resolverTripInfo,
  resolverFlightInfoWithTransit,
};
