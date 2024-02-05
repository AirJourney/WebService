'use strict';
const Controller = require('egg').Controller;
const helper = require('../extend/helper');


class BaggageController extends Controller {
  async getBaggageList() {
    const { ctx } = this;
    const params = ctx.request.body;
    try {
      const count = await ctx.service.baggage.getBaggageCount(params);
      const list = await ctx.service.baggage.getBaggageList(params);
      if (Array.isArray(list)) {
        helper.ResFormat(ctx, '', true, '', list, { total: count });
      } else {
        helper.ResFormat(ctx, '', false, 'no result', []);
      }
    } catch (e) {
      helper.ResFormat(ctx, '', false, e, []);
    }
  }

  async getBaggageInfo() {
    const { ctx } = this;
    const params = ctx.request.body;
    try {
      const info = await ctx.service.baggage.getBaggageInfo(params);
      helper.ResFormat(ctx, '', true, '', info);
    } catch (e) {
      helper.ResFormat(ctx, '', false, '', {});
    }
  }
  async addBaggageInfo() {
    const { ctx } = this;
    const params = ctx.request.body;
    try {
      const info = await ctx.service.baggage.addBaggageInfo(params);
      helper.ResFormat(ctx, '', true, '', info);
    } catch (e) {
      helper.ResFormat(ctx, '', false, '', {});
    }
  }
  async updateBaggageInfo() {
    const { ctx } = this;
    const params = ctx.request.body;
    try {
      const info = await ctx.service.baggage.updateBaggageInfo(params);
      helper.ResFormat(ctx, '', true, '', info);
    } catch (e) {
      helper.ResFormat(ctx, '', false, '', {});
    }
  }
  async deleteBaggageInfo() {
    const { ctx } = this;
    const { ids } = ctx.request.body;
    try {
      const info = await ctx.service.baggage.deleteBaggageInfo(ids);
      helper.ResFormat(ctx, '', true, '', info);
    } catch (e) {
      helper.ResFormat(ctx, '', false, '', {});
    }
  }

  async addonBaggageList() {
    const { ctx, service } = this;
    const { sessionid, userid } = ctx.request.header;
    const { skuType } = ctx.request.body;
    const referer = ctx.request.headers.referer;
    const params = { userid, referer, ...this.ctx.request.body };


    if (skuType === 'lcc') {
      const addonBaggageList = await service.baggage.addonBaggageList(params);
      helper.ResFormat(this.ctx, sessionid, true, 'addonBaggageList success', addonBaggageList);

    }


  }
}

module.exports = BaggageController;
