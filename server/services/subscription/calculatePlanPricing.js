import { TOKEN_PER_USDT } from "../../constants/index.js";

const isDiscountInWindow = (discount) => {
  if (!discount?.isActive || !discount.value) {
    return false;
  }

  const now = new Date();

  if (discount.startsAt && new Date(discount.startsAt) > now) {
    return false;
  }

  if (discount.endsAt && new Date(discount.endsAt) < now) {
    return false;
  }

  return true;
};

export const calculatePlanPricing = (plan) => {
  const originalAmountToken = Number(
    plan.amountToken ??
      Number(Number(plan.amountUsd || 0) * TOKEN_PER_USDT).toFixed(8),
  );
  const discount = plan.discount || {};
  let discountAmountToken = 0;

  if (isDiscountInWindow(discount)) {
    if (discount.type === "percentage") {
      discountAmountToken =
        originalAmountToken * (Number(discount.value) / 100);
    } else {
      discountAmountToken = Number(discount.value);
    }
  }

  discountAmountToken = Math.min(originalAmountToken, discountAmountToken);
  const finalAmountToken = Math.max(
    0,
    originalAmountToken - discountAmountToken,
  );

  return {
    originalAmountToken,
    discountAmountToken: Number(discountAmountToken.toFixed(8)),
    finalAmountToken: Number(finalAmountToken.toFixed(8)),
    hasDiscount: discountAmountToken > 0,
  };
};

export const serializePlan = (plan) => {
  const pricing = calculatePlanPricing(plan);

  return {
    _id: plan._id,
    id: plan.key,
    key: plan.key,
    name: plan.name,
    amountToken: pricing.finalAmountToken,
    originalAmountToken: pricing.originalAmountToken,
    discountAmountToken: pricing.discountAmountToken,
    hasDiscount: pricing.hasDiscount,
    discount: plan.discount || {},
    durationDays: plan.durationDays,
    features: plan.features || [],
    isActive: plan.isActive,
    sortOrder: plan.sortOrder,
  };
};
