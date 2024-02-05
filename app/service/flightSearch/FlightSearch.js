'use strict';
module.exports = class FlightSearch {
  constructor(app) {
    if (this.constructor === FlightSearch) {
      throw new Error("Abstract classes can't be instantiated.");
    }
    // 类型的名称，只做记录，此字段无意义
    this.type = this.constructor.name;
    this.app = app;
    // 简化成一个查询参数对象，方便后续使用
    this.params = {};
    this.storedData = null;
  }

  async resolveCurrency() {
    throw new Error('You have to implement the method resolveCurrency!');
  }

  async getFlight() {
    throw new Error('You have to implement the method getFlight!');
  }

  async resolveProfitInfo() {
    throw new Error('You have to implement the method resolveProfitInfo!');
  }

  async resolveRenvenuInfo() {
    throw new Error('You have to implement the method resolveRenvenuInfo!');
  }

  async resovePenaltyAndBaggageInfo() {
    throw new Error('You have to implement the method resovePenaltyAndBaggageInfo!');
  }

  packageResult() {
    throw new Error('You have to implement the method packageResult!');
  }

  generateParams(searchParams) {
    const { language, ...left } = searchParams;
    let l = language;
    const enabledLanguage = [ 'tc', 'en', 'cn' ];
    if (!enabledLanguage.includes(language)) {
      l = 'en';
    }
    this.params = {
      ...left,
      language: l,
    };
  }


  async process(searchParams) {
    this.generateParams(searchParams);
    await this.resolveCurrency();
    await this.getFlight();
    if (!this.storedData) {
      throw new Error('no flight');
    }
    await this.resolveProfitInfo();
    await this.resolveRenvenuInfo();
    await this.resovePenaltyAndBaggageInfo();
    const shoppingInfo = this.packageResult();
    await this.app.service.flight.saveFlightInfo(shoppingInfo);
    return shoppingInfo;
  }
};
