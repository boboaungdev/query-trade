import { BASE_ORIGINS } from "../constants/index.js";

// Parse additional origins from .env
const extraOrigins = process.env.EXTRA_ALLOWED_ORIGINS
  ? process.env.EXTRA_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : [];

// Merge and remove duplicates
export const allowedOrigins = [...new Set([...BASE_ORIGINS, ...extraOrigins])];
