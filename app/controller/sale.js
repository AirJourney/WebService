'use strict';

const Controller = require('egg').Controller;

class SaleApiController extends Controller {
  async exportSaleFight() {
    const { ctx, service } = this;

    /** 查询sellfight库，匹配出对应的结果集 */
    const saleFlightList = await ctx.model.Sellfight.find({});

    if (saleFlightList.length === 0) {
      ctx.helper.ResFormat(this.ctx, '', false, 'SaleFlightResult Failure', []);
      ctx.logger.error('SaleFlightResult Failure', []);
      return;
    }
    const prohibitionList = await ctx.model.Prohibition.find({
      isValid: true,
      isProhibition: true,
    });

    const diffRes = await service.sale.exportSaleFlight({
      saleFlightList,
      prohibitionList,
    });

    const exportRes = [];
    for (let i = 0; i < diffRes.length; i++) {
      exportRes.push({
        tripType: diffRes[i].tripType,
        depart: diffRes[i].depart,
        arrival: diffRes[i].arrival,
        startDays: diffRes[i].startDays,
        endDays: diffRes[i].endDays,
      });
    }

    ctx.helper.ResFormat(
      this.ctx,
      '',
      true,
      'SaleFlightResult Success',
      exportRes
    );
  }
}

module.exports = SaleApiController;
