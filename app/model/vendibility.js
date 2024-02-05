'use strict';

module.exports = app => {
  const mongoose = app.mongoose;
  const VendibilitySchema = new mongoose.Schema({
    vendibilityId: {
      type: String,
      trim: true,
    },
    /** supplier/segment */
    group: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    isVendibility: {
      type: Boolean,
      default: true,
    },
    isValid: {
      type: Boolean,
      default: true,
    },
  });
  return mongoose.model('Vendibility', VendibilitySchema, 'vendibility');
};
