import type { ReactNode } from "react"

type HelpTooltipProps = {
  content: ReactNode
  label: string
  buttonClassName?: string
  contentClassName?: string
  iconClassName?: string
  side?: string
  sideOffset?: number
}

export function HelpTooltip({
  content,
  label,
  buttonClassName,
  contentClassName,
  iconClassName,
  side = "top",
  sideOffset = 6,
}: HelpTooltipProps) {
  void content
  void label
  void buttonClassName
  void contentClassName
  void iconClassName
  void side
  void sideOffset
  return null
}
