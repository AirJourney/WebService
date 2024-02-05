const inCurrency = (currency) => {
  const supportCurrencyList = [
    "HKD",
    "CNY",
    "USD",
    "EUR",
    "GBP",
    "JPY",
    "KRW",
    "AUD",
    "CAD",
    "SGD",
    "MYR",
    "THB",
    "RUB",
    "INR",
    "PHP",
    "IDR",
    "TWD",
    "AED",
    "NZD",
  ];

  const defaultCurrency = "USD";

  if (supportCurrencyList.includes(currency)) {
    return currency;
  }
  return defaultCurrency;
};

const inLanguage = (language) => {
  const supportLanguageList = ["en", "cn", "tc"];
  const defaultLanguage = "en";

  if (supportLanguageList.includes(language)) {
    return language;
  }
  return defaultLanguage;
};

module.exports = {
  inCurrency,
  inLanguage,
};