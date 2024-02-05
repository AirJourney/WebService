'use strict';

const Service = require('egg').Service;
const bcrypt = require('bcryptjs');

class UserService extends Service {
  async get(payload) {
    const ctx = this.ctx;
    let data = null;
    if (payload) {
      const { email, password } = payload;
      data = ctx.model.User.find({ id: email, password });
    } else {
      data = ctx.model.User.find({});
      // data = this.app.model.User.find({});
    }

    return data;
  }

  async existUser(query) {
    const { email, phone } = query;

    let existUser = null;

    // const userNameExist = await this.ctx.model.User.find({
    //   userName: userName,
    // });
    // if (userNameExist.length > 0) {
    //   existUser = userNameExist;
    //   return existUser;
    // }

    if (email) {
      const emailExist = await this.ctx.model.User.find({
        email,
      });

      if (emailExist.length > 0) {
        existUser = emailExist[0];
      }
    } else if (phone) {
      const phoneExist = await this.ctx.model.User.find({
        phone,
      });
      if (phoneExist.length > 0) {
        existUser = phoneExist[0];
      }
    }

    return existUser;
  }

  // 检查邮箱
  async checkEMail(query) {
    const { email } = query;
    const users = await this.ctx.model.User.find({
      email,
    });
    return users;
  }

  // 注册
  async register(payload) {
    const { password } = payload;
    // 对密码加密
    const hash = bcrypt.hashSync(password, this.config.bcrypt.saltRounds);
    payload.password = hash;
    payload.valid = false;
    const userGuid = await this.ctx.model.User.create(payload);
    return userGuid;
  }

  // 用户登陆
  async login(body) {
    const { email, password } = body;
    const user = await this.ctx.model.User.findOne({
      email,
    });
    if (!user) return null;

    const match = await bcrypt.compare(password, user.password);
    if (match) {
      //   const { _id, userName } = user;
      //   // 获取jwt配置
      //   const {
      //     jwt: { secret, expiresIn },
      //   } = this.app.config;
      //   // 生成token
      //   const token = this.app.jwt.sign(
      //     {
      //       _id,
      //       userName,
      //     },
      //     secret,
      //     { expiresIn }
      //   );
      return user;
    }
  }

  async verify(payload) {
    const { userGuid } = payload;
    const userInfo = await this.ctx.model.User.findByIdAndUpdate(
      userGuid,
      {
        valid: true,
      },
      { new: true }
    );
    return userInfo;
  }

  // 重置密码发送邮件
  async updatePwd(payload) {
    const { email, oldPwd, newPwd } = payload;
    const userInfo = await this.ctx.model.User.findOne({ email });
    if (!userInfo) return null;
    const match = await bcrypt.compare(oldPwd, userInfo.password);
    if (match) {
      // 对密码加密
      const hash = bcrypt.hashSync(newPwd, this.config.bcrypt.saltRounds);
      const newUserInfo = await this.ctx.model.User.findByIdAndUpdate(
        userInfo._id,
        {
          password: hash,
        },
        { new: true }
      );
      return newUserInfo;
    }
    return null;
  }

  async resetPwd(payload) {
    const { userGuid, newPwd } = payload;

    // 对密码加密
    const hash = bcrypt.hashSync(newPwd, this.config.bcrypt.saltRounds);
    const newUserInfo = await this.ctx.model.User.findByIdAndUpdate(
      userGuid,
      {
        password: hash,
      },
      { new: true }
    );
    return newUserInfo;
  }
}

module.exports = UserService;
