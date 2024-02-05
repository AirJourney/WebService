'use strict';

const Controller = require('egg').Controller;
const helper = require('../extend/helper');

class LogController extends Controller {
  async getOffLog() {
    const { ctx } = this;
    const offLogList = await this.service.log.getOffLog(ctx.request.body);
    helper.ResFormat(this.ctx, '', true, 'offLogList success', offLogList);
  }

  async createLog() {
    const { ctx } = this;
    const { logType, pageType, url, refer, content } = ctx.request.body;
    ctx.helper.log(logType, pageType, url, refer, content);
  }
}

module.exports = LogController;
