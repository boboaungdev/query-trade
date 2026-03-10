import ThemeToggle from "@/components/ThemeToggle"
import { ToggleRow } from "../shared"

type AppearanceSettings = {
  compactMode: boolean
  stickySidebar: boolean
  reducedMotion: boolean
}

type AppearanceSectionProps = {
  appearanceSettings: AppearanceSettings
  setAppearanceSettings: (
    updater: (prev: AppearanceSettings) => AppearanceSettings
  ) => void
}

export function AppearanceSection({
  appearanceSettings,
  setAppearanceSettings,
}: AppearanceSectionProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/70 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Theme</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Switch quickly between light and dark mode.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="space-y-4">
        <ToggleRow
          label="Compact Mode"
          description="Reduce spacing in lists, cards, and side panels."
          enabled={appearanceSettings.compactMode}
          onToggle={() =>
            setAppearanceSettings((prev) => ({
              ...prev,
              compactMode: !prev.compactMode,
            }))
          }
        />
        <ToggleRow
          label="Sticky Sidebar"
          description="Keep primary navigation pinned while moving through views."
          enabled={appearanceSettings.stickySidebar}
          onToggle={() =>
            setAppearanceSettings((prev) => ({
              ...prev,
              stickySidebar: !prev.stickySidebar,
            }))
          }
        />
        <ToggleRow
          label="Reduced Motion"
          description="Minimize interface animation for a calmer experience."
          enabled={appearanceSettings.reducedMotion}
          onToggle={() =>
            setAppearanceSettings((prev) => ({
              ...prev,
              reducedMotion: !prev.reducedMotion,
            }))
          }
        />
      </div>
    </div>
  )
}
