import { APP_NAME } from "@/lib/constants";

export type HomeFaqItem = {
  question: string;
  answer: string;
};

export const homeFaqItems: HomeFaqItem[] = [
  {
    question: `What can I do inside ${APP_NAME}?`,
    answer:
      "You can build strategies, run backtests, explore leaderboard results, save ideas, manage your wallet, and upgrade your plan in one connected app.",
  },
  {
    question: `Is ${APP_NAME} free to use?`,
    answer: `Yes. ${APP_NAME} includes a free experience. Paid tiers unlock more backtesting flexibility, advanced controls, and broader access.`,
  },
  {
    question: "Do I need a subscription to run backtests?",
    answer: `No. ${APP_NAME} supports a free backtesting workflow, while higher plans unlock more access, settings, and fewer restrictions.`,
  },
  {
    question: "What is the difference between Free, Plus, and Pro?",
    answer:
      "The plans change how much flexibility you get. Higher tiers expand timeframes, backtest ranges, capital settings, and strategy access.",
  },
  {
    question: "Do I need to code my strategy?",
    answer: `No. ${APP_NAME} is designed so you can shape indicators, logic, and risk settings through a guided interface.`,
  },
  {
    question: "Can I use any strategy in a backtest?",
    answer:
      "It depends on your plan and the strategy itself. Lower tiers may be limited to public strategies, while higher access opens more flexibility.",
  },
  {
    question: "Can I save or revisit strategies and backtests?",
    answer: `Yes. ${APP_NAME} includes bookmarks and saved results so you can return to strategies and backtests easily.`,
  },
  {
    question: "How do wallet deposits and subscriptions work?",
    answer:
      "You can deposit into your wallet, hold token balance in the app, and use it for subscriptions and connected features.",
  },
  {
    question: "What is the leaderboard for?",
    answer:
      "The leaderboard helps you explore saved backtest results, compare performance, and see what other traders are testing.",
  },
  {
    question: "Can I earn by building strategies?",
    answer: `Yes. ${APP_NAME} includes creator-style reward flows tied to strategy activity, so building and sharing strategies can become part of how you earn in the app.`,
  },
];
