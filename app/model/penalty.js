"use strict";

module.exports = (app) => {
  const mongoose = app.mongoose;

  const PenaltySchema = new mongoose.Schema({
    /**bothNever/both/onlyRefund/onlyChange */
    penaltyType: {
      type: String,
      trim: true,
    },
    refundBeforePercentFWT: {
      type: Number,
    },
    refundAfterPercentFWT: {
      type: Number,
    },
    changeBeforePercentFWT: {
      type: Number,
    },
    changeAfterPercentFWT: {
      type: Number,
    },
    refundBeforePercentBWT: {
      type: Number,
    },
    refundAfterPercentBWT: {
      type: Number,
    },
    changeBeforePercentBWT: {
      type: Number,
    },
    changeAfterPercentBWT: {
      type: Number,
    },
    /**
     * 该航段未使用时，退票所需的金额为往返总票面价的百分比
     */
    abandonRTPercent: {
      type: Number,
    },
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
    isValid: {
      type: Boolean,
      default: true,
    },
    group: {
      type: String,
      trim: true,
    },
  });

  return mongoose.model("Penalty", PenaltySchema, "penalty");
};
