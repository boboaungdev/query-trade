import fs from "fs";
import path from "path";
import cors from "cors";
import express from "express";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";

import { reqLogger } from "./middlewares/reqLogger.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { rateLimiter } from "./middlewares/rateLimiter.js";
import { credentials } from "./middlewares/credentials.js";
import { corsOptions } from "./middlewares/corsOptions.js";
import { userRouter } from "./routes/user.js";
import { backtestRouter } from "./routes/backtest.js";
import { indicatorRouter } from "./routes/indicator.js";
import { authRouter } from "./routes/auth.js";

export const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assetDirCandidates = [
  path.join(__dirname, "assets"),
  path.join(process.cwd(), "assets"),
  path.join(process.cwd(), "server", "assets"),
];
const assetsDir =
  assetDirCandidates.find((dir) => fs.existsSync(dir)) ||
  path.join(__dirname, "assets");

// Middleware
app.use(reqLogger); // Log incoming requests (1st)
app.use(rateLimiter); // Rate limiting (before body parsing)
app.use(credentials); // Set Access-Control-Allow-Credentials header
app.use(cors(corsOptions)); // Must follow `credentials`
app.use(express.json({ limit: "5mb" })); // Parse JSON body
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Parse cookies
app.use("/assets", express.static(assetsDir));

// Routes
app.get("/favicon.ico", (req, res) => {
  res.sendFile(path.join(assetsDir, "query-trade.svg"));
});
app.get("/", (req, res) => {
  res.sendFile(path.join(assetsDir, "html/index.html"));
});

app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/backtest", backtestRouter);
app.use("/api/indicator", indicatorRouter);

// Error handler
app.use(notFoundHandler);
app.use(errorHandler);
