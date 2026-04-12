import { useEffect } from "react";
import {
  ArrowRight,
  BookMarked,
  Brain,
  CandlestickChart,
  ChartCandlestick,
  Clock3,
  FlaskConical,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/constants";
import { useAuthStore } from "@/store/auth";

export default function Home() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const primaryHref = isAuthenticated ? "/dashboard" : "/auth";
  const primaryLabel = isAuthenticated ? "Open Dashboard" : "Start Free";
  const heroSecondaryHref = isAuthenticated ? "/backtest" : "/auth";
  const heroSecondaryLabel = isAuthenticated ? "Run Backtests" : "Sign In";
  const footerTitle = isAuthenticated
    ? "Ready to push your trading system further?"
    : "Free crypto strategy building from idea to backtest.";
  const footerDescription = isAuthenticated
    ? "Open your workspace, build or pick a strategy, and backtest it with confidence."
    : "Use Query Trade for free to explore thousands of strategies, build your own, and backtest faster.";
  const copyrightYear = 2026;
  const stats = [
    { label: "Price", value: "Free" },
    { label: "Strategy Library", value: "1000+" },
    { label: "Workflow", value: "Build To Backtest" },
  ];

  const features = [
    {
      title: "Build Your Own Strategy",
      description:
        "Create custom crypto strategies, shape your rules, and keep your trading logic organized in one place.",
      icon: Brain,
    },
    {
      title: "Backtest With Confidence",
      description:
        "Run historical simulations quickly, compare outcomes, and learn what actually holds up.",
      icon: ChartCandlestick,
    },
    {
      title: "Structured Strategy Logic",
      description:
        "Turn rule-based strategy logic into clearer, more testable trading decisions with less guesswork.",
      icon: Sparkles,
    },
    {
      title: "Thousands Of Strategies",
      description:
        "Explore a large strategy library, study ideas faster, and keep strong setups within easy reach.",
      icon: BookMarked,
    },
    {
      title: "Secure By Default",
      description:
        "Strong account controls and verification flows designed for real users.",
      icon: ShieldCheck,
    },
    {
      title: "Built For Momentum",
      description:
        "Spend less time switching tools and more time building, testing, and refining stronger strategy systems.",
      icon: Zap,
    },
  ];

  const faq = [
    {
      q: "Is Query Trade beginner-friendly?",
      a: "Yes. It is designed to help you move from simple trading ideas to structured strategy testing without feeling overwhelmed.",
    },
    {
      q: "Can I explore lots of strategies in the app?",
      a: "Yes. You can browse thousands of strategy ideas and also build your own setups from scratch.",
    },
    {
      q: "Can I go from idea to backtest in the app?",
      a: "Yes. Query Trade is built to help you go from strategy ideas to structured creation and backtesting in one workflow.",
    },
  ];

  useEffect(() => {
    const revealItems = Array.from(
      document.querySelectorAll<HTMLElement>(".home-reveal-up"),
    );

    if (!revealItems.length) return;

    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    revealItems.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div className="-m-6 bg-background">
      <section className="relative mx-auto max-w-7xl px-6 pt-20 pb-10 md:px-8 lg:px-12">
        <div className="home-reveal-up">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-muted px-4 py-1.5 text-sm font-medium text-foreground">
            <CandlestickChart className="h-4 w-4" />
            Free Crypto Trading Workspace
          </div>

          <h1 className="mt-6 max-w-4xl text-4xl leading-tight font-black tracking-tight text-balance md:text-6xl lg:text-7xl">
            Explore thousands of strategies, build your own, and backtest fast.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Query Trade is a free crypto trading app where you can discover
            strategy ideas, create your own setup, and validate it with
            backtests before making your next move.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to={primaryHref}>
              <Button className="cursor-pointer">
                {primaryLabel}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link to={heroSecondaryHref}>
              <Button variant="outline" className="cursor-pointer">
                {heroSecondaryLabel}
              </Button>
            </Link>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {stats.map((item, index) => (
              <div
                key={item.label}
                className="home-reveal-up rounded-xl border bg-card p-5 transition-transform duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${180 + index * 100}ms` }}
              >
                <p className="text-xs text-muted-foreground uppercase">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-6 py-10 md:px-8 lg:px-12">
        <div className="home-reveal-up mb-6 flex items-center gap-2 text-sm font-semibold text-primary">
          <Workflow className="h-4 w-4" />
          Built To Convert Ideas Into Results
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ title, description, icon: Icon }, index) => (
            <article
              key={title}
              className="home-reveal-up group rounded-xl border bg-card p-6 transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${120 + index * 90}ms` }}
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-6 md:px-8 lg:px-12">
        <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-3">
          <div
            className="home-reveal-up rounded-xl border bg-muted/30 p-4 transition-transform duration-300 hover:-translate-y-1"
            style={{ animationDelay: "80ms" }}
          >
            <p className="text-xs text-muted-foreground uppercase">
              Risk-first Thinking
            </p>
            <p className="mt-1 text-sm font-medium">
              Build trading systems around downside control, not hype.
            </p>
          </div>
          <div
            className="home-reveal-up rounded-xl border bg-muted/30 p-4 transition-transform duration-300 hover:-translate-y-1"
            style={{ animationDelay: "180ms" }}
          >
            <p className="text-xs text-muted-foreground uppercase">
              Fast Iteration
            </p>
            <p className="mt-1 text-sm font-medium">
              Validate assumptions quickly and tighten weak strategy logic.
            </p>
          </div>
          <div
            className="home-reveal-up rounded-xl border bg-muted/30 p-4 transition-transform duration-300 hover:-translate-y-1"
            style={{ animationDelay: "280ms" }}
          >
            <p className="text-xs text-muted-foreground uppercase">
              Long-term Edge
            </p>
            <p className="mt-1 text-sm font-medium">
              Turn repeatable research into disciplined backtesting quality.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 md:px-8 lg:px-12">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="home-reveal-up rounded-xl border bg-card p-6 transition-transform duration-300 hover:-translate-y-1">
            <Clock3 className="h-5 w-5 text-primary" />
            <h3 className="mt-3 text-lg font-semibold">1. Discover Or Build</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Explore thousands of strategies or create your own with clear
              structure and logic.
            </p>
          </div>

          <div
            className="home-reveal-up rounded-xl border bg-card p-6 transition-transform duration-300 hover:-translate-y-1"
            style={{ animationDelay: "100ms" }}
          >
            <ChartCandlestick className="h-5 w-5 text-primary" />
            <h3 className="mt-3 text-lg font-semibold">2. Backtest</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Validate historical behavior and identify weak assumptions before
              moving forward.
            </p>
          </div>

          <div
            className="home-reveal-up rounded-xl border bg-card p-6 transition-transform duration-300 hover:-translate-y-1"
            style={{ animationDelay: "200ms" }}
          >
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="mt-3 text-lg font-semibold">3. Refine And Repeat</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Use what you learn from each backtest to improve entries, exits,
              and risk logic.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 md:px-8 lg:px-12">
        <div className="home-reveal-up rounded-xl border bg-card p-6 md:p-8">
          <h2 className="text-2xl font-black tracking-tight md:text-3xl">
            Frequently Asked Questions
          </h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {faq.map((item, index) => (
              <article
                key={item.q}
                className="home-reveal-up rounded-xl border bg-muted/30 p-5 transition-transform duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${120 + index * 100}ms` }}
              >
                <h3 className="text-sm leading-relaxed font-semibold">
                  {item.q}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pt-8 pb-20 md:px-8 lg:px-12">
        <div className="home-reveal-up rounded-xl border bg-card p-8 md:p-12">
          <h2 className="max-w-2xl text-3xl font-black tracking-tight md:text-4xl">
            {footerTitle}
          </h2>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground md:text-base">
            {footerDescription}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to={primaryHref}>
              <Button className="cursor-pointer">
                {primaryLabel}
              </Button>
            </Link>
            {isAuthenticated ? (
              <Link to="/backtest">
                <Button variant="outline" className="cursor-pointer">
                  Open Backtesting
                  <FlaskConical className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button variant="outline" className="cursor-pointer">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-7xl px-6 pb-10 text-sm text-foreground md:px-8 lg:px-12">
        <div className="py-2 md:flex md:items-center md:justify-between">
          <p>
            Copyright {copyrightYear}{" "}
            <Link
              to="/"
              className="font-medium text-primary transition-colors hover:text-primary/80"
              onClick={(event) => {
                event.preventDefault();
                scrollToTop();
              }}
            >
              {APP_NAME}
            </Link>
            . All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
