export const openPosition = ({
  symbol,
  side,
  price,
  amountPerTrade,
  entryFeeRate,
  timestamp,
  stopLoss = null,
  takeProfit = null,
}) => {
  const amount = amountPerTrade / price;
  const entryFee = amountPerTrade * entryFeeRate;

  return {
    symbol,
    side,
    status: "open",
    amount,
    amountInUSD: amountPerTrade,
    entryFee,
    entryPrice: price,
    entryTime: timestamp,
    stopLoss,
    takeProfit,
  };
};

export const closePosition = ({
  position,
  price,
  exitFeeRate,
  timestamp,
  reason = "signal",
}) => {
  const exitValue = position.amount * price;
  const exitFee = exitValue * exitFeeRate;

  let pnl;

  if (position.side === "buy") {
    pnl =
      (price - position.entryPrice) * position.amount -
      position.entryFee -
      exitFee;
  } else {
    pnl =
      (position.entryPrice - price) * position.amount -
      position.entryFee -
      exitFee;
  }

  const totalFees = position.entryFee + exitFee;
  const duration = timestamp - position.entryTime;
  const pnlPercent = (pnl / position.amountInUSD) * 100;

  return {
    trade: {
      ...position,
      status: "closed",
      exitFee,
      exitPrice: price,
      exitTime: timestamp,
      exitReason: reason,
      totalFees,
      duration,
      pnl,
      pnlPercent,
    },
    pnl,
  };
};
