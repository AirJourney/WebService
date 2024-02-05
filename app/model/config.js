"use strict";

module.exports = (app) => {
  const mongoose = app.mongoose;

  const ConfigSchema = new mongoose.Schema({
    key: {
      type: String,
      trim: true,
    },
    value: {
      type: String,
      trim: true,
    },
    // 是否有效
    isValid: {
      type: Boolean,
    },
  });

  return mongoose.model("Config", ConfigSchema, "config");
};
