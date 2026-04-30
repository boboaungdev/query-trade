import type { UserMembership } from "@/components/user-membership";

export type HomeReviewItem = {
  name: string;
  username: string;
  initials: string;
  avatarUrl: string;
  review: string;
  membership?: UserMembership;
};

export const homeReviewItems: HomeReviewItem[] = [
  {
    name: "Ava Chen",
    username: "avatrades",
    initials: "AC",
    avatarUrl: "https://i.pravatar.cc/160?img=32",
    review:
      "The strategy flow feels clean. I can build an idea, test it, and come back to it later without losing context.",
    membership: {
      verifiedVariant: "pro",
      badgeLabel: "Pro",
      title: "Pro membership",
    },
  },
  {
    name: "Noah Patel",
    username: "chartnoah",
    initials: "NP",
    avatarUrl: "https://i.pravatar.cc/160?img=12",
    review:
      "Backtesting is much easier here than juggling separate tools. The setup stays readable even when the rules get more detailed.",
    membership: {
      verifiedVariant: "plus",
      badgeLabel: "Plus",
      title: "Plus membership",
    },
  },
  {
    name: "Mia Torres",
    username: "miatests",
    initials: "MT",
    avatarUrl: "https://i.pravatar.cc/160?img=47",
    review:
      "I like that wallet, pricing, and strategy work feel connected. It makes the product feel like one system instead of many screens.",
  },
  {
    name: "Ethan Park",
    username: "ethanlogic",
    initials: "EP",
    avatarUrl: "https://i.pravatar.cc/160?img=15",
    review:
      "The app makes it easier to review ideas before acting on them. That alone helps me stay more disciplined.",
    membership: {
      verifiedVariant: "pro",
      badgeLabel: "Pro",
      title: "Pro membership",
    },
  },
  {
    name: "Sofia Nguyen",
    username: "sofiasetups",
    initials: "SN",
    avatarUrl: "https://i.pravatar.cc/160?img=44",
    review:
      "I can move from idea to test results quickly, and the saved flows make it easy to keep refining the same strategy.",
    membership: {
      verifiedVariant: "plus",
      badgeLabel: "Plus",
      title: "Plus membership",
    },
  },
  {
    name: "Lucas Reed",
    username: "lucasbacktests",
    initials: "LR",
    avatarUrl: "https://i.pravatar.cc/160?img=14",
    review:
      "The leaderboard is a nice touch. It gives me more context on what other traders are testing without making the app feel noisy.",
  },
  {
    name: "Emma Diaz",
    username: "emmarules",
    initials: "ED",
    avatarUrl: "https://i.pravatar.cc/160?img=25",
    review:
      "This feels built for iteration. I can adjust a rule, rerun the setup, and keep improving without starting over mentally.",
    membership: {
      verifiedVariant: "pro",
      badgeLabel: "Pro",
      title: "Pro membership",
    },
  },
  {
    name: "Liam Brooks",
    username: "librooks",
    initials: "LB",
    avatarUrl: "https://i.pravatar.cc/160?img=11",
    review:
      "The product direction is strong. It explains enough for new users but still feels useful for people who already trade seriously.",
  },
  {
    name: "Harper Kim",
    username: "harperedge",
    initials: "HK",
    avatarUrl: "https://i.pravatar.cc/160?img=36",
    review:
      "I mainly use it to pressure-test setups across timeframes. The workflow helps me focus on structure instead of guessing.",
    membership: {
      verifiedVariant: "plus",
      badgeLabel: "Plus",
      title: "Plus membership",
    },
  },
  {
    name: "James Walker",
    username: "walkeralpha",
    initials: "JW",
    avatarUrl: "https://i.pravatar.cc/160?img=18",
    review:
      "The creator reward angle is interesting. It gives strategy work a stronger sense of progression inside the app.",
    membership: {
      verifiedVariant: "pro",
      badgeLabel: "Pro",
      title: "Pro membership",
    },
  },
];
