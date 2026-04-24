// App
export const PORT = process.env.PORT || 3001;
export const APP_NAME = process.env.APP_NAME || "Query Trade";
export const APP_URL = process.env.APP_URL;
export const EXPIRE_MINUTE = parseInt(process.env.EXPIRE_MINUTE ?? "10", 10);
export const EXTRA_ALLOWED_ORIGINS = process.env.EXTRA_ALLOWED_ORIGINS || "";
export const ENABLE_DEFAULT_SEED = process.env.ENABLE_DEFAULT_SEED !== "false";

// Database
export const MONGO_URI = process.env.MONGO_URI;

// Auth
export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

// Email
export const EMAIL_USER = process.env.EMAIL_USER;
export const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;

// Cloudinary
export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Deposit
export const DEPOSIT_PAYMENT_MODE =
  process.env.DEPOSIT_PAYMENT_MODE || "manual";
const parsedBscMinConfirmations = parseInt(
  process.env.BSC_MIN_CONFIRMATIONS ?? "3",
  10,
);
export const BSC_MIN_CONFIRMATIONS =
  Number.isInteger(parsedBscMinConfirmations) && parsedBscMinConfirmations > 0
    ? parsedBscMinConfirmations
    : 3;
export const BSC_RPC_URL = process.env.BSC_RPC_URL;
export const USDT_BSC_CONTRACT = process.env.USDT_BSC_CONTRACT;
export const USDT_RECEIVE_ADDRESS = process.env.USDT_RECEIVE_ADDRESS;

// Token
const parsedTokenPerUsdt = parseInt(process.env.TOKEN_PER_USDT ?? "1000", 10);
export const TOKEN_PER_USDT =
  Number.isInteger(parsedTokenPerUsdt) && parsedTokenPerUsdt > 0
    ? parsedTokenPerUsdt
    : 1000;
