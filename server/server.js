import "dotenv/config.js";
import { app } from "./app.js";
import { connectDB } from "./configs/db.js";
import { ENABLE_INDICATOR_SEED, PORT } from "./constants/index.js";
import { seedDefaultIndicators } from "./services/indicator/seedDefaultIndicators.js";

const startServer = async () => {
  try {
    await connectDB();

    if (ENABLE_INDICATOR_SEED) {
      await seedDefaultIndicators();
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
