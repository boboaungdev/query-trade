import { SubscriptionPlanDB } from "../../models/subscriptionPlan.js";
import { serializePlan } from "../../services/subscription/calculatePlanPricing.js";
import { resError, resJson } from "../../utils/response.js";

const buildPlanKeyBase = (name) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

const generatePlanKey = (name) => {
  const baseKey = buildPlanKeyBase(name);

  if (!baseKey || baseKey.length < 2) {
    throw resError(400, "Plan name must produce a valid key.");
  }

  return baseKey;
};

export const getAdminPlans = async (req, res, next) => {
  try {
    const { page, limit, search, sortBy, order } = req.validatedQuery;
    const skip = (page - 1) * limit;
    const filter = {};

    if (search) {
      filter.$or = [
        { key: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { features: { $elemMatch: { $regex: search, $options: "i" } } },
        { "discount.label": { $regex: search, $options: "i" } },
      ];
    }

    const sortOrder = order === "desc" ? -1 : 1;
    const sort =
      sortBy === "sortOrder"
        ? { sortOrder: sortOrder, amountUsd: 1, createdAt: 1 }
        : { [sortBy]: sortOrder, sortOrder: 1, amountUsd: 1 };

    const [plans, total] = await Promise.all([
      SubscriptionPlanDB.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      SubscriptionPlanDB.countDocuments(filter),
    ]);
    const totalPage = Math.ceil(total / limit);

    return resJson(res, 200, "Subscription plans.", {
      plans: plans.map(serializePlan),
      total,
      totalPage,
      currentPage: page,
      limitPerPage: limit,
      hasNextPage: page < totalPage,
      hasPrevPage: page > 1,
    });
  } catch (error) {
    next(error);
  }
};

export const createPlan = async (req, res, next) => {
  try {
    const generatedKey = generatePlanKey(req.body.name);
    const existingSortOrderPlan = await SubscriptionPlanDB.findOne({
      sortOrder: req.body.sortOrder,
    }).lean();

    if (existingSortOrderPlan) {
      throw resError(409, "Sort order already exists.");
    }

    const existingNamePlan = await SubscriptionPlanDB.findOne({
      name: req.body.name.trim(),
    }).lean();

    if (existingNamePlan) {
      throw resError(409, "Plan name already exists.");
    }

    const existingKeyPlan = await SubscriptionPlanDB.findOne({
      key: generatedKey,
    }).lean();

    if (existingKeyPlan) {
      throw resError(409, "Generated plan key already exists.");
    }

    const plan = await SubscriptionPlanDB.create({
      ...req.body,
      key: generatedKey,
    });

    return resJson(res, 201, "Subscription plan created.", {
      plan: serializePlan(plan.toObject()),
    });
  } catch (error) {
    if (error?.code === 11000) {
      next(resError(409, "Subscription plan already exists."));
      return;
    }

    next(error);
  }
};

export const updatePlan = async (req, res, next) => {
  try {
    if (typeof req.body.name === "string") {
      const nextName = req.body.name.trim();
      const nextKey = generatePlanKey(nextName);

      const [existingNamePlan, existingKeyPlan] = await Promise.all([
        SubscriptionPlanDB.findOne({
          _id: { $ne: req.params.planId },
          name: nextName,
        }).lean(),
        SubscriptionPlanDB.findOne({
          _id: { $ne: req.params.planId },
          key: nextKey,
        }).lean(),
      ]);

      if (existingNamePlan) {
        throw resError(409, "Plan name already exists.");
      }

      if (existingKeyPlan) {
        throw resError(409, "Generated plan key already exists.");
      }

      req.body.key = nextKey;
    }

    if (typeof req.body.sortOrder === "number") {
      const existingSortOrderPlan = await SubscriptionPlanDB.findOne({
        _id: { $ne: req.params.planId },
        sortOrder: req.body.sortOrder,
      }).lean();

      if (existingSortOrderPlan) {
        throw resError(409, "Sort order already exists.");
      }
    }

    const plan = await SubscriptionPlanDB.findByIdAndUpdate(
      req.params.planId,
      { $set: req.body },
      { returnDocument: "after", runValidators: true },
    ).lean();

    if (!plan) {
      throw resError(404, "Subscription plan not found.");
    }

    return resJson(res, 200, "Subscription plan updated.", {
      plan: serializePlan(plan),
    });
  } catch (error) {
    next(error);
  }
};

export const deactivatePlan = async (req, res, next) => {
  try {
    const plan = await SubscriptionPlanDB.findByIdAndDelete(
      req.params.planId,
    ).lean();

    if (!plan) {
      throw resError(404, "Subscription plan not found.");
    }

    return resJson(res, 200, "Subscription plan deleted.", {
      plan: serializePlan(plan),
    });
  } catch (error) {
    next(error);
  }
};
