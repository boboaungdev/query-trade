import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Layers3,
  Sparkles,
  Target,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:5173";

const pillars = [
  {
    title: "Strategy building without chaos",
    description:
      "Create trading strategies with indicators, entry logic, and risk settings in a structure that stays readable as it grows.",
    icon: Target,
  },
  {
    title: "Backtesting that supports decisions",
    description:
      "Test ideas across symbols and timeframes so you can review results before committing to a live workflow.",
    icon: BarChart3,
  },
  {
    title: "A connected trading workspace",
    description:
      "Move between strategies, backtests, pricing, profile, and wallet activity without breaking context.",
    icon: Layers3,
  },
];

const workstream = [
  {
    label: "Build",
    title: "Create your strategy logic",
    description:
      "Start with an idea, combine indicators, shape your rules, and define the setup you want to test.",
  },
  {
    label: "Test",
    title: "Run backtests across the market",
    description:
      "Choose symbols, timeframes, and date ranges to see how your strategy behaves before using it further.",
  },
  {
    label: "Refine",
    title: "Improve with every result",
    description:
      "Review outcomes, adjust the setup, and keep improving your strategy with clearer feedback loops.",
  },
];

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

const faqItems = [
  {
    question: "What can I do inside Query Trade?",
    answer:
      "You can build strategies, run backtests, manage your wallet, access subscription plans, and use a creator-style trading workflow from one place.",
  },
  {
    question: "Is this only for advanced traders?",
    answer:
      "No. The product is designed to make strategy building and testing more approachable while still giving experienced users room to go deeper.",
  },
  {
    question: "Why use backtesting before going further?",
    answer:
      "Backtesting helps you pressure-test an idea against historical data so your decisions are based on outcomes you can review, not just assumptions.",
  },
];

export const metadata: Metadata = {
  title: `${APP_NAME} | Strategy Builder and Backtesting App`,
  description:
    "Build trading strategies, run backtests across major market timeframes, and manage your wallet and subscriptions in one connected trading app.",
};

export default function Page() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${APP_NAME} Home`,
    description: metadata.description,
    url: appUrl,
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

        <section className="relative border-b">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--color-primary)_12%,transparent),transparent_28%),linear-gradient(180deg,color-mix(in_oklab,var(--color-background)_96%,var(--color-primary)_4%)_0%,color-mix(in_oklab,var(--color-background)_100%,transparent)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:48px_48px] opacity-70 [mask-image:linear-gradient(to_bottom,transparent,black_15%,black_84%,transparent)]" />

          <div className="relative mx-auto flex min-h-[88vh] w-full max-w-6xl flex-col justify-center px-6 py-24 md:min-h-[84vh] md:px-10 md:py-32 lg:min-h-[82vh] lg:py-36">
            <div className="space-y-14 text-center">
              <div className="space-y-5">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/80 px-3 py-1 text-[11px] font-medium tracking-[0.22em] text-primary uppercase backdrop-blur">
                  <Sparkles className="size-3.5" />
                  Backtesting app
                </span>

                <div className="mx-auto space-y-5">
                  <h1 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                    <span className="text-foreground">Discipline</span>{" "}
                    <span className="text-muted-foreground">over</span>{" "}
                    <span className="bg-[linear-gradient(135deg,var(--color-primary),color-mix(in_oklab,var(--color-primary)_58%,white))] bg-clip-text text-transparent">
                      Emotion.
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
                  <a href={appUrl}>
                    Start Free
                    <ArrowRight className="size-4" />
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="min-w-40 justify-center bg-background/80"
                >
                  <Link href="#product-pillars">Explore features</Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-6xl px-6 pb-14 md:px-10 md:pb-20">
            <div className="grid gap-4 text-left md:grid-cols-3">
              {proofCards.map((item) => (
                <article
                  key={item.label}
                  className="rounded-[1.6rem] border bg-card/80 px-5 py-5 backdrop-blur"
                >
                  <p className="text-3xl font-semibold tracking-tight text-primary">
                    {item.metric}
                  </p>
                  <p className="mt-3 text-sm font-medium uppercase tracking-[0.16em] text-foreground/80">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {item.note}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="product-pillars"
          className="mx-auto w-full max-w-6xl px-6 py-18 md:py-22"
        >
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-primary uppercase">
                <Target className="size-3.5" />
                Core pillars
              </span>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Built for clarity
              </h2>
              <p className="max-w-xl text-base leading-7 text-muted-foreground">
                The best trading tools help you think more clearly. This product
                is designed to keep strategy creation, testing, and follow-up
                actions readable as your workflow grows.
              </p>
            </div>

            <div className="grid gap-4">
              {pillars.map((item) => {
                const Icon = item.icon;

                return (
                  <article
                    key={item.title}
                    className="rounded-[1.75rem] border bg-card px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.04)]"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="inline-flex size-12 items-center justify-center rounded-2xl border border-primary/15 bg-primary/8 text-primary">
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xl font-semibold">{item.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-y bg-muted/18">
          <div className="mx-auto w-full max-w-6xl px-6 py-18 md:py-22">
            <div className="space-y-4 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-primary uppercase">
                <Layers3 className="size-3.5" />
                Workflow
              </span>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Build. Test. Refine.
              </h2>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {workstream.map((step) => (
                <article
                  key={step.label}
                  className="rounded-[1.8rem] border bg-background px-5 py-6"
                >
                  <div className="inline-flex rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-xs font-medium tracking-[0.16em] text-primary uppercase">
                    {step.label}
                  </div>
                  <h3 className="mt-5 text-xl font-semibold">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {step.description}
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-sm font-medium text-primary">
                    <span>Built for iteration</span>
                    <ChevronRight className="size-4" />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 py-18 md:py-22">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-primary uppercase">
              <BarChart3 className="size-3.5" />
              Product snapshot
            </span>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Clean by default
                </h2>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                  This direction focuses on confident product messaging, clearer
                  sections, and a cleaner trading-app identity instead of
                  generic marketing labels.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {[
              {
                title: "Built around discipline",
                body: "Use backtesting to review decisions with more structure instead of relying on reaction and guesswork.",
              },
              {
                title: "Made for iteration",
                body: "Adjust strategy logic, test again, and keep refining without losing the shape of your workflow.",
              },
              {
                title: "Simple to navigate",
                body: "Core product areas stay connected so the app feels coherent from strategy building to wallet activity.",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="rounded-[1.8rem] border bg-card px-5 py-6 shadow-[0_16px_45px_rgba(15,23,42,0.04)]"
              >
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto w-full max-w-6xl px-6 py-18 md:py-22">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-primary uppercase">
                  <Sparkles className="size-3.5" />
                  Common questions
                </span>
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Simple answers
                </h2>
              </div>

              <div className="space-y-4">
                {faqItems.map((item) => (
                  <article
                    key={item.question}
                    className="rounded-[1.6rem] border bg-card px-5 py-5"
                  >
                    <h3 className="text-lg font-semibold">{item.question}</h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      {item.answer}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 pb-20">
          <div className="mx-auto w-full max-w-6xl">
            <div className="overflow-hidden rounded-[2.2rem] border border-primary/15 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-background)_97%,var(--color-primary)_3%),color-mix(in_oklab,var(--color-background)_88%,var(--color-primary)_12%))] px-6 py-10 shadow-[0_28px_80px_rgba(15,23,42,0.08)] md:px-10 md:py-14">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl space-y-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/78 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-primary uppercase backdrop-blur">
                    <Sparkles className="size-3.5" />
                    Get started
                  </span>
                  <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Open the app and start building your next strategy.
                  </h2>
                  <p className="text-base leading-7 text-muted-foreground">
                    Use one connected workspace for strategy creation,
                    backtesting, wallet activity, and premium trading features.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg" className="min-w-40 justify-center">
                    <a href={appUrl}>
                      Start Free
                      <ArrowRight className="size-4" />
                    </a>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="min-w-40 justify-center bg-background/80"
                  >
                    <Link href="#product-pillars">See product features</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
