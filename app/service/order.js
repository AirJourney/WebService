'use strict';

const Service = require('egg').Service;
const timeHelper = require('../extend/time');

class OrderService extends Service {
  async getOrderInfo(payload) {
    const { ctx, service } = this;
    const { userid } = payload.header;
    const { orderId } = payload.body;

    let orderInfo = await ctx.model.Booking.aggregate([
      {
        $lookup: {
          from: 'contact',
          localField: 'contactId',
          foreignField: 'contactId',
          as: 'contactInfo',
        },
      },
      {
        $match: {
          orderId,
          userId: userid,
        },
      },
    ]);
    if (orderInfo.length === 1) {
      orderInfo = orderInfo[0];
    } else {
      return null;
    }
    const reqPsgList = orderInfo.passengerIdList.split(',');

    // 乘机人
    orderInfo.flightPassengerList = [];
    for (let i = 0; i < reqPsgList.length; i++) {
      let psg = await ctx.model.Passenger.aggregate([
        {
          $match: {
            passengerId: reqPsgList[i],
          },
        },
      ]);
      psg = psg.length > 0 ? psg[0] : null;
      if (orderInfo.pnr !== '' && orderInfo.pnr && psg != null) {
        if (typeof orderInfo.pnr === 'string') {
          orderInfo.pnr = JSON.parse(orderInfo.pnr);
        }

        orderInfo.pnr.forEach(p => {
          if (p.passengerId === psg.passengerId) {
            psg.pnrInfo = p;
          }
        });
      }
      psg != null && orderInfo.flightPassengerList.push(psg);
    }

    // 商品信息
    orderInfo.shoppingInfo = await service.shopping.getShoppingInfo({
      shoppingId: orderInfo.shoppingId,
    });

    return orderInfo;
  }

  /**
   * 获取订单列表
   * @param {userId} payload
   * @return
   */
  async getOrderList(userid, tag) {
    const { ctx, service } = this;
    let orderList = [];
    /*
    all:全部订单;payment:待支付;processing:处理中;done:已完成
    */

    if (tag === 'payment') {
      orderList = await ctx.model.Booking.aggregate([
        {
          $match: {
            userId: userid,
            status: 99,
          },
        },
      ]);
    } else if (tag === 'processing') {
      orderList = await ctx.model.Booking.aggregate([
        {
          $match: {
            // 多条件，数组
            userId: userid,
            status: { $in: [ 0, 10, 20 ] },
          },
        },
      ]);
    } else if (tag === 'done') {
      orderList = await ctx.model.Booking.aggregate([
        {
          $match: {
            // 多条件，数组
            userId: userid,
            status: { $in: [ 1, 2, 11, 12, 21, 22 ] },
          },
        },
      ]);
    } else {
      orderList = await ctx.model.Booking.aggregate([
        {
          $match: {
            userId: userid,
          },
        },
      ]);
    }

    for (let i = 0; i < orderList.length; i++) {
      // 商品信息
      orderList[i].shoppingInfo = await service.shopping.getShoppingInfo({
        shoppingId: orderList[i].shoppingId,
      });
    }

    return orderList;
  }

  async refundOrder(payload) {
    const { ctx } = this;
    const { orderInfo, staffId, opType } = payload.body;

    orderInfo.ticketNumber = orderInfo.ticketNumber
      ? JSON.parse(orderInfo.ticketNumber)
      : [];
    orderInfo.companyNumber = orderInfo.companyNumber
      ? JSON.parse(orderInfo.companyNumber)
      : [];
    orderInfo.pnr = orderInfo.pnr ? JSON.parse(orderInfo.pnr) : [];

    /** passengerId: psgId,
            number: value[k],
            isRefund: false, */
    const syncRefundStatus = ticketList => {
      orderInfo.passengerList.forEach(psg => {
        ticketList.forEach(t => {
          if (t.passengerId === psg.passengerId) {
            t.isRefund = psg.isRefund;
          }
        });
      });
    };

    syncRefundStatus(orderInfo.ticketNumber);
    syncRefundStatus(orderInfo.companyNumber);
    syncRefundStatus(orderInfo.pnr);

    orderInfo.ticketNumber = JSON.stringify(orderInfo.ticketNumber);
    orderInfo.companyNumber = JSON.stringify(orderInfo.companyNumber);
    orderInfo.pnr = JSON.stringify(orderInfo.pnr);

    await ctx.model.Booking.findOneAndUpdate(
      {
        orderId: orderInfo.orderId,
      },
      orderInfo
    );
    const offlogInfo = {
      orderId: orderInfo.orderId,
      staffId,
      dateTime: timeHelper.displayMoment(undefined, 'YYYY-MM-DD HH:mm:SS'),
      opType,
      ticketNumber: orderInfo.ticketNumber,
      companyNumber: orderInfo.companyNumber,
      pnr: orderInfo.pnr,
    };
    await ctx.model.Offlog.create(offlogInfo);

    return orderInfo;
  }

  async updateOrderInfo(payload) {
    const { ctx } = this;
    const { orderInfo, staffId, opType, value } = payload.body;

    orderInfo.ticketNumber = orderInfo.ticketNumber
      ? JSON.parse(orderInfo.ticketNumber)
      : [];
    orderInfo.companyNumber = orderInfo.companyNumber
      ? JSON.parse(orderInfo.companyNumber)
      : [];
    orderInfo.pnr = orderInfo.pnr ? JSON.parse(orderInfo.pnr) : [];

    Object.keys(value).forEach(k => {
      const kSplit = k.toString().split('-');
      const psgId = kSplit[0];
      const ticketInfoType = kSplit[1];

      if (ticketInfoType === 'ticketNumber') {
        if (orderInfo.ticketNumber.find(t => t.passengerId === psgId)) {
          orderInfo.ticketNumber.forEach(t => {
            if (t.passengerId === psgId) {
              t.number = value[k];
              return;
            }
          });
        } else {
          orderInfo.ticketNumber.push({
            passengerId: psgId,
            number: value[k],
            isRefund: false,
          });
        }
      } else if (ticketInfoType === 'companyNumber') {
        if (orderInfo.companyNumber.find(t => t.passengerId === psgId)) {
          orderInfo.companyNumber.forEach(t => {
            if (t.passengerId === psgId) {
              t.number = value[k];
              return;
            }
          });
        } else {
          orderInfo.companyNumber.push({
            passengerId: psgId,
            number: value[k],
            isRefund: false,
          });
        }
      } else if (ticketInfoType === 'pnr') {
        if (orderInfo.pnr.find(t => t.passengerId === psgId)) {
          orderInfo.pnr.forEach(t => {
            if (t.passengerId === psgId) {
              t.number = value[k];
              return;
            }
          });
        } else {
          orderInfo.pnr.push({
            passengerId: psgId,
            number: value[k],
            isRefund: false,
          });
        }
      }
    });

    orderInfo.ticketNumber = JSON.stringify(orderInfo.ticketNumber);
    orderInfo.companyNumber = JSON.stringify(orderInfo.companyNumber);
    orderInfo.pnr = JSON.stringify(orderInfo.pnr);

    await ctx.model.Booking.findOneAndUpdate(
      {
        orderId: orderInfo.orderId,
      },
      orderInfo
    );
    const offlogInfo = {
      orderId: orderInfo.orderId,
      staffId,
      dateTime: timeHelper.displayMoment(undefined, 'YYYY-MM-DD HH:mm:SS'),
      opType,
      ticketNumber: orderInfo.ticketNumber,
      companyNumber: orderInfo.companyNumber,
      pnr: orderInfo.pnr,
    };
    await ctx.model.Offlog.create(offlogInfo);

    return orderInfo;
  }

  async getAllOrder(orderId, status, group) {
    const { ctx, service } = this;

    let orderList = [];
    const query = { };

    if (group) {
      query.group = group;
    } else {
      return orderList;
    }

    if (orderId) {
      query.orderId = orderId;
    }
    if (status !== undefined && status !== null) {
      query.status = status;
    }

    orderList = await ctx.model.Booking.aggregate([
      {
        $match: query,
      },
    ]);

    for (let i = 0; i < orderList.length; i++) {
      // 商品信息
      orderList[i].shoppingInfo = await service.shopping.getShoppingInfo({
        shoppingId: orderList[i].shoppingId,
      });

      // 联系人信息
      const contactList = await ctx.model.Contact.aggregate([
        {
          $match: {
            contactId: orderList[i].contactId,
          },
        },
      ]);
      if (contactList.length > 0) {
        orderList[i].contactInfo = contactList[0];
        orderList[i].contactName = orderList[i].contactInfo.contactName;
        orderList[i].email = orderList[i].contactInfo.email;
        orderList[i].phoneArea = orderList[i].contactInfo.phoneArea;
        orderList[i].mobilePhone = orderList[i].contactInfo.mobilePhone;
        orderList[i].contactTel = orderList[i].contactInfo.contactTel;
      }

      const orderPassengerList = orderList[i].passengerIdList.split(',');
      const passengerList = [];
      for (let j = 0; j < orderPassengerList.length; j++) {
        const passenger = await ctx.model.Passenger.aggregate([
          {
            $match: {
              passengerId: orderPassengerList[j],
            },
          },
        ]);
        passenger.length > 0 ? passengerList.push(passenger[0]) : null;
      }
      orderList[i].passengerList = passengerList;

      const matchPsgNumber = (objectList, numberName) => {
        const passengerList =
          orderList[i].passengerList.length > 0
            ? orderList[i].passengerList
            : null;
        if (!passengerList || typeof objectList !== 'object') {
          return;
        }
        passengerList.forEach(psg => {
          const matchNumber = objectList.find(
            item => item.passengerId === psg.passengerId
          );
          psg[numberName] = matchNumber ? matchNumber.number : '';
          psg.isRefund = matchNumber
            ? matchNumber.isRefund === undefined
              ? false
              : matchNumber.isRefund
            : false;
        });
      };

      orderList[i].ticketNumber
        ? matchPsgNumber(JSON.parse(orderList[i].ticketNumber), 'ticketNumber')
        : null;
      orderList[i].companyNumber
        ? matchPsgNumber(
          JSON.parse(orderList[i].companyNumber),
          'companyNumber'
        )
        : null;
      orderList[i].pnr
        ? matchPsgNumber(JSON.parse(orderList[i].pnr), 'pnr')
        : null;

      // 简略信息提取
      if (!orderList[i].shoppingInfo) {
        return orderList;
      }
      const flightInfoList = orderList[i].shoppingInfo.flightGroupInfoList;
      if (Array.isArray(flightInfoList) && flightInfoList.length > 0) {
        orderList[
          i
        ].segment = `${flightInfoList[0].departMultCityName} - ${flightInfoList[0].arriveMultCityName}`;
        orderList[i].dateTime = [];
        if (flightInfoList.length > 1) {
          orderList[i].flightType = 'RT';
          orderList[i].dateTime.push(
            `${timeHelper.displayMoment(
              flightInfoList[0].departDateTimeFormat,
              'YYYY-MM-DD HH:mm'
            )} - ${timeHelper.displayMoment(
              flightInfoList[0].arriveDateTimeFormat,
              'YYYY-MM-DD HH:mm'
            )}`
          );
          orderList[i].dateTime.push(
            `${timeHelper.displayMoment(
              flightInfoList[1].departDateTimeFormat,
              'YYYY-MM-DD HH:mm'
            )} - ${timeHelper.displayMoment(
              flightInfoList[1].arriveDateTimeFormat,
              'YYYY-MM-DD HH:mm'
            )}`
          );
        } else {
          orderList[i].flightType = 'OW';

          orderList[i].dateTime.push(
            `${timeHelper.displayMoment(
              flightInfoList[0].departDateTimeFormat,
              'YYYY-MM-DD HH:mm'
            )} - ${timeHelper.displayMoment(
              flightInfoList[0].arriveDateTimeFormat,
              'YYYY-MM-DD HH:mm'
            )}`
          );
        }
      }

      orderList[i].totalPrice =
        orderList[i].shoppingInfo.policyDetailInfo.totalPrice;

      orderList[i].clientTime = timeHelper.displayMoment(
        orderList[i].clientTime,
        'YYYY-MM-DD HH:mm:ss'
      );
    }

    return orderList;
  }

  async changeOrder(payload) {
    const { ctx } = this;
    const { orderId, changeType } = payload.body;

    const changeRes = await ctx.model.Booking.findOneAndUpdate(
      {
        orderId,
      },
      {
        status: changeType,
      }
    );

    return changeRes;
  }

  async updateOrderTicket(payload) {
    try {

      const { ctx } = this;
      const { orderInfo, ticketList, status } = payload;

      orderInfo.ticketNumber = orderInfo.ticketNumber
        ? JSON.parse(orderInfo.ticketNumber)
        : [];
      orderInfo.companyNumber = orderInfo.companyNumber
        ? JSON.parse(orderInfo.companyNumber)
        : [];
      orderInfo.pnr = orderInfo.pnr ? JSON.parse(orderInfo.pnr) : [];

      orderInfo.passengerList.forEach(p => {
        for (const t of ticketList) {
          if (t.passNumber == p.cardNo) {
            t.passengerId = p.passengerId;
          }
        }
      });

      ticketList.forEach(t => {

        const psgId = t.passengerId;
        const pnr = t.pnr;
        const companyNumber = t.companyNumber;
        const tickeNumber = t.tickeNumber;

        /** 退票在后续记录
       *
       * const pnrIsRefund = t.pnrIsRefund;
         const companyNumberIsRefund = t.companyNumberIsRefund;
         const tickeNumberIsRefund = t.tickeNumberIsRefund;
       *
       */

        if (orderInfo.ticketNumber.find(t => t.passengerId === psgId)) {
          orderInfo.ticketNumber.forEach(t => {
            if (t.passengerId === psgId) {
              t.number = tickeNumber;
              return;
            }
          });
        } else {
          orderInfo.ticketNumber.push({
            passengerId: psgId,
            number: tickeNumber,
            isRefund: false,
          });
        }

        if (orderInfo.companyNumber.find(t => t.passengerId === psgId)) {
          orderInfo.companyNumber.forEach(t => {
            if (t.passengerId === psgId) {
              t.number = companyNumber;
              return;
            }
          });
        } else {
          orderInfo.companyNumber.push({
            passengerId: psgId,
            number: companyNumber,
            isRefund: false,
          });
        }
        if (orderInfo.pnr.find(t => t.passengerId === psgId)) {
          orderInfo.pnr.forEach(t => {
            if (t.passengerId === psgId) {
              t.number = pnr;
              return;
            }
          });
        } else {
          orderInfo.pnr.push({
            passengerId: psgId,
            number: pnr,
            isRefund: false,
          });
        }
      });
      orderInfo.ticketNumber = JSON.stringify(orderInfo.ticketNumber);
      orderInfo.companyNumber = JSON.stringify(orderInfo.companyNumber);
      orderInfo.pnr = JSON.stringify(orderInfo.pnr);
      if (status !== undefined && status !== null) {
        orderInfo.status = status;
      }
      await ctx.model.Booking.findOneAndUpdate(
        {
          orderId: orderInfo.orderId,
        },
        orderInfo
      );
      return orderInfo;
    } catch (e) {
      this.service.trace.createTrace({
        traceType: 'log',
        dateTime: timeHelper.nowDateTime(),
        pageType: 'booking',
        api: 'updateTicket',
        content: `request:${JSON.stringify(
          payload
        )},response:${e.message}`,
      });
    }
  }
}

module.exports = OrderService;
