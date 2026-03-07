import { UserDB } from "../models/user.js";
import { clearCookie, resError } from "./response.js";
import { Token } from "./token.js";

export const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return next(resError(400, error.details[0].message));
    }
    req.body = value;
    next();
  };
};

export const validateToken = () => {
  return async (req, res, next) => {
    const authHeader = await req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return next(resError(401, "Need Authorization!"));
    }

    const token = authHeader.split(" ")[1];
    const decoded = Token.verifyAccessToken(token);

    if (!decoded) {
      return next(resError(401, "Invalid or expired token!"));
    }

    const user = await UserDB.findById(decoded.id).select("-password");

    if (!user) {
      return next(resError(401, "Authenticated user not found!"));
    }

    req.user = user;
    next();
  };
};

export const validateCookie = () => {
  return async (req, res, next) => {
    const user = req.user;

    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return next(resError(400, "Session not found, please signin again!"));
    }

    const decoded = Token.verifyRefreshToken(refreshToken);
    if (!decoded) {
      clearCookie(req, res, "_id refreshToken");
      return next(
        resError(401, "Invalid or expired session, please signin again!"),
      );
    }

    const decodedUser = await UserDB.findById(decoded.id).select(
      "refreshToken",
    );

    if (!decodedUser) {
      clearCookie(req, res, "refreshToken");
      return next(
        resError(404, "Authenticated user not found, please signin again!"),
      );
    }

    if (decodedUser._id.toString() !== user._id.toString()) {
      clearCookie(req, res, "refreshToken");
      return next(
        resError(403, "Permission denied! User mismatch, please signin again!"),
      );
    }

    if (decodedUser.refreshToken !== refreshToken) {
      clearCookie(req, res, "refreshToken");
      return next(
        resError(
          403,
          "Session expired or signed in other device, please signin again!",
        ),
      );
    }

    next();
  };
};

export const validateParam = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.params);

    if (error) {
      return next(resError(400, error.details[0].message));
    }
    next();
  };
};

export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query);

    if (error) {
      return next(resError(400, error.details[0].message));
    }

    req.validatedQuery = value;
    next();
  };
};

export const validateRole = (...roles) => {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return next(resError(401, "Authenticated user not found!"));
    }

    if (!roles.includes(user.role)) {
      return next(
        resError(403, `Permission denied! Required role: ${roles.join(", ")}`),
      );
    }

    next();
  };
};

export const validateMessage = ({ schema, data }) => {
  const { error, value } = schema.validate(data);
  if (error) {
    return { valid: false, error: error.details[0].message };
  }
  return { valid: true, value };
};
