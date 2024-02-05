'use strict';

const Service = require('egg').Service;

class PoiService extends Service {
  async getPoi(query, language) {
    const poiList = await this.ctx.model.Poi2.find(query, {
      [language]: 1,
      airportcode: 1,
      citycode: 1,
      countrycode: 1,
      _id: 0,
    });

    return poiList;
  }

  async getCityCodePair({ from, to, language }) {
    const fromList = await this.getPoi({ $or: [{ citycode: from }, { airportcode: from }] }, language);
    const toList = await this.getPoi({ $or: [{ citycode: to }, { airportcode: to }] }, language);
    if (fromList.length === 0) {
      fromList.push({ airportcode: from });
    }
    if (toList.length === 0) {
      toList.push({ airportcode: to });
    }

    const fromCity = fromList[0].citycode;
    const toCity = toList[0].citycode;

    const result = {
      from: fromCity,
      to: toCity,
    };

    const cartesian = [{ from: fromCity, to: toCity }];
    fromList.forEach((fromPoi, i) => {
      toList.forEach((toPoi, j) => {
        if (i === 0) {
          cartesian.push({
            from: fromCity,
            to: toPoi.airportcode,
          });
        }
        if (j === 0) {
          cartesian.push({
            from: fromPoi.airportcode,
            to: toCity,
          });
        }
        cartesian.push({
          from: fromPoi.airportcode,
          to: toPoi.airportcode,
        });
      });
    });

    return { codePair: result, cartesian, details: [ ...fromList, ...toList ] };
  }

  async getAllPossibleAirport({ from, to, language }) {
    const fromList = await this.getPoi({ $or: [{ citycode: from }, { airportcode: from }] }, language);
    const toList = await this.getPoi({ $or: [{ citycode: to }, { airportcode: to }] }, language);
    if (fromList.length === 0) {
      fromList.push({ airportcode: from });
    }
    if (toList.length === 0) {
      toList.push({ airportcode: to });
    }

    const fromCity = fromList[0].citycode;
    const toCity = toList[0].citycode;

    // const result = [];
    // fromList.forEach(fromPoi => {
    //   toList.forEach(toPoi => {
    //     result.push({
    //       from: fromPoi.airportcode,
    //       to: toPoi.airportcode,
    //     });
    //   });
    // });

    const result = {
      from: fromCity,
      to: toCity,
    };

    // const result = [];
    // fromList.forEach(fromPoi => {
    //   toList.forEach(toPoi => {
    //     result.push({
    //       from: fromPoi.airportcode,
    //       to: toPoi.airportcode,
    //     });
    //   });
    // });
    return { cartesian: result, details: [ ...fromList, ...toList ] };
  }

  getPoisByAirportCodes(airportcodes, language) {
    const query = airportcodes.map(airportcode => ({ airportcode }));
    return this.ctx.model.Poi2.find({
      $or: query,
    }, {
      [language]: 1,
      airportcode: 1,
      citycode: 1,
      countrycode: 1,
      _id: 0,
    });
  }

  async createPoi(poiList) {
    for (let i = 0; i < poiList.length; i++) {
      const poi = poiList[i];
      poi.poiId = this.ctx.helper.GUID();
      await this.ctx.model.Poi2.create(poi);
    }
  }
}

module.exports = PoiService;
