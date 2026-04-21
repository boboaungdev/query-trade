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
import {
  getPaymentHistory,
  getPayment,
  getMySubscription,
  getPlans,
} from "../controllers/subscription/get.js";
import {
  createPlan,
  deactivatePlan,
  getAdminPlans,
  updatePlan,
} from "../controllers/subscription/planAdmin.js";
import { verifyTransaction } from "../controllers/subscription/verifyTransaction.js";

const router = express.Router();

router.get("/plans", getPlans);

router.use(validateToken());

router.get("/me", getMySubscription);
router.get("/payments", getPaymentHistory);
router.get("/payments/:paymentId", getPayment);
router.post("/checkout", validateBody(SubscriptionSchema.checkout), createCheckout);
router.post(
  "/payments/:paymentId/verify",
  validateBody(SubscriptionSchema.verifyTransaction),
  verifyTransaction,
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
    validateParam(SubscriptionSchema.plan.params),
    validateBody(SubscriptionSchema.plan.update),
    updatePlan,
  )
  .delete(
    validateRole("admin"),
    validateParam(SubscriptionSchema.plan.params),
    deactivatePlan,
  );

export const subscriptionRouter = router;
