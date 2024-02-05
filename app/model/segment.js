"use strict";

module.exports = (app) => {
  const mongoose = app.mongoose;

  const SegmentSchema = new mongoose.Schema({
    segmentId: {
      type: String,
      trim: true,
    },
    flightId: {
      type: String,
      trim: true,
    },
    shoppingId:{
      type: String,
      trim:true 
    },
    aDateTime: {
      type: String,
      trim: true,
    },
    dDateTime: {
      type: String,
      trim: true,
    },
    dCityInfo: {
      type: String,
      trim: true,
    },
    aCityInfo: {
      type: String,
      trim: true,
    },
    dPortInfo: {
      type: String,
      trim: true,
    },
    aPortInfo: {
      type: String,
      trim: true,
    },
    acrossDays: {
      type: Number,
    },
    airlineInfo: {
      type: String,
      trim: true,
    },
    craftInfo: {
      type: String,
      trim: true,
    },
    cabinClass: {
      type: String,
      trim: true,
    },
    subClass: {
      type: String,
      trim: true,
    },
    durationInfo: {
      type: String,
      trim: true,
    },
    transferDurationInfo: {
      type: String,
      trim: true,
    },
    flightNo: {
      type: String,
      trim: true,
    },
    segmentNo: {
      type: Number,
    },
    fareBasisCode: {
      type: String,
      trim: true,
    },
    IPCC: {
      type: String,
      trim: true,
    },
  });

  return mongoose.model("Segment", SegmentSchema, "segment");
};
