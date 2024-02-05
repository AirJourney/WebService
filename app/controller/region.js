"use strict";

const Controller = require("egg").Controller;
const regionList = require('../public/region.json')

class RegionApiController extends Controller {
  
  async getRegion(){

    const regionInfo = await this.service.region.get();
    this.ctx.body = regionInfo;
  }

  async createRegion(){
    const { ctx, service } = this;
    var result = await service.region.create(regionList);
    ctx.body = result;
  }
}

module.exports = RegionApiController;


