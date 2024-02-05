'use strict';

const Service = require('egg').Service;
const nodeMailer = require('nodemailer');
const template = require('art-template');
const path = require('path');

const user_email = 'helpdesk@skywingtrip.com';
const auth_code = 'Jingtian888';

const transporter = nodeMailer.createTransport({
  host: 'smtphk.qiye.aliyun.com',
  port: 465,
  auth: {
    user: user_email, // 账号
    pass: auth_code, // 授权码
  },
});

const renderVerifyTemp = async verifyLink => {
  // const verifyLink = 'http://www.skywingtrip.com'
  return new Promise(resolve => {
    const html = template(path.join(__dirname, '../template/verify.html'), {
      verifylink: verifyLink,
    });
    resolve(html);
  });
};

class MailService extends Service {
  async verifyMail(userName, email, verifyLink) {
    const { ctx } = this;

    const html = await renderVerifyTemp(verifyLink);

    const mailOptions = {
      from: 'Helpdesk SkyWingTrip<helpdesk@skywingtrip.com>', // sender address mailfrom must be same with the user
      to: `${userName}<${email}>`, // list of receivers
      cc: '', // copy for receivers
      bcc: '', // secret copy for receivers
      subject: 'Welcome to join SkyWingTrip.com', // Subject line
      text: '', // plaintext body
      replyTo: '', // custom reply address
      html, // html body
      attachments: [
        {
          filename: 'verify.JPG',
          path: 'app/template/images/FullLogo.png',
          cid: '01',
        },
      ],
    };
      // ctx.logger.info(mailOptions);
    // transporter.sendMail(mailOptions, function(error, info) {
    //   if (error) {
    //     ctx.logger.error(error);
    //   }
    //   ctx.logger.info('Message sent: ' + info.response);
    //   // console.log("Message sent: " + info.response);
    // });

  }

  async toPayMail(contactName, email, orderId, userName, isExistUser, userId) {
    const renderTemp = async () => {
      const orderlink =
      userId ? 'http://www.skywingtrip.com/updatePwd?userid=' + userId + '&orderid=' + orderId
        : 'http://www.skywingtrip.com/detailpage?orderid=' + orderId;

      return new Promise(resolve => {
        const html = template(path.join(__dirname, '../template/topay.html'), {
          orderlink,
          userName,
          isExistUser,
        });
        resolve(html);
      });
    };

    const html = await renderTemp(orderId);

    const mailOptions = {
      from: 'Helpdesk SkyWingTrip<helpdesk@skywingtrip.com>', // sender address mailfrom must be same with the user
      to: `${contactName}<${email}>`, // list of receivers
      cc: '', // copy for receivers
      bcc: '', // secret copy for receivers
      subject: 'Please continue to pay your booking(orderId: ' + orderId + ')', // Subject line
      text: '', // plaintext body
      replyTo: '', // custom reply address
      html, // html body
      attachments: [
        {
          filename: 'payment.JPG',
          path: 'app/template/images/FullLogo.png',
          cid: '01',
        },
      ],
    };
    // transporter.sendMail(mailOptions, function(error, info) {
    //   if (error) {
    //     return console.log(error);
    //   }
    //   console.log('Message sent: ' + info.response);
    // });
  }

  async orderMail(contactName, email, orderId, userId) {
    const renderTemp = async orderId => {
      const orderlink =
      userId ? 'http://www.skywingtrip.com/updatePwd?userid=' + userId + '&orderid=' + orderId
        : 'http://www.skywingtrip.com/detailpage?orderid=' + orderId;

      return new Promise((resolve, reject) => {
        const html = template(
          path.join(__dirname, '../template/payment.html'),
          { orderlink }
        );
        resolve(html);
      });
    };

    const html = await renderTemp(orderId);

    const mailOptions = {
      from: 'Helpdesk SkyWingTrip<helpdesk@skywingtrip.com>', // sender address mailfrom must be same with the user
      to: `${contactName}<${email}>`, // list of receivers
      cc: '', // copy for receivers
      bcc: '', // secret copy for receivers
      subject: 'Thank you for your payment(orderId: ' + orderId + ')', // Subject line
      text: '', // plaintext body
      replyTo: '', // custom reply address
      html, // html body
      attachments: [
        {
          filename: 'payment.JPG',
          path: 'app/template/images/FullLogo.png',
          cid: '01',
        },
      ],
    };
    // transporter.sendMail(mailOptions, function(error, info) {
    //   if (error) {
    //     return console.log(error);
    //   }
    //   console.log('Message sent: ' + info.response);
    // });
  }

  async forgotMail(userName, email, userId) {
    const renderTemp = async userId => {
      const forgotlink =
        'http://www.skywingtrip.com/updatepwd?userid=' + userId;
      return new Promise((resolve, reject) => {
        const html = template(path.join(__dirname, '../template/forgot.html'), {
          forgotlink,
        });
        resolve(html);
      });
    };

    const html = await renderTemp(userId);

    const mailOptions = {
      from: 'Helpdesk SkyWingTrip<helpdesk@skywingtrip.com>', // sender address mailfrom must be same with the user
      to: `${userName}<${email}>`, // list of receivers
      cc: '', // copy for receivers
      bcc: '', // secret copy for receivers
      subject: 'Please update your password', // Subject line
      text: '', // plaintext body
      replyTo: '', // custom reply address
      html, // html body
      attachments: [
        {
          filename: 'payment.JPG',
          path: 'app/template/images/FullLogo.png',
          cid: '01',
        },
      ],
    };
    // transporter.sendMail(mailOptions, function(error, info) {
    //   if (error) {
    //     return console.log(error);
    //   }
    //   console.log('Message sent: ' + info.response);
    // });
  }

  async changeMail(mailOrderInfo) {

    const {
      orderId,
      contactName,
      email,
      passengerList,
      flightList,
    } = mailOrderInfo;

    const renderTemp = async () => {

      const orderlink =
      'http://www.skywingtrip.com/detailpage?orderid=' + orderId;

      return new Promise((resolve, reject) => {
        const html = template(
          path.join(__dirname, '../template/order.html'),
          { orderId,
            contactName,
            passengerList,
            flightList, orderlink }
        );
        resolve(html);
      });
    };

    const html = await renderTemp();

    const mailOptions = {
      from: 'Helpdesk SkyWingTrip<helpdesk@skywingtrip.com>', // sender address mailfrom must be same with the user
      to: `${contactName}<${email}>`, // list of receivers
      cc: '', // copy for receivers
      bcc: '', // secret copy for receivers
      subject: 'Your Booking Has Confirmed(orderId: ' + orderId + ')', // Subject line
      text: '', // plaintext body
      replyTo: '', // custom reply address
      html, // html body
      attachments: [
        // {
        //   filename: "payment.JPG",
        //   path: "app/template/images/FullLogo.png",
        //   cid: "01",
        // },
      ],
    };
    // transporter.sendMail(mailOptions, function(error, info) {
    //   if (error) {
    //     console.log('Message sent: ' + error);
    //   }
    //   console.log('Message sent: ' + info.response);
    // });
  }
}

module.exports = MailService;
