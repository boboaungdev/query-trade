import { getExchange } from "./getExchange.js";

// Exchanges differ a lot here:
// - each one has its own safe OHLCV page limit
// - some return overlapping pages if the next cursor is not aligned to timeframe
// - some still have missing intervals in the raw feed
// For backtesting we normalize the result into one continuous timeframe series.

const createFlatCandle = ({ timestamp, price }) => ({
  timestamp,
  open: price,
  high: price,
  low: price,
  close: price,
  volume: 0,
});

const normalizeRawCandle = (candle) => ({
  timestamp: candle[0],
  open: candle[1],
  high: candle[2],
  low: candle[3],
  close: candle[4],
  volume: candle[5],
});

const fillMissingCandles = ({ candles, since, endTimestamp, timeframeMs }) => {
  if (!candles.length) {
    return [];
  }

  const normalizedCandles = [candles[0]];

  for (let index = 1; index < candles.length; index += 1) {
    const previousCandle = normalizedCandles[normalizedCandles.length - 1];
    const currentCandle = candles[index];

    let expectedTimestamp = previousCandle.timestamp + timeframeMs;

    while (expectedTimestamp < currentCandle.timestamp) {
      normalizedCandles.push(
        createFlatCandle({
          timestamp: expectedTimestamp,
          price: previousCandle.close,
        }),
      );

      expectedTimestamp += timeframeMs;
    }

    normalizedCandles.push(currentCandle);
  }

  let lastCandle = normalizedCandles[normalizedCandles.length - 1];
  let expectedTimestamp = lastCandle.timestamp + timeframeMs;

  while (expectedTimestamp < endTimestamp) {
    normalizedCandles.push(
      createFlatCandle({
        timestamp: expectedTimestamp,
        price: lastCandle.close,
      }),
    );

    lastCandle = normalizedCandles[normalizedCandles.length - 1];
    expectedTimestamp = lastCandle.timestamp + timeframeMs;
  }

  return normalizedCandles.filter(
    (candle) => candle.timestamp >= since && candle.timestamp < endTimestamp,
  );
};

export const fetchOHLCV = async ({
  exchange,
  symbol,
  timeframe,
  startDate,
  endDate,
  limit = 10000,
}) => {
  /** @type {import("ccxt").Exchange} */
  const exchangeInstance = getExchange({ exchange });

  await exchangeInstance.loadMarkets();

  if (!exchangeInstance.markets[symbol]) {
    throw new Error(`Invalid symbol ${symbol}`);
  }

  if (!exchangeInstance.has.fetchOHLCV) {
    throw new Error(`Exchange does not support OHLCV fetching!`);
  }

  if (!exchangeInstance.timeframes?.[timeframe]) {
    throw new Error(
      `'${timeframe}' is an unsupported timeframe. Supported timeframes are: ${Object.keys(exchangeInstance.timeframes).join(", ")}`,
    );
  }

  const since = Date.parse(startDate);
  const endTimestamp = Date.parse(endDate);
  const timeframeMs = exchangeInstance.parseTimeframe(timeframe) * 1000;
  const exchangeMaxLimit = exchangeInstance.features?.spot?.fetchOHLCV?.limit;

  let rawCandles = [];
  let cursor = since;

  while (rawCandles.length < limit && cursor < endTimestamp) {
    const pageSize = Math.min(
      exchangeMaxLimit || 1000,
      limit - rawCandles.length,
    );
    const candles = await exchangeInstance.fetchOHLCV(
      symbol,
      timeframe,
      cursor,
      pageSize,
    );

    if (!candles.length) break;

    const pageCandles = candles
      .filter((candle) => Array.isArray(candle) && candle.length >= 6)
      .filter((candle) => candle[0] >= since && candle[0] < endTimestamp);

    rawCandles.push(...pageCandles);

    const lastDatestamp = candles[candles.length - 1][0];
    const nextCursor = lastDatestamp + timeframeMs;

    if (nextCursor <= cursor) {
      break;
    }

    cursor = nextCursor;

    await exchangeInstance.sleep(exchangeInstance.rateLimit);
  }

  const candles = [
    ...new Map(rawCandles.map((candle) => [candle[0], candle])).values(),
  ]
    .sort((a, b) => a[0] - b[0])
    .map(normalizeRawCandle);

  return fillMissingCandles({
    candles,
    since,
    endTimestamp,
    timeframeMs,
  });
};
