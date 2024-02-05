'use strict';
const helper = require('../../extend/helper');
const timeHelper = require('../../extend/time');

module.exports = class Booking {
  constructor(app) {
    this.app = app;
    this.params = {};
  }

  async getShoppingInfo() {
    const shoppingInfo = await this.app.service.shopping.getShoppingInfo(
      this.app.ctx.request.body
    );
    const segments = [];
    if (
      shoppingInfo &&
      shoppingInfo.redisSchema &&
      shoppingInfo.flightGroupInfoList &&
      shoppingInfo.flightGroupInfoList.length > 0
    ) {
      shoppingInfo.flightGroupInfoList.forEach((flight, index) => {
        flight.flightSegments.forEach(segment => {
          segments.push({
            from: segment.dPortInfo.code,
            to: segment.aPortInfo.code,
            bookingClass: segment.subClass,
            departure: segment.dDateTime,
            arrival: segment.aDateTime,
            airline: segment.airlineInfo.code,
            flightNumber: segment.flightNo,
            serviceClass: segment.cabinClass,
            plane: segment.craftInfo.craftType,
            fareBasisCode: segment.fareBasisCode,
            group: index,
          });
        });
      });
    }
    return segments;
  }


  async booking() {
    throw new Error('booking is not implemented');
  }

  async autoRegister() {
    const defaultUserName = this.params.contactInfo.email;
    if (!this.params.userid) {
      this.params.userid = defaultUserName;
      const existUser = await this.app.service.user.existUser({
        email: defaultUserName,
      });
      if (!existUser) {
        const userInfo = await this.app.service.user.register({
          email: defaultUserName,
          userName: defaultUserName,
          // 创建16位随机密码
          password: helper.GUID(),
        });
        return { isNewUser: true, id: userInfo._id };
      }
      return { isNewUser: false };
    }
    return { isNewUser: false };
  }

  async saveOrder(pnr, orderId) {
    return this.app.service.booking.createOrder(
      this.app.ctx.request,
      pnr,
      this.params.userid,
      orderId
    );
  }

  async sendMail(orderInfo, isNewUser, id) {
    this.app.service.mail.toPayMail(
      this.params.contactInfo.contactName,
      this.params.contactInfo.email,
      orderInfo.orderInfo.orderId,
      this.params.userid,
      isNewUser,
      id
    );
  }

  generateParams(params) {
    this.params = params;
  }

  getPNRAndOrderId() {
    throw new Error('getPNR is not implemented');
  }

  convertAgeCategory(ageCategory) {
    /**
     * 'ADT', 'CNN', 'INF'
     * */
    let convertResult = 'ADT';
    switch (ageCategory) {
      case 'ADT':
        convertResult = 'ADT';
        break;
      case 'CHD':
        convertResult = 'CNN';
        break;
      case 'INF':
        convertResult = 'INF';
        break;
      default:
        break;
    }
    return convertResult;
  }

  async process(params) {
    this.generateParams(params);
    // 根据shoppingId获取shopping信息
    const segments = await this.getShoppingInfo();
    // 获取passengers信息
    const passengers = this.getPassengers();
    // 调用booking接口
    const bookingStatus = await this.booking({
      segments,
      IPCC: this.params.IPCC,
      passengers,
    });
    this.app.service.trace.createTrace({
      traceType: 'log',
      dateTime: timeHelper.nowDateTime(),
      pageType: 'booking',
      api: 'booking',
      refer: this.params.referer,
      content: `request:${JSON.stringify({
        segments,
        IPCC: this.params.IPCC,
        passengers,
      })},response:${JSON.stringify(bookingStatus && bookingStatus.data)}`,
    });
    // 获取pnr
    const { pnr, orderId } = this.getPNRAndOrderId(bookingStatus);
    if (!pnr || !orderId) {
      throw new Error(bookingStatus.data.msg || 'booking failed');
    }
    // 自动注册(未注册用户)
    const { isNewUser, id } = await this.autoRegister();
    // 保存订单信息
    const orderInfo = await this.saveOrder(pnr, orderId);
    await this.sendMail(orderInfo, isNewUser, id);
    return orderInfo;
  }
};
