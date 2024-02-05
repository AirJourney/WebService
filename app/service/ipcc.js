'use strict';

const Service = require('egg').Service;

class IPCCService extends Service {

  async getIPCC(payload) {
    const { IPCC, group, apiType } = payload;

    const matchQuery = {
      IPCC,
      isValid: true,
      group,
    };
    const ipccRes = await this.ctx.model.Ipcc.find(matchQuery);
    if (ipccRes && ipccRes.length > 0) {
      if (apiType !== '') {
        return ipccRes[0][apiType];
      }
      return ipccRes[0];

    }
    return null;

  }


}

module.exports = IPCCService;
