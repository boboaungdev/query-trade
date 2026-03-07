import { IndicatorDB } from "../../models/indicator.js";
import { resError, resJson } from "../../utils/response.js";

export const createIndicator = async (req, res, next) => {
  try {
    const { name } = req.body;

    const existsIndicator = await IndicatorDB.exists({ name });

    if (existsIndicator) {
      throw resError(409, `'${name}' Indicator already exists!`);
    }

    const indicator = await IndicatorDB.create(req.body);

    return resJson(res, 201, "Indicator created successfully.", {
      indicator,
    });
  } catch (error) {
    next(error);
  }
};
