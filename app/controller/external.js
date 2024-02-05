'use strict';

const Controller = require('egg').Controller;
const helper = require('../extend/helper');
const { convertRequest, convertResponse } = require('../public/wego');

class ExternalController extends Controller {
  async externalTrace() {
    const { queryStr } = this.ctx.request.body;

    const params = Object.fromEntries(
      new URLSearchParams(queryStr.substring(1)).entries()
    );

    this.service.external.trace(params);

    helper.ResFormat(this.ctx, '', true, '', params);
  }

  async wegoSearch() {
    const { ctx, service } = this;
    const {
      legs,
      adultsCount,
      childrenCount,
      infantsCount,
      cabin,
      currencyCode,
      locale,
    } = ctx.request.body;

    try {
      const request = convertRequest({
        legs,
        adultsCount,
        childrenCount,
        infantsCount,
        cabin,
        currencyCode,
        locale,
      });

      /** 获取航线信息 */
      const flightList = await service.shopping.getShoppingList(request);

      if (flightList.length > 0) {
        await service.link.BookingDeepLink(request, flightList, 'Wego');
      }

      await service.shopping.saveShoppingInfo(flightList, 'wegoSearch');

      const kayakResponse = convertResponse(flightList, {
        adultsCount,
        childrenCount,
        infantsCount,
      });

      ctx.status = 200;
      ctx.body = kayakResponse;
    } catch (ex) {
      ctx.status = 500;
      ctx.body = {};
    } finally {
      //
    }
  }
}

module.exports = ExternalController;
