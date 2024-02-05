"use strict";

const Service = require("egg").Service;
const getTokenInfo = require('../extend/utils');

class RegionService extends Service {
  async get() {
    // const {
    //   jwt: { secret },
    // } = this.app.config;
    // // 如果存在token 解析token
    // const authInfo = getTokenInfo(this.ctx.app.jwt, this.ctx.headers, secret);
    // if (authInfo) {
    //   // 即可获取 token 内容
    //   // authInfo.id authInfo.userName   https://juejin.cn/post/6959173353890381854#heading-9
    // }

    const ctx = this.ctx;
    const data = ctx.model.Region.find({ isValid: true });
    return data;
  }

  async create(payload) {
    return this.ctx.model.Region.create(payload);
  }
}

module.exports = RegionService;
