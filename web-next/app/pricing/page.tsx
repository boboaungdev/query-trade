import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";

import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import { UserMembershipMark } from "@/components/user-membership";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { APP_NAME, APP_URL } from "@/lib/constants";
import { getSubscriptionPlans } from "@/lib/subscription-plans";

const pricingGuides = [
  {
    title: "Free",
    description:
      "A simple way to start building strategies and running early backtests.",
    fit: "Good for learning the product and exploring the core workflow.",
  },
  {
    title: "Plus",
    description:
      "A balanced plan for traders who want more backtesting depth and creator features.",
    fit: "Good for regular testing, paid strategy access, and publishing.",
  },
  {
    title: "Pro",
    description:
      "The most complete option for traders who want fewer limits and broader access.",
    fit: "Good for advanced testing, premium strategies, and full-range workflows.",
  },
];

export const metadata: Metadata = {
  title: `${APP_NAME} | Pricing`,
  description:
    "Compare Free, Plus, and Pro plans for strategy building, backtesting, creator access, and broader trading workflow features.",
  alternates: {
    canonical: `${APP_URL}/pricing`,
  },
  openGraph: {
    title: `${APP_NAME} | Pricing`,
    description:
      "Compare Free, Plus, and Pro plans for strategy building, backtesting, creator access, and broader trading workflow features.",
    url: `${APP_URL}/pricing`,
    siteName: APP_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} | Pricing`,
    description:
      "Compare Free, Plus, and Pro plans for strategy building, backtesting, creator access, and broader trading workflow features.",
  },
};

export default async function PricingPage() {
  const homePlans = await getSubscriptionPlans();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name: `${APP_NAME} pricing`,
    url: `${APP_URL}/pricing`,
    itemListElement: homePlans.map((plan) => ({
      "@type": "Offer",
      name: plan.name,
      description: plan.summary,
      priceCurrency: "TOKEN",
      price: String(plan.amountToken),
      category: "Subscription plan",
      eligibleDuration: plan.durationDays
        ? `P${plan.durationDays}D`
        : undefined,
    })),
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
        <section className="relative px-6 pb-18 pt-18 md:pb-22 md:pt-22">
          <div className="absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--color-primary)_14%,transparent),transparent_62%)]" />

          <div className="relative mx-auto w-full max-w-6xl space-y-12">
            <div className="space-y-5 text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-primary uppercase ring-1 ring-primary/10">
                <Sparkles className="size-3.5" />
                Pricing
              </span>
              <h1 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Choose the plan that fits how you build and test.
              </h1>
              <p className="mx-auto max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Start with the core workflow for free, then unlock broader
                backtesting range, creator tools, and higher strategy limits as
                your process grows.
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
                          <h2 className="text-2xl font-semibold tracking-tight">
                            {plan.name}
                          </h2>
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
                        size="lg"
                        variant={plan.highlighted ? "default" : "outline"}
                        className="w-full justify-center"
                      >
                        <a href={APP_URL}>
                          {plan.key === "free" ? plan.cta : "Sign up"}
                          <ArrowRight className="size-4" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-18 md:py-22">
          <div className="mx-auto w-full max-w-6xl space-y-8">
            <div className="space-y-4 text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-primary uppercase ring-1 ring-primary/10">
                <Sparkles className="size-3.5" />
                Choosing a plan
              </span>
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Which plan should you choose?
              </h2>
              <p className="mx-auto max-w-2xl text-base leading-7 text-muted-foreground">
                Start with the level that matches how deeply you want to build,
                test, and publish strategies.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {pricingGuides.map((item) => (
                <Card
                  key={item.title}
                  className="rounded-[1.7rem] border-0 bg-card py-0 shadow-[0_16px_40px_rgba(15,23,42,0.05)] ring-1 ring-black/5"
                >
                  <CardContent className="space-y-4 px-5 py-5">
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold tracking-tight">
                        {item.title}
                      </h3>
                      <p className="text-sm leading-7 text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-muted/55 px-4 py-4">
                      <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                        Good for
                      </p>
                      <p className="mt-2 text-sm leading-7 text-foreground/85">
                        {item.fit}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 pb-20">
          <div className="mx-auto w-full max-w-6xl">
            <Card className="overflow-hidden rounded-[2.2rem] border-0 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-background)_97%,var(--color-primary)_3%),color-mix(in_oklab,var(--color-background)_88%,var(--color-primary)_12%))] py-0 shadow-[0_28px_80px_rgba(15,23,42,0.08)] ring-1 ring-primary/10">
              <CardContent className="px-6 py-10 md:px-10 md:py-14">
                <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
                  <div className="max-w-2xl space-y-3">
                    <span className="inline-flex items-center gap-2 rounded-full bg-background/78 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-primary uppercase shadow-sm ring-1 ring-primary/10 backdrop-blur">
                      <Sparkles className="size-3.5" />
                      Start now
                    </span>
                    <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                      Open {APP_NAME} and pick the workflow depth you need.
                    </h2>
                    <p className="text-base leading-7 text-muted-foreground">
                      You can begin with the free tier or move directly into
                      broader testing access and creator features.
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
                      <Link href="/">Back to home</Link>
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
          {
            href: "/pricing",
            label: "Pricing",
            scrollToTopOnCurrentPage: true,
          },
        ]}
      />
    </div>
  );
}
