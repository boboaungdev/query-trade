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
  limit = 10000,
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

  // Get fees directly from CCXT market
  const since = Date.parse(startTime);
  const endTimestamp = Date.parse(endTime);
  
  const entryFeeRate =
    entryOrderType === "market" ? market.taker : market.maker;
  const exitFeeRate = exitOrderType === "market" ? market.taker : market.maker;

  let rawCandles = [];
  let cursor = since;

  while (rawCandles.length < limit) {
    const candles = await exchangeInstance.fetchOHLCV(
      symbol,
      timeframe,
      cursor,
      Math.min(1000, limit - rawCandles.length),
    );

    if (!candles.length) break;

    rawCandles.push(...candles);

    const lastTimestamp = candles[candles.length - 1][0];

    if (lastTimestamp >= endTimestamp) break;

    cursor = lastTimestamp + 1;

    await exchangeInstance.sleep(exchangeInstance.rateLimit);
  }

  const candles = rawCandles
    .filter((c) => !endTimestamp || c[0] <= endTimestamp)
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
