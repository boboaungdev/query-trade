import { useState, type ComponentProps, type ReactNode } from "react"
import { CircleHelp } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type TooltipSide = ComponentProps<typeof TooltipContent>["side"]

type HelpTooltipProps = {
  content: ReactNode
  label: string
  buttonClassName?: string
  contentClassName?: string
  iconClassName?: string
  side?: TooltipSide
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
  const [open, setOpen] = useState(false)

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex cursor-help items-center text-muted-foreground hover:text-foreground",
              buttonClassName
            )}
            aria-label={`${label} help`}
            aria-pressed={open}
            onClick={() => setOpen((current) => !current)}
          >
            <CircleHelp className={cn("h-3.5 w-3.5", iconClassName)} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          sideOffset={sideOffset}
          className={contentClassName}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
