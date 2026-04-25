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
        $setOnInsert: plan,
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
