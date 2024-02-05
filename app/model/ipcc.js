"use strict";

module.exports = (app) => {
  const mongoose = app.mongoose;

  const IPCCSchema = new mongoose.Schema({
    IPCCId: {
      type: String,
      trim: true,
    },
    IPCCType: {
      type: String,
      trim: true,
    },
    GDS: {
      type: String,
      trim: true,
    },
    GDSBooking: {
      type: String,
      trim: true,
    },
    IPCC: {
      type: String,
      trim: true,
    },
    shoppingApi: {
      type: String,
      trim: true,
    },
    checkApi: {
      type: String,
      trim: true,
    },
    bookingApi: {
      type: String,
      trim: true,
    },
    ticketApi: {
      type: String,
      trim: true,
    },
    startDays: {
      type: Number,
      default: 1,
    },
    endDays: {
      type: Number,
      default: 1,
    },
    isValid: {
      type: Boolean,
      default: true,
    },
    group:{
      type: String,
      trim: true,
    }
  });

  return mongoose.model("IPCC", IPCCSchema, "ipcc");
};
