export const calculateMetrics = ({ initialBalance, balance, trades }) => {
  const totalPnL = balance - initialBalance;
  const roi = initialBalance ? (totalPnL / initialBalance) * 100 : 0;
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);

  const winCount = wins.length;
  const lossCount = losses.length;

  const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = losses.reduce((sum, t) => sum + t.pnl, 0);

  const totalFees = trades.reduce((sum, t) => sum + (t.totalFees || 0), 0);
  const averageTradeFee = trades.length ? totalFees / trades.length : 0;

  const averageWin = winCount ? grossProfit / winCount : 0;
  const averageLoss = lossCount ? grossLoss / lossCount : 0;

  const maxWin = trades.length ? Math.max(...trades.map((t) => t.pnl)) : 0;
  const maxLoss = trades.length ? Math.min(...trades.map((t) => t.pnl)) : 0;

  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;

  for (const trade of trades) {
    if (trade.pnl > 0) {
      currentWinStreak += 1;
      currentLossStreak = 0;
      if (currentWinStreak > maxWinStreak) {
        maxWinStreak = currentWinStreak;
      }
      continue;
    }

    if (trade.pnl < 0) {
      currentLossStreak += 1;
      currentWinStreak = 0;
      if (currentLossStreak > maxLossStreak) {
        maxLossStreak = currentLossStreak;
      }
      continue;
    }

    currentWinStreak = 0;
    currentLossStreak = 0;
  }

  const profitFactor = grossLoss !== 0 ? Math.abs(grossProfit / grossLoss) : 0;
  const payoffRatio =
    averageLoss !== 0 ? Math.abs(averageWin / averageLoss) : 0;
  const winRatePercent = trades.length ? (winCount / trades.length) * 100 : 0;
  const winRateDecimal = winRatePercent / 100;
  const expectancy =
    winRateDecimal * averageWin + (1 - winRateDecimal) * averageLoss;

  const averageTradePnL = trades.length
    ? (balance - initialBalance) / trades.length
    : 0;
  const averageTradeDuration = trades.length
    ? trades.reduce((sum, t) => sum + (t.duration || 0), 0) / trades.length
    : 0;
  const longestTradeDuration = trades.length
    ? Math.max(...trades.map((t) => t.duration || 0))
    : 0;
  const shortestTradeDuration = trades.length
    ? Math.min(...trades.map((t) => t.duration || 0))
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

  const recoveryFactor = maxDrawdown > 0 ? totalPnL / maxDrawdown : 0;
  const streakDifference = Math.abs(maxWinStreak - maxLossStreak);
  const streakInsight =
    maxWinStreak === maxLossStreak
      ? "Balanced streak lengths"
      : maxWinStreak > maxLossStreak
        ? `Win-side edge: +${streakDifference}`
        : `Loss-side edge: +${streakDifference}`;

  return {
    initialBalance,
    finalBalance: balance,
    totalPnL,
    roi,

    totalTrades: trades.length,

    wins: winCount,
    losses: lossCount,
    winRate: winRatePercent,

    grossProfit,
    grossLoss,
    profitFactor,
    payoffRatio,

    averageWin,
    averageLoss,
    averageTradePnL,
    averageTradeDuration,
    longestTradeDuration,
    shortestTradeDuration,
    expectancy,

    maxWin,
    maxLoss,
    maxWinStreak,
    maxLossStreak,
    streakInsight,

    totalFees,
    averageTradeFee,

    maxDrawdown,
    maxDrawdownPercent,
    recoveryFactor,

    equityCurves,

    trades,
  };
};
