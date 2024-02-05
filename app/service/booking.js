'use strict';

const Service = require('egg').Service;
const timeHelper = require('../extend/time');

class BookingService extends Service {
  async createOrder(payload, pnr, userId, externalOrderId) {
    const { ctx } = this;
    const { clienttime } = payload.header;
    const {
      contactInfo,
      flightPassengerList,
      shoppingId,
      landingPageType = 'booking',
      campaign = 'flight',
      channel = 'online',
      mktportal = 'customer',
      remark = '',
      locale,
      profitId,
      revenueId,
      currency,
      currencyRate,
      IPCC,
      group,
      baggageInfo,
    } = payload.body;

    // 存储contactInfo,返回contactId
    const contactId = ctx.helper.GUID();
    contactInfo.contactId = contactId;
    await ctx.model.Contact.create(contactInfo);

    // 存储flightPassengerList，返回passengerList
    const passengerIdList = [];
    for (let i = 0; i < flightPassengerList.length; i++) {
      const p = flightPassengerList[i];
      const passengerId = ctx.helper.GUID();
      p.passengerId = passengerId;
      await ctx.model.Passenger.create(p);
      passengerIdList.push(passengerId);
    }

    /**
     * {
            passengerId: psgId,
            number: value[k],
            isRefund: false,
          }
     */
    const pnrInfo = [];
    if (pnr) {
      for (let i = 0; i < passengerIdList.length; i++) {
        pnrInfo.push({
          passengerId: passengerIdList[i],
          number: pnr, // 多个乘客的pnr一样，一个FareBaiscCode对应一个pnr,人数最多是9人
          isRefund: false,
        });
      }
    }

    // 存储订单信息，外链contactId、passengerList,返回OrderId
    const orderId = externalOrderId ? externalOrderId : ctx.helper.ID();
    const createDateTime = timeHelper.nowDateTime();
    // 搜索政策和加价策略
    let profitInfo = null;
    if (profitId) {
      profitInfo = await ctx.model.Profit.findById(profitId);
    }
    let revenueInfo = null;
    if (revenueId) {
      revenueInfo = await ctx.model.Revenue.findOne({ revenueId });
    }
    const orderInfo = {
      orderId,
      userId,
      contactId,
      passengerIdList: passengerIdList.toString(),
      shoppingId,
      locale,
      currency,
      clientTime: clienttime,
      status: 99,
      changeId: '',
      refundId: '',
      mktportal,
      landingPageType,
      campaign,
      channel,
      companyNumber: '',
      ticketNumber: '',
      pnr: pnrInfo.length > 0 ? JSON.stringify(pnrInfo) : '',
      createDateTime,
      remark,
      profitInfo: profitInfo && JSON.stringify(profitInfo),
      revenueInfo: revenueInfo && JSON.stringify(revenueInfo),
      currencyRate,
      IPCC,
      group,
      baggageInfo,
    };
    await ctx.model.Booking.create(orderInfo);

    const responseData = {
      orderInfo,
      /**
       * 新支付流程下发支付信息节点
       */
      payInfo: {
        payToken: '新支付流程下发支付信息节点',
        /**
         * 支付时限 单位秒
         */
        payExpiryTime: 900,
      },
    };
    return responseData;
  }
}

module.exports = BookingService;
