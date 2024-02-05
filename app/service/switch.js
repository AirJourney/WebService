'use strict';

const Service = require('egg').Service;
const moment = require('moment');

class SwitchService extends Service {
  /**
   * 确认需要查询的渠道列表
   *
   * @param {*} payload
   * @return {*}
   * @memberof SwitchService
   */
  async identifySearchChannels(payload) {
    const { ctx, service } = this;
    /** 取出查询条件 */
    const { flightType, tripSearch, cabinType } = payload;
    // 判断tripSearch是否为数组
    if (!tripSearch || !Array.isArray(tripSearch) || tripSearch.length === 0) {
      ctx.logger.info(`tripSearch is error. ${tripSearch}`);
      return;
    }
    const { depart, arrive, departTime } = tripSearch[0];
    /** 查询sellfight库，匹配出对应的结果集 */
    const sellFightList = await this.ctx.model.Sellfight.find({
      tripType: flightType,
      depart,
      arrival: arrive,
    });

    const matchedSellFightList = [];
    /** 按起飞时间筛选匹配的结果集 */
    sellFightList.forEach(sellFlight => {
      const { startDays, endDays } = sellFlight;
      const startDate = moment().add(startDays, 'd');
      const endDate = moment().add(endDays, 'd');

      if (moment(departTime).isBetween(moment(startDate), moment(endDate))) {
        /** 取出GDS，GDSBooking，IPCC，group */
        const { GDS, GDSBooking, IPCC, group } = sellFlight;
        matchedSellFightList.push({
          flightType,
          tripSearch,
          cabinType,
          GDS,
          GDSBooking,
          IPCC,
          group,
        });
      }
    });

    return matchedSellFightList;
  }

  async multipleSearch(asyncSearchList) {
    // 存储成功返回的结果
    const successfulResults = [];
    const requestPromises = [];
    // 发送所有的异步请求，并记录每个请求的索引
    for (let i = 0; i < asyncSearchList.length; i++) {
      const request = asyncSearchList[i];
      const requestPromise = (async () => {
        try {
          const result = await request(); // 发送异步请求
          return { index: i, result };
        } catch (error) {
          return { index: i, error };
        }
      })();
      requestPromises.push(requestPromise);
    }
    // 使用Promise.all等待所有请求完成或6秒超时
    await Promise.all(
      requestPromises.map(promise => {
        return Promise.race([
          promise,
          new Promise(resolve => setTimeout(resolve, 6000, 'timeout')),
        ]);
      })
    )
      .then(responses => {
        // 处理成功返回的响应
        responses.forEach(response => {
          if (response !== 'timeout' && response.result) {
            successfulResults.push(response.result);
          }
        });

        // 打印成功返回的内容
        console.log('Successful results:', successfulResults);
      })
      .catch(error => {
        console.error('Error:', error);
      });

    return successfulResults;
  }

  // TODO: 暂不可用
  async requestGalileo(galileoReqList, body) {
    const flightList = await this.service.flight.getFlightInfoList(
      body
    );
    if (flightList && flightList.length > 0) {
      this.refreshGalileo(galileoReqList, body.tripSearch);
      return flightList;
    }
    await this.refreshGalileo(galileoReqList, body.tripSearch, true);
    return this.service.flight.getFlightInfoList(
      body
    );
  }

  async refreshGalileo(galileoReqList, tripSearch, isAsync = false) {
    const seenIPCC = new Set();
    const asyncSearchList = [];
    for (const galileoReq of galileoReqList) {
      if (!seenIPCC.has(galileoReq.IPCC)) {
        seenIPCC.add(galileoReq.IPCC);
        asyncSearchList.push(async () => {
          const result = await this.service.flight.refreshFlightCache(tripSearch, true, galileoReq.IPCC);
          return result;
        });
      }
    }
    if (isAsync) {
      const responseList = await Promise.allSettled(asyncSearchList.map(promise => {
        return Promise.race([
          promise,
          new Promise(resolve => setTimeout(resolve, 6000, 'timeout')),
        ]);
      }));
      return responseList.filter(response => response.status === 'fulfilled' && response.value !== 'timeout');
    }
    Promise.allSettled(asyncSearchList.map(promise => promise()));
  }


  async externalCheck(checkUrl, checkRequest) {
    const { ctx, service } = this;
    const result = await ctx.curl(checkUrl, {
      method: 'POST',
      contentType: 'json',
      data: checkRequest,
      dataType: 'json',
      timeout: 8000,
    });

    return result;
  }

  async externalBooking(bookingUrl, bookingRequest) {
    const { ctx } = this;
    const result = await ctx.curl(bookingUrl, {
      method: 'POST',
      contentType: 'json',
      data: bookingRequest,
      dataType: 'json',
      timeout: 8000,
    });

    return result;
  }

  async externalTicket(ticketUrl, ticketRequest) {
    const { ctx, service } = this;
    const result = await ctx.curl(ticketUrl, {
      method: 'POST',
      contentType: 'json',
      data: ticketRequest,
      dataType: 'json',
      timeout: 8000,
    });

    return result;
  }

  async externalChange(changeUrl, changeRequest) {
    const { ctx, service } = this;
    const result = await ctx.curl(changeUrl, {
      method: 'POST',
      contentType: 'json',
      data: changeRequest,
      dataType: 'json',
      timeout: 10000,
    });

    return result;
  }


  async booking() {
    const { ctx, service } = this;
    const { IPCC, group } = ctx.request.body;

    /** 根据group和IPCC获取对应的check 地址 */
    const bookingUrl = await service.ipcc.getIPCC({
      group,
      IPCC,
      apiType: 'bookingApi',
    });

    if (!bookingUrl) {
      return;
    }
    if (bookingUrl !== '') {
      /** 调用外部接口 */
      const { shoppingId, flightPassengerList } = ctx.request.body;
      const bookingResult = await this.externalBooking(
        bookingUrl,
        {
          shoppingId,
          passenger: flightPassengerList.map(passenger => ({
            lastName: passenger.givenName,
            firstName: passenger.surName,
            passCountry: passenger.nationality,
            passNumber: passenger.cardNo,
            birthDate: passenger.birthDay,
            gender: passenger.gender === 'female' ? 'F' : 'M',
            ageCategory: passenger.travelerType,
          })),
        },
        12000
      );
      return bookingResult;
    }
  }

  async ticket({ orderId, group, IPCC }) {
    /** 调用外部接口 */
    const orderInfo = await this.service.order.getAllOrder(orderId, null, group);
    if (!orderInfo || orderInfo.length === 0) {
      return;
    }
    const { shoppingId, passengerList, clientTime } = orderInfo[0];

    const ticketUrl = await this.service.ipcc.getIPCC({
      group,
      IPCC,
      apiType: 'ticketApi',
    });

    if (!ticketUrl) {
      return;
    }
    const passenger = [];
    passengerList.forEach(passengerItem => {
      passenger.push({
        lastName: passengerItem.givenName,
        firstName: passengerItem.surName,
        passCountry: passengerItem.nationality,
        passNumber: passengerItem.cardNo,
        birthDate: passengerItem.birthDay,
        gender: passengerItem.gender,
        ageCategory: passengerItem.travelerType,
      });
    });

    const ticketResult = await this.externalTicket(
      ticketUrl,
      {
        shoppingId,
        orderId,
        passenger,
        clientTime,
      },
      12000
    );
    if (
      ticketResult.status &&
      ticketResult.data &&
      ticketResult.data.content &&
      ticketResult.data.content.length > 0 &&
      ticketResult.data.content[0].orderId === orderId &&
      ticketResult.data.content[0].passengers &&
      ticketResult.data.content[0].passengers.length > 0
    ) {
      const updateTicketRes = await this.service.order.updateOrderTicket({
        orderInfo: orderInfo[0],
        ticketList: ticketResult.data.content[0].passengers,
      });
      return updateTicketRes;
    }
  }
}

module.exports = SwitchService;
