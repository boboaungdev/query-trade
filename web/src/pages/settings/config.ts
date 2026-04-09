import { Palette, ShieldCheck, UserRound } from "lucide-react"

export type SettingsSectionId = "account" | "appearance"

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
  {
    id: "appearance",
    label: "Appearance",
    description: "Theme and display preferences.",
    icon: Palette,
  },
]
