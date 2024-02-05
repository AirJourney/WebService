'use strict';

const Controller = require('egg').Controller;
const helper = require('../extend/helper');
const moment = require('moment');

class ProfitController extends Controller {
  async createProfit() {
    const { ctx, service } = this;
    const result = await service.info.createProfit(ctx.request.body);
    helper.ResFormat(this.ctx, '', true, 'profit success', result);
  }

  /**
   * 获取热门城市（下拉框使用）
   */
  async getHotLine() {
    const { ctx } = this;
    const { flightType, from } = ctx.request.body;
    let hotlineList = [];
    if (flightType === 'OW') {
      hotlineList = require('../data/new-ow.json');
    } else {
      hotlineList = require('../data/new-rt.json');
    }
    const stationSet = new Set();
    if (!from || from === '') {
      // 取去程目的地set
      hotlineList.forEach(h => {
        stationSet.add(h.from);
      });
    } else {
      // 取回程匹配的目的地set
      hotlineList.forEach(h => {
        if (h.from === from) {
          stationSet.add(h.to);
        }
      });
    }
    helper.ResFormat(
      this.ctx,
      '',
      true,
      'hotline success',
      Array.from(stationSet)
    );
  }

  async getFlightProfit() {
    const { ctx, service } = this;
    const { flightType, from, to, dateStart, dateEnd } = ctx.request.body;
    /** Redis 查询出的结果 */
    const flightProfitList = await ctx.service.segment.getRedisList(
      flightType,
      from + to,
      dateStart,
      dateEnd
    );

    const profitInfoList = [];
    if (flightType === 'OW') {
      let mDate = moment(dateStart);
      const mEndDate = moment(dateEnd);

      while (!mDate.isSame(mEndDate)) {
        const profitInfo = await service.info.getProfit({
          flightType,
          segment: from + to,
          number: '',
          company: '',
          cabin: '',
          date: mDate.format('MMDD'),
        });
        profitInfoList.push({
          date: mDate.format('MMDD'),
          profitInfo,
        });
        mDate = mDate.add(1, 'd');
      }
    } else {
      const mDate = moment(dateStart);
      const mEndDate = moment(dateEnd);
      const durationDays = mEndDate.diff(mDate, 'day');

      for (let i = 0; i < durationDays; i++) {
        const fromDate = moment(dateStart).add(i, 'd');
        for (let j = 0; j < durationDays; j++) {
          const nextDate = moment(dateStart).add(j + 1, 'd');
          const profitInfo = await service.info.getProfit({
            flightType,
            segment: from + to,
            number: '',
            company: '',
            cabin: '',
            date: fromDate.format('MMDD') + '|' + nextDate.format('MMDD'),
          });
          profitInfoList.push({
            date: fromDate.format('MMDD') + '|' + nextDate.format('MMDD'),
            profitInfo,
          });
        }
      }
    }

    flightProfitList.forEach(f => {
      if (profitInfoList.filter(p => p.date === f.date).length > 0) {
        const matchResultPercent = service.profit.matchProfit(
          profitInfoList.filter(p => p.date === f.date)[0].profitInfo,
          f.number,
          f.company,
          f.cabin
        );
        f.percent = matchResultPercent;

      }
    });

    helper.ResFormat(
      this.ctx,
      '',
      true,
      'flightProfitList success',
      flightProfitList
    );
  }

  async updateProfit() {
    const { ctx, service } = this;
    const {
      _id,
      company,
      date,
      flightType,
      number,
      segment, cabin, percent } = ctx.request.body;
    const updatedProfitInfo = await service.profit.updateProfit({
      _id,
      company,
      date,
      flightType,
      number,
      segment, cabin, percent });
    if (updatedProfitInfo) {
      helper.ResFormat(
        this.ctx,
        '',
        true,
        'profit updated success',
        updatedProfitInfo
      );
    } else {
      helper.ResFormat(
        this.ctx,
        '',
        false,
        'profit updated success',
        null
      );
    }

  }
}

module.exports = ProfitController;
