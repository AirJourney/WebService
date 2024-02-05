/* eslint valid-jsdoc: "off" */

"use strict";

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = (appInfo) => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = (exports = {});

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + "1120";

  // add your middleware config here
  config.middleware = [];

  // add your user config here
  const userConfig = {
    myAppName: "LLTrip-WebService",
  };

  // jwt
  config.jwt = {
    secret: "lltrip2022",
    expiresIn: "24h",
  };

  // 密码加密
  config.bcrypt = {
    saltRounds: 10,
  };

  // config.mongoose = {
  //   client: {
  //     url: "mongodb://root:LLTrip2022@lltrip2022.mongodb.rds.aliyuncs.com:3717,dds-j6c591e2d4e8fc442.mongodb.rds.aliyuncs.com:3717/admin?replicaSet=mgset-58495395",
  //     options: {
  //       // auth: { authSource: "LLTrip" },
  //       user: "root",
  //       pass: "LLTrip2022",
  //     },
  //   },
  // };

  config.mongoose = {
    client: {
      url: "mongodb://lltrip:LLTrip-2022@dds-j6ccf019fdfb82841131-pub.mongodb.rds.aliyuncs.com:3717,dds-j6ccf019fdfb82842252-pub.mongodb.rds.aliyuncs.com:3717/LLTrip?replicaSet=mgset-66210039",
      
      options: {
        // user: "root",
        // pass: "LLTrip2022",
        useUnifiedTopology: true,
      },
    },
  };

  config.redis = {
    // 单个数据库用client
    // client: {
    //   port: 6379, // Redis port
    //   host: "r-j6c26r3xdt46dh47wrpd.redis.rds.aliyuncs.com", // Redis host
    //   password: "lltrip@2022",
    //   db: 0,
    // },

    // 使用多个数据库连接
    clients: {
      db0: {
        port: 6379, // Redis port
        host: "r-uf6r3mrlxpmik7gdsjpd.redis.rds.aliyuncs.com", // Redis host
        password: "lltrip@2022",
        db: 0,
      },
      db1: {
        port: 6379, // Redis port
        host: "r-uf6r3mrlxpmik7gdsjpd.redis.rds.aliyuncs.com", // Redis host
        password: "lltrip@2022",
        db: 1,
      },
      db2: {
        port: 6379, // Redis port
        host: "r-uf6r3mrlxpmik7gdsjpd.redis.rds.aliyuncs.com", // Redis host
        password: "lltrip@2022",
        db: 2,
      },
      db3: {
        port: 6379, // Redis port
        host: "r-uf6r3mrlxpmik7gdsjpd.redis.rds.aliyuncs.com", // Redis host
        password: "lltrip@2022",
        db: 3,
      },
    },
  };

  config.security = {
    csrf: {
      enable: false,
      ignoreJSON: true,
    },
    domainWhiteList: [
      "http://47.243.79.251",
      "http://skywingtrip.com",
      "http://127.0.0.1",
      "http://47.242.231.174",
      "http://skywinghub.com",
      
    ],
  };

  config.cors = {
    // origin: "http://skywingtrip.com",
    origin: '*',
    allowMethods: "GET,HEAD,PUT,POST,DELETE,PATCH",
    credentials: true,
  };

  // 链接配置信息
  config.website = {
    b2sTxnEndURL: 'http://skywinghub.com/website/payment/b2sTxnEnd',
    s2sTxnEndURL: 'http://skywinghub.com/website/payment/s2sTxnEnd',
    successURL: 'http://skywingtrip.com/payment/success',
    failURL: 'http://skywingtrip.com/payment/fail',
    secretKey: "440e8c79-6c35-4512-9737-bc1c58ca30ba",
    // paypal设置
    paypal: {
      'mode': 'live', //sandbox or live
      'client_id': 'AdI9t16BxYF-SNuEYe3ImzuBSRq3-e7HCR6DuR8oL0YU-rwotWwUWtsFOzKixEVehCJKgoy_2HDLP_lR',
      'client_secret': 'EAxBIDBjlWPIWKmQs2acZus1k-vf-T-ZE5FA25W8zUpxma04bA0q7-sHByTncEt6xbSqvezLKkp3XvCQ'
    },
    unionPay: {
      sandbox: true,
      merId: '000092304074019',
      certificationPassword: 'a111111',
      s2sTxnEndURL: 'https://skywinghub.com/website/payment/unionpay/check',
    },
    allpayx: {
      sandbox: false,
      merID: '800039247222038',
      key: '9ja47ukcwlfy6h7x7nk0csk897t0fq6h',
      s2sTxnEndURL: 'https://skywinghub.com/website/payment/allpayx/check',
    },
    huipay: {
      sandbox: false,
      merID: '861505273897',
      certificationPassword: '123456',
      s2sTxnEndURL: 'https://skywinghub.com/website/payment/huipay/check',
      b2sTxnEndURL: 'https://www.skywingtrip.cn/payment/success',
    },
  }

  return {
    ...config,
    ...userConfig,
  };
};
