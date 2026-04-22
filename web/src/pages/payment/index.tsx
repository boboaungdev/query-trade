import { useEffect, useState, type ClipboardEvent } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  Check,
  WalletCards,
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

function formatPlanName(plan: string) {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function formatAmount(amount?: number) {
  return Number(amount ?? 0).toLocaleString(undefined, {
    maximumFractionDigits: 8,
  });
}

const txHashPattern = /^0x[a-fA-F0-9]{64}$/;
const headerDescription =
  "Send the required USDT amount on BNB Smart Chain to continue your payment.";
const usdtLogoDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <circle cx="30" cy="30" r="22" fill="#26A17B"/>
  <path fill="#fff" d="M35.7 15.8H24.3v4h4.3v3.7c-6.5.3-11.3 1.7-11.3 3.3s4.8 3 11.3 3.3V44h2.8V30.2c6.4-.3 11.2-1.7 11.2-3.2s-4.8-2.9-11.2-3.2v-4h4.3v-4Zm-5.7 11.9c-5.8 0-10.6-.8-10.6-1.7s4.7-1.7 10.6-1.7 10.6.8 10.6 1.7-4.8 1.7-10.6 1.7Z"/>
  <circle cx="45.5" cy="45.5" r="13.5" fill="#ffffff"/>
  <g transform="translate(45.5 45.5)">
    <rect x="-4.5" y="-4.5" width="9" height="9" transform="rotate(45)" fill="#F0B90B"/>
    <rect x="-1.75" y="-9.75" width="3.5" height="3.5" transform="rotate(45)" fill="#F0B90B"/>
    <rect x="-1.75" y="6.25" width="3.5" height="3.5" transform="rotate(45)" fill="#F0B90B"/>
    <rect x="-9.75" y="-1.75" width="3.5" height="3.5" transform="rotate(45)" fill="#F0B90B"/>
    <rect x="6.25" y="-1.75" width="3.5" height="3.5" transform="rotate(45)" fill="#F0B90B"/>
  </g>
</svg>
`)}`;

export default function PaymentPage() {
  const { paymentId } = useParams();
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
        const data = await getPayment(currentPaymentId);

        if (!ignore) {
          setPayment(data.payment);
        }
      } catch (error) {
        if (!ignore) {
          toast.error(getApiErrorMessage(error, "Failed to load payment."));
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
      resetTxHashDialog();
      setShowTxHashInput(false);
      toast.success("Transaction verified.");
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
    const pastedValue = event.clipboardData.getData("text").trim();

    event.preventDefault();
    setTxHash(pastedValue);
    if (txHashError) {
      setTxHashError(null);
    }

    void verifyTxHashValue(pastedValue);
  };

  const handlePasteButtonClick = async () => {
    try {
      const pastedValue = (await navigator.clipboard.readText()).trim();
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
    const nextTxHash = txHash.trim();

    if (!paymentId || !nextTxHash) {
      setTxHashError("Transaction hash is required.");
      return;
    }

    if (!txHashPattern.test(nextTxHash)) {
      setTxHashError("Enter a valid txHash, not a wallet address.");
      return;
    }

    setIsVerifying(true);
    setTxHashError(null);

    try {
      const data = await verifySubscriptionPayment({
        paymentId,
        txHash: nextTxHash,
      });

      setPayment(data.payment);
      setTxHash("");
      setShowTxHashInput(false);
      toast.success("Transaction verified.");
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

  if (!paymentId) {
    return <Navigate to="/pricing" replace />;
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <PaymentHeader />
        <div className="flex min-h-24 items-center justify-center">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!payment) {
    return <Navigate to="/pricing" replace />;
  }

  const amount = payment.payAmount ?? payment.amountUsd;
  const isConfirmed = payment.status === "confirmed";
  const isExpired = payment.status === "expired";
  const trimmedTxHash = txHash.trim();
  const showTxHashError =
    trimmedTxHash.length > 0 && !txHashPattern.test(trimmedTxHash);
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
  const planName = payment.planSnapshot?.name ?? formatPlanName(payment.plan);
  const planDurationDays = payment.planSnapshot?.durationDays;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <PaymentHeader />

      <Card className="rounded-lg border-0 shadow-none">
        <CardHeader>
          <CardTitle>Complete Your Payment</CardTitle>
          <CardDescription>
            Scan the QR code with your wallet. We only accept USDT on BNB Smart
            Chain for this payment.
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
                  <span className="max-w-[180px] truncate font-mono sm:max-w-[240px]">
                    Address: {shortAddress}
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

            <div className="space-y-3 md:text-left">
              <div className="space-y-2">
                <p className="text-3xl font-semibold tracking-tight">
                  {formatAmount(amount)} USDT
                </p>
                <p className="text-sm text-muted-foreground">
                  Subscription plan: {planName}
                  {typeof planDurationDays === "number"
                    ? ` - ${planDurationDays} days`
                    : ""}
                </p>
                <div
                  className={`flex items-center justify-center gap-2 text-sm md:justify-start ${statusTone}`}
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
                <div className="flex items-start justify-center gap-2 text-left md:justify-start">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <p className="leading-6 text-amber-800">
                    Send only USDT via BNB Chain. Payments sent on the wrong
                    network may be lost and could be unrecoverable.
                  </p>
                </div>
              </div>

              {!showTxHashInput ? (
                <div className="flex justify-center md:justify-start">
                  <Button
                    onClick={() => setShowTxHashInput(true)}
                    className="w-full sm:w-auto"
                  >
                    Already paid
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
              This payment was replaced. Create a new payment from Pricing.
            </div>
          ) : null}

          <p className="text-sm text-muted-foreground">
            After sending your payment, click Already paid and paste your
            transaction hash to verify the payment and activate your
            subscription.
          </p>
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
        >
          <DialogHeader className="border-b px-4 pt-4 pb-3">
            <DialogTitle>Verify Payment</DialogTitle>
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
                    setTxHash(event.target.value);
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
                Enter a valid txHash, not a wallet address.
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
              Payment Details
            </span>
            <CardTitle className="text-xl tracking-tight">
              Pay With USDT
            </CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-6">
              {headerDescription}
            </CardDescription>
          </div>

          <Button asChild variant="outline">
            <Link to="/billing">
              <WalletCards className="size-4" />
              Billing
            </Link>
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}
