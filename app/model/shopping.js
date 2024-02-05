'use strict';

module.exports = app => {
    const mongoose = app.mongoose;
   
    const ShoppingSchema = new mongoose.Schema({
        "shoppingId":{
            type: String,
            trim:true 
        },
        /** lcc/fsc */
        "shoppingType":{ 
            type: String,
            trim:true 
        },
        "currency":{
            type: String,
            trim:true 
        },
        "policyInfo":{
            type: String,
            trim:true 
        },
        "sessionId":{
            type: String,
            trim:true 
        },
        "redisCode":{
            type: String,
            trim:true 
        },
        "redisSchema":{
            type: String,
            trim:true 
        },
        "deepLink":{
            type:String,
            trim:true
        },
        createDateTime:{
            type: String,
            trim: true,
          },
    });
   
    return mongoose.model('Shopping', ShoppingSchema,'shopping');
  }