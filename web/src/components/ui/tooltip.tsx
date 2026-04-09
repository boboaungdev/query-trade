"use client"

import * as React from "react"

function TooltipProvider({
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="tooltip-provider" {...props}>
      {children}
    </div>
  )
}

function Tooltip({
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="tooltip" {...props}>
      {children}
    </div>
  )
}

function TooltipTrigger({
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }) {
  return (
    <div data-slot="tooltip-trigger" {...props}>
      {children}
    </div>
  )
}

function TooltipContent({
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  void children
  return <div data-slot="tooltip-content" hidden {...props} />
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
