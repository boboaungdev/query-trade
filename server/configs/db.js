import mongoose from "mongoose";

import { APP_NAME, MONGO_URI } from "../constants/index.js";

export const connectDB = async () => {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is not configured.");
  }

  if (mongoose.connection.readyState === 1) return;

  const dbName = APP_NAME.toLowerCase().replace(/\s+/g, "-");

  try {
    await mongoose.connect(MONGO_URI, {
      dbName,
    });
    console.log("=> Database connected successfully.");
  } catch (error) {
    console.error("=> Database connection failed:", error.message);
    throw error;
  }
};
