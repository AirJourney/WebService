'use strict';

const Service = require('egg').Service;

class InfoService extends Service {
  async getHotCity() {
    const { ctx } = this;
    const data = ctx.model.Hotcity.find();
    return data;
  }

  async createHotCity(payload) {
    return this.ctx.model.Hotcity.create(payload);
  }

  async createProfit(payload) {
    return this.ctx.model.Profit.create(payload);
  }

  async getProfit(payload) {
    const { ctx } = this;
    const { flightType, segment, number, company, cabin, date } = payload;
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

    const defaultProfit = await ctx.model.Profit.findOne({
      $and: [
        { flightType: '' },
        { segment: '' },
        { number: '' },
        { company: '' },
        { cabin: '' },
        { date: '' },
      ],
    });

    return {
      conditionProfit,
      defaultProfit,
    };
  }

  async createConfig(payload) {
    return this.ctx.model.Config.create(payload);
  }

  async getConfig(configKey) {
    const { ctx, app } = this;
    // const configList = await ctx.model.Config.find();
    // return configList;

    const configValue = await app.redis.get('db3').get(configKey);
    return configValue;

  }
}

module.exports = InfoService;
