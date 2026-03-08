import { CaseData, MethodItem, MethodRecipe, Zone } from '../types';
import { getPaymentBreakdown } from './payment';

export const getCollectedAmount = (item: CaseData) => {
  const payment = getPaymentBreakdown(item.finalPrice || 0, item.depositPercentage);
  let amount = 0;
  if (item.depositReceivedDate) amount += payment.depositAmount;
  if (item.finalPaymentReceivedDate) amount += payment.finalAmount;
  return amount;
};

const getZoneBasis = (zone: Zone) => {
  if (!zone.items?.length) return 0;
  if (zone.unit === '坪') {
    return zone.items.reduce((sum, item) => sum + (item.areaPing || 0), 0);
  }
  return zone.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
};

export const estimateCaseMaterialCost = (item: CaseData, recipes: MethodRecipe[]) => {
  const totals: Record<string, number> = {};

  (item.zones || []).forEach((zone) => {
    const zoneBasis = getZoneBasis(zone);
    if (zoneBasis === 0) return;

    const zoneRecipes = recipes.filter((recipe) => recipe.methodId === zone.methodId && recipe.material && recipe.category === 'variable');
    zoneRecipes.forEach((recipe) => {
      const material = recipe.material;
      if (!material) return;

      if (!totals[material.id]) totals[material.id] = 0;
      const amount = (recipe.consumptionRate || 0) * zoneBasis;
      totals[material.id] += amount * (material.unitPrice || 0);
    });
  });

  return Object.values(totals).reduce((sum, value) => sum + value, 0);
};

export const estimateCaseLaborCost = (item: CaseData, methods: MethodItem[]) => {
  return (item.zones || []).reduce((sum, zone) => {
    const method = methods.find((entry) => entry.id === zone.methodId);
    if (!method) return sum;
    const hourlyRate = method.laborHourlyRate || 0;
    const hours = method.laborHours || 0;
    return sum + (hourlyRate * hours);
  }, 0);
};

export const estimateCaseTotalCost = (item: CaseData, recipes: MethodRecipe[], methods: MethodItem[]) => (
  estimateCaseMaterialCost(item, recipes) + estimateCaseLaborCost(item, methods)
);

export const getProfitDistribution = (netProfit: number) => {
  const safeProfit = Math.max(netProfit, 0);
  const companyShare = Math.round(safeProfit * 0.2);
  const partnerPool = safeProfit - companyShare;
  const neoShare = Math.round(partnerPool / 2);
  const zhongzhongShare = partnerPool - neoShare;

  return {
    companyShare,
    neoShare,
    zhongzhongShare,
  };
};
