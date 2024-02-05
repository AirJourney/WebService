"use strict";

module.exports = (app) => {
  const mongoose = app.mongoose;

  const StaffSchema = new mongoose.Schema({
    group: {
      type: String,
      trim: true,
    },
    staffId: {
      type: String,
      trim: true,
    },
    id: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
      trim: true,
    },
  });

  return mongoose.model("Staff", StaffSchema, "staff");
};
