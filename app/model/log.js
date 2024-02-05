"use strict";

module.exports = (app) => {
  const mongoose = app.mongoose;

  const LogSchema = new mongoose.Schema({
    logType: {
      type: String,
      trim: true,
    },
    pageType: {
      type: String,
      trim: true,
    },
    url: {
      type: String,
      trim: true,
    },
    refer: {
      type: String,
      trim: true,
    },
    content: {
      type: String,
      trim: true,
    },
    createDateTime:{
      type: String,
      trim: true,
    },
  });

  return mongoose.model("Log", LogSchema, "log");
};
