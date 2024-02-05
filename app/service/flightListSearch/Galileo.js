'use strict';
const FlightListSearch = require('./FlightListSearch');
const helper = require('../../extend/helper');
const { formatTimeWithTimeZone, getAcrossDays, between, betweenMoment } = require('../../extend/time');
const { addTime } = require('../../extend/utils');
const planeInfoList = require('../../public/planeInfo.json');

module.exports = class GalileoSearch extends FlightListSearch {
  constructor(app) {
    super(app);
    // 存储转乘机场的三字码
    this.stopList = new Set();
  }

  /**
   *  获取全局的汇率
   */
  async resolveCurrency() {
    if (this.params.currency === 'EUR') {
      this.currencyRate = 1;
    } else {
      const currencyRate = await this.app.app.redis.get('db2').smembers(`EUR2${this.params.currency}`);
      if (currencyRate && currencyRate.length > 0) {
        this.currencyRate = currencyRate[0];
      } else {
        throw new Error('no currency rate');
      }
    }
    if (this.params.currency === 'CNY') {
      this.cnyRate = 1;
    } else {
      const cnyRate = await this.app.app.redis.get('db2').smembers(`CNY2${this.params.currency}`);
      if (cnyRate && cnyRate.length > 0) {
        this.cnyRate = cnyRate[0];
      }
    }
  }

  async identifySearchChannels() {
    // 如果没有获取到城市对，立即退出
    if (!this.cityCodePair || !this.cityCodePair.from || !this.cityCodePair.to) {
      return [];
    }
    const sellFightList = await this.app.ctx.model.Sellfight.find({
      tripType: this.params.tripType,
      depart: this.cityCodePair.from,
      arrival: this.cityCodePair.to,
      GDS: 'travelport',
    });
    if (sellFightList.length === 0) return [];
    // 记录所有符合条件的可售卖航线数据

    return sellFightList.filter(sellFlight => {
      const { startDays, endDays } = sellFlight;
      // 售卖时间在范围内
      if (between(this.params.departTime, startDays, endDays)) {
        // 如果是往返，需要都在范围内
        if (this.params.tripType === 'RT' && !between(this.params.returnTime, startDays, endDays)) {
          return false;
        }
        return true;
      }
      return false;
    });
  }


  async getFlights(sellFlights) {
    if (sellFlights.length === 0) return [];
    // 获取redisKey
    const redisKey = this.getRedisKey();
    const redisDBName = this.params.tripType === 'OW' ? 'db0' : 'db1';
    let flightList = await this.app.app.redis.get(redisDBName).smembers(redisKey);
    const tripSearch = [
      {
        depart: this.cityCodePair.from,
        arrive: this.cityCodePair.to,
        departTime: this.params.departTime,
      },
    ];
    if (this.params.tripType === 'RT') {
      tripSearch.push({
        depart: this.cityCodePair.to,
        arrive: this.cityCodePair.from,
        departTime: this.params.returnTime,
      });
    }
    if (flightList.length === 0) {
      // 同步refresh
      await Promise.allSettled(sellFlights.map(({ IPCC }) => {
        return Promise.race([
          this.app.service.flight.refreshFlightCache(tripSearch, false, IPCC),
          new Promise(resolve => {
            setTimeout(() => {
              resolve('timeout');
            }, 20000);
          }),
        ]);
      }));
      // 尝试重新获取
      flightList = await this.app.app.redis.get(redisDBName).smembers(redisKey);
    } else {
      // 异步refresh
      sellFlights.forEach(({ IPCC }) => {
        this.app.service.flight.refreshFlightCache(tripSearch, true, IPCC);
      });
    }
    if (this.params.tripType === 'RT' && flightList.length !== 0) {
      const departRegexp = /FWT(\d+)#(.+)\|.+/;
      const returnRegexp = /BWT(\d+)#(.+)/;
      const departList = [];
      const returnList = [];
      flightList.forEach(flight => {
        if (flight.startsWith('FWT')) {
          const matchResult = flight.match(departRegexp);
          const [ , index, flightInfo ] = matchResult;
          departList[index] = flightInfo;
        } else {
          const matchResult = flight.match(returnRegexp);
          const [ , index, flightInfo ] = matchResult;
          returnList[index] = flightInfo;
        }
      });
      if (departList.length !== returnList.length) {
        flightList = [];
      } else {
        flightList = departList.map((depart, index) => depart + '@' + returnList[index]);
      }
    }
    // 将sellFlights转换为Record<IPCC, {group,vendibilityCompanies,flights,redisKey}>
    const sellFlightsStore = {};
    sellFlights.forEach(({ IPCC, group, vendibilityCompanies }) => {
      sellFlightsStore[IPCC] = {
        // redis存储的航线信息
        flightList: flightList.filter(result => result.includes(IPCC)),
        // redis key
        redisKey,
        // IPCC 所属组
        group,
        // 可售卖航司
        vendibilityCompanies,
      };
    });
    const result = {};
    // 对 flightList 进行分组以及筛选
    Object.entries(sellFlightsStore).forEach(([ IPCC, { flightList, redisKey, group, vendibilityCompanies }]) => {
      // 符合条件的可售卖航班
      result[IPCC] = {
        flightList: flightList
          .map(flight => this.resolveSchema(flight, vendibilityCompanies))
          .filter(flight => !!flight),
        redisKey,
        group,
      };
    });
    if (this.stopList.size !== 0) {
      const tranferAirportsInfo = await this.app.service.poi.getPoisByAirportCodes(Array.from(this.stopList));
      tranferAirportsInfo.forEach(detail => {
        this.airportDetails[detail.airportcode] = detail;
      });
    }
    return result;
  }


  checkFlightsIsEmpty() {
    return (!this.result) || (Object.keys(this.result).length === 0);
  }

  async iteratorFlights(callback) {
    for await (const IPCC of Object.keys(this.result)) {
      const { group, flightList } = this.result[IPCC];
      // 获取profit
      const defaultProfit = await this.app.ctx.model.Profit.find({
        flightType: '',
        segment: '',
        isValid: true,
        group,
      });
      const profitList = await this.app.ctx.model.Profit.find({
        segment: this.cityCodePair.from + '-' + this.cityCodePair.to,
        flightType: this.params.tripType,
        isValid: true,
        group,
      });
      // 获取加价策略
      const revenueList = await this.app.ctx.model.Revenue.find({
        isValid: true,
        carrierType: 'FSC',
        group,
        IPCC,
      });
      // 获取baggage
      const baggageList = await this.app.service.baggage.getBaggageInfoList({
        flightType: this.params.tripType,
        from: this.cityCodePair.from,
        to: this.cityCodePair.to,
      });
      // 获取退改签
      const defaultPenalty = await this.app.ctx.model.Penalty.find({
        flightType: '',
        segment: '',
        isValid: true,
        group,
      });
      const penaltyList = await this.app.ctx.model.Penalty.find({
        flightType: this.params.tripType,
        segment: this.cityCodePair.from + '-' + this.cityCodePair.to,
        isValid: true,
        group,
      });
      await Promise.allSettled(flightList.map(async flight => {
        await callback(flight, {
          profitList: [ ...profitList, ...defaultProfit ],
          revenueList,
          baggageList,
          penaltyList: [ ...penaltyList, ...defaultPenalty ],
          group,
          IPCC,
        });
      }));
    }
  }


  /**
   * 利率加价
   * @param {*} eachFlightData - 一条航线的信息
   * @param {*} profitList - 可能符合的利率政策列表
   */
  async resolveProfit(eachFlightData, profitList) {
    const { departPart, policyDetailInfo, schema } = eachFlightData;
    let finalPolicy = policyDetailInfo;
    let finalProfit = null;
    const transit = schema.includes('*');
    const { airline, subClass } = departPart[0];
    let theLowestAdultPrice = Infinity;
    profitList.forEach(profit => {
      if (profit.transit && String(transit) !== profit.transit) return;
      if (profit.company && !profit.company.includes(airline)) return;
      if (profit.cabin && !profit.cabin.includes(subClass)) return;
      if (profit.dateStart && profit.dateEnd && !between(this.params.departTime, profit.dateStart, profit.dateEnd)) return;
      if (Array.isArray(profit.travelRange) && profit.travelRange.length > 0) {
        const isMatchedDate = profit.travelRange.some(range => {
          const { travelStart, travelEnd } = range;
          return betweenMoment(this.params.departTime, travelStart, travelEnd, 'days', '[]');
        });
        if (!isMatchedDate) return;
      }
      if (profit) {
        const newPolicy = this.raisePrice(policyDetailInfo, profit, 'profitType');
        const price = newPolicy.adultPrice.salePrice + newPolicy.adultPrice.tax;
        if (price !== 0 && price < theLowestAdultPrice) {
          theLowestAdultPrice = price;
          finalPolicy = newPolicy;
          finalProfit = profit;
        }
      }
    });
    finalPolicy.profit = finalProfit;
    eachFlightData.policyDetailInfo = finalPolicy;
  }

  raisePrice(priceInfo, profitInfo, type) {
    if (!type) return priceInfo;
    // 防止修改原数据
    const result = { ...priceInfo };
    const { percent, trim, fixedPrice, fixedTax } = profitInfo;
    const raiseType = profitInfo[type];
    if (raiseType === 'percent' || !raiseType) {
      Object.keys(result).forEach(key => {
        if (!priceInfo[key] || !priceInfo[key].salePrice) return;
        result[key] = {
          salePrice: Number((priceInfo[key].salePrice * (percent / 100) + trim * this.cnyRate).toFixed(0)),
          tax: Number((priceInfo[key].tax * (percent / 100)).toFixed(0)),
        };

      });
    } else {
      Object.keys(result).forEach(key => {
        if (!priceInfo[key] || !priceInfo[key].salePrice) return;
        result[key] = {
          salePrice: Number((fixedPrice * this.cnyRate).toFixed(0)),
          tax: Number((fixedTax * this.cnyRate).toFixed(0)),
        };
      });
    }
    return result;
  }

  /**
   * 二次加价
   * @param {*} eachFlightData - 一条航线的信息
   * @param {*} revenueList - 可能符合的二次加价政策列表
   */
  async resolveRevenue(eachFlightData, revenueList) {
    const { policyDetailInfo } = eachFlightData;
    if (revenueList.length === 0) return;
    const revenueInfo = revenueList[0];
    eachFlightData.policyDetailInfo = this.raisePrice(policyDetailInfo, revenueInfo, 'revenueType');
    eachFlightData.policyDetailInfo.revenue = revenueInfo;
  }


  /**
   * 处理行李额和退改签
   * @param {*} eachFlightData - 一条航线的信息
   * @param {*} baggageList - 可能符合的行李额政策列表
   * @param {*} penaltyList - 可能符合的退改签政策列表
   * @param {*} group - IPCC的group
   * @param {*} IPCC - IPCC
   */
  async resolvePenaltyAndBaggage(eachFlightData, baggageList, penaltyList, group, IPCC) {
    const baggageInfoList = this.app.service.baggage.generateBaggageInfoNew(baggageList, eachFlightData, group, IPCC, this.params.departTime);
    const penaltyInfoList = this.app.service.penalty.generatePenaltyInfo(penaltyList, eachFlightData, this.params.departTime);
    eachFlightData.additonalInfo.baggageInfoList = baggageInfoList;
    eachFlightData.additonalInfo.penaltyInfoList = penaltyInfoList;
  }

  /**
   * 对result进行包装
   * TODO: 后续为了可读性，可将代码分割至不同的工具方法中
   */
  packageFlights() {
    const result = [];
    Object.keys(this.result).forEach(IPCC => {
      const { flightList, redisKey, group } = this.result[IPCC];
      flightList.forEach(flight => {
        try {
          const flightInfo = this.handleEachFlight(flight, redisKey, group, IPCC);
          if (flightInfo) {
            result.push(flightInfo);
          }
        } catch (e) {
          // console.log(e);
        }
      });
    });
    this.result = result;
  }

  // "1135(+8)-0155-OZ-362-E&S-PVG-T2-ICN-T1-1-77L-SLOCJ-1430(+9)-P3886454/0405*1835(+9)-0225-OZ-108-E&S-ICN-T1-NRT-T1-1-333-SLOCJ-2100(+9)-P3886454|226.00-72.16-170.00-60.50-170.00-60.50"
  // 1135(+8)-0155-OZ-362-E&S-PVG-T2-ICN-T1-1-77L-SLOCJ-1430(+9)-P3886454/0405
  // 1835(+9)-0225-OZ-108-E&S-ICN-T1-NRT-T1-1-333-SLOCJ-2100(+9)-P3886454
  // 226.00-72.16-170.00-60.50-170.00-60.50

  resolveSchema(schema, vendibilityCompanies) {
    if (!schema || vendibilityCompanies.length === 0) return null;
    const parseFlightGroupInfo = flightInfoList => {
      const regexp = /\([-+]?\d+\)/g;
      // 记录一程中的所有转乘机场
      const stopList = [];
      // 保存一程中的所有航班信息
      const flightGroupInfoList = [];
      for (let value of flightInfoList) {
        let stopTime;
        let hasStop;
        // 存在转乘耗时
        if (value.includes('/')) {
          hasStop = true;
          stopTime = value.split('/')[1];
          value = value.split('/')[0];
        }
        const timeZoneList = [ ...value.matchAll(regexp) ];
        const messageList = value.replaceAll(regexp, '').split('-');
        // 到达机场
        const arrivalAirport = messageList[7];
        // 航司
        const airline = messageList[2];
        if (!vendibilityCompanies.includes(airline)) {
          return { flightGroupInfoList: [] };
        }
        const cabinType = messageList[4].split('&')[0];
        if (cabinType !== this.params.cabinType) {
          return { flightGroupInfoList: [] };
        }
        if (hasStop) {
          stopList.push(arrivalAirport);
          this.stopList.add(arrivalAirport);
        }
        flightGroupInfoList.push({
          departTime: messageList[0] + timeZoneList[0][0], // 1520(+8)
          costTime: messageList[1], // 0210
          airline, // TG
          flightNo: messageList[3], // 613
          cabinType, // E
          subClass: messageList[4].split('&')[1], // V
          departAirport: messageList[5], // KMG
          departTerminal: messageList[6], // T2
          arrivalAirport, // KMG
          arrivalTerminal: messageList[8], // T2
          baggage: messageList[9], // 1 或者 25kg
          planeType: messageList[10], // 321
          fareBasisCode: messageList[11], // Y1ABDA0S
          arrivalTime: messageList[12] + timeZoneList[1][0], // 1730(+8)
          IPCC: messageList[13],
          stopTime, // 0210
        });
      }
      return { flightGroupInfoList, stopList };
    };

    let departPart,
      returnPart,
      departStopList,
      returnStopList;
    const [ flightInfo, priceInfo ] = schema.split('|');
    if (this.params.tripType === 'OW') {
      const { flightGroupInfoList: dl, stopList: ds } = parseFlightGroupInfo(flightInfo.split('*'));
      if (dl.length === 0) return null;
      departPart = dl;
      departStopList = ds;
      returnPart = null;
      returnStopList = new Set();
    } else {
      const rtData = flightInfo.split('@');
      const { flightGroupInfoList: dl, stopList: ds } = parseFlightGroupInfo(rtData[0].split('*'));
      if (dl.length === 0) return null;
      const { flightGroupInfoList: rl, stopList: rs } = parseFlightGroupInfo(rtData[1].split('*'));
      if (!rl.length === 0) return null;
      departPart = dl;
      departStopList = ds;
      returnPart = rl;
      returnStopList = rs;
    }

    if (!this.checkFromTo(departPart, returnPart)) return null;
    const priceInfoList = priceInfo.split('-');
    const policyDetailInfo = {
      adultPrice: {
        salePrice: helper.calculatePrice(priceInfoList[0], this.currencyRate),
        tax: helper.calculatePrice(priceInfoList[1], this.currencyRate),
      },
      childPrice: {
        salePrice: helper.calculatePrice(priceInfoList[2], this.currencyRate),
        tax: helper.calculatePrice(priceInfoList[3], this.currencyRate),
      },
      infantPrice: {
        salePrice: helper.calculatePrice(priceInfoList[4], this.currencyRate),
        tax: helper.calculatePrice(priceInfoList[5], this.currencyRate),
      },
    };
    return {
      departPart,
      returnPart,
      policyDetailInfo,
      schema,
      stopList: new Set([ ...departStopList, ...returnStopList ]),
      // 目前用于承接行李额/退改签, 利用这个变量有序可以保存更多的不可预见的且与价格无关的信息
      additonalInfo: {},
    };
  }

  checkFromTo(departPart, returnPart) {
    const depart = departPart[0].departAirport;
    const arrival = departPart[departPart.length - 1].arrivalAirport;
    // SHA - NRT
    const departIsCity = this.params.from === this.cityCodePair.from;
    const arrivalIsCity = this.params.to === this.cityCodePair.to;
    // 出发地是城市
    if (departIsCity) {
      if (!arrivalIsCity) {
        // 到达不是城市，且机场不匹配
        return this.params.to === arrival;
      }
    } else {
      // 出发不是城市，且机场不匹配
      if (depart !== this.params.from) {
        return false;
      }
      if (!arrivalIsCity) {
        // 到达不是城市，且机场不匹配
        return this.params.to === arrival;
      }
    }

    if (this.params.tripType === 'RT') {
      const returnDepart = returnPart[0].departAirport;
      const returnArrival = returnPart[returnPart.length - 1].arrivalAirport;
      // 出发地是城市
      if (departIsCity) {
        if (!arrivalIsCity) {
          return returnDepart === this.params.to;
        }
      } else {
        // 返程的出发不是城市，且机场不匹配
        if (returnDepart !== this.params.to) {
          return false;
        }
        if (!arrivalIsCity) {
          // 到达不是城市，且机场不匹配
          return this.params.from !== returnArrival;
        }
      }
    }
    return true;
  }

  createLink() {
    const baseLink = this.app.service.link.flightBasicLink(this.params);
    this.result.forEach(eachFlightData => {
      const urlParams = new URLSearchParams();
      urlParams.append('language', this.params.language);
      urlParams.append('currency', this.params.currency);
      urlParams.append('redisCode', eachFlightData.redisCode);
      urlParams.append('shoppingId', eachFlightData.shoppingId);
      urlParams.append('segmentSchema', decodeURIComponent(eachFlightData.redisSchema));
      urlParams.append('group', eachFlightData.group);
      urlParams.append('tripType', this.params.tripType);
      urlParams.append('cabinType', this.params.cabinType);
      urlParams.append('departCity', this.params.from);
      urlParams.append('arriveCity', this.params.to);
      urlParams.append('departTime', this.params.departTime);
      if (this.params.returnTime) {
        urlParams.append('returnTime', this.params.returnTime);
      }
      urlParams.append('adult', this.params.passenger[0].count);
      urlParams.append('children', this.params.passenger[1].count);
      urlParams.append('infant', this.params.passenger[2].count);
      urlParams.append('mktportal', this.params.mktportal);
      urlParams.append('IPCC', eachFlightData.IPCC);
      urlParams.append('skutype', eachFlightData.shoppingType);
      if (eachFlightData.policyInfo.baggageInfoList[0]._id) {
        urlParams.append('baggageId', eachFlightData.policyInfo.baggageInfoList[0]._id);
      }
      if (eachFlightData.policyInfo.penaltyInfoList[0].penaltyInfo && eachFlightData.policyInfo.penaltyInfoList[0].penaltyInfo._id) {
        urlParams.append('penaltyId', eachFlightData.policyInfo.penaltyInfoList[0].penaltyInfo._id);
      }
      if (eachFlightData.policyDetailInfo.revenue && eachFlightData.policyDetailInfo.revenue.revenueId) {
        urlParams.append('revenueId', eachFlightData.policyDetailInfo.revenue.revenueId);
      }
      if (eachFlightData.policyDetailInfo.profit && eachFlightData.policyDetailInfo.profit._id) {
        urlParams.append('profitId', eachFlightData.policyDetailInfo.profit._id);
      }
      // eur 2 target currency
      urlParams.append('currencyRate', this.currencyRate);
      // rmb 2 target currency
      urlParams.append('cnyRate', this.cnyRate);
      eachFlightData.deeplink = baseLink + '&sku=' + btoa(urlParams);
    });
  }

  /**
   * 用于格式化每一条航线的信息
   * @param {*} param0 - 一条航线的信息
   * @param {*} redisCode -  redis key
   * @return {Object} - 格式化后的航线信息
   */
  handleEachFlight({ departPart, returnPart, policyDetailInfo, schema, stopList, additonalInfo }, redisCode, group, IPCC) {
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
        flightTripTitle: '',
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
          overallData.departMultCityName = v.departAirport;
          // overallData.departMultCityName = this.airportDetails[v.departAirport].citycode;
          departTime = v.departTime;
        }

        if (index === part.length - 1) {
          try {
            overallData.arriveMultCityName = v.arrivalAirport;
            // overallData.arriveMultCityName = this.airportDetails[v.arrivalAirport].citycode;
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
            // code: this.airportDetails[v.departAirport].citycode,
            // name: this.airportDetails[v.departAirport].citycode,
            code: v.departAirport,
            name: v.departAirport,
          },
          aCityInfo: {
            // code: this.airportDetails[v.arrivalAirport].citycode,
            // name: this.airportDetails[v.arrivalAirport].citycode,
            code: v.arrivalAirport,
            name: v.arrivalAirport,
          },
          dPortInfo: {
            code: v.departAirport,
            // name: this.airportDetails[v.departAirport].airportname,
            name: v.departAirport,
            terminal: v.departTerminal,
          },
          aPortInfo: {
            code: v.arrivalAirport,
            // name: this.airportDetails[v.arrivalAirport].airportname,
            name: v.arrivalAirport,
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
          durationInfo: {
            hour: durationInfo.hour.toString(),
            min: durationInfo.min.toString(),
          },
          transferDurationInfo: transferDurationInfo ? {
            hour: transferDurationInfo.hour.toString(),
            min: transferDurationInfo.min.toString(),
          } : null,
          stopInfoList: stopList,
          flightNo: v.flightNo,
          fareBasisCode: v.fareBasisCode,
          segmentNo: index + 1,
          segmentId: helper.GUID(),
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
        duration: {
          h: duration.h.toString(),
          m: duration.m.toString(),
        },
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
    const { adultPrice, childPrice, infantPrice, ...left } = policyDetailInfo;
    return {
      currency: this.params.currency,
      currencyRate: this.currencyRate,
      cnyRate: this.cnyRate,
      flightGroupInfoList,
      policyDetailInfo: {
        adultPrice: {
          salePrice: adultPrice.salePrice.toString(),
          tax: adultPrice.tax.toString(),
        },
        childPrice: {
          salePrice: childPrice.salePrice.toString(),
          tax: childPrice.tax.toString(),
        },
        infantPrice: {
          salePrice: infantPrice.salePrice.toString(),
          tax: infantPrice.tax.toString(),
        },
        ticketDeadlineType: 2,
        limitInfo: null,
        ...left,
        ...this.calcPriceInfo(policyDetailInfo),
      },
      policyInfo: {
        baggageInfoList: additonalInfo.baggageInfoList,
        penaltyInfoList: additonalInfo.penaltyInfoList,
      },
      redisCode,
      group,
      redisSchema: schema,
      segmentSchema: schema.split('|')[0],
      IPCC,
      shoppingId: helper.GUID(),
      shoppingType: 'fsc',
    };
  }

  calcPriceInfo(policyDetailInfo) {
    const adultPrice = policyDetailInfo.adultPrice.salePrice + policyDetailInfo.adultPrice.tax;
    const childPrice = policyDetailInfo.childPrice.salePrice + policyDetailInfo.childPrice.tax;
    const infantPrice = policyDetailInfo.infantPrice.salePrice + policyDetailInfo.infantPrice.tax;
    const adultCount = this.params.passenger[0].count;
    const childCount = this.params.passenger[1].count;
    const infantCount = this.params.passenger[2].count;
    return {
      priceId: helper.GUID(),
      avgPrice: ((adultPrice * adultCount + childPrice * childCount + infantPrice * infantCount) / (adultCount + childCount + infantCount)).toFixed(0),
      totalPrice: (adultPrice * adultCount + childPrice * childCount + infantPrice * infantCount).toFixed(0),
    };
  }

  async refreshFlightCache(IPCCs) {
    IPCCs.forEach(IPCC => {
      if (this.params.tripType === 'OW') {
        this.app.service.flight.refreshFlightCache(
          [{ from: this.params.from, to: this.params.to, departureDate: this.params.departTime }],
          IPCC
        );
      } else {
        this.app.service.flight.refreshFlightCache(
          [
            { from: this.params.from, to: this.params.to, departureDate: this.params.departTime },
            { from: this.params.to, to: this.params.from, departureDate: this.params.returnTime },
          ],
          IPCC
        );
      }
    });
  }
};
