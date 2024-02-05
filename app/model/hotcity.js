"use strict";

module.exports = (app) => {
  const mongoose = app.mongoose;

  const HotCitySchema = new mongoose.Schema({
    airport: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    cityCode: {
      type: String,
      trim: true,
    },
    cityName: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
  });

  return mongoose.model("HotCity", HotCitySchema, "hotcity");
};
