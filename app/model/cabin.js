"use strict";

module.exports = app => {
  const mongoose = app.mongoose;

  const CabinSchema = new mongoose.Schema({
    seatClass: {
      type: "String",
      trim: true
    },
    seatPrice: {
      type: Number,
      default: 0
    },
    fareID: {
      type: "String",
      trim: true
    },
    status: {
      type: Number,
      default: 1
    }
  });

  return mongoose.model("Cabin", CabinSchema, "cabin");
};
