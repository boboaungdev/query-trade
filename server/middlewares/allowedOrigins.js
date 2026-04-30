import {
  SITE_URL,
  EXTRA_ALLOWED_ORIGINS,
  APP_URL,
} from "../constants/index.js";

const baseOrigins = [SITE_URL, APP_URL];

// Parse additional origins from .env
const extraOrigins = EXTRA_ALLOWED_ORIGINS
  ? EXTRA_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : [];

// Merge and remove duplicates
export const allowedOrigins = [...new Set([...baseOrigins, ...extraOrigins])];
