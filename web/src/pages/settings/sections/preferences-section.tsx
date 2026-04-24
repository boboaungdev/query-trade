import { BadgeDollarSign, MoonStar, SlidersHorizontal } from "lucide-react";

import { useTheme } from "@/components/theme-provider";
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "@/store/auth";

export function PreferencesSection() {
  const { theme, setTheme } = useTheme();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const hideWalletBalance = Boolean(user?.preferences?.hideWalletBalance);
  const isDarkMode = theme === "dark";

  return (
    <section className="rounded-xl bg-card p-4 shadow-sm md:p-5">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-muted p-2.5 text-foreground">
          <SlidersHorizontal className="size-4" />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="font-semibold">Preferences</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Customize how the app looks and feels.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="rounded-xl bg-muted/30 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-muted p-2.5 text-foreground">
                <MoonStar className="size-4" />
              </span>
              <div className="space-y-1">
                <p className="font-medium">Dark mode</p>
                <p className="text-sm text-muted-foreground">
                  Turn dark mode on or off.
                </p>
              </div>
            </div>
            <Switch
              checked={isDarkMode}
              onCheckedChange={(checked) =>
                setTheme(checked ? "dark" : "light")
              }
              aria-label="Toggle dark mode"
            />
          </div>
        </div>

        <div className="rounded-xl bg-muted/30 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-muted p-2.5 text-foreground">
                <BadgeDollarSign className="size-4" />
              </span>
              <div className="space-y-1">
                <p className="font-medium">Hide wallet balance</p>
                <p className="text-sm text-muted-foreground">
                  Use this as the default visibility when you open the wallet
                  page.
                </p>
              </div>
            </div>
            <Switch
              checked={hideWalletBalance}
              onCheckedChange={(checked) =>
                updateUser({
                  preferences: {
                    ...user?.preferences,
                    hideWalletBalance: checked,
                  },
                })
              }
              aria-label="Toggle wallet balance visibility default"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
