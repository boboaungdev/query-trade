import * as React from "react"
import { DayPicker } from "react-day-picker"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-2.5", className)}
      classNames={{
        months: "flex flex-col gap-3 sm:flex-row sm:gap-4",
        month: "flex flex-col gap-3",
        caption: "relative flex h-8 items-center justify-center",
        caption_label:
          "pointer-events-none absolute inset-x-10 top-0 text-center leading-8 text-sm font-semibold",
        nav: "absolute inset-x-0 top-0 flex h-8 items-center justify-between",
        button_previous: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "absolute top-0 left-1 h-8 w-8 rounded-md p-0"
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "absolute top-0 right-1 h-8 w-8 rounded-md p-0"
        ),
        month_grid: "mt-3 w-full border-collapse",
        weekdays: "flex",
        weekday: "w-8 text-[0.72rem] font-medium text-muted-foreground",
        week: "mt-1 flex w-full",
        day: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "h-8 w-8 rounded-md p-0 font-normal aria-selected:opacity-100"
        ),
        day_button: "h-8 w-8 rounded-md p-0",
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: iconClassName, ...iconProps }) =>
          orientation === "left" ? (
            <ChevronLeftIcon
              className={cn("size-4", iconClassName)}
              {...iconProps}
            />
          ) : (
            <ChevronRightIcon
              className={cn("size-4", iconClassName)}
              {...iconProps}
            />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
