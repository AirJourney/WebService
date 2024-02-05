'use strict';

const Service = require('egg').Service;

class ExternalService extends Service {

  async trace(payload) {

    return this.ctx.model.External.create(payload);
  }
}

module.exports = ExternalService;
