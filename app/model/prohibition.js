"use strict";

module.exports = (app) => {
  const mongoose = app.mongoose;

  const ProhibitionSchema = new mongoose.Schema({
   
    tripType: {
      type: String,
      trim: true,
    },
    depart: {
      type: String,
      trim: true,
    },
    departType: {
      type: String,
      trim: true,
    },
    arrival: {
      type: String,
      trim: true,
    },
    arrivalType: {
      type: String,
      trim: true,
    },
    cabinType: {
      type: String,
      trim: true,
    },
     /** 可售航司集合，使用,分割 */
     vendibilityCompanies: {
      type: String,
      trim: true,
    },
    IPCC: {
      type: String,
      trim: true,
    },
    isProhibition: {
      type: Boolean,
      default: true,
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

  return mongoose.model("Prohibition", ProhibitionSchema, "prohibition");
};
