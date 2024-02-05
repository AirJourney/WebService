"use strict";

const FlightListSearch = require("./FlightListSearch");
const helper = require("../../extend/helper");
const timeHelper = require("../../extend/time");
const moment = require("moment");

module.exports = class Trip extends FlightListSearch {
  generateParams(searchParams) {
    const {
      tripSearch,
      cabinType,
      tripType,
      passenger,
      currency,
      locale,
      language,
      mktportal = "customer",
      referer,
    } = searchParams;

    if (tripType === "RT" && !(tripSearch[1] && tripSearch[1].departTime))
      throw new Error("RT tripType must have returnTime");

    this.origialParams = {
      cid: "test",
      tripTpye: tripType == "OW" ? "1" : "2",
      adultNumber: passenger.filter((p) => p.flag == "ADT").length,
      childNumber: passenger.filter((p) => p.flag == "CHD").length,
      infantNumber: passenger.filter((p) => p.flag == "INF").length,
      fromCity: tripSearch[0].depart,
      toCity: tripSearch[0].arrive,
      fromDate: tripSearch[0].departTime.formate("YYYYMMDD"),
      retDate:
        tripSearch.length > 1
          ? tripSearch[1].departTime.formate("YYYYMMDD")
          : "",
      channel: "E",
      mainChannel: "EnglishSite",
      subChannelID: "0",
      isCompressEncode: "F",
      source: 0,
    };

    const enabledLanguage = ["tc", "en", "cn"];
    let l = language;
    if (!enabledLanguage.includes(language)) {
      l = "en";
    }
    this.params = {
      tripType,
      cabinType,
      from: tripSearch[0].depart,
      to: tripSearch[0].arrive,
      departTime: tripSearch[0].departTime,
      returnTime:
        tripType === "RT" && tripSearch[1] ? tripSearch[1].departTime : null,
      passenger,
      currency,
      language: l,
      locale,
      mktportal,
      referer,
    };
  }

  transformContact(searchResult) {
    const { status, msg, shoppingResultList, flightList, cacheTime } =
      searchResult;

    if (!status || status != 0) {
      return {
        status,
        msg,
      };
    }
    const flightGroupInfoList = [];
    const policyDetailInfoList = [];
    const policyInfoList = [];
    for (let i = 0; i < shoppingResultList.length; i++) {
      const shoppingResult = shoppingResultList[i];
      const { flightRefList, tuList } = shoppingResult;

      // 使用 reduce 方法根据 segmentNo 分组
      const segmentedFlightsObj = flightRefList.reduce(
        (accumulator, currentFlight) => {
          // 如果之前没有这个 segmentNo 的数组，创建一个新的
          if (!accumulator[currentFlight.segmentNo]) {
            accumulator[currentFlight.segmentNo] = [];
          }

          // 将当前航班添加到对应 segmentNo 的数组中
          accumulator[currentFlight.segmentNo].push(currentFlight);
          return accumulator;
        },
        {}
      );

      // 将累积结果对象转换为所需的数组格式
      const segmentedFlightsArray = Object.keys(segmentedFlightsObj).map(
        (segmentNo) => {
          return {
            segmentNo: parseInt(segmentNo),
            flightRefList: segmentedFlightsObj[segmentNo],
            flightList:[]
          };
        }
      );

      segmentedFlightsArray.forEach((segmentedFlights) => {
        
        segmentedFlights.forEach((s) => {
          segmentedFlights.flightList.push(
            flightList.filter((fl) => fl.flightRefNum == s.flightRefNum)[0]
          );
        });
      });

      flightGroupInfoList.push(this.combineFlightInfo(segmentedFlightsArray));
    }
  }

  combineFlightInfo(segmentedFlightsArray) {

    //TODO


    return {
      flightId: helper.GUID(),
      departMultCityName: this.params.from,
      departDateTimeFormat: moment(flightInfo.depTime, "YYYYMMDDHHmm").format(
        "YYYY-MM-DDTHH:mm:ss"
      ),
      arriveMultCityName: this.params.to,
      arriveDateTimeFormat: moment(flightInfo.arrTime, "YYYYMMDDHHmm").format(
        "YYYY-MM-DDTHH:mm:ss"
      ),
      flightTripTitle: `${this.params.from}-${this.params.to}`,
      duration: timeHelper.diffTime(flightInfo.depTime, flightInfo.arrTime),
      flightSegments: [
        {
          segmentId: helper.GUID(),
          dDateTime: "2024-01-25T10:45:00+08:00",
          aDateTime: "2024-01-25T15:00:00+08:00",
          dCityInfo: {
            code: "CAN",
            name: "CAN",
          },
          aCityInfo: {
            code: "SIN",
            name: "SIN",
          },
          dPortInfo: {
            code: "CAN",
            name: "CAN",
            terminal: "",
          },
          aPortInfo: {
            code: "SIN",
            name: "SIN",
            terminal: "",
          },
          acrossDays: 0,
          airlineInfo: {
            code: "TR",
            name: "TR",
            isLCC: true,
          },
          craftInfo: {
            name: "",
            minSeats: 0,
            maxSeats: 36,
            widthLevel: "",
            craftType: null,
          },
          cabinClass: "Economy",
          subClass: "H",
          durationInfo: {
            hour: "4",
            min: "15",
          },
          stopInfoList: [],
          flightNo: "101",
          segmentNo: 1,
        },
      ],
    };
  }
};
