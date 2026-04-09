import { IndicatorDB } from "../../models/indicator.js";
import { resError, resJson } from "../../utils/response.js";

export const getIndicatorById = async (req, res, next) => {
  try {
    const { indicatorId } = req.params;

    const indicator = await IndicatorDB.findById(indicatorId).lean();

    if (!indicator) {
      throw resError(404, "Indicator not found!");
    }

    return resJson(res, 200, "Success single indicator fetched by ID.", {
      indicator,
    });
  } catch (error) {
    next(error);
  }
};

export const getIndicators = async (req, res, next) => {
  try {
    const { page, limit, search, category, sortBy, order } = req.validatedQuery;
    const skip = (page - 1) * limit;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (category) {
      filter.category = category;
    }

    const sortOrder = order === "desc" ? -1 : 1;

    const [indicators, total] = await Promise.all([
      IndicatorDB.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),

      IndicatorDB.countDocuments(filter),
    ]);

    const totalPage = Math.ceil(total / limit);

    return resJson(
      res,
      200,
      "All indicators fetched successfully with pagination.",
      {
        total,
        totalPage,
        currentPage: page,
        limitPerPage: limit,
        hasNextPage: page < totalPage,
        hasPrevPage: page > 1,
        indicators,
      },
    );
  } catch (error) {
    next(error);
  }
};
