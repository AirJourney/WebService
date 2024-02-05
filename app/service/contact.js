'use strict';

const Service = require('egg').Service;

class ContactService extends Service {
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
    const data = ctx.model.Contact.find();
    return data;
  }

  async create(payload) {

    return this.ctx.model.Contact.create(payload);
  }
}

module.exports = ContactService;
