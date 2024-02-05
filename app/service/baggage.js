'use strict';

const moment = require('moment');
const Service = require('egg').Service;

const createBaggageInfo = (
  baggageInfoList,
  company,
  cabin,
  flightNo,
  checkInDate,
  group,
  IPCC,
  redisSchema
) => {
  let defaultAdult = {
    carry: {
      weight: 23,
      piece: 1,
      limit: '',
    },
    hand: {
      weight: 7,
      piece: 1,
      limit: '',
    },
  };
  if (redisSchema) {
    const regexp = /\(([-+]?\d+)\)/g;
    const defaultBaggage = redisSchema
      .split('*')[0]
      .split('/')[0]
      .replaceAll(regexp, '')
      .split('-')[9];
    if (defaultBaggage === 'null') {
      defaultAdult = {
        carry: null,
        hand: {
          weight: 7,
          piece: 1,
          limit: '',
        },
      };
    } else if (defaultBaggage.includes('kg')) {
      defaultAdult = {
        carry: {
          weight: defaultBaggage.split('kg')[0],
          piece: 1,
          limit: '',
        },
        hand: {
          weight: 7,
          piece: 1,
          limit: '',
        },
      };
    } else {
      defaultAdult = {
        carry: {
          weight: 23,
          piece: defaultBaggage,
          limit: '',
        },
        hand: {
          weight: 7,
          piece: 1,
          limit: '',
        },
      };
    }
  }
  const defaultConfig = {
    adult: defaultAdult,
    child: null,
    infant: null,
  };
  const getDetail = (data, type) => {
    if (!data) return null;
    const { piece, weight } = data;
    if (!piece || !weight || piece === 'null' || weight === 'null') return null;
    return {
      description: `Total dimensions (length + width + height) of each piece cannot exceed ${
        type === 0 ? 158 : 115
      }CM.`,
      weightAndPieceDesc: `${piece * weight} kg per person`,
      weight,
      piece,
    };
  };
  let result = {
    checkedFormatted: defaultConfig.adult.carry
      ? {
        adultDetail: getDetail(defaultConfig.adult.carry, 0),
        childDetail: null,
        infantDetail: null,
      }
      : null,
    handFormatted: defaultConfig.adult.hand
      ? {
        adultDetail: getDetail(defaultConfig.adult.hand, 1),
        childDetail: null,
        infantDetail: null,
      }
      : null,
  };
  if (!baggageInfoList || baggageInfoList.length === 0) return result;
  baggageInfoList.some(baggageInfo => {
    const {
      adult,
      child,
      infant,
      dateStart,
      dateEnd,
      type,
      flightNo: fNo,
      company: fCom,
      cabin: fCabin,
      group: fGroup,
      IPCC: fIPCC,
      _id,
    } = baggageInfo;
    if (fNo && fNo.length > 0 && fNo.indexOf(flightNo) === -1) return false;
    if (fCom && fCom.length > 0 && fCom.indexOf(company) === -1) return false;
    if (fCabin && fCabin.length > 0 && fCabin.indexOf(cabin) === -1) { return false; }
    if (fGroup && group !== fGroup) return false;
    if (fIPCC && IPCC !== fIPCC) return false;
    if (type === 1) {
      if (dateStart && moment(dateStart).isAfter(checkInDate)) return false;
      if (dateEnd && moment(dateEnd).isBefore(checkInDate)) return false;
    } else if (type === 2) {
      if (dateStart && moment().add(dateStart, 'days').isAfter(checkInDate)) { return false; }
      if (dateEnd && moment().add(dateEnd, 'days').isBefore(checkInDate)) { return false; }
    }
    const { carry: aCarry, hand: aHand } = adult || {};
    const { carry: cCarry, hand: cHand } = child || {};
    const { carry: iCarry, hand: iHand } = infant || {};
    result = {
      _id,
      checkedFormatted: {
        adultDetail: getDetail(aCarry, 0),
        childDetail: getDetail(cCarry, 0),
        infantDetail: getDetail(iCarry, 0),
      },
      handFormatted: {
        adultDetail: getDetail(aHand, 1),
        childDetail: getDetail(cHand, 1),
        infantDetail: getDetail(iHand, 1),
      },
    };
    return true;
  });
  return result;
};

class BaggageService extends Service {
  generateBaggageInfo(
    allBaggageInfoList,
    { flightGroupInfoList, redisSchema },
    group,
    IPCC
  ) {
    const baggageInfoList = [];
    baggageInfoList.push(
      createBaggageInfo(
        allBaggageInfoList,
        flightGroupInfoList[0].flightSegments[0].airlineInfo.code,
        flightGroupInfoList[0].flightSegments[0].subClass,
        flightGroupInfoList[0].flightSegments[0].flightNo,
        moment(flightGroupInfoList[0].flightSegments[0].dDateTime).format(
          'YYYY-MM-DD'
        ),
        group,
        IPCC,
        redisSchema
      )
    );
    // if (tripType === 'RT') {
    //   const seg2Result = await this.getBaggageInfo({
    //     flightNo: flightGroupInfoList[1].flightSegments[0].flightNo,
    //     flightType: tripType,
    //     from: arrive,
    //     to: depart,
    //     company: flightGroupInfoList[1].flightSegments[0].airlineInfo.code,
    //     cabin: flightGroupInfoList[1].flightSegments[0].subClass,
    //     checkInDate: moment(flightGroupInfoList[1].flightSegments[0].dDateTime).format('YYYY-MM-DD'),
    //   });
    //   baggageInfoList.push(createBaggageInfo(seg2Result));
    // }
    return baggageInfoList;
  }
  generateBaggageInfoNew(
    allBaggageInfoList,
    eachFlightData,
    group,
    IPCC,
    checkInDate
  ) {
    const baggageInfoList = [];
    baggageInfoList.push(
      createBaggageInfo(
        allBaggageInfoList,
        eachFlightData.departPart[0].airline,
        eachFlightData.departPart[0].subClass,
        eachFlightData.departPart[0].flightNo,
        moment(checkInDate).format('YYYY-MM-DD'),
        group,
        IPCC,
        eachFlightData.schema
      )
    );
    return baggageInfoList;
  }
  addBaggageInfo({
    flightNo,
    flightType,
    from,
    to,
    company,
    cabin,
    dateStart,
    dateEnd,
    adult,
    child,
    infant,
    IPCC,
    group = 'LLTrip',
  }) {
    const baggageInfo = {
      flightNo,
      flightType,
      from,
      to,
      company,
      cabin,
      dateStart,
      dateEnd,
      adult,
      child,
      infant,
      enable: true,
      IPCC,
      group,
    };
    return this.ctx.model.Baggage.insertMany(baggageInfo);
  }
  getBaggageCount(params) {
    return this.ctx.model.Baggage.countDocuments({
      $and: [
        {
          $or: [
            { $expr: { $eq: [ params.flightType || undefined, undefined ] } },
            { flightType: { $eq: params.flightType } },
            { flightType: { $exists: false } },
          ],
        },
        {
          $or: [
            { $expr: { $eq: [ params.company || undefined, undefined ] } },
            { company: { $eq: params.company } },
            { company: { $exists: false } },
          ],
        },
        {
          $or: [
            { $expr: { $eq: [ params.from || undefined, undefined ] } },
            { from: { $eq: params.from } },
            { from: { $exists: false } },
          ],
        },
        {
          $or: [
            { $expr: { $eq: [ params.to || undefined, undefined ] } },
            { to: { $eq: params.to } },
            { to: { $exists: false } },
          ],
        },
      ],
    });
  }
  getBaggageList(params) {
    return this.ctx.model.Baggage.find({
      $and: [
        {
          $or: [
            { $expr: { $eq: [ params.flightType || undefined, undefined ] } },
            { flightType: { $eq: params.flightType } },
            { flightType: { $exists: false } },
          ],
        },
        {
          $or: [
            { $expr: { $eq: [ params.company || undefined, undefined ] } },
            { company: { $eq: params.company } },
            { company: { $exists: false } },
          ],
        },
        {
          $or: [
            { $expr: { $eq: [ params.from || undefined, undefined ] } },
            { from: { $eq: params.from } },
            { from: { $exists: false } },
          ],
        },
        {
          $or: [
            { $expr: { $eq: [ params.to || undefined, undefined ] } },
            { to: { $eq: params.to } },
            { to: { $exists: false } },
          ],
        },
        {
          $or: [
            { $expr: { $eq: [ params.IPCC || undefined, undefined ] } },
            { to: { $eq: params.IPCC } },
            { to: { $exists: false } },
          ],
        },
      ],
    })
      .sort({ _id: -1 })
      .limit(params.limit)
      .skip(params.skip);
  }

  async getBaggageInfoList({ flightType, from, to }) {
    return this.ctx.model.Baggage.find({
      $and: [
        {
          $or: [
            { flightType: { $eq: flightType } },
            { flightType: { $exists: false } },
          ],
        },
        {
          $or: [
            { from: { $eq: from } },
            { from: { $exists: false } },
            { from: { $eq: '' } },
          ],
        },
        {
          $or: [
            { to: { $eq: to } },
            { to: { $exists: false } },
            { to: { $eq: '' } },
          ],
        },
        { enable: true },
      ],
    });
  }

  deleteBaggageInfo(ids) {
    if (!Array.isArray(ids) && ids.length === 0) return;
    return this.ctx.model.Baggage.remove({ _id: { $in: ids } });
  }

  updateBaggageInfo(params) {
    if (!params._id) return null;
    params.enable = true;
    return this.ctx.model.Baggage.replaceOne({ _id: params._id }, params);
  }

  async addonBaggageList(params) {
    const { depart, arrive, departTime, carrier, currency } = params;

    const { ctx, app } = this;

    /** 汇率部分-Start */
    let rate = await app.redis.get('db2').smembers(`USD2${currency}`);
    if (rate && rate.length > 0) {
      rate = rate[0];
    } else {
      rate = 1;
    }
    /** 汇率部分-End */

    const addonBaggageUrl = '';
    let result = {};
    if (addonBaggageUrl == '') {
      const baggageList = [];
      for (let i = 1; i < 4; i++) {
        const baggage = {
          weight: '23',
          piece: i,
          price: 100 * i,
          currency,
        };
        baggageList.push(baggage);
      }

      result = {
        status: true,
        msg: 'addonBaggageList success',
        content: [{ depart, arrive, carrier, baggageList }],
      };
    } else {
      result = await ctx.curl(addonBaggageUrl, {
        method: 'POST',
        contentType: 'json',
        data: {
          depart,
          arrive,
          departTime,
          carrier,
          currency,
        },
        dataType: 'json',
        timeout: 8000,
      });
    }

    if (
      result &&
      result.status &&
      result.content &&
      result.content.length > 0
    ) {
      result.content[0].baggageList.forEach(b => {
        b.price = parseFloat(b.price * rate).toFixed(0);
      });
    }

    return result.content;
  }
}

module.exports = BaggageService;
