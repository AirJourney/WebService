'use strict';

module.exports = app => {
    const mongoose = app.mongoose;
   
    const FareSchema = new mongoose.Schema({
        "fareType":{
            "type": "String",
            trim:true 
        },
        "supplierPrice":{
            "type": "String",
            trim:true 
        },
        "tripType": {
            "type": "String",
            trim:true 
        },
        "departure": {
            "type": "String",
            trim:true 
        },
        "arrival": {
            "type": "String",
            trim:true 
        },
        "company": {
            "type": "String",
            trim:true 
        },
        "cabin": {
            "type": "String",
            trim:true 
        },
        "departureTime": {
            "type": "String",
            trim:true 
        },
        "arrivalTime": {
            type: String,
            required: false,
            default:"",
            trim:true 
        },
        "status": {
            "type": "Number"
        }
    });
   
    return mongoose.model('Fare', FareSchema,'fare');
  }