import ThemeToggle from "@/components/ThemeToggle"
export function AppearanceSection() {
  return (
    <div className="rounded-xl border border-border/70 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-medium">Theme</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Switch quickly between light and dark mode.
          </p>
        </div>
        <ThemeToggle />
      </div>
    </div>
  )
}
