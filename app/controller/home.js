'use strict';

const Controller = require('egg').Controller;

class HomeController extends Controller {
  async index() {
    const { ctx } = this;
    ctx.body = '';
  }

  async test() {
    const flightList = await this.service.segment.analysisGDSSchema(
      'OW',
      '0220ALCBCN'
    );
    this.ctx.body = JSON.stringify(flightList);
  }

  async demo() {
    await this.app.redis.clients.get('db0').keys('*', (err, value) => {
      this.ctx.body = value;
    });
  }
}

module.exports = HomeController;
