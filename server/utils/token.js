import jwt from "jsonwebtoken";
import {
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
} from "../constants/index.js";

export const Token = {
  makeAccessToken(payload) {
    return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
      expiresIn: "7d",
    });
  },

  makeRefreshToken(payload) {
    return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
      expiresIn: "30d",
    });
  },

  verifyAccessToken(token) {
    try {
      return jwt.verify(token, ACCESS_TOKEN_SECRET);
    } catch {
      return null;
    }
  },

  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, REFRESH_TOKEN_SECRET);
    } catch {
      return null;
    }
  },
};
