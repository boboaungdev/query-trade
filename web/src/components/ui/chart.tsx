import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    color?: string
  }
>

function ChartContainer({
  className,
  config,
  children,
}: React.ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ReactElement
}) {
  const style = Object.entries(config).reduce<
    React.CSSProperties & Record<string, string>
  >(
    (acc, [key, value]) => {
      if (value.color) {
        acc[`--color-${key}`] = value.color
      }
      return acc
    },
    {} as React.CSSProperties & Record<string, string>
  )

  return (
    <div
      data-slot="chart"
      className={cn("h-[320px] w-full", className)}
      style={style}
    >
      <RechartsPrimitive.ResponsiveContainer>
        {children}
      </RechartsPrimitive.ResponsiveContainer>
    </div>
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
}: {
  active?: boolean
  payload?: Array<{
    dataKey?: string
    value?: number | string
    color?: string
    name?: string
  }>
  label?: string | number
  labelFormatter?: (label: string | number) => React.ReactNode
  valueFormatter?: (item: {
    dataKey?: string
    value?: number | string
    color?: string
    name?: string
  }) => React.ReactNode
}) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="min-w-[140px] rounded-lg border border-border/70 bg-background px-2.5 py-2 text-xs shadow-sm">
      <div className="mb-1 font-medium text-foreground">
        {labelFormatter ? labelFormatter(label ?? "") : label}
      </div>
      {payload.map((item, index) => (
        <div
          key={`${item.dataKey ?? "item"}-${index}`}
          className="flex items-center justify-between gap-2 text-muted-foreground"
        >
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.name || item.dataKey}
          </span>
          <span className="font-medium text-foreground">
            {valueFormatter ? valueFormatter(item) : item.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export { ChartContainer, ChartTooltip, ChartTooltipContent }
