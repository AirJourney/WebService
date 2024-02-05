const { analysisPrice } = require('./analysis');

const priceChange = (schema, curSchema, currencyRate, passengerList) => {
  let isPriceChange = false;
  const priceSchema = schema.split('|')[1];
  const curPriceSchema = curSchema.split('|')[1];

  if (priceSchema != curPriceSchema) {
    isPriceChange = true;
    const analysisPriceResult = analysisPrice(priceSchema, currencyRate);
    const adtCount =
      passengerList.filter(p => p.flag == 'ADT').length > 0
        ? passengerList.filter(p => p.flag == 'ADT')[0].count
        : 0;
    const chdCount =
      passengerList.filter(p => p.flag == 'CHD').length > 0
        ? passengerList.filter(p => p.flag == 'CHD')[0].count
        : 0;
    const infCount =
      passengerList.filter(p => p.flag == 'INF').length > 0
        ? passengerList.filter(p => p.flag == 'INF')[0].count
        : 0;
    const totalPrice = (
      parseFloat(
        Number(analysisPriceResult.adtBase) +
          Number(analysisPriceResult.adtTaxes)
      ) *
        adtCount +
      parseFloat(
        Number(analysisPriceResult.chdBase) +
          Number(analysisPriceResult.chdTaxes)
      ) *
        chdCount +
      parseFloat(
        Number(analysisPriceResult.infBase) +
          Number(analysisPriceResult.infTaxes)
      ) *
        infCount
    ).toFixed(0);

    const avgPrice = (totalPrice / (adtCount + chdCount + infCount)).toFixed(0);

    return {
      isPriceChange,
      priceInfo: {
        adultPrice: {
          salePrice: analysisPriceResult.adtBase,
          tax: analysisPriceResult.adtTaxes,
        },
        childPrice: {
          salePrice: analysisPriceResult.chdBase,
          tax: analysisPriceResult.chdTaxes,
        },
        infantPrice: {
          salePrice: analysisPriceResult.infBase,
          tax: analysisPriceResult.infTaxes,
        },
        avgPrice,
        totalPrice,
      },
    };
  }
  return {
    isPriceChange,
    priceInfo: {},
  };

};

module.exports = {
  priceChange,
};
