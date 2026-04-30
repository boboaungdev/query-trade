export function formatCompactTokenAmount(amount: number) {
  if (!Number.isFinite(amount)) {
    return "0";
  }

  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (absAmount < 1000) {
    return `${sign}${absAmount.toLocaleString(undefined, {
      maximumFractionDigits: 0,
    })}`;
  }

  if (absAmount < 1_000_000) {
    const value = absAmount / 1000;
    return `${sign}${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1).replace(/\.0$/, "")}K`;
  }

  if (absAmount < 1_000_000_000) {
    const value = absAmount / 1_000_000;
    return `${sign}${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1).replace(/\.0$/, "")}M`;
  }

  const value = absAmount / 1_000_000_000;
  return `${sign}${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1).replace(/\.0$/, "")}B`;
}
