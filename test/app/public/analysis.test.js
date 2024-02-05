'use strict';
const { analysisSegment } = require('../../../app/public/analysis');
describe('test/app/public/analysis.test.js', () => {

  it('parse segment', () => {
    const testSegment1 = '1725(+8)-0435-TG-665-E&T-PVG-T2-BKK-T0-1-359-TOWOFX-2100(+7)-P3570601|117.00-66.36-88.00-66.36-88.00-66.36';
    const testSegment2 = '1725-0435-TG-665-E&T-PVG-T2-BKK-T0-1-359-TOWOFX-P3570601|117.00-66.36-88.00-66.36-88.00-66.36';
    const date = '2023-09-20';
    console.log(analysisSegment(testSegment1, date));
    console.log(analysisSegment(testSegment2, date));
    return true;
  });
});
