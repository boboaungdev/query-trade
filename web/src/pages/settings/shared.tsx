import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type ToggleRowProps = {
  label: string
  description: string
  enabled: boolean
  onToggle: () => void
}

type MenuPreferenceRowProps = {
  label: string
  description: string
  value: string
  options: string[]
  onChange: (value: string) => void
}

export function ToggleRow({
  label,
  description,
  enabled,
  onToggle,
}: ToggleRowProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/70 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <button
        type="button"
        aria-pressed={enabled}
        onClick={onToggle}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 self-end rounded-full border transition-colors sm:mt-0.5 sm:self-auto",
          enabled
            ? "border-primary bg-primary"
            : "border-border bg-muted text-muted-foreground"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-background shadow-sm transition-transform",
            enabled ? "translate-x-6" : "translate-x-0.5"
          )}
        />
        <span className="sr-only">{label}</span>
      </button>
    </div>
  )
}

export function MenuPreferenceRow({
  label,
  description,
  value,
  options,
  onChange,
}: MenuPreferenceRowProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-primary/15 bg-linear-to-br from-primary/[0.07] via-background to-background p-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="w-full md:w-auto md:min-w-[210px]">
        <div className="relative md:hidden">
          <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-11 w-full appearance-none rounded-xl border border-primary/20 bg-background/90 px-4 pr-10 text-sm font-medium text-foreground shadow-sm outline-none transition-colors focus-visible:border-primary/40 focus-visible:ring-3 focus-visible:ring-primary/15"
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-3.5 right-3 size-4 text-muted-foreground" />
        </div>

        <div className="hidden md:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-11 min-w-[210px] justify-between rounded-xl border-primary/20 bg-background/90 px-4 text-left text-foreground shadow-sm hover:border-primary/35 hover:bg-primary/8 aria-expanded:border-primary/40 aria-expanded:bg-primary/10"
              >
                <span className="truncate">{value}</span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-2xl border border-primary/20 bg-background/95 p-2 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm">
              <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
                {options.map((option) => (
                  <DropdownMenuRadioItem
                    key={option}
                    value={option}
                    className="rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/85 transition-colors focus:bg-primary/10 focus:text-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:shadow-sm [&_[data-slot=dropdown-menu-radio-item-indicator]]:text-current"
                  >
                    {option}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
