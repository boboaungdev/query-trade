import { SlidersHorizontal } from "lucide-react";

import ThemeToggle from "@/components/ThemeToggle";

export function PreferencesSection() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-5">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-muted p-2.5 text-foreground">
          <SlidersHorizontal className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold">Preferences</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Customize how the app looks and feels.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-medium">Theme</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Switch quickly between light and dark mode.
          </p>
        </div>
        <ThemeToggle />
      </div>
    </div>
  );
}
