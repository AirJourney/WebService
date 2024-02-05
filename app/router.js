'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;
  router.get('/', controller.home.index);
  router.post('/test', controller.home.test);
  router.post('/demo', controller.home.demo);

  router.post('/website/hotcity', controller.info.getHotCity);
  router.post('/website/profit', controller.info.getProfit);

  /*
   * 网站服务支持
   */
  router.post('/website/isUserExist', controller.user.isUserExist);
  router.post('/website/register', controller.user.register);
  router.post('/website/login', controller.user.login);
  router.post('/website/forgot', controller.user.forgot);
  router.post('/website/updatepwd', controller.user.updatePassword);
  router.post('/website/resetpwd', controller.user.resetPassword);
  router.post('/website/verify', controller.user.verify);

  /** 获取验证码 */
  router.get('/website/getcaptcha', controller.captcha.index);
  router.post('/website/verifycaptcha', controller.captcha.verify);

  /** 手机短信 */
  router.post('/website/smssend', controller.sms.sendCode);

  /** 首页推荐航班 */
  router.post('/website/recommend', controller.shopping.recommend);

  /** 外部链接进入后的跳转处理 Kayak查询*/
  router.post('/website/transfer', controller.transfer.getJumpUrl);

  /** Wego查询 */
  router.post('/website/wegosearch', controller.external.wegoSearch);

  /** 记录日志 */
  router.post('/website/log', controller.log.createLog);

  /** 外部链接进入后的日志ß */
  router.post('/website/deeplinktrace', controller.external.externalTrace);
  /** 列表页 航班商品信息 */
  // router.post('/website/shopping', controller.shopping.getFlight);
  // router.post('/website/shopping', controller.switch.concurrent);
  router.post('/website/shopping', controller.flightNew.getFlights);
  /** 填写页、详情页 航班商品信息 */
  router.post('/website/shoppingdetail', controller.shopping.getShopping);
  // router.post('/website/generateshopping', controller.flight.generateFlightInfo);
  router.post('/website/generateshopping', controller.flightNew.getFlight);
  /** 填写页 验舱验价 */
  router.post('/website/check', controller.switch.check);
  /** 刷新缓存 */
  router.post('/website/refreshcache', controller.flight.refreshFlightCache);
  /** 填写页变更价格（更加乘机人、优惠券等） */
  router.post('/website/changeprice', controller.shopping.changePrice);
  /** 填写页汇率变更 */
  router.post('/website/changecurrency', controller.shopping.changeCurrency);
  /** 填写页 创单 */
  router.post('/website/booking', controller.booking.creatOrder);
  /** 填写页 订单支付完成后 修改订单状态及发送邮件 */
  router.post('/website/afterbooking', controller.booking.orderPayment);
  /** 订单列表 */
  router.post('/website/orderlist', controller.order.getList);
  /** 订单详情 */
  router.post('/website/orderdetail', controller.order.getDetail);
  /** 网站订单退票、改签、取消 */
  router.post('/website/orderchange', controller.order.changeOrder);
  /** 行李额相关 */
  router.post('/website/getBaggageInfo', controller.baggage.getBaggageInfo);
  router.post('/support/getBaggageList', controller.baggage.getBaggageList);
  router.post('/support/addBaggage', controller.baggage.addBaggageInfo);
  router.post('/support/updateBaggage', controller.baggage.updateBaggageInfo);
  router.post('/support/deleteBaggage', controller.baggage.deleteBaggageInfo);

  /** 支付相关 {*/
  // enets支付渠道接口
  router.post('/website/payment', controller.payment.createPayment);
  router.post('/website/payment/b2sTxnEnd', controller.payment.getB2SResult);
  router.post('/website/payment/s2sTxnEnd', controller.payment.getS2SResult);
  // paypal支付渠道接口
  router.post(
    '/website/payment/paypal/create',
    controller.payment.createPaypalPayment
  );
  router.post(
    '/website/payment/paypal/check',
    controller.payment.getPaypalResult
  );
  // huipay支付渠道接口
  router.post(
    '/website/payment/huipay/create',
    controller.payment.createHuiPayment
  );
  router.post(
    '/website/payment/huipay/check',
    controller.payment.getHuiPayResult
  );
  // allpayx支付渠道接口
  router.post(
    '/website/payment/allpayx/create',
    controller.payment.createAllpayxPayment
  );
  router.get(
    '/website/payment/allpayx/check',
    controller.payment.getAllpayxResult
  );
  router.post(
    '/website/payment/allpayx/check',
    controller.payment.postAllpayxResult
  );
  // 获取订单当前的支付信息
  router.post(
    '/website/payment/order_status_check',
    controller.payment.getPayOrderStatus
  );
  /** 支付相关 }*/

  /*
   * 后台系统支持
   */

  /** 后台登录 */
  router.post('/support/login', controller.staff.login);
  /** 后台创建账号 */
  router.post('/support/createaccount', controller.staff.createAccount);

  /** 后台创建热门城市 */
  router.get('/support/createhotcity', controller.info.createHotCity);
  router.post('/support/createconfig', controller.info.createConfig);
  /** 后台获取热门城市 */
  router.post('/support/gethotline', controller.profit.getHotLine);
  /** 后台创建扣率 */
  router.post('/support/createprofit', controller.profit.createProfit);
  /** 后台获取航线扣率列表 */
  router.post('/support/getflightprofit', controller.profit.getFlightProfit);
  /** 后台更新扣率 */
  router.post('/support/updateprofit', controller.profit.updateProfit);
  /** 后台获取订单列表（支持订单状态筛选） */
  router.post('/support/orderlist', controller.order.getAllList);
  router.post('/support/updateticket', controller.order.updateOrderTicket);

  /** 后台获取订单详情 */
  router.post('/support/orderdetail', controller.order.getMailOrderInfo);
  router.post('/website/orderupdate', controller.order.update);
  router.post('/website/orderrefund', controller.order.refund);

  /** 后台获取操作日志 */
  router.post('/support/offlog', controller.log.getOffLog);

  router.post('/support/creatregion', controller.region.createRegion);

  /** 外部网页DeepLink */
  router.post('/link/flightlist', controller.link.getFlightList); // 航线报价

  router.post('/mail/orderchange', controller.mail.orderChange); // 订单状态变更邮件

  router.post('/website/switch', controller.switch.concurrent); // 并发请求

  /** External Request */
  router.post('/website/switch/check', controller.switch.check); // 多路验舱验价
  // router.post('/website/switch/booking', controller.switch.booking); // 多路创单
  router.post('/website/switch/ticket', controller.switch.ticket); // 多路通知出票

  /** POI */
  router.post('/support/createpoi', controller.poi.createPoi);
  router.post('/support/getpoi', controller.poi.getPoi);

  /**  */
  router.post('/experimental/getFlights', controller.flightNew.getFlights);
  router.post('/experimental/getFlight', controller.flightNew.getFlight);
  router.post('/experimental/booking', controller.booking.booking);
  router.post('/experimental/addonBaggage', controller.baggage.addonBaggageList);
  router.post('/support/decodesku', controller.link.decodeSku); // 解析sku

  /** 外部站点接口集合 */
  router.post('/api/salelist/export', controller.sale.exportSaleFight); // 外部站点实时取售卖航线列表
};
