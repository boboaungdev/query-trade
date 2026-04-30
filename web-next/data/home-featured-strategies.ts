export type HomeFeaturedStrategyItem = {
  name: string;
  creator: string;
  symbol: string;
  timeframe: string;
  roi: string;
  description: string;
  access: "Free" | "Plus" | "Pro";
};

export const homeFeaturedStrategies: HomeFeaturedStrategyItem[] = [
  {
    name: "Momentum Breakout Stack",
    creator: "@avatrades",
    symbol: "BTCUSDT",
    timeframe: "4H",
    roi: "+18.4%",
    description:
      "Built for trend continuation with clean breakout confirmation and tight risk structure.",
    access: "Pro",
  },
  {
    name: "Mean Reversion Window",
    creator: "@chartnoah",
    symbol: "ETHUSDT",
    timeframe: "1H",
    roi: "+11.2%",
    description:
      "Looks for stretched moves and fades them back toward a more stable price range.",
    access: "Plus",
  },
  {
    name: "Session Bias Setup",
    creator: "@miatests",
    symbol: "SOLUSDT",
    timeframe: "15M",
    roi: "+7.9%",
    description:
      "Designed around intraday direction shifts with clearer entry structure and timing.",
    access: "Free",
  },
  {
    name: "Structure Pullback Flow",
    creator: "@ethanlogic",
    symbol: "BNBUSDT",
    timeframe: "1D",
    roi: "+24.1%",
    description:
      "Focuses on patient pullback entries inside strong higher-timeframe directional moves.",
    access: "Pro",
  },
];
