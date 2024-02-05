'use strict';

module.exports = app => {
    const mongoose = app.mongoose;
   
    const PassengerSchema = new mongoose.Schema({
        "passengerId":{
            type: String,
            trim:true 
        },
        "givenName":{
            type: String,
            trim:true 
        },
        "surName":{
            type: String,
            trim:true 
        },
        "birthDay":{
            type: String,
            trim:true 
        },
        "cardNo":{
            type: String,
            trim:true 
        },
        "cardType":{
            type: String,
            trim:true 
        },
        "travelerType":{
            type: String,
            trim:true 
        }   ,
        "gender":{
            type: String,
            trim:true 
        },
        "nationality":{
            type: String,
            trim:true 
        },
        "passportLimit":{
            type: String,
            trim:true 
        }           
    });
   
    return mongoose.model('Passenger', PassengerSchema,'passenger');
  }