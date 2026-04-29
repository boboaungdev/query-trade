// App
export const PORT = process.env.PORT || 3001;
export const APP_NAME = process.env.APP_NAME || "Query Trade";
export const EXPIRE_MINUTE = parseInt(process.env.EXPIRE_MINUTE ?? "10", 10);
export const EXTRA_ALLOWED_ORIGINS = process.env.EXTRA_ALLOWED_ORIGINS || "";
export const ENABLE_DEFAULT_SEED = process.env.ENABLE_DEFAULT_SEED !== "false";

// Deposit
export const DEPOSIT_PAYMENT_MODE =
  process.env.DEPOSIT_PAYMENT_MODE || "manual";
export const BSC_MIN_CONFIRMATIONS =
  parseInt(process.env.BSC_MIN_CONFIRMATIONS || "3", 10) || 3;
export const BSC_RPC_URL =
  process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org";
export const USDT_BSC_CONTRACT =
  process.env.USDT_BSC_CONTRACT || "0x55d398326f99059fF775485246999027B3197955";
export const USDT_RECEIVE_ADDRESS =
  process.env.USDT_RECEIVE_ADDRESS ||
  "0xB34ed75732392F9Fd49D24d3e6F957Db80860FB9";

// Token
export const TOKEN_PER_USD =
  parseInt(process.env.TOKEN_PER_USD || process.env.TOKEN_PER_USD || "100", 10) ||
  1000;
export const PAID_STRATEGY_VIEW_REWARD_TOKENS =
  Number(process.env.PAID_STRATEGY_VIEW_REWARD_TOKENS || "1") || 1;

// Required env
export const APP_URL = process.env.APP_URL;
export const MONGO_URI = process.env.MONGO_URI;
export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const EMAIL_USER = process.env.EMAIL_USER;
export const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
