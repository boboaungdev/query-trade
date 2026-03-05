export const calculateMetrics = ({ initialBalance, balance, trades }) => {
  const wins = trades.filter((t) => t.pnl > 0).length;
  const losses = trades.filter((t) => t.pnl < 0).length;

  return {
    initialBalance,
    finalBalance: balance,
    totalPnL: balance - initialBalance,
    totalTrades: trades.length,
    winRate: trades.length ? (wins / trades.length) * 100 : 0,
    wins,
    losses,
    trades,
  };
};
