"use strict";

const Service = require("egg").Service;
const { analysisPrice } = require("../public/analysis");
const helper = require("../extend/helper");

class PriceService extends Service {
  async generatePriceInfo(priceString, currency) {
    /** 汇率部分-Start */
    // const currencyRedisCode = 'EUR2' + currency;
    // let currencyRate = await this.app.redis
    //   .get('db2')
    //   .smembers(currencyRedisCode);
    // if (currencyRate && currencyRate.length > 0) {
    //   currencyRate = currencyRate[0];
    // } else {
    //   currencyRate = 1;
    // }
    /** 汇率部分-End */

    const priceInfo = analysisPrice(priceString, 1);

    return { priceInfo, currencyRate: 1 };
  }

  async generatePolicyDetailInfo(priceInfo, passengerList) {
    const adtCount =
      passengerList.filter((p) => p.flag === "ADT").length > 0
        ? passengerList.filter((p) => p.flag === "ADT")[0].count
        : 0;
    const chdCount =
      passengerList.filter((p) => p.flag === "CHD").length > 0
        ? passengerList.filter((p) => p.flag === "CHD")[0].count
        : 0;
    const infCount =
      passengerList.filter((p) => p.flag === "INF").length > 0
        ? passengerList.filter((p) => p.flag === "INF")[0].count
        : 0;

    const totalPrice = (
      parseFloat(Number(priceInfo.adtBase) + Number(priceInfo.adtTaxes)) *
        adtCount +
      parseFloat(Number(priceInfo.chdBase) + Number(priceInfo.chdTaxes)) *
        chdCount +
      parseFloat(Number(priceInfo.infBase) + Number(priceInfo.infTaxes)) *
        infCount
    ).toFixed(0);

    const avgPrice = (totalPrice / (adtCount + chdCount + infCount)).toFixed(0);

    return {
      priceId: helper.GUID(),
      avgPrice,
      totalPrice,
      /** 1:快速出票,2:出票慢, */
      ticketDeadlineType: 1,
      /** 成人运价 */
      adultPrice: {
        /** 当前币种售价 （售卖价 或 公布运价） */
        salePrice: priceInfo.adtBase,
        /** 当前币种税费 */
        tax: priceInfo.adtTaxes,
      },
      childPrice: {
        /** 当前币种售价 （售卖价 或 公布运价） */
        salePrice: priceInfo.chdBase,
        /** 当前币种税费 */
        tax: priceInfo.chdTaxes,
      },
      infantPrice: {
        /** 当前币种售价 （售卖价 或 公布运价） */
        salePrice: priceInfo.infBase,
        /** 当前币种税费 */
        tax: priceInfo.infTaxes,
      },

      /** 限制信息 */
      limitInfo: {
        adultLimitInfo: null,
        childLimitInfo: null,
        /** 剩余票量 */
        availableSeatCount: 0,
        /** 限制的国籍 */
        nationalityLimit: [],
        /** 国籍限制类型，0-不限，1-允许，2-不允许 */
        nationalityLimitType: 0,
      },
      /** 产品提示信息 */
      productNoticeInfo: null,
      /** 公共提示信息 */
      noticeInfoList: [],
      /** 最晚出票时间 */
      ticketDeadlineInfo: null,
    };
  }

  async currencyChange(priceInfo, oriCurrency, curCurrency) {
    const { app } = this;
    if (!priceInfo) {
      return null;
    }
    const currencyRedisCode = `${oriCurrency}2${curCurrency}`;
    /** 汇率部分-Start */
    let rate = await app.redis.get("db2").smembers(currencyRedisCode);
    if (rate && rate.length > 0) {
      rate = rate[0];
    } else {
      return null;
    }
    /** 汇率部分-End */

    /**
     * "priceInfo": {
    "adultPrice": {
        "salePrice": "6875",
        "tax": "230"
    },
    "childPrice": {
        "salePrice": "5150",
        "tax": "230"
    },
    "infantPrice": {
        "salePrice": "5150",
        "tax": "142"
    },
    "avgPrice": "7106",
    "totalPrice": "7106"
},
     */

    const newPriceInfo = {
      adultPrice: {
        salePrice: (priceInfo.adultPrice.salePrice * rate).toFixed(0),
        tax: (priceInfo.adultPrice.tax * rate).toFixed(0),
      },
      childPrice: {
        salePrice: (priceInfo.childPrice.salePrice * rate).toFixed(0),
        tax: (priceInfo.childPrice.tax * rate).toFixed(0),
      },
      infantPrice: {
        salePrice: (priceInfo.infantPrice.salePrice * rate).toFixed(0),
        tax: (priceInfo.infantPrice.tax * rate).toFixed(0),
      },
      avgPrice: (priceInfo.avgPrice * rate).toFixed(0),
      totalPrice: (priceInfo.totalPrice * rate).toFixed(0),
    };

    return newPriceInfo;
  }
}

module.exports = PriceService;
