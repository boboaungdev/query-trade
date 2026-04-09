import * as React from "react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

function ButtonGroup({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical"
}) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(
        "inline-flex items-stretch",
        orientation === "vertical" ? "flex-col" : "flex-row",
        className
      )}
      {...props}
    />
  )
}

function ButtonGroupSeparator({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical"
}) {
  return (
    <div
      data-slot="button-group-separator"
      data-orientation={orientation}
      className={cn(
        "shrink-0 bg-border/70",
        orientation === "vertical" ? "w-px self-stretch" : "h-px w-full",
        className
      )}
      {...props}
    />
  )
}

function ButtonGroupText({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & {
  asChild?: boolean
}) {
  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      data-slot="button-group-text"
      className={cn(
        "inline-flex min-h-8 items-center justify-center rounded-[min(var(--radius-lg),14px)] border border-border/70 bg-surface px-3 text-sm text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText }
