"use strict";

const Service = require("egg").Service;

class SaleFightService extends Service {
  async exportSaleFlight(payload) {
    const { saleFlightList, prohibitionList } = payload;
    // 任务1: 剔除禁售航线
    let filteredSaleFlightList = saleFlightList;
    if (prohibitionList.length !== 0) {
      filteredSaleFlightList = saleFlightList.filter((saleFlight) => {
        const isProhibited = prohibitionList.some(
          (prohibition) =>
            prohibition.isProhibition &&
            prohibition.tripType === saleFlight.tripType &&
            prohibition.depart === saleFlight.depart &&
            prohibition.arrival === saleFlight.arrival &&
            prohibition.IPCC &&
            prohibition.IPCC.split(",").includes(saleFlight.IPCC) &&
            prohibition.group === saleFlight.group
        );
        return !isProhibited;
      });
    }

    // 任务2: 整理 saleFlightList
    const groupedSaleFlights = filteredSaleFlightList.reduce((acc, item) => {
      const key = `${item.depart}-${item.arrival}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});

    // 对每个组按照 startDays 升序和 endDays 降序进行排序
    Object.values(groupedSaleFlights).forEach((group) => {
      group.sort((a, b) => {
        if (a.startDays !== b.startDays) {
          return a.startDays - b.startDays; // startDays 小的在前
        }
        return b.endDays - a.endDays; // endDays 大的在前
      });
    });

    const transformedSaleFlightList = Object.values(groupedSaleFlights).flatMap(
      (group) => {
        // 取每个组的第一个航班，即 startDays 最小和 endDays 最大的航班
        const optimalFlight = group[0];
        const hasRT = group.some((item) => item.tripType === "RT");
        if (hasRT) {
          return group.filter(
            (item) =>
              item.tripType === "RT" &&
              item.depart === optimalFlight.depart &&
              item.arrival === optimalFlight.arrival
          )[0];
        }
        return group.filter(
          (item) =>
            item.tripType === "OW" &&
            item.depart === optimalFlight.depart &&
            item.arrival === optimalFlight.arrival
        )[0];
      }
    );

    return transformedSaleFlightList;
  }

  getProhibitionList({ tripType, from, to }) {
    return this.ctx.model.Prohibition.find({
      tripType,
      depart: from,
      arrival: to,
      isValid: true,
      isProhibition: true,
    });
  }
}

module.exports = SaleFightService;
