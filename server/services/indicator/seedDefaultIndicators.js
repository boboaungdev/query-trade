import { IndicatorDB } from "../../models/indicator.js";
import { defaultIndicators } from "../../data/defaultIndicators.js";

export const seedDefaultIndicators = async () => {
  if (!defaultIndicators.length) {
    return { insertedCount: 0 };
  }

  const operations = defaultIndicators.map((indicator) => ({
    updateOne: {
      filter: { name: indicator.name },
      update: {
        $setOnInsert: indicator,
      },
      upsert: true,
    },
  }));

  const result = await IndicatorDB.bulkWrite(operations, { ordered: false });
  const insertedCount = result.upsertedCount ?? 0;

  if (insertedCount > 0) {
    console.log(`=> Seeded ${insertedCount} default indicator(s).`);
  } else {
    console.log("=> Default indicators already exist. Skipping seed.");
  }

  return { insertedCount };
};
