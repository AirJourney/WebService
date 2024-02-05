"use strict";

module.exports = (app) => {
  const mongoose = app.mongoose;

  const ExternalSchema = new mongoose.Schema({
    mktportal: {
      type: String,
      trim: true,
    },
    locale: {
      type: String,
      trim: true,
    },
    landingPage: {
      type: String,
      trim: true,
    },
    currency: {
      type: String,
      trim: true,
    },
    campaign: {
      type: String,
      trim: true,
    },
    tripType: {
      type: String,
      trim: true,
    },
    cabinType: {
      type: String,
      trim: true,
    },
    departCity: {
      type: String,
      trim: true,
    },
    arriveCity: {
      type: String,
      trim: true,
    },
    departTime: {
      type: String,
      trim: true,
    },
    returnTime: {
      type: String,
      trim: true,
    },
    adult: {
      type: String,
      trim: true,
    },
    children: {
      type: String,
      trim: true,
    },
    infant: {
      type: String,
      trim: true,
    },
  });

  return mongoose.model("External", ExternalSchema, "external");
};
