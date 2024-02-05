'use strict';

const Service = require('egg').Service;
const moment = require('moment');
const crypto = require('crypto');
const helper = require('../extend/helper');
const paypal = require('@paypal/checkout-server-sdk');
const Huipay = require('../../libs/huipay/unionpay.js');
const Allpayx = require('../../libs/allpayx/allpayx.js');
const path = require('path');

class PaymentService extends Service {

  async getOrderInfo(orderId) {
    // 订单Id和此次支付绑定
    if (!orderId) {
      return { code: 500, msg: 'Missing order ID' };
    }

    // 获取订单金额，传入txnAmount中
    const order = await this.ctx.model.Booking.findOne({
      orderId,
    });
    if (!order) return { code: 500, msg: 'Invalid order id, please try again' };

    const priceInfo = await this.ctx.model.Price.findOne({
      shoppingId: order.shoppingId,
    });

    if (!priceInfo || !priceInfo.totalPrice) return { code: 500, msg: 'Invalid order id, please try again' };

    // 获取支付货币
    const { currency, huiPayQrCode, status, IPCC, group } = order;
    // const currencyCode = "SGD"
    // 获取支付价格
    const txnAmount = priceInfo.totalPrice;

    return {
      code: 200,
      currencyCode: currency,
      huiPayQrCode,
      txnAmount,
      IPCC,
      group,
      status,
    };
  }

  async createPayment(payload) {
    const secretKey = this.app.config.website.secretKey;
    const merchantTxnDtm = moment().format('YYYYMMDD hh:mm:ss.SSS');
    const merchantTxnRef = payload.orderId;

    const orderInfo = await this.getOrderInfo(merchantTxnRef);

    const { currencyCode, txnAmount } = orderInfo;

    const texRequest = {
      ss: '1',
      msg: {
        b2sTxnEndURL: this.app.config.website.b2sTxnEndURL,
        b2sTxnEndURLParam: '',
        clientType: 'W',
        currencyCode,
        ipAddress: '127.0.0.1',
        language: 'en',
        merchantTimeZone: '+8:00',
        merchantTxnRef: merchantTxnRef + helper.GUID().substring(0, 3),
        merchantTxnDtm,
        netsMid: 'UMID_828461002',
        netsMidIndicator: 'U',
        paymentMode: '',
        paymentType: 'SALE',
        s2sTxnEndURL: this.app.config.website.s2sTxnEndURL,
        s2sTxnEndURLParam: '',
        submissionMode: 'B',
        supMsg: '',
        tid: '',
        txnAmount: (txnAmount * 100).toString(),
      },
    };
    const hmac = crypto
      .createHash('sha256')
      .update(JSON.stringify(texRequest) + secretKey)
      .digest('base64');
    return {
      texRequest,
      hmac,
    };
  }

  async getPaymentResult(payload, source) {
    const secretKey = this.app.config.website.secretKey;
    // s2s的payload是字符串
    if (source === 's2s') {
      const { hmac } = this.ctx.request.header;
      payload = {
        message: payload,
        hmac,
      };
    }

    // logger
    this.ctx.logger.info(`[payload]: ${JSON.stringify(payload)}`);
    const paymentMessage = source === 's2s' ? JSON.stringify(payload.message) : decodeURIComponent(payload.message.replace(/\+/g, '%20'));

    // 获取hmac
    const generatedHmac = crypto
      .createHash('sha256')
      .update(paymentMessage + secretKey)
      .digest('base64');

    // 校验请求
    if (payload.hmac === generatedHmac) {
      // 获取支付状态
      const paymentParse = JSON.parse(paymentMessage).msg;
      const { netsTxnStatus, netsTxnMsg, stageRespCode, netsTxnRef } = paymentParse;
      // 订单号
      const merchantTxnRef = paymentParse.merchantTxnRef.substring(0, 17);
      if (!merchantTxnRef) {
        return { status: 500, msg: 'Invalid order id, please try again' };
      }
      this.ctx.logger.info(`[payload merchantTxnRef]: ${merchantTxnRef}`);
      // 支付成功
      if (netsTxnStatus === '0') {
        // 更改订单支付情况
        await this.updateOrderInfo(merchantTxnRef, netsTxnRef, 'eNETS');
        return { status: 200, msg: `OrderID [${merchantTxnRef}]: Payment succeeded` };
      }
      return { status: 500, msg: `OrderID [${merchantTxnRef}]: [${stageRespCode}] ${netsTxnMsg}` };

    }
    return { status: 500, msg: 'Failed verification' };

  }

  // merchantTxnRef 订单id  netsTxnRef 交易id
  async updateOrderInfo(merchantTxnRef, netsTxnRef, payChannel, sendMail) {
    const { ctx } = this;

    await ctx.model.Booking.findOneAndUpdate(
      {
        orderId: merchantTxnRef,
        status: 99,
      },
      {
        $set: {
          txnTime: new Date().getTime(),
          payChannel,
          netsTxnRef,
          status: 0,
        },
      }
    );
    const orderInfo = await ctx.model.Booking.find({
      orderId: merchantTxnRef,
    });
    if (orderInfo.length === 0 || orderInfo.length > 1) {
      return;
    }
    const { group, IPCC } = orderInfo[0];
    // 自动出票逻辑
    await this.service.switch.ticket({
      orderId: merchantTxnRef,
      group,
      IPCC,
    });
    if (sendMail) {
      const contactInfo = await ctx.model.Contact.findOne({ contactId: orderInfo[0].contactId });
      const userInfo = await ctx.model.User.findOne({ email: orderInfo[0].userId });
      this.service.mail.orderMail(contactInfo.contactName, orderInfo[0].userId, merchantTxnRef, userInfo.userId);
    }
  }

  // paypal创建订单
  async createPaypalPayment(payload) {
    const { orderId } = payload;
    const orderInfo = await this.getOrderInfo(orderId);
    const { currencyCode, txnAmount } = orderInfo;
    return {
      currencyCode,
      txnAmount,
    };
  }

  // paypal支付校验
  async getPaypalResult(payload) {

    console.log(payload);

    const { paymentId, orderId } = payload;

    const { mode, client_id, client_secret } = this.app.config.website.paypal;

    let environment = new paypal.core.SandboxEnvironment(client_id, client_secret);
    if (mode === 'live') {
      environment = new paypal.core.LiveEnvironment(client_id, client_secret);
    }

    // 向paypal发送获取订单支付详情的请求
    const request = new paypal.orders.OrdersGetRequest(paymentId);
    const response = await new paypal.core.PayPalHttpClient(environment).execute(request);

    console.log(response);

    if (response.statusCode === 200) {
      // 获取支付状态
      const { status, purchase_units } = response.result;
      // 支付完成
      if (status === 'COMPLETED') {
        // 校验支付金额
        const orderInfo = await this.getOrderInfo(orderId);
        const { txnAmount } = orderInfo;
        // todo 汇率转换
        // 如果实际付款金额和数据库中的一致，校验通过
        if (purchase_units[0].amount.value === txnAmount) {
          // 订单支付标记为完成
          await this.updateOrderInfo(orderId, paymentId, 'paypal');
          return { status: 200, msg: `OrderID [${orderId}]: Payment succeeded` };
        }
        return { status: 500, msg: 'Abnormal payment amount, please contact customer service for processing' };

      }
      return { status: 500, msg: 'Payment not completed, please make a new payment' };

    }
    return { status: 500, msg: 'Payment not completed, please make a new payment' };

  }

  initHuipay() {
    // init unionpay
    const pfx = path.resolve(__dirname, '../../cer/huipay_pri.pfx');
    const cer = path.resolve(__dirname, '../../cer/MANDAO_861505273897_pub.cer');
    // const pfx = path.resolve(__dirname, '../../cer/814000473149_pri.pfx')
    // const cer = path.resolve(__dirname, '../../cer/MANDAO_814000473149_pub.cer')
    const { sandbox, merID, certificationPassword } = this.app.config.website.huipay;
    const huipay = new Huipay({
      sandbox,
      merID,
      certificationPassword,
      certification: pfx,
      unionpayRootCA: cer,
      ctx: this.ctx,
    });
    return huipay;
  }

  async createHuiPayment(payload) {
    const { orderId } = payload;
    const { s2sTxnEndURL, b2sTxnEndURL } = this.app.config.website.huipay;
    const orderInfo = await this.getOrderInfo(orderId);
    const { huiPayQrCode, txnAmount } = orderInfo;

    if (huiPayQrCode) {
      return { status: 200, data: { url: huiPayQrCode } };
    }

    const memo = {
      spbillCreateIp: '123.12.12.123',
      longitude: '171.21',
      latitude: '22.33',
    };

    try {
      const huipay = this.initHuipay();
      const { redirect, msg } = await huipay.createWebOrder({
        orderNum: orderId,
        transTime: new Date().getTime(),
        orderAmount: (txnAmount * 100).toString(),
        frontURL: b2sTxnEndURL + `?res=OrderID [${orderId}]: Payment succeeded`,
        backURL: s2sTxnEndURL,
        goodsInfo: 'plane ticket',
        memo,
      });
      if (redirect) {
        await this.updateOrderQrCodeInfo(orderId, redirect, 'huiPay');
        return { status: 200, data: { url: redirect } };
      }
      return { status: 500, msg: '支付下单失败: ' + msg };

    } catch (error) {
      return { status: 500, msg: '支付下单失败:' + error.message };
    }
  }

  // 慧收钱支付校验
  async getHuiPayResult(body) {
    const unionpay = this.initHuipay();
    const { method, version, format, merchantNo, signType, signContent, sign } = body;
    const verified = unionpay.getCallbackVerify({
      method,
      version,
      format,
      merchantNo,
      signType,
      signContent,
      sign,
    });
    const content = JSON.parse(body.signContent.replace(/\\/g, '').replace(/"\{/g, '{').replace(/\}"/g, '}'));
    this.ctx.logger.info(`[慧收钱支付日志] 订单号${content.transNo} 交易号${content.tradeNo}`);
    this.ctx.logger.info(`[慧收钱支付日志] 订单号${content.transNo}回调验证${verified ? '通过' : '失败'}`);
    if (verified && content.orderStatus === 'SUCCESS') {
      // 订单支付标记为完成
      await this.updateOrderInfo(content.transNo, content.tradeNo, 'huiPay', true);
      return { status: 200, msg: `OrderID [${content.transNo}]: Payment succeeded` };
    }
    return { status: 500, msg: `Payment OrderID [${content.transNo}]: not verified, please make a new payment` };

  }

  // 慧收钱存储订单二维码支付链接
  async updateOrderQrCodeInfo(merchantTxnRef, huiPayQrCode, payChannel) {
    const { ctx } = this;

    await ctx.model.Booking.findOneAndUpdate(
      {
        orderId: merchantTxnRef,
      },
      {
        $set: {
          huiPayQrCode,
          payChannel,
        },
      }
    );
  }

  // 获取订单信息
  async getPayOrderStatus(payload) {
    const { orderId } = payload;
    const orderInfo = await this.getOrderInfo(orderId);
    return orderInfo;
  }

  // Allpayx支付
  async createAllpayxPayment(payload) {
    const { sandbox, s2sTxnEndURL, merID, key } = this.app.config.website.allpayx;
    const { orderId } = payload;
    const orderInfo = await this.getOrderInfo(orderId);
    const { currencyCode, txnAmount } = orderInfo;
    // mock
    // txnAmount = 1
    // const currencyCode = 'CNY'
    try {
      // 下单时间是非常重要的参数，请保存至数据库，不然隔天查不到订单信息
      const unionpay = new Allpayx(sandbox, merID, key);
      const { redirect } = await unionpay.createWebOrder({
        // required:string 商户订单号
        orderNum: orderId,
        // required:Date 下单时间
        transTime: new Date().getTime(),
        orderAmount: txnAmount.toString(),
        orderCurrency: currencyCode,
        // required:string 前端付款完成后跳转页面
        frontURL: s2sTxnEndURL,
        backURL: s2sTxnEndURL,
        // ...以及其它任何官方字段
        logisticsStreet: 'test123',
        userIP: '127.0.0.1',
        userID: 'test123',
        goodsInfo: 'plane ticket',
        detailInfo: 'W3siZ29vZHNfbmFtZSI6ImlQaG9uZSBYIiwicXVhbnRpdHkiOiIyIn0seyJnb29kc19uYW1lIjoiaVBob25lIDgiLCJxdWFudGl0eSI6IjQifV0=',
        merReserve: 'skywingtrip',
      });
      // redirect 为银联付款网页链接
      if (redirect) {
        return { status: 200, data: { url: redirect } };
      }
      return { status: 500, msg: '支付下单失败' };

    } catch (error) {
      return { status: 500, msg: '支付下单失败:' + error.message };
    }
  }

  // Allpayx支付校验
  async getAllpayxResult(body, sendMail = true) {
    const { sandbox, merID, key } = this.app.config.website.allpayx;
    const unionpay = new Allpayx(sandbox, merID, key);
    const verified = unionpay.getResponseVerify(body);
    this.ctx.logger.info(`[Allpayx支付日志] 订单号${body.orderNum} 交易号${body.transID}`);
    this.ctx.logger.info(`[Allpayx支付日志] 订单号${body.orderNum}回调验证${verified ? '通过' : '失败'}`);
    try {
      if (verified && body.respCode === '00' && body.respMsg === 'success') {
        // 订单支付标记为完成
        await this.updateOrderInfo(body.orderNum, body.transID, 'allpayx', sendMail);
        this.service.trace.createReportTrace({
          pageType: 'payment/validAllpayx',
          type: '',
          data: {
            shoppingId: body.orderNum,
            content: 'true',
          },
        });
        return { status: 200, msg: `OrderID [${body.orderNum}]: Payment succeeded` };
      }
      this.service.trace.createReportTrace({
        pageType: 'payment/validAllpayx',
        type: '',
        data: {
          shoppingId: body.orderNum,
          content: 'false',
        },
      });
      return { status: 500, msg: `Payment not verified, please make a new payment,detail: ${JSON.stringify(body)}` };
    } catch (e) {
      this.service.trace.createReportTrace({
        pageType: 'payment/validAllpayx',
        type: '',
        data: {
          shoppingId: body.orderNum,
          content: 'false',
        },
      });
      this.service.trace.createTrace({
        traceType: 'log',
        dateTime: helper.nowDateTime(),
        pageType: 'payment',
        api: 'controller/payment/allpayx',
        refer: '',
        content: `request:${JSON.stringify(body)},response:${JSON.stringify(e.message)}`,
      });
    }
  }
}

module.exports = PaymentService;
