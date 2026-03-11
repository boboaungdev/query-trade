import mongoose from "mongoose";
import { MONGO_URI } from "../constants/index.js";

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);

    console.log(`=> Database connected successfully.`);
  } catch (error) {
    console.error("=> Database connection failed:", error.message);
    process.exit(1);
  }
};
