import "dotenv/config.js";
import { app } from "./app.js";
import { connectDB } from "./configs/db.js";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();

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
