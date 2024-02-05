'use strict';

module.exports = app => {
  const mongoose = app.mongoose;

  const ProfitSchema = new mongoose.Schema({
    flightType: {
      type: String,
      trim: true,
    },
    segment: {
      type: String,
      trim: true,
    },
    number: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    cabin: {
      type: String,
      trim: true,
    },
    dateStart: {
      type: String,
      trim: true,
    },
    dateEnd: {
      type: String,
      trim: true,
    },
    /** 中转航班 */
    transit: {
      type: String,
      trim: true,
    },
    /** 一口价 fixed ; 扣率 percent  */
    profitType: {
      type: String,
      trim: true,
    },
    fixedPrice: {
      type: Number,
    },
    fixedTax: {
      type: Number,
    },
    percent: {
      type: Number,
    },
    trim: {
      type: Number,
    },
    isValid: {
      type: Boolean,
      default: true,
    },
    group: {
      type: String,
      trim: true,
    },
    travelRange: [
      {
        travelStart: String,
        travelEnd: String,
      },
    ],
  });

  return mongoose.model('Profit', ProfitSchema, 'profit');
};
