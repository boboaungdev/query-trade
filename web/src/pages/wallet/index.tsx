import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  EyeOff,
  MessageSquareText,
  Loader2,
  Smartphone,
  TicketPercent,
  Upload,
  UserRound,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/api/axios";
import { fetchUserByUsername } from "@/api/user";
import {
  cancelWalletPayment,
  createTokenDeposit,
  createWalletTransfer,
  getWalletSummary,
  getWalletActivity,
  type Payment,
  type WalletActivity,
} from "@/api/wallet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  getUserAvatarRingClass,
  type UserMembership,
} from "@/components/user-membership";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatCompactTokenAmount } from "@/lib/formatTokenAmount";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

const USERNAME_REGEX = /^[a-z0-9]{6,20}$/;

type SendUsernameStatus =
  | "idle"
  | "invalid"
  | "checking"
  | "available"
  | "unavailable"
  | "error"
  | "self";

type SendRecipientPreview = {
  username: string;
  name?: string;
  avatar?: string;
  membership?: UserMembership;
};

function formatUsdAmount(amount: number) {
  return amount.toLocaleString(undefined, {
    maximumFractionDigits: 8,
  });
}

function formatTokenAmount(amount: number) {
  return formatCompactTokenAmount(amount);
}

function formatFullTokenAmount(amount: number) {
  return amount.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
}

function sanitizeDepositAmountInput(value: string) {
  const sanitized = value.replace(/[^\d.]/g, "");
  const [integerPart = "", ...decimalParts] = sanitized.split(".");
  const nextDecimalPart = decimalParts.join("").slice(0, 2);
  const nextValue = decimalParts.length
    ? `${integerPart}.${nextDecimalPart}`
    : integerPart;

  if (!nextValue) {
    return "";
  }

  const parsedValue = Number(nextValue);

  if (Number.isFinite(parsedValue) && parsedValue > 1000000) {
    return "1000000";
  }

  return nextValue;
}

function sanitizeTransferAmountInput(value: string) {
  const sanitized = value.replace(/[^\d]/g, "");

  if (!sanitized) {
    return "";
  }

  const parsedValue = Number(sanitized);

  if (Number.isFinite(parsedValue) && parsedValue > 1000000000) {
    return "1000000000";
  }

  return sanitized;
}

function formatDateTime(date?: string | null) {
  if (!date) return "No date";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function getStatusTone(status?: string | null) {
  if (status === "confirmed" || status === "completed") {
    return "text-emerald-700";
  }

  if (status === "pending") {
    return "text-amber-500";
  }

  if (status === "cancelled" || status === "expired") {
    return "text-destructive";
  }

  return "text-muted-foreground";
}

function getStatusIcon(status: Payment["status"] | "completed") {
  if (status === "confirmed" || status === "completed") {
    return <CheckCircle2 className="size-4 text-emerald-500" />;
  }

  if (status === "cancelled" || status === "expired") {
    return <XCircle className="size-4 text-destructive" />;
  }

  return <Clock className="size-4 text-amber-500" />;
}

function getActivityLabel(activity: WalletActivity) {
  if (activity.activityType === "deposit") return "Deposit";
  if (activity.activityType === "subscription") return "Subscription";
  if (activity.activityType === "withdraw") return "Withdraw";
  if (activity.activityType === "send") return "Send";
  if (activity.activityType === "receive") return "Receive";
  if (activity.activityType === "refund") return "Refund";
  if (activity.activityType === "adjustment") return "Adjustment";
  return "Spend";
}

function getActivityIcon(activity: WalletActivity) {
  if (activity.activityType === "deposit") {
    return <Download className="size-4 text-emerald-500" />;
  }

  if (activity.activityType === "subscription") {
    return <TicketPercent className="size-4 text-primary" />;
  }

  if (activity.activityType === "withdraw") {
    return <Upload className="size-4 text-amber-500" />;
  }

  if (activity.activityType === "send") {
    return <ArrowUpRight className="size-4 text-blue-500" />;
  }

  if (activity.activityType === "receive") {
    return <ArrowDownLeft className="size-4 text-sky-500" />;
  }

  return getStatusIcon(activity.status);
}

function getActivityPrimaryAmount(activity: WalletActivity) {
  if (activity.activityType === "deposit") {
    return `${formatUsdAmount(Number(activity.amountUsd || 0))} USD`;
  }

  if (
    activity.activityType === "subscription" ||
    activity.activityType === "withdraw" ||
    activity.activityType === "send" ||
    activity.activityType === "spend"
  ) {
    return `-${formatTokenAmount(activity.tokenAmount)} token`;
  }

  return `${formatTokenAmount(activity.tokenAmount)} token`;
}

function getActivitySecondaryText(activity: WalletActivity) {
  if (activity.activityType === "deposit") {
    return `+${formatTokenAmount(activity.tokenAmount)} token`;
  }

  if (typeof activity.balanceAfter === "number") {
    return `After balance: ${formatTokenAmount(activity.balanceAfter)} token`;
  }

  return activity.description || "";
}

function buildPageItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: Array<number | "left-ellipsis" | "right-ellipsis"> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) items.push("left-ellipsis");
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < totalPages - 1) items.push("right-ellipsis");
  items.push(totalPages);

  return items;
}

export default function WalletPage() {
  const userTokenBalance = useAuthStore(
    (state) => state.user?.tokenBalance ?? 0,
  );
  const username = useAuthStore((state) => state.user?.username ?? "");
  const hideWalletBalancePreference = useAuthStore((state) => {
    const preferences = state.user?.preferences;

    if (typeof preferences?.hideWalletBalance === "boolean") {
      return preferences.hideWalletBalance;
    }

    if (typeof preferences?.showWalletBalance === "boolean") {
      return !preferences.showWalletBalance;
    }

    return false;
  });
  const updateUser = useAuthStore((state) => state.updateUser);
  const navigate = useNavigate();
  const [tokenBalance, setTokenBalance] = useState(userTokenBalance);
  const [tokenPerUsdt, setTokenPerUsdt] = useState(1000);
  const [latestPayment, setLatestPayment] = useState<Payment | null>(null);
  const [activities, setActivities] = useState<WalletActivity[]>([]);
  const [showBalance, setShowBalance] = useState(!hideWalletBalancePreference);
  const [depositAmount, setDepositAmount] = useState("");
  const [sendUsername, setSendUsername] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendNote, setSendNote] = useState("");
  const [debouncedSendUsername, setDebouncedSendUsername] = useState("");
  const [sendUsernameStatus, setSendUsernameStatus] =
    useState<SendUsernameStatus>("idle");
  const [sendRecipientPreview, setSendRecipientPreview] =
    useState<SendRecipientPreview | null>(null);
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingDeposit, setIsCreatingDeposit] = useState(false);
  const [isSendingTransfer, setIsSendingTransfer] = useState(false);
  const [isCancellingPayment, setIsCancellingPayment] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isUsernameCopied, setIsUsernameCopied] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const [totalActivityPages, setTotalActivityPages] = useState(1);
  const [activityReloadKey, setActivityReloadKey] = useState(0);
  const sendUsernameRequestIdRef = useRef(0);
  const depositAmountNumber = Number(depositAmount);
  const sendAmountNumber = Number(sendAmount);
  const showDepositAmountError =
    depositAmount.length > 0 &&
    (!Number.isFinite(depositAmountNumber) ||
      depositAmountNumber < 1 ||
      depositAmountNumber > 1000000);
  const isDepositAmountValid =
    depositAmount.length > 0 &&
    Number.isFinite(depositAmountNumber) &&
    depositAmountNumber >= 1 &&
    depositAmountNumber <= 1000000;
  const trimmedSendUsername = sendUsername.trim().toLowerCase();
  const showSendAmountError =
    sendAmount.length > 0 &&
    (!Number.isFinite(sendAmountNumber) ||
      sendAmountNumber < 1 ||
      sendAmountNumber > tokenBalance);
  const isSendAmountValid =
    sendAmount.length > 0 &&
    Number.isFinite(sendAmountNumber) &&
    sendAmountNumber >= 1 &&
    sendAmountNumber <= tokenBalance;
  const isSendUsernameValid = sendUsernameStatus === "available";
  const isSendFormValid = isSendUsernameValid && isSendAmountValid;
  const sendUsernameHelperText =
    sendUsernameStatus === "invalid"
      ? "Username must be 6-20 characters"
      : sendUsernameStatus === "checking"
        ? "Checking username..."
        : sendUsernameStatus === "unavailable"
          ? "User not found"
          : sendUsernameStatus === "error"
            ? "Unable to check username right now"
            : sendUsernameStatus === "self"
              ? "You cannot send token to yourself"
              : "";

  useEffect(() => {
    let ignore = false;

    async function loadWallet() {
      setIsLoading(true);

      try {
        const [walletData, activityData] = await Promise.all([
          getWalletSummary(),
          getWalletActivity({ page: activityPage, limit: 10 }),
        ]);

        if (!ignore) {
          const nextTokenBalance = Number(walletData.tokenBalance ?? 0);
          setTokenBalance(nextTokenBalance);
          updateUser({ tokenBalance: nextTokenBalance });
          setTokenPerUsdt(walletData.tokenPerUsdt ?? 1000);
          setLatestPayment(walletData.latestPayment ?? null);
          setActivities(activityData.activities ?? []);
          setTotalActivityPages(Math.max(1, activityData.totalPage ?? 1));
        }
      } catch (error) {
        if (!ignore) {
          toast.error(getApiErrorMessage(error, "Failed to load wallet."));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadWallet();

    return () => {
      ignore = true;
    };
  }, [activityPage, activityReloadKey, updateUser]);

  useEffect(() => {
    setShowBalance(!hideWalletBalancePreference);
  }, [hideWalletBalancePreference]);

  useEffect(() => {
    const trimmedValue = sendUsername.trim();

    if (!trimmedValue) {
      setDebouncedSendUsername("");
      setSendUsernameStatus("idle");
      setSendRecipientPreview(null);
      return;
    }

    if (trimmedValue.toLowerCase() === username.toLowerCase()) {
      setDebouncedSendUsername("");
      setSendUsernameStatus("self");
      setSendRecipientPreview(null);
      return;
    }

    if (!USERNAME_REGEX.test(trimmedValue)) {
      setDebouncedSendUsername("");
      setSendUsernameStatus("invalid");
      setSendRecipientPreview(null);
      return;
    }

    setSendUsernameStatus("checking");
    setSendRecipientPreview(null);

    const timeout = window.setTimeout(() => {
      setDebouncedSendUsername(trimmedValue.toLowerCase());
    }, 350);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [sendUsername, username]);

  useEffect(() => {
    setTokenBalance(userTokenBalance);
  }, [userTokenBalance]);

  useEffect(() => {
    if (!debouncedSendUsername) {
      return;
    }

    const requestId = sendUsernameRequestIdRef.current + 1;
    sendUsernameRequestIdRef.current = requestId;
    setSendUsernameStatus("checking");

    fetchUserByUsername(debouncedSendUsername)
      .then((data) => {
        if (sendUsernameRequestIdRef.current !== requestId) {
          return;
        }

        setSendUsernameStatus("available");
        setSendRecipientPreview({
          username:
            data?.result?.user?.username || debouncedSendUsername,
          name: data?.result?.user?.name,
          avatar: data?.result?.user?.avatar,
          membership: data?.result?.user?.membership,
        });
      })
      .catch((error) => {
        if (sendUsernameRequestIdRef.current !== requestId) {
          return;
        }

        const status = error?.response?.status;
        setSendUsernameStatus(status === 404 ? "unavailable" : "error");
        setSendRecipientPreview(null);
      });
  }, [debouncedSendUsername]);

  const activityPageItems = buildPageItems(activityPage, totalActivityPages);
  const walletBalanceUsdText = showBalance
    ? `~ ${formatUsdAmount(tokenBalance / tokenPerUsdt)} USD`
    : "~ hidden USD";
  const walletBalanceTokenText = showBalance
    ? `${formatFullTokenAmount(tokenBalance)} token`
    : "**** token";

  const refreshActivity = () => {
    setActivityPage(1);
    setActivityReloadKey((current) => current + 1);
  };

  const toggleShowBalance = () => {
    setShowBalance((current) => !current);
  };

  const handleDepositDialogOpenChange = (open: boolean) => {
    setIsDepositDialogOpen(open);

    if (!open) {
      setDepositAmount("");
    }
  };

  const handleSendDialogOpenChange = (open: boolean) => {
    setIsSendDialogOpen(open);

    if (!open) {
      setSendUsername("");
      setSendAmount("");
      setSendNote("");
      setDebouncedSendUsername("");
      setSendUsernameStatus("idle");
      setSendRecipientPreview(null);
    }
  };

  const handleCreateDeposit = async () => {
    const amountUsdt = depositAmountNumber;

    if (
      !Number.isFinite(amountUsdt) ||
      amountUsdt < 1 ||
      amountUsdt > 1000000
    ) {
      toast.error("Invalid input. Use 1.00 to 1000000 for deposit.");
      return;
    }

    setIsCreatingDeposit(true);

    try {
      const data = await createTokenDeposit({
        amountUsdt,
        payCurrency: "usdtbsc",
      });

      setLatestPayment(data.payment);

      if (data.payment.status === "confirmed") {
        const nextBalance = tokenBalance + data.payment.tokenAmount;
        setTokenBalance(nextBalance);
        updateUser({ tokenBalance: nextBalance });
        setDepositAmount("");
        setIsDepositDialogOpen(false);
        refreshActivity();
        toast.success("Deposit confirmed.");
      } else {
        setDepositAmount("");
        setIsDepositDialogOpen(false);
        refreshActivity();
        toast.success("Deposit request created.");
        navigate(`/payment/${data.payment._id}`);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to create deposit."));
    } finally {
      setIsCreatingDeposit(false);
    }
  };

  const handleCancelLatestPayment = async () => {
    if (
      !latestPayment ||
      latestPayment.status !== "pending" ||
      isCancellingPayment
    ) {
      return;
    }

    setIsCancellingPayment(true);

    try {
      const data = await cancelWalletPayment(latestPayment._id);
      setLatestPayment(data.payment);
      setIsCancelDialogOpen(false);
      refreshActivity();
      toast.success("Deposit cancelled.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to cancel deposit."));
    } finally {
      setIsCancellingPayment(false);
    }
  };

  const handleCopyUsername = async () => {
    if (!username) {
      return;
    }

    await navigator.clipboard.writeText(username);
    setIsUsernameCopied(true);
    toast.success("Username copied.");
    window.setTimeout(() => {
      setIsUsernameCopied(false);
    }, 1500);
  };

  const handleSendTransfer = async () => {
    if (!isSendFormValid || isSendingTransfer) {
      return;
    }

    setIsSendingTransfer(true);

    try {
      const data = await createWalletTransfer({
        username: trimmedSendUsername,
        amount: sendAmountNumber,
        note: sendNote.trim(),
      });

      setTokenBalance(data.tokenBalance);
      updateUser({ tokenBalance: data.tokenBalance });
      handleSendDialogOpenChange(false);
      refreshActivity();
      toast.success(`Sent token to @${data.transfer.recipient.username}.`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to send token."));
    } finally {
      setIsSendingTransfer(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="rounded-lg border-0 shadow-none">
          <CardHeader>
            <CardTitle>Balance</CardTitle>
            <div className="flex items-center justify-between gap-3">
              <CardDescription>Your available wallet token.</CardDescription>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={toggleShowBalance}
                aria-label={showBalance ? "Hide balance" : "Show balance"}
              >
                {showBalance ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-nowrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Wallet className="size-5 text-muted-foreground" />
                <p className="truncate text-3xl font-semibold tracking-tight">
                  {showBalance ? formatTokenAmount(tokenBalance) : "****"} token
                </p>
              </div>
              <Button
                className="shrink-0"
                onClick={() => setIsDepositDialogOpen(true)}
              >
                <Download className="size-4" />
                Deposit
              </Button>
            </div>
            <p className="hidden text-sm text-muted-foreground">
              {walletBalanceUsdText}
            </p>
            <p className="text-sm text-muted-foreground">
              {walletBalanceTokenText}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Button
                className="justify-center"
                variant="outline"
                onClick={() => setIsSendDialogOpen(true)}
              >
                <ArrowUpRight className="size-4" />
                Send
              </Button>
              <Button
                className="justify-center"
                variant="outline"
                onClick={() => setIsReceiveDialogOpen(true)}
              >
                <ArrowDownLeft className="size-4" />
                Receive
              </Button>
              <Button className="justify-center" variant="outline" disabled>
                <Upload className="size-4" />
                Withdraw
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-0 shadow-none">
          <CardHeader>
            <CardTitle>Latest Deposit</CardTitle>
            <CardDescription>Your most recent deposit request.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <>
                <div className="space-y-2">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    className="w-full animate-pulse bg-muted text-transparent shadow-none hover:bg-muted"
                    disabled
                  >
                    <span className="invisible">Verify deposit</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full animate-pulse border-0 bg-muted text-transparent shadow-none hover:bg-muted"
                    disabled
                  >
                    <span className="invisible">Cancel</span>
                  </Button>
                </div>
              </>
            ) : latestPayment ? (
              <>
                <div>
                  <p className="text-2xl font-semibold tracking-tight">
                    {formatUsdAmount(
                      latestPayment.payCurrencyAmount ??
                        latestPayment.requestedAmountUsdt,
                    )}{" "}
                    USD
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatTokenAmount(latestPayment.tokenAmount)} token
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span
                    className={`font-medium capitalize ${getStatusTone(
                      latestPayment.status,
                    )}`}
                  >
                    {latestPayment.status}
                  </span>
                </div>

                {latestPayment.status === "pending" ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button asChild className="w-full">
                      <Link to={`/payment/${latestPayment._id}`}>
                        Verify deposit
                      </Link>
                    </Button>
                    <AlertDialog
                      open={isCancelDialogOpen}
                      onOpenChange={setIsCancelDialogOpen}
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          disabled={isCancellingPayment}
                        >
                          Cancel
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel deposit?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This deposit request will be cancelled and cannot be
                            continued.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isCancellingPayment}>
                            Keep deposit
                          </AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            onClick={() => void handleCancelLatestPayment()}
                            disabled={isCancellingPayment}
                          >
                            {isCancellingPayment ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              "Yes, cancel"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No deposits yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg border-0 shadow-none">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            All deposits, subscriptions, and future wallet transactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex min-h-24 items-center justify-center">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : activities.length ? (
            <>
              <div className="space-y-1.5">
                {activities.map((activity) => (
                  <div
                    key={`${activity.sourceType}-${activity._id}`}
                    className="rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {getActivityIcon(activity)}
                          <span className="font-medium">
                            {getActivityLabel(activity)}
                          </span>
                          <span
                            className={`rounded-md bg-muted px-2 py-0.5 text-xs capitalize ${getStatusTone(
                              activity.status,
                            )}`}
                          >
                            {activity.status}
                          </span>
                        </div>
                        <p className="text-muted-foreground">
                          {activity.description || getActivityLabel(activity)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(activity.createdAt)}
                        </p>
                      </div>

                      <span className="shrink-0 font-semibold">
                        {getActivityPrimaryAmount(activity)}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {getActivitySecondaryText(activity)}
                    </p>

                    {activity.sourceType === "payment" &&
                    activity.status === "pending" ? (
                      <div className="mt-2 flex justify-start">
                        <Button asChild size="sm">
                          <Link to={`/payment/${activity._id}`}>Verify</Link>
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              {totalActivityPages > 1 ? (
                <Pagination className="justify-center pt-4">
                  <PaginationContent className="flex-nowrap justify-center">
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          setActivityPage((prev) => Math.max(1, prev - 1));
                        }}
                        className={
                          activityPage <= 1
                            ? "pointer-events-none opacity-50"
                            : undefined
                        }
                      />
                    </PaginationItem>

                    {activityPageItems.map((item, index) =>
                      typeof item === "number" ? (
                        <PaginationItem key={`activity-page-${item}`}>
                          <PaginationLink
                            href="#"
                            isActive={item === activityPage}
                            onClick={(event) => {
                              event.preventDefault();
                              setActivityPage(item);
                            }}
                          >
                            {item}
                          </PaginationLink>
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={`${item}-${index}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ),
                    )}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          setActivityPage((prev) =>
                            Math.min(totalActivityPages, prev + 1),
                          );
                        }}
                        className={
                          activityPage >= totalActivityPages
                            ? "pointer-events-none opacity-50"
                            : undefined
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              ) : null}
            </>
          ) : (
            <div className="flex min-h-24 items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No wallet transactions yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isDepositDialogOpen}
        onOpenChange={handleDepositDialogOpenChange}
      >
        <DialogContent onOpenAutoFocus={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Deposit</DialogTitle>
            <DialogDescription>
              Enter the USD amount and choose a payment method.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <DollarSign className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  inputMode="decimal"
                  value={depositAmount}
                  onChange={(event) =>
                    setDepositAmount(
                      sanitizeDepositAmountInput(event.target.value),
                    )
                  }
                  placeholder="1.00"
                  className="pr-14 pl-9"
                  disabled={isCreatingDeposit}
                  aria-invalid={showDepositAmountError}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                  USD
                </span>
              </div>
              {showDepositAmountError ? (
                <p className="text-sm text-destructive">
                  Invalid input. Use 1.00 to 1000000 for deposit.
                </p>
              ) : null}
              {!showDepositAmountError && depositAmountNumber >= 1 ? (
                <p className="text-sm text-muted-foreground">
                  {`You will get ${formatTokenAmount(depositAmountNumber * tokenPerUsdt)} token for ${depositAmount} USD.`}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2 justify-items-center">
              <Button
                onClick={() => void handleCreateDeposit()}
                disabled={isCreatingDeposit || !isDepositAmountValid}
                className="w-full justify-center"
              >
                {isCreatingDeposit ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <Wallet className="size-4" />
                    Pay with USDT
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                disabled
                className="w-full justify-center"
              >
                <Smartphone className="size-4" />
                Pay with Google Pay
              </Button>
              <Button
                variant="outline"
                disabled
                className="w-full justify-center"
              >
                <CreditCard className="size-4" />
                Pay with Apple Pay
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSendDialogOpen} onOpenChange={handleSendDialogOpenChange}>
        <DialogContent onOpenAutoFocus={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Send token</DialogTitle>
            <DialogDescription>
              Send token to another user by username.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                {sendRecipientPreview?.avatar ? (
                  <img
                    src={sendRecipientPreview.avatar}
                    alt={sendRecipientPreview.name || sendRecipientPreview.username}
                    className={cn(
                      "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 rounded-full object-cover",
                      getUserAvatarRingClass(sendRecipientPreview.membership),
                    )}
                  />
                ) : (
                  <UserRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                )}
                <Input
                  type="text"
                  value={sendUsername}
                  onChange={(event) =>
                    setSendUsername(
                      event.target.value.replace(/[^a-z0-9]/gi, "").toLowerCase(),
                    )
                  }
                  placeholder="username"
                  className="pl-9 pr-10"
                  aria-invalid={
                    sendUsernameStatus === "invalid" ||
                    sendUsernameStatus === "unavailable" ||
                    sendUsernameStatus === "error" ||
                    sendUsernameStatus === "self"
                  }
                  disabled={isSendingTransfer}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
                  {sendUsernameStatus === "checking" ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : sendUsernameStatus === "available" ? (
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  ) : sendUsernameStatus === "invalid" ||
                    sendUsernameStatus === "unavailable" ||
                    sendUsernameStatus === "error" ||
                    sendUsernameStatus === "self" ? (
                    <XCircle className="size-4 text-destructive" />
                  ) : null}
                </span>
              </div>
              {sendUsernameHelperText ? (
                <p
                  className={`text-xs ${
                    sendUsernameStatus === "checking"
                      ? "text-muted-foreground"
                      : "text-destructive"
                  }`}
                >
                  {sendUsernameHelperText}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Wallet className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  inputMode="numeric"
                  value={sendAmount}
                  onChange={(event) =>
                    setSendAmount(
                      sanitizeTransferAmountInput(event.target.value),
                    )
                  }
                  placeholder="1"
                  className="pr-16 pl-9"
                  disabled={isSendingTransfer}
                  aria-invalid={showSendAmountError}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                  token
                </span>
              </div>
              {showSendAmountError ? (
                <p className="text-xs text-destructive">
                  Enter a valid amount up to your available balance.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Available: {formatTokenAmount(tokenBalance)} token
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="relative">
                <MessageSquareText className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" />
                <span className="pointer-events-none absolute top-3 right-3 text-xs text-muted-foreground">
                  {sendNote.length}/50
                </span>
                <Textarea
                  value={sendNote}
                  onChange={(event) => setSendNote(event.target.value.slice(0, 50))}
                  placeholder="Optional note"
                  className="h-14 resize-none overflow-y-auto whitespace-pre-wrap break-all pr-14 pl-9"
                  disabled={isSendingTransfer}
                />
              </div>
            </div>

            <Button
              onClick={() => void handleSendTransfer()}
              disabled={!isSendFormValid || isSendingTransfer}
              className="w-full justify-center"
            >
              {isSendingTransfer ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <ArrowUpRight className="size-4" />
                  Send token
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isReceiveDialogOpen}
        onOpenChange={setIsReceiveDialogOpen}
      >
        <DialogContent onOpenAutoFocus={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Receive token</DialogTitle>
            <DialogDescription>
              Share your username so another user can send token to you.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">Your username</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                @{username}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full justify-center"
              onClick={() => void handleCopyUsername()}
              disabled={!username}
            >
              {isUsernameCopied ? (
                <>
                  <Check className="size-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  Copy username
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

