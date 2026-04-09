import "dotenv/config.js";
import { app } from "../app.js";
import { connectDB } from "../configs/db.js";

let dbReady = false;

const ensureDatabase = async () => {
  if (dbReady) return;
  await connectDB();
  dbReady = true;
};

export default async function handler(req, res) {
  try {
    await ensureDatabase();
    return app(req, res);
  } catch (error) {
    console.error("=> Failed to handle request:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
