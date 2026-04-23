import ccxt from "ccxt";

export const getExchange = ({ exchange, marketType = "spot" }) => {
  const ExchangeClass = ccxt[exchange];

  if (!ExchangeClass) {
    throw new Error(
      `Unsupported exchange: '${exchange}'. Supported exchanges are: ${ccxt.exchanges.join(", ")}`,
    );
  }

  return new ExchangeClass({
    enableRateLimit: true,
    options: {
      defaultType: marketType,
      ...(exchange === "binance" && marketType === "spot"
        ? {
            fetchMarkets: {
              types: ["spot"],
            },
          }
        : {}),
    },
  });
};
