'use strict';

const Controller = require('egg').Controller;
const helper = require('../extend/helper');
const timeHelper = require('../extend/time');

const { inCurrency, inLanguage } = require('../public/inBasic');

class FlightApiController extends Controller {
  async getFlight() {
    const { sessionid } = this.ctx.request.header;
    const referer = this.ctx.request.headers.referer;
    this.ctx.request.body.language = inLanguage(this.ctx.request.body.language); // 修改为所需的语言
    this.ctx.request.body.currency = inCurrency(this.ctx.request.body.currency); // 修改为所需的语言
    const { tripSearch } = this.ctx.request.body;
    /*
     * TODO switch product
     * 根据航线去匹配FSC和LCC
     *   A 可以服务去取实时的航线文件
     *   B 可以定时任务去取实时的航线文件，放在本地，直接读取
     * 1.如果是FSC，查询Redis
     * 2.如果是LCC，查询供应商接口
     * 3.如果是混合，查询Redis和供应商接口
     */
    /** 获取航线信息 */
    let flightList = await this.service.flight.getFlightInfoList(
      this.ctx.request.body
    );

    if (flightList && flightList.length > 0) {
      flightList = await this.service.flight.getPolicy(
        flightList,
        this.ctx.request.body
      );

      flightList = await this.service.link.BookingDeepLink(
        this.ctx.request.body,
        flightList
      );

      helper.ResFormat(this.ctx, sessionid, true, '', flightList);

      /** check逻辑 */
      this.service.flight.refreshFlightCache(tripSearch);
    } else {
      /** 查询无结果时*/
      /** 优先异步重查 */
      const recallRes = await this.service.flight.refreshFlightCache(
        tripSearch,
        false
      );

      if (recallRes && recallRes.data) {
        /** 获取航线信息 */
        let flightList = await this.service.flight.getFlightInfoList(
          this.ctx.request.body
        );

        if (flightList && flightList.length > 0) {
          flightList = await this.service.flight.getPolicy(
            flightList,
            this.ctx.request.body
          );

          flightList = await this.service.link.BookingDeepLink(
            this.ctx.request.body,
            flightList
          );
        }
        helper.ResFormat(this.ctx, sessionid, true, '', flightList);
      } else {
        helper.ResFormat(this.ctx, sessionid, true, '', []);
      }
    }

    this.service.trace.createTrace({
      traceType: 'api',
      dateTime: timeHelper.nowDateTime(),
      pageType: 'shopping',
      api: 'controller/getFlight',
      refer: referer,
      content: `request:${JSON.stringify(this.ctx.request.body)},response:${
        flightList ? flightList.length : 'error'
      }`,
    });
  }

  /**
   * 根据deeplink参数生成shoppingInfo
   *  {
    "campaign": "flight",
    "deepLinkTokenId": "v-1.1",
    "locale": "TW",
    "mktportal": "skyscanner",
    "currency": "HKD",
    "tripType": "OW",
    "redisCode": "0920LAXSHA",
    "segmentSchema": "2350(+8)-1450-CZ-328-E&V-LAX-TB-CAN-T2-2-77W-V2LSRSUC-0000(+8)-P3570601/0220*0800(+8)-0225-CZ-3523-E&V-CAN-T2-SHA-T2-2-77W-V2LSRSUC-1100(+1)-P3570601|370.00-231.58-278.00-225.22-278.00-225.22",
    "departTime": "20230920",
    "returnTime": "",
    "adult": "1",
    "children": "1",
    "infant": "1"
    }
   *
   * @return {*}
   * @memberof FlightApiController
   */
  async generateFlightInfo() {
    const { ctx, service, app } = this;
    const referer = ctx.request.headers.referer;

    const {
      campaign,
      deepLinkTokenId,
      currency,
      tripType,
      redisCode,
      segmentSchema,
      departTime,
      returnTime,
      adult,
      children,
      infant,
      group,
      IPCC,
    } = ctx.request.body;

    if (campaign !== 'flight') {
      service.trace.createTrace({
        traceType: 'error',
        dateTime: timeHelper.nowDateTime(),
        pageType: 'booking',
        api: 'controller/generateFlightInfo',
        refer: referer,
        content: `request:${JSON.stringify(
          this.ctx.request.body
        )},response:campaign!=flight`,
      });
      return;
    }

    const version = deepLinkTokenId.includes('-')
      ? Number(deepLinkTokenId.split('-')[1])
      : null;
    if (version == null || version < 1.1) {
      service.trace.createTrace({
        traceType: 'error',
        dateTime: timeHelper.nowDateTime(),
        pageType: 'booking',
        api: 'controller/generateFlightInfo',
        refer: referer,
        content: `request:${JSON.stringify(
          this.ctx.request.body
        )},response:version error`,
      });
      return;
    }

    if (!segmentSchema || !tripType || !currency) {
      service.trace.createTrace({
        traceType: 'error',
        dateTime: timeHelper.nowDateTime(),
        pageType: 'booking',
        api: 'controller/generateFlightInfo',
        refer: referer,
        content: `request:${JSON.stringify(
          this.ctx.request.body
        )},response: params error`,
      });
      return;
    }

    /* 处理航段 */
    const flightGroupInfoList = await service.flight.generateFlightInfo(
      tripType,
      segmentSchema,
      departTime,
      returnTime
    );

    /** 处理价格信息 start */
    /** 价格字符串 */
    let priceString = '';
    if (tripType === 'OW') {
      priceString = segmentSchema.split('|')[1];
    } else {
      priceString = segmentSchema.split('@')[0].split('|')[1];
    }

    /** 价格信息 */
    const { priceInfo, currencyRate } = await service.price.generatePriceInfo(
      priceString,
      currency
    );

    /** 乘客信息 */
    const passenger = [
      {
        name: 'Adult',
        count: Number(adult),
        flag: 'ADT',
      },
      {
        name: 'Children',
        count: Number(children),
        flag: 'CHD',
      },
      {
        name: 'Infants',
        count: Number(infant),
        flag: 'INF',
      },
    ];

    const policyDetailInfo = await service.price.generatePolicyDetailInfo(
      priceInfo,
      passenger
    );

    /** 处理政策信息 start */
    const tripSearch = [
      {
        depart: redisCode.substring(4, 7),
        arrive: redisCode.substring(7, 10),
      },
    ];
    /** 行李额 */
    // const baggageInfoList = await service.baggage.generateBaggageInfo(tripType, tripSearch, flightGroupInfoList, IPCC);
    const allBaggageInfoList = await this.service.baggage.getBaggageInfoList({
      flightType: tripType,
      from: tripSearch[0].depart,
      to: tripSearch[0].arrive,
    });
    const baggageInfoList = service.baggage.generateBaggageInfo(
      allBaggageInfoList,
      { flightGroupInfoList, redisSchema: segmentSchema },
      group,
      IPCC
    );

    /** 退改签 */
    const flightDetail = {
      policyDetailInfo,
      flightGroupInfoList,
      policyInfo: {},
    };
    await service.penalty.analysisPenalty(tripType, tripSearch, flightDetail);

    const penaltyInfoList = flightDetail.policyInfo.penaltyInfoList;

    /** 处理政策信息 end */

    // 组合shoppingInfo
    const shoppingInfo = {
      shoppingId: helper.GUID(),
      redisCode,
      redisSchema: segmentSchema,
      segmentSchema: segmentSchema.split('|')[0],
      currency,
      currencyRate,
      flightGroupInfoList,
      policyDetailInfo,
      policyInfo: {
        baggageInfoList,
        penaltyInfoList,
      },
    };

    if (!shoppingInfo) {
      helper.ResFormat(ctx, '', false, '', {});
    } else {
      helper.ResFormat(ctx, '', true, '', shoppingInfo);
    }

    // save
    await service.flight.saveFlightInfo(shoppingInfo);

    service.trace.createTrace({
      traceType: 'api',
      dateTime: timeHelper.nowDateTime(),
      pageType: 'booking',
      api: 'controller/generateFlightInfo',
      refer: referer,
      content: `request:${JSON.stringify(this.ctx.request.body)},response:`,
    });
  }

  refreshFlightCache() {
    const { ctx, service } = this;
    const { tripSearch, IPCC } = ctx.request.body;
    // 不需要同步await
    service.flight.refreshFlightCache(
      tripSearch,
      true,
      IPCC
    );
    helper.ResFormat(ctx, '', true, 'refresh success', {});
  }
}

module.exports = FlightApiController;
