import { useMemo, useState } from "react"
import { Navigate } from "react-router-dom"
import { toast } from "sonner"

import {
  checkChangeEmail,
  createPassword,
  verifyChangeEmail,
} from "@/api/auth"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useAuthStore } from "@/store/auth"
import { cn } from "@/lib/utils"
import { sections } from "./config"
import {
  AccountSection,
  ApiSection,
  AppearanceSection,
  NotificationsSection,
  TradingSection,
  WorkspaceSection,
} from "./sections"

export default function Settings() {
  const user = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)
  const [activeSection, setActiveSection] = useState(sections[0].id)
  const [emailChangeStep, setEmailChangeStep] = useState<
    "idle" | "draft" | "verify"
  >("idle")
  const [emailChangePassword, setEmailChangePassword] = useState("")
  const [emailDraft, setEmailDraft] = useState("")
  const [newEmailCode, setNewEmailCode] = useState("")
  const [isCheckingChangeEmail, setIsCheckingChangeEmail] = useState(false)
  const [isSavingEmailChange, setIsSavingEmailChange] = useState(false)
  const [accountSecuritySettings, setAccountSecuritySettings] = useState({
    emailVisibility: "Only me",
    verificationMethod: "Authenticator app",
    sessionTimeout: "30 minutes",
    deviceApproval: "Ask every login",
  })
  const [notificationSettings, setNotificationSettings] = useState({
    priceAlerts: true,
    weeklyDigest: true,
    productNews: false,
    securityAlerts: true,
  })
  const [appearanceSettings, setAppearanceSettings] = useState({
    compactMode: false,
    stickySidebar: true,
    reducedMotion: false,
  })
  const [tradingSettings, setTradingSettings] = useState({
    confirmOrders: true,
    autosaveBacktests: true,
    riskWarnings: true,
  })
  const [workspaceSettings, setWorkspaceSettings] = useState({
    sharedLayouts: true,
    autoExportReports: false,
    activitySummary: true,
  })

  const currentSection = useMemo(
    () =>
      sections.find((section) => section.id === activeSection) ?? sections[0],
    [activeSection]
  )

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  const cancelEmailChange = () => {
    setEmailChangeStep("idle")
    setEmailChangePassword("")
    setEmailDraft("")
    setNewEmailCode("")
  }

  const verifyEmailChange = () => {
    const nextEmail = emailDraft.trim().toLowerCase()

    if (
      !nextEmail ||
      nextEmail === user.email.toLowerCase() ||
      emailChangePassword.length < 6 ||
      emailChangePassword.length > 50
    ) {
      return
    }

    setIsCheckingChangeEmail(true)
    const promise = checkChangeEmail({
      newEmail: nextEmail,
      password: emailChangePassword,
    })

    toast.promise(promise, {
      loading: "Verifying...",
      success: (data) => {
        setEmailDraft(nextEmail)
        setEmailChangeStep("verify")
        return data.message || "Email available."
      },
      error: (error: unknown) =>
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response!
              .data!.message!
          : "Failed to check email.",
    })

    promise.finally(() => setIsCheckingChangeEmail(false))
  }

  const saveEmailChange = () => {
    const nextEmail = emailDraft.trim()

    if (!nextEmail || nextEmail === user.email || !newEmailCode.trim()) {
      return
    }

    setIsSavingEmailChange(true)

    const promise = verifyChangeEmail({
      newEmail: nextEmail,
      newEmailCode: newEmailCode,
    })

    toast.promise(promise, {
      loading: "Changing email...",
      success: (data) => {
        updateUser({ email: nextEmail })
        setEmailDraft("")
        setNewEmailCode("")
        setEmailChangeStep("idle")
        return data.message || "Email changed."
      },
      error: (error: unknown) =>
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response!
              .data!.message!
          : "Failed to change email.",
    })

    promise.finally(() => setIsSavingEmailChange(false))
  }

  const handlePasswordAction = async (password: string) => {
    if (user.authProviders.some((provider) => provider.provider === "server")) {
      return
    }

    const data = await createPassword({ password })

    if (data?.result?.user) {
      updateUser(data.result.user)
      return
    }

    updateUser({
      passwordChangedAt: new Date().toISOString(),
      authProviders: [
        ...user.authProviders,
        {
          provider: "server",
          providerId: user._id,
        },
      ],
    })
  }

  const handleGoogleProviderAction = () => {
    const hasGoogleProvider = user.authProviders.some(
      (provider) => provider.provider === "google"
    )

    if (hasGoogleProvider) {
      updateUser({
        authProviders: user.authProviders.filter(
          (provider) => provider.provider !== "google"
        ),
      })
      return
    }

    updateUser({
      authProviders: [
        ...user.authProviders,
        {
          provider: "google",
          providerId: `google-${user._id}`,
        },
      ],
    })
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="max-w-2xl text-muted-foreground">
          Organize account controls, app behavior, and trading defaults in one
          place. Use the section picker to jump between groups without leaving
          the page.
        </p>
      </div>

      <Card className="overflow-visible">
        <CardContent className="grid gap-6 px-3 py-3 sm:px-4 sm:py-4 lg:grid-cols-[260px_1fr]">
          <div className="space-y-4">
            <div className="space-y-2 lg:hidden">
              <Label>Settings Category</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {sections.map((section) => {
                  const Icon = section.icon
                  const isActive = section.id === activeSection

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        "flex min-w-0 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-center text-sm font-medium transition-colors",
                        isActive
                          ? "border-primary/35 bg-primary text-primary-foreground shadow-sm"
                          : "border-border/70 bg-background hover:border-primary/20 hover:bg-primary/[0.06]"
                      )}
                    >
                      <Icon className="size-4" />
                      <span className="leading-tight">{section.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="hidden space-y-2 lg:block">
              {sections.map((section) => {
                const Icon = section.icon
                const isActive = section.id === activeSection

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                      isActive
                        ? "border-primary/40 bg-primary/8"
                        : "border-transparent bg-muted/40 hover:border-border hover:bg-muted/80"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 rounded-lg p-2",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-background"
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="space-y-1">
                      <span className="block font-medium">{section.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {section.description}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-4">
            <Card className="border border-border/70 shadow-none">
              <CardHeader className="px-4 pb-0 sm:px-6">
                <div className="flex items-start gap-3">
                  <span className="rounded-xl bg-muted p-2">
                    <currentSection.icon className="size-5" />
                  </span>
                  <div className="space-y-1">
                    <CardTitle>{currentSection.label}</CardTitle>
                    <CardDescription>
                      {currentSection.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 px-4 pt-6 sm:px-6">
                {activeSection === "account" && (
                  <AccountSection
                    emailChangeStep={emailChangeStep}
                    emailChangePassword={emailChangePassword}
                    emailDraft={emailDraft}
                    setEmailDraft={setEmailDraft}
                    setEmailChangePassword={setEmailChangePassword}
                    newEmailCode={newEmailCode}
                    setNewEmailCode={setNewEmailCode}
                    setEmailChangeStep={setEmailChangeStep}
                    accountSecuritySettings={accountSecuritySettings}
                    setAccountSecuritySettings={setAccountSecuritySettings}
                    verifyEmailChange={verifyEmailChange}
                    saveEmailChange={saveEmailChange}
                    cancelEmailChange={cancelEmailChange}
                    isCheckingChangeEmail={isCheckingChangeEmail}
                    isSavingEmailChange={isSavingEmailChange}
                    handlePasswordAction={handlePasswordAction}
                    handleGoogleProviderAction={handleGoogleProviderAction}
                  />
                )}

                {activeSection === "notifications" && (
                  <NotificationsSection
                    notificationSettings={notificationSettings}
                    setNotificationSettings={setNotificationSettings}
                  />
                )}

                {activeSection === "appearance" && (
                  <AppearanceSection
                    appearanceSettings={appearanceSettings}
                    setAppearanceSettings={setAppearanceSettings}
                  />
                )}

                {activeSection === "api" && <ApiSection />}

                {activeSection === "trading" && (
                  <TradingSection
                    tradingSettings={tradingSettings}
                    setTradingSettings={setTradingSettings}
                  />
                )}

                {activeSection === "workspace" && (
                  <WorkspaceSection
                    workspaceSettings={workspaceSettings}
                    setWorkspaceSettings={setWorkspaceSettings}
                  />
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border/80 bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Changes are local for now</p>
                <p className="text-sm text-muted-foreground">
                  This page is ready for real API wiring when you decide how
                  each settings group should persist.
                </p>
              </div>
              <div className="grid w-full gap-2 sm:flex sm:w-auto">
                <Button variant="ghost" className="w-full sm:w-auto">
                  Reset
                </Button>
                <Button className="w-full sm:w-auto">Save Preferences</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
