'use strict';
const uuid = require('uuid');
const moment = require('moment');
const portTimezoneList = require('../public/AirportTimezone.json');

module.exports = {
  GUID() {
    return uuid.v4().replace(/-/g, '');
  },
  ID() {
    const timeTag = moment().format('YYYYMMDDHHmmss');
    const randomTag = Math.random().toString(10).substring(3, 6);
    return timeTag + randomTag;
  },
  ResFormat(ctx, sessionid, status, msg, content, addtitional = {}) {
    /*
     * sessionid: 会话串联id
     * status：bool 接口返回成功/失败（true/false）
     * msg: string 接口返回的信息，用作显示
     * content: 成功时返回接口内容/失败时显示error信息  this.ctx.request.originalUrl
     */
    const responseFormat = { sessionid, status, msg, content, ...addtitional };
    const apiName = ctx.request.originalUrl;
    const reqBody = JSON.stringify(ctx.request.body);
    ctx.logger.info('api-record', {
      sessionid,
      apiName,
      reqBody: reqBody.length > 1000 ? reqBody.substring(0, 1000) : reqBody,
      status,
      msg,
    });

    if (!status) {
      ctx.status = 500;
    } else {
      ctx.status = 200;
    }
    ctx.body = responseFormat;
  },

  calculatePrice(price, rate, percent = 1) {
    if (!price || isNaN(price)) return 0;
    price = Number(price);
    rate = Number(rate);
    const result = Number(((price * rate) / percent).toFixed(0));
    return result;
  },
  calculateAdd(a, b) {
    return (Number(a) + Number(b)).toFixed(0);
  },

  log(logType, pageType, url, refer, content) {
    const logInfo = {
      logType,
      pageType,
      url,
      refer,
      content,
    };
    this.service.log.createLog(logInfo);
  },

  offsetTimezone(arrPort, depPort) {
    function splitNumber(number) {
      const integerPart = parseInt(number, 10);
      const decimalPart = number - integerPart;
      return { integerPart, decimalPart };
    }
    try {
      const arrTimezone = Number(portTimezoneList.find(item => item['airport code'] === arrPort).timezone);
      const depTimezone = Number(portTimezoneList.find(item => item['airport code'] === depPort).timezone);
      const offsetTimezone = arrTimezone - depTimezone;
      const parts = splitNumber(offsetTimezone);
      return {
        integerPart: parts.integerPart,
        decimalPart: parts.decimalPart,
      };
    } catch (e) {
      return {
        integerPart: 0,
        decimalPart: 0,
      };
    }
  },
  mongoBson(params = {}) {
    const r = {};
    Object.entries(params).forEach(([ k, v ]) => {
      if (k && v) {
        r[k] = v;
      }
    });
    return r;
  },
};
