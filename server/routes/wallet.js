import express from "express";

import { WalletSchema } from "../schemas/wallet.js";
import {
  validateBody,
  validateParam,
  validateQuery,
  validateToken,
} from "../utils/validator.js";
import {
  getPayment,
  getPaymentHistory,
  getPublicTransactionReceipt,
  getTransactionReceipt,
  getWalletIncomeChart,
  getWalletActivity,
  getWalletSummary,
} from "../controllers/wallet/get.js";
import { createDeposit } from "../controllers/wallet/createDeposit.js";
import { createTransfer } from "../controllers/wallet/createTransfer.js";
import { cancelPayment } from "../controllers/wallet/cancelPayment.js";
import { verifyPayment } from "../controllers/wallet/verifyPayment.js";

const router = express.Router();

router.get(
  "/shared/:shareId",
  validateParam(WalletSchema.params.shareId),
  getPublicTransactionReceipt,
);

router.use(validateToken());

router.get("/summary", getWalletSummary);
router.get(
  "/income-chart",
  validateQuery(WalletSchema.incomeChartQuery),
  getWalletIncomeChart,
);
router.get(
  "/activity",
  validateQuery(WalletSchema.activityQuery),
  getWalletActivity,
);
router.get(
  "/payments",
  validateQuery(WalletSchema.paginationQuery),
  getPaymentHistory,
);
router.get(
  "/payments/:paymentId",
  validateParam(WalletSchema.params.paymentId),
  getPayment,
);
router.get(
  "/transactions/:transactionId",
  validateParam(WalletSchema.params.transactionId),
  getTransactionReceipt,
);
router.post("/deposits", validateBody(WalletSchema.deposit), createDeposit);
router.post("/transfers", validateBody(WalletSchema.transfer), createTransfer);
router.post(
  "/payments/:paymentId/verify",
  validateParam(WalletSchema.params.paymentId),
  validateBody(WalletSchema.verifyPayment),
  verifyPayment,
);
router.post(
  "/payments/:paymentId/cancel",
  validateParam(WalletSchema.params.paymentId),
  cancelPayment,
);

export const walletRouter = router;
