import { useEffect, useState } from "react"
import {
  CheckCircle2,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { HelpTooltip } from "@/components/ui/help-tooltip"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useAuthStore } from "@/store/auth"
import { cn } from "@/lib/utils"

type AccountSectionProps = {
  emailChangeStep: "idle" | "draft" | "verify"
  emailChangePassword: string
  emailDraft: string
  newEmailCode: string
  setEmailChangePassword: (value: string) => void
  setEmailDraft: (value: string) => void
  setNewEmailCode: (value: string) => void
  setEmailChangeStep: (value: "idle" | "draft" | "verify") => void
  verifyEmailChange: () => void
  saveEmailChange: () => void
  cancelEmailChange: () => void
  isCheckingChangeEmail: boolean
  isSavingEmailChange: boolean
  handlePasswordAction: (password: string) => Promise<void>
  isUpdatingGoogleProvider: boolean
  handleGoogleProviderAction: () => void
  isDeletingAccount: boolean
  isSendingDeleteVerify: boolean
  handleDeleteAccountVerify: () => Promise<void>
  handleDeleteAccount: (payload: {
    password?: string
    code?: string
  }) => Promise<void>
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
  verifyEmailChange,
  saveEmailChange,
  cancelEmailChange,
  isCheckingChangeEmail,
  isSavingEmailChange,
  handlePasswordAction,
  isUpdatingGoogleProvider,
  handleGoogleProviderAction,
  isDeletingAccount,
  isSendingDeleteVerify,
  handleDeleteAccountVerify,
  handleDeleteAccount,
}: AccountSectionProps) {
  const maskEmail = (email: string) => {
    const [localPart = "", domain = ""] = email.split("@")
    if (!localPart || !domain) return email

    if (localPart.length <= 2) {
      return `${localPart[0] ?? "*"}*****@${domain}`
    }

    return `${localPart[0]}*****${localPart[localPart.length - 1]}@${domain}`
  }

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
  const [deletePassword, setDeletePassword] = useState("")
  const [deleteCode, setDeleteCode] = useState("")
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isDeleteAuthStepOpen, setIsDeleteAuthStepOpen] = useState(false)
  const [deleteCodeResendTimer, setDeleteCodeResendTimer] = useState(0)
  const [hasSentDeleteCode, setHasSentDeleteCode] = useState(false)

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
    if (deleteCodeResendTimer === 0) return

    const timer = setTimeout(() => {
      setDeleteCodeResendTimer((prev) => prev - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [deleteCodeResendTimer])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeMs(Date.now())
    }, 60 * 1000)

    return () => clearInterval(timer)
  }, [])

  const hasServerProvider = Boolean(
    user?.authProviders.some((provider) => provider.provider === "server")
  )

  if (!user) return null

  const isSameAsCurrentEmail = normalizedEmailDraft === user.email.toLowerCase()
  const hasGoogleProvider = user.authProviders.some(
    (provider) => provider.provider === "google"
  )
  const canSavePassword = hasServerProvider
    ? isForgotPasswordMode
      ? isPasswordResetCodeValid && isNewPasswordValid && isConfirmPasswordValid
      : isCurrentPasswordValid && isNewPasswordValid && isConfirmPasswordValid
    : isNewPasswordValid && isConfirmPasswordValid
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
    : "Create a password to unlock full account security."
  const providerActionLabel = hasGoogleProvider ? "Disconnect" : "Connect"
  const providerActionDescription = hasGoogleProvider
    ? "Google sign-in is connected."
    : "Google sign-in is not connected."
  const maskedEmail = maskEmail(user.email)
  const securityOverviewItems = [
    {
      label: "Primary email",
      value: maskedEmail,
      tone: "primary",
    },
    {
      label: "Password",
      value: hasServerProvider ? "Protected" : "Not added",
      tone: hasServerProvider ? "success" : "muted",
    },
    {
      label: "Google",
      value: hasGoogleProvider ? "Connected" : "Available",
      tone: hasGoogleProvider ? "success" : "muted",
    },
  ] as const

  const resetPasswordFlow = () => {
    setIsPasswordFormOpen(false)
    setIsForgotPasswordMode(false)
    setCurrentPassword("")
    setPasswordResetCode("")
    setNewPassword("")
    setConfirmNewPassword("")
    setPasswordResendTimer(0)
  }

  const resetDeleteFlow = () => {
    setIsDeleteAuthStepOpen(false)
    setIsDeleteConfirmOpen(false)
    setDeletePassword("")
    setDeleteCode("")
    setDeleteCodeResendTimer(0)
    setHasSentDeleteCode(false)
  }

  const resetAllActionStates = (activeAction?: "email" | "password" | "delete") => {
    if (activeAction !== "email") {
      cancelEmailChange()
    }

    if (activeAction !== "password") {
      resetPasswordFlow()
    }

    if (activeAction !== "delete") {
      resetDeleteFlow()
    }
  }

  const beginPasswordFlow = () => {
    resetAllActionStates("password")
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
            ? (error as { response?: { data?: { message?: string } } })
                .response!.data!.message!
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

  const isDeletePasswordValid =
    deletePassword.length >= 6 && deletePassword.length <= 50
  const isDeleteCodeValid = /^\d{6}$/.test(deleteCode)
  const isDeleteCredentialValid = hasServerProvider
    ? isDeletePasswordValid
    : isDeleteCodeValid
  const isDeleteStepBusy = isDeletingAccount || isSendingDeleteVerify
  const canContinueDelete = hasServerProvider
    ? isDeleteCredentialValid
    : hasSentDeleteCode && isDeleteCredentialValid

  const requestDeleteAccountCode = () => {
    if (deleteCodeResendTimer > 0 || isDeleteStepBusy) return

    setDeleteCode("")
    setDeleteCodeResendTimer(60)
    setHasSentDeleteCode(false)

    void handleDeleteAccountVerify()
      .then(() => {
        setHasSentDeleteCode(true)
      })
      .catch(() => {
        setDeleteCodeResendTimer(0)
      })
  }

  const onOpenDeleteConfirm = async () => {
    if (hasServerProvider) {
      if (!isDeletePasswordValid) {
        toast.error("Please enter your account password.")
        return
      }

      setIsDeleteConfirmOpen(true)
      return
    }

    if (!isDeleteCodeValid) {
      toast.error("Please enter the 6-digit verification code.")
      return
    }

    setIsDeleteConfirmOpen(true)
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="overflow-hidden rounded-[28px] border border-primary/15 bg-linear-to-br from-primary/[0.16] via-primary/[0.05] to-background shadow-sm">
          <div className="p-5 lg:p-6">
            <div className="min-w-0 space-y-4">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-background/80 px-3 py-1 text-xs font-medium text-primary shadow-sm">
                <CheckCircle2 className="size-3.5" />
                Account verified
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <span className="rounded-2xl bg-primary/12 p-3 text-primary">
                    <ShieldCheck className="size-5" />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="text-xl font-semibold tracking-tight">
                      Security center
                    </p>
                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                      Keep your login details, recovery access, and connected
                      providers organized in one place.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {securityOverviewItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-border/60 bg-background/85 px-4 py-3 shadow-sm"
                  >
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {item.label}
                    </p>
                    <p
                      className={cn(
                        "mt-2 truncate text-sm font-medium",
                        item.tone === "success" && "text-emerald-600",
                        item.tone === "primary" && "text-foreground",
                        item.tone === "muted" && "text-muted-foreground"
                      )}
                      title={item.value}
                    >
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <section className="rounded-[24px] border border-border/70 bg-background/80 p-4 shadow-sm sm:p-5">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-primary/10 p-2.5 text-primary">
                <Mail className="size-4" />
              </span>
              <div className="min-w-0 space-y-1">
                <p className="font-semibold">Email address</p>
                <p className="text-sm text-muted-foreground">
                  Used for sign-in, verification, and security notifications.
                </p>
              </div>
            </div>
            {emailChangeStep === "idle" ? (
              <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/[0.35] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium break-all">{maskedEmail}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {hasServerProvider
                      ? "Used for sign-in and account security"
                      : "Create a password first to change your email address."}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={!hasServerProvider}
                  onClick={() => {
                    resetAllActionStates("email")
                    setEmailChangeStep("draft")
                  }}
                >
                  Change Email
                </Button>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/[0.06] px-4 py-3.5">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Current email
                </p>
                <p className="mt-1 font-medium break-all">{user.email}</p>
              </div>
            )}
            {emailChangeStep === "draft" || emailChangeStep === "verify" ? (
              <div className="mt-5 space-y-2">
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
                    <HelpTooltip
                      label="New email verification"
                      content={
                        <>
                          Verification code sent to your new email. If not found,
                          check spam folder.
                        </>
                      }
                      buttonClassName="rounded-full transition-colors"
                    />
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
                    className="w-full sm:w-auto"
                    onClick={saveEmailChange}
                    disabled={!isNewCodeValid || isEmailChangeBusy}
                  >
                    Save Email Change
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={cancelEmailChange}
                    disabled={isEmailChangeBusy}
                  >
                    Cancel
                  </Button>
                </>
              ) : emailChangeStep === "draft" ? (
                <>
                  <Button
                    className="w-full sm:w-auto"
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
                    className="w-full sm:w-auto"
                    onClick={cancelEmailChange}
                    disabled={isEmailChangeBusy}
                  >
                    Cancel
                  </Button>
                </>
              ) : null}
            </div>
          </section>

          <section className="rounded-[24px] border border-border/70 bg-background/80 p-4 shadow-sm sm:p-5">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-primary/10 p-2.5 text-primary">
                <LockKeyhole className="size-4" />
              </span>
              <div className="min-w-0 space-y-1">
                <p className="font-semibold">
                  {hasServerProvider ? "Password" : "Create password"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {passwordDescription}
                </p>
              </div>
            </div>
            {!isPasswordFormOpen ? (
              <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/[0.35] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{passwordStatusLabel}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {passwordStatusHint}
                  </p>
                </div>
                <Button
                  variant={hasServerProvider ? "outline" : "default"}
                  className="w-full sm:w-auto"
                  onClick={beginPasswordFlow}
                >
                  {passwordActionLabel}
                </Button>
              </div>
            ) : null}
            {isPasswordFormOpen ? (
              <div className="mt-5 space-y-3 rounded-2xl border border-border/70 bg-muted/[0.35] px-4 py-4">
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
                    <div className="-mt-1 flex justify-end">
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-primary disabled:pointer-events-none disabled:opacity-60"
                        onClick={handleForgotCurrentPassword}
                        disabled={isSendingPasswordReset || isSavingPassword}
                      >
                        Forgot current password?
                      </button>
                    </div>
                  </>
                ) : null}
                {hasServerProvider && isForgotPasswordMode ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="password-reset-code">
                        Verification email code
                      </Label>
                      <HelpTooltip
                        label="Verification email code"
                        content={<>Enter the 6-digit code sent to {user.email}.</>}
                        buttonClassName="rounded-full transition-colors"
                      />
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
                    className="w-full sm:w-auto"
                    onClick={savePasswordFlow}
                    disabled={!canSavePassword || isSavingPassword}
                  >
                    {hasServerProvider ? "Change Password" : "Create Password"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={resetPasswordFlow}
                    disabled={isSavingPassword}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        </div>

        <Separator />

        <div className="space-y-4">
          <section className="rounded-[24px] border border-border/70 bg-background/80 p-4 shadow-sm sm:p-5">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-primary/10 p-2.5 text-primary">
                <Smartphone className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold">Sign-in methods</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage which login methods are attached to this account.
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <div className="rounded-[20px] border border-border/70 bg-linear-to-r from-background to-muted/30 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="rounded-2xl bg-primary/10 p-2.5 text-primary">
                      <FcGoogle className="size-4" />
                    </span>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">Google</p>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                            hasGoogleProvider
                              ? "bg-success/12 text-success"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {hasGoogleProvider ? "Connected" : "Not connected"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {providerActionDescription}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={hasGoogleProvider ? "outline" : "default"}
                    className={cn(
                      "w-full rounded-xl lg:w-auto",
                      hasGoogleProvider ? "text-destructive" : ""
                    )}
                    disabled={isUpdatingGoogleProvider}
                    onClick={() => {
                      resetAllActionStates()
                      handleGoogleProviderAction()
                    }}
                  >
                    <FcGoogle className="size-4" />
                    {providerActionLabel}
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-destructive/20 bg-linear-to-br from-destructive/[0.07] via-background to-background p-4 shadow-sm sm:p-5">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-destructive/10 p-2.5 text-destructive">
                <TriangleAlert className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold">Delete account</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Permanently remove your account and all related data.
                </p>
              </div>
            </div>
            <div className="mt-5 rounded-[20px] border border-destructive/25 bg-destructive/6 px-4 py-4">
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-destructive">
                    Permanent action
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This action cannot be undone. You will need to confirm
                    credentials before final deletion.
                  </p>
                </div>

                {isDeleteAuthStepOpen && hasServerProvider ? (
                  <div className="space-y-2">
                    <Label htmlFor="delete-account-password">
                      Enter password
                    </Label>
                    <Input
                      id="delete-account-password"
                      type="password"
                      value={deletePassword}
                      onChange={(event) =>
                        setDeletePassword(event.target.value)
                      }
                      placeholder="Enter your password"
                      disabled={isDeletingAccount}
                    />
                  </div>
                ) : null}

                {isDeleteAuthStepOpen && !hasServerProvider ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Send a verification code to your email before continuing
                      with account deletion.
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="delete-account-code">
                          Email verification code
                        </Label>
                        <HelpTooltip
                          label="Email verification code"
                          content={
                            <>
                              Enter the 6-digit code sent to your email. If not
                              found, check spam folder.
                            </>
                          }
                          buttonClassName="rounded-full transition-colors"
                        />
                      </div>
                      {hasSentDeleteCode && deleteCodeResendTimer === 0 ? (
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-primary disabled:pointer-events-none disabled:opacity-60"
                          disabled={isSendingDeleteVerify || isDeletingAccount}
                          onClick={() => {
                            requestDeleteAccountCode()
                          }}
                        >
                          {isSendingDeleteVerify ? "Sending..." : "Resend code"}
                        </button>
                      ) : hasSentDeleteCode && deleteCodeResendTimer > 0 ? (
                        <span className="text-xs text-muted-foreground">
                          Resend in {deleteCodeResendTimer}s
                        </span>
                      ) : null}
                    </div>
                    <Input
                      id="delete-account-code"
                      value={deleteCode}
                      onChange={(event) =>
                        setDeleteCode(
                          event.target.value.replace(/\D/g, "").slice(0, 6)
                        )
                      }
                      placeholder="6-digit code"
                      inputMode="numeric"
                      maxLength={6}
                      disabled={isDeletingAccount || !hasSentDeleteCode}
                    />
                  </div>
                ) : null}

                {!isDeleteAuthStepOpen ? (
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={isDeleteStepBusy}
                    onClick={() => {
                      resetAllActionStates("delete")
                      setIsDeleteAuthStepOpen(true)
                    }}
                  >
                    {isDeleteStepBusy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isDeletingAccount ? "Deleting..." : "Sending code..."}
                      </>
                    ) : (
                      "Delete Account"
                    )}
                  </Button>
                ) : !hasServerProvider && !hasSentDeleteCode ? (
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={isDeleteStepBusy}
                    onClick={() => {
                      requestDeleteAccountCode()
                    }}
                  >
                    {isDeleteStepBusy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isDeletingAccount ? "Deleting..." : "Sending code..."}
                      </>
                    ) : (
                      "Send Email"
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={isDeleteStepBusy || !canContinueDelete}
                    onClick={() => {
                      void onOpenDeleteConfirm()
                    }}
                  >
                    {isDeleteStepBusy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isDeletingAccount ? "Deleting..." : "Sending code..."}
                      </>
                    ) : (
                      "Continue Delete"
                    )}
                  </Button>
                )}

                {isDeleteAuthStepOpen ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={isDeleteStepBusy}
                    onClick={() => {
                      resetDeleteFlow()
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </div>
          </section>
        </div>

        <AlertDialog
          open={isDeleteConfirmOpen}
          onOpenChange={setIsDeleteConfirmOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete account permanently?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove your account and related data permanently. This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingAccount}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
                disabled={isDeletingAccount || !isDeleteCredentialValid}
                onClick={(event) => {
                  event.preventDefault()
                  const payload = hasServerProvider
                    ? { password: deletePassword }
                    : { code: deleteCode }

                  void handleDeleteAccount(payload).finally(() => {
                    setIsDeleteConfirmOpen(false)
                  })
                }}
              >
                {isDeletingAccount ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Forever"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
