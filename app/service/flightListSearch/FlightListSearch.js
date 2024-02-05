'use strict';

const { groupAndSortFlightsByPrice } = require('../../public/analysis');

module.exports = class FlightListSearch {
  /**
   * @param {Object} app - egg.js实例，可以方便的使用egg的一些上下文
   */
  constructor(app) {
    if (this.constructor === FlightListSearch) {
      throw new Error("Abstract classes can't be instantiated.");
    }
    // 类型的名称，只做记录，此字段无意义
    this.type = this.constructor.name;
    this.app = app;
    // 简化成一个查询参数对象，方便后续使用
    this.origialParams = {};
    this.params = {};
    // 保存一些信息，最终会呈现出一个数组，因为各个实现的存储的结构不同，所以不做类型限制
    this.result = null;
    this.cityCodePair = {};
    this.prohibitionData = {
      ipcc: null,
      company: null,
    };
    this.sellFlightList = [];
    // 存储所有机场的详细信息
    this.airportDetails = {};
    this.currencyRate = null;
    // 人民币与目标币种的汇率，处理profit的时候会用到
    this.cnyRate = 1;
  }

  generateParams(searchParams) {
    this.origialParams = searchParams;
    const { tripSearch, cabinType, tripType, passenger, currency, locale, language, mktportal = 'customer', referer } = searchParams;
    if (tripType === 'RT' && !(tripSearch[1] && tripSearch[1].departTime)) throw new Error('RT tripType must have returnTime');
    const enabledLanguage = [ 'tc', 'en', 'cn' ];
    let l = language;
    if (!enabledLanguage.includes(language)) {
      l = 'en';
    }
    this.params = {
      tripType,
      cabinType,
      from: tripSearch[0].depart,
      to: tripSearch[0].arrive,
      departTime: tripSearch[0].departTime,
      returnTime: tripType === 'RT' && tripSearch[1] ? tripSearch[1].departTime : null,
      passenger,
      currency,
      language: l,
      locale,
      mktportal,
      referer,
    };
  }

  getRedisKey() {
    const from = this.cityCodePair.from;
    const to = this.cityCodePair.to;
    const splitTime = this.params.departTime.split('-');
    const dTimeParam = splitTime[1] + splitTime[2];
    let key = `${dTimeParam}${from}${to}`;
    if (this.params.tripType === 'RT') {
      const bSplitTime = this.params.returnTime.split('-');
      const bTimeParam = bSplitTime[1] + bSplitTime[2];
      key += bTimeParam;
    }
    return key;
  }

  /**
   * 获取查询的城市对
   */
  async findCity() {
    const { from, to, language } = this.params;
    const { codePair, details } = await this.app.service.poi.getCityCodePair({ from, to, language });
    this.cityCodePair = codePair;
    // 保存一下机场-城市-国家的关系，后续会用到
    details.forEach(detail => {
      this.airportDetails[detail.airportcode] = detail;
    });
  }

  /**
   * 获取此条航线的禁售信息
   */
  async getProhibition() {
    const companyProhibitionList = await this.app.ctx.model.Vendibility.find({
      isValid: true,
      isVendibility: false,
    });
    const ipccProhibitionList = await this.app.service.sale.getProhibitionList({
      tripType: this.params.tripType,
      from: this.cityCodePair.from,
      to: this.cityCodePair.to,
    });

    this.prohibitionData = {
      ipcc: ipccProhibitionList.length > 0 ? ipccProhibitionList : null,
      company: companyProhibitionList.length > 0 ? companyProhibitionList : null,
    };
  }

  filterProhibition() {
    if (!Array.isArray(this.sellFlightList) || this.sellFlightList.length === 0) return [];
    if (!this.prohibitionData.ipcc && !this.prohibitionData.company) {
      return this.sellFlightList.map(sellFlight => ({
        IPCC: sellFlight.IPCC,
        group: sellFlight.group,
        vendibilityCompanies: sellFlight.vendibilityCompanies ? sellFlight.vendibilityCompanies.split(',') : [],
      }));
    }
    const sellFightList = [];
    for (const sellFlight of this.sellFlightList) {
      let vendibilityCompanies = sellFlight.vendibilityCompanies ? sellFlight.vendibilityCompanies.split(',') : [];
      // 检查ipcc是否禁售，如果是，则跳过
      if (this.prohibitionData.ipcc) {
        const isProhibited = this.prohibitionData.ipcc.some(
          prohibition =>
            prohibition.isProhibition &&
            prohibition.tripType === sellFlight.tripType &&
            prohibition.depart === sellFlight.depart &&
            prohibition.arrival === sellFlight.arrival &&
            (prohibition.IPCC && prohibition.IPCC.split(',').includes(sellFlight.IPCC)) &&
            prohibition.group === sellFlight.group
        );
        if (isProhibited) continue;
      }
      // 检查公司是否禁售，如果是，则过滤掉禁售公司
      if (this.prohibitionData.company) {
        vendibilityCompanies = vendibilityCompanies.filter(company => {
          const isProhibited = this.prohibitionData.company.some(
            prohibition =>
              prohibition.company === company &&
              prohibition.group === sellFlight.group
          );
          return !isProhibited;
        });
      }
      sellFightList.push({
        IPCC: sellFlight.IPCC,
        group: sellFlight.group,
        vendibilityCompanies,
      });
    }
    return sellFightList;
  }

  async resolveCurrency() {
    throw new Error('You have to implement the method resolveCurrency!');
  }

  /**
   * 对航线做一些拦截与处理
   */
  async identifySearchChannels() {
    throw new Error('You have to implement the method identifySearchChannels!');
  }

  /**
   * 查询所有可用航班
   */
  async getFlights() {
    throw new Error('You have to implement the method getFlights!');
  }

  /**
   * 根据价格排序
   */
  sort() {
    groupAndSortFlightsByPrice(this.result, 1);
  }

  /**
   * 处理退改签和行李额
   */
  async resolvePenaltyAndBaggage() {
    throw new Error('You have to implement the method resolvePenalty!');
  }

  /**
   * 处理政策相关
   */
  async resolveProfit() {
    throw new Error('You have to implement the method resolveProfit!');
  }

  /**
   * 处理网站的加价
   */
  async resolveRevenue() {
    throw new Error('You have to implement the method resolveRevenue!');
  }

  /**
   * 判断是否存在航班需要处理
   */
  checkFlightsIsEmpty() {
    throw new Error('You have to implement the method checkFlightEmpty!');
  }

  /**
   * 对result进行包装
   */
  packageFlights() {
    throw new Error('You have to implement the method checkFlightEmpty!');
  }

  /**
   * 因为各个实现的this.result的结构各不相同，所以需要实现一个迭代器，用于处理每一条航班的数据
   */
  async iteratorFlights() {
    throw new Error('You have to implement the method iteratorResult!');
  }

  /**
   * 创建deeplink
   */
  createLink() {
    throw new Error('You have to implement the method createLink!');
  }

  /**
   * 一般情况下的整体逻辑
   * @return {Array} - The flight list.
   */
  async process(searchParams) {
    try {
      this.generateParams(searchParams);
      await this.resolveCurrency();
      await this.findCity();
      // 获取sellflight
      this.sellFlightList = await this.identifySearchChannels();
      if (this.sellFlightList.length === 0) return [];
      await this.getProhibition();
      // 过滤掉禁售的航线
      const sellFlightList = this.filterProhibition();
      if (sellFlightList.length === 0) return [];
      this.result = await this.getFlights(sellFlightList);
      if (this.checkFlightsIsEmpty(this.result)) return [];
      /*
       * 目前抽象出三个过程
       * 1. 利率的计算
       * 2. 网站的加价策略
       * 3. 退改签和行李额的处理，这两个因为没有先后顺序的关系，所以是认为是可以合并的
       * 如果是调用外部接口，不需要处理，则仍需要声明一个空方法，这样是最为稳妥且易于我们拓展的
       */
      await this.iteratorFlights(async (eachFlightData, { profitList, revenueList, baggageList, penaltyList, group }) => {
        await this.resolveProfit(eachFlightData, profitList, group);
        await this.resolveRevenue(eachFlightData, revenueList, group);
        await this.resolvePenaltyAndBaggage(eachFlightData, baggageList, penaltyList, group);
      });
      // 将this.result的结构转换成契约的结构
      this.packageFlights();
      // 此时的this.result是一个数组，按照价格进行排序
      this.sort();
      // 创建deeplink，在此步是为了减少一些可能的重复或无优势产品
      this.createLink();
      return this.result;
    } catch (e) {
      console.error(e);
      return [];
    }
  }
};

