'use strict';
// app/controller/captcha.js
const Controller = require('egg').Controller;
const { createCanvas } = require('canvas');

class CaptchaController extends Controller {
  async index() {
    const { ctx } = this;

    const captchaText = (Math.random() * 10000).toFixed(0).padStart(4, '0');
    ctx.body = captchaText;
    // const captcha = this.generateCaptcha(100, 30);

    // ctx.session.captcha = captcha.text;
    // console.log('session set', ctx.request.getRequestedSessionId());


    // Convert the image to a Base64 string
    // const imageBase64 = captcha.canvas.toBuffer('image/png').toString("base64");

    // Return the Base64 string with data URL scheme
    // ctx.body = {img:`data:image/png;base64,${imageBase64}`, text: captcha.text,length:imageBase64.length,canvas:imageBase64};


    // // Set the content type to be an image
    // ctx.type = 'image/png';

    // // Get a stream for the canvas and pipe it to the response
    // const stream = captcha.canvas.createPNGStream();
    // ctx.body = stream;
  }

  generateCaptcha(width, height) {
    const canvas = createCanvas(width, height);
    const canvasCtx = canvas.getContext('2d');

    // Draw background
    canvasCtx.fillStyle = '#F0F0F0';
    canvasCtx.fillRect(0, 0, width, height);

    // Draw text
    const text = (Math.random() * 10000).toFixed(0).padStart(4, '0');
    // canvasCtx.font = "30px Arial";
    canvasCtx.fillStyle = '#FF0000';
    canvasCtx.fillText(text, 10, 30);

    // Draw some random lines for confusion
    for (let i = 0; i < 6; i++) {
      // eslint-disable-next-line no-bitwise
      canvasCtx.strokeStyle = '#' + ((Math.random() * 0xffffff) << 0).toString(16);
      canvasCtx.beginPath();
      canvasCtx.moveTo(Math.random() * width, Math.random() * height);
      canvasCtx.lineTo(Math.random() * width, Math.random() * height);
      canvasCtx.stroke();
    }

    // Return the captcha text and canvas
    return { text, canvas };
  }

  async verify() {
    const { ctx } = this;
    const userInput = ctx.request.body.captcha;

    if (ctx.session.captcha === userInput) {
      ctx.body = { valid: true, message: '验证码正确' };
    } else {
      ctx.body = { valid: false, message: '验证码错误' };
    }
  }
}

module.exports = CaptchaController;
