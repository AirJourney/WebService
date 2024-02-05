'use strict';

module.exports = app => {
  const mongoose = app.mongoose;

  const UserSchema = new mongoose.Schema({
    // 站点，默认为空，待统一填入
    domain: {
      type: String,
      trim: true,
    },
    // 用户名
    userName: {
      type: String,
      trim: true,
    },
    // 用户密码
    password: {
      type: String,
      trim: true,
    },
    // 用户昵称，默认为系统生成
    displayName: {
      type: String,
      trim: true,
    },
    // 性别，默认为Unknown
    sex: {
      type: String, // Unknown,male,female
      trim: true,
    },
    // 年龄
    birthday: {
      type: String, // YYYY-MM-DD
      trim: true,
    },
    // 手机
    phone: {
      type: String, // 带区号
      trim: true,
    },
    // 邮箱（必填）
    email: {
      type: String,
      trim: true,
    },
    valid: {
      type: Boolean,
    },
  });

  return mongoose.model('User', UserSchema, 'user');
};
