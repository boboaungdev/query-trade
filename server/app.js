import cors from "cors";
import path from "path";
import express from "express";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";

import { authRouter } from "./routes/auth.js";
import { userRouter } from "./routes/user.js";
import { rootHtml } from "./views/rootHtml.js";
import { strategyRouter } from "./routes/strategy.js";
import { backtestRouter } from "./routes/backtest.js";
import { bookmarkRouter } from "./routes/bookmark.js";
import { followRouter } from "./routes/follow.js";
import { reqLogger } from "./middlewares/reqLogger.js";
import { indicatorRouter } from "./routes/indicator.js";
import { subscriptionRouter } from "./routes/subscription.js";
import { walletRouter } from "./routes/wallet.js";
import { rateLimiter } from "./middlewares/rateLimiter.js";
import { credentials } from "./middlewares/credentials.js";
import { corsOptions } from "./middlewares/corsOptions.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";

export const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(reqLogger);
app.use(credentials);
app.use(cors(corsOptions));
app.use(rateLimiter);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.get("/favicon.ico", (req, res) => {
  res.redirect(301, "/query-trade.svg");
});
app.get("/", (req, res) => {
  res.type("html").send(rootHtml);
});

app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/backtest", backtestRouter);
app.use("/api/indicator", indicatorRouter);
app.use("/api/strategy", strategyRouter);
app.use("/api/bookmark", bookmarkRouter);
app.use("/api/follow", followRouter);
app.use("/api/subscription", subscriptionRouter);
app.use("/api/wallet", walletRouter);

// Error handler
app.use(notFoundHandler);
app.use(errorHandler);
