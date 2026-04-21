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
  const originalAmountUsd = Number(plan.amountUsd);
  const discount = plan.discount || {};
  let discountAmountUsd = 0;

  if (isDiscountInWindow(discount)) {
    if (discount.type === "percentage") {
      discountAmountUsd = originalAmountUsd * (Number(discount.value) / 100);
    } else {
      discountAmountUsd = Number(discount.value);
    }
  }

  discountAmountUsd = Math.min(originalAmountUsd, discountAmountUsd);
  const finalAmountUsd = Math.max(0, originalAmountUsd - discountAmountUsd);

  return {
    originalAmountUsd,
    discountAmountUsd: Number(discountAmountUsd.toFixed(8)),
    finalAmountUsd: Number(finalAmountUsd.toFixed(8)),
    hasDiscount: discountAmountUsd > 0,
  };
};

export const serializePlan = (plan) => {
  const pricing = calculatePlanPricing(plan);

  return {
    _id: plan._id,
    id: plan.key,
    key: plan.key,
    name: plan.name,
    amountUsd: pricing.finalAmountUsd,
    originalAmountUsd: pricing.originalAmountUsd,
    discountAmountUsd: pricing.discountAmountUsd,
    hasDiscount: pricing.hasDiscount,
    discount: plan.discount || {},
    durationDays: plan.durationDays,
    features: plan.features || [],
    isActive: plan.isActive,
    sortOrder: plan.sortOrder,
  };
};
