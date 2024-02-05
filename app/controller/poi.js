'use strict';

const Controller = require('egg').Controller;
const helper = require('../extend/helper');
const poiList = require('../public/poi.json');

class PoiController extends Controller {
  async createPoi() {
    const { ctx, service } = this;
    const result = await service.poi.createPoi(poiList);
    helper.ResFormat(this.ctx, '', true, 'Poi success', result);
  }

  async getPoi() {
    const { ctx, service } = this;
    const result = await service.poi.getPoi(ctx.request.body);
    helper.ResFormat(this.ctx, '', true, 'Poi success', result);
  }
}

module.exports = PoiController;
