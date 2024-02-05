'use strict';
const Booking = require('./Booking');
const { getRandomCacheMachine } = require('../../extend/utils');

module.exports = class Galileo extends Booking {
  booking({
    segments,
    IPCC,
    passengers,
  }) {
    return this.app.ctx.curl(
      getRandomCacheMachine() + ':9001/booking',
      {
        method: 'POST',
        contentType: 'json',
        dataType: 'json',
        headers: {},
        data: {
          segments,
          IPCC,
          passengers,
        },
        timeout: 150000, // 设置超时时间为 15 秒
      }
    );
  }


  getPassengers() {
    const passengers = [];
    for (const p of this.params.flightPassengerList) {
      const passenger = {
        lastName: p.surName,
        firstName: p.givenName,
        passCountry: p.nationality,
        passNumber: p.cardNo,
        birthDate: p.birthDay,
        gender: p.gender === 'male' ? 'M' : 'F',

        ageCategory: this.convertAgeCategory(p.travelerType),
      };
      passengers.push(passenger);
    }
    return passengers;
  }

  getPNRAndOrderId(bookingStatus) {
    let pnr = '';
    if (
      bookingStatus.status === 200 &&
      bookingStatus.data &&
      bookingStatus.data.content &&
      bookingStatus.data.content.length > 0
    ) {
      pnr = bookingStatus.data.content[0].pnr;
    }
    return { pnr, orderId: this.app.ctx.helper.ID() };
  }
};
