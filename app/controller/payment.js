'use strict';
const Controller = require('egg').Controller;
const timeHelper = require('../extend/time');

class PaymentController extends Controller {
  async createPayment() {
    const paymentData = await this.service.payment.createPayment(
      this.ctx.request.body
    );
    this.ctx.body = paymentData;
  }
  async getB2SResult() {
    const paymentResult = await this.service.payment.getPaymentResult(
      this.ctx.request.body,
      'b2s'
    );
    this.redirectWebsiteByResult(paymentResult);
  }
  async getS2SResult() {
    const paymentResult = await this.service.payment.getPaymentResult(
      this.ctx.request.body,
      's2s'
    );
    this.ctx.body = paymentResult;
  }

  // paypal创建支付订单
  async createPaypalPayment() {
    const paymentData = await this.service.payment.createPaypalPayment(
      this.ctx.request.body
    );
    this.ctx.body = paymentData;
  }

  // paypal支付结果校验
  async getPaypalResult() {
    const paymentResult = await this.service.payment.getPaypalResult(
      this.ctx.request.body
    );
    this.ctx.body = paymentResult;
  }

  // HuiPay创建支付订单
  async createHuiPayment() {
    const paymentData = await this.service.payment.createHuiPayment(
      this.ctx.request.body
    );
    this.service.trace.createReportTrace({
      pageType: 'payment/createHuiPay',
      type: '',
      data: {
        shoppingId: this.ctx.request.body.orderId,
      },
    });
    const referer = this.ctx.request.headers.referer;
    if (paymentData.status !== 200) {
      this.service.trace.createTrace({
        traceType: 'log',
        dateTime: timeHelper.nowDateTime(),
        pageType: 'payment',
        api: 'controller/createHuiPayment',
        refer: referer,
        content: `request:${JSON.stringify(this.ctx.request.body)},response:${JSON.stringify(paymentData)}`,
      });
    }
    this.ctx.body = paymentData;
  }

  // HuiPay支付结果校验
  async getHuiPayResult() {
    const paymentResult = await this.service.payment.getHuiPayResult(
      this.ctx.request.body
    );
    this.redirectWebsiteByResult(paymentResult);
  }

  async getPayOrderStatus() {
    const paymentResult = await this.service.payment.getPayOrderStatus(
      this.ctx.request.body
    );
    this.ctx.body = paymentResult;
  }

  // allpayx创建支付订单
  async createAllpayxPayment() {
    const referer = this.ctx.request.headers.referer;
    const paymentData = await this.service.payment.createAllpayxPayment(
      this.ctx.request.body
    );
    this.service.trace.createReportTrace({
      pageType: 'payment/createAllpayx',
      type: '',
      data: {
        shoppingId: this.ctx.request.body.orderId,
      },
    });
    if (paymentData.status !== 200) {
      this.service.trace.createTrace({
        traceType: 'log',
        dateTime: timeHelper.nowDateTime(),
        pageType: 'payment',
        api: 'controller/payment/allpayx',
        refer: referer,
        content: `request:${JSON.stringify(this.ctx.request.body)},response:${JSON.stringify(paymentData)}`,
      });
    }
    this.ctx.body = paymentData;
  }

  // allpayx支付结果校验
  async getAllpayxResult() {
    const paymentResult = await this.service.payment.getAllpayxResult(
      this.ctx.query
    );
    this.redirectWebsiteByResult(paymentResult);
  }

  // allpayx支付结果校验
  async postAllpayxResult() {
    const paymentResult = await this.service.payment.getAllpayxResult(
      this.ctx.request.body, false
    );
    if (paymentResult) {
      this.ctx.status = 200;
      this.ctx.body = 'OK';
    } else {
      this.ctx.status = 500;
      this.ctx.body = JSON.stringify(paymentResult);
    }

  }

  // 接受到订单状态后，重定向到支付结果页
  async redirectWebsiteByResult(paymentResult) {
    if (paymentResult.status === 200) {
      this.ctx.unsafeRedirect(
        this.app.config.website.successURL + '?res=' + paymentResult.msg
      );
    } else {
      this.ctx.unsafeRedirect(
        this.app.config.website.failURL + '?res=' + paymentResult.msg
      );
    }
  }
}

module.exports = PaymentController;
