export const PORT = process.env.PORT || 3001;
export const APP_NAME = process.env.APP_NAME || "Query Trade";
export const EXPIRE_MINUTE = parseInt(process.env.EXPIRE_MINUTE ?? "10", 10);
export const EXTRA_ALLOWED_ORIGINS = process.env.EXTRA_ALLOWED_ORIGINS || "";
export const ENABLE_INDICATOR_SEED =
  process.env.ENABLE_INDICATOR_SEED !== "false";

export const APP_URL = process.env.APP_URL;
export const MONGO_URI = process.env.MONGO_URI;

export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

export const EMAIL_USER = process.env.EMAIL_USER;
export const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;

export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
