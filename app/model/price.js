'use strict';

module.exports = app => {
    const mongoose = app.mongoose;
   
    const PriceSchema = new mongoose.Schema({
        "priceId":{
            type: String,
            trim:true 
        },
        "shoppingId":{
            type: String,
            trim:true 
        },
        "adultPrice":{
            type: String,
            trim:true 
        },
        "childPrice":{
            type: String,
            trim:true 
        },
        "infantPrice":{
            type: String,
            trim:true 
        },
        "avgPrice":{
            type: Number,
            trim:true 
        },
        "totalPrice":{
            type: Number,
            trim:true 
        },
        "ticketDeadlineType":{
            type: Number,
            trim:true 
        }
    });
   
    return mongoose.model('Price', PriceSchema,'price');
  }