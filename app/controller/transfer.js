'use strict';
const Controller = require('egg').Controller;
const timeHelper = require('../extend/time.js');
const helper = require('../extend/helper');
const LCC = require('../service/flightListSearch/LCC');
const { getRandomCacheMachine } = require('../extend/utils');
const { inCurrency, inLanguage } = require('../public/inBasic.js');

class TransferController extends Controller {
  async getJumpUrl() {
    const { ctx, service } = this;
    const referer = this.ctx.request.headers.referer;
    const { queryStr } = ctx.request.body;
    const referIndex = referer.split('?')[0].lastIndexOf('/') + 1;
    const refererPath = referer.substring(0, referIndex);

    const params = Object.fromEntries(
      new URLSearchParams(queryStr.substring(1)).entries()
    );

    service.external.trace(params);
    let path = 'flightlist';
    switch (params.landingPage) {
      case 'list':
        path = 'flightlist';
        break;
      case 'booking':
        path = 'book';
        break;
      default:
        break;
    }
    const skuData = new URLSearchParams(atob(params.sku));

    params.language = inLanguage(skuData.get('language')); // 修改为所需的语言
    params.currency = inCurrency(skuData.get('currency')); // 修改为所需的语言
    const returnTime = skuData.get('returnTime');

    if (params.landingPage === 'booking') {
      const reportCommon = {
        trip: {
          type: skuData.get('tripType'),
          depart: skuData.get('departCity'),
          arrive: skuData.get('arriveCity'),
          departTime: skuData.get('departTime'),
          returnTime,
          cls: skuData.get('cabinType'),
          passenger: {
            adult: skuData.get('adult') || 0,
            child: skuData.get('children') || 0,
            infant: skuData.get('infant') || 0,
          },
        },
        source: refererPath.includes('m.skywingtrip') ? 'h5' : 'online',
        mktportal: params.mktportal,
        currency: params.currency,
        language: params.language,
        locale: params.locale,
        shoppingId: skuData.get('shoppingId'),
      };
      const skuType = skuData.get('skutype');
      if (skuType === 'lcc') {
        const remarkKey = {
          wego: 'wego_click_id',
          skyscanner: 'skyscanner_redirectid',
        };
        const lcc = new LCC(this);
        const tripSearch = [
          {
            depart: skuData.get('departCity'),
            arrive: skuData.get('arriveCity'),
            departTime: skuData.get('departTime'),
          },
        ];
        if (returnTime) {
          tripSearch.push({
            depart: skuData.get('arriveCity'),
            arrive: skuData.get('departCity'),
            departTime: returnTime,
          });
        }
        const passenger = [
          {
            name: 'Adult',
            count: skuData.get('adult') || 0,
            flag: 'ADT',
          },
          {
            name: 'Children',
            count: skuData.get('children') || 0,
            flag: 'CHD',
          },
          {
            name: 'Infants',
            count: skuData.get('infant') || 0,
            flag: 'INF',
          },
        ];

        const p = {
          referer,
          language: skuData.get('language'),
          currency: skuData.get('currency'),
          cabinType: skuData.get('cabinType'),
          tripSearch,
          tripType: skuData.get('tripType'),
          passenger,
          locale: params.locale,
          mktportal: params.mktportal,
        };
        const flightList = await lcc.process(p);
        const segmentSchema = skuData.get('segmentSchema').split('|')[0];
        const matchedFlight = flightList.find(flight => (flight.segmentSchema === segmentSchema));
        if (matchedFlight) {
          const newLink = new URLSearchParams(matchedFlight.deeplink.split('?')[1]);
          const newParams = Object.fromEntries(
            newLink.entries()
          );
          const jumpUrl = `${refererPath}${path}?${(new URLSearchParams(newParams)).toString()}&${remarkKey[params.mktportal]}=${params[remarkKey[params.mktportal]]}`;
          helper.ResFormat(this.ctx, '', true, '', jumpUrl);
          service.trace.createReportTrace({
            pageType: 'landing',
            type: skuType,
            data: {
              ...reportCommon,
              shoppingId: matchedFlight.shoppingId,
              content: JSON.stringify({ oldCOde: skuData.get('segmentSchema'), newCode: matchedFlight.redisSchema }),
            },
          });
          service.trace.createTrace({
            traceType: 'pv',
            dateTime: timeHelper.nowDateTime(),
            pageType: 'landing',
            api: 'controller/transfer',
            refer: referer,
            content: 'lcc matched',
          });
          return jumpUrl;
        }
        service.trace.createTrace({
          traceType: 'pv',
          dateTime: timeHelper.nowDateTime(),
          pageType: 'landing',
          api: 'controller/transfer',
          refer: referer,
          content: 'lcc no matched',
        });

      }

      const segmentSchemaList = decodeURIComponent(skuData.get('segmentSchema'))
        .split('@')
        .reduce((r, item) => {
          const seg = item.split('|')[0].split('-');
          r.carrier = [ ...r.carrier, seg[2] ];
          r.flightNo = [ ...r.flightNo, seg[3] ];
          r.IPCC = [ ...r.IPCC, seg[seg.length - 1] ];
          r.cabin = [ ...r.cabin, params.cabinType ];
          return r;
        }, {
          carrier: [],
          flightNo: [],
          IPCC: [],
          cabin: [],
        });

      const leg = params.tripType === 'RT' ? [{
        from: params.departCity,
        to: params.arriveCity,
        departureDate: timeHelper.formatDate(skuData.get('departTime')),
      }, {
        from: params.arriveCity,
        to: params.departCity,
        departureDate: timeHelper.formatDate(skuData.get('returnTime')),
      }] : [
        {
          from: params.departCity,
          to: params.arriveCity,
          departureDate: timeHelper.formatDate(skuData.get('departTime')),
        },
      ];
      service.trace.createReportTrace({
        pageType: 'landing',
        type: skuType,
        data: {
          ...reportCommon,
        },
      });
      const res = await this.ctx.curl(getRandomCacheMachine() + ':9001/checkflight', {
        method: 'POST',
        contentType: 'json',
        dataType: 'json',
        headers: {},
        data: {
          leg,
          IPCC: segmentSchemaList.IPCC[0],
          carrier: segmentSchemaList.carrier,
          cabin: segmentSchemaList.cabin,
          flightNo: params.flightNo,
        },
        timeout: 10000,
      });
      if (res.status === 200 && res.data && res.data.status === 0) {
        params.segmentSchema = encodeURIComponent(res.data.hitCarrierSchema);
      }
    }

    const jumpUrl = `${refererPath}${path}?${(new URLSearchParams(params)).toString()}`;

    helper.ResFormat(this.ctx, '', true, '', jumpUrl);

    service.trace.createTrace({
      traceType: 'pv',
      dateTime: timeHelper.nowDateTime(),
      pageType: 'landing',
      api: 'controller/transfer',
      refer: referer,
      content: 'fsc',
    });
  }
}

module.exports = TransferController;
