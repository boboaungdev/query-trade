import { EXTRA_ALLOWED_ORIGINS } from "../constants/index.js";

const baseOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8081",
];

// Parse additional origins from .env
const extraOrigins = EXTRA_ALLOWED_ORIGINS
  ? EXTRA_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : [];

// Merge and remove duplicates
export const allowedOrigins = [...new Set([...baseOrigins, ...extraOrigins])];
