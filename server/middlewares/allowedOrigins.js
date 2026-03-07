const baseOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];

// Parse additional origins from .env
const extraOrigins = process.env.EXTRA_ALLOWED_ORIGINS
  ? process.env.EXTRA_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : [];

// Merge and remove duplicates
export const allowedOrigins = [...new Set([...baseOrigins, ...extraOrigins])];
