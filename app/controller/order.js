'use strict';

const Controller = require('egg').Controller;
const helper = require('../extend/helper');

class OrderApiController extends Controller {
  async getList() {
    const { sessionid, userid } = this.ctx.request.header;
    const { tag } = this.ctx.request.body;

    const orderList = await this.service.order.getOrderList(userid, tag);
    helper.ResFormat(this.ctx, sessionid, true, '', orderList);
  }

  async getDetail() {
    const { sessionid } = this.ctx.request.header;
    const orderInfo = await this.service.order.getOrderInfo(this.ctx.request);
    if (orderInfo == null) {
      helper.ResFormat(this.ctx, sessionid, false, 'orderInfo is null', {});
    } else {
      // if(orderInfo.pnr!=''){
      //   orderInfo.pnr = JSON.parse(orderInfo.pnr)
      //   orderInfo.flightPassengerList.forEach(psg=>{
      //     orderInfo.pnr.forEach(p=>{
      //       if(p.passengerId == psg.passengerId){
      //         psg.pnrInfo = p
      //       }
      //     })
      //   })
      // }
      helper.ResFormat(this.ctx, sessionid, true, '', orderInfo);
    }
  }

  async changeOrder() {
    const { sessionid } = this.ctx.request.header;
    const changeRes = await this.service.order.changeOrder(this.ctx.request);
    if (changeRes == null) {
      helper.ResFormat(this.ctx, sessionid, false, 'changeRes is null', {});
    } else {
      helper.ResFormat(this.ctx, sessionid, true, '', changeRes);
    }
  }

  async refund() {
    /**
     * status  0:出票中/ 1:出票成功/ 2:出票失败/ 10:改签中/ 11:改签成功/ 12:改签失败/ 20:退票中/ 21:退票成功/ 22:退票失败
     */
    const orderInfo = await this.service.order.refundOrder(this.ctx.request);
    if (Object.keys(orderInfo).length === 0) {
      helper.ResFormat(this.ctx, '', false, 'refundOrder failure', {});
    } else {
      helper.ResFormat(this.ctx, '', true, '', orderInfo);
    }
  }

  async update() {
    /**
     * status  0:出票中/ 1:出票成功/ 2:出票失败/ 10:改签中/ 11:改签成功/ 12:改签失败/ 20:退票中/ 21:退票成功/ 22:退票失败
     */
    const orderInfo = await this.service.order.updateOrderInfo(
      this.ctx.request
    );
    if (Object.keys(orderInfo) === 0) {
      helper.ResFormat(this.ctx, '', false, 'orderInfo update failure', {});
    } else {
      helper.ResFormat(this.ctx, '', true, '', orderInfo);
    }
  }

  async getAllList() {
    const { orderId, status, group } = this.ctx.request.body;

    const orderList = await this.service.order.getAllOrder(orderId, status, group);

    for (let i = 0; i < orderList.length; i++) {
      const offLogList = await this.service.log.getOffLog({
        orderId: orderList[i].orderId,
      });
      const passengerList = orderList[i].passengerList;

      const displayPassenger = numberObjStr => {
        const numberObjList = JSON.parse(numberObjStr);
        numberObjList.forEach(n => {
          const passengerInfo = passengerList.find(
            p => p.passengerId === n.passengerId
          );
          n.passengerId = `${passengerInfo.surName}/${passengerInfo.givenName}`;
        });
        return JSON.stringify(numberObjList);
      };

      const logDescriptionList = [];
      offLogList.forEach(log => {
        logDescriptionList.push({
          title: log.staff.length > 0 ? log.staff[0].name : 'unknown',
          description: `${log.dateTime} ${log.opType}, 票号：${
            log.ticketNumber ? displayPassenger(log.ticketNumber) : '无'
          }, 航司编号：${
            log.companyNumber ? displayPassenger(log.companyNumber) : '无'
          }, PNR${log.pnr ? displayPassenger(log.pnr) : '无'}`, // '2022-04-30 16:03:01 改签操作,票号:XXXXXXXX',
        });
      });

      orderList[i].offLogList = logDescriptionList;
    }

    helper.ResFormat(this.ctx, '', true, '', orderList);
  }

  async getMailOrderInfo() {
    const { orderId } = this.ctx.request.body;

    const orderList = await this.service.order.getAllOrder(orderId);

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
      flight.dTime =
        flight.flightSegments[0].dDateTime.split('T')[1].split(':')[0] +
        ':' +
        flight.flightSegments[0].dDateTime.split('T')[1].split(':')[1];
      flight.aTime =
        flight.flightSegments[flight.flightSegments.length - 1].dDateTime
          .split('T')[1]
          .split(':')[0] +
        ':' +
        flight.flightSegments[flight.flightSegments.length - 1].dDateTime
          .split('T')[1]
          .split(':')[1];
      flight.dPortName = flight.flightSegments[0].dPortInfo.name;
      flight.aPortName =
        flight.flightSegments[flight.flightSegments.length - 1].aPortInfo.name;
      flight.airlineName = flight.flightSegments[0].airlineInfo.name;
      flight.craftName = flight.flightSegments[0].craftInfo.craftType;
      flight.durationHour = flight.duration.h;
      flight.durationMinutes = flight.duration.m;
    });

    helper.ResFormat(this.ctx, '', true, 'orderInfo successful', mailOrderInfo);
  }

  async updateOrderTicket() {
    const updateRes = await this.service.order.updateOrderTicket(this.ctx.request.body);
    if (updateRes) {
      helper.ResFormat(this.ctx, '', true, 'updateOrderTicket successful', updateRes);
    } else {
      helper.ResFormat(this.ctx, '', false, 'updateOrderTicket failure', {});
    }
  }

}

module.exports = OrderApiController;
