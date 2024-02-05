const Controller = require("egg").Controller;

class SmsController extends Controller {
  async sendCode() {
    const { ctx } = this;
    const {phoneNumbers} = ctx.request.body;
    const res = await this.service.sms.send(phoneNumbers);
    
    if (res) {
      const {response,text} = res;
      // ctx.session.sms = response;
      ctx.body = { statusCode:response.statusCode,text };
    } else {
      ctx.body = { statusCode:404 };
    }
  }
}

module.exports = SmsController;
