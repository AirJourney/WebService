"use strict";

module.exports = (app) => {
  const mongoose = app.mongoose;

  const ChangeSchema = new mongoose.Schema({
    changeId: {
      type: String,
      trim: true,
    },
    orderId: {
      type: String,
      trim: true,
    },
    userId: {
      type: String,
      trim: true,
    },
    /** 改签后的航班信息 */
    shoppingId: {
      type: String,
      trim: true,
    },
    /** 改签后的票号 */
    ticketNumber: {
      type: String,
      trim: true,
    },
  });

  return mongoose.model("Change", ChangeSchema, "change");
};
