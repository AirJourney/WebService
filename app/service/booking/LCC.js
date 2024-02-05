'use strict';
const Booking = require('./Booking');
module.exports = class LCC extends Booking {
  async booking({
    passengers,
  }) {
    /** 根据group和IPCC获取对应的check 地址 */
    const bookingUrl = await this.app.service.ipcc.getIPCC({
      group: this.params.group,
      IPCC: this.params.IPCC,
      apiType: 'bookingApi',
    });

    if (bookingUrl === null) {
      return;
    }
    // TODO: update shopping
    if (bookingUrl !== '') {
      /** 调用外部接口 */
      const bookingResult = await this.app.service.switch.externalBooking(
        bookingUrl,
        {
          shoppingId: this.params.shoppingId,
          passenger: passengers,
          baggageInfo: this.params.baggageInfo,
        },
        12000
      );
      return bookingResult;
    }
  }

  getPassengers() {
    return this.params.flightPassengerList.map(passenger => ({
      lastName: passenger.givenName,
      firstName: passenger.surName,
      passCountry: passenger.nationality,
      passNumber: passenger.cardNo,
      birthDate: passenger.birthDay,
      gender: passenger.gender === 'female' ? 'F' : 'M',
      ageCategory: passenger.travelerType,
    }));
  }

  getPNRAndOrderId(bookingStatus) {
    let pnr = '';
    let orderId = '';
    if (
      bookingStatus.status === 200 &&
          bookingStatus.data &&
          bookingStatus.data.content &&
          bookingStatus.data.content.length > 0
    ) {
      pnr = bookingStatus.data.content[0].passengers[0].pnr;
      orderId = bookingStatus.data.content[0].orderId;
    }
    return { pnr, orderId };
  }

};
