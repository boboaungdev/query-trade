import { useEffect, useState } from "react"
import {
  CheckCircle2,
  CircleHelp,
  Clock3,
  LockKeyhole,
  Mail,
  Smartphone,
} from "lucide-react"
import { FcGoogle } from "react-icons/fc"
import { toast } from "sonner"

import {
  changePassword,
  forgotPassword,
  verifyChangePassword,
} from "@/api/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAuthStore } from "@/store/auth"
import { cn } from "@/lib/utils"
import { MenuPreferenceRow } from "../shared"

type AccountSecuritySettings = {
  emailVisibility: string
  verificationMethod: string
  sessionTimeout: string
  deviceApproval: string
}

type AccountSectionProps = {
  emailChangeStep: "idle" | "draft" | "verify"
  emailChangePassword: string
  emailDraft: string
  newEmailCode: string
  setEmailChangePassword: (value: string) => void
  setEmailDraft: (value: string) => void
  setNewEmailCode: (value: string) => void
  setEmailChangeStep: (value: "idle" | "draft" | "verify") => void
  accountSecuritySettings: AccountSecuritySettings
  setAccountSecuritySettings: (
    updater: (prev: AccountSecuritySettings) => AccountSecuritySettings
  ) => void
  verifyEmailChange: () => void
  saveEmailChange: () => void
  cancelEmailChange: () => void
  isCheckingChangeEmail: boolean
  isSavingEmailChange: boolean
  handlePasswordAction: (password: string) => Promise<void>
  handleGoogleProviderAction: () => void
}

export function AccountSection({
  emailChangeStep,
  emailChangePassword,
  emailDraft,
  newEmailCode,
  setEmailChangePassword,
  setEmailDraft,
  setNewEmailCode,
  setEmailChangeStep,
  accountSecuritySettings,
  setAccountSecuritySettings,
  verifyEmailChange,
  saveEmailChange,
  cancelEmailChange,
  isCheckingChangeEmail,
  isSavingEmailChange,
  handlePasswordAction,
  handleGoogleProviderAction,
}: AccountSectionProps) {
  const user = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)
  const isEmailChangeBusy = isCheckingChangeEmail || isSavingEmailChange
  const isEmailLocked = emailChangeStep === "verify"
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false)
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [passwordResetCode, setPasswordResetCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false)
  const [passwordResendTimer, setPasswordResendTimer] = useState(0)
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now())

  const normalizedEmailDraft = emailDraft.trim().toLowerCase()
  const isValidEmailDraft = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    normalizedEmailDraft
  )
  const showEmailError =
    emailChangeStep === "draft" && emailDraft.length > 0 && !isValidEmailDraft
  const isEmailChangePasswordValid =
    emailChangePassword.length >= 6 && emailChangePassword.length <= 50
  const isNewCodeValid = /^\d{6}$/.test(newEmailCode)
  const isCurrentPasswordValid =
    currentPassword.length >= 6 && currentPassword.length <= 50
  const isPasswordResetCodeValid = /^\d{6}$/.test(passwordResetCode)
  const isNewPasswordValid = newPassword.length >= 6 && newPassword.length <= 50
  const isConfirmPasswordValid =
    confirmNewPassword.length > 0 && confirmNewPassword === newPassword

  useEffect(() => {
    if (!isForgotPasswordMode || passwordResendTimer === 0) return

    const timer = setTimeout(() => {
      setPasswordResendTimer((prev) => prev - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [isForgotPasswordMode, passwordResendTimer])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeMs(Date.now())
    }, 60 * 1000)

    return () => clearInterval(timer)
  }, [])

  if (!user) return null

  const isSameAsCurrentEmail = normalizedEmailDraft === user.email.toLowerCase()
  const hasGoogleProvider = user.authProviders.some(
    (provider) => provider.provider === "google"
  )
  const hasServerProvider = user.authProviders.some(
    (provider) => provider.provider === "server"
  )
  const canSavePassword = hasServerProvider
    ? isForgotPasswordMode
      ? isPasswordResetCodeValid && isNewPasswordValid && isConfirmPasswordValid
      : isCurrentPasswordValid && isNewPasswordValid && isConfirmPasswordValid
    : isNewPasswordValid && isConfirmPasswordValid
  const providerLabels = user.authProviders.map((provider) =>
    provider.provider === "google" ? "Google" : "Password"
  )
  const formatPasswordChangedHint = (passwordChangedAt?: string) => {
    if (!passwordChangedAt) return "Not changed yet"

    const changedAt = new Date(passwordChangedAt)
    if (Number.isNaN(changedAt.getTime())) return "Last changed recently"

    const diffMs = currentTimeMs - changedAt.getTime()
    const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))

    if (diffDays === 0) return "Last changed today"
    if (diffDays === 1) return "Last changed 1 day ago"

    return `Last changed ${diffDays} days ago`
  }
  const passwordActionLabel = hasServerProvider
    ? "Change Password"
    : "Create Password"
  const passwordDescription = hasServerProvider
    ? "Update your password."
    : "Add a password."
  const passwordStatusLabel = hasServerProvider
    ? "••••••••••••"
    : "No password set yet"
  const passwordStatusHint = hasServerProvider
    ? formatPasswordChangedHint(user.passwordChangedAt)
    : "Create password to unlock full security futures."
  const providerActionLabel = hasGoogleProvider
    ? "Disconnect Google"
    : "Connect Google"
  const providerActionDescription = hasGoogleProvider
    ? "Google is connected."
    : "Google is not connected."

  const resetPasswordFlow = () => {
    setIsPasswordFormOpen(false)
    setIsForgotPasswordMode(false)
    setCurrentPassword("")
    setPasswordResetCode("")
    setNewPassword("")
    setConfirmNewPassword("")
    setPasswordResendTimer(0)
  }

  const beginPasswordFlow = () => {
    resetPasswordFlow()
    setIsPasswordFormOpen(true)
  }

  const savePasswordFlow = () => {
    if (!canSavePassword) return

    setIsSavingPassword(true)

    if (!hasServerProvider) {
      const promise = handlePasswordAction(newPassword)

      toast.promise(promise, {
        loading: "Creating password...",
        success: () => {
          resetPasswordFlow()
          return "Password created."
        },
        error: (error: unknown) =>
          typeof error === "object" &&
          error !== null &&
          "response" in error &&
          typeof (error as { response?: { data?: { message?: string } } })
            .response?.data?.message === "string"
            ? (error as { response?: { data?: { message?: string } } }).response!
                .data!.message!
            : "Failed to create password.",
      })

      promise.finally(() => setIsSavingPassword(false))
      return
    }

    const promise = isForgotPasswordMode
      ? verifyChangePassword({
          email: user.email,
          code: passwordResetCode,
          newPassword,
        })
      : changePassword({
          currentPassword,
          newPassword,
        })

    toast.promise(promise, {
      loading: isForgotPasswordMode
        ? "Resetting password..."
        : "Changing password...",
      success: (data) => {
        updateUser(data.result.user)

        resetPasswordFlow()
        return data.message || "Password changed."
      },
      error: (error: unknown) =>
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response!
              .data!.message!
          : "Failed to change password.",
    })

    promise.finally(() => setIsSavingPassword(false))
  }

  const handleForgotCurrentPassword = () => {
    setIsSendingPasswordReset(true)
    const promise = forgotPassword({ email: user.email })

    toast.promise(promise, {
      loading: "Sending reset code...",
      success: (data) => {
        setIsForgotPasswordMode(true)
        setCurrentPassword("")
        setPasswordResetCode("")
        setPasswordResendTimer(60)
        return data.message || "Password reset code sent."
      },
      error: (error: unknown) =>
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response!
              .data!.message!
          : "Failed to send reset code.",
    })

    promise.finally(() => setIsSendingPasswordReset(false))
  }

  const resendPasswordResetCode = () => {
    if (passwordResendTimer > 0 || isSendingPasswordReset) return

    handleForgotCurrentPassword()
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="rounded-3xl border border-primary/15 bg-linear-to-br from-primary/[0.14] via-primary/[0.05] to-background p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/80 px-3 py-1 text-xs font-medium text-primary">
                <CheckCircle2 className="size-3.5" />
                Verified account
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold">
                  Account access stays lean here
                </p>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Keep email, password, and login protection in one place.
                  Everything below is local UI for now and ready for API wiring
                  later.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-background/85 px-4 py-3 text-sm shadow-sm sm:min-w-[220px]">
              <p className="text-muted-foreground">Primary email</p>
              <p className="mt-1 font-medium break-all">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border/70 p-4">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-primary/10 p-2 text-primary">
                <Mail className="size-4" />
              </span>
              <div className="space-y-1">
                <p className="font-medium">Email address</p>
                <p className="text-sm text-muted-foreground">
                  Used for sign-in, receipts, and security notices.
                </p>
              </div>
            </div>
            {emailChangeStep === "idle" ? (
              <div className="mt-4 flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium break-all">{user.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {hasServerProvider
                      ? "Current sign-in email"
                      : "Create password first to change email address."}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full rounded-xl sm:w-auto"
                  disabled={!hasServerProvider}
                  onClick={() => {
                    setEmailChangePassword("")
                    setEmailDraft("")
                    setEmailChangeStep("draft")
                  }}
                >
                  Change Email
                </Button>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-primary/15 bg-primary/[0.06] px-4 py-3">
                <p className="text-sm text-muted-foreground">Current email</p>
                <p className="mt-1 font-medium break-all">{user.email}</p>
              </div>
            )}
            {emailChangeStep === "draft" || emailChangeStep === "verify" ? (
              <div className="mt-4 space-y-2">
                <Label htmlFor="account-email">New email</Label>
                <Input
                  id="account-email"
                  type="email"
                  value={emailDraft}
                  onChange={(event) => setEmailDraft(event.target.value)}
                  placeholder="name@example.com"
                  disabled={isEmailLocked || isEmailChangeBusy}
                  aria-invalid={showEmailError}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return

                    e.preventDefault()

                    if (
                      !normalizedEmailDraft ||
                      !isValidEmailDraft ||
                      isSameAsCurrentEmail ||
                      !isEmailChangePasswordValid ||
                      isCheckingChangeEmail
                    ) {
                      return
                    }

                    verifyEmailChange()
                  }}
                />
                {showEmailError && (
                  <p className="text-sm text-destructive">
                    Please enter a valid email address.
                  </p>
                )}
              </div>
            ) : null}
            {emailChangeStep === "draft" ? (
              <div className="mt-4 space-y-2">
                <Label htmlFor="email-change-password">Password</Label>
                <Input
                  id="email-change-password"
                  type="password"
                  value={emailChangePassword}
                  onChange={(event) =>
                    setEmailChangePassword(event.target.value)
                  }
                  placeholder="Enter current password"
                  disabled={isEmailChangeBusy}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return

                    e.preventDefault()

                    if (
                      !normalizedEmailDraft ||
                      !isValidEmailDraft ||
                      !isEmailChangePasswordValid ||
                      isCheckingChangeEmail
                    ) {
                      return
                    }

                    verifyEmailChange()
                  }}
                />
              </div>
            ) : null}
            {emailChangeStep === "verify" && (
              <div className="mt-4 grid gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="new-email-code">
                      New email verification code
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="rounded-full text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <CircleHelp className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={6}>
                        Verification code sent to your new email. If not found,
                        check spam folder.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="new-email-code"
                    value={newEmailCode}
                    onChange={(event) =>
                      setNewEmailCode(
                        event.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    placeholder="6-digit code"
                    inputMode="numeric"
                    maxLength={6}
                    disabled={isEmailChangeBusy}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return

                      e.preventDefault()

                      if (!isNewCodeValid || isSavingEmailChange) {
                        return
                      }

                      saveEmailChange()
                    }}
                  />
                </div>
              </div>
            )}
            <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
              {emailChangeStep === "verify" ? (
                <>
                  <Button
                    className="w-full rounded-xl sm:w-auto"
                    onClick={saveEmailChange}
                    disabled={!isNewCodeValid || isEmailChangeBusy}
                  >
                    Save Email Change
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl sm:w-auto"
                    onClick={cancelEmailChange}
                    disabled={isEmailChangeBusy}
                  >
                    Cancel
                  </Button>
                </>
              ) : emailChangeStep === "draft" ? (
                <>
                  <Button
                    className="w-full rounded-xl sm:w-auto"
                    onClick={verifyEmailChange}
                    disabled={
                      !normalizedEmailDraft ||
                      !isValidEmailDraft ||
                      isSameAsCurrentEmail ||
                      !isEmailChangePasswordValid ||
                      isEmailChangeBusy
                    }
                  >
                    Verify
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl sm:w-auto"
                    onClick={cancelEmailChange}
                    disabled={isEmailChangeBusy}
                  >
                    Cancel
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 p-4">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-primary/10 p-2 text-primary">
                <LockKeyhole className="size-4" />
              </span>
              <div className="space-y-1">
                <p className="font-medium">
                  {hasServerProvider ? "Password" : "Create password"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {passwordDescription}
                </p>
              </div>
            </div>
            {!isPasswordFormOpen ? (
              <div className="mt-4 flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{passwordStatusLabel}</p>
                  <p className="text-sm text-muted-foreground">
                    {passwordStatusHint}
                  </p>
                </div>
                <Button
                  variant={hasServerProvider ? "outline" : "default"}
                  className="w-full rounded-xl sm:w-auto"
                  onClick={beginPasswordFlow}
                >
                  {passwordActionLabel}
                </Button>
              </div>
            ) : null}
            {isPasswordFormOpen ? (
              <div className="mt-4 space-y-4 rounded-xl border border-border/70 bg-muted/30 px-4 py-4">
                {hasServerProvider && !isForgotPasswordMode ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current password</Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={currentPassword}
                        onChange={(event) =>
                          setCurrentPassword(event.target.value)
                        }
                        placeholder="Enter current password"
                        disabled={isSavingPassword}
                      />
                    </div>
                    <button
                      type="button"
                      className="text-left text-sm font-medium text-primary hover:underline disabled:pointer-events-none disabled:opacity-60"
                      onClick={handleForgotCurrentPassword}
                      disabled={isSendingPasswordReset || isSavingPassword}
                    >
                      Forgot current password?
                    </button>
                  </>
                ) : null}
                {hasServerProvider && isForgotPasswordMode ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="password-reset-code">
                        Verification email code
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="rounded-full text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <CircleHelp className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" sideOffset={6}>
                          Enter the 6-digit code sent to {user.email}.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="password-reset-code"
                      value={passwordResetCode}
                      onChange={(event) =>
                        setPasswordResetCode(
                          event.target.value.replace(/\D/g, "").slice(0, 6)
                        )
                      }
                      placeholder="6-digit code"
                      inputMode="numeric"
                      maxLength={6}
                      disabled={isSavingPassword}
                    />
                    <div className="flex justify-end">
                      {passwordResendTimer === 0 ? (
                        <button
                          type="button"
                          onClick={resendPasswordResetCode}
                          className="text-xs text-muted-foreground hover:text-primary disabled:pointer-events-none disabled:opacity-60"
                          disabled={isSendingPasswordReset || isSavingPassword}
                        >
                          Resend code
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Resend in {passwordResendTimer}s
                        </span>
                      )}
                    </div>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Enter new password"
                    disabled={isSavingPassword}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">
                    Confirm new password
                  </Label>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(event) =>
                      setConfirmNewPassword(event.target.value)
                    }
                    placeholder="Confirm new password"
                    disabled={isSavingPassword}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return

                      event.preventDefault()

                      if (!canSavePassword) return

                      savePasswordFlow()
                    }}
                  />
                </div>
                {confirmNewPassword.length > 0 && !isConfirmPasswordValid ? (
                  <p className="text-sm text-destructive">
                    Passwords do not match.
                  </p>
                ) : null}
                <div className="grid gap-2 sm:flex sm:flex-wrap">
                  <Button
                    className="w-full rounded-xl sm:w-auto"
                    onClick={savePasswordFlow}
                    disabled={!canSavePassword || isSavingPassword}
                  >
                    {hasServerProvider ? "Change Password" : "Create Password"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl sm:w-auto"
                    onClick={resetPasswordFlow}
                    disabled={isSavingPassword}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border/70 p-4">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-primary/10 p-2 text-primary">
                <Smartphone className="size-4" />
              </span>
              <div>
                <p className="font-medium">Sign-in methods</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage which login methods are attached to this account.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-primary/15 bg-primary/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {providerLabels.map((label) => (
                    <span
                      key={label}
                      className="rounded-full border border-primary/20 bg-background/80 px-3 py-1 text-xs font-medium text-primary"
                    >
                      {label}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  {providerActionDescription}
                </p>
              </div>
              <Button
                variant={hasGoogleProvider ? "outline" : "default"}
                className={cn(
                  "w-full rounded-xl sm:w-auto",
                  hasGoogleProvider && "text-destructive"
                )}
                onClick={handleGoogleProviderAction}
              >
                <FcGoogle className="size-4" />
                {providerActionLabel}
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Member since {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 p-4">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-primary/10 p-2 text-primary">
                <Clock3 className="size-4" />
              </span>
              <div>
                <p className="font-medium">Devices</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review devices that can still access your account.
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-border/70 bg-muted/30 px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Bangkok, Thailand</p>
                  <p className="text-sm text-muted-foreground">
                    Chrome on macOS • Active now
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="w-full rounded-xl text-primary sm:w-auto"
                >
                  Sign out others
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <MenuPreferenceRow
            label="Email visibility"
            description="Choose who can see your account email in workspace surfaces."
            value={accountSecuritySettings.emailVisibility}
            options={["Only me", "Workspace admins", "Billing contacts"]}
            onChange={(value) =>
              setAccountSecuritySettings((prev) => ({
                ...prev,
                emailVisibility: value,
              }))
            }
          />
          <MenuPreferenceRow
            label="Verification method"
            description="Set the default challenge for risky logins and security changes."
            value={accountSecuritySettings.verificationMethod}
            options={["Authenticator app", "SMS code", "Security key"]}
            onChange={(value) =>
              setAccountSecuritySettings((prev) => ({
                ...prev,
                verificationMethod: value,
              }))
            }
          />
          <MenuPreferenceRow
            label="Session timeout"
            description="Decide how long an inactive session can stay signed in."
            value={accountSecuritySettings.sessionTimeout}
            options={["15 minutes", "30 minutes", "1 hour", "4 hours"]}
            onChange={(value) =>
              setAccountSecuritySettings((prev) => ({
                ...prev,
                sessionTimeout: value,
              }))
            }
          />
          <MenuPreferenceRow
            label="New device approval"
            description="Control when a fresh browser or machine must pass extra review."
            value={accountSecuritySettings.deviceApproval}
            options={[
              "Ask every login",
              "Ask once per device",
              "Only high-risk logins",
            ]}
            onChange={(value) =>
              setAccountSecuritySettings((prev) => ({
                ...prev,
                deviceApproval: value,
              }))
            }
          />
        </div>
      </div>
    </TooltipProvider>
  )
}
