'use strict';

/**
 * 处理一下常用的参数
 * @param {Object} requestParams - The search parameters for the flight search.
 * @return {Object} - The search parameters for the flight search.
 */
const resolveParamsAndHeader = requestParams => {
  const { body, headers, header } = requestParams;
  const { referer } = headers;
  const { sessionid, locale } = header;
  const { flightType, tripSearch, cabinType, language, currency, passenger, mktportal = 'customer', locale: trueLocale } = body;
  return {
    referer,
    sessionid,
    language: language || locale,
    currency,
    cabinType,
    tripSearch,
    tripType: flightType,
    passenger,
    locale: trueLocale,
    mktportal,
  };
};
module.exports = {
  resolveParamsAndHeader,
};
