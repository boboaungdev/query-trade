import { DEPOSIT_PAYMENT_MODE } from "./index.js";

export const DEPOSIT_PROVIDER = "manual";
export const PAYMENT_PROVIDERS = {
  manual: "manual",
};
export const PAYMENT_MODES = {
  mock: "mock",
  manual: "manual",
};

export const getPaymentMode = () => {
  const mode = DEPOSIT_PAYMENT_MODE;

  if (Object.values(PAYMENT_MODES).includes(mode)) {
    return mode;
  }

  if (process.env.DEV_MOCK_PAYMENTS === "true") {
    return PAYMENT_MODES.mock;
  }

  return PAYMENT_MODES.manual;
};

export const isMockPaymentMode = () => getPaymentMode() === PAYMENT_MODES.mock;

export const PAYMENT_CURRENCIES = {
  usdtbsc: {
    id: "usdtbsc",
    label: "USDT BEP20",
    network: "BNB Smart Chain",
    description: "USDT on BNB Smart Chain",
  },
};

export const PAYMENT_STATUSES = {
  pending: "pending",
  confirmed: "confirmed",
  cancelled: "cancelled",
  expired: "expired",
};

export const PAYMENT_PURPOSES = {
  tokenTopup: "token_topup",
};

export const WALLET_TRANSACTION_TYPES = {
  deposit: "deposit",
  spend: "spend",
  send: "send",
  receive: "receive",
  refund: "refund",
  adjustment: "adjustment",
};
