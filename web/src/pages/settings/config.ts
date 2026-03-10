import {
  Palette,
  ShieldCheck,
  UserRound,
} from "lucide-react"

export type SettingsSectionId =
  | "account"
  | "notifications"
  | "appearance"
  | "api"
  | "trading"
  | "workspace"

export type SettingsSection = {
  id: SettingsSectionId
  label: string
  description: string
  icon: typeof UserRound
}

export const sections: SettingsSection[] = [
  {
    id: "account",
    label: "Account & Security",
    description: "Identity, login methods, and session protection.",
    icon: ShieldCheck,
  },
  // {
  //   id: "notifications",
  //   label: "Notifications",
  //   description: "Control market alerts, reports, and product updates.",
  //   icon: Bell,
  // },
  {
    id: "appearance",
    label: "Appearance",
    description: "Theme, density, and interface behavior.",
    icon: Palette,
  },
  // {
  //   id: "api",
  //   label: "API Management",
  //   description: "Keys, webhooks, and integration access.",
  //   icon: KeyRound,
  // },
  // {
  //   id: "trading",
  //   label: "Trading Preferences",
  //   description: "Defaults used across backtests and live workflows.",
  //   icon: SlidersHorizontal,
  // },
  // {
  //   id: "workspace",
  //   label: "Workspace",
  //   description: "Team defaults, exports, and saved layout behavior.",
  //   icon: LayoutGrid,
  // },
]
