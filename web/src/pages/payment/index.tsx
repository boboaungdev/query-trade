import { useEffect, useState } from "react"
import { Link, Navigate, useParams } from "react-router-dom"
import {
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  SearchCheck,
  WalletCards,
} from "lucide-react"
import { toast } from "sonner"

import {
  getPayment,
  verifySubscriptionPayment,
  type Payment,
} from "@/api/subscription"
import { getApiErrorMessage } from "@/api/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function formatPlanName(plan: string) {
  return plan.charAt(0).toUpperCase() + plan.slice(1)
}

function formatAmount(amount?: number) {
  return Number(amount ?? 0).toLocaleString(undefined, {
    maximumFractionDigits: 8,
  })
}

const txHashPattern = /^0x[a-fA-F0-9]{64}$/

export default function PaymentPage() {
  const { paymentId } = useParams()
  const [payment, setPayment] = useState<Payment | null>(null)
  const [txHash, setTxHash] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    if (!paymentId) return

    let ignore = false

    async function loadPayment() {
      try {
        const data = await getPayment(paymentId!)

        if (!ignore) {
          setPayment(data.payment)
        }
      } catch (error) {
        if (!ignore) {
          toast.error(getApiErrorMessage(error, "Failed to load payment."))
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    loadPayment()

    return () => {
      ignore = true
    }
  }, [paymentId])

  const copyText = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value)
    toast.success(`${label} copied.`)
  }

  const submitTxHash = async () => {
    if (!paymentId || !txHash.trim()) return

    setIsVerifying(true)

    try {
      const data = await verifySubscriptionPayment({
        paymentId,
        txHash: txHash.trim(),
      })

      setPayment(data.payment)
      toast.success("Transaction verified.")
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Transaction verification failed."))
    } finally {
      setIsVerifying(false)
    }
  }

  if (!paymentId) {
    return <Navigate to="/pricing" replace />
  }

  if (isLoading) {
    return (
      <div className="flex min-h-72 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!payment) {
    return <Navigate to="/pricing" replace />
  }

  const amount = payment.payAmount ?? payment.amountUsd
  const isConfirmed = payment.status === "confirmed"
  const isExpired = payment.status === "expired"
  const trimmedTxHash = txHash.trim()
  const showTxHashError = trimmedTxHash.length > 0 && !txHashPattern.test(trimmedTxHash)
  const canVerifyTxHash = txHashPattern.test(trimmedTxHash)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-normal">Pay With USDT</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Send exactly {formatAmount(amount)} USDT on BNB Smart Chain.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link to="/billing">
            <WalletCards className="size-4" />
            Billing
          </Link>
        </Button>
      </div>

      <Card className="rounded-lg border">
        <CardHeader>
          <CardTitle>
            {formatPlanName(payment.plan)} - {formatAmount(amount)} USDT
          </CardTitle>
          <CardDescription>
            Use USDT BEP20 only. Payments on another network may not be
            recoverable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-2 rounded-lg border p-3 text-sm">
            {isConfirmed ? (
              <CheckCircle2 className="size-4 text-emerald-500" />
            ) : isExpired ? (
              <Clock className="size-4 text-destructive" />
            ) : (
              <Clock className="size-4 text-amber-500" />
            )}
            <span>Status: {isExpired ? "expired" : payment.status}</span>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Amount</p>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1 rounded-lg border bg-muted/30 px-3 py-2 font-mono text-sm">
                {formatAmount(amount)} USDT
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => void copyText(String(amount), "Amount")}
                aria-label="Copy amount"
              >
                <Copy className="size-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Address</p>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1 break-all rounded-lg border bg-muted/30 px-3 py-2 font-mono text-sm">
                {payment.payAddress}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  payment.payAddress
                    ? void copyText(payment.payAddress, "Address")
                    : undefined
                }
                aria-label="Copy address"
              >
                <Copy className="size-4" />
              </Button>
            </div>
          </div>

          {isConfirmed ? (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">Verified transaction</p>
              <p className="break-all font-mono text-muted-foreground">
                {payment.txHash}
              </p>
            </div>
          ) : isExpired ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              This payment was replaced. Create a new payment from Pricing.
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium">Transaction Hash</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={txHash}
                  onChange={(event) => setTxHash(event.target.value)}
                  placeholder="0x..."
                  disabled={isVerifying}
                  aria-invalid={showTxHashError}
                  className="font-mono"
                />
                <Button
                  onClick={() => void submitTxHash()}
                  disabled={isVerifying || !canVerifyTxHash}
                >
                  {isVerifying ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <SearchCheck className="size-4" />
                  )}
                  Verify
                </Button>
              </div>
              {showTxHashError ? (
                <p className="text-sm text-destructive">
                  Enter a valid txHash, not a wallet address.
                </p>
              ) : null}
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            After sending USDT, paste the transaction hash from your wallet.
            Your subscription activates when the server verifies the BSC
            transaction.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
