'use strict';

module.exports = app => {
    const mongoose = app.mongoose;
   
    const LimitSchema = new mongoose.Schema({
        "limitId":{
            type: String,
            trim:true 
        },
        "minAge":{
            type: String,
            trim:true 
        },
        "maxAge":{
            type: String,
            trim:true 
        },
        "minPassengerCount":{
            type: Number,
            trim:true 
        },
        "maxPassengerCount":{
            type: Number,
            trim:true 
        }
    });
   
    return mongoose.model('Limit', LimitSchema,'limit');
  }