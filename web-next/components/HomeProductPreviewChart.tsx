"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const productPreviewEquity = [
  { month: "Jan", equity: 10200 },
  { month: "Feb", equity: 10820 },
  { month: "Mar", equity: 10640 },
  { month: "Apr", equity: 11380 },
  { month: "May", equity: 11860 },
  { month: "Jun", equity: 12420 },
];

const productPreviewChartConfig = {
  equity: {
    label: "Equity",
    color: "var(--color-primary)",
  },
} satisfies ChartConfig;

export default function HomeProductPreviewChart() {
  return (
    <ChartContainer
      config={productPreviewChartConfig}
      className="mt-4 h-36 w-full"
    >
      <LineChart
        accessibilityLayer
        data={productPreviewEquity}
        margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={42}
          tickFormatter={(value) => `${value / 1000}k`}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="line"
              formatter={(value) => [
                `$${Number(value).toLocaleString()}`,
                "Equity",
              ]}
            />
          }
        />
        <Line
          dataKey="equity"
          type="monotone"
          stroke="var(--color-equity)"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
