'use strict';

module.exports = app => {
  const mongoose = app.mongoose;

  const PoiSchema = new mongoose.Schema({
    poiId: {
      type: String,
      trim: true,
    },
    airportcode: {
      type: String,
      trim: true,
    },
    airportname: {
      type: String,
      trim: true,
    },
    citycode: {
      type: String,
      trim: true,
    },
    cityname: {
      type: String,
      trim: true,
    },
    countrycode: {
      type: String,
      trim: true,
    },
    countryname: {
      type: String,
      trim: true,
    },
  });

  return mongoose.model('Poi', PoiSchema, 'poi');
};
