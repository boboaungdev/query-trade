import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import HomeReviewsMarquee from "@/components/HomeReviewsMarquee";
import ScrollToTopLink from "@/components/ScrollToTopLink";
import Navbar from "@/components/Navbar";
import { homeFaqItems } from "@/data/home-faq";
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
};

export default function Page() {
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

        <section id="common-questions">
          <div className="mx-auto w-full max-w-6xl px-6 py-18 md:py-22">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-primary uppercase ring-1 ring-primary/10">
                  <Sparkles className="size-3.5" />
                  Frequently asked questions
                </span>
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  FAQ
                </h2>
                <p className="max-w-md text-base leading-7 text-muted-foreground">
                  Answers to common questions about {APP_NAME}, strategy
                  building, and backtesting.
                </p>
              </div>

              <Accordion
                type="single"
                collapsible
                defaultValue={homeFaqItems[0]?.question}
                className="space-y-4"
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

      <footer className="border-t border-border/60 px-6 py-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p className="text-center md:text-left">
            &copy; {new Date().getFullYear()}{" "}
            <ScrollToTopLink className="font-medium text-primary transition-colors hover:text-primary/80">
              {APP_NAME}
            </ScrollToTopLink>
            . All rights reserved.
          </p>

          <div className="flex items-center justify-center gap-5 md:justify-end">
            <ScrollToTopLink className="transition-colors hover:text-foreground">
              Home
            </ScrollToTopLink>
            <Link
              href="/pricing"
              className="transition-colors hover:text-foreground"
            >
              Pricing
            </Link>
            <Link
              href="#common-questions"
              className="transition-colors hover:text-foreground"
            >
              FAQ
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
