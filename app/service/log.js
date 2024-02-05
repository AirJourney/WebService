'use strict';

const Service = require('egg').Service;
const timeHelper = require("../extend/time")

class LogService extends Service {
  async getOffLog(requestInfo) {
    const { orderId } = requestInfo;

    const offLogList = await this.ctx.model.Offlog.aggregate([
      {
        $lookup: {
          from: 'staff',
          localField: 'staffId',
          foreignField: 'staffId',
          as: 'staff',
        },
      },
      {
        $match: {
          orderId,
        },
      },
    ]);

    return offLogList;
  }

  async createLog(logInfo) {
    logInfo.createDateTime = timeHelper.nowDateTime()
    this.ctx.model.Log.create(logInfo);
  }
}

module.exports = LogService;
