'use strict';

module.exports = app => {
    const mongoose = app.mongoose;
   
    const ContactSchema = new mongoose.Schema({
        "contactId":{
            type: String,
            trim:true 
        },
        "contactName":{
            type: String,
            trim:true 
        },
        "email":{
            type: String,
            trim:true 
        },
        "phoneArea":{
            type: String,
            trim:true 
        },
        "contactTel":{
            type: String,
            trim:true 
        },
        "mobilePhone":{
            type: String,
            trim:true 
        }        
    });
   
    return mongoose.model('Contact', ContactSchema,'contact');
  }