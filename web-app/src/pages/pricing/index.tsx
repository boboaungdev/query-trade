import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownLeft,
  BadgeCheck,
  Check,
  CreditCard,
  DollarSign,
  Loader2,
  Smartphone,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import {
  createSubscriptionCheckout,
  type Subscription,
  type SubscriptionPlan,
} from "@/api/subscription";
import { getApiErrorMessage } from "@/api/axios";
import { createTokenDeposit } from "@/api/wallet";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardAction,
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
import { useAuthStore } from "@/store/auth";
import { useMySubscriptionStore } from "@/store/my-subscription";
import { useSubscriptionStore } from "@/store/subscription";
import { useWalletStore } from "@/store/wallet";
import { formatCompactTokenAmount } from "@/lib/formatTokenAmount";
import { cn } from "@/lib/utils";

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

function formatExpiry(subscription?: Subscription | null) {
  if (!subscription?.currentPeriodEnd) return null;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(subscription.currentPeriodEnd));
}

function getPlanBadgeIcon(planId: string) {
  if (planId === "pro") {
    return <BadgeCheck className="size-4 fill-amber-500 text-white" />;
  }

  if (planId === "plus") {
    return <BadgeCheck className="size-4 fill-sky-500 text-white" />;
  }

  return null;
}

export default function Pricing() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userTokenBalance = useAuthStore(
    (state) => state.user?.tokenBalance ?? 0,
  );
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
  const walletTokenBalance = useWalletStore((state) => state.tokenBalance);
  const setWalletSummary = useWalletStore((state) => state.setWalletSummary);
  const plans = useSubscriptionStore((state) => state.plans);
  const fetchPlans = useSubscriptionStore((state) => state.fetchPlans);
  const subscription = useMySubscriptionStore((state) => state.subscription);
  const isMySubscriptionLoading = useMySubscriptionStore(
    (state) => state.isLoading,
  );
  const fetchMySubscription = useMySubscriptionStore(
    (state) => state.fetchMySubscription,
  );
  const setMySubscription = useMySubscriptionStore(
    (state) => state.setSubscription,
  );
  const clearMySubscription = useMySubscriptionStore(
    (state) => state.clearMySubscription,
  );
  const navigate = useNavigate();
  const tokenBalance = walletTokenBalance ?? userTokenBalance;
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [confirmPlan, setConfirmPlan] = useState<SubscriptionPlan | null>(null);
  const [showBalance, setShowBalance] = useState(!hideWalletBalancePreference);
  const [depositAmount, setDepositAmount] = useState("");
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);
  const [isCreatingDeposit, setIsCreatingDeposit] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadPricing() {
      try {
        await Promise.all([
          fetchPlans(true),
          isAuthenticated ? fetchMySubscription(true) : Promise.resolve(),
        ]);

        if (ignore) return;
      } catch (error) {
        if (!ignore) {
          toast.error(getApiErrorMessage(error, "Failed to load pricing."));
        }
      }
    }

    if (!isAuthenticated) {
      clearMySubscription();
    }

    void loadPricing();

    return () => {
      ignore = true;
    };
  }, [clearMySubscription, fetchMySubscription, fetchPlans, isAuthenticated]);

  useEffect(() => {
    setShowBalance(!hideWalletBalancePreference);
  }, [hideWalletBalancePreference]);

  const depositAmountNumber = Number(depositAmount);
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

  const sortedPlans = useMemo(
    () =>
      [...plans].sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          left.amountToken - right.amountToken,
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
      });

      setMySubscription(checkout.subscription);
      setWalletSummary({ tokenBalance: checkout.tokenBalance });
      updateUser({
        tokenBalance: checkout.tokenBalance,
        ...(checkout.membership ? { membership: checkout.membership } : {}),
      });
      setConfirmPlan(null);
      toast.success(`${plan.name} activated.`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to subscribe with token."));
    } finally {
      setLoadingPlan(null);
    }
  };

  const hasResolvedSubscription =
    !isAuthenticated || subscription !== null || !isMySubscriptionLoading;
  const activePlan = hasResolvedSubscription
    ? (subscription?.plan ?? "free")
    : null;
  const expiryDate = formatExpiry(subscription);
  const hasActivePaidPlan =
    hasResolvedSubscription &&
    subscription?.status === "active" &&
    activePlan !== "free";
  const activePlanRank =
    typeof activePlan === "string" ? (planRanks[activePlan] ?? 0) : 0;

  const getPlanAction = (plan: SubscriptionPlan) => {
    if (plan.id === "free") {
      return {
        disabled: isAuthenticated,
        label: isAuthenticated ? "Included" : "Free",
        variant: isAuthenticated ? ("outline" as const) : ("default" as const),
        note: null,
      };
    }

    if (isAuthenticated && !hasResolvedSubscription) {
      return {
        disabled: true,
        label: "Loading plan...",
        variant: "outline" as const,
        note: null,
      };
    }

    if (!isAuthenticated) {
      return {
        disabled: false,
        label: plan.name,
        variant: "outline" as const,
        note: null,
      };
    }

    if (
      hasActivePaidPlan &&
      (planRanks[plan.id] ?? Number.MAX_SAFE_INTEGER) < activePlanRank
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
        note: `Spends ${formatTokenAmount(plan.amountToken)} token for another ${plan.durationDays} days.`,
      };
    }

    if (hasActivePaidPlan && (planRanks[plan.id] ?? 0) > activePlanRank) {
      return {
        disabled: false,
        label: `Upgrade to ${plan.name}`,
        variant: "default" as const,
        note: `Spends ${formatTokenAmount(plan.amountToken)} token and starts a fresh ${plan.durationDays}-day period.`,
      };
    }

    return {
      disabled: false,
      label: "Subscribe with token",
      variant: "default" as const,
      note: null,
    };
  };

  const getConfirmTitle = (plan: SubscriptionPlan) => {
    if (plan.id === activePlan) {
      return `Extend ${plan.name}?`;
    }

    if (hasActivePaidPlan && (planRanks[plan.id] ?? 0) > activePlanRank) {
      return `Upgrade to ${plan.name}?`;
    }

    return `Subscribe to ${plan.name}?`;
  };

  const getConfirmDescription = (plan: SubscriptionPlan) => {
    if (plan.id === activePlan) {
      return `Spend ${formatTokenAmount(plan.amountToken)} token to extend ${plan.name} for ${plan.durationDays} days.`;
    }

    if (hasActivePaidPlan && (planRanks[plan.id] ?? 0) > activePlanRank) {
      return `Spend ${formatTokenAmount(plan.amountToken)} token to start a fresh ${plan.durationDays}-day ${plan.name} plan.`;
    }

    return `Spend ${formatTokenAmount(plan.amountToken)} token to activate ${plan.name} for ${plan.durationDays} days.`;
  };

  const headerDescription = isAuthenticated
    ? "Deposit USD to get token, then subscribe with token only."
    : "Sign in to deposit USD, get token, and subscribe to a plan.";

  const handleDepositDialogOpenChange = (open: boolean) => {
    setIsDepositDialogOpen(open);

    if (!open) {
      setDepositAmount("");
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

      if (data.payment.status === "confirmed") {
        const nextBalance = tokenBalance + data.payment.tokenAmount;
        setWalletSummary({
          latestPayment: data.payment,
          tokenBalance: nextBalance,
        });
        updateUser({ tokenBalance: nextBalance });
        setDepositAmount("");
        setIsDepositDialogOpen(false);
        toast.success("Deposit confirmed.");
      } else {
        setWalletSummary({ latestPayment: data.payment });
        setDepositAmount("");
        setIsDepositDialogOpen(false);
        toast.success("Deposit request created.");
        navigate(`/payment/${data.payment._id}`);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to create deposit."));
    } finally {
      setIsCreatingDeposit(false);
    }
  };

  return (
    <>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Card className="min-w-0 border-border/70">
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 flex-1 space-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
                  Access Plans
                </span>
                <CardTitle>Pricing</CardTitle>
                <CardDescription className="max-w-2xl text-sm leading-6">
                  {headerDescription}
                </CardDescription>
              </div>
              {isAuthenticated ? (
                <div className="flex flex-col gap-1 md:items-end">
                  <p className="text-left text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                    Balance
                  </p>
                  <div className="space-y-1">
                    <div className="flex flex-nowrap items-start gap-3">
                      <div className="min-w-0 flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <Wallet className="size-5 text-muted-foreground" />
                          <button
                            type="button"
                            onClick={() =>
                              setShowBalance((current) => !current)
                            }
                            aria-label={
                              showBalance ? "Hide balance" : "Show balance"
                            }
                            className="truncate text-left text-xl font-semibold tracking-tight transition-colors hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            {showBalance
                              ? `${formatTokenAmount(tokenBalance)} token`
                              : "**** token"}
                          </button>
                        </div>
                        <div className="ml-7">
                          <button
                            type="button"
                            onClick={() =>
                              setShowBalance((current) => !current)
                            }
                            aria-label={
                              showBalance ? "Hide balance" : "Show balance"
                            }
                            className="text-left text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            {showBalance
                              ? `${formatFullTokenAmount(tokenBalance)} token`
                              : "**** token"}
                          </button>
                        </div>
                      </div>
                      <Button
                        className="shrink-0"
                        size="sm"
                        onClick={() => setIsDepositDialogOpen(true)}
                      >
                        <ArrowDownLeft className="size-4" />
                        Deposit
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          {sortedPlans.map((plan) => {
            const isPaid = plan.id !== "free";
            const isActive = hasResolvedSubscription && activePlan === plan.id;
            const action = getPlanAction(plan);
            const hasEnoughToken = tokenBalance >= plan.amountToken;

            return (
              <Card
                key={plan.id}
                className={cn(
                  "rounded-lg",
                  isActive && "border border-primary",
                )}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {plan.name}
                    {getPlanBadgeIcon(plan.id)}
                  </CardTitle>
                  <CardDescription>
                    {plan.amountToken === 0
                      ? "Starter access"
                      : `${plan.durationDays} days of access`}
                  </CardDescription>
                  <CardAction>
                    {isActive ? (
                      <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        Active
                      </span>
                    ) : null}
                  </CardAction>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-4">
                  <div>
                    {plan.hasDiscount ? (
                      <p className="text-sm text-muted-foreground line-through">
                        {formatTokenAmount(plan.originalAmountToken)} token
                      </p>
                    ) : null}
                    <div className="text-2xl font-bold">
                      {formatTokenAmount(plan.amountToken)} token
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isPaid ? `${plan.durationDays} days` : "Forever"}
                    </p>
                    {plan.hasDiscount ? (
                      <p className="mt-1 text-sm font-medium text-primary">
                        {plan.discount?.label ||
                          `${formatTokenAmount(plan.discountAmountToken)} token off`}
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

                  {!hasEnoughToken && isPaid ? (
                    <p className="text-sm text-muted-foreground">
                      Need {formatTokenAmount(plan.amountToken - tokenBalance)}{" "}
                      more token.
                    </p>
                  ) : null}

                  <Button
                    className="mt-auto w-full"
                    variant={action.variant}
                    onClick={() => {
                      if (!isAuthenticated && !isPaid) {
                        navigate("/auth");
                        return;
                      }

                      setConfirmPlan(plan);
                    }}
                    disabled={
                      loadingPlan === plan.id ||
                      action.disabled ||
                      (!isAuthenticated && isPaid) ||
                      (isAuthenticated && isPaid && !hasEnoughToken)
                    }
                  >
                    {loadingPlan === plan.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : !isAuthenticated && isPaid ? (
                      "Sign up first"
                    ) : !hasEnoughToken && isPaid ? (
                      "Insufficient balance"
                    ) : (
                      action.label
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <AlertDialog
        open={Boolean(confirmPlan)}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmPlan(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmPlan
                ? getConfirmTitle(confirmPlan)
                : "Confirm subscription?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmPlan ? getConfirmDescription(confirmPlan) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {confirmPlan ? (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Cost:{" "}
                <span className="font-medium text-foreground">
                  {formatTokenAmount(confirmPlan.amountToken)} token
                </span>
              </p>
              <p>
                Balance:{" "}
                <span className="font-medium text-foreground">
                  {formatTokenAmount(tokenBalance)} token
                </span>
              </p>
              <p>
                After balance:{" "}
                <span className="font-medium text-foreground">
                  {formatTokenAmount(
                    Math.max(0, tokenBalance - confirmPlan.amountToken),
                  )}{" "}
                  token
                </span>
              </p>
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={Boolean(confirmPlan && loadingPlan === confirmPlan.id)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmPlan) {
                  void handleCheckout(confirmPlan);
                }
              }}
              disabled={Boolean(confirmPlan && loadingPlan === confirmPlan.id)}
            >
              {confirmPlan && loadingPlan === confirmPlan.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Use token"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
    </>
  );
}
