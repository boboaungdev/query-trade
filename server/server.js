import "dotenv/config.js";
import { app } from "./app.js";
import { connectDB } from "./configs/db.js";
import { ENABLE_DEFAULT_SEED, PORT } from "./constants/index.js";
import { seedDefaultIndicators } from "./services/indicator/seedDefaultIndicators.js";
import { seedDefaultSubscriptionPlans } from "./services/subscription/seedDefaultSubscriptionPlans.js";
import { seedDefaultUsers } from "./services/user/seedDefaultUsers.js";
import { verifyEmailTransporter } from "./utils/sendEmail.js";

const startServer = async () => {
  try {
    await connectDB();
    await verifyEmailTransporter();

    if (ENABLE_DEFAULT_SEED) {
      await seedDefaultIndicators();
      await seedDefaultSubscriptionPlans();
      await seedDefaultUsers();
    }

    app.listen(PORT, () => {
      console.log(`=> Server running at port ${PORT}`);
    });
  } catch (error) {
    console.error("=> Failed to start server:", error.message);
    process.exit(1);
  }
};

// Run the server
startServer();
