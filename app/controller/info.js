'use strict';

const Controller = require('egg').Controller;
const helper = require('../extend/helper');

class InfoApiController extends Controller {
  async getHotCity() {
    const hotCityList = await this.service.info.getHotCity();
    helper.ResFormat(this.ctx, '', true, 'hotCityList success', hotCityList);
  }

  async createHotCity() {
    const { ctx, service } = this;
    const hotCityList = require('../public/hot-city.json');
    const result = await service.info.createHotCity(hotCityList);
    helper.ResFormat(this.ctx, '', true, 'hotCityList success', result);
  }

  async getProfit() {
    const { ctx, service } = this;
    const profitInfo = await service.info.getProfit(ctx.request.body);
    helper.ResFormat(ctx, '', true, 'profit success', profitInfo);
  }

  async createConfig() {
    const { ctx, service } = this;
    const result = await service.info.createConfig(ctx.request.body);
    helper.ResFormat(this.ctx, '', true, 'config success', result);
  }

  async getConfig() {
    const { ctx, service } = this;
    const configList = await service.info.getConfig(ctx.request.body);
    helper.ResFormat(ctx, '', true, 'Config success', configList);
  }
}

module.exports = InfoApiController;
