'use strict';

module.exports = app => {
  const mongoose = app.mongoose;

  const TraceSchema = new mongoose.Schema({
    traceType: {
      type: String,
      trim: true,
    },
    dateTime: {
      type: String,
      trim: true,
    },
    pageType: {
      type: String,
      trim: true,
    },
    api: {
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
  });

  return mongoose.model('Trace', TraceSchema, 'trace');
};
