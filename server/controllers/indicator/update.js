import { IndicatorDB } from "../../models/indicator.js";
import { resError, resJson } from "../../utils/response.js";

export const updateIndicator = async (req, res, next) => {
  try {
    const { indicatorId } = req.params;

    const existsIndicator = await IndicatorDB.exists({ _id: indicatorId });

    if (!existsIndicator) {
      throw resError(404, "Indicator not found!");
    }

    const existsIndicatorName = await IndicatorDB.exists({
      _id: { $ne: indicatorId },
      name: req.body.name,
    });

    if (existsIndicatorName) {
      throw resError(409, `'${req.body.name}' Indicator already exists!`);
    }

    const indicator = await IndicatorDB.findByIdAndUpdate(
      indicatorId,
      req.body,
      {
        returnDocument: "after",
      },
    );

    return resJson(res, 200, "Indicator updated successfully.", {
      indicator,
    });
  } catch (error) {
    next(error);
  }
};
