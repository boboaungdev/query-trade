import { getExchange } from "./getExchange.js";

export const fetchMarketData = async ({
  exchange,
  symbol,
  marketType,
  timeframe,
  startTime,
  endTime,
  entryOrderType,
  exitOrderType,
}) => {
  /** @type {import("ccxt").Exchange} */
  const exchangeInstance = getExchange({ exchange, marketType });

  await exchangeInstance.loadMarkets();

  if (!exchangeInstance.markets[symbol]) {
    throw new Error(`Invalid symbol ${symbol} for ${exchange}`);
  }

  if (!exchangeInstance.has.fetchOHLCV) {
    throw new Error(`${exchange} does not support OHLCV fetching`);
  }

  if (!exchangeInstance.timeframes?.[timeframe]) {
    throw new Error(
      `'${timeframe}' is an unsupported timeframe for ${exchange}. Supported timeframes for ${exchange} are: ${Object.keys(exchangeInstance.timeframes).join(", ")}`,
    );
  }

  const market = exchangeInstance.market(symbol);
  console.log(market.maker);

  // Get fees directly from CCXT market
  const entryFeeRate =
    entryOrderType === "market" ? market.taker : market.maker;

  const exitFeeRate = exitOrderType === "market" ? market.taker : market.maker;

  const since = startTime ? new Date(startTime).getTime() : undefined;

  if (startTime && endTime && since > new Date(endTime).getTime()) {
    throw new Error("startTime must be before endTime");
  }

  const rawCandles = await exchangeInstance.fetchOHLCV(
    symbol,
    timeframe,
    since,
    1000,
  );

  const candles = rawCandles
    .filter((c) => !endTime || c[0] <= new Date(endTime).getTime())
    .map((c) => ({
      timestamp: c[0],
      open: c[1],
      high: c[2],
      low: c[3],
      close: c[4],
      volume: c[5],
    }));

  return {
    candles,
    entryFeeRate,
    exitFeeRate,
  };
};
