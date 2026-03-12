import { getExchange } from "../../services/backtest/getExchange.js";
import { resJson } from "../../utils/response.js";

export const exchangeSupportedData = async (req, res, next) => {
  try {
    const { exchange, marketType } = req.body;

    /** @type {import("ccxt").Exchange} */
    const exchangeInstance = getExchange({ exchange, marketType });

    // IMPORTANT
    await exchangeInstance.loadMarkets();

    const symbols = exchangeInstance.symbols;
    const timeframes = exchangeInstance.timeframes;
    const data = { symbols, timeframes };

    return resJson(res, 200, "Success data from exchange", { data });
  } catch (error) {
    next(error);
  }
};
