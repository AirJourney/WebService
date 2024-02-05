'use strict';

const Controller = require('egg').Controller;
const helper = require('../extend/helper');

class MailApiController extends Controller {


  async orderChange() {
    const { orderId, group } = this.ctx.request.body;

    const orderList = await this.service.order.getAllOrder(orderId, null, group);

    const orderInfo = orderList.length > 0 ? orderList[0] : null;

    if (orderInfo == null) {
      helper.ResFormat(this.ctx, '', false, 'orderInfo is null', {});
      return;
    }

    const mailOrderInfo = {};

    mailOrderInfo.orderId = orderInfo.orderId;
    mailOrderInfo.contactName = orderInfo.contactInfo.contactName;
    mailOrderInfo.email = orderInfo.contactInfo.email;

    mailOrderInfo.passengerList = orderInfo.passengerList;

    mailOrderInfo.flightList = orderInfo.shoppingInfo.flightGroupInfoList;

    mailOrderInfo.flightList.forEach(flight => {
      flight.departDateTimeFormat = flight.departDateTimeFormat.split('T')[0];
      flight.dTime = flight.flightSegments[0].dDateTime.split('T')[1].split(':')[0] + ':' + flight.flightSegments[0].dDateTime.split('T')[1].split(':')[1];
      flight.aTime = flight.flightSegments[flight.flightSegments.length - 1].aDateTime.split('T')[1].split(':')[0] + ':' + flight.flightSegments[flight.flightSegments.length - 1].aDateTime.split('T')[1].split(':')[1];
      flight.dPortName = flight.flightSegments[0].dPortInfo.name;
      flight.aPortName = flight.flightSegments[flight.flightSegments.length - 1].aPortInfo.name;
      flight.durationHour = flight.duration.h;
      flight.durationMinutes = flight.duration.m;
      flight.flightSegments.forEach(seg => {
        seg.airlineName = seg.airlineInfo.code + seg.flightNo;
        seg.craftName = seg.craftInfo.craftType;
      });
    });

    await this.service.mail.changeMail(mailOrderInfo);
    // if (!mailSent) {
    //   helper.ResFormat(this.ctx, '', false, 'mailSent failed', {});
    //   return;
    // }

    helper.ResFormat(this.ctx, '', true, 'mailSent successful', '');
  }
}

module.exports = MailApiController;
