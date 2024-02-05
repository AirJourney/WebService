'use strict';

const Service = require('egg').Service;

class PassengerService extends Service {
  async get() {
    const ctx = this.ctx;
    const data = ctx.model.Passenger.find();
    return data;
  }

  async create(payload) {

    return this.ctx.model.Passenger.create(payload);
  }
}

module.exports = PassengerService;
