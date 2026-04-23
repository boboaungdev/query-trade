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

import { getApiErrorMessage } from "@/api/axios"
import {
  cancelSubscriptionPayment,
  getPaymentHistory,
  getMySubscription,
  type Payment,
  type Subscription,
} from "@/api/subscription"
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
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

let billingSubscriptionRequest:
  | Promise<Awaited<ReturnType<typeof getMySubscription>>>
  | null = null
const billingHistoryRequestCache = new Map<
  string,
  Promise<Awaited<ReturnType<typeof getPaymentHistory>>>
>()

async function loadBillingSubscriptionOnce() {
  if (billingSubscriptionRequest) {
    return billingSubscriptionRequest
  }

  billingSubscriptionRequest = getMySubscription().finally(() => {
    billingSubscriptionRequest = null
  })

  return billingSubscriptionRequest
}

async function loadBillingHistoryOnce(page: number) {
  const cacheKey = `${page}`
  let request = billingHistoryRequestCache.get(cacheKey)

  if (request) {
    return request
  }

  request = getPaymentHistory({ page }).finally(() => {
    billingHistoryRequestCache.delete(cacheKey)
  })
  billingHistoryRequestCache.set(cacheKey, request)

  return request
}

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

function getStatusLabelTone(status?: string | null) {
  if (status === "confirmed" || status === "active") {
    return "text-emerald-700"
  }

  if (status === "pending") {
    return "text-amber-500"
  }

  if (
    status === "cancelled" ||
    status === "failed" ||
    status === "expired" ||
    status === "inactive"
  ) {
    return "text-destructive"
  }

  return "text-muted-foreground"
}

function getStatusIcon(status: Payment["status"]) {
  if (status === "confirmed") {
    return <CheckCircle2 className="size-4 text-emerald-500" />
  }

  if (
    status === "cancelled" ||
    status === "failed" ||
    status === "expired"
  ) {
    return <XCircle className="size-4 text-destructive" />
  }

  return <Clock className="size-4 text-amber-500" />
}

export default function Billing() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [latestPayment, setLatestPayment] = useState<Payment | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCancellingPayment, setIsCancellingPayment] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [paymentsPage, setPaymentsPage] = useState(1)
  const [totalPaymentsPages, setTotalPaymentsPages] = useState(1)

  useEffect(() => {
    let ignore = false

    async function loadBilling() {
      setIsLoading(true)

      try {
        const [subscriptionData, historyData] = await Promise.all([
          loadBillingSubscriptionOnce(),
          loadBillingHistoryOnce(paymentsPage),
        ])

        if (!ignore) {
          setSubscription(subscriptionData.subscription)
          setLatestPayment(subscriptionData.latestPayment ?? null)
          setPayments(historyData.payments)
          setTotalPaymentsPages(Math.max(1, historyData.totalPage ?? 1))
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

    void loadBilling()

    return () => {
      ignore = true
    }
  }, [paymentsPage])

  const paymentPageItems = (() => {
    if (totalPaymentsPages <= 7) {
      return Array.from({ length: totalPaymentsPages }, (_, index) => index + 1)
    }

    const items: Array<number | "left-ellipsis" | "right-ellipsis"> = [1]
    const start = Math.max(2, paymentsPage - 1)
    const end = Math.min(totalPaymentsPages - 1, paymentsPage + 1)

    if (start > 2) items.push("left-ellipsis")
    for (let page = start; page <= end; page += 1) items.push(page)
    if (end < totalPaymentsPages - 1) items.push("right-ellipsis")
    items.push(totalPaymentsPages)

    return items
  })()

  const handleCancelLatestPayment = async () => {
    if (!latestPayment || latestPayment.status !== "pending" || isCancellingPayment) {
      return
    }

    setIsCancellingPayment(true)

    try {
      const data = await cancelSubscriptionPayment(latestPayment._id)
      setLatestPayment(data.payment)
      setPayments((currentPayments) =>
        currentPayments.map((payment) =>
          payment._id === data.payment._id ? data.payment : payment,
        ),
      )
      setIsCancelDialogOpen(false)
      toast.success("Payment cancelled.")
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to cancel payment."))
    } finally {
      setIsCancellingPayment(false)
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <BillingHeader />
        <div className="flex min-h-24 items-center justify-center">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  const plan = subscription?.plan ?? "free"
  const isPaidPlan = plan !== "free"

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <BillingHeader />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-lg border-0 shadow-none">
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>Crypto passes renew manually.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-3xl font-semibold tracking-tight">
                {formatPlanName(plan)}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Status</span>
              <span
                className={`text-sm font-medium capitalize ${getStatusLabelTone(
                  subscription?.status ?? "active",
                )}`}
              >
                {subscription?.status ?? "active"}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Clock className="size-4 text-muted-foreground" />
              <span>
                {isPaidPlan
                  ? `Active until ${formatDate(subscription?.currentPeriodEnd)}`
                  : "Free access does not expire"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-0 shadow-none">
          <CardHeader>
            <CardTitle>Latest Payment</CardTitle>
            <CardDescription>Manual USDT payment status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {latestPayment ? (
              <>
                <div>
                  <p className="text-3xl font-semibold tracking-tight">
                    {formatUsdtAmount(latestPayment.amountUsd)} USDT
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatPlanName(latestPayment.plan)} with{" "}
                    {latestPayment.payCurrency.toUpperCase()}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Payment status</span>
                  <span
                    className={`text-sm font-medium capitalize ${getStatusLabelTone(
                      latestPayment.status,
                    )}`}
                  >
                    {latestPayment.status}
                  </span>
                </div>

                {latestPayment.status === "pending" ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button asChild className="w-full">
                      <Link to={`/payment/${latestPayment._id}`}>Pay</Link>
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
                          <AlertDialogTitle>Cancel payment?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This payment will be cancelled and cannot be
                            continued.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isCancellingPayment}>
                            Keep payment
                          </AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            onClick={() => void handleCancelLatestPayment()}
                            disabled={isCancellingPayment}
                            className="relative"
                          >
                            {isCancellingPayment ? (
                              <>
                                <span className="invisible">Yes, cancel</span>
                                <Loader2 className="absolute size-4 animate-spin" />
                              </>
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
              <p className="text-sm text-muted-foreground">
                No crypto payments yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg border-0 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText className="size-4" />
            Billing History
          </CardTitle>
          <CardDescription>Your recent subscription payments.</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length ? (
            <>
              <div className="space-y-1.5">
                {payments.map((payment) => (
                  <div
                    key={payment._id}
                    className="rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {getStatusIcon(payment.status)}
                          <span className="font-medium">
                            {formatPlanName(payment.plan)}
                          </span>
                          <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize">
                            {payment.status}
                          </span>
                        </div>
                        <p className="text-muted-foreground">
                          {formatDateTime(payment.createdAt)} |{" "}
                          {payment.payCurrency.toUpperCase()}
                        </p>
                      </div>

                      <span className="shrink-0 font-semibold">
                        {formatUsdtAmount(payment.amountUsd)} USDT
                      </span>
                    </div>

                    {payment.status === "pending" ? (
                      <div className="mt-2 flex justify-start">
                        <Button asChild size="sm">
                          <Link to={`/payment/${payment._id}`}>Pay</Link>
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              {totalPaymentsPages > 1 ? (
                <Pagination className="justify-center pt-4">
                  <PaginationContent className="flex-nowrap justify-center">
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(event) => {
                          event.preventDefault()
                          setPaymentsPage((prev) => Math.max(1, prev - 1))
                        }}
                        className={
                          paymentsPage <= 1
                            ? "pointer-events-none opacity-50"
                            : undefined
                        }
                      />
                    </PaginationItem>

                    {paymentPageItems.map((item, index) =>
                      typeof item === "number" ? (
                        <PaginationItem key={`payments-page-${item}`}>
                          <PaginationLink
                            href="#"
                            isActive={item === paymentsPage}
                            onClick={(event) => {
                              event.preventDefault()
                              setPaymentsPage(item)
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
                          event.preventDefault()
                          setPaymentsPage((prev) =>
                            Math.min(totalPaymentsPages, prev + 1),
                          )
                        }}
                        className={
                          paymentsPage >= totalPaymentsPages
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
            <p className="text-sm text-muted-foreground">
              No billing history yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function BillingHeader() {
  return (
    <Card className="min-w-0 border-border/70">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
              Payment Center
            </span>
            <CardTitle className="text-xl tracking-tight">Billing</CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-6">
              Manage your crypto access pass and payment status.
            </CardDescription>
          </div>

          <Button asChild>
            <Link to="/pricing">
              <WalletCards className="size-4" />
              Upgrade
            </Link>
          </Button>
        </div>
      </CardHeader>
    </Card>
  )
}
