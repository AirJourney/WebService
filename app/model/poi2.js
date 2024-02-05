'use strict';

module.exports = app => {
  const mongoose = app.mongoose;

  const Poi2Schema = new mongoose.Schema({
    airportcode: {
      type: String,
      trim: true,
    },
    citycode: {
      type: String,
      trim: true,
    },
    countrycode: {
      type: String,
      trim: true,
    },
    en: {
      airportname: {
        type: String,
        trim: true,
      },
      cityname: {
        type: String,
        trim: true,
      },
      countryname: {
        type: String,
        trim: true,
      },
    },
    tc: {
      airportname: {
        type: String,
        trim: true,
      },
      cityname: {
        type: String,
        trim: true,
      },
      countryname: {
        type: String,
        trim: true,
      },
    },
    cn: {
      airportname: {
        type: String,
        trim: true,
      },
      cityname: {
        type: String,
        trim: true,
      },
      countryname: {
        type: String,
        trim: true,
      },
    },
  });

  return mongoose.model('Poi2', Poi2Schema, 'poi2');
};
