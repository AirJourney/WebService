'use strict';

module.exports = app => {
    const mongoose = app.mongoose;
   
    const StopSchema = new mongoose.Schema({
        "stopId":{
            type: String,
            trim:true 
        },
        "cityCode":{
            type: String,
            trim:true 
        },
        "cityName":{
            type: String,
            trim:true 
        },
        "durationHour":{
            type: Number,
            trim:true 
        },
        "durationMinute":{
            type: Number,
            trim:true 
        },
        "dPortCode":{
            type: String,
            trim:true 
        },
        "dPortName":{
            type: String,
            trim:true 
        },
        "dPortTerminal":{
            type: String,
            trim:true 
        },
        "aPortCode":{
            type: String,
            trim:true 
        },
        "aPortName":{
            type: String,
            trim:true 
        },
        "aPortTerminal":{
            type: String,
            trim:true 
        }
    });
   
    return mongoose.model('Stop', StopSchema,'stop');
  }