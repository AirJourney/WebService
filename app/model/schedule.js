'use strict';

module.exports = app => {
    const mongoose = app.mongoose;
   
    const ScheduleSchema = new mongoose.Schema({
        "switchName":{
            type: String,
            trim:true 
        },
        "switchStatus":{
            type: Number,
            trim:true 
        }
    });
   
    return mongoose.model('Schedule', ScheduleSchema,'schedule');
  }