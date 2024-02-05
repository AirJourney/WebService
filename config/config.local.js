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
    domainWhiteList: ["http://127.0.0.1:3000", 'http://localhost:3000', "https://uat-api.nets.com.sg:9065", "https://uat2.enets.sg", "https://www2.enets.sg", "https://api.nets.com.sg"],
  };

  config.cors = {
    origin: '*',
    allowMethods: "GET,HEAD,PUT,POST,DELETE,PATCH",
    credentials: true,
  };

  config.cluster = {
    listen: {
      path: '',
      port: 80,
      hostname: '127.0.0.1'
    }
  }

  // 链接配置信息
  config.website = {
    b2sTxnEndURL: 'http://localhost/website/payment/b2sTxnEnd',
    s2sTxnEndURL: 'http://localhost/website/payment/s2sTxnEnd',
    successURL: 'http://localhost:3000/payment/success',
    failURL: 'http://localhost:3000/payment/fail',
    secretKey: "440e8c79-6c35-4512-9737-bc1c58ca30ba",
    // paypal设置
    paypal: {
      'mode': 'sandbox', //sandbox or live
      'client_id': 'Ae3RNMFPi8uzmS8_WStOmXSDXlzQHqsAHu1hEDlWrNkzYdsI1nJyPkMY6owUM9021_WXLhDWQ3dQjo1n',
      'client_secret': 'ELkXr-073y8OdhLE0_tDKLG9U_nPS3Ejp6bTQ0H-rdNA0DLubyG9oF81GXgMjXsfzsiwHzNVdR_Gt3ir'
    },
    unionPay: {
      sandbox: true,
      merId: '000092304074019',
      certificationPassword: 'a111111',
      s2sTxnEndURL: 'http://localhost/website/payment/unionpay/check',
    },
    allpayx: {
      sandbox: true,
      merID: 'TEST34453112359',
      key: '5jqh7o4jam3ru07hcatxw8dngt00yi1s',
      s2sTxnEndURL: 'http://localhost/website/payment/allpayx/check',
    },
    huipay: {
      sandbox: false,
      merID: '861505273897',
      certificationPassword: '123456',
      s2sTxnEndURL: 'http://localhost/website/payment/huipay/check',
    },
  }

  return {
    ...config,
    ...userConfig,
  };
};