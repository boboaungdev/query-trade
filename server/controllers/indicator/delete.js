import { IndicatorDB } from "../../models/indicator.js";
import { resError, resJson } from "../../utils/response.js";

export const deleteIndicator = async (req, res, next) => {
  try {
    const { indicatorId } = req.params;

    const indicator = await IndicatorDB.findByIdAndDelete(indicatorId);

    if (!indicator) {
      throw resError(404, "Indicator not found!");
    }

    return resJson(res, 200, "Indicator deleted successfully.", {
      indicator,
    });
  } catch (error) {
    next(error);
  }
};
