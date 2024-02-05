'use strict';

module.exports = app => {
    const mongoose = app.mongoose;
   
    const FlightSchema = new mongoose.Schema({
        "flightId":{
            type: String,
            trim:true 
        },
        "shoppingId":{
            type: String,
            trim:true 
        },
        "arriveMultCityName":{
            type: String,
            trim:true 
        },
        "departMultCityName":{
            type: String,
            trim:true 
        },
        "arriveDateTimeFormat":{
            type: String,
            trim:true 
        },
        "departDateTimeFormat":{
            type: String,
            trim:true 
        },
        "duration":{
            type: String,
            trim:true 
        }
    });
   
    return mongoose.model('Flight', FlightSchema,'flight');
  }