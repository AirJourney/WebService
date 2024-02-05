'use strict';

module.exports = app => {
    const mongoose = app.mongoose;
   
    const RegionSchema = new mongoose.Schema({
        // 中文名
        "name":{
            type: String,
            trim:true 
        },
        // 三字码
        "cityCode":{
            type: String,
            trim:true 
        },
        // 英文名
        "eName":{
            type: String,
            trim:true 
        },
        // 时区
        "timeZone":{
            type: Number
        },
        // 是否有效
        "isValid":{
            type: Boolean
        }        
    });
   
    return mongoose.model('Region', RegionSchema,'region');
  }

/*
  "name": "香港",
  "cityCode": "HKG",
  "eName": "Hong Kong",
  "timeZone": 8,
  "isDomestic": 0,
  "isCanSelect": 1,
  "isShow": "1",
  "longitude": 114.199997,
  "latitude": 22.333334,
  "__typename": "HotCityPayload"
*/
