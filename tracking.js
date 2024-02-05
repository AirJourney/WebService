'use strict';
// common
const common = {
  trip: { // optional 有shoppingId的时候不需要
    type: '', // OW/RT
    from: '', // SHA
    to: '', // TPE
    departTime: '', // 2019-01-01
    returnTime: '', // 2019-01-01
    passenger: {
      adult: 1,
      children: 0,
      infant: 0,
    },
    cls: '', // E/B
  },
  source: '', // online/h5
  currency: '', // CNY/USD
  language: '', // tc/cn/en
  locale: '', // TW/CN
  mktportal: '', // customer/sc
  pageType: '', // 各个实例定义
  type: '', // lcc/fsc
};
/**
 * 列表页 区分 lcc fsc
 */
const example1 = {
  ...common,
  pageType: 'list',
  content: 0, //
};

/**
 * 填写页 区分 lcc fsc
 */
const example2 = {
  ...common,
  shoppingId: '',
  pageType: 'book',
  content: '', // 空
};

/**
 * 支付页 区分 lcc fsc
 */
const example3 = {
  ...common,
  shoppingId: '',
  pageType: 'payment',
  content: '', // 空
};

/**
 * 落地页 区分 lcc fsc
 */
const example4 = {
  ...common,
  shoppingId: '',
  pageType: 'landing',
  content: '', // 放置orderId
};
