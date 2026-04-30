import { defaultSubscriptionPlans } from "../../data/defaultSubscriptionPlans.js";
import { SubscriptionPlanModel } from "../../models/subscriptionPlan.js";

export const seedDefaultSubscriptionPlans = async () => {
  if (!defaultSubscriptionPlans.length) {
    return { insertedCount: 0 };
  }

  const operations = defaultSubscriptionPlans.map((plan) => ({
    updateOne: {
      filter: { key: plan.key },
      update: {
        $setOnInsert: {
          key: plan.key,
        },
        $set: {
          name: plan.name,
          amountToken: plan.amountToken,
          durationDays: plan.durationDays,
          features: plan.features,
          isActive: plan.isActive,
          sortOrder: plan.sortOrder,
        },
      },
      upsert: true,
    },
  }));

  const result = await SubscriptionPlanModel.bulkWrite(operations, {
    ordered: false,
  });
  const insertedCount = result.upsertedCount ?? 0;

  if (insertedCount > 0) {
    console.log(`=> Seeded ${insertedCount} default subscription plan(s).`);
  } else {
    console.log("=> Default subscription plans already exist. Skipping seed.");
  }

  return { insertedCount };
};
