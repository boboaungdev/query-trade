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
  ScanLine,
  Smartphone,
  TicketPercent,
  Upload,
  UserRound,
  Wallet,
  XCircle,
} from "lucide-react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import jsQR from "jsqr";
import { toast } from "sonner";

import {
  APP_NAME,
} from "@/constants";
import { getApiErrorMessage } from "@/api/axios";
import { fetchUserById, fetchUserByUsername } from "@/api/user";
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
  UserMembershipMark,
  type UserMembership,
} from "@/components/user-membership";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatCompactTokenAmount } from "@/lib/formatTokenAmount";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

const USERNAME_REGEX = /^[a-z0-9]{6,20}$/;
const WALLET_QR_APP_PREFIX = APP_NAME.trim().toLowerCase().replace(/\s+/g, "-");
const WALLET_QR_RECEIVE_TITLE = "Receive Token";
const WALLET_QR_SCAN_LABEL = "Scan with";
const WALLET_QR_USAGE_NOTE = "Only use this QR inside the app";
const WALLET_QR_SECURITY_NOTE = "Protected by wallet";
const walletSummaryRequestCache = new Map<
  string,
  Promise<Awaited<ReturnType<typeof getWalletSummary>>>
>();
const walletActivityRequestCache = new Map<
  string,
  Promise<Awaited<ReturnType<typeof getWalletActivity>>>
>();

type SendUsernameStatus =
  | "idle"
  | "invalid"
  | "checking"
  | "available"
  | "unavailable"
  | "error"
  | "self";

type SendRecipientPreview = {
  id?: string;
  username: string;
  name?: string;
  avatar?: string;
  membership?: UserMembership;
};

type SendDialogStep = "recipient" | "details";

type ParsedWalletQrPayload = {
  userId: string;
  amount?: number;
};

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const normalizedRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + normalizedRadius, y);
  context.lineTo(x + width - normalizedRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + normalizedRadius);
  context.lineTo(x + width, y + height - normalizedRadius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - normalizedRadius,
    y + height,
  );
  context.lineTo(x + normalizedRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - normalizedRadius);
  context.lineTo(x, y + normalizedRadius);
  context.quadraticCurveTo(x, y, x + normalizedRadius, y);
  context.closePath();
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image."));
    image.src = src;
  });
}

function getThemePrimaryColor() {
  const rootStyles = window.getComputedStyle(document.documentElement);
  const rawPrimaryColor =
    rootStyles.getPropertyValue("--color-primary").trim() ||
    rootStyles.getPropertyValue("--primary").trim();

  if (!rawPrimaryColor) {
    return "#2563eb";
  }

  const colorProbeCanvas = document.createElement("canvas");
  const colorProbeContext = colorProbeCanvas.getContext("2d");

  if (!colorProbeContext) {
    return rawPrimaryColor;
  }

  colorProbeContext.fillStyle = "#2563eb";
  colorProbeContext.fillStyle = rawPrimaryColor;
  return String(colorProbeContext.fillStyle || "#2563eb");
}

function withCanvasAlpha(
  context: CanvasRenderingContext2D,
  alpha: number,
  draw: () => void,
) {
  context.save();
  context.globalAlpha = alpha;
  draw();
  context.restore();
}

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

function sanitizeReceiveAmountInput(value: string) {
  const sanitized = value.replace(/[^\d]/g, "").replace(/^0+/, "");

  if (!sanitized) {
    return "";
  }

  const parsedValue = Number(sanitized);

  if (Number.isFinite(parsedValue) && parsedValue > 1000000000) {
    return "1000000000";
  }

  return sanitized;
}

async function loadWalletSummaryOnce(cacheKey: string) {
  const existingRequest = walletSummaryRequestCache.get(cacheKey);

  if (existingRequest) {
    return existingRequest;
  }

  const request = getWalletSummary().finally(() => {
    walletSummaryRequestCache.delete(cacheKey);
  });

  walletSummaryRequestCache.set(cacheKey, request);
  return request;
}

async function loadWalletActivityOnce({
  page,
  limit,
  cacheKey,
}: {
  page: number;
  limit: number;
  cacheKey: string;
}) {
  const existingRequest = walletActivityRequestCache.get(cacheKey);

  if (existingRequest) {
    return existingRequest;
  }

  const request = getWalletActivity({ page, limit }).finally(() => {
    walletActivityRequestCache.delete(cacheKey);
  });

  walletActivityRequestCache.set(cacheKey, request);
  return request;
}

function buildWalletQrValue({
  userId,
  amount,
}: {
  userId: string;
  amount?: number;
}) {
  const params = new URLSearchParams({
    userId: userId.trim(),
  });

  if (typeof amount === "number" && Number.isFinite(amount) && amount > 0) {
    params.set("amount", String(amount));
  }

  return `${WALLET_QR_APP_PREFIX}:pay?${params.toString()}`;
}

function parseWalletQrValue(rawValue: string): ParsedWalletQrPayload | null {
  const trimmedValue = rawValue.trim();

  if (!trimmedValue) {
    return null;
  }

  const appPayPrefix = `${WALLET_QR_APP_PREFIX}:pay?`;

  if (trimmedValue.startsWith(appPayPrefix)) {
    const queryString = trimmedValue.slice(appPayPrefix.length);
    const params = new URLSearchParams(queryString);
    const userId = params.get("userId")?.trim() || "";
    const amountParam = params.get("amount")?.trim() || "";
    const amount = amountParam ? Number(amountParam) : undefined;

    if (!/^[a-fA-F0-9]{24}$/.test(userId)) {
      return null;
    }

    if (
      typeof amount !== "undefined" &&
      (!Number.isFinite(amount) || amount <= 0)
    ) {
      return null;
    }

    return {
      userId,
      amount,
    };
  }

  if (trimmedValue.startsWith("@")) {
    const username = trimmedValue.slice(1).trim().toLowerCase();
    return USERNAME_REGEX.test(username)
      ? {
          userId: "",
          amount: undefined,
        }
      : null;
  }

  return null;
}

async function detectQrValueFromFile(file: File) {
  const imageBitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    imageBitmap.close();
    throw new Error("QR scan is not supported on this device.");
  }

  canvas.width = imageBitmap.width;
  canvas.height = imageBitmap.height;
  context.drawImage(imageBitmap, 0, 0);

  try {
    const rawValue = await detectQrValueFromCanvas(canvas);

    if (!rawValue) {
      throw new Error("No QR code found in that image.");
    }

    return rawValue;
  } finally {
    imageBitmap.close();
  }
}

function getBarcodeDetector() {
  return (
    globalThis as typeof globalThis & {
      BarcodeDetector?: new (options?: { formats?: string[] }) => {
        detect: (
          source:
            | ImageBitmap
            | HTMLImageElement
            | HTMLCanvasElement
            | HTMLVideoElement,
        ) => Promise<Array<{ rawValue?: string }>>;
      };
    }
  ).BarcodeDetector;
}

async function detectQrValueFromCanvas(canvas: HTMLCanvasElement) {
  const BarcodeDetectorCtor = getBarcodeDetector();

  if (BarcodeDetectorCtor) {
    const detector = new BarcodeDetectorCtor({
      formats: ["qr_code"],
    });
    const results = await detector.detect(canvas);
    const rawValue = results.find((item) => item.rawValue?.trim())?.rawValue;

    if (rawValue) {
      return rawValue;
    }
  }

  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return "";
  }

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const qrResult = jsQR(imageData.data, imageData.width, imageData.height);

  return qrResult?.data?.trim() || "";
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
    return <Upload className="size-4 text-rose-500" />;
  }

  if (activity.activityType === "send") {
    return <ArrowUpRight className="size-4 text-rose-500" />;
  }

  if (activity.activityType === "receive") {
    return <ArrowDownLeft className="size-4 text-emerald-500" />;
  }

  return getStatusIcon(activity.status);
}

function getActivityPrimaryAmount(activity: WalletActivity) {
  if (activity.activityType === "deposit") {
    const depositPrefix =
      activity.status === "confirmed" || activity.status === "pending"
        ? "+"
        : "";

    return `${depositPrefix}${formatUsdAmount(Number(activity.amountUsd || 0))} USD`;
  }

  if (
    activity.activityType === "subscription" ||
    activity.activityType === "withdraw" ||
    activity.activityType === "send" ||
    activity.activityType === "spend"
  ) {
    return `-${formatTokenAmount(activity.tokenAmount)} token`;
  }

  return `+${formatTokenAmount(activity.tokenAmount)} token`;
}

function getActivityPrimaryAmountTone(activity: WalletActivity) {
  if (activity.activityType === "deposit") {
    if (activity.status === "confirmed") {
      return "text-emerald-600";
    }

    if (activity.status === "pending") {
      return "text-amber-500";
    }

    return "text-foreground";
  }

  if (
    activity.activityType === "subscription" ||
    activity.activityType === "withdraw" ||
    activity.activityType === "send" ||
    activity.activityType === "spend"
  ) {
    return "text-rose-600";
  }

  return "text-emerald-600";
}

function getActivitySecondaryText(activity: WalletActivity) {
  if (activity.activityType === "deposit") {
    return `Deposit amount: ${formatTokenAmount(activity.tokenAmount)} token`;
  }

  if (typeof activity.balanceAfter === "number") {
    return `After balance: ${formatTokenAmount(activity.balanceAfter)} token`;
  }

  return activity.description || "";
}

function getActivitySecondaryTextTone() {
  return "text-muted-foreground";
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
  const userId = useAuthStore((state) => state.user?._id ?? "");
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
  const [isSendAmountLocked, setIsSendAmountLocked] = useState(false);
  const [isSendRecipientLocked, setIsSendRecipientLocked] = useState(false);
  const [sendNote, setSendNote] = useState("");
  const [sendDialogStep, setSendDialogStep] =
    useState<SendDialogStep>("recipient");
  const [receiveAmount, setReceiveAmount] = useState("");
  const [showReceiveAmountInput, setShowReceiveAmountInput] = useState(false);
  const [debouncedSendUsername, setDebouncedSendUsername] = useState("");
  const [sendUsernameStatus, setSendUsernameStatus] =
    useState<SendUsernameStatus>("idle");
  const [sendRecipientPreview, setSendRecipientPreview] =
    useState<SendRecipientPreview | null>(null);
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [isSendConfirmDialogOpen, setIsSendConfirmDialogOpen] = useState(false);
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
  const [isScanQrDialogOpen, setIsScanQrDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingDeposit, setIsCreatingDeposit] = useState(false);
  const [isSendingTransfer, setIsSendingTransfer] = useState(false);
  const [isScanningQr, setIsScanningQr] = useState(false);
  const [isStartingQrCamera, setIsStartingQrCamera] = useState(false);
  const [isCancellingPayment, setIsCancellingPayment] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isUsernameCopied, setIsUsernameCopied] = useState(false);
  const [qrScanError, setQrScanError] = useState("");
  const [activityPage, setActivityPage] = useState(1);
  const [totalActivityPages, setTotalActivityPages] = useState(1);
  const [activityReloadKey, setActivityReloadKey] = useState(0);
  const sendUsernameRequestIdRef = useRef(0);
  const skipNextSendUsernameValidationRef = useRef(false);
  const qrFileInputRef = useRef<HTMLInputElement | null>(null);
  const receiveQrRef = useRef<HTMLDivElement | null>(null);
  const receiveQrExportRef = useRef<HTMLDivElement | null>(null);
  const qrVideoRef = useRef<HTMLVideoElement | null>(null);
  const qrStreamRef = useRef<MediaStream | null>(null);
  const qrScanFrameRef = useRef<number | null>(null);
  const qrScanLockRef = useRef(false);
  const depositAmountNumber = Number(depositAmount);
  const sendAmountNumber = Number(sendAmount);
  const receiveAmountNumber = Number(receiveAmount);
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
  const hasInsufficientSendBalance =
    sendAmount.length > 0 &&
    Number.isFinite(sendAmountNumber) &&
    sendAmountNumber > tokenBalance;
  const isSendAmountValid =
    sendAmount.length > 0 &&
    Number.isFinite(sendAmountNumber) &&
    sendAmountNumber >= 1 &&
    sendAmountNumber <= tokenBalance;
  const isSendUsernameValid = sendUsernameStatus === "available";
  const isSendRecipientStepValid = isSendUsernameValid;
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
        const summaryCacheKey = `summary:${activityReloadKey}`;
        const activityCacheKey = `activity:${activityPage}:10:${activityReloadKey}`;
        const [walletData, activityData] = await Promise.all([
          loadWalletSummaryOnce(summaryCacheKey),
          loadWalletActivityOnce({
            page: activityPage,
            limit: 10,
            cacheKey: activityCacheKey,
          }),
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

    if (
      skipNextSendUsernameValidationRef.current &&
      sendUsernameStatus === "available" &&
      sendRecipientPreview?.username?.trim().toLowerCase() ===
        trimmedValue.toLowerCase()
    ) {
      skipNextSendUsernameValidationRef.current = false;
      setDebouncedSendUsername("");
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
          username: data?.result?.user?.username || debouncedSendUsername,
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

  useEffect(() => {
    return () => {
      stopQrCamera();
    };
  }, []);

  useEffect(() => {
    if (isScanQrDialogOpen) {
      void startQrCamera();
    }
  }, [isScanQrDialogOpen]);

  const activityPageItems = buildPageItems(activityPage, totalActivityPages);
  const walletBalanceUsdText = showBalance
    ? `~ ${formatUsdAmount(tokenBalance / tokenPerUsdt)} USD`
    : "~ hidden USD";
  const walletBalanceTokenText = showBalance
    ? `${formatFullTokenAmount(tokenBalance)} token`
    : "**** token";
  const qrReceiveAmount =
    receiveAmount.length > 0 &&
    Number.isFinite(receiveAmountNumber) &&
    receiveAmountNumber > 0
      ? receiveAmountNumber
      : undefined;

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
      setSendDialogStep("recipient");
      setIsSendConfirmDialogOpen(false);
      setSendUsername("");
      setSendAmount("");
      setIsSendAmountLocked(false);
      setIsSendRecipientLocked(false);
      setSendNote("");
      setDebouncedSendUsername("");
      setSendUsernameStatus("idle");
      setSendRecipientPreview(null);
    }
  };

  const handleOpenSendDetailsStep = () => {
    if (!isSendRecipientStepValid) {
      return;
    }

    setSendDialogStep("details");
  };

  const handleScanQrDialogOpenChange = (open: boolean) => {
    setIsScanQrDialogOpen(open);

    if (!open) {
      stopQrCamera();
      setQrScanError("");
      setIsScanningQr(false);
      setIsStartingQrCamera(false);

      if (qrFileInputRef.current) {
        qrFileInputRef.current.value = "";
      }
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

  const handleSaveReceiveQr = async () => {
    const qrCanvas =
      receiveQrExportRef.current?.querySelector("canvas") ??
      receiveQrRef.current?.querySelector("canvas");

    if (!qrCanvas) {
      toast.error("QR code is not ready yet.");
      return;
    }

    try {
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = 1080;
      exportCanvas.height = 1920;
      const context = exportCanvas.getContext("2d");

      if (!context) {
        toast.error("QR card is not ready yet.");
        return;
      }

      const qrImage = await loadImage(qrCanvas.toDataURL("image/png"));
      const logoImage = await loadImage("/query-trade.svg");
      const link = document.createElement("a");
      const fileSafeUsername = username.trim().toLowerCase() || "user";
      const amountSuffix =
        typeof qrReceiveAmount === "number" && Number.isFinite(qrReceiveAmount)
          ? `-amount-${qrReceiveAmount}`
          : "";
      const primaryColor = getThemePrimaryColor();

      const backgroundGradient = context.createLinearGradient(0, 0, 1080, 1920);
      backgroundGradient.addColorStop(0, "#f3f8ff");
      backgroundGradient.addColorStop(0.42, "#dbeafe");
      backgroundGradient.addColorStop(1, "#e2e8f0");
      context.fillStyle = backgroundGradient;
      context.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

      withCanvasAlpha(context, 0.12, () => {
        context.fillStyle = primaryColor;
        context.beginPath();
        context.arc(920, 180, 180, 0, Math.PI * 2);
        context.fill();
        context.beginPath();
        context.arc(170, 1580, 220, 0, Math.PI * 2);
        context.fill();
      });

      drawRoundedRect(context, 90, 90, 900, 1740, 48);
      context.fillStyle = "rgba(255, 255, 255, 0.97)";
      context.shadowColor = "rgba(15, 23, 42, 0.12)";
      context.shadowBlur = 32;
      context.shadowOffsetY = 18;
      context.fill();
      context.shadowColor = "transparent";
      context.shadowBlur = 0;
      context.shadowOffsetY = 0;

      drawRoundedRect(context, 140, 150, 800, 210, 32);
      context.fillStyle = primaryColor;
      context.fill();

      drawRoundedRect(context, 172, 182, 96, 96, 28);
      context.fillStyle = "#ffffff";
      context.fill();
      context.drawImage(logoImage, 186, 196, 68, 68);

      context.fillStyle = "#eff6ff";
      context.font =
        "700 52px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
      context.fillText(APP_NAME, 296, 236);

      context.fillStyle = "rgba(239, 246, 255, 0.82)";
      context.font =
        "600 32px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
      context.fillText(WALLET_QR_RECEIVE_TITLE, 296, 291);

      drawRoundedRect(context, 210, 460, 660, 660, 28);
      context.fillStyle = "#ffffff";
      context.fill();
      context.strokeStyle = "#e2e8f0";
      context.lineWidth = 2;
      context.stroke();

      context.save();
      context.imageSmoothingEnabled = false;
      context.drawImage(qrImage, 230, 480, 620, 620);
      context.restore();

      context.fillStyle = "#64748b";
      context.font =
        "600 24px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
      context.textAlign = "center";
      context.fillText("USERNAME", 540, 1205);

      context.fillStyle = primaryColor;
      context.font =
        "700 52px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
      context.fillText(`@${username}`, 540, 1267);

      const infoCardY = 1360;
      drawRoundedRect(context, 170, infoCardY, 740, 170, 28);
      context.fillStyle = "#f8fafc";
      context.fill();
      context.strokeStyle = "#e2e8f0";
      context.lineWidth = 2;
      context.stroke();

      const infoRows = [
        {
          label: "Type",
          value: "Receive",
          y: infoCardY + 58,
        },
        {
          label: "Amount",
          value:
            typeof qrReceiveAmount === "number" && Number.isFinite(qrReceiveAmount)
              ? `${formatFullTokenAmount(qrReceiveAmount)} token`
              : "Flexible",
          y: infoCardY + 122,
        },
      ];

      infoRows.forEach((row) => {
        context.textAlign = "start";
        context.fillStyle = "#64748b";
        context.font =
          "600 24px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
        context.fillText(row.label, 210, row.y);

        context.textAlign = "end";
        context.fillStyle = "#0f172a";
        context.font =
          "700 28px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
        context.fillText(row.value, 870, row.y);
      });

      drawRoundedRect(context, 280, 1572, 520, 72, 36);
      withCanvasAlpha(context, 0.12, () => {
        context.fillStyle = primaryColor;
        context.fill();
      });

      context.fillStyle = primaryColor;
      context.font =
        "700 30px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
      context.textAlign = "center";
      context.fillText(`${WALLET_QR_SCAN_LABEL} ${APP_NAME}`, 540, 1618);

      context.fillStyle = "#94a3b8";
      context.font =
        "500 28px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
      context.fillText(WALLET_QR_USAGE_NOTE, 540, 1702);
      context.font =
        "500 24px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
      context.fillText(`${WALLET_QR_SECURITY_NOTE} ${APP_NAME}`, 540, 1746);
      context.textAlign = "start";

      link.href = exportCanvas.toDataURL("image/png");
      link.download = `${APP_NAME.toLowerCase().replace(/\s+/g, "-")}-qr-${fileSafeUsername}${amountSuffix}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("QR code saved.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to save QR code."));
    }
  };

  const handleReceiveDialogOpenChange = (open: boolean) => {
    setIsReceiveDialogOpen(open);

    if (!open) {
      setReceiveAmount("");
      setShowReceiveAmountInput(false);
    }
  };

  const stopQrCamera = () => {
    if (qrScanFrameRef.current !== null) {
      window.cancelAnimationFrame(qrScanFrameRef.current);
      qrScanFrameRef.current = null;
    }

    qrScanLockRef.current = false;

    if (qrVideoRef.current) {
      qrVideoRef.current.srcObject = null;
    }

    if (qrStreamRef.current) {
      qrStreamRef.current.getTracks().forEach((track) => track.stop());
      qrStreamRef.current = null;
    }
  };

  const applyScannedQrPayload = async (rawQrValue: string) => {
    const parsedPayload = parseWalletQrValue(rawQrValue);

    if (!parsedPayload?.userId) {
      throw new Error("Unsupported QR code. Use a Query Trade user QR.");
    }

    if (parsedPayload.userId === userId) {
      throw new Error("You cannot scan your own QR code.");
    }

    const userData = await fetchUserById(parsedPayload.userId);
    const parsedUsername =
      userData?.result?.user?.username?.trim()?.toLowerCase() || "";

    if (!USERNAME_REGEX.test(parsedUsername)) {
      throw new Error("Recipient username is not available.");
    }

    if (parsedUsername === username.toLowerCase()) {
      throw new Error("You cannot scan your own QR code.");
    }

    const recipient = userData?.result?.user;

    skipNextSendUsernameValidationRef.current = true;
    setSendUsername(parsedUsername);
    setDebouncedSendUsername("");
    setSendUsernameStatus("available");
    setIsSendRecipientLocked(true);
    setSendRecipientPreview({
      id: recipient?._id,
      username: recipient?.username || parsedUsername,
      name: recipient?.name,
      avatar: recipient?.avatar,
      membership: recipient?.membership,
    });

    if (
      typeof parsedPayload.amount === "number" &&
      Number.isFinite(parsedPayload.amount) &&
      parsedPayload.amount > 0
    ) {
      const scannedAmount = Math.trunc(parsedPayload.amount);

      setSendAmount(String(scannedAmount));
      setIsSendAmountLocked(true);
    } else {
      setSendAmount("");
      setIsSendAmountLocked(false);
    }

    setIsScanQrDialogOpen(false);
    setIsSendDialogOpen(true);
    setSendDialogStep("details");
  };

  const startQrCamera = async () => {
    if (isStartingQrCamera || isScanningQr) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setQrScanError("Camera access is not available on this device.");
      return;
    }

    setIsStartingQrCamera(true);
    setQrScanError("");

    try {
      stopQrCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });

      qrStreamRef.current = stream;

      if (qrVideoRef.current) {
        qrVideoRef.current.srcObject = stream;
        await qrVideoRef.current.play();
      }
      const scanCanvas = document.createElement("canvas");
      const scanContext = scanCanvas.getContext("2d", {
        willReadFrequently: true,
      });

      if (!scanContext) {
        throw new Error("QR scan is not supported on this device.");
      }

      const scanFrame = async () => {
        const video = qrVideoRef.current;

        if (!video || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
          qrScanFrameRef.current = window.requestAnimationFrame(() => {
            void scanFrame();
          });
          return;
        }

        if (qrScanLockRef.current) {
          qrScanFrameRef.current = window.requestAnimationFrame(() => {
            void scanFrame();
          });
          return;
        }

        qrScanLockRef.current = true;

        try {
          scanCanvas.width = video.videoWidth;
          scanCanvas.height = video.videoHeight;
          scanContext.drawImage(
            video,
            0,
            0,
            scanCanvas.width,
            scanCanvas.height,
          );
          const rawValue = await detectQrValueFromCanvas(scanCanvas);

          if (rawValue) {
            setIsScanningQr(true);
            await applyScannedQrPayload(rawValue);
            stopQrCamera();
            setIsScanningQr(false);
            return;
          }
        } catch (error) {
          setQrScanError(
            error instanceof Error ? error.message : "Failed to scan QR code.",
          );
          stopQrCamera();
          setIsScanningQr(false);
          return;
        } finally {
          qrScanLockRef.current = false;
        }

        qrScanFrameRef.current = window.requestAnimationFrame(() => {
          void scanFrame();
        });
      };

      qrScanFrameRef.current = window.requestAnimationFrame(() => {
        void scanFrame();
      });
    } catch (error) {
      stopQrCamera();
      setQrScanError(
        error instanceof Error ? error.message : "Unable to access the camera.",
      );
    } finally {
      setIsStartingQrCamera(false);
    }
  };

  const handleQrFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file || isScanningQr) {
      return;
    }

    setIsScanningQr(true);
    setQrScanError("");

    try {
      const rawQrValue = await detectQrValueFromFile(file);
      await applyScannedQrPayload(rawQrValue);
    } catch (error) {
      setQrScanError(
        error instanceof Error ? error.message : "Failed to scan QR code.",
      );
    } finally {
      setIsScanningQr(false);

      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleSendTransfer = async () => {
    if (!isSendFormValid || isSendingTransfer) {
      return;
    }

    if (sendAmountNumber > tokenBalance) {
      toast.error("Insufficient token.");
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
              <div className="flex items-center gap-2">
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
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => setIsScanQrDialogOpen(true)}
                  aria-label="Scan QR"
                  title="Scan QR"
                >
                  <ScanLine className="size-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-nowrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Wallet className="size-5 text-muted-foreground" />
                <p className="truncate text-2xl font-semibold tracking-tight">
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

                      <span
                        className={cn(
                          "shrink-0 font-semibold",
                          getActivityPrimaryAmountTone(activity),
                        )}
                      >
                        {getActivityPrimaryAmount(activity)}
                      </span>
                    </div>

                    <p
                      className={cn(
                        "mt-1 text-xs",
                        getActivitySecondaryTextTone(),
                      )}
                    >
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
            <DialogTitle>
              {sendDialogStep === "recipient" ? "Send token" : "Send details"}
            </DialogTitle>
            <DialogDescription>
              {sendDialogStep === "recipient"
                ? "Enter the username of the recipient."
                : "Review the recipient and enter the transfer details."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {sendDialogStep === "recipient" ? (
              <>
                <div className="space-y-2">
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      value={sendUsername}
                      onChange={(event) =>
                        setSendUsername(
                          event.target.value
                            .replace(/[^a-z0-9]/gi, "")
                            .toLowerCase(),
                        )
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && isSendRecipientStepValid) {
                          event.preventDefault();
                          handleOpenSendDetailsStep();
                        }
                      }}
                      placeholder="username"
                      className="pl-9 pr-20"
                      aria-invalid={
                        sendUsernameStatus === "invalid" ||
                        sendUsernameStatus === "unavailable" ||
                        sendUsernameStatus === "error" ||
                        sendUsernameStatus === "self"
                      }
                      disabled={isSendingTransfer}
                    />
                    <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => setIsScanQrDialogOpen(true)}
                        disabled={isSendingTransfer}
                        aria-label="Scan QR code"
                        title="Scan QR code"
                      >
                        <ScanLine className="size-4" />
                      </Button>
                      <span className="pointer-events-none flex items-center">
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

                  {sendRecipientPreview ? (
                    <div className="flex items-center gap-3 px-1 py-1">
                      {sendRecipientPreview.avatar ? (
                        <img
                          src={sendRecipientPreview.avatar}
                          alt={
                            sendRecipientPreview.name ||
                            sendRecipientPreview.username
                          }
                          className={cn(
                            "size-9 rounded-full object-cover",
                            getUserAvatarRingClass(
                              sendRecipientPreview.membership,
                            ),
                          )}
                        />
                      ) : (
                        <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                          <UserRound className="size-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium">
                            {sendRecipientPreview.name ||
                              sendRecipientPreview.username}
                          </p>
                          <UserMembershipMark
                            membership={sendRecipientPreview.membership}
                            interactive
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          @{sendRecipientPreview.username}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>

                <Button
                  type="button"
                  onClick={handleOpenSendDetailsStep}
                  disabled={!isSendRecipientStepValid}
                  className="w-full justify-center"
                >
                  Next
                </Button>
              </>
            ) : (
              <>
                {sendRecipientPreview ? (
                  <div className="flex flex-col items-center gap-3 px-1 py-1 text-center">
                    {sendRecipientPreview.avatar ? (
                      <img
                        src={sendRecipientPreview.avatar}
                        alt={
                          sendRecipientPreview.name ||
                          sendRecipientPreview.username
                        }
                        className={cn(
                          "size-20 rounded-full object-cover",
                          getUserAvatarRingClass(
                            sendRecipientPreview.membership,
                          ),
                        )}
                      />
                    ) : (
                      <div className="flex size-20 items-center justify-center rounded-full bg-muted">
                        <UserRound className="size-9 text-muted-foreground" />
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1.5">
                        <p className="text-lg font-semibold leading-none">
                          {sendRecipientPreview.name ||
                            sendRecipientPreview.username}
                        </p>
                        <UserMembershipMark
                          membership={sendRecipientPreview.membership}
                          interactive
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        @{sendRecipientPreview.username}
                      </p>
                    </div>
                  </div>
                ) : null}

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
                      disabled={isSendingTransfer || isSendAmountLocked}
                      aria-invalid={showSendAmountError}
                    />
                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                      token
                    </span>
                  </div>
                  {showSendAmountError ? (
                    <p className="text-xs text-destructive">
                      {hasInsufficientSendBalance
                        ? "Insufficient token."
                        : "Enter a valid amount up to your available balance."}
                    </p>
                  ) : isSendAmountLocked ? (
                    <p className="text-xs text-muted-foreground">
                      Amount was set from the QR code and cannot be edited.
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Available: {formatFullTokenAmount(tokenBalance)} token
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <MessageSquareText className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" />
                    <span className="pointer-events-none absolute top-3 right-3 text-xs text-muted-foreground">
                      {sendNote.length}/50
                    </span>
                    <Textarea
                      value={sendNote}
                      onChange={(event) =>
                        setSendNote(event.target.value.slice(0, 50))
                      }
                      placeholder="Optional note"
                      className="h-14 resize-none overflow-y-auto whitespace-pre-wrap break-all pr-14 pl-9"
                      disabled={isSendingTransfer}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 justify-center"
                    onClick={() =>
                      isSendRecipientLocked || isSendAmountLocked
                        ? handleSendDialogOpenChange(false)
                        : setSendDialogStep("recipient")
                    }
                    disabled={isSendingTransfer}
                  >
                    {isSendRecipientLocked || isSendAmountLocked
                      ? "Cancel"
                      : "Back"}
                  </Button>
                  <Button
                    type="button"
                    disabled={!isSendFormValid || isSendingTransfer}
                    className="flex-1 justify-center"
                    onClick={() => setIsSendConfirmDialogOpen(true)}
                  >
                    {isSendingTransfer ? (
                      <Loader2 className="absolute h-4 w-4 animate-spin" />
                    ) : null}
                    <span
                      className={isSendingTransfer ? "opacity-0" : undefined}
                    >
                      <span className="inline-flex items-center gap-2">
                        <ArrowUpRight className="size-4" />
                        Send token
                      </span>
                    </span>
                  </Button>
                </div>

                <AlertDialog
                  open={isSendConfirmDialogOpen}
                  onOpenChange={setIsSendConfirmDialogOpen}
                >
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Send token?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {`You are about to send ${formatFullTokenAmount(sendAmountNumber)} token to @${trimmedSendUsername}.`}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isSendingTransfer}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(event) => {
                          event.preventDefault();
                          void handleSendTransfer().finally(() => {
                            setIsSendConfirmDialogOpen(false);
                          });
                        }}
                        disabled={!isSendFormValid || isSendingTransfer}
                      >
                        {isSendingTransfer ? (
                          <Loader2 className="absolute h-4 w-4 animate-spin" />
                        ) : null}
                        <span
                          className={
                            isSendingTransfer ? "opacity-0" : undefined
                          }
                        >
                          Send
                        </span>
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isReceiveDialogOpen}
        onOpenChange={handleReceiveDialogOpenChange}
      >
        <DialogContent onOpenAutoFocus={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Receive token</DialogTitle>
            <DialogDescription>
              Share your QR code or username.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div ref={receiveQrRef} className="flex justify-center">
                <div className="bg-white p-1 shadow-sm">
                  <QRCodeSVG
                    value={buildWalletQrValue({
                      userId,
                      amount: qrReceiveAmount,
                    })}
                    size={320}
                    level="H"
                    includeMargin
                    bgColor="#ffffff"
                    fgColor="#111827"
                    className="h-[220px] w-[220px]"
                    imageSettings={{
                      src: "/query-trade.svg",
                      width: 48,
                      height: 48,
                      excavate: true,
                    }}
                  />
                </div>
              </div>
              <div ref={receiveQrExportRef} className="sr-only">
                <QRCodeCanvas
                  value={buildWalletQrValue({
                    userId,
                    amount: qrReceiveAmount,
                  })}
                  size={1024}
                  level="H"
                  includeMargin
                  bgColor="#ffffff"
                  fgColor="#111827"
                  imageSettings={{
                    src: "/query-trade.svg",
                    width: 144,
                    height: 144,
                    excavate: true,
                  }}
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Your permanent receive QR
              </p>
            </div>

            <div className="flex items-center justify-center gap-2">
              <p className="text-sm font-semibold tracking-tight sm:text-base">
                <span className="text-muted-foreground">@</span>
                {username}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => void handleCopyUsername()}
                disabled={!username}
                aria-label="Copy username"
                title="Copy username"
              >
                {isUsernameCopied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>

            <div className="space-y-2">
              {showReceiveAmountInput ? (
                <>
                  <div className="relative">
                    <Wallet className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={receiveAmount}
                      onChange={(event) =>
                        setReceiveAmount(
                          sanitizeReceiveAmountInput(event.target.value),
                        )
                      }
                      placeholder="Optional amount"
                      className="pr-16 pl-9"
                    />
                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                      token
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      Optional QR input.
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto px-2 py-1 text-xs"
                      onClick={() => {
                        setReceiveAmount("");
                        setShowReceiveAmountInput(false);
                      }}
                    >
                      Hide
                    </Button>
                  </div>
                </>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-center"
                  onClick={() => setShowReceiveAmountInput(true)}
                >
                  <Wallet className="size-4" />
                  Add optional amount
                </Button>
              )}
            </div>

            <Button
              type="button"
              className="w-full justify-center"
              onClick={() => void handleSaveReceiveQr()}
            >
              <Download className="size-4" />
              Save QR
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isScanQrDialogOpen}
        onOpenChange={handleScanQrDialogOpenChange}
      >
        <DialogContent onOpenAutoFocus={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Scan QR</DialogTitle>
            <DialogDescription>
              Scan a Query Trade QR code with your camera.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border bg-muted/20">
              <div className="relative aspect-square bg-black">
                <video
                  ref={qrVideoRef}
                  className="h-full w-full object-cover"
                  autoPlay
                  muted
                  playsInline
                />
                {(isStartingQrCamera || isScanningQr) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                    <Loader2 className="size-5 animate-spin text-white" />
                  </div>
                )}
              </div>
              <div className="px-4 py-3 text-sm text-muted-foreground">
                Point your camera at a recipient QR.
              </div>
            </div>

            <input
              ref={qrFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void handleQrFileChange(event)}
            />

            <Button
              type="button"
              className="w-full justify-center"
              variant="ghost"
              onClick={() => void startQrCamera()}
              disabled={isStartingQrCamera || isScanningQr}
            >
              {isStartingQrCamera ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <ScanLine className="size-4" />
                  Restart camera
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full justify-center"
              onClick={() => qrFileInputRef.current?.click()}
              disabled={isScanningQr}
            >
              {isScanningQr ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Upload className="size-4" />
                  Choose QR image
                </>
              )}
            </Button>

            {qrScanError ? (
              <p className="text-xs text-destructive">{qrScanError}</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
