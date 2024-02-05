"use strict";

const Controller = require("egg").Controller;
const helper = require("../extend/helper");
const { getRandomCacheMachine } = require("../extend/utils");

class LinkApiController extends Controller {
  async getFlightList() {
    const { sessionid } = this.ctx.request.header;

    /** 获取航线信息 */
    const flightList = await this.service.shopping.getShoppingList(
      this.ctx.request.body
    );

    if (flightList.length > 0) {
      helper.ResFormat(this.ctx, sessionid, true, "", flightList);

      await this.service.shopping.saveShoppingInfo(flightList, sessionid);

      /** check逻辑 */
      const { tripSearch } = this.ctx.request.body;

      tripSearch.forEach((trip) => {
        trip.from = trip.depart;
        trip.to = trip.arrive;
        trip.departureDate = trip.departTime;
      });

      this.ctx.curl(getRandomCacheMachine() + ":9001/check", {
        method: "POST",
        contentType: "json",
        dataType: "json",
        headers: {},
        data: {
          leg: tripSearch,
        },
      });
    } else {
      /** 查询无结果时*/
      /** 优先异步重查 */
      const { tripSearch } = this.ctx.request.body;

      tripSearch.forEach((trip) => {
        trip.from = trip.depart;
        trip.to = trip.arrive;
        trip.departureDate = trip.departTime;
      });

      const recallRes = await this.ctx.curl(
        getRandomCacheMachine() + ":9001/check",
        {
          method: "POST",
          contentType: "json",
          dataType: "json",
          headers: {},
          data: {
            leg: tripSearch,
          },
        }
      );

      if (recallRes && recallRes.data > 0) {
        const flightList = await this.service.shopping.getShoppingList(
          this.ctx.request.body
        );

        if (flightList.length > 0) {
          await this.service.shopping.saveShoppingInfo(flightList, sessionid);
        }
        helper.ResFormat(this.ctx, sessionid, true, "", flightList);
      } else {
        helper.ResFormat(this.ctx, sessionid, true, "", []);
      }
    }
  }

  async decodeSku() {
    const { url } = this.ctx.request.body;

    // 从URL中获取编码后的sku参数
    const sku = url.split("sku=")[1];

    const result = await this.service.link.decodeSkuValue(sku);

    helper.ResFormat(this.ctx, "", true, "", result);
  }
}

module.exports = LinkApiController;
