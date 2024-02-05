'use strict';
const moment = require('moment');


const getTime = (timeStr, timeType) => {
  const time = moment(timeStr);
  let timeResult = '';
  switch (timeType) {
    case 'H':
      timeResult =
        time.hour().toString().length < 2
          ? '0' + time.hour().toString()
          : time.hour().toString();
      break;
    case 'M':
      timeResult =
        time.minute().toString().length < 2
          ? '0' + time.minute().toString()
          : time.minute().toString();
      break;
    case 'Z':
      const timeZone = time.format('Z').split(':')[0];
      timeResult = `(${timeZone.substring(0, 1)}${Number(
        time.format('Z').split(':')[0].substring(1, 3)
      )})`;
      break;
    default:
      break;
  }
  return timeResult;
};

const diffTime = (t1, t2) => {
  t1 = moment(t1);
  t2 = moment(t2);
  const duration = t2.diff(t1, 'minute');
  let h = Math.floor(duration / 60); // 相差的小时数
  let m = duration % 60; // 计算相差小时后余下的分钟数
  h = h.toString().length < 2 ? '0' + h.toString() : h.toString();
  m = m.toString().length < 2 ? '0' + m.toString() : m.toString();
  // console.log(h + "-" + m);
  return {
    h,
    m,
  };
};

const addDay = i => {
  const newDay = moment().add(i, 'd').format('YYYY-MM-DD'); // 三月 28 号
  return newDay;
};

const timeAdd = (oriDate, addVal, addType, formatData) => {
  const momentTime = moment.parseZone(oriDate);
  const newMomentTime = momentTime.add(addVal, addType);
  const timeZone = momentTime.format('Z');
  return newMomentTime.utcOffset(timeZone).format(formatData);
};

const getAcrossDay = (dTime, aTime, dZone, aZone, diffTime) => {
  const dHour = Number(dTime.substr(0, 2)) * 60;
  const dMin = Number(dTime.substr(2, 2));
  // (az - dz) + diff + aT = dT
  const expectTime =
    (Number(aZone) - Number(dZone)) * 60 + diffTime + dHour + dMin;
  if (diffTime > 24) {
    // check是否一致
    if (
      Number(aTime.substr(0, 2)) * 60 + Number(aTime.substr(2, 2)) !==
      expectTime % 1440
    ) {
      console.log('needCheck', aTime, aZone, dTime, dZone, diffTime);
    }
  }
  if (expectTime >= 0) {
    return parseInt(expectTime / 1440);
  }
  return -1;
};

const acrossDay = (firDT, secDT) => {
  firDT = moment(firDT);
  secDT = moment(secDT);
  const firstDTNextDT = moment(firDT.add(1, 'd').format('YYYY-MM-DD 00:00:00'));
  const durationS2F = secDT.diff(firDT, 'minute');
  const durationN2F = firstDTNextDT.diff(firDT, 'minute');
  let acrossDayCount = 0;
  if (durationN2F < durationS2F) {
    // 跨天
    acrossDayCount = Math.floor((durationS2F - durationN2F) / 1440) + 1;
  }
  return acrossDayCount;
};

const momentDate = dateStr => {
  const currentDate = moment();
  const currentYear = currentDate.year();
  let year = currentYear;
  const targetDate = moment(
    `${year}-${dateStr.substr(0, 2)}-${dateStr.substr(2, 2)}`
  );

  if (targetDate.isBefore(currentDate)) {
    year = currentYear + 1;
  }

  const adjustedDate = moment(
    `${year}-${dateStr.substr(0, 2)}-${dateStr.substr(2, 2)}`
  );
  return adjustedDate;
};

const displayMoment = (dateStr, formatStr) => {
  let dateTime = null;
  if (!dateStr) {
    dateTime = moment();
  } else {
    dateTime = moment(dateStr);
  }
  return dateTime.format(formatStr);
};

const between = (now, start, end) => {
  const startDate = moment().add(start, 'd');
  const endDate = moment().add(end, 'd');
  return moment(now).isBetween(startDate, endDate, 'days', '[]');
};

const betweenMoment = (midDate, startDate, endDate, ...options) => {
  return moment(midDate).isBetween(
    moment(startDate),
    moment(endDate),
    ...options
  );
};

const formatDate = dateStr => {
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${year}-${month}-${day}`;
};

const nowDateTime = () => {
  return moment().format('YYYY-MM-DD HH:mm:ss');
};

const isTimeWithinInterval = (targetTime, compareTime, intervalMinutes) => {
  const parsedTargetTime = moment(targetTime, 'YYYY-MM-DD HH:mm:ss');
  const parsedCompareTime = moment(compareTime, 'YYYY-MM-DD HH:mm:ss');

  const isWithinInterval = parsedCompareTime.isBetween(
    parsedTargetTime.clone().subtract(intervalMinutes, 'minutes'),
    parsedTargetTime.clone().add(intervalMinutes, 'minutes'),
    'minutes'
  );

  return isWithinInterval;
};

const parseDateTime = (date, time) => {
  return moment(`${date} ${time}`, 'YYYY-MM-DD hhmm').format(
    'YYYY-MM-DDTHH:mm:ss.000'
  );
};

const getTimeByTimezone = (timeStr, timeType) => {
  const time = moment(timeStr).utcOffset(timeStr);
  let timeResult = '';
  switch (timeType) {
    case 'H':
      timeResult =
        time.hour().toString().length < 2
          ? '0' + time.hour().toString()
          : time.hour().toString();
      break;
    case 'M':
      timeResult =
        time.minute().toString().length < 2
          ? '0' + time.minute().toString()
          : time.minute().toString();
      break;
    case 'Z':
      const timeZone = time.format('Z').split(':')[0];
      timeResult = `(${timeZone.substring(0, 1)}${Number(
        time.format('Z').split(':')[0].substring(1, 3)
      )})`;
      break;
    default:
      break;
  }
  return timeResult;
};

const formatTimeWithTimeZone = (startTime, endTime, duration, startDate) => {
  const getTimeZone = (tSymbol, zone) => {
    const timeZone = Number(zone) % 12;
    let timeZoneSymbol = tSymbol || '+';
    if (timeZone !== Number(zone)) {
      timeZoneSymbol = timeZoneSymbol === '+' ? '-' : '+';
    }
    return timeZoneSymbol + String(timeZone).padStart(2, '0');
  };
  const sNumberMatch = startTime.match(/^(\d{4})\(([-+]?)(\d+)\)$/);
  const sTime = sNumberMatch[1];
  const sZone = getTimeZone(sNumberMatch[2], sNumberMatch[3]);
  const start = parseDateTime(startDate, sTime) + sZone + ':00';

  const eNumberMatch = endTime.match(/^(\d{4})\(([-+]?)(\d+)\)$/);
  const eTime = eNumberMatch[1];
  const eZone = getTimeZone(eNumberMatch[2], eNumberMatch[3]);
  const timeDiff = Number(eZone) - Number(sZone);
  const endDate = moment(`${startDate} ${sTime}`, 'YYYY-MM-DD hhmm')
    .add(duration.h, 'h')
    .add(duration.m, 'm')
    .add(timeDiff, 'h')
    .format('YYYY-MM-DD');

  const end = parseDateTime(endDate, eTime) + eZone + ':00';
  return {
    start,
    end,
  };

};

// const formatTimeWithTimeZone = (timeStr, dateStr, duration) => {
//   // 2230(+8) 2023-10-10
//   // 1930(+1) 2023-10-10 h04 m00
//   const numberMatch = timeStr.match(/^(\d{4})\(([-+]?)(\d+)\)$/);
//   const timeInfo = numberMatch[1];
//   let timeZone = Number(numberMatch[3]) % 12;
//   let timeZoneSymbol = numberMatch[2] || '+';
//   if (timeZone !== Number(numberMatch[3])) {
//     timeZoneSymbol = timeZoneSymbol === '+' ? '-' : '+';
//   }
//   timeZone = String(timeZone).padStart(2, '0');
//   if (duration) {
//     dateStr = moment(dateStr).add(duration.h, 'h').add(duration.m, 'm')
//       .format('YYYY-MM-DD');
//     // return moment(`${dateStr} ${timeStr}`, 'YYYY-MM-DD hhmm').format(`YYYY-MM-DDTHH:mm:ss.000${timeZoneSymbol}${timeZone}:00`);
//   }
//   return parseDateTime(dateStr, timeInfo) + timeZoneSymbol + timeZone + ':00';
// };

const getAcrossDays = (endDate, startDate) => {
  return Math.abs(moment(endDate.substring(0, 10)).diff(moment(startDate.substring(0, 10)), 'days'));
};

module.exports = {
  getTimeByTimezone,
  getTime,
  diffTime,
  addDay,
  timeAdd,
  getAcrossDay,
  getAcrossDays,
  acrossDay,
  momentDate,
  displayMoment,
  between,
  betweenMoment,
  formatDate,
  nowDateTime,
  isTimeWithinInterval,
  parseDateTime,
  formatTimeWithTimeZone,
};
