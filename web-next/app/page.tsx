import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

import HomeProductPreviewChart from "@/components/HomeProductPreviewChart";
import HomeReviewsMarquee from "@/components/HomeReviewsMarquee";
import SiteFooter from "@/components/SiteFooter";
import Navbar from "@/components/Navbar";
import { UserMembershipMark } from "@/components/user-membership";
import { homeFaqItems } from "@/data/home-faq";
import { homeFeaturedStrategies } from "@/data/home-featured-strategies";
import { homeReviewItems } from "@/data/home-reviews";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { APP_NAME, APP_TAGLINE, APP_URL } from "@/lib/constants";
import { getSubscriptionPlans } from "@/lib/subscription-plans";

const proofCards = [
  {
    metric: "Fast Setup",
    label: "strategy creation",
    note: "Turn an idea into clear trading rules without getting lost in clutter.",
  },
  {
    metric: "Deep Testing",
    label: "backtest workflow",
    note: "Review how your setup behaves across different market conditions before acting.",
  },
  {
    metric: "One Space",
    label: "connected tools",
    note: "Keep strategy building, results, wallet activity, and pricing in one flow.",
  },
];

export const metadata: Metadata = {
  title: `${APP_NAME} | Strategy Builder and Backtesting App`,
  description:
    "Build trading strategies, run backtests across major market timeframes, and manage your wallet and subscriptions in one connected trading app.",
  alternates: {
    canonical: APP_URL,
  },
  openGraph: {
    title: `${APP_NAME} | Strategy Builder and Backtesting App`,
    description:
      "Build trading strategies, run backtests across major market timeframes, and manage your wallet and subscriptions in one connected trading app.",
    url: APP_URL,
    siteName: APP_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} | Strategy Builder and Backtesting App`,
    description:
      "Build trading strategies, run backtests across major market timeframes, and manage your wallet and subscriptions in one connected trading app.",
  },
};

export default async function Page() {
  const homePlans = await getSubscriptionPlans();
  const [taglineLead, taglineBridge, taglineFocus] = APP_TAGLINE.replace(
    ".",
    "",
  )
    .split(" ")
    .filter(Boolean);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${APP_NAME} Home`,
    description: metadata.description,
    url: APP_URL,
    hasPart: {
      "@type": "OfferCatalog",
      name: `${APP_NAME} plans`,
      itemListElement: homePlans.map((plan) => ({
        "@type": "Offer",
        name: plan.name,
        priceCurrency: "TOKEN",
        price: String(plan.amountToken),
        description: plan.summary,
        category: "Subscription plan",
      })),
    },
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="overflow-hidden">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />

        <section className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--color-primary)_12%,transparent),transparent_28%),linear-gradient(180deg,color-mix(in_oklab,var(--color-background)_96%,var(--color-primary)_4%)_0%,color-mix(in_oklab,var(--color-background)_100%,transparent)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:48px_48px] opacity-70 [mask-image:linear-gradient(to_bottom,transparent,black_15%,black_84%,transparent)]" />

          <div className="relative mx-auto flex min-h-[88vh] w-full max-w-6xl flex-col justify-center px-6 py-24 md:min-h-[84vh] md:px-10 md:py-32 lg:min-h-[82vh] lg:py-36">
            <div className="space-y-14 text-center">
              <div className="space-y-5">
                <span className="inline-flex items-center gap-2 rounded-full bg-background/85 px-3 py-1 text-[11px] font-medium tracking-[0.22em] text-primary uppercase shadow-sm ring-1 ring-primary/10 backdrop-blur">
                  <Sparkles className="size-3.5" />
                  Backtesting app
                </span>

                <div className="mx-auto space-y-5">
                  <h1 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                    <span className="text-foreground">{taglineLead}</span>{" "}
                    <span className="text-muted-foreground">
                      {taglineBridge}
                    </span>{" "}
                    <span className="bg-[linear-gradient(135deg,var(--color-primary),color-mix(in_oklab,var(--color-primary)_58%,white))] bg-clip-text text-transparent">
                      {taglineFocus}.
                    </span>
                  </h1>
                  <p className="mx-auto max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                    {APP_NAME} is a backtesting app for traders who want to
                    create strategies, test them across the market, and unlock
                    reward-driven creator features in one focused workflow.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="min-w-40 justify-center">
                  <a href={APP_URL}>
                    Start Free
                    <ArrowRight className="size-4" />
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="min-w-40 justify-center border-transparent bg-background/80 shadow-sm"
                >
                  <Link href="#common-questions">Explore features</Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-6xl px-6 pb-14 md:px-10 md:pb-20">
            <div className="grid gap-4 text-left md:grid-cols-3">
              {proofCards.map((item) => (
                <Card
                  key={item.label}
                  className="rounded-[1.6rem] border-0 bg-card/85 py-0 shadow-[0_20px_45px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur"
                >
                  <CardContent className="px-5 py-5">
                    <p className="text-3xl font-semibold tracking-tight text-primary">
                      {item.metric}
                    </p>
                    <p className="mt-3 text-sm font-medium uppercase tracking-[0.16em] text-foreground/80">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      {item.note}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="reviews" className="px-6 py-18 md:py-22">
          <div className="mx-auto w-full max-w-6xl space-y-8">
            <div className="space-y-4 text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-primary uppercase ring-1 ring-primary/10">
                <Sparkles className="size-3.5" />
                Featured strategies
              </span>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Strategy ideas worth exploring
              </h2>
              <p className="mx-auto max-w-2xl text-base leading-7 text-muted-foreground">
                A sample of strategy directions traders can build, test, and
                refine inside {APP_NAME}.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {homeFeaturedStrategies.map((strategy) => (
                <Card
                  key={`${strategy.name}-${strategy.creator}`}
                  className="rounded-[1.7rem] border-0 bg-card py-0 shadow-[0_16px_40px_rgba(15,23,42,0.05)] ring-1 ring-black/5"
                >
                  <CardContent className="space-y-5 px-5 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full bg-primary/8 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-primary ring-1 ring-primary/10">
                            {strategy.access}
                          </span>
                          <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                            {strategy.symbol} • {strategy.timeframe}
                          </span>
                        </div>
                        <h3 className="text-xl font-semibold tracking-tight">
                          {strategy.name}
                        </h3>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          Sample ROI
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-foreground">
                          {strategy.roi}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm leading-7 text-muted-foreground">
                      {strategy.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-18 md:py-22">
          <div className="mx-auto w-full max-w-6xl space-y-8 overflow-hidden">
            <div className="space-y-4 text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-primary uppercase ring-1 ring-primary/10">
                <Sparkles className="size-3.5" />
                Community reviews
              </span>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                What traders are saying
              </h2>
              <p className="mx-auto max-w-2xl text-base leading-7 text-muted-foreground">
                A few early impressions from traders using {APP_NAME} for
                strategy building, backtesting, and iteration.
              </p>
            </div>

            <HomeReviewsMarquee items={homeReviewItems} />
          </div>
        </section>

        <section className="px-6 py-18 md:py-22">
          <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-primary uppercase ring-1 ring-primary/10">
                <Sparkles className="size-3.5" />
                Product preview
              </span>
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                See how a strategy becomes a reviewable workflow
              </h2>
              <p className="max-w-xl text-base leading-7 text-muted-foreground">
                Build the logic, check the structure, and keep results close to
                the setup so every idea stays easier to understand and improve.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "Readable logic blocks",
                  "Backtest context nearby",
                  "Connected wallet flow",
                  "Faster iteration cycles",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3 text-sm text-muted-foreground ring-1 ring-black/5"
                  >
                    <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary/8 text-primary">
                      <Check className="size-3" />
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <Card className="overflow-hidden rounded-[2rem] border-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-background)_96%,var(--color-primary)_4%),color-mix(in_oklab,var(--color-background)_90%,var(--color-primary)_10%))] py-0 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-primary/10">
              <CardContent className="space-y-5 px-5 py-5 md:px-6 md:py-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                      Workspace snapshot
                    </p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight">
                      Momentum Breakout Stack
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["Draft", "BTC/USDT", "4H"].map((item) => (
                      <span
                        key={item}
                        className="inline-flex rounded-full bg-background/85 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-primary ring-1 ring-primary/10"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-[1.5rem] bg-background/88 p-4 ring-1 ring-black/5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Strategy logic
                      </p>
                      <span className="text-xs text-muted-foreground">
                        3 linked conditions
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3">
                      {[
                        {
                          title: "Trend direction",
                          body: "Only look for entries while EMA 20 stays above EMA 50.",
                        },
                        {
                          title: "Entry confirmation",
                          body: "Trigger when price reclaims EMA 20 and RSI pushes through 55.",
                        },
                        {
                          title: "Risk controls",
                          body: "Apply fixed sizing with a defined stop loss and reward target.",
                        },
                      ].map((item, index) => (
                        <div
                          key={item.title}
                          className="grid grid-cols-[auto_1fr] gap-3 rounded-2xl border border-border/50 bg-background/70 px-3 py-3"
                        >
                          <div className="flex flex-col items-center gap-2 pt-0.5">
                            <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/8 text-[11px] font-semibold text-primary">
                              {index + 1}
                            </span>
                            {index < 2 ? (
                              <span className="h-full w-px bg-border/70" />
                            ) : null}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">
                              {item.title}
                            </p>
                            <p className="text-sm leading-6 text-muted-foreground">
                              {item.body}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(220px,1.1fr)]">
                    <div className="rounded-[1.5rem] bg-background/88 p-4 ring-1 ring-black/5">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Backtest snapshot
                      </p>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {[
                          {
                            label: "Net return",
                            value: "+18.4%",
                            icon: TrendingUp,
                            valueClassName:
                              "text-emerald-600 dark:text-emerald-400",
                          },
                          {
                            label: "Win rate",
                            value: "62%",
                            icon: Target,
                          },
                          {
                            label: "Profit factor",
                            value: "1.84",
                            icon: BarChart3,
                          },
                          {
                            label: "Max drawdown",
                            value: "8.1%",
                            icon: ShieldAlert,
                          },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="rounded-2xl border border-border/50 bg-background/70 px-3 py-3"
                          >
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary/8 text-primary">
                                <item.icon className="size-3.5" />
                              </span>
                              <span className="text-[11px] font-medium uppercase tracking-[0.14em]">
                                {item.label}
                              </span>
                            </div>
                            <span
                              className={`mt-2 block text-lg font-semibold tracking-tight ${
                                item.valueClassName ?? "text-foreground"
                              }`}
                            >
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] bg-background/88 p-4 ring-1 ring-black/5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          Equity curve
                        </p>
                        <span className="text-xs text-muted-foreground">
                          6 month view
                        </span>
                      </div>
                      <HomeProductPreviewChart />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="px-6 py-18 md:py-22">
          <div className="mx-auto w-full max-w-6xl space-y-8">
            <div className="space-y-4 text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-primary uppercase ring-1 ring-primary/10">
                <Sparkles className="size-3.5" />
                Plan preview
              </span>
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Choose the level that fits your workflow
              </h2>
              <p className="mx-auto max-w-2xl text-base leading-7 text-muted-foreground">
                Start free, then move into broader testing access and more
                advanced controls when you need them.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {homePlans.map((plan) => (
                <Card
                  key={plan.name}
                  className={`rounded-[1.9rem] border-0 py-0 shadow-[0_20px_50px_rgba(15,23,42,0.06)] ring-1 ${
                    plan.highlighted
                      ? "bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-background)_97%,var(--color-primary)_3%),color-mix(in_oklab,var(--color-background)_90%,var(--color-primary)_10%))] ring-primary/15"
                      : "bg-card ring-black/5"
                  }`}
                >
                  <CardContent className="flex h-full flex-col gap-6 px-6 py-6">
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-2xl font-semibold tracking-tight">
                            {plan.name}
                          </h3>
                          {plan.key === "plus" ? (
                            <UserMembershipMark
                              membership={{
                                verifiedVariant: "plus",
                                badgeLabel: "Plus",
                                title: "Plus membership",
                              }}
                            />
                          ) : null}
                          {plan.key === "pro" ? (
                            <UserMembershipMark
                              membership={{
                                verifiedVariant: "pro",
                                badgeLabel: "Pro",
                                title: "Pro membership",
                              }}
                            />
                          ) : null}
                          {plan.highlighted ? (
                            <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-primary ring-1 ring-primary/10">
                              Popular
                            </span>
                          ) : null}
                          {plan.hasDiscount ? (
                            <span className="inline-flex rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium tracking-[0.16em] text-emerald-600 ring-1 ring-emerald-500/15 dark:text-emerald-400">
                              Save {plan.discountAmountToken} token ·{" "}
                              {plan.discountPercentage}% off
                            </span>
                          ) : null}
                        </div>

                        <div className="space-y-1">
                          {plan.hasDiscount ? (
                            <p className="text-sm font-medium text-muted-foreground line-through">
                              {plan.originalPriceLabel}
                            </p>
                          ) : null}
                          <p className="text-lg font-semibold tracking-[0.16em] text-primary">
                            {plan.priceLabel}
                          </p>
                        </div>

                        <p className="text-sm leading-7 text-muted-foreground">
                          {plan.summary}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {plan.features.map((feature) => (
                        <div
                          key={feature}
                          className="flex items-start gap-2.5 text-sm leading-6 text-muted-foreground"
                        >
                          <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/8 text-primary">
                            <Check className="size-3" />
                          </span>
                          <p>{feature}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-auto pt-2">
                      <Button
                        asChild
                        variant={plan.highlighted ? "default" : "outline"}
                        className="w-full justify-center"
                      >
                        <Link href="/pricing">{plan.cta}</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="common-questions">
          <div className="mx-auto w-full max-w-6xl px-6 py-18 md:py-22">
            <div className="space-y-8">
              <div className="space-y-4 text-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-primary uppercase ring-1 ring-primary/10">
                  <Sparkles className="size-3.5" />
                  Frequently asked questions
                </span>
                <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                  FAQ
                </h2>
                <p className="mx-auto max-w-2xl text-base leading-7 text-muted-foreground">
                  Answers to common questions about {APP_NAME}, strategy
                  building, and backtesting.
                </p>
              </div>

              <Accordion
                type="single"
                collapsible
                defaultValue={homeFaqItems[0]?.question}
                className="mx-auto max-w-4xl space-y-4"
              >
                {homeFaqItems.map((item) => (
                  <Card
                    key={item.question}
                    className="rounded-[1.6rem] border-0 bg-card py-0 shadow-[0_16px_40px_rgba(15,23,42,0.05)] ring-1 ring-black/5"
                  >
                    <AccordionItem
                      value={item.question}
                      className="border-b-0 px-5"
                    >
                      <AccordionTrigger className="py-5 text-lg font-semibold hover:no-underline">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent>
                        <CardDescription className="pb-5 text-sm leading-7">
                          {item.answer}
                        </CardDescription>
                      </AccordionContent>
                    </AccordionItem>
                  </Card>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        <section className="px-6 pb-20">
          <div className="mx-auto w-full max-w-6xl">
            <Card className="overflow-hidden rounded-[2.2rem] border-0 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-background)_97%,var(--color-primary)_3%),color-mix(in_oklab,var(--color-background)_88%,var(--color-primary)_12%))] py-0 shadow-[0_28px_80px_rgba(15,23,42,0.08)] ring-1 ring-primary/10">
              <CardContent className="px-6 py-10 md:px-10 md:py-14">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-2xl space-y-3">
                    <span className="inline-flex items-center gap-2 rounded-full bg-background/78 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-primary uppercase shadow-sm ring-1 ring-primary/10 backdrop-blur">
                      <Sparkles className="size-3.5" />
                      Get started
                    </span>
                    <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                      Start building and testing your next strategy.
                    </h2>
                    <p className="text-base leading-7 text-muted-foreground">
                      Create strategies, run backtests, manage your wallet, and
                      grow inside one connected trading workspace.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      asChild
                      size="lg"
                      className="min-w-40 justify-center"
                    >
                      <a href={APP_URL}>
                        Start Free
                        <ArrowRight className="size-4" />
                      </a>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="min-w-40 justify-center border-transparent bg-background/80 shadow-sm"
                    >
                      <Link href="#common-questions">See product features</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <SiteFooter
        links={[
          { href: "/", label: "Home", scrollToTopOnCurrentPage: true },
          { href: "#reviews", label: "Reviews" },
          { href: "/pricing", label: "Pricing", scrollToTopOnCurrentPage: true },
          { href: "#common-questions", label: "FAQ" },
        ]}
      />
    </div>
  );
}
