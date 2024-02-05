"use strict";

module.exports = (app) => {
  const mongoose = app.mongoose;

  const RevenueSchema = new mongoose.Schema({
    
    revenueId: {
      type: String,
      trim: true,
    },
    /** 廉航 LCC ; 全服务 FSC  */
    carrierType: {
      type: String,
      trim: true,
    },
    /** 供应商ID  */
    supplierId: {
      type: String,
      trim: true,
    },
    /** 匹配航线集合的键值 */
    IPCC: {
      type: String,
      trim: true,
    },
    /** 一口价 fixed ; 比例 percent  */
    revenueType: {
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
  });

  return mongoose.model("Revenue", RevenueSchema, "revenue");
};
