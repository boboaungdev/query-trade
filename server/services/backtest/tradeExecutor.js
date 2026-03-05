export const openPosition = ({
  type,
  price,
  amountPerTrade,
  entryFeeRate,
  timestamp,
}) => {
  const size = amountPerTrade / price;
  const entryFee = amountPerTrade * entryFeeRate;

  return {
    type,
    entryPrice: price,
    size,
    entryFee,
    entryTime: timestamp,
  };
};

export const closePosition = ({ position, price, exitFeeRate, timestamp }) => {
  const exitValue = position.size * price;
  const exitFee = exitValue * exitFeeRate;

  let pnl;

  if (position.type === "buy") {
    pnl =
      (price - position.entryPrice) * position.size -
      position.entryFee -
      exitFee;
  } else {
    pnl =
      (position.entryPrice - price) * position.size -
      position.entryFee -
      exitFee;
  }

  return {
    trade: {
      ...position,
      exitPrice: price,
      exitTime: timestamp,
      pnl,
    },
    pnl,
  };
};
