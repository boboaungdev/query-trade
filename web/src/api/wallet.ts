import api from "./axios";
import type { UserMembership } from "@/components/user-membership";

export type PayCurrency = "usdtbsc";
export type PaymentStatus = "pending" | "confirmed" | "cancelled" | "expired";

export type Payment = {
  _id: string;
  purpose: "token_topup";
  requestedAmountUsdt: number;
  tokenAmount: number;
  rateSnapshot: number;
  status: PaymentStatus;
  providerStatus?: string;
  payAddress?: string;
  payCurrencyAmount?: number;
  payCurrency: PayCurrency;
  txHash?: string;
  providerReference?: string;
  txFrom?: string;
  txBlockNumber?: number;
  confirmedAmountUsdt?: number;
  createdAt: string;
  confirmedAt?: string;
};

export type WalletTransaction = {
  _id: string;
  type:
    | "deposit"
    | "spend"
    | "send"
    | "receive"
    | "reward"
    | "refund"
    | "adjustment";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  planKey?: string;
  createdAt: string;
};

export type WalletTransfer = {
  transaction?: WalletActivity;
  senderTransaction: WalletTransaction;
  recipientTransaction: WalletTransaction;
  recipient: {
    _id: string;
    username: string;
    name: string;
  };
};

export type WalletActivity = {
  _id: string;
  transactionId?: string;
  sourceType: "payment" | "wallet_transaction" | "transaction";
  activityType:
    | "deposit"
    | "subscription"
    | "withdraw"
    | "send"
    | "receive"
    | "reward"
    | "refund"
    | "adjustment"
    | "spend";
  status: PaymentStatus | "completed";
  amountUsd?: number;
  tokenAmount: number;
  rateSnapshot?: number;
  payCurrency?: PayCurrency;
  txHash?: string | null;
  balanceBefore?: number;
  balanceAfter?: number;
  plan?: string | null;
  description?: string;
  note?: string;
  metadata?: {
    transferId?: string;
    durationDays?: number;
    originalAmountToken?: number;
    discountAmountToken?: number;
    provider?: string;
    providerReference?: string;
    payAddress?: string;
    orderId?: string;
    rewardSource?: string;
    strategyId?: string;
    strategyName?: string;
    viewerId?: string;
    viewerUsername?: string;
  };
  actor?: {
    _id?: string | null;
    username?: string;
    name?: string;
    avatar?: string;
    membership?: UserMembership;
  } | null;
  counterparty?: {
    _id?: string | null;
    username?: string;
    name?: string;
    avatar?: string;
    membership?: UserMembership;
  } | null;
  createdAt: string;
  confirmedAt?: string | null;
};

export async function getWalletSummary() {
  const { data } = await api.get<{
    result: {
      latestPayment?: Payment | null;
      tokenBalance: number;
      tokenPerUsd: number;
    };
  }>("/wallet/summary");

  return data.result;
}

export async function getPaymentHistory({
  page,
  limit,
}: {
  page?: number;
  limit?: number;
} = {}) {
  const { data } = await api.get<{
    result: {
      payments: Payment[];
      total?: number;
      totalPage?: number;
      currentPage?: number;
      limitPerPage?: number;
      hasNextPage?: boolean;
      hasPrevPage?: boolean;
    };
  }>("/wallet/payments", {
    params: {
      page,
      limit,
    },
  });

  return data.result;
}

export async function getWalletActivity({
  page,
  limit,
}: {
  page?: number;
  limit?: number;
} = {}) {
  const { data } = await api.get<{
    result: {
      activities: WalletActivity[];
      total?: number;
      totalPage?: number;
      currentPage?: number;
      limitPerPage?: number;
      hasNextPage?: boolean;
      hasPrevPage?: boolean;
    };
  }>("/wallet/activity", {
    params: {
      page,
      limit,
    },
  });

  return data.result;
}

export async function getTransactionReceipt(transactionId: string) {
  const { data } = await api.get<{
    result: {
      transaction: WalletActivity;
    };
  }>(`/wallet/transactions/${transactionId}`);

  return data.result;
}

export async function getPayment(paymentId: string) {
  const { data } = await api.get<{
    result: {
      payment: Payment;
    };
  }>(`/wallet/payments/${paymentId}`);

  return data.result;
}

export async function createTokenDeposit({
  amountUsdt,
  payCurrency,
}: {
  amountUsdt: number;
  payCurrency: PayCurrency;
}) {
  const { data } = await api.post<{
    result: {
      payment: Payment;
      transaction?: WalletActivity;
    };
  }>("/wallet/deposits", {
    amountUsdt,
    payCurrency,
  });

  return data.result;
}

export async function verifyWalletPayment({
  paymentId,
  txHash,
}: {
  paymentId: string;
  txHash: string;
}) {
  const { data } = await api.post<{
    result: {
      payment: Payment;
      transaction?: WalletActivity;
      walletTransaction?: WalletTransaction;
      tokenBalance?: number;
    };
  }>(`/wallet/payments/${paymentId}/verify`, {
    txHash,
  });

  return data.result;
}

export async function cancelWalletPayment(paymentId: string) {
  const { data } = await api.post<{
    result: {
      payment: Payment;
      transaction?: WalletActivity | null;
    };
  }>(`/wallet/payments/${paymentId}/cancel`);

  return data.result;
}

export async function createWalletTransfer({
  username,
  amount,
  note,
}: {
  username: string;
  amount: number;
  note?: string;
}) {
  const { data } = await api.post<{
    result: {
      transfer: WalletTransfer;
      tokenBalance: number;
    };
  }>("/wallet/transfers", {
    username,
    amount,
    note,
  });

  return data.result;
}
