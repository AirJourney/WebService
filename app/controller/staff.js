"use strict";

const Controller = require("egg").Controller;
const helper = require("../extend/helper");

class StaffApiController extends Controller {
  async createAccount() {
    const { ctx, service } = this;
    var request = {
      staffId:helper.GUID(),
      group: "Admin",
      id: "koyoshiro",
      name: "万叶集",
      password: "kyr19861120",
      role: "admin",
      avatar: 'https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png'
    };
    var result = await service.staff.create(request);
    ctx.body = result;
  }

  async login() {
    const { ctx, service } = this;
    var result = await service.staff.login(ctx.request.body);
    if (result) {
      helper.ResFormat(this.ctx, "", true, "login success", result);
    } else {
      helper.ResFormat(this.ctx, "", false, "login failure", result);
    }
  }
}

module.exports = StaffApiController;
