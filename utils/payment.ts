export const normalizeDepositRatio = (value?: number): number => {
  const ratio = typeof value === 'number' ? value : 0.7;
  if (!Number.isFinite(ratio)) return 0.7;
  return Math.max(0.05, Math.min(0.95, ratio));
};

export const getPaymentBreakdown = (total: number, depositRatio?: number) => {
  const safeDepositRatio = normalizeDepositRatio(depositRatio);
  const safeFinalRatio = 1 - safeDepositRatio;

  return {
    depositRatio: safeDepositRatio,
    finalRatio: safeFinalRatio,
    depositPercent: Math.round(safeDepositRatio * 100),
    finalPercent: Math.round(safeFinalRatio * 100),
    depositAmount: Math.round(total * safeDepositRatio),
    finalAmount: Math.round(total * safeFinalRatio),
  };
};
