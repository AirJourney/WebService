'use strict';

module.exports = app => {
  const mongoose = app.mongoose;
  const ReportSchema = new mongoose.Schema({
    pageType: {
      type: String,
      trim: true,
    },
    trip: {
      type: {
        type: String,
        trim: true,
      },
      depart: {
        type: String,
        trim: true,
      },
      arrive: {
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
      cls: {
        type: String,
        trim: true,
      },
      passenger: {
        adult: {
          type: Number,
        },
        child: {
          type: Number,
        },
        infant: {
          type: Number,
        },
      },
    },
    source: {
      type: String,
      trim: true,
    },
    currency: {
      type: String,
      trim: true,
    },
    language: {
      type: String,
      trim: true,
    },
    locale: {
      type: String,
      trim: true,
    },
    mktportal: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      trim: true,
    },
    shoppingId: {
      type: String,
      trim: true,
    },
    content: {
      type: String,
      trim: true,
    },
    dateTime: {
      type: String,
      trim: true,
    },
  });

  return mongoose.model('Report', ReportSchema, 'report');
};
