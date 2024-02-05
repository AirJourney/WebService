const Dysmsapi20170525 = require('@alicloud/dysmsapi20170525');
const OpenApi = require('@alicloud/openapi-client');
const {RuntimeOptions} = require('@alicloud/tea-util');
const Service = require("egg").Service;

class SmsService extends Service {
  async send(phoneNumbers) {
    let config = new OpenApi.Config({
      // 必填，您的 AccessKey ID
      accessKeyId: "LTAI5tDB9w9Lz1nU92FniseG", // 请替换为你的 AccessKey ID
      // 必填，您的 AccessKey Secret
      accessKeySecret: "rINFqUe7jH6OOLuJdbbqozLNJIhLjE", // 请替换为你的 AccessKey Secret
    });
    config.endpoint = `dysmsapi.aliyuncs.com`;
    let client = new Dysmsapi20170525.default(config);

    const text = (Math.random() * 10000).toFixed(0).padStart(6, "0");
    let sendSmsRequest = new Dysmsapi20170525.SendSmsRequest({
        phoneNumbers,
        signName: "skywingcn",
        templateCode: "SMS_460770605",
        templateParam: `{\"code\":\"${text}\"}`,
    });

    try {
        
      let response = await client.sendSmsWithOptions(sendSmsRequest, new RuntimeOptions({ }));// await client.sendSms(sendSmsRequest);
      return {response,text};
    } catch (error) {
      // 如有需要，请打印 error
      Util.assertAsString(error.message);
      throw error;
    }
  }
}

module.exports = SmsService;