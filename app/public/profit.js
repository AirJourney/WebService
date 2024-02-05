const timeHelper = require("../extend/time");
const assmebleMatchProfitParam = (flightType, redisCode, segmentSchema) => {
  const tripSearch = [
    {
      depart: redisCode.substring(4, 7),
      arrive: redisCode.substring(7, 10),
    },
  ];

  if (flightType == "RT") {
    tripSearch.push({
      depart: redisCode.substring(7, 10),
      arrive: redisCode.substring(4, 7),
    });
  }

  const resolverFlightInfo = {
    transit: segmentSchema.includes("*") ? "true" : "false",
    dateStart: timeHelper
      .momentDate(redisCode.substring(0, 4))
      .format("YYYY-MM-DD"),
    dateEnd: "",
    flightInfoList: [],
  };

  if (resolverFlightInfo.transit === "true") {
    resolverFlightInfo.flightInfoList.push({
      company: segmentSchema.split("-")[2],
      cabin: segmentSchema.split("-")[4].split("&")[1],
      number: segmentSchema.split("-")[3],
    });
    resolverFlightInfo.flightInfoList.push({
      company: segmentSchema.split("*")[1].split("-")[2],
      cabin: segmentSchema.split("*")[1].split("-")[4].split("&")[1],
      number: segmentSchema.split("*")[1].split("-")[3],
    });
  } else {
    resolverFlightInfo.flightInfoList.push({
      company: segmentSchema.split("-")[2],
      cabin: segmentSchema.split("-")[4].split("&")[1],
      number: segmentSchema.split("-")[3],
    });
  }

  return {
    tripSearch,
    resolverFlightInfo,
  };

  
};

module.exports = {
    assmebleMatchProfitParam,
};
