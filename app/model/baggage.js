'use strict';

module.exports = app => {
  const mongoose = app.mongoose;

  const BaggageSchema = new mongoose.Schema({
    // 航司
    company: String,
    // 航班号
    flightNo: Array,
    // 行程类型
    flightType: String,
    // 航段
    from: String,
    to: String,
    // 舱位
    cabin: Array,
    // 政策的时间类型
    type: Number,
    // 政策开始时间
    dateStart: String,
    // 政策结束时间
    dateEnd: String,
    IPCC: String,
    group: String,
    // 成人行李额
    adult: {
      carry: {
        piece: Number,
        weight: Number,
        limit: String,
      },
      hand: {
        piece: Number,
        weight: Number,
        limit: String,
      },
    },
    // 儿童行李额
    child: {
      carry: {
        piece: Number,
        weight: Number,
        limit: String,
      },
      hand: {
        piece: Number,
        weight: Number,
        limit: String,
      },
    },
    // 婴儿行李额
    infant: {
      carry: {
        piece: Number,
        weight: Number,
        limit: String,
      },
      hand: {
        piece: Number,
        weight: Number,
        limit: String,
      },
    },
    // 是否启用
    enable: Boolean,
  });

  return mongoose.model('Baggage', BaggageSchema, 'baggage');
};
