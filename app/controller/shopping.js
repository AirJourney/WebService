'use strict';

const Controller = require('egg').Controller;
const helper = require('../extend/helper');
const timeHelper = require('../extend/time');
const { getRandomCacheMachine } = require('../extend/utils');
const { inCurrency, inLanguage } = require('../public/inBasic');

class ShoppingApiController extends Controller {
  async getFlight() {
    const { sessionid } = this.ctx.request.header;
    const referer = this.ctx.request.headers.referer;
    this.ctx.request.body.language = inLanguage(this.ctx.request.body.language); // 修改为所需的语言
    this.ctx.request.body.currency = inCurrency(this.ctx.request.body.currency); // 修改为所需的语言

    /** 获取航线信息 */
    const flightList = await this.service.shopping.getShoppingList(
      this.ctx.request.body
    );

    if (flightList.length > 0) {
      await this.service.link.BookingDeepLink(
        this.ctx.request.body,
        flightList
      );

      helper.ResFormat(this.ctx, sessionid, true, '', flightList);

      await this.service.shopping.saveShoppingInfo(flightList, sessionid);

      /** check逻辑 */
      const { tripSearch } = this.ctx.request.body;

      tripSearch.forEach(trip => {
        trip.from = trip.depart;
        trip.to = trip.arrive;
        trip.departureDate = trip.departTime;
      });

      this.ctx.curl(getRandomCacheMachine() + ':9001/check', {
      // this.ctx.curl("http://127.0.0.1:9001/check", {
        method: 'POST',
        contentType: 'json',
        dataType: 'json',
        headers: {},
        data: {
          leg: tripSearch,
        },
        timeout: 50000, // 设置超时时间为 5 秒
      });
    } else {
      /** 查询无结果时*/
      /** 优先异步重查 */
      const { tripSearch } = this.ctx.request.body;

      tripSearch.forEach(trip => {
        trip.from = trip.depart;
        trip.to = trip.arrive;
        trip.departureDate = trip.departTime;
      });

      const recallRes = await this.ctx.curl(getRandomCacheMachine() + ':9001/check', {
      // const recallRes = await this.ctx.curl("http://127.0.0.1:9001/check", {
        method: 'POST',
        contentType: 'json',
        dataType: 'json',
        headers: {},
        data: {
          leg: tripSearch,
        },
        timeout: 50000, // 设置超时时间为 5 秒
      });

      if (recallRes && recallRes.data > 0) {
        const flightList = await this.service.shopping.getShoppingList(
          this.ctx.request.body
        );

        if (flightList.length > 0) {
          await this.service.link.BookingDeepLink(
            this.ctx.request.body,
            flightList
          );

          await this.service.shopping.saveShoppingInfo(flightList, sessionid);
        }
        helper.ResFormat(this.ctx, sessionid, true, '', flightList);
      } else {
        helper.ResFormat(this.ctx, sessionid, true, '', []);
      }
    }

    this.service.trace.createTrace({
      traceType: 'pv',
      dateTime: timeHelper.nowDateTime(),
      pageType: 'shopping',
      api: 'controller/getFlight',
      refer: referer,
      content: `request:${JSON.stringify(this.ctx.request.body)},response:${flightList.length}`,
    });
  }

  async getShopping() {
    const { sessionid } = this.ctx.request.header;
    const referer = this.ctx.request.headers.referer;
    const shoppingInfo = await this.service.shopping.getShoppingInfo(
      this.ctx.request.body
    );
    if (shoppingInfo) {
      helper.ResFormat(this.ctx, sessionid, true, '', shoppingInfo);
    } else {
      helper.ResFormat(
        this.ctx,
        sessionid,
        false,
        'shoppingInfo is null',
        shoppingInfo
      );
    }
    this.service.trace.createTrace({
      traceType: 'log',
      dateTime: timeHelper.nowDateTime(),
      pageType: 'shopping',
      api: 'controller/shoppingdetail',
      refer: referer,
      content: `request:${JSON.stringify(this.ctx.request.body)}`,
    });
  }

  async recommend() {
    const { ctx, service } = this;
    const recommendCache = require('../data/recommendCache.json');
    const { currency } = ctx.request.body;
    const recommendList = [];
    for (let i = 0; i < recommendCache.length; i++) {
      const flightList = await service.shopping.getShoppingListByRedisKey(
        recommendCache[i],
        currency,
        'E'
      );
      if (flightList && flightList.length > 0) {
        recommendList.push(flightList[0]);
      } else {
        console.log(recommendCache[i]);
      }
    }
    helper.ResFormat(ctx, '', true, '', recommendList);
  }

  /**
   * 验舱验价
   */
  async checkShopping() {
    const { ctx } = this;
    const { sessionid } = ctx.request.header;

    const {
      redisCode,
      redisSchema,
      currency,
      shoppingId,
      priceId,
      passengerList,
    } = ctx.request.body;

    const checkResult = await ctx.service.shopping.checkShopping(
      redisCode,
      redisSchema,
      currency,
      shoppingId,
      priceId,
      passengerList
    );

    helper.ResFormat(ctx, sessionid, true, '', checkResult);
  }

  /**
   * 乘机人变价
   */
  async changePrice() {
    const { ctx } = this;
    const { sessionid } = ctx.request.header;

    const { priceId, changePassenger } = ctx.request.body;

    const changePriceInfo = await ctx.service.shopping.changePrice(
      priceId,
      changePassenger
    );

    helper.ResFormat(ctx, sessionid, true, 'Price Changed', changePriceInfo);
  }

  /**
   * 汇率变更
   *
   * @memberof ShoppingApiController
   */
  async changeCurrency() {
    const { ctx } = this;
    const { sessionid } = ctx.request.header;

    const { shoppingId, priceId, changePassenger, currency } = ctx.request.body;

    const changePriceInfo = await ctx.service.shopping.changeCurrency(
      shoppingId,
      priceId,
      changePassenger,
      currency
    );

    helper.ResFormat(ctx, sessionid, true, 'Currency Changed', changePriceInfo);
  }
}

module.exports = ShoppingApiController;
