'use strict';

const Controller = require('egg').Controller;
const { inCurrency, inLanguage } = require('../public/inBasic');

const helper = require('../extend/helper');
const timeHelper = require('../extend/time');
const { groupAndSortFlightsByPrice } = require('../public/analysis');

/**
 * 技改思路
 * 1. 获取参数
 * 2. 获取该航线对应的gds列表
 * 3. 根据gds列表，调用不同的查询方法
 *  1. 此处需要建立一个抽象类，以规范不同GDS的查询方法
 * 4. 根据gds列表，调用不同的后处理方法
 *  1. 此处需要建立一个抽象类，以规范不同GDS的后处理方法
 * 5. 聚合结果
 * 6. 排序
 * 7. 返回
 * const params = getParams
 * const sellFlightList = await service.switch.identifySearchChannels(params)
 * abstract class Search {
 *  async search() {}
 * }
 * abstract class PostProcess {
 *  async postProcess() {}
 *  async getProfit() {}
 *  async getRevenue() {}
 *  async getBaggage() {}
 * }
 * const searchList = []
 * const result = sellFlightList.forEach(sellFlight => {Search}).map(sellFlight => {PostProcess}).flat().sort()
 * return result
 */

class SwitchApiController extends Controller {
  async concurrent() {
    const { ctx, service } = this;
    const referer = ctx.request.headers.referer;
    ctx.request.body.language = inLanguage(this.ctx.request.body.language); // 修改为默认的语言
    ctx.request.body.currency = inCurrency(this.ctx.request.body.currency); // 修改为默认的币种

    const matchedSellFightList = await service.switch.identifySearchChannels(
      ctx.request.body
    );

    if (!matchedSellFightList || matchedSellFightList.length === 0) {
      helper.ResFormat(ctx, '', true, '查询无结果', []);
      return;
    }

    /** 根据GDS+GDSBooking类型调用不同的查询方法 */
    const asyncSearchList = [];

    /** Galileo GDS请求 */
    const galileoReqList = matchedSellFightList.filter(
      sf => sf.GDS === 'travelport'
    );
    if (galileoReqList && galileoReqList.length > 0) {
      const seenIPCC = new Set();
      const flightList = await service.flight.getFlightInfoList(
        ctx.request.body
      );
      for (const galileoReq of galileoReqList) {
        if (!seenIPCC.has(galileoReq.IPCC)) {
          seenIPCC.add(galileoReq.IPCC);
          asyncSearchList.push(async () => {
            const result = {
              GDS: 'travelport',
              IPCC: galileoReq.IPCC,
            };

            const ipccFlightList = [ ...flightList ].filter(f =>
              f.redisSchema.includes(galileoReq.IPCC)
            );

            if (ipccFlightList && ipccFlightList.length > 0) {
              service.flight.refreshFlightCache(
                ctx.request.body.tripSearch,
                true,
                galileoReq.IPCC
              );
              result.res = ipccFlightList;
            } else {
              const recallRes = await this.service.flight.refreshFlightCache(
                ctx.request.body.tripSearch,
                false,
                galileoReq.IPCC
              );

              if (recallRes && recallRes.data) {
                /** 获取航线信息 */
                const flightList = await this.service.flight.getFlightInfoList(
                  this.ctx.request.body
                );

                result.res = flightList;
              } else {
                result.res = [];
              }
            }
            return result;
          });
        }
      }
    }

    /** 增加其他请求 */
    /** External */
    // const externalReqList = matchedSellFightList.filter(
    //   (sf) => sf.GDS === "External"
    // );
    // if (externalReqList && externalReqList.length > 0) {
    //   for (let i = 0; i < externalReqList.length; i++) {
    //     const externalReq = externalReqList[i];

    //     /** 根据group和IPCC获取对应的check 地址 */
    //     const shoppingUrl = await service.ipcc.getIPCC({
    //       group: externalReq.group,
    //       IPCC: externalReq.IPCC,
    //       apiType: "shoppingApi",
    //     });

    //     if (shoppingUrl === "") break;

    //     asyncSearchList.push(async () => {
    //       const result = {
    //         GDS: "External",
    //         IPCC: externalReq.IPCC,
    //       };
    //       const externalRes = await ctx.curl(shoppingUrl, {
    //         method: "POST",
    //         contentType: "json",
    //         data: ctx.request.body,
    //         dataType: "json",
    //         timeout: 8000,
    //       });
    //       if (externalRes.status == 200 && externalRes.data&&externalRes.data.status == true) {
    //         result.res = externalRes.data.content;
    //       } else {
    //         result.res = [];
    //       }
    //       return result;
    //     });
    //   }
    // }

    /** 多路查询 , 返回原始数据 */
    const multipleSearchResultList = await service.switch.multipleSearch(
      asyncSearchList
    );

    if (!multipleSearchResultList || multipleSearchResultList.length === 0) {
      helper.ResFormat(ctx, '', true, '查询无结果', []);
      return;
    }

    /** 匹配多路查询结果
     * 1. 将对应结果输入到matchedSellFightList中
     * 2. 聚合matchedSellFightList中的group和IPCC
     */
    const groupList = [];
    matchedSellFightList.forEach(sellFlight => {
      // 找出数组中的group，不重复，且变为对象{group:'',IPCCList:[]}
      if (!groupList.find(group => group.group === sellFlight.group)) {
        groupList.push({
          group: sellFlight.group,
          IPCCList: [ sellFlight.IPCC ],
        });
      } else {
        groupList.forEach(group => {
          if (group.group === sellFlight.group) {
            if (!group.IPCCList.find(IPCC => IPCC === sellFlight.IPCC)) {
              group.IPCCList.push(sellFlight.IPCC);
            }
          }
        });
      }

      multipleSearchResultList.forEach(multipleSearchResult => {
        if (
          sellFlight.GDS === multipleSearchResult.GDS &&
          sellFlight.IPCC === multipleSearchResult.IPCC
        ) {
          sellFlight.res = multipleSearchResult.res;
        }
      });
    });
    /** 根据groupList 一次性查询出所有网站加价内容 */
    await service.revenue.getRevenueListByGroup({ groupList });

    /** 取出乘机人信息，用以计算网站加价 */
    const { passenger } = ctx.request.body;

    /** deeplink 基础url */
    const flightBasicLink = service.link.flightBasicLink(ctx.request.body);
    /** 根据IPCC,group,GDSBooking调用不同的后处理 */
    let finalResultList = [];
    for (let i = 0; i < matchedSellFightList.length; i++) {
      const { IPCC, group, GDS, res } = matchedSellFightList[i];
      if (GDS === 'travelport') {
        /** 对应政策加价 */
        const sellFlightRes = await service.flight.matchPolicy(
          res,
          ctx.request.body,
          group,
          IPCC
        );

        let matchedRevenue;

        groupList.forEach(groupRevenue => {
          if (groupRevenue.group === group) {
            matchedRevenue = groupRevenue.revenueList.find(
              revenueItem => revenueItem.IPCC === IPCC
            );
            return;
          }
        });

        /** 网站加价*/
        for (let i = 0; i < sellFlightRes.length; i++) {
          service.revenue.analysisRevenue(
            sellFlightRes[i],
            matchedRevenue,
            passenger
          );
        }

        /** deeplink生成 */
        const linkParams = {
          ...ctx.request.body,
          IPCC,
          group,
          skuType: matchedRevenue.carrierType,
        };
        service.link.flightBookingLink(
          flightBasicLink,
          linkParams,
          sellFlightRes
        );

        finalResultList.push(...sellFlightRes);
      }
    }
    /** 筛选 */
    finalResultList = groupAndSortFlightsByPrice(finalResultList, 1);

    helper.ResFormat(ctx, '', true, '', finalResultList);

    service.trace.createTrace({
      traceType: 'API',
      dateTime: timeHelper.nowDateTime(),
      pageType: '',
      api: 'controller/switch',
      refer: referer,
      content: `request:${JSON.stringify(ctx.request.body)},response:${
        finalResultList.length
      }`,
    });
  }

  async check() {
    const { ctx, service } = this;
    const {
      redisCode,
      redisSchema,
      currency,
      passengerList,
      shoppingId,
      group,
      IPCC,
      skuType,
    } = ctx.request.body;
    const reportCommon = {
      shoppingId,
      currency,
      trip: {
        passenger: {
          adult: passengerList[0] && passengerList[0].count,
          child: passengerList[1] && passengerList[1].count,
          infant: passengerList[2] && passengerList[2].count,
        },
      },
    };

    /**
     * 0015(+8)-1130-MU-779-E&K-PVG-T1-AKL-TI-1-77W-KSE00BL0-1645(+13)-P3886454|958.00-326.91-719.00-315.26-719.00-290.56
     * @
     * 2200(+13)-1245-MU-780-E&K-AKL-TI-PVG-T1-1-77W-KSE00BL0-0545(+8)-P3886454|958.00-326.91-719.00-315.26-719.00-290.56
     */

    let checkResult = {
      verifyResult: 0,
      isPriceChange: false,
      isPenaltyChange: false,
      isBaggageChange: false,
      priceInfo: {},
      penaltyInfoList: [],
      baggageInfoList: [],
    };

    if (!redisCode || !redisSchema) {
      checkResult.verifyResult = 1;
      helper.ResFormat(ctx, '', false, 'request params error', checkResult);
      service.trace.createReportTrace({
        pageType: 'book/check',
        type: skuType,
        data: {
          ...reportCommon,
          content: 'false',
        },
      });
      return;
    }

    /** redisCode 产出flightType和tripSearch */
    const flightType = redisCode.length > 10 ? 'RT' : 'OW';
    const tripSearch = [];
    const departTime = timeHelper
      .momentDate(redisCode.substr(0, 4))
      .format('YYYY-MM-DD');
    const depart = redisCode.substr(4, 3);
    const arrive = redisCode.substr(7, 3);
    tripSearch.push({ depart, arrive, departTime });
    if (flightType === 'RT') {
      const departTime = timeHelper
        .momentDate(redisCode.substr(-4, 4))
        .format('YYYY-MM-DD');
      const depart = redisCode.substr(-8, 3);
      const arrive = redisCode.substr(-5, 3);
      tripSearch.push({ depart, arrive, departTime });
    }

    /** redisSchema 产出cabinType、subClass、carrier、flightNo */
    let cabinType,
      subClass,
      carrier,
      flightNo,
      fareBasisCode;
    if (flightType === 'OW') {
      const schemaList = redisSchema.split('|');
      const segmentSchemaList = schemaList[0].split('-');
      cabinType = segmentSchemaList[4].split('&')[0];
      subClass = segmentSchemaList[4].split('&')[1];
      carrier = segmentSchemaList[2];
      flightNo = segmentSchemaList[3];
      fareBasisCode = segmentSchemaList[11];
    } else {
      const rtSchemaList = redisSchema.split('@');
      const fwtSegmentSchemaList = rtSchemaList[0].split('|')[0].split('-');
      const bwtSegmentSchemaList = rtSchemaList[1].split('|')[0].split('-');

      cabinType = `${fwtSegmentSchemaList[4].split('&')[0]},${
        bwtSegmentSchemaList[4].split('&')[0]
      }`;
      subClass = `${fwtSegmentSchemaList[4].split('&')[1]},${
        bwtSegmentSchemaList[4].split('&')[1]
      }`;
      carrier = `${fwtSegmentSchemaList[2]},${bwtSegmentSchemaList[2]}`;
      flightNo = `${fwtSegmentSchemaList[3]},${bwtSegmentSchemaList[3]}`;
      fareBasisCode = fwtSegmentSchemaList[11];
    }

    /** 根据group和IPCC获取对应的check 地址 */
    const checkUrl = await service.ipcc.getIPCC({
      group,
      IPCC,
      apiType: 'checkApi',
    });

    if (checkUrl === null) {
      checkResult.verifyResult = 1;
      helper.ResFormat(
        ctx,
        '',
        false,
        'can not find checkUrl by group and IPCC',
        checkResult
      );
      service.trace.createReportTrace({
        pageType: 'book/check',
        type: skuType,
        data: {
          ...reportCommon,
          content: 'false',
        },
      });
      return;
    }
    if (checkUrl === '') {
      checkResult = await service.flight.checkFlight(
        flightType,
        tripSearch,
        fareBasisCode,
        IPCC
      );
    } else {
      /** 按上述参数请求外部接口，超时时间为8秒 */
      const response = await service.switch.externalCheck(
        checkUrl,
        {
          currency: 'USD',
          passenger: passengerList,
          shoppingId,
          flightType,
          cabinType,
          subClass,
          tripSearch,
          carrier,
          flightNo,
        },
        8000
      );

      if (response.data && response.data.content) {
        checkResult = response.data.content[0];
        service.trace.createTrace({
          traceType: 'API',
          dateTime: timeHelper.nowDateTime(),
          pageType: '',
          api: 'controller/check',
          content: `request:${JSON.stringify(ctx.request.body)},response:${
            JSON.stringify(response.data)
          }`,
        });
      } else {
        const msg =
          response.data && response.data.msg
            ? response.data.msg
            : 'check error';
        helper.ResFormat(ctx, '', false, msg, {});
        service.trace.createReportTrace({
          pageType: 'book/check',
          type: skuType,
          data: {
            ...reportCommon,
            content: 'false',
          },
        });
        return;
      }

      if (checkResult && checkResult.isPriceChange) {
        /** priceInfo 要从usd 转成 currency币种 */
        checkResult.priceInfo = await service.price.currencyChange(
          checkResult.priceInfo,
          'USD',
          currency
        );
        if (!checkResult.priceInfo) {
          checkResult.verifyResult = 1;
          helper.ResFormat(ctx, '', false, 'request params error', checkResult);
          service.trace.createReportTrace({
            pageType: 'book/check',
            type: skuType,
            data: {
              ...reportCommon,
              content: 'false',
            },
          });
          return;
        }

        /** 网站加价 */
        const groupList = [
          {
            group,
            IPCCList: [ IPCC ],
          },
        ];

        /** 根据groupList 一次性查询出所有网站加价内容 */
        await service.revenue.getRevenueListByGroup({ groupList });
        let matchedRevenue;
        groupList.forEach(groupRevenue => {
          if (groupRevenue.group === group) {
            matchedRevenue = groupRevenue.revenueList.find(
              revenueItem => revenueItem.IPCC === IPCC
            );
            return;
          }
        });

        await service.revenue.calculateRevenue(
          matchedRevenue,
          passengerList,
          checkResult.priceInfo
        );
      }
    }

    /** 标准返回格式 Response */
    /**
     * {
     *  "status": true,
     *  "msg": "",
     *  "content": {
     *      "verifyResult": 0,  // 0: verify result is pass 1: verify result is fail
     *      "isPriceChange": true,
     *      "isPenaltyChange": false,
     *      "isBaggageChange": false,
     *
     *      // below is optional , if you don't response , we will ignore it
     *      "priceInfo": {
     *          "adultPrice": {
     *              "salePrice": "6875",
     *              "tax": "230"
     *          },
     *          "childPrice": {
     *              "salePrice": "5150",
     *              "tax": "230"
     *          },
     *          "infantPrice": {
     *              "salePrice": "5150",
     *              "tax": "142"
     *          },
     *          "avgPrice": "7106",
     *          "totalPrice": "7106"
     *      },
     *      "penaltyInfoList": [],
     *      "baggageInfoList":[]
     *  }
     */

    helper.ResFormat(ctx, '', true, 'checked', checkResult);
    service.trace.createReportTrace({
      pageType: 'book/check',
      type: skuType,
      data: {
        ...reportCommon,
        content: 'true',
      },
    });
  }

  /**
   * {
    "orderId": "20231103210811283",
    "passenger": [
        {
            "lastName": "LASTNAME",
            "firstName": "FIRSTNAME",
            "passCountry": "TW",
            "passNumber": "8888888888",
            "birthDate": "2005-01-01",
            "gender": "M",
            "ageCategory": "ADT"
        }
    ],
    "group":"HNKT",
    "IPCC":"PHNKT"
}
   * 通知出票
   * @return {*}
   * @memberof SwitchApiController
   */
  async ticket() {
    const { ctx, service } = this;
    const { IPCC, group, orderId } = ctx.request.body;
    const referer = this.ctx.request.headers.referer;
    const updateTicketRes = await service.switch.ticket({ group, IPCC, orderId });
    if (updateTicketRes) {
      helper.ResFormat(ctx, '', true, 'ticket success', updateTicketRes);
      this.service.trace.createTrace({
        traceType: 'log',
        dateTime: timeHelper.nowDateTime(),
        pageType: 'booking',
        api: 'ticket',
        refer: referer,
        content: `request:${JSON.stringify(
          ctx.request.body
        )},response:${JSON.stringify(updateTicketRes)}`,
      });
      return;
    }
    helper.ResFormat(ctx, '', false, 'ticket falure', []);
  }

  /**
   * 退改接口
   *
   * @return {*}
   * @memberof SwitchApiController
   */
  async changeAndRefund() {
    const { ctx, service } = this;
    /** 调用外部接口 */
    const { orderId, changeType, group } = ctx.request.body;

    const orderRes = await service.order.getAllOrder(orderId, null, group);

    if (!orderRes || orderRes.length === 0) {
      helper.ResFormat(ctx, '', false, 'can not find order', []);
      return;
    }
    const orderInfo = orderRes[0];
    const { IPCC } = orderInfo;

    /** 根据group和IPCC获取对应的check 地址 */
    const changeUrl = await service.ipcc.getIPCC({
      group,
      IPCC,
      apiType: 'changeApi',
    });

    if (!changeUrl) {
      helper.ResFormat(
        ctx,
        '',
        false,
        'can not find changeUrl by group and IPCC',
        []
      );
      return;
    }

    const { passengerList } = orderInfo;

    const passenger = [];
    passengerList.forEach(passengerItem => {
      passenger.push({
        passNumber: passengerItem.cardNo,
        pnr: passengerItem.pnr,
        companyNumber: passengerItem.companyNumber,
        tickeNumber: passengerItem.tickeNumber,
        isChange: false,
        isRefund: passengerItem.isRefund,
      });
    });

    const changeResult = await service.switch.externalChange(
      changeUrl,
      {
        orderId,
        passenger,
        changeType,
      },
      12000
    );
    if (
      changeResult.status &&
      changeResult.data &&
      changeResult.data.content &&
      changeResult.data.content.length > 0 &&
      changeResult.data.content[0].orderId === orderId &&
      changeResult.data.content[0].passengers &&
      changeResult.data.content[0].passengers.length > 0
    ) {

      helper.ResFormat(ctx, '', true, 'change success', changeResult);
      this.service.trace.createTrace({
        traceType: 'log',
        dateTime: timeHelper.nowDateTime(),
        pageType: 'booking',
        api: 'change',
        refer: referer,
        content: `request:${JSON.stringify(
          ctx.request.body
        )},response:${JSON.stringify(changeResult)}`,
      });
      return;

    }
    helper.ResFormat(ctx, '', false, 'change falure', []);

    this.service.trace.createTrace({
      traceType: 'log',
      dateTime: timeHelper.nowDateTime(),
      pageType: 'booking',
      api: 'change',
      refer: referer,
      content: `request:${JSON.stringify(ctx.request.body)},response:[]}`,
    });
  }
}

module.exports = SwitchApiController;
