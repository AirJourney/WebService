'use strict';
const helper = require('../../extend/helper');
const { addTime } = require('../../extend/utils');
const { formatTimeWithTimeZone, getAcrossDays } = require('../../extend/time');
const planeInfoList = require('../../public/planeInfo.json');
const FlightSearch = require('./FlightSearch');
module.exports = class Galileo extends FlightSearch {
  constructor(app) {
    super(app);
    // 简化成一个查询参数对象，方便后续使用
    this.params = {};
    this.airportDetails = {};
    this.storedData = {};
  }

  /**
   *  链接传递的rate不可信，需要从redis中获取
   */
  async resolveCurrency() {
    if (this.params.currency === 'USD') {
      this.params.currencyRate = 1;
    } else {
      const currencyRate = await this.app.app.redis.get('db2').smembers(`USD2${this.params.currency}`);
      if (currencyRate && currencyRate.length > 0) {
        this.params.currencyRate = currencyRate[0];
      } else {
        throw new Error('no currency rate');
      }
    }
    if (this.params.currency === 'CNY') {
      this.params.cnyRate = 1;
    } else {
      const cnyRate = await this.app.app.redis.get('db2').smembers(`CNY2${this.params.currency}`);
      if (cnyRate && cnyRate.length > 0) {
        this.params.cnyRate = cnyRate[0];
      }
    }
  }

  async getAllPossibleAirports() {
    const { depart, arrive, language } = this.params;
    const { cartesian, details } = await this.app.service.poi.getAllPossibleAirport({ from: depart, to: arrive, language });
    this.allPossibleAirports = cartesian;
    // 保存一下机场-城市-国家的关系，后续会用到
    details.forEach(detail => {
      this.airportDetails[detail.airportcode] = detail;
    });
  }

  async getFlight() {
    if (this.params.campaign !== 'flight') {
      return;
    }
    if (!this.params.segmentSchema || !this.params.tripType || !this.params.currency) {
      return;
    }
    await this.getAllPossibleAirports();

    this.storedData = this.resolveSchema(this.params.segmentSchema);
    if (this.storedData.stopList.size > 0) {
      const tranferAirportsInfo = await this.app.service.poi.getPoisByAirportCodes(Array.from(this.storedData.stopList));
      tranferAirportsInfo.forEach(detail => {
        this.airportDetails[detail.airportcode] = detail;
      });
    }
  }

  packageResult() {
    const { departPart, returnPart, policyDetailInfo, stopList, additonalInfo } = this.storedData;
    const parseFlightSegments = part => {
      if (!part) return null;
      const duration = { h: 0, m: 0 };
      let departTime;
      let arrivalTime;
      const overallData = {
        arriveMultCityName: '',
        departMultCityName: '',
        arriveDateTimeFormat: '',
        departDateTimeFormat: '',
        duration,
        flightId: helper.GUID(),
      };
      const transferCost = [];
      const flightSegments = part.map((v, index) => {
        const durationInfo = {
          hour: Number(v.costTime.slice(0, 2)),
          min: Number(v.costTime.slice(2, 4)),
        };
        addTime(duration, { h: durationInfo.hour, m: durationInfo.min });
        let transferDurationInfo = null;
        if (v.stopTime) {
          transferDurationInfo = {
            hour: Number(v.stopTime.slice(0, 2)),
            min: Number(v.stopTime.slice(2, 4)),
          };
          addTime(duration, { h: transferDurationInfo.hour, m: transferDurationInfo.min });
        }
        if (index === 0) {
          overallData.departMultCityName = this.airportDetails[v.departAirport][this.params.language].cityname;
          departTime = v.departTime;
        }

        if (index === part.length - 1) {
          try {
            overallData.arriveMultCityName = this.airportDetails[v.arrivalAirport][this.params.language].cityname;
            arrivalTime = v.arrivalTime;
          } catch (e) {
            // 到达机场信息不在airportDetails列表表示此segment有问题，需要抛弃
            return null;
          }
        }

        const craftInfo = {
          name: '',
          minSeats: null,
          maxSeats: null,
          widthLevel: '',
          craftType: '',
        };
        const filteredPlanes = planeInfoList.filter(p => p.planeCode === v.planeType);
        const planeInfo = filteredPlanes.length > 0 ? filteredPlanes[0] : null;
        if (planeInfo) {
          craftInfo.name = planeInfo.planeName;
          craftInfo.craftType = planeInfo.planeShortName;
        } else {
          craftInfo.craftType = v.planeType;
        }

        const { start: dDateTime, end: aDateTime } = formatTimeWithTimeZone(v.departTime, v.arrivalTime, {
          h: Number(v.costTime.slice(0, 2)),
          m: Number(v.costTime.slice(2, 4)),
        }, this.params.departTime);
        const acrossDays = getAcrossDays(aDateTime, dDateTime);
        return {
          aDateTime,
          dDateTime,
          dCityInfo: {
            code: this.airportDetails[v.departAirport].citycode,
            name: this.airportDetails[v.departAirport][this.params.language].cityname,
          },
          aCityInfo: {
            code: this.airportDetails[v.arrivalAirport].citycode,
            name: this.airportDetails[v.arrivalAirport][this.params.language].cityname,
          },
          dPortInfo: {
            code: v.departAirport,
            name: this.airportDetails[v.departAirport][this.params.language].airportname,
            terminal: v.departTerminal,
          },
          aPortInfo: {
            code: v.arrivalAirport,
            name: this.airportDetails[v.arrivalAirport][this.params.language].airportname,
            terminal: v.arrivalTerminal,
          },
          acrossDays,
          airlineInfo: {
            code: v.airline,
            name: v.airline,
            isLCC: false,
          },
          IPCC: v.IPCC,
          craftInfo,
          cabinClass: v.cabinType === 'E' ? 'Economy' : 'Business',
          subClass: v.subClass,
          durationInfo,
          transferDurationInfo,
          stopInfoList: stopList,
          flightNo: v.flightNo,
          fareBasisCode: v.fareBasisCode,
          segmentNo: index + 1,
        };
      });

      if (flightSegments.includes(null)) return null;
      if (transferCost.length > 0) {
        transferCost.forEach((v, index) => {
          flightSegments[index].transferDurationInfo = v;
        });
      }
      const { start, end } = formatTimeWithTimeZone(departTime, arrivalTime, duration, this.params.departTime);
      return {
        ...overallData,
        departDateTimeFormat: start,
        arriveDateTimeFormat: end,
        flightSegments,
      };
    };
    const flightGroupInfoList = this.params.tripType === 'RT' ? [
      parseFlightSegments(departPart),
      parseFlightSegments(returnPart),
    ] : [ parseFlightSegments(departPart) ];
    if (flightGroupInfoList.includes(null)) {
      return null;
    }
    return {
      currency: this.params.currency,
      currencyRate: this.params.currencyRate,
      flightGroupInfoList,
      policyDetailInfo: {
        priceId: helper.GUID(),
        ...policyDetailInfo,
        ...this.calcPriceInfo(policyDetailInfo),
      },
      policyInfo: {
        baggageInfoList: additonalInfo.baggageInfoList,
        penaltyInfoList: additonalInfo.penaltyInfoList,
      },
      redisCode: this.params.redisCode,
      group: this.params.group,
      IPCC: this.params.IPCC,
      redisSchema: this.params.segmentSchema,
      shoppingId: this.params.shoppingId,
      shoppingType: this.params.skutype,
    };
  }

  calcPriceInfo(policyDetailInfo) {
    const adultPrice = policyDetailInfo.adultPrice.salePrice + policyDetailInfo.adultPrice.tax;
    const childPrice = policyDetailInfo.childPrice.salePrice + policyDetailInfo.childPrice.tax;
    const infantPrice = policyDetailInfo.infantPrice.salePrice + policyDetailInfo.infantPrice.tax;
    const adultCount = Number(this.params.adult);
    const childCount = Number(this.params.children);
    const infantCount = Number(this.params.infant);
    return {
      avgPrice: Number(((adultPrice * adultCount + childPrice * childCount + infantPrice * infantCount) / (adultCount + childCount + infantCount)).toFixed(0)),
      totalPrice: adultPrice * adultCount + childPrice * childCount + infantPrice * infantCount,
    };
  }

  resolveSchema(schema) {
    const parseFlightGroupInfo = flightInfoList => {
      const stopList = new Set();
      const flightGroupInfoList = flightInfoList.map((value, index) => {
        let stopTime;
        if (flightInfoList.length > 1 && index !== flightInfoList.length - 1) {
          stopTime = value.split('/')[1];
        }
        value = value.split('/')[0];
        const messageList = value.split('-');
        if (index > 0) {
          stopList.add(messageList[5]);
        }
        return {
          departTime: messageList[0], // 1520(+8)
          costTime: messageList[1], // 0210
          airline: messageList[2], // TG
          flightNo: messageList[3], // 613
          cabinType: messageList[4].split('&')[0], // E
          subClass: messageList[4].split('&')[1], // V
          departAirport: messageList[5], // KMG
          departTerminal: messageList[6], // T2
          arrivalAirport: messageList[7], // KMG
          arrivalTerminal: messageList[8], // T2
          baggage: messageList[9], // 1 或者 25kg
          planeType: messageList[10], // 321
          fareBasisCode: messageList[11], // Y1ABDA0S
          arrivalTime: messageList[12], // 1730(+8)
          IPCC: messageList[13],
          stopTime, // 0210
        };
      });
      return { flightGroupInfoList, stopList };
    };
    let departPart,
      returnPart,
      departStopList,
      returnStopList;
    const [ flightInfo, priceInfo ] = schema.split('|');
    if (this.params.tripType === 'OW') {
      const { flightGroupInfoList: dl, stopList: ds } = parseFlightGroupInfo(flightInfo.split('*'));
      departPart = dl;
      departStopList = ds;
      returnPart = null;
      returnStopList = new Set();
    } else {
      const rtData = flightInfo.split('@');
      const { flightGroupInfoList: dl, stopList: ds } = parseFlightGroupInfo(rtData[0].split('*'));
      departPart = dl;
      departStopList = ds;
      const { flightGroupInfoList: rl, stopList: rs } = parseFlightGroupInfo(rtData[1].split('*'));
      returnPart = rl;
      returnStopList = rs;
    }

    const priceInfoList = priceInfo.split('-');
    const policyDetailInfo = {
      adultPrice: {
        salePrice: helper.calculatePrice(priceInfoList[0], this.params.currencyRate),
        tax: helper.calculatePrice(priceInfoList[1], this.params.currencyRate),
      },
      childPrice: {
        salePrice: helper.calculatePrice(priceInfoList[2], this.params.currencyRate),
        tax: helper.calculatePrice(priceInfoList[3], this.params.currencyRate),
      },
      infantPrice: {
        salePrice: helper.calculatePrice(priceInfoList[4], this.params.currencyRate),
        tax: helper.calculatePrice(priceInfoList[5], this.params.currencyRate),
      },
    };
    return {
      departPart,
      returnPart,
      policyDetailInfo,
      schema,
      stopList: new Set([ ...departStopList, ...returnStopList ]),
    };
  }

  async resolveRenvenuInfo() {
    return;
  }

  async resolveProfitInfo() {
    return;
  }

  async resovePenaltyAndBaggageInfo() {
    const baggageInfoList = this.app.service.baggage.generateBaggageInfoNew([], this.storedData, this.params.group, this.params.IPCC, this.params.departTime);
    const penaltyInfoList = this.app.service.penalty.generatePenaltyInfo([], this.storedData, this.params.departTime);
    this.storedData.additonalInfo = { baggageInfoList, penaltyInfoList };
  }
};
