'use strict';

const Controller = require('egg').Controller;
const helper = require('../extend/helper');

class UserApiController extends Controller {
  // 用户注册

  async isUserExist() {
    const { ctx, service } = this;
    // 判断用户名是否重复
    const existUser = await service.user.existUser(ctx.request.body);
    const isExist = existUser && existUser.length > 0;
    helper.ResFormat(this.ctx, '', true, 'query successfully', { isExist });
  }
  async register() {
    const { ctx, service } = this;

    // 判断用户名是否重复
    const existUser = await service.user.existUser(ctx.request.body);
    if (existUser && existUser.length > 0) {
      helper.ResFormat(
        this.ctx,
        '',
        false,
        'The user info already exists',
        existUser
      );
      return;
    }
    const userInfo = await service.user.register(ctx.request.body);

    const verifyLink = `http://www.skywingtrip.com/vertify?userid=${userInfo._id}`;
    // console.log(verifyLink);

    helper.ResFormat(this.ctx, '', true, 'Registered successfully', userInfo);
    if (!userInfo.email) return;
    await service.mail.verifyMail(
      userInfo.userName,
      userInfo.email,
      verifyLink
    );
  }

  async verify() {
    const { ctx, service } = this;
    const userInfo = await service.user.verify(ctx.request.body);
    if (userInfo.valid) {
      helper.ResFormat(this.ctx, '', true, 'Verify successfully', userInfo);
    } else {
      helper.ResFormat(this.ctx, '', false, 'Verify Falure', userInfo);
    }
  }

  // 用户登陆
  async login() {
    const { ctx } = this;

    const data = await ctx.service.user.login(ctx.request.body);
    if (data == null) {
      ctx.status = 401;
      helper.ResFormat(
        this.ctx,
        '',
        false,
        'The user name or password is incorrect',
        {}
      );
      return;
    }
    ctx.body = { status: true, msg: 'Land successfully', data };
  }

  // 忘记密码
  async forgot() {
    const { ctx } = this;
    const users = await ctx.service.user.checkEMail(ctx.request.body);
    if (users[0]) {
      const { email, userName, _id } = users[0];
      await ctx.service.mail.forgotMail(userName, email, _id);
      // 发送邮件
      helper.ResFormat(
        this.ctx,
        '',
        true,
        `Hi ${userName},Email has been sent to ${email}`,
        users[0]
      );
    } else {
      helper.ResFormat(
        this.ctx,
        '',
        false,
        'User name error',
        ctx.request.body
      );
    }
  }

  // 用户修改密码
  async updatePassword() {
    const { ctx } = this;
    const result = await ctx.service.user.updatePwd(ctx.request.body);
    if (result == null) {
      helper.ResFormat(this.ctx, '', false, 'Old password is incorrect', {});
    } else {
      helper.ResFormat(this.ctx, '', true, 'Password has Updated', result);
    }
  }

  // 用户修改密码
  async resetPassword() {
    const { ctx } = this;
    const result = await ctx.service.user.resetPwd(ctx.request.body);

    helper.ResFormat(this.ctx, '', true, 'Password has reseted', result);
  }
}

module.exports = UserApiController;
