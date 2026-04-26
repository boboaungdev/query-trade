import { resError, resJson } from "../../utils/response.js";
import { getExchange } from "../../services/backtest/getExchange.js";

export const getExchangeData = async (req, res, next) => {
  try {
    const { exchange } = req.validatedQuery;

    /** @type {import("ccxt").Exchange} */
    const exchangeInstance = getExchange({ exchange });

    await exchangeInstance.loadMarkets();

    const markets = Object.values(exchangeInstance.markets);

    const data = {
      symbols: markets
        .filter((m) => m.spot)
        .map((m) => m.symbol)
        .sort((a, b) => a.localeCompare(b)), // <-- sort A-Z
      timeframes: exchangeInstance.timeframes,
    };

    return resJson(res, 200, "Success fetch exchange data", {
      data,
    });
  } catch {
    next(resError(500, "Unable to load market data. Please try again later."));
  }
};
