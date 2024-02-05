'use strict';

const Service = require('egg').Service;
const {
  resolverFlightInfo,
  resolverTripInfo,
  assemblyPenalty,
} = require('../public/segment');
const timeHelper = require('../extend/time');
const helper = require('../extend/helper');

class PenaltyService extends Service {
  generatePenaltyInfo(penaltyList, eachFlightData, checkInDate) {
    const { policyDetailInfo } = eachFlightData;
    const adultPrice = policyDetailInfo.adultPrice.base + policyDetailInfo.adultPrice.tax;
    const childPrice = policyDetailInfo.childPrice.base + policyDetailInfo.childPrice.tax;
    const infantPrice = policyDetailInfo.infantPrice.base + policyDetailInfo.infantPrice.tax;

    let matchedPenalty = null;
    if (penaltyList && penaltyList.length > 0) {
      penaltyList.some(penalty => {
        if (penalty.dateStart && penalty.dateEnd && !timeHelper.between(checkInDate, penalty.dateStart, penalty.dateEnd)) {
          return false;
        }
        if (penalty.company && penalty.company !== eachFlightData.company) return false;
        if (penalty.number && !penalty.number.includes(eachFlightData.number)) return false;
        if (penalty.cabin && !penalty.cabin.includes(eachFlightData.subClass)) return false;
        matchedPenalty = penalty;
        return false;
      });
    }
    // both、bothNever、onlyRefund、onlyChange
    let allowCancel = false;
    let allowChange = false;
    if (matchedPenalty) {
      const { penaltyType } = matchedPenalty;
      allowCancel = penaltyType === 'both' || penaltyType === 'onlyRefund';
      allowChange = penaltyType === 'both' || penaltyType === 'onlyChange';
    }
    return [{
      cancelInfo: {
        formatted: {
          adultList: [
            {
              specialText: (allowCancel ? matchedPenalty.refundBeforePercentFWT * adultPrice : -1).toString(),
              timeText: 'Before departure',
              specialType: 0,
            },
            {
              specialText: (allowCancel ? matchedPenalty.refundAfterPercentFWT * adultPrice : -1).toString(),
              timeText: 'After departure',
              specialType: 0,
            },
          ],
          childList: [
            {
              specialText: (allowCancel ? matchedPenalty.refundBeforePercentFWT * childPrice : -1).toString(),
              timeText: 'Before departure',
              specialType: 0,
            },
            {
              specialText: (allowCancel ? matchedPenalty.refundAfterPercentFWT * childPrice : -1).toString(),
              timeText: 'After departure',
              specialType: 0,
            },
          ],
          infantList: [
            {
              specialText: (allowCancel ? matchedPenalty.refundBeforePercentFWT * infantPrice : -1).toString(),
              timeText: 'Before departure',
              specialType: 0,
            },
            {
              specialText: (allowCancel ? matchedPenalty.refundAfterPercentFWT * infantPrice : -1).toString(),
              timeText: 'After departure',
              specialType: 0,
            },
          ],
        },
      },
      changeInfo: {
        formatted: {
          adultList: [
            {
              specialText: (allowChange ? matchedPenalty.changeBeforePercentFWT * adultPrice : -1).toString(),
              timeText: 'Before departure',
              specialType: 0,
            },
            {
              specialText: (allowChange ? matchedPenalty.changeAfterPercentFWT * adultPrice : -1).toString(),
              timeText: 'After departure',
              specialType: 0,
            },
          ],
          childList: [
            {
              specialText: (allowChange ? matchedPenalty.changeBeforePercentFWT * childPrice : -1).toString(),
              timeText: 'Before departure',
              specialType: 0,
            },
            {
              specialText: (allowChange ? matchedPenalty.changeAfterPercentFWT * childPrice : -1).toString(),
              timeText: 'After departure',
              specialType: 0,
            },
          ],
          infantList: [
            {
              specialText: (allowChange ? matchedPenalty.changeBeforePercentFWT * infantPrice : -1).toString(),
              timeText: 'Before departure',
              specialType: 0,
            },
            {
              specialText: (allowChange ? matchedPenalty.changeAfterPercentFWT * infantPrice : -1).toString(),
              timeText: 'After departure',
              specialType: 0,
            },
          ],
        },
      },
      penaltyInfo: matchedPenalty,
    }];
  }

  async getDefaultPenalty(group) {
    const defaultPenalty = await this.ctx.model.Penalty.find({
      flightType: '',
      segment: '',
      isValid: true,
      group,
    });
    if (!defaultPenalty || defaultPenalty.length === 0) {
      return null;
    }
    return defaultPenalty[0];
  }

  async getFlightPenalty(flightType, tripSearch, flightGroupInfo, group) {
    if (!flightGroupInfo || !flightType) {
      return null;
    }

    const flightInfo = resolverFlightInfo(flightGroupInfo);
    if (flightInfo == null) {
      return null;
    }

    const { company, cabin, number, dateStart } = flightInfo;

    const { depart, arrive } = resolverTripInfo(tripSearch);

    let penaltyList = [];
    // 查询对应的扣率
    if (flightType === 'OW') {
      penaltyList = await this.ctx.model.Penalty.find({
        flightType,
        segment: `${depart}-${arrive}`,
        isValid: true,
        group,
      });
    } else {
      const forwardPenaltyList = await this.ctx.model.Penalty.find({
        flightType,
        segment: `${depart}-${arrive}`,
        isValid: true,
        group,
      });

      const backwardPenaltyList = await this.ctx.model.Penalty.find({
        flightType,
        segment: `${arrive}-${depart}`,
        isValid: true,
        group,
      });

      if (forwardPenaltyList.length > 0) {
        penaltyList = forwardPenaltyList;
      } else {
        penaltyList = backwardPenaltyList;
      }
    }

    if (penaltyList.length === 0) {
      return null;
    }

    // 时间段匹配的扣率政策集合
    const dateMatchPenaltyList = penaltyList.filter(p =>
      timeHelper.betweenMoment(dateStart, p.dateStart, p.dateEnd)
    );
    if (dateMatchPenaltyList.length > 0) {
      const filterOneKey = (companyAdj, cabinAdj, numberAdj) => {
        const filterList = dateMatchPenaltyList.filter(
          p =>
            (companyAdj ? p.company.includes(company) : p.company === '') &&
            (cabinAdj ? p.cabin.includes(cabin) : p.cabin === '') &&
            (numberAdj ? p.number.includes(number) : p.number === '')
        );
        if (filterList.length > 0) {
          return filterList[0];
        }
        return null;
      };

      /** 通用扣率 */
      const normalMatchPenaltyList = dateMatchPenaltyList.filter(
        p => p.company === '' && p.cabin === '' && p.number === ''
      );

      // 全匹配的扣率政策集合
      if (
        dateMatchPenaltyList.filter(
          p =>
            p.company.includes(company) &&
            p.cabin.includes(cabin) &&
            p.number.includes(number)
        ).length > 0
      ) {
        /** com & cab & num */
        return dateMatchPenaltyList.filter(
          p =>
            p.company.includes(company) &&
            p.cabin.includes(cabin) &&
            p.number.includes(number)
        )[0];
      } else if (filterOneKey(true, true, false)) {
        /** com & cab & !num */
        return filterOneKey(true, true, false);
      } else if (filterOneKey(false, true, true)) {
        /** !com & cab & num */
        return filterOneKey(false, true, true);
      } else if (filterOneKey(true, false, true)) {
        /** com & !cab & num */
        return filterOneKey(true, false, true);
      } else if (filterOneKey(false, false, true)) {
        /** !com & !cab & num */
        return filterOneKey(false, false, true);
      } else if (filterOneKey(false, true, false)) {
        /** !com & cab & !num */
        return filterOneKey(false, true, false);
      } else if (filterOneKey(true, false, false)) {
        /** com & !cab & !num */
        return filterOneKey(true, false, false);
      }
      if (normalMatchPenaltyList.length > 0) {
        return normalMatchPenaltyList[0];
      }
      return null;
    }
    return null;
  }

  calculatePenaltyInfo(penaltyInfo, priceInfo) {
    const { adultPrice, childPrice, infantPrice } = priceInfo;
    const adtTotalPrice = helper.calculateAdd(
      adultPrice.salePrice,
      adultPrice.tax
    );
    const chdTotalPrice = helper.calculateAdd(
      childPrice.salePrice,
      childPrice.tax
    );
    const infTotalPrice = helper.calculateAdd(
      infantPrice.salePrice,
      infantPrice.tax
    );

    const penaltyAnalysisInfo = {
      adtBCXL: '-1',
      adtACXL: '-1',
      adtBCHG: '-1',
      adtACHG: '-1',
      chdBCXL: '-1',
      chdACXL: '-1',
      chdBCHG: '-1',
      chdACHG: '-1',
      infBCXL: '-1',
      infACXL: '-1',
      infBCHG: '-1',
      infACHG: '-1',
      noCXL: false,
      noCHG: false,
      isNoShow: false, // RT时为true,使用noShow字段
      noShow: '-1',
    };

    /** 外部控制往返程退改比例 */
    const {
      penaltyType,
      refundBeforePercent,
      refundAfterPercent,
      changeBeforePercent,
      changeAfterPercent,
      abandonRTPercent,
    } = penaltyInfo;

    switch (penaltyType) {
      case 'bothNever':
        penaltyAnalysisInfo.noCXL = true;
        penaltyAnalysisInfo.noCHG = true;
        break;
      case 'both':
        penaltyAnalysisInfo.noCXL = false;
        penaltyAnalysisInfo.noCHG = false;

        penaltyAnalysisInfo.adtBCXL = helper
          .calculatePrice(adtTotalPrice, refundBeforePercent, 100)
          .toString();
        penaltyAnalysisInfo.adtACXL = helper
          .calculatePrice(adtTotalPrice, refundAfterPercent, 100)
          .toString();
        penaltyAnalysisInfo.adtBCHG = helper
          .calculatePrice(adtTotalPrice, changeBeforePercent, 100)
          .toString();
        penaltyAnalysisInfo.adtACHG = helper
          .calculatePrice(adtTotalPrice, changeAfterPercent, 100)
          .toString();

        penaltyAnalysisInfo.chdBCXL = helper
          .calculatePrice(chdTotalPrice, refundBeforePercent, 100)
          .toString();
        penaltyAnalysisInfo.chdACXL = helper
          .calculatePrice(chdTotalPrice, refundAfterPercent, 100)
          .toString();
        penaltyAnalysisInfo.chdBCHG = helper
          .calculatePrice(chdTotalPrice, changeBeforePercent, 100)
          .toString();
        penaltyAnalysisInfo.chdACHG = helper
          .calculatePrice(chdTotalPrice, changeAfterPercent, 100)
          .toString();

        penaltyAnalysisInfo.infBCXL = helper
          .calculatePrice(infTotalPrice, refundBeforePercent, 100)
          .toString();
        penaltyAnalysisInfo.infACXL = helper
          .calculatePrice(infTotalPrice, refundAfterPercent, 100)
          .toString();
        penaltyAnalysisInfo.infBCHG = helper
          .calculatePrice(infTotalPrice, changeBeforePercent, 100)
          .toString();
        penaltyAnalysisInfo.infACHG = helper
          .calculatePrice(infTotalPrice, changeAfterPercent, 100)
          .toString();
        break;
      case 'onlyRefund':
        penaltyAnalysisInfo.noCXL = false;
        penaltyAnalysisInfo.noCHG = true;

        penaltyAnalysisInfo.adtBCXL = helper
          .calculatePrice(adtTotalPrice, refundBeforePercent, 100)
          .toString();
        penaltyAnalysisInfo.adtACXL = helper
          .calculatePrice(adtTotalPrice, refundAfterPercent, 100)
          .toString();

        penaltyAnalysisInfo.chdBCXL = helper
          .calculatePrice(chdTotalPrice, refundBeforePercent, 100)
          .toString();
        penaltyAnalysisInfo.chdACXL = helper
          .calculatePrice(chdTotalPrice, refundAfterPercent, 100)
          .toString();

        penaltyAnalysisInfo.infBCXL = helper
          .calculatePrice(infTotalPrice, refundBeforePercent, 100)
          .toString();
        penaltyAnalysisInfo.infACXL = helper
          .calculatePrice(infTotalPrice, refundAfterPercent, 100)
          .toString();
        break;
      case 'onlyChange':
        penaltyAnalysisInfo.noCXL = true;
        penaltyAnalysisInfo.noCHG = false;

        penaltyAnalysisInfo.adtBCHG = helper
          .calculatePrice(adtTotalPrice, changeBeforePercent, 100)
          .toString();
        penaltyAnalysisInfo.adtACHG = helper
          .calculatePrice(adtTotalPrice, changeAfterPercent, 100)
          .toString();

        penaltyAnalysisInfo.chdBCHG = helper
          .calculatePrice(chdTotalPrice, changeBeforePercent, 100)
          .toString();
        penaltyAnalysisInfo.chdACHG = helper
          .calculatePrice(chdTotalPrice, changeAfterPercent, 100)
          .toString();

        penaltyAnalysisInfo.infBCHG = helper
          .calculatePrice(infTotalPrice, changeBeforePercent, 100)
          .toString();
        penaltyAnalysisInfo.infACHG = helper
          .calculatePrice(infTotalPrice, changeAfterPercent, 100)
          .toString();
        break;
      default:
        break;
    }

    if (abandonRTPercent) {
      penaltyAnalysisInfo.isNoShow = true;
      penaltyAnalysisInfo.noShow = helper
        .calculatePrice(adtTotalPrice, abandonRTPercent, 100)
        .toString();
    }
    penaltyAnalysisInfo.penaltyInfo = penaltyInfo;
    return penaltyAnalysisInfo;
  }

  async analysisPenalty(
    flightType,
    tripSearch,
    flightDetail,
    group = 'LLTrip'
  ) {
    /** 退改政策开关 */
    const penaltySwitch = await this.service.info.getConfig('penaltySwitch');

    /** 默认退改政策 */
    const defaultPenalty = await this.getDefaultPenalty(group);
    if (!defaultPenalty) {
      return;
    }

    /** 根据条件拼装计算退改价格所需要的传参 */
    const installPenaltyInfo = (isBWT, matchPenalty) => {
      const penaltyInfo = {
        penaltyType: matchPenalty.penaltyType,
        refundBeforePercent: isBWT
          ? matchPenalty.refundBeforePercentBWT
          : matchPenalty.refundBeforePercentFWT,
        refundAfterPercent: isBWT
          ? matchPenalty.refundAfterPercentBWT
          : matchPenalty.refundAfterPercentFWT,
        changeBeforePercent: isBWT
          ? matchPenalty.changeBeforePercentBWT
          : matchPenalty.changeBeforePercentFWT,
        changeAfterPercent: isBWT
          ? matchPenalty.changeAfterPercentBWT
          : matchPenalty.changeAfterPercentFWT,
        abandonRTPercent:
          flightType === 'RT' ? matchPenalty.abandonRTPercent : null,
      };

      return penaltyInfo;
    };

    const penaltyInfoList = [];
    const { flightGroupInfoList, policyDetailInfo } = flightDetail;
    for (let index = 0; index < flightGroupInfoList.length; index++) {
      const flightGroupInfo = flightGroupInfoList[index];
      const isBWT = index === flightGroupInfoList.length - 1;

      switch (penaltySwitch) {
        case 'default': {
          const defaultPenaltyAnalysisInfo = this.calculatePenaltyInfo(
            installPenaltyInfo(isBWT, defaultPenalty),
            policyDetailInfo
          );
          penaltyInfoList.push(assemblyPenalty(defaultPenaltyAnalysisInfo));
          break;
        }
        case 'price': {
          let matchPenalty = null;
          const flightPenalty = await this.getFlightPenalty(
            flightType,
            tripSearch,
            flightGroupInfo,
            group
          );
          if (flightPenalty) {
            matchPenalty = flightPenalty;
          } else {
            matchPenalty = defaultPenalty;
          }

          const pricePenaltyAnalysisInfo = this.calculatePenaltyInfo(
            installPenaltyInfo(isBWT, matchPenalty),
            policyDetailInfo
          );
          penaltyInfoList.push(assemblyPenalty(pricePenaltyAnalysisInfo));

          break;
        }
        case 'gds':
          // assemblyPenalty(
          //     penaltyInfoList,
          //     penaltyString,
          //     currencyRate,
          //     c2eRateList
          //   );
          break;

        default: {
          /** 不退不改,noshow不退 */
          const penaltyAnalysisInfo = {
            adtBCXL: '-1',
            adtACXL: '-1',
            adtBCHG: '-1',
            adtACHG: '-1',
            chdBCXL: '-1',
            chdACXL: '-1',
            chdBCHG: '-1',
            chdACHG: '-1',
            infBCXL: '-1',
            infACXL: '-1',
            infBCHG: '-1',
            infACHG: '-1',
            noCXL: false,
            noCHG: false,
            isNoShow: false, // RT时为true,使用noShow字段
            noShow: '-1',
          };

          penaltyInfoList.push(assemblyPenalty(penaltyAnalysisInfo));
          break;
        }
      }
    }

    flightDetail.policyInfo.penaltyInfoList = penaltyInfoList;
  }
}

module.exports = PenaltyService;
