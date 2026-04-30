import { defaultUsers } from "../../data/defaultUsers.js";
import { UserDB } from "../../models/user.js";
import { Encoder } from "../../utils/encoder.js";

const SEEDED_USER_PASSWORD = "SeedUser123!";

export const seedDefaultUsers = async () => {
  if (!defaultUsers.length) {
    return { insertedCount: 0 };
  }

  const encodedPassword = Encoder.encode(SEEDED_USER_PASSWORD);
  const now = new Date();

  const operations = defaultUsers.map((user) => ({
    updateOne: {
      filter: {
        $or: [{ email: user.email }, { username: user.username }],
      },
      update: {
        $setOnInsert: {
          ...user,
          password: encodedPassword,
          passwordChangedAt: now,
          role: "user",
          tokenBalance: 0,
          authProviders: [
            {
              provider: "server",
              providerId: user.username,
            },
          ],
        },
      },
      upsert: true,
    },
  }));

  const result = await UserDB.bulkWrite(operations, { ordered: false });
  const insertedCount = result.upsertedCount ?? 0;

  if (insertedCount > 0) {
    console.log(`=> Seeded ${insertedCount} default user(s).`);
  } else {
    console.log("=> Default users already exist. Skipping seed.");
  }

  return { insertedCount };
};
