import { useEffect, useState, type ClipboardEvent } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

import {
  getPayment,
  verifySubscriptionPayment,
  type Payment,
} from "@/api/subscription";
import { getApiErrorMessage } from "@/api/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useAuthStore } from "@/store/auth";
import { Skeleton } from "@/components/ui/skeleton";

function formatAmount(amount?: number, maximumFractionDigits = 8) {
  return Number(amount ?? 0).toLocaleString(undefined, {
    maximumFractionDigits,
  });
}

function sanitizeTxHashInput(value: string) {
  return value.replace(/\s+/g, "");
}

const txHashPattern = /^0x[a-fA-F0-9]{64}$/;
const walletAddressPattern = /^0x[a-fA-F0-9]{40}$/;
const paymentRequestCache = new Map<
  string,
  Promise<Awaited<ReturnType<typeof getPayment>>>
>();
const usdtLogoDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <g fill="none" fill-rule="evenodd">
    <circle cx="16" cy="16" r="16" fill="#26A17B"/>
    <path fill="#FFF" d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118 0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116 0-1.043-3.301-1.914-7.694-2.117"/>
  </g>
</svg>
`)}`;

export default function PaymentPage() {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const updateUser = useAuthStore((state) => state.updateUser);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [txHash, setTxHash] = useState("");
  const [txHashError, setTxHashError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showTxHashInput, setShowTxHashInput] = useState(false);
  const [isAddressCopied, setIsAddressCopied] = useState(false);

  useEffect(() => {
    if (!paymentId) return;

    const currentPaymentId = paymentId;
    let ignore = false;

    async function loadPayment() {
      try {
        let request = paymentRequestCache.get(currentPaymentId);

        if (!request) {
          request = getPayment(currentPaymentId).finally(() => {
            paymentRequestCache.delete(currentPaymentId);
          });
          paymentRequestCache.set(currentPaymentId, request);
        }

        const data = await request;

        if (!ignore) {
          setPayment(data.payment);
        }
      } catch (error) {
        if (!ignore) {
          toast.error(getApiErrorMessage(error, "Failed to load deposit."));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadPayment();

    return () => {
      ignore = true;
    };
  }, [paymentId]);

  const resetTxHashDialog = () => {
    setTxHash("");
    setTxHashError(null);
  };

  const copyText = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied.`);
  };

  const handleCopyAddress = async () => {
    const payAddress = payment?.payAddress;

    if (!payAddress) {
      return;
    }

    await copyText(payAddress, "Address");
    setIsAddressCopied(true);
    window.setTimeout(() => {
      setIsAddressCopied(false);
    }, 1500);
  };

  const verifyTxHashValue = async (value: string) => {
    if (!paymentId || !txHashPattern.test(value) || isVerifying) {
      return;
    }

    setIsVerifying(true);

    try {
      const data = await verifySubscriptionPayment({
        paymentId,
        txHash: value,
      });

      setPayment(data.payment);
      if (typeof data.tokenBalance === "number") {
        updateUser({ tokenBalance: data.tokenBalance });
      }
      resetTxHashDialog();
      setShowTxHashInput(false);
      toast.success("Deposit verified.");
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Transaction verification failed.",
      );
      setTxHashError(message);
      toast.error(message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleTxHashPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pastedValue = sanitizeTxHashInput(
      event.clipboardData.getData("text"),
    );

    event.preventDefault();
    setTxHash(pastedValue);
    if (txHashError) {
      setTxHashError(null);
    }

    void verifyTxHashValue(pastedValue);
  };

  const handlePasteButtonClick = async () => {
    try {
      const pastedValue = sanitizeTxHashInput(
        await navigator.clipboard.readText(),
      );
      setTxHash(pastedValue);
      if (txHashError) {
        setTxHashError(null);
      }
      await verifyTxHashValue(pastedValue);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to read clipboard."));
    }
  };

  const submitTxHash = async () => {
    const nextTxHash = sanitizeTxHashInput(txHash);

    if (!paymentId || !nextTxHash) {
      setTxHashError("Transaction hash is required.");
      return;
    }

    if (walletAddressPattern.test(nextTxHash)) {
      setTxHashError("Dont add wallet address.");
      return;
    }

    if (!txHashPattern.test(nextTxHash)) {
      setTxHashError("Enter a valid txHash.");
      return;
    }

    await verifyTxHashValue(nextTxHash);
  };

  if (!paymentId) {
    return <Navigate to="/wallet" replace />;
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <PaymentHeader />
        <Card className="rounded-lg border-0 shadow-none">
          <CardHeader>
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            <div className="grid gap-4 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] md:items-center md:gap-6">
              <div className="flex flex-col items-center gap-3">
                <Skeleton className="size-[258px] rounded-[1.5rem]" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-52 rounded-full" />
                  <Skeleton className="size-9 rounded-full" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Skeleton className="h-9 w-40" />
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-4 w-52" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-16 w-full max-w-2xl" />
                <Skeleton className="h-10 w-40" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!payment) {
    return <Navigate to="/wallet" replace />;
  }

  const isConfirmed = payment.status === "confirmed";
  const isExpired = payment.status === "expired";
  const trimmedTxHash = txHash.trim();
  const showTxHashError =
    trimmedTxHash.length > 0 && !txHashPattern.test(trimmedTxHash);
  const clientTxHashErrorMessage = walletAddressPattern.test(trimmedTxHash)
    ? "Dont add wallet address."
    : "Enter a valid txHash.";
  const canVerifyTxHash = txHashPattern.test(trimmedTxHash);
  const isVerifyDisabled =
    isVerifying || !canVerifyTxHash || Boolean(txHashError);
  const statusTone = isConfirmed
    ? "text-emerald-600"
    : isExpired
      ? "text-destructive"
      : "text-muted-foreground";
  const payAddress = payment.payAddress ?? "";
  const shortAddress = payAddress
    ? `${payAddress.slice(0, 6)}...${payAddress.slice(-6)}`
    : "Unavailable";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <PaymentHeader />

      <Card className="rounded-lg border-0 shadow-none">
        <CardHeader>
          <CardTitle>Complete Your Deposit</CardTitle>
          <CardDescription>
            Send the exact USDT amount on BNB Smart Chain, then verify with your
            transaction hash to receive token.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          <div className="grid gap-4 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] md:items-center md:gap-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="rounded-[1.75rem] p-1">
                <div className="rounded-[1.5rem] bg-white">
                  <QRCodeSVG
                    value={payAddress}
                    size={240}
                    level="H"
                    includeMargin
                    bgColor="#ffffff"
                    fgColor="#111827"
                    imageSettings={{
                      src: usdtLogoDataUri,
                      width: 40,
                      height: 40,
                      excavate: true,
                    }}
                    className="h-auto w-full"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-1">
                <div className="inline-flex max-w-full items-center rounded-full px-2 py-1.5 text-sm text-muted-foreground">
                  <span className="shrink-0 pr-2">Deposit address:</span>
                  <span className="max-w-[180px] truncate font-mono sm:max-w-[240px]">
                    {shortAddress}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void handleCopyAddress()}
                  aria-label="Copy address"
                  title={`Copy address ${shortAddress}`}
                  className="rounded-full"
                  disabled={!payAddress}
                >
                  {isAddressCopied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-3 text-left">
              <div className="space-y-2">
                <p className="text-3xl font-semibold tracking-tight">
                  {formatAmount(
                    payment.payCurrencyAmount ?? payment.requestedAmountUsdt,
                  )}{" "}
                  USDT
                </p>
                <p className="text-sm text-muted-foreground">
                  You will receive {formatAmount(payment.tokenAmount, 0)} token
                </p>
                <p className="text-sm text-muted-foreground">
                  Rate snapshot: 1 USDT ={" "}
                  {formatAmount(payment.rateSnapshot, 0)} token
                </p>
                <div
                  className={`flex items-center justify-start gap-2 text-sm ${statusTone}`}
                >
                  {isConfirmed ? (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  ) : isExpired ? (
                    <Clock className="size-4 text-destructive" />
                  ) : (
                    <Clock className="size-4 text-amber-500" />
                  )}
                  <span>Status: {isExpired ? "expired" : payment.status}</span>
                </div>
              </div>

              <div className="max-w-2xl py-1 text-sm">
                <div className="flex items-start justify-start gap-2 text-left">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <p className="leading-6 text-amber-800">
                    Send only USDT via BNB Smart Chain (BEP20). Wrong-network
                    transfers may be lost.
                  </p>
                </div>
              </div>

              {!showTxHashInput ? (
                <div className="flex justify-start">
                  <Button
                    onClick={() => setShowTxHashInput(true)}
                    className="w-full sm:w-auto"
                  >
                    I already deposited
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          {isConfirmed ? (
            <div className="rounded-2xl p-2 text-sm">
              <p className="font-medium">Verified transaction</p>
              <p className="mt-2 break-all font-mono text-muted-foreground">
                {payment.txHash}
              </p>
            </div>
          ) : isExpired ? (
            <div className="rounded-2xl p-2 text-sm text-destructive">
              This deposit request was replaced. Create a new one from Wallet.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={showTxHashInput}
        onOpenChange={(open) => {
          setShowTxHashInput(open);
          if (!open) {
            resetTxHashDialog();
          }
        }}
      >
        <DialogContent
          className="gap-0 overflow-hidden p-0 sm:max-w-md"
          showCloseButton={false}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DialogHeader className="border-b px-4 pt-4 pb-3">
            <DialogTitle>Verify Deposit</DialogTitle>
            <DialogDescription>Paste your transaction hash.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 px-4 py-4">
            <div className="space-y-2">
              <Label
                htmlFor="payment-tx-hash"
                className="text-muted-foreground"
              >
                Transaction Hash
              </Label>
              <div className="flex gap-2">
                <Input
                  id="payment-tx-hash"
                  value={txHash}
                  onChange={(event) => {
                    setTxHash(sanitizeTxHashInput(event.target.value));
                    if (txHashError) {
                      setTxHashError(null);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      canVerifyTxHash &&
                      !isVerifying
                    ) {
                      event.preventDefault();
                      void submitTxHash();
                    }
                  }}
                  onPaste={handleTxHashPaste}
                  placeholder="0x..."
                  disabled={isVerifying}
                  aria-invalid={Boolean(txHashError) || showTxHashError}
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handlePasteButtonClick()}
                  disabled={isVerifying}
                >
                  Paste
                </Button>
              </div>
            </div>
            {txHashError ? (
              <p className="text-xs text-destructive">{txHashError}</p>
            ) : showTxHashError ? (
              <p className="text-xs text-destructive">
                {clientTxHashErrorMessage}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t bg-muted/40 px-4 py-4 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                resetTxHashDialog();
                setShowTxHashInput(false);
              }}
              disabled={isVerifying}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void submitTxHash()}
              disabled={isVerifyDisabled}
              className="relative justify-center"
            >
              {isVerifying ? (
                <>
                  <span className="invisible">Verify</span>
                  <Loader2 className="absolute size-4 animate-spin" />
                </>
              ) : (
                "Verify"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PaymentHeader() {
  return (
    <Card className="min-w-0 border-border/70">
      <CardHeader>
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
            Deposit Details
          </span>
          <CardTitle className="text-xl tracking-tight">Deposit USDT</CardTitle>
          <CardDescription className="max-w-2xl text-sm leading-6">
            Send USDT and verify the transaction to receive token in your app
            wallet.
          </CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}
