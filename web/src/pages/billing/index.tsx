import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  CheckCircle2,
  Clock,
  Loader2,
  ReceiptText,
  WalletCards,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import {
  getPaymentHistory,
  getMySubscription,
  type Payment,
  type Subscription,
} from "@/api/subscription"
import { getApiErrorMessage } from "@/api/axios"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function formatDate(date?: string | null) {
  if (!date) return "No expiry"

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

function formatDateTime(date?: string | null) {
  if (!date) return "No date"

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date))
}

function formatPlanName(plan: string) {
  return plan.charAt(0).toUpperCase() + plan.slice(1)
}

function formatUsdtAmount(amount: number) {
  return amount.toLocaleString(undefined, {
    maximumFractionDigits: 8,
  })
}

function getStatusIcon(status: Payment["status"]) {
  if (status === "confirmed") {
    return <CheckCircle2 className="size-4 text-emerald-500" />
  }

  if (status === "failed" || status === "expired") {
    return <XCircle className="size-4 text-destructive" />
  }

  return <Clock className="size-4 text-amber-500" />
}

export default function Billing() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [latestPayment, setLatestPayment] = useState<Payment | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let ignore = false

    async function loadBilling() {
      setIsLoading(true)

      try {
        const [subscriptionData, historyData] = await Promise.all([
          getMySubscription(),
          getPaymentHistory(),
        ])

        if (!ignore) {
          setSubscription(subscriptionData.subscription)
          setLatestPayment(subscriptionData.latestPayment ?? null)
          setPayments(historyData.payments)
        }
      } catch (error) {
        if (!ignore) {
          toast.error(getApiErrorMessage(error, "Failed to load billing."))
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    loadBilling()

    return () => {
      ignore = true
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-72 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const plan = subscription?.plan ?? "free"
  const isPaidPlan = plan !== "free"

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-normal">Billing</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Manage your crypto access pass and payment status.
          </p>
        </div>

        <Button asChild>
          <Link to="/pricing">
            <WalletCards className="size-4" />
            Upgrade
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>Crypto passes renew manually.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-3xl font-bold">{formatPlanName(plan)}</p>
              <p className="text-sm text-muted-foreground">
                Status: {subscription?.status ?? "active"}
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-lg border p-3 text-sm">
              <Clock className="size-4 text-muted-foreground" />
              <span>
                {isPaidPlan
                  ? `Active until ${formatDate(subscription?.currentPeriodEnd)}`
                  : "Free access does not expire"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>Latest Payment</CardTitle>
            <CardDescription>Manual USDT payment status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {latestPayment ? (
              <>
                <div>
                  <p className="text-2xl font-bold">
                    {formatUsdtAmount(latestPayment.amountUsd)} USDT
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatPlanName(latestPayment.plan)} with{" "}
                    {latestPayment.payCurrency.toUpperCase()}
                  </p>
                </div>

                <p className="rounded-lg border p-3 text-sm">
                  Status: {latestPayment.status}
                </p>

                {latestPayment.status === "pending" ? (
                  <Button asChild variant="outline" className="w-full">
                    <Link to={`/payment/${latestPayment._id}`}>
                      Continue payment
                    </Link>
                  </Button>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No crypto payments yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText className="size-4" />
            Billing History
          </CardTitle>
          <CardDescription>Your recent subscription payments.</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length ? (
            <div className="divide-y rounded-lg border">
              {payments.map((payment) => (
                <div
                  key={payment._id}
                  className="grid gap-3 p-4 text-sm md:grid-cols-[1fr_auto] md:items-center"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusIcon(payment.status)}
                      <span className="font-medium">
                        {formatPlanName(payment.plan)}
                      </span>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {payment.status}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      {formatDateTime(payment.createdAt)} ·{" "}
                      {payment.payCurrency.toUpperCase()}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 md:justify-end">
                    <span className="font-semibold">
                      {formatUsdtAmount(payment.amountUsd)} USDT
                    </span>
                    {payment.status === "pending" ? (
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/payment/${payment._id}`}>
                          Pay
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No billing history yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
