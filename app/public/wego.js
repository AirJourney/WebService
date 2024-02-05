const {inCurrency,inLanguage} = require("./inBasic");
const convertRequest = (requestInfo) => {
  /** {"locale":"TW",
   * "language":"tc",
   * "flightType":"RT",
   * "cabinType":"E",
   * "passenger":[{"name":"Adult","count":1,"flag":"ADT"},{"name":"Children","count":0,"flag":"CHD"},{"name":"Infants","count":0,"flag":"INF"}],
   * "tripSearch":[{"depart":"TYO","arrive":"SHA","departTime":"2023-05-22"},{"departTime":"2023-05-26","depart":"SHA","arrive":"TYO"}],
   * "currency":"USD"}
   * */

  /**
   * {  
      "legs":[  
          {  
            "departureCode":"KWI",
            "arrivalCode":"BOM",
            "outboundDate":"2018-03-09"
          },
          {  
            "departureCode":"BOM",
            "arrivalCode":"KWI",
            "outboundDate":"2018-03-17"
          }
      ],
      "adultsCount":1,
      "childrenCount":0,
      "infantsCount":0,
      "cabin":"economy",
      "currencyCode":"KWD",
      "locale":"ar"
    }
   */
  const {
    legs,
    adultsCount,
    childrenCount,
    infantsCount,
    cabin,
    currencyCode,
    locale,
  } = requestInfo;
  const tripSearch = [];
  legs.forEach((leg) => {
    tripSearch.push({
      depart: leg.departureCode,
      arrive: leg.arrivalCode,
      departTime: leg.outboundDate,
    });
  });

  const flightType = tripSearch.length > 1 ? "RT" : "OW";
  const passenger = [];
  if (adultsCount > 0) {
    passenger.push({
      name: "Adult",
      count: adultsCount,
      flag: "ADT",
    });
  }
  if (childrenCount > 0) {
    passenger.push({
      name: "Children",
      count: childrenCount,
      flag: "CHD",
    });
  }
  if (infantsCount > 0) {
    passenger.push({
      name: "Infants",
      count: infantsCount,
      flag: "INF",
    });
  }
  const economyArray = ["economy", "premium_economy"];
  const businessArray = ["business", "first"];
  const cabinType = economyArray.includes(cabin)
    ? "E"
    : businessArray.includes(cabin)
    ? "B"
    : "E";
  const currency = inCurrency(currencyCode);
  const language = inLanguage(locale);
  const request = {
    locale,
    language,
    flightType,
    cabinType,
    passenger,
    tripSearch,
    currency,
  };
  return request;
};

/**
   * {
   "flightItineraries":[
      {
         "price":{
            "currencyCode":"KWD",
            "pricePerAdult":65,
            "pricePerChild":0,
            "pricePerInfant":0,
            "totalAmount":75.375,
            "isRefundable": true
         },
         "leg1":{
            "segments":[
               {
                  "cabin":"Economy",
                  "flightNumber": "664"
                  "airlineCode": "WY",
                  "operatingAirlineCode": "WY",
                  "aircraftCode": "320",
                  "departureDateTime":"2018-12-14T03:55:00",
                  "arrivalDateTime":"2018-12-14T07:05:00",
                  "departureAirportCode":"KWI",
                  "arrivalAirportCode":"MCT"
               },
               {
                  "cabin":"Economy",
                  "flightNumber": "203"
                  "airlineCode": "WY",
                  "operatingAirlineCode": "EK",
                  "aircraftCode": "330",
                  "departureDateTime":"2018-12-14T09:00:00",
                  "arrivalDateTime":"2018-12-14T13:10:00",
                  "departureAirportCode":"MCT",
                  "arrivalAirportCode":"BOM"
               }
            ]
         },
         "leg2":{
            "segments":[
               {
                  "cabin":"Economy",
                  "flightNumber": "204"
                  "airlineCode": "WY",
                  "operatingAirlineCode": "WY",
                  "aircraftCode": "320",
                  "departureDateTime":"2018-12-19T16:15:00",
                  "arrivalDateTime":"2018-12-19T17:45:00",
                  "departureAirportCode":"BOM",
                  "arrivalAirportCode":"MCT"
               },
               {
                  "cabin":"Economy",
                  "flightNumber": "647"
                  "airlineCode": "WY",
                  "operatingAirlineCode": "EK",
                  "aircraftCode": "320",
                  "departureDateTime":"2018-12-19T18:50:00",
                  "arrivalDateTime":"2018-12-19T20:20:00",
                  "departureAirportCode":"MCT",
                  "arrivalAirportCode":"KWI"
               }
            ]
         },
         "deeplinkUrl":"https://www.yourdomain.com/booking/123456789",
         "mobileDeeplinkUrl":"https://m.yourdomain.com/booking/123456789"
      }
   ]
}
   */

const convertSegment = (flightGroupInfo) => {
  const segments = [];

  flightGroupInfo.flightSegments.forEach((flightSegment) => {
    const segment = {
      cabin: flightSegment.cabinClass,
      flightNumber: flightSegment.flightNumber,
      airlineCode: flightSegment.airlineInfo.code,
      operatingAirlineCode: flightSegment.airlineInfo.code,
      aircraftCode: flightSegment.craftInfo.craftType,
      departureDateTime: flightSegment.dDateTime,
      arrivalDateTime: flightSegment.aDateTime,
      departureAirportCode: flightSegment.dPortInfo.code,
      arrivalAirportCode: flightSegment.aPortInfo.code,
    };
    segments.push(segment);
  });

  return segments;
};

const convertPrice = (
  policyDetailInfo,
  currency,
  passengerCountList,
  penaltyInfoList
) => {
  const { adultsCount, childrenCount, infantsCount } = passengerCountList;
  const price = {
    currencyCode: currency,
    pricePerAdult:
      (Number(policyDetailInfo.adultPrice.salePrice) +
        Number(policyDetailInfo.adultPrice.tax)) *
      adultsCount,
    pricePerChild:
      (Number(policyDetailInfo.childPrice.salePrice) +
        Number(policyDetailInfo.childPrice.tax)) *
      childrenCount,
    pricePerInfant:
      (Number(policyDetailInfo.infantPrice.salePrice) +
        Number(policyDetailInfo.infantPrice.tax)) *
      infantsCount,
    totalAmount: Number(policyDetailInfo.totalPrice),
    isRefundable: true,
  };

  penaltyInfoList.forEach((p) => {
    if (price.isRefundable == false) return;
    if (
      p.penaltyInfo.penaltyType == "onlyChange" ||
      p.penaltyInfo.penaltyType == "bothNever"
    ) {
      price.isRefundable = false;
    }
  });

  return price;
};

const convertResponse = (flightList, passengerCountList) => {
  const flightItineraries = [];

  flightList.forEach((flight) => {
    const {
      policyDetailInfo,
      currency,
      policyInfo,
      flightGroupInfoList,
      deeplink,
    } = flight;

    if (flightGroupInfoList.length > 0) {
      let flightRes = {};

      flightRes.price = convertPrice(
        policyDetailInfo,
        currency,
        passengerCountList,
        policyInfo.penaltyInfoList
      );

      flightRes.leg1 = { "segments":convertSegment(flightGroupInfoList[0])};
      if (flightGroupInfoList.length > 1) {
        flightRes.leg2 = { "segments":convertSegment(flightGroupInfoList[1])};
      }
      flightRes.deeplinkUrl = deeplink;
      flightRes.mobileDeeplinkUrl = deeplink;

      flightItineraries.push(flightRes);
    }
  });

  return { flightItineraries };
};

module.exports = {
  convertRequest,
  convertResponse,
};
