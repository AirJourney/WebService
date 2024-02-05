'use strict';

const Controller = require('egg').Controller;
const helper = require('../extend/helper');
const Galileo = require('../service/flightListSearch/Galileo');
const LCC = require('../service/flightListSearch/LCC');
const { groupAndSortFlightsByPrice } = require('../public/analysis');
const { resolveParamsAndHeader } = require('../public/requestUtils');
const GalileoSearch = require('../service/flightSearch/Galileo');
const LCCSearch = require('../service/flightSearch/LCC');

class FlightApiController extends Controller {
  /**
   * 聚合每个gds的结果，然后排序
   * 后续如果支持分段加载，可以考虑在此实现
   * @return
   */
  async getFlights() {
    const { ctx, service } = this;
    const result = [];
    const searchParams = resolveParamsAndHeader(ctx.request);
    const reportCommon = {
      trip: {
        type: searchParams.tripType,
        depart: searchParams.tripSearch[0].depart,
        arrive: searchParams.tripSearch[0].arrive,
        departTime: searchParams.tripSearch[0].departTime,
        returnTime: searchParams.tripSearch[1] && searchParams.tripSearch[1].departTime,
        cls: searchParams.cabinType,
        passenger: {
          adult: searchParams.passenger[0].count,
          child: searchParams.passenger[1].count,
          infant: searchParams.passenger[2].count,
        },
      },
      mktportal: searchParams.mktportal,
      currency: searchParams.currency,
      language: searchParams.language,
      locale: searchParams.locale,
    };
    // 伽利略
    const galileo = new Galileo(this);
    const flightList1 = await galileo.process(searchParams);
    service.trace.createReportTrace({
      pageType: 'list',
      type: 'fsc',
      data: {
        ...reportCommon,
        content: flightList1.length,
      },
    });
    result.push(...flightList1);
    // lcc
    // LCC 可以考虑再次抽象以应对不同供应商
    const lcc = new LCC(this);
    const flightList2 = await lcc.process(searchParams);
    result.push(...flightList2);
    service.trace.createReportTrace({
      pageType: 'list',
      type: 'lcc',
      data: {
        ...reportCommon,
        content: flightList2.length,
      },
    });
    // // 此处可能可优化，因为在每个FlightSearch其实已经做过一次排序筛选了
    const finalResultList = groupAndSortFlightsByPrice(result);
    helper.ResFormat(this.ctx, searchParams.sessionid, true, '', finalResultList);
  }

  async getFlight() {
    const { ctx, service } = this;
    const referer = ctx.request.headers.referer;
    let result = {};
    const params = this.ctx.request.body;
    const reportCommon = {
      trip: {
        type: params.tripType,
        depart: params.depart,
        arrive: params.arrive,
        departTime: params.departTime,
        returnTime: params.returnTime,
        cls: params.cabinType,
        passenger: {
          adult: params.adult,
          child: params.children,
          infant: params.infant,
        },
      },
      mktportal: params.mktportal,
      currency: params.currency,
      language: params.language,
      locale: params.locale,
      shoppingId: params.shoppingId,
      source: referer.includes('m.skywingtrip') ? 'h5' : 'online',
    };
    if (ctx.request.body.skutype === 'lcc') {
      const lcc = new LCCSearch(this);
      result = await lcc.process(this.ctx.request.body);
      service.trace.createReportTrace({
        pageType: 'book/detail',
        type: 'lcc',
        data: {
          ...reportCommon,
        },
      });
    } else {
      const galileo = new GalileoSearch(this);
      result = await galileo.process(this.ctx.request.body);
      service.trace.createReportTrace({
        pageType: 'book/detail',
        type: 'fsc',
        data: {
          ...reportCommon,
        },
      });
    }
    helper.ResFormat(this.ctx, '', true, '', result);
  }
}

module.exports = FlightApiController;
