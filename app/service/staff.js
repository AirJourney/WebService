'use strict';

const Service = require('egg').Service;

class StaffService extends Service {
    async get(payload) {
        const ctx = this.ctx;
        let data = null;
        if(payload){
            const {username,password} = payload;
             data = ctx.model.User.find({'id':username,'password':password});
        }else{
            data = ctx.model.User.find({});
            // data = this.app.model.User.find({});
            
        }
        
        return data;
    }

    async create(payload) {
        return this.ctx.model.Staff.create(payload);
    }

    async login(body) {
        const { id, password } = body;
        const user = await this.ctx.model.Staff.findOne({
         id:id
        });
        if (!user) return null;
        if (password==user.password) {
          return user;
        }
      }
}

module.exports = StaffService;
