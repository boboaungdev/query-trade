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
  getMySubscription,
  getPlans,
} from "../controllers/subscription/get.js";
import {
  createPlan,
  deletePlan,
  getAdminPlans,
  updatePlan,
} from "../controllers/subscription/planAdmin.js";

const router = express.Router();

router.get("/plans", getPlans);

router.use(validateToken());

router.get("/me", getMySubscription);
router.post(
  "/checkout",
  validateBody(SubscriptionSchema.checkout),
  createCheckout,
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
