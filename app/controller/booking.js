'use strict';

const Controller = require('egg').Controller;
const helper = require('../extend/helper');
const timeHelper = require('../extend/time');
const Galileo = require('../service/booking/Galileo');
const LCC = require('../service/booking/LCC');
const { getRandomCacheMachine } = require('../extend/utils');

class BookingApiController extends Controller {
  async creatOrder() {
    let { sessionid, userid } = this.ctx.request.header;
    let isExistUser = true;
    const { contactInfo, flightPassengerList, skuType } = this.ctx.request.body;
    const referer = this.ctx.request.headers.referer;
    const defaultUserName = contactInfo.email;
    let pnr = '';
    // 订位
    const shoppingInfo = await this.service.shopping.getShoppingInfo(
      this.ctx.request.body
    );
    if (
      shoppingInfo &&
      shoppingInfo.redisSchema &&
      shoppingInfo.flightGroupInfoList &&
      shoppingInfo.flightGroupInfoList.length > 0
    ) {
      const segments = [];
      let IPCC = '';
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
          IPCC = segment.IPCC;
        });
      });

      const convertAgeCategory = ageCategory => {
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
      };

      const passengers = [];
      for (let i = 0; i < flightPassengerList.length; i++) {
        const p = flightPassengerList[i];
        const passenger = {
          lastName: p.surName,
          firstName: p.givenName,
          passCountry: p.nationality,
          passNumber: p.cardNo,
          birthDate: p.birthDay,
          gender: p.gender === 'male' ? 'M' : 'F',

          ageCategory: convertAgeCategory(p.travelerType),
        };
        passengers.push(passenger);
      }
      const gdsBookingReq = {
        segments,
        IPCC,
        passengers,
      };
      const recallRes = skuType === 'fsc' ? await this.ctx.curl(
        getRandomCacheMachine() + ':9001/booking',
        {
          method: 'POST',
          contentType: 'json',
          dataType: 'json',
          headers: {},
          data: gdsBookingReq,
          timeout: 150000, // 设置超时时间为 15 秒
        }
      ) : await this.service.switch.booking();
      if (
        recallRes.status === 200 &&
          recallRes.data &&
          recallRes.data.content &&
          recallRes.data.content.length > 0
      ) {
        pnr = recallRes.data.content[0].passengers;
      } else {
        helper.ResFormat(
          this.ctx,
          sessionid,
          false,
          'booking failed: Reservation failed'
        );
        this.service.trace.createTrace({
          traceType: 'log',
          dateTime: timeHelper.nowDateTime(),
          pageType: 'booking',
          api: 'booking',
          refer: referer,
          content: `request:${JSON.stringify(
            gdsBookingReq
          )},response:${JSON.stringify(recallRes && recallRes.data)}`,
        });
        return;
      }
      // 自动注册
      if (!userid) {
        userid = defaultUserName;
        const existUser = await this.service.user.existUser({
          email: contactInfo.email,
        });
        if (!existUser) {
          isExistUser = false;
          await this.service.user.register({
            email: contactInfo.email,
            userName: defaultUserName,
            // 创建16位随机密码
            password: helper.GUID(),
          });
        }
      }
      const orderInfo = await this.service.booking.createOrder(
        this.ctx.request,
        pnr,
        userid,
        recallRes.data.content[0].orderId
      );
      helper.ResFormat(this.ctx, sessionid, true, 'booking success', orderInfo);
      // 發送郵件
      await this.service.mail.toPayMail(
        contactInfo.contactName,
        contactInfo.email,
        orderInfo.orderInfo.orderId,
        isExistUser,
        userid
      );
    } else {
      helper.ResFormat(this.ctx, sessionid, false, 'booking falure', {});
    }
  }

  async booking() {
    const { ctx, service } = this;
    const { sessionid, userid } = ctx.request.header;
    const { skuType } = ctx.request.body;
    const referer = ctx.request.headers.referer;
    const params = { userid, referer, ...this.ctx.request.body };
    const reportCommon = {
      shoppingId: params.shoppingId,
      source: referer.includes('m.skywingtrip') ? 'h5' : 'online',
      locale: params.locale,
      currency: params.currency,
      language: params.language,
      mktportal: params.mktportal,
    };
    try {
      if (skuType === 'lcc') {
        const lcc = new LCC(this);
        const orderInfo = await lcc.process(params);
        helper.ResFormat(this.ctx, sessionid, true, 'booking success', orderInfo);
        service.trace.createReportTrace({
          pageType: 'book/book',
          type: skuType,
          data: {
            ...reportCommon,
            content: orderInfo.orderInfo.orderId,
          },
        });
        return;
      }
      const galileo = new Galileo(this);
      const orderInfo = await galileo.process(params);
      helper.ResFormat(this.ctx, sessionid, true, 'booking success', orderInfo);
      service.trace.createReportTrace({
        pageType: 'book/book',
        type: skuType,
        data: {
          ...reportCommon,
          content: orderInfo.orderInfo.orderId,
        },
      });
    } catch (e) {
      helper.ResFormat(this.ctx, sessionid, false, e.message || 'booking fail');
      service.trace.createReportTrace({
        pageType: 'book/book',
        type: skuType,
        data: {
          ...reportCommon,
        },
      });
    }
  }

  async orderPayment() {
    const { ctx, service } = this;
    const { contactName, email, orderId } = ctx.request.body;

    await service.mail.orderMail(contactName, email, orderId);
  }
}

module.exports = BookingApiController;
