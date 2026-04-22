import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Crown, Loader2, WalletCards } from "lucide-react";
import { toast } from "sonner";

import {
  createSubscriptionCheckout,
  getMySubscription,
  getSubscriptionPlans,
  type PayCurrency,
  type Subscription,
  type SubscriptionPlan,
} from "@/api/subscription";
import { getApiErrorMessage } from "@/api/axios";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

const defaultCurrency: PayCurrency = "usdtbsc";

function formatUsdtAmount(amount: number) {
  return amount.toLocaleString(undefined, {
    maximumFractionDigits: 8,
  });
}

function formatExpiry(subscription?: Subscription | null) {
  if (!subscription?.currentPeriodEnd) return null;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(subscription.currentPeriodEnd));
}

export default function Pricing() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadPricing() {
      setIsLoading(true);

      try {
        const [planData, subscriptionData] = await Promise.all([
          getSubscriptionPlans(),
          isAuthenticated ? getMySubscription() : Promise.resolve(null),
        ]);

        if (ignore) return;

        setPlans(planData.plans);
        setSubscription(subscriptionData?.subscription ?? null);
      } catch (error) {
        if (!ignore) {
          toast.error(getApiErrorMessage(error, "Failed to load pricing."));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadPricing();

    return () => {
      ignore = true;
    };
  }, [isAuthenticated]);

  const sortedPlans = useMemo(
    () =>
      [...plans].sort(
        (left, right) =>
          left.sortOrder - right.sortOrder || left.amountUsd - right.amountUsd,
      ),
    [plans],
  );

  const planRanks = useMemo(
    () =>
      sortedPlans.reduce<Record<string, number>>(
        (result, plan, index) => {
          result[plan.id] = index;
          return result;
        },
        { free: 0 },
      ),
    [sortedPlans],
  );

  const handleCheckout = async (plan: SubscriptionPlan) => {
    if (plan.id === "free") return;

    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }

    setLoadingPlan(plan.id);

    try {
      const checkout = await createSubscriptionCheckout({
        plan: plan.id,
        payCurrency: defaultCurrency,
      });

      if (checkout.mock) {
        toast.success("Mock payment confirmed.");
        navigate("/billing");
        return;
      }

      if (checkout.manualPayment || checkout.payment?._id) {
        navigate(`/payment/${checkout.payment._id}`);
        return;
      }

      throw new Error("Payment details were not returned.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to create checkout."));
    } finally {
      setLoadingPlan(null);
    }
  };

  const activePlan = subscription?.plan ?? "free";
  const expiryDate = formatExpiry(subscription);
  const hasActivePaidPlan =
    subscription?.status === "active" && activePlan !== "free";

  const getPlanAction = (plan: SubscriptionPlan) => {
    if (plan.id === "free") {
      return {
        disabled: true,
        label: "Included",
        variant: "outline" as const,
        note: null,
      };
    }

    if (
      hasActivePaidPlan &&
      (planRanks[plan.id] ?? Number.MAX_SAFE_INTEGER) <
        (planRanks[activePlan] ?? 0)
    ) {
      return {
        disabled: true,
        label: "Available after expiry",
        variant: "outline" as const,
        note: "Downgrades unlock after your current plan expires.",
      };
    }

    if (plan.id === activePlan) {
      return {
        disabled: false,
        label: "Extend access",
        variant: "outline" as const,
        note: `Adds ${plan.durationDays} days to your current plan.`,
      };
    }

    if (
      hasActivePaidPlan &&
      (planRanks[plan.id] ?? 0) > (planRanks[activePlan] ?? 0)
    ) {
      return {
        disabled: false,
        label: `Upgrade to ${plan.name}`,
        variant: "default" as const,
        note: `Starts a fresh ${plan.durationDays}-day ${plan.name} period from today.`,
      };
    }

    return {
      disabled: false,
      label: "Choose plan",
      variant: "default" as const,
      note: null,
    };
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <Card className="min-w-0 border-border/70">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
                Access Plans
              </span>
              <CardTitle className="text-xl tracking-tight">Pricing</CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-6">
                Pick a plan and complete payment with USDT on BNB Smart Chain.
              </CardDescription>
            </div>

            {isAuthenticated ? (
              <Button asChild variant="outline">
                <Link to="/billing">
                  <WalletCards className="size-4" />
                  Billing
                </Link>
              </Button>
            ) : null}
          </div>

        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="flex min-h-24 items-center justify-center">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {sortedPlans.map((plan) => {
            const isPaid = plan.id !== "free";
            const isActive = activePlan === plan.id;
            const action = getPlanAction(plan);

            return (
              <Card
                key={plan.id}
                className={cn("rounded-lg", isActive && "border border-primary")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {plan.id === "pro" ? <Crown className="size-4" /> : null}
                    {plan.name}
                  </CardTitle>
                  <CardDescription>
                    {plan.amountUsd === 0
                      ? "Starter access"
                      : "30 days of access"}
                  </CardDescription>
                  <CardAction>
                    {isActive ? (
                      <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        Active
                      </span>
                    ) : null}
                  </CardAction>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-5">
                  <div>
                    {plan.hasDiscount ? (
                      <p className="text-sm text-muted-foreground line-through">
                        {formatUsdtAmount(plan.originalAmountUsd)} USDT
                      </p>
                    ) : null}
                    <div className="text-3xl font-bold">
                      {formatUsdtAmount(plan.amountUsd)} USDT
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isPaid ? `${plan.durationDays} days` : "Forever"}
                    </p>
                    {plan.hasDiscount ? (
                      <p className="mt-1 text-sm font-medium text-primary">
                        {plan.discount?.label ||
                          `${formatUsdtAmount(plan.discountAmountUsd)} USDT off`}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {isActive && expiryDate && isPaid ? (
                    <p className="text-sm text-muted-foreground">
                      Active until {expiryDate}
                    </p>
                  ) : null}

                  {action.note ? (
                    <p className="text-sm text-muted-foreground">
                      {action.note}
                    </p>
                  ) : null}

                  <Button
                    className="mt-auto w-full"
                    variant={action.variant}
                    onClick={() => void handleCheckout(plan)}
                    disabled={loadingPlan === plan.id || action.disabled}
                  >
                    {loadingPlan === plan.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    {action.label}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
