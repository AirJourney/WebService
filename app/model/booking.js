'use strict';

module.exports = app => {
  const mongoose = app.mongoose;

  const BookingSchema = new mongoose.Schema({
    orderId: {
      type: String,
      trim: true,
    },
    userId: {
      type: String,
      trim: true,
    },
    contactId: {
      type: String,
      trim: true,
    },
    passengerIdList: {
      type: String,
      trim: true,
    },
    shoppingId: {
      type: String,
      trim: true,
    },
    currency: {
      type: String,
      trim: true,
    },
    clientTime: {
      type: String,
      trim: true,
    },
    status: {
      type: Number, //  99未支付；0:已支付/ 1:出票成功/ 2:出票失败/ 10:改签中/ 11:改签成功/ 12:改签失败/ 20:退票中/ 21:退票成功/ 22:退票失败 / 999已取消
      trim: true,
    },
    changeId: {
      type: String,
      trim: true,
    },
    refundId: {
      type: String,
      trim: true,
    },
    /** 票号 */
    ticketNumber: {
      type: String,
      trim: true,
    },
    pnr: {
      type: String,
      trim: true,
    },
    /** 航司预定编码 */
    companyNumber: {
      type: String,
      trim: true,
    },
    // 外部渠道 SC
    mktportal: {
      type: String,
      trim: true,
    },
    // 着陆页
    landingPageType: {
      type: String,
      trim: true,
    },
    // 售卖大类
    campaign: {
      type: String,
      trim: true,
    },
    // 站点 tw / hk / my
    locale: {
      type: String,
      trim: true,
    },
    // online / H5
    channel: {
      type: String,
      trim: true,
    },
    // 支付渠道
    payChannel: {
      type: String,
      trim: true,
    },
    // 交易时间
    txnTime: {
      type: String,
      trim: true,
    },
    // 交易号码
    netsTxnRef: {
      type: String,
      trim: true,
    },
    // huiPay订单交易二维码
    huiPayQrCode: {
      type: String,
      trim: true,
    },
    createDateTime: {
      type: String,
      trim: true,
    },
    remark: {
      type: String,
      trim: true,
    },
    profitInfo: {
      type: String,
      trim: true,
    },
    revenueInfo: {
      type: String,
      trim: true,
    },
    currencyRate: {
      type: String,
      trim: true,
    },
    IPCC: {
      type: String,
      trim: true,
    },
    group: {
      type: String,
      trim: true,
    },
    baggageInfo: [{
      piece: Number,
      price: String,
      weight: String,
    }],
  });

  return mongoose.model('Booking', BookingSchema, 'booking');
};
