const { getSettings } = require("../services/settingsService");

const COUNTRY_TO_CURRENCY = {
  AE: "AED",
  SA: "SAR",
  KW: "KWD",
  QA: "QAR",
  BH: "BHD",
  OM: "OMR",
  ET: "ETB",
  OTHER: "USD",
};

exports.getCurrencyForCountry = (country) => COUNTRY_TO_CURRENCY[country] || "USD";

/**
 * Convert ETB amount to display currency.
 * Returns { displayAmount, displayCurrency, exchangeRate }
 */
exports.convertFromETB = async (amountETB, country) => {
  const currency = exports.getCurrencyForCountry(country);

  if (currency === "ETB") {
    return { displayAmount: amountETB, displayCurrency: "ETB", exchangeRate: 1 };
  }

  const settings = await getSettings();
  const rate = settings.exchangeRates[currency];
  if (!rate || rate <= 0) {
    return { displayAmount: amountETB, displayCurrency: "ETB", exchangeRate: 1 };
  }

  return {
    displayAmount: Math.round((amountETB / rate) * 100) / 100,
    displayCurrency: currency,
    exchangeRate: rate,
  };
};