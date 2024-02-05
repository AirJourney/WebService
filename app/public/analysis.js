'use strict';
const timeHelper = require('../extend/time');
const helper = require('../extend/helper');
const cityAirList = require('./cityInfo.json');
const planeInfoList = require('./planeInfo.json');


const formatNumberString = numberString => {
  // 使用正则表达式匹配数字部分
  const numberMatch = numberString.match(/^([-+]?\d+)$/);
  if (!numberMatch) return numberString;
  return numberMatch[1].replace(/([-+]?)(\d+)/, (_, b, c) => {
    c = (c % 12).toString();
    return (b || '+') + c.padStart(2, '0');
  });
};


/**
 * 解析航段Schema
 * @param {*} segString
 * @param {*} dDate
 * @return 航段数据
 */
const analysisSegment = (segString, dDate) => {
  const regexp = /\(([-+]?\d+)\)/g;
  const timeZoneList = [ ...segString.matchAll(regexp) ];
  const splitRes = segString.replaceAll(regexp, '').split('-');
  const offsetHour = splitRes[1].substr(0, 2);
  const offsetMinute = splitRes[1].substr(2, 2);
  const dPort = splitRes[5];
  const aPort = splitRes[7];
  let arrivalDate = null;
  let departDate = null;
  let acrossDays = 0;
  let IPCC = '';
  if (timeZoneList.length > 0) {
    // 新segment
    const departTime = splitRes[0].substr(0, 4);
    const arrivalTime = splitRes[12].substr(0, 4);
    const departZone = formatNumberString(timeZoneList[0][1]);
    const arrivalZone = formatNumberString(timeZoneList[1][1]);
    const offsetTime = Number(offsetHour) * 60 + Number(offsetMinute);
    departDate = timeHelper.parseDateTime(dDate.format('YYYY-MM-DD'), departTime) + departZone + ':00';
    // 获取跨天数
    acrossDays = timeHelper.getAcrossDay(departTime, arrivalTime, departZone, arrivalZone, offsetTime);
    const aDate = timeHelper.timeAdd(dDate, acrossDays, 'd', 'YYYY-MM-DD');
    arrivalDate = timeHelper.parseDateTime(aDate, arrivalTime) + arrivalZone + ':00';
    IPCC = splitRes[13];
  } else {
    const dHour = splitRes[0].substr(0, 2);
    const dMinute = splitRes[0].substr(2, 2);
    departDate = timeHelper.timeAdd(dDate, dHour, 'h');
    departDate = timeHelper.timeAdd(departDate, dMinute, 'm');
    const offsetTimezone = helper.offsetTimezone(aPort, dPort);
    arrivalDate = timeHelper.timeAdd(departDate, Number(offsetHour) + offsetTimezone.integerPart, 'h');
    arrivalDate = timeHelper.timeAdd(arrivalDate, Number(offsetMinute) + offsetTimezone.decimalPart, 'm');
    acrossDays = timeHelper.acrossDay(departDate, arrivalDate);
    IPCC = splitRes[12];
  }
  const airlineCode = splitRes[2];
  const flightNo = splitRes[3];
  const cabinClass = splitRes[4].split('&')[0] === 'E' ? 'Economy' : 'Business';
  const subClass = splitRes[4].split('&')[1];
  const dStation = splitRes[6];
  const aStation = splitRes[8];
  const dCityAirInfo =
    cityAirList.filter(d => d.cityCode === dPort).length > 0
      ? cityAirList.filter(d => d.cityCode === dPort)[0]
      : null;
  const dCityInfo = {
    code: '',
    name: '',
  };
  const dPortInfo = {
    code: dPort,
    name: '',
    terminal: dStation,
  };
  if (dCityAirInfo != null) {
    dCityInfo.code = dCityAirInfo.cityCode;
    dCityInfo.name = dCityAirInfo.city;
    dPortInfo.name = dCityAirInfo.airport;
  } else {
    dCityInfo.code = dPort;
    dCityInfo.name = dPort;
  }
  const aCityAirInfo =
    cityAirList.filter(a => a.cityCode === aPort).length > 0
      ? cityAirList.filter(a => a.cityCode === aPort)[0]
      : null;
  const aCityInfo = {
    code: '',
    name: '',
  };
  const aPortInfo = {
    code: aPort,
    name: '',
    terminal: aStation,
  };
  if (aCityAirInfo != null) {
    aCityInfo.code = aCityAirInfo.cityCode;
    aCityInfo.name = aCityAirInfo.city;
    aPortInfo.name = aCityAirInfo.airport;
  } else {
    aCityInfo.code = aPort;
    aCityInfo.name = aPort;
  }
  const planeCode = splitRes[10];
  const craftInfo = {
    name: '',
    minSeats: null,
    maxSeats: null,
    widthLevel: '',
    craftType: '',
  };
  const planeInfo =
    planeInfoList.filter(p => p.planeCode === planeCode).length > 0
      ? planeInfoList.filter(p => p.planeCode === planeCode)[0]
      : null;
  if (planeInfo) {
    craftInfo.name = planeInfo.planeName;
    craftInfo.craftType = planeInfo.planeShortName;
  } else {
    craftInfo.craftType = planeCode;
  }
  const fareBasisCode = splitRes[11];

  return {
    segmentId: helper.GUID(),
    aDateTime: arrivalDate, // moment.format() YYYY-MM-DD HH:MM:SS
    dDateTime: departDate, // moment.format()  YYYY-MM-DD HH:MM:SS
    dCityInfo,
    aCityInfo,
    dPortInfo,
    aPortInfo,
    // 相隔天数,跨天则+1
    acrossDays,
    /** 航司信息 */
    airlineInfo: {
      code: airlineCode,
      name: airlineCode,
      isLCC: false,
    },
    /** 机型信息 */
    craftInfo,
    /** 主仓 */
    cabinClass,
    /** 子舱位 */
    subClass,
    /** 飞行时长 */
    durationInfo: {
      hour: offsetHour,
      min: offsetMinute,
    },
    /** 中转时长 */
    transferDurationInfo: null,

    /** 经停信息 */
    stopInfoList: [],

    /** 航班号 */
    flightNo,
    fareBasisCode,
    IPCC,
  };
};

/**
 * 解析中转Schema
 * @param {*} transString
 * @return
 */
const analysisTrans = transString => {
  const tHour = transString.substr(0, 2);
  const tMinute = transString.substr(2, 2);
  return {
    hour: tHour,
    min: tMinute,
  };
};

/**
 * 解析价格Schema
 * @param {*} priceString
 * @return
 */
const analysisPrice = (priceString, currencyRate) => {
  // TODO 返回的时候需要算上加价逻辑
  const splitRes = priceString.split('-');
  const adtBase = helper.calculatePrice(splitRes[0], currencyRate);
  const adtTaxes = helper.calculatePrice(splitRes[1], currencyRate);
  const chdBase = helper.calculatePrice(splitRes[2], currencyRate);
  const chdTaxes = helper.calculatePrice(splitRes[3], currencyRate);
  const infBase = helper.calculatePrice(splitRes[4], currencyRate);
  const infTaxes = helper.calculatePrice(splitRes[5], currencyRate);
  return {
    adtBase,
    adtTaxes,
    chdBase,
    chdTaxes,
    infBase,
    infTaxes,
  };
};

const analysisPenalty = (penaltyString, currencyRate, c2eList) => {
  // 1/60-GBP $ 1/60-GBP $ 1/60-GBP

  const convertCurrency = priceString => {
    if (priceString === '-1' || priceString === '0') {
      return priceString;
    }
    const priceSplit = priceString.split('-');
    if (priceSplit && priceSplit.length > 1) {
      let price = 0;
      if (priceSplit[1] === 'EUR') {
        price = Number(priceSplit[0]);
      } else {
        const c2eRateInfo =
          c2eList.filter(c => c.from === priceSplit[1]).length > 0
            ? c2eList.filter(c => c.from === priceSplit[1])[0]
            : 0;
        price = helper.calculatePrice(
          Number(priceSplit[0]),
          c2eRateInfo.c2eRate
        ); // TO EUR
      }
      price = helper.calculatePrice(price, currencyRate); // TO currency
      return price.toString();
    }
    return priceString;

  };

  const filterPenalty = (penaltyString, index) => {
    let penaltyResult = '';
    if (
      penaltyString.split('/')[index] === 1 ||
      penaltyString.split('/')[index] === 'RES NO -CHG'
    ) {
      penaltyResult = '-1';
    } else if (penaltyString.split('/')[index] === 0) {
      penaltyResult = '0';
    } else {
      penaltyResult = convertCurrency(penaltyString.split('/')[index]);
    }
    return penaltyResult;
  };

  const psgTypePenalty = penaltyString.split('$');
  const adtPenalty = psgTypePenalty[0];
  const chdPenalty = psgTypePenalty[1];
  const infPenalty = psgTypePenalty[2];

  // RES NO -CHG

  const adtBCXL = filterPenalty(adtPenalty, 0);

  const adtACXL = filterPenalty(adtPenalty, 1);

  const adtCHG = filterPenalty(adtPenalty, 2);

  const chdBCXL = filterPenalty(chdPenalty, 0);

  const chdACXL = filterPenalty(chdPenalty, 1);

  const chdCHG = filterPenalty(chdPenalty, 2);

  const infBCXL = filterPenalty(infPenalty, 0);

  const infACXL = filterPenalty(infPenalty, 1);

  const infCHG = filterPenalty(infPenalty, 2);

  const noCXL =
    (adtBCXL === '-1' ||
      adtACXL === '-1' ||
      chdBCXL === '-1' ||
      chdACXL === '-1' ||
      infBCXL === '-1' ||
      infACXL === '-1');
  const noCHG = (adtCHG === '-1' || chdCHG === '-1' || infCHG === '-1');

  return {
    adtBCXL,
    adtACXL,
    adtCHG,
    chdBCXL,
    chdACXL,
    chdCHG,
    infBCXL,
    infACXL,
    infCHG,
    noCXL,
    noCHG,
  };
};

const analysisRT = schemaList => {
  if (schemaList.length === 0) return [];

  let coupleCount = 0;

  schemaList.forEach(schema => {
    const rtIndex = Number(schema.split('#')[0].split('T')[1]);
    if (rtIndex > coupleCount) {
      coupleCount = rtIndex;
    }
  });

  /**
   * {
   *  fwt:[
   *  [],[],[]...[]
   *  ],
   *  bwt:[
   *  [],[],[]...[]
   *  ]
   * }
   *
   * for循环
   * fwt[i] * bwt[i] 笛卡尔积
   */
  const rtAnalysisResult = {
    FWT: [],
    BWT: [],
  };
  const filterByIndex = (prefix, index) => {
    const filterResult = schemaList.filter(s =>
      s.includes(`${prefix}${index}#`)
    );
    rtAnalysisResult[prefix][index] = filterResult;
  };

  for (let i = 0; i <= coupleCount; i++) {
    filterByIndex('FWT', i);
    filterByIndex('BWT', i);
  }

  const flightGroupSchemaList = [];
  const fwtSet = [];
  // const bwtSet = [];
  for (let i = 0; i <= coupleCount; i++) {
    rtAnalysisResult.FWT[i].forEach(f => {
      // TODO set校验字符串
      const fwtStr = f.split('#')[1];
      if (fwtSet.includes(fwtStr)) return;
      fwtSet.push(fwtStr);
      const flightCouple = {
        F: fwtStr,
        B: '',
      };
      rtAnalysisResult.BWT[i].forEach(b => {
        const bwtStr = b.split('#')[1];
        // if (bwtSet.includes(bwtStr)) return;
        // bwtSet.push(fwtStr);
        flightCouple.B = bwtStr;
        flightGroupSchemaList.push(JSON.parse(JSON.stringify(flightCouple)));
      });
    });
  }

  return flightGroupSchemaList;
};

const analysisPricePenalty = priceInfo => {
  // '{"adtBase":"470","adtTaxes":"244","chdBase":"470","chdTaxes":"244","infBase":"470","infTaxes":"199"}' 改20%，退30%
  const { adtBase, adtTaxes, chdBase, chdTaxes, infBase, infTaxes } = priceInfo;
  const adtTotalPrice = helper.calculateAdd(adtBase, adtTaxes);
  const chdTotalPrice = helper.calculateAdd(chdBase, chdTaxes);
  const infTotalPrice = helper.calculateAdd(infBase, infTaxes);
  const changeRate = 0.2;
  const cancleRate = 0.3;

  const penaltyAnalysisInfo = {
    adtBCXL: helper.calculatePrice(adtTotalPrice, cancleRate).toString(),
    adtACXL: helper.calculatePrice(adtTotalPrice, cancleRate).toString(),
    adtCHG: helper.calculatePrice(adtTotalPrice, changeRate).toString(),
    chdBCXL: helper.calculatePrice(chdTotalPrice, cancleRate).toString(),
    chdACXL: helper.calculatePrice(chdTotalPrice, cancleRate).toString(),
    chdCHG: helper.calculatePrice(chdTotalPrice, changeRate).toString(),
    infBCXL: helper.calculatePrice(infTotalPrice, cancleRate).toString(),
    infACXL: helper.calculatePrice(infTotalPrice, cancleRate).toString(),
    infCHG: helper.calculatePrice(infTotalPrice, changeRate).toString(),
    noCXL: false,
    noCHG: false,
  };

  return penaltyAnalysisInfo;
};

const filterByFlightNo = flightDetailList => {
  const flightNoAndTimes = [];
  return flightDetailList
    .sort((a, b) => {
      return a.policyDetailInfo.avgPrice - b.policyDetailInfo.avgPrice;
    })
    .filter(item => {
      const flightNoAndTime = item.flightGroupInfoList.map(
        flightGroupInfo => {
          return flightGroupInfo.flightSegments.map(flightSegment => {
            return (
              flightSegment.airlineInfo.code +
              flightSegment.flightNo +
              flightSegment.dDateTime +
              flightSegment.aDateTime
            );
          });
        }
      );
      const dump =
        flightNoAndTimes.findIndex(fItem => {
          return fItem.every((flight, i) => {
            const t = flightNoAndTime[i];
            return flight.every((segment, j) => {
              return segment === t[j];
            });
          });
        }) > -1;
      if (dump) return false;
      flightNoAndTimes.push(flightNoAndTime);
      return true;
    });
};

const groupAndSortFlightsByPrice = (flightDetailList, retentionNumber = 1) => {
  const flightNoMap = new Map(); // 用于存储每个航班号对应的航班信息列表
  // 将航班信息按航班号进行分组
  flightDetailList.forEach(item => {
    const flightNo = item.flightGroupInfoList[0].flightSegments[0].airlineInfo.code +
                     item.flightGroupInfoList[0].flightSegments[0].flightNo;

    if (!flightNoMap.has(flightNo)) {
      flightNoMap.set(flightNo, []);
    }

    flightNoMap.get(flightNo).push(item);
  });

  const filteredFlightList = [];

  // 对每个航班号的航班信息列表进行处理
  flightNoMap.forEach(flightList => {
    // 按价格升序排序
    flightList.sort((a, b) => a.policyDetailInfo.avgPrice - b.policyDetailInfo.avgPrice);

    // 保留价格最低的三个航班信息，并添加到结果数组
    filteredFlightList.push(...flightList.slice(0, retentionNumber));
  });

  // 最后再次按价格升序排列整个结果数组
  filteredFlightList.sort((a, b) => a.policyDetailInfo.avgPrice - b.policyDetailInfo.avgPrice);

  return filteredFlightList;
};


module.exports = {
  analysisSegment,
  analysisPrice,
  analysisTrans,
  analysisRT,
  analysisPenalty,
  analysisPricePenalty,
  filterByFlightNo,
  groupAndSortFlightsByPrice,
};
