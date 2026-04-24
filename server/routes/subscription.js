import express from "express";

import { SubscriptionSchema } from "../schemas/subscription.js";
import {
  validateBody,
  validateParam,
  validateQuery,
  validateRole,
  validateToken,
} from "../utils/validator.js";
import { createCheckout } from "../controllers/subscription/checkout.js";
import { createDeposit } from "../controllers/subscription/createDeposit.js";
import {
  getWalletActivity,
  getPaymentHistory,
  getPayment,
  getMySubscription,
  getPlans,
} from "../controllers/subscription/get.js";
import {
  createPlan,
  deletePlan,
  getAdminPlans,
  updatePlan,
} from "../controllers/subscription/planAdmin.js";
import { cancelPayment } from "../controllers/subscription/cancelPayment.js";
import { verifyTransaction } from "../controllers/subscription/verifyTransaction.js";

const router = express.Router();

router.get("/plans", getPlans);

router.use(validateToken());

router.get("/me", getMySubscription);
router.get(
  "/activity",
  validateQuery(SubscriptionSchema.paginationQuery),
  getWalletActivity,
);
router.get(
  "/payments",
  validateQuery(SubscriptionSchema.paginationQuery),
  getPaymentHistory,
);
router.get(
  "/payments/:paymentId",
  validateParam(SubscriptionSchema.params.paymentId),
  getPayment,
);
router.post(
  "/checkout",
  validateBody(SubscriptionSchema.checkout),
  createCheckout,
);
router.post(
  "/deposits",
  validateBody(SubscriptionSchema.deposit),
  createDeposit,
);
router.post(
  "/payments/:paymentId/verify",
  validateParam(SubscriptionSchema.params.paymentId),
  validateBody(SubscriptionSchema.verifyTransaction),
  verifyTransaction,
);
router.post(
  "/payments/:paymentId/cancel",
  validateParam(SubscriptionSchema.params.paymentId),
  cancelPayment,
);

router
  .route("/admin/plans")
  .get(
    validateRole("admin"),
    validateQuery(SubscriptionSchema.plan.query),
    getAdminPlans,
  )
  .post(
    validateRole("admin"),
    validateBody(SubscriptionSchema.plan.create),
    createPlan,
  );

router
  .route("/admin/plans/:planId")
  .patch(
    validateRole("admin"),
    validateParam(SubscriptionSchema.params.planId),
    validateBody(SubscriptionSchema.plan.update),
    updatePlan,
  )
  .delete(
    validateRole("admin"),
    validateParam(SubscriptionSchema.params.planId),
    deletePlan,
  );

export const subscriptionRouter = router;
