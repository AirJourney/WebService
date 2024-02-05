'use strict';

const Service = require('egg').Service;

class RevenueService extends Service {
  async getRevenueListByGroup(payload) {
    const { groupList, carrierType } = payload;

    /** groupList 结构
     * [
     *  {
     *    group,
     *    IPCCList:
     *      [
     *        IPCC
     *      ]
     *  }
     * ]
     */

    /** 聚合多个group下的多个IPCC结果
     *  in IPCCList
     *  where group
     */

    for (let i = 0; i < groupList.length; i++) {
      const groupInfo = groupList[i];
      const query = {
        isValid: true,
        IPCC: { $in: groupInfo.IPCCList },
        group: groupInfo.group,
      };
      if (carrierType) {
        query.carrierType = carrierType;
      }
      groupInfo.revenueList = await this.ctx.model.Revenue.find(query);
    }


    return groupList;
  }

  analysisRevenue(sellFlightRes, matchedRevenue, passenger) {
    const { revenueType } = matchedRevenue;

    const policyDetailInfo = sellFlightRes.policyDetailInfo;

    sellFlightRes.policyDetailInfo.revenueInfo = matchedRevenue;

    /** 一口价 */
    if (revenueType === 'fixed') {
      policyDetailInfo.adultPrice.salePrice = (
        Number(policyDetailInfo.adultPrice.salePrice) +
        matchedRevenue.fixedPrice
      ).toString();
      policyDetailInfo.childPrice.salePrice = (
        Number(policyDetailInfo.childPrice.salePrice) +
        matchedRevenue.fixedPrice
      ).toString();
      policyDetailInfo.infantPrice.salePrice = (
        Number(policyDetailInfo.infantPrice.salePrice) +
        matchedRevenue.fixedPrice
      ).toString();

      policyDetailInfo.adultPrice.tax = (
        Number(policyDetailInfo.adultPrice.tax) + matchedRevenue.fixedTax
      ).toString();
      policyDetailInfo.childPrice.tax = (
        Number(policyDetailInfo.childPrice.tax) + matchedRevenue.fixedTax
      ).toString();
      policyDetailInfo.infantPrice.tax = (
        Number(policyDetailInfo.infantPrice.tax) + matchedRevenue.fixedTax
      ).toString();

      // 根据passenger 和 乘客价格 计算总价和平均价
      let totalPrice = 0;
      passenger.forEach(p => {
        if (p.flag === 'ADT' && p.count > 0) {
          totalPrice +=
            (Number(policyDetailInfo.adultPrice.salePrice) +
              Number(policyDetailInfo.adultPrice.tax)) *
            p.count;
        } else if (p.flag === 'CHD' && p.count > 0) {
          totalPrice +=
            (Number(policyDetailInfo.childPrice.salePrice) +
              Number(policyDetailInfo.childPrice.tax)) *
            p.count;
        } else if (p.flag === 'INF' && p.count > 0) {
          totalPrice +=
            (Number(policyDetailInfo.infantPrice.salePrice) +
              Number(policyDetailInfo.infantPrice.tax)) *
            p.count;
        }
      });

      policyDetailInfo.totalPrice = totalPrice.toFixed(0).toString();

      policyDetailInfo.avgPrice = (
        totalPrice / passenger.reduce((total, p) => total + p.count, 0)
      )
        .toFixed(0)
        .toString();
    } else if (revenueType === 'percent') {
      const { percent, trim } = matchedRevenue;
      const calculatePrice = (price, needTrim = false) => {
        return ((Number(price) * Number(percent)) / 100 + (needTrim ? trim : 0))
          .toFixed(0)
          .toString();
      };

      policyDetailInfo.adultPrice.salePrice = calculatePrice(
        policyDetailInfo.adultPrice.salePrice,
        true
      ); // 成人价需要计算trim
      policyDetailInfo.adultPrice.tax = calculatePrice(
        policyDetailInfo.adultPrice.tax
      );
      policyDetailInfo.childPrice.salePrice = calculatePrice(
        policyDetailInfo.childPrice.salePrice
      );
      policyDetailInfo.childPrice.tax = calculatePrice(
        policyDetailInfo.childPrice.tax
      );
      policyDetailInfo.infantPrice.salePrice = calculatePrice(
        policyDetailInfo.infantPrice.salePrice
      );
      policyDetailInfo.infantPrice.tax = calculatePrice(
        policyDetailInfo.infantPrice.tax
      );

      policyDetailInfo.avgPrice = calculatePrice(
        policyDetailInfo.avgPrice,
        true
      );
      policyDetailInfo.totalPrice = calculatePrice(
        policyDetailInfo.totalPrice,
        true
      ); // 总价需要计算trim
    }
  }

  async calculateRevenue(matchedRevenue,passenger,policyDetailInfo){
    const { revenueType } = matchedRevenue;
     /** 一口价 */
     if (revenueType === 'fixed') {
      policyDetailInfo.adultPrice.salePrice = (
        Number(policyDetailInfo.adultPrice.salePrice) +
        matchedRevenue.fixedPrice
      ).toString();
      policyDetailInfo.childPrice.salePrice = (
        Number(policyDetailInfo.childPrice.salePrice) +
        matchedRevenue.fixedPrice
      ).toString();
      policyDetailInfo.infantPrice.salePrice = (
        Number(policyDetailInfo.infantPrice.salePrice) +
        matchedRevenue.fixedPrice
      ).toString();

      policyDetailInfo.adultPrice.tax = (
        Number(policyDetailInfo.adultPrice.tax) + matchedRevenue.fixedTax
      ).toString();
      policyDetailInfo.childPrice.tax = (
        Number(policyDetailInfo.childPrice.tax) + matchedRevenue.fixedTax
      ).toString();
      policyDetailInfo.infantPrice.tax = (
        Number(policyDetailInfo.infantPrice.tax) + matchedRevenue.fixedTax
      ).toString();

      // 根据passenger 和 乘客价格 计算总价和平均价
      let totalPrice = 0;
      passenger.forEach(p => {
        if (p.flag === 'ADT' && p.count > 0) {
          totalPrice +=
            (Number(policyDetailInfo.adultPrice.salePrice) +
              Number(policyDetailInfo.adultPrice.tax)) *
            p.count;
        } else if (p.flag === 'CHD' && p.count > 0) {
          totalPrice +=
            (Number(policyDetailInfo.childPrice.salePrice) +
              Number(policyDetailInfo.childPrice.tax)) *
            p.count;
        } else if (p.flag === 'INF' && p.count > 0) {
          totalPrice +=
            (Number(policyDetailInfo.infantPrice.salePrice) +
              Number(policyDetailInfo.infantPrice.tax)) *
            p.count;
        }
      });

      policyDetailInfo.totalPrice = totalPrice.toFixed(0).toString();

      policyDetailInfo.avgPrice = (
        totalPrice / passenger.reduce((total, p) => total + p.count, 0)
      )
        .toFixed(0)
        .toString();
    } else if (revenueType === 'percent') {
      const { percent, trim } = matchedRevenue;
      const calculatePrice = (price, needTrim = false) => {
        return ((Number(price) * Number(percent)) / 100 + (needTrim ? trim : 0))
          .toFixed(0)
          .toString();
      };

      policyDetailInfo.adultPrice.salePrice = calculatePrice(
        policyDetailInfo.adultPrice.salePrice,
        true
      ); // 成人价需要计算trim
      policyDetailInfo.adultPrice.tax = calculatePrice(
        policyDetailInfo.adultPrice.tax
      );
      policyDetailInfo.childPrice.salePrice = calculatePrice(
        policyDetailInfo.childPrice.salePrice
      );
      policyDetailInfo.childPrice.tax = calculatePrice(
        policyDetailInfo.childPrice.tax
      );
      policyDetailInfo.infantPrice.salePrice = calculatePrice(
        policyDetailInfo.infantPrice.salePrice
      );
      policyDetailInfo.infantPrice.tax = calculatePrice(
        policyDetailInfo.infantPrice.tax
      );

      policyDetailInfo.avgPrice = calculatePrice(
        policyDetailInfo.avgPrice,
        true
      );
      policyDetailInfo.totalPrice = calculatePrice(
        policyDetailInfo.totalPrice,
        true
      ); // 总价需要计算trim
    }

  }
}

module.exports = RevenueService;
