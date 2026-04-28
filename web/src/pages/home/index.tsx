import type { CSSProperties } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeDollarSign,
  CandlestickChart,
  Target,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { UserMembershipMark } from "@/components/user-membership";
import { APP_NAME } from "@/constants";
import { useAuthStore } from "@/store/auth";

const customerReviews = [
  {
    quote:
      "The builder helped me turn rough ideas into a strategy I could actually test instead of just thinking about.",
    name: "Mason Lee",
    username: "masonlee",
    membership: {
      verifiedVariant: "plus",
      badgeLabel: "Plus",
      title: "Plus plan",
      description: "Premium membership",
    },
  },
  {
    quote:
      "I like that the workflow pushes me to validate first and add complexity later. That changed how I build.",
    name: "Ariana Patel",
    username: "arianapatel",
    membership: {
      verifiedVariant: "pro",
      badgeLabel: "Pro",
      title: "Pro plan",
      description: "Top-tier membership",
    },
  },
  {
    quote:
      "The structure keeps me honest. If I cannot explain the rule clearly here, it probably should not be in the strategy yet.",
    name: "Sophia Chen",
    username: "sophiachen",
    membership: {
      verifiedVariant: "plus",
      badgeLabel: "Plus",
      title: "Plus plan",
      description: "Premium membership",
    },
  },
  {
    quote:
      "I used to track everything in notes and screenshots. This feels much more deliberate and easier to revisit.",
    name: "Ethan Brooks",
    username: "ethanbrooks",
    membership: {
      verifiedVariant: "pro",
      badgeLabel: "Pro",
      title: "Pro plan",
      description: "Top-tier membership",
    },
  },
  {
    quote:
      "What surprised me most is how quickly bad ideas get exposed once the backtest loop is part of the workflow.",
    name: "Isabella Cruz",
    username: "isabellacruz",
    membership: {
      verifiedVariant: "plus",
      badgeLabel: "Plus",
      title: "Plus plan",
      description: "Premium membership",
    },
  },
  {
    quote:
      "The free plan was enough to learn the system. I only upgraded once I actually hit the rule and indicator limits.",
    name: "Liam Turner",
    username: "liamturner",
    membership: {
      verifiedVariant: "plus",
      badgeLabel: "Plus",
      title: "Plus plan",
      description: "Premium membership",
    },
  },
  {
    quote:
      "I like that the app nudges me toward cleaner experiments instead of letting everything become an overfit mess.",
    name: "Mia Alvarez",
    username: "miaalvarez",
    membership: {
      verifiedVariant: "pro",
      badgeLabel: "Pro",
      title: "Pro plan",
      description: "Top-tier membership",
    },
  },
  {
    quote:
      "Being able to move from setup to validation without changing tools made my weekly research routine a lot faster.",
    name: "Lucas Bennett",
    username: "lucasbennett",
    membership: {
      verifiedVariant: "plus",
      badgeLabel: "Plus",
      title: "Plus plan",
      description: "Premium membership",
    },
  },
  {
    quote:
      "The interface makes strategy logic feel less intimidating, especially when I am iterating on entry and exit rules.",
    name: "Emma Davis",
    username: "emmadavis",
    membership: {
      verifiedVariant: "plus",
      badgeLabel: "Plus",
      title: "Plus plan",
      description: "Premium membership",
    },
  },
  {
    quote:
      "I came for the builder, but the plan limits and upgrade path are actually presented in a way that makes sense.",
    name: "James Walker",
    username: "jameswalker",
    membership: {
      verifiedVariant: "pro",
      badgeLabel: "Pro",
      title: "Pro plan",
      description: "Top-tier membership",
    },
  },
  {
    quote:
      "This is the first time my strategy notes, test flow, and account progression have felt connected in one place.",
    name: "Charlotte Reed",
    username: "charlottereed",
    membership: {
      verifiedVariant: "plus",
      badgeLabel: "Plus",
      title: "Plus plan",
      description: "Premium membership",
    },
  },
  {
    quote:
      "The jump from writing rules to running a backtest feels much cleaner here than my old spreadsheet setup.",
    name: "Noah Kim",
    username: "noahkim",
    membership: {
      verifiedVariant: "plus",
      badgeLabel: "Plus",
      title: "Plus plan",
      description: "Premium membership",
    },
  },
];

const reveal = (delayMs: number): CSSProperties => ({
  animationDelay: `${delayMs}ms`,
});

const valuePoints = [
  {
    icon: Target,
    eyebrow: "Build",
    title: "Write clear strategy logic",
    description: "Create entries, exits, TP, and SL with structured rules.",
  },
  {
    icon: CandlestickChart,
    eyebrow: "Backtest",
    title: "Test before you trust",
    description: "Pressure-test ideas fast and compare what actually holds up.",
  },
  {
    icon: BadgeDollarSign,
    eyebrow: "Earn",
    title: "Turn strong systems into income",
    description: "Share public strategies or unlock paid access when ready.",
  },
];

export default function Home() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Card className="home-reveal-up is-visible overflow-hidden border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_35%),linear-gradient(135deg,rgba(15,23,42,0.02),rgba(59,130,246,0.04))]" style={reveal(40)}>
        <CardContent className="px-5 py-8 md:px-8 md:py-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-center">
            <div className="max-w-3xl space-y-4">
              <span
                className="home-reveal-up is-visible inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[11px] font-medium tracking-[0.16em] text-primary uppercase"
                style={reveal(120)}
              >
                {APP_NAME}
              </span>
              <div className="space-y-3">
                <h1
                  className="home-reveal-up is-visible text-3xl font-semibold tracking-tight md:text-5xl"
                  style={reveal(180)}
                >
                  Build, test, and refine trading systems in one workspace.
                </h1>
                <p
                  className="home-reveal-up is-visible max-w-2xl text-sm leading-7 text-muted-foreground md:text-base"
                  style={reveal(260)}
                >
                  {APP_NAME} gives you a structured place to create strategies,
                  pressure-test them with backtests, and grow into more advanced
                  workflows when your research gets deeper.
                </p>
              </div>
              <div
                className="home-reveal-up is-visible flex flex-wrap gap-3 pt-2"
                style={reveal(340)}
              >
                <Button asChild size="lg">
                  <Link to="/auth">
                    Start Building
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="ghost">
                  <Link to="/pricing">See Plans</Link>
                </Button>
              </div>
            </div>

            <div
              className="home-reveal-up is-visible relative hidden min-h-[280px] lg:block"
              style={reveal(220)}
            >
              <div className="home-grid absolute inset-0 rounded-3xl" />
              <div className="home-orb home-orb-primary-strong absolute top-6 left-8 h-24 w-24 rounded-full blur-2xl" />
              <div className="home-orb home-orb-primary-medium absolute top-16 right-10 h-16 w-16 rounded-full blur-2xl" />
              <div className="home-orb home-orb-primary-soft absolute right-16 bottom-10 h-20 w-20 rounded-full blur-2xl" />
              <div className="home-float absolute inset-x-8 top-10 rounded-3xl border border-primary/15 bg-background/85 p-5 shadow-sm backdrop-blur">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                      Research Flow
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      Idea to validation
                    </p>
                  </div>
                  <span className="rounded-full border border-primary/15 bg-primary/8 px-2 py-1 text-[11px] font-medium text-primary">
                    Live
                  </span>
                </div>

                <div className="mt-6 flex h-36 items-end gap-3">
                  <div
                    className="home-bar-rise h-14 flex-1 rounded-t-2xl bg-primary/20"
                    style={reveal(420)}
                  />
                  <div
                    className="home-bar-rise h-24 flex-1 rounded-t-2xl bg-primary/35"
                    style={reveal(520)}
                  />
                  <div
                    className="home-bar-rise h-20 flex-1 rounded-t-2xl bg-primary/25"
                    style={reveal(620)}
                  />
                  <div
                    className="home-bar-rise h-30 flex-1 rounded-t-2xl bg-primary/45"
                    style={reveal(720)}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Build</span>
                  <span>Backtest</span>
                  <span>Improve</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-3" style={reveal(520)}>
        {valuePoints.map((item, index) => (
          <Card
            key={item.title}
            className="home-reveal-up is-visible border-border/70 bg-muted/10"
            style={reveal(520 + index * 100)}
          >
            <CardContent className="space-y-4 p-5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/15 bg-primary/8 text-primary">
                <item.icon className="h-5 w-5" />
              </span>
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
                  {item.eyebrow}
                </p>
                <h2 className="text-lg font-semibold tracking-tight">
                  {item.title}
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section
        className="home-reveal-up is-visible grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center"
        style={reveal(860)}
      >
        <div className="space-y-3">
          <p className="text-[11px] font-medium tracking-[0.16em] text-emerald-600 uppercase dark:text-emerald-400">
            Creator Path
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            Build your edge, then publish it
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
            Start with your own strategy workflow, then turn strong systems into
            public access or paid strategy products.
          </p>
        </div>

        <Card className="border-emerald-500/15 bg-emerald-500/[0.06]">
          <CardContent className="space-y-4 p-5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/15 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <BadgeDollarSign className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Monetize good systems</p>
              <p className="text-sm leading-6 text-muted-foreground">
                Public when you want reach. Paid when you want income.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-emerald-500/15 bg-background/80 px-2.5 py-1 text-muted-foreground">
                Public
              </span>
              <span className="rounded-full border border-emerald-500/15 bg-background/80 px-2.5 py-1 text-muted-foreground">
                Paid
              </span>
              <span className="rounded-full border border-emerald-500/15 bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-600 dark:text-emerald-400">
                Income
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section
        className="home-reveal-up is-visible grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center"
        style={reveal(980)}
      >
        <div className="space-y-3">
          <p className="text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
            Wallet
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            Keep token flow inside the app
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
            Deposit, transfer, scan QR, and upgrade plans without leaving your
            workspace.
          </p>
        </div>

        <Card className="border-border/70 bg-muted/10">
          <CardContent className="space-y-4 p-5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/15 bg-primary/8 text-primary">
              <Wallet className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Fast wallet actions</p>
              <p className="text-sm leading-6 text-muted-foreground">
                Move token and manage access from one place.
              </p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border/60 bg-background px-2.5 py-1">
                  Deposit
                </span>
                <span className="rounded-full border border-border/60 bg-background px-2.5 py-1">
                  Transfer
                </span>
                <span className="rounded-full border border-border/60 bg-background px-2.5 py-1">
                  QR
                </span>
              </div>
              <Button asChild size="sm" variant="ghost" className="shrink-0">
                <Link to="/auth">
                  Unlock
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section
        className="home-reveal-up is-visible space-y-4"
        style={reveal(1080)}
      >
        <div className="space-y-2">
          <p className="text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
            Reviews
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            What early users are saying
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
            Hard-coded for now, but useful for giving the page a little more
            human proof while real testimonials are still being collected.
          </p>
        </div>

        <div className="home-review-marquee group overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="home-review-track flex w-max gap-4 group-hover:[animation-play-state:paused]">
            {[...customerReviews, ...customerReviews].map((review, index) => (
              <Card
                key={`${review.username}-${index}`}
                className="w-[300px] shrink-0 border-border/70"
              >
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(review.name)}`}
                        alt={review.name}
                      />
                      <AvatarFallback>
                        {review.name
                          .split(" ")
                          .map((part) => part[0] || "")
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="truncate text-sm font-semibold">
                          {review.name}
                        </p>
                        <UserMembershipMark
                          membership={review.membership}
                          interactive
                        />
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        @{review.username}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm leading-7 text-foreground">
                    "{review.quote}"
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer
        className="home-reveal-up is-visible rounded-3xl border border-border/70 bg-muted/15 px-5 py-5 md:px-6"
        style={reveal(1220)}
      >
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl space-y-2">
            <p className="text-sm font-semibold tracking-tight">{APP_NAME}</p>
            <p className="text-sm leading-6 text-muted-foreground">
              A focused workspace for strategy building, backtesting, and plan-based
              research progression.
            </p>
            <p className="text-xs text-muted-foreground">
              {"\u00A9"} {new Date().getFullYear()} {APP_NAME}. All rights reserved.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link
              to="/pricing"
              className="font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Pricing
            </Link>
            <Link
              to="/auth"
              className="font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign In
            </Link>
            <Link
              to="/auth"
              className="font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Get Started
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
