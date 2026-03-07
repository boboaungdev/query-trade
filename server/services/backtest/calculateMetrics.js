export const calculateMetrics = ({ initialBalance, balance, trades }) => {
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);

  const winCount = wins.length;
  const lossCount = losses.length;

  const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = losses.reduce((sum, t) => sum + t.pnl, 0);

  const totalFees = trades.reduce((sum, t) => sum + (t.totalFees || 0), 0);

  const averageWin = winCount ? grossProfit / winCount : 0;
  const averageLoss = lossCount ? grossLoss / lossCount : 0;

  const maxWin = trades.length ? Math.max(...trades.map((t) => t.pnl)) : 0;
  const maxLoss = trades.length ? Math.min(...trades.map((t) => t.pnl)) : 0;

  const profitFactor = grossLoss !== 0 ? Math.abs(grossProfit / grossLoss) : 0;

  const averageTradePnL = trades.length
    ? (balance - initialBalance) / trades.length
    : 0;

  // -------------------------
  // Equity Curve
  // -------------------------
  let equity = initialBalance;
  let peak = initialBalance;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;

  const equityCurves = [];

  for (const trade of trades) {
    equity += trade.pnl;

    if (equity > peak) {
      peak = equity;
    }

    const drawdown = peak - equity;
    const drawdownPercent = peak ? (drawdown / peak) * 100 : 0;

    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownPercent = drawdownPercent;
    }

    equityCurves.push({
      timestamp: trade.exitTime,
      equity,
    });
  }

  return {
    initialBalance,
    finalBalance: balance,
    totalPnL: balance - initialBalance,

    totalTrades: trades.length,

    wins: winCount,
    losses: lossCount,
    winRate: trades.length ? (winCount / trades.length) * 100 : 0,

    grossProfit,
    grossLoss,
    profitFactor,

    averageWin,
    averageLoss,
    averageTradePnL,

    maxWin,
    maxLoss,

    totalFees,

    maxDrawdown,
    maxDrawdownPercent,

    equityCurves,

    trades,
  };
};
