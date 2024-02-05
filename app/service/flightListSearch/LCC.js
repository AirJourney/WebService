'use strict';

const { between } = require('../../extend/time');
const FlightListSearch = require('./FlightListSearch');

module.exports = class LCC extends FlightListSearch {

  async resolveCurrency() {
    if (this.params.currency === 'USD') {
      this.currencyRate = 1;
    } else {
      const currencyRate = await this.app.app.redis.get('db2').smembers(`USD2${this.params.currency}`);
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
      GDS: 'External',
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
    // TODO: 多个LCC需要根据ipcc，group分组，like galileo
    if (sellFlights.length === 0) return [];
    const allPromiseTask = await Promise.allSettled(sellFlights.map(({ IPCC, group, vendibilityCompanies }) => {
      return Promise.race([
        this.getLCCFlights(IPCC, group, vendibilityCompanies),
        new Promise(resolve => {
          setTimeout(() => {
            resolve('timeout');
          }, 20000);
        }),
      ]);
    }));
    const result = [];
    allPromiseTask.forEach(values => {
      if (values.status === 'fulfilled') {
        const content = values.value;
        if (content && content !== 'timeout' && content.length > 0) {
          result.push(...content);
        }
      }
    });
    return result;
  }

  async getLCCFlights(IPCC, group, vendibilityCompanies) {
    const redisCode = this.getRedisKey();
    const shoppingUrl = await this.app.service.ipcc.getIPCC({
      group,
      IPCC,
      apiType: 'shoppingApi',
    });
    if (!shoppingUrl) {
      return [];
    }
    const externalRes = await this.app.ctx.curl(shoppingUrl, {
      method: 'POST',
      contentType: 'json',
      data: this.origialParams,
      dataType: 'json',
      timeout: 8000,
    });
    if (externalRes.status === 200 && externalRes.data && externalRes.data.status) {
      const result = [];
      externalRes.data.content.forEach(v => {
        const isNFS = v.flightGroupInfoList[0].flightSegments.every(segment => {
          return !vendibilityCompanies.includes(segment.airlineInfo.code);
        });
        if (isNFS) return;
        const redisSchema = this.createRedisSegment(v, IPCC);
        result.push({
          ...v,
          group,
          IPCC,
          redisCode,
          redisSchema,
          segmentSchema: redisSchema.split('|')[0],
        });
      });
      return result;
    }
    return [];
  }

  createRedisSegment(flightInfo, IPCC) {
    return this.app.service.link.generateSchema(flightInfo, IPCC);
  }


  checkFlightsIsEmpty() {
    return (!this.result) || (Object.keys(this.result).length === 0);
  }

  async iteratorFlights(callback) {
    const group = this.result[0].group;
    const IPCC = this.result[0].IPCC;
    // TODO: getFlights改造后同步改造，这么写是因为现在只会有一个LCC的IPCC
    const revenueList = await this.app.ctx.model.Revenue.find({
      isValid: true,
      carrierType: 'LCC',
      group,
      IPCC,
    });
    for await (const eachFlightData of this.result) {
      // 获取加价策略
      await callback(eachFlightData, {
        revenueList,
        group: eachFlightData.group,
        IPCC: eachFlightData.IPCC,
      });
    }
  }


  /**
   * 利率加价
   * @param {*} eachFlightData - 一条航线的信息
   * @param {*} profitList - 可能符合的利率政策列表
   */
  async resolveProfit(eachFlightData) {
    eachFlightData.policyDetailInfo = {
      ...eachFlightData.policyDetailInfo,
      avgPrice: (Number(eachFlightData.policyDetailInfo.avgPrice) * this.currencyRate).toFixed(0),
      totalPrice: (Number(eachFlightData.policyDetailInfo.totalPrice) * this.currencyRate).toFixed(0),
      adultPrice: {
        salePrice: (Number(eachFlightData.policyDetailInfo.adultPrice.salePrice) * this.currencyRate).toFixed(0),
        tax: (Number(eachFlightData.policyDetailInfo.adultPrice.tax) * this.currencyRate).toFixed(0),
      },
      infantPrice: {
        salePrice: (Number(eachFlightData.policyDetailInfo.adultPrice.salePrice) * this.currencyRate).toFixed(0),
        tax: (Number(eachFlightData.policyDetailInfo.adultPrice.tax) * this.currencyRate).toFixed(0),
      },
      childPrice: {
        salePrice: (Number(eachFlightData.policyDetailInfo.childPrice.salePrice) * this.currencyRate).toFixed(0),
        tax: (Number(eachFlightData.policyDetailInfo.childPrice.tax) * this.currencyRate).toFixed(0),
      },
    };
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
          salePrice: (Number(priceInfo[key].salePrice) * (percent / 100) + trim * this.cnyRate).toFixed(0),
          tax: (Number(priceInfo[key].tax) * (percent / 100)).toFixed(0),
        };

      });
    } else {
      Object.keys(result).forEach(key => {
        if (!priceInfo[key] || !priceInfo[key].salePrice) return;
        result[key] = {
          salePrice: (fixedPrice * this.cnyRate).toFixed(0),
          tax: (fixedTax * this.cnyRate).toFixed(0),
        };
      });
    }
    return result;
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
    return;
  }

  /**
   * 对result进行包装
   * TODO: 后续为了可读性，可将代码分割至不同的工具方法中
   */
  packageFlights() {
    this.result = this.result.map(flightInfo => {
      return {
        ...flightInfo,
        currency: this.params.currency,
        group: flightInfo.group,
      };
    });
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
    const redisKey = this.getRedisKey();
    this.result.forEach(eachFlightData => {
      const urlParams = new URLSearchParams();
      urlParams.append('language', this.params.language);
      urlParams.append('currency', this.params.currency);
      urlParams.append('redisCode', redisKey);
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
      urlParams.append('segmentSchema', decodeURIComponent(eachFlightData.redisSchema));
      urlParams.append('shoppingId', eachFlightData.shoppingId);
      // if (eachFlightData.policyInfo.baggageInfoList[0]._id) {
      //   urlParams.append('baggageId', eachFlightData.policyInfo.baggageInfoList[0]._id);
      // }
      // if (eachFlightData.policyInfo.penaltyInfoList[0].penaltyInfo._id) {
      //   urlParams.append('penaltyId', eachFlightData.policyInfo.penaltyInfoList[0].penaltyInfo._id);
      // }
      if (eachFlightData.policyDetailInfo.revenue) {
        urlParams.append('revenueId', eachFlightData.policyDetailInfo.revenue.revenueId);
      }
      // if (eachFlightData.policyDetailInfo.profit._id) {
      //   urlParams.append('profitId', eachFlightData.policyDetailInfo.profit._id);
      // }
      // eur 2 target currency
      urlParams.append('currencyRate', this.currencyRate);
      // rmb 2 target currency
      urlParams.append('cnyRate', this.cnyRate);
      eachFlightData.deeplink = baseLink + '&sku=' + btoa(urlParams);
    });
  }
};

