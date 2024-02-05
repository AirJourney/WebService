'use strict';

const Service = require('egg').Service;
const timeHelper = require('../extend/time');

class LogService extends Service {
  async createTrace(logInfo) {
    this.ctx.model.Trace.create(logInfo);
  }

  /**
   * 最终会生成一个对象，但为了调用可读性，将他们分开入参
   *
   * @param { pageType,type,data} pageType 页面类型，如book/book, type sku类型，如fsc/lcc, data 数据
   */
  async createReportTrace({
    pageType,
    type,
    data,
  }) {
    this.ctx.model.Report.create({
      ...data,
      pageType,
      type,
      dateTime: timeHelper.nowDateTime(),
    });
  }
}

module.exports = LogService;
