import { useEffect, useState, type ComponentProps } from "react";
import {
  BadgeCheck,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";

import {
  changePassword,
  forgotPassword,
  verifyChangePassword,
} from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

type SettingsInputProps = ComponentProps<typeof Input> & {
  icon: typeof Mail;
  showPasswordToggle?: boolean;
  isPasswordVisible?: boolean;
  onTogglePasswordVisibility?: () => void;
};

function SettingsInput({
  icon: Icon,
  className,
  disabled,
  showPasswordToggle = false,
  isPasswordVisible = false,
  onTogglePasswordVisibility,
  ...props
}: SettingsInputProps) {
  const ToggleIcon = isPasswordVisible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Icon
        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        className={cn("pl-9", showPasswordToggle && "pr-10", className)}
        disabled={disabled}
        {...props}
      />
      {showPasswordToggle && onTogglePasswordVisibility ? (
        <button
          type="button"
          onClick={onTogglePasswordVisibility}
          disabled={disabled}
          className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={isPasswordVisible ? "Hide password" : "Show password"}
        >
          <ToggleIcon className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

type AccountSectionProps = {
  emailChangeStep: "idle" | "draft" | "verify";
  emailChangePassword: string;
  emailDraft: string;
  newEmailCode: string;
  setEmailChangePassword: (value: string) => void;
  setEmailDraft: (value: string) => void;
  setNewEmailCode: (value: string) => void;
  setEmailChangeStep: (value: "idle" | "draft" | "verify") => void;
  verifyEmailChange: () => void;
  saveEmailChange: () => void;
  cancelEmailChange: () => void;
  isCheckingChangeEmail: boolean;
  isSavingEmailChange: boolean;
  handlePasswordAction: (password: string) => Promise<void>;
  isUpdatingGoogleProvider: boolean;
  handleGoogleProviderAction: () => void;
  isDeletingAccount: boolean;
  isSendingDeleteVerify: boolean;
  handleDeleteAccountVerify: () => Promise<void>;
  handleDeleteAccount: (payload: {
    password?: string;
    code?: string;
  }) => Promise<void>;
};

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
    const [localPart = "", domain = ""] = email.split("@");
    if (!localPart || !domain) return email;

    if (localPart.length <= 2) {
      return `${localPart[0] ?? "*"}*****@${domain}`;
    }

    return `${localPart[0]}*****${localPart[localPart.length - 1]}@${domain}`;
  };

  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const isEmailChangeBusy = isCheckingChangeEmail || isSavingEmailChange;
  const isEmailLocked = emailChangeStep === "verify";
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [passwordResetCode, setPasswordResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false);
  const [passwordResendTimer, setPasswordResendTimer] = useState(0);
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteCode, setDeleteCode] = useState("");
  const [isEmailChangePasswordVisible, setIsEmailChangePasswordVisible] =
    useState(false);
  const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] =
    useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmNewPasswordVisible, setIsConfirmNewPasswordVisible] =
    useState(false);
  const [isDeletePasswordVisible, setIsDeletePasswordVisible] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleteAuthStepOpen, setIsDeleteAuthStepOpen] = useState(false);
  const [deleteCodeResendTimer, setDeleteCodeResendTimer] = useState(0);
  const [hasSentDeleteCode, setHasSentDeleteCode] = useState(false);
  const [isDeleteCodeStepVisible, setIsDeleteCodeStepVisible] = useState(false);
  const [deleteCodeError, setDeleteCodeError] = useState("");
  const [deletePasswordError, setDeletePasswordError] = useState("");

  const normalizedEmailDraft = emailDraft.trim().toLowerCase();
  const isValidEmailDraft = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    normalizedEmailDraft,
  );
  const showEmailError =
    emailChangeStep === "draft" && emailDraft.length > 0 && !isValidEmailDraft;
  const isEmailChangePasswordValid =
    emailChangePassword.length >= 6 && emailChangePassword.length <= 50;
  const isNewCodeValid = /^\d{6}$/.test(newEmailCode);
  const isCurrentPasswordValid =
    currentPassword.length >= 6 && currentPassword.length <= 50;
  const isPasswordResetCodeValid = /^\d{6}$/.test(passwordResetCode);
  const isNewPasswordValid =
    newPassword.length >= 6 && newPassword.length <= 50;
  const isConfirmPasswordValid =
    confirmNewPassword.length > 0 && confirmNewPassword === newPassword;

  useEffect(() => {
    if (!isForgotPasswordMode || passwordResendTimer === 0) return;

    const timer = setTimeout(() => {
      setPasswordResendTimer((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isForgotPasswordMode, passwordResendTimer]);

  useEffect(() => {
    if (deleteCodeResendTimer === 0) return;

    const timer = setTimeout(() => {
      setDeleteCodeResendTimer((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [deleteCodeResendTimer]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  const hasServerProvider = Boolean(
    user?.authProviders.some((provider) => provider.provider === "server"),
  );

  if (!user) return null;

  const isSameAsCurrentEmail =
    normalizedEmailDraft === user.email.toLowerCase();
  const hasGoogleProvider = user.authProviders.some(
    (provider) => provider.provider === "google",
  );
  const canSavePassword = hasServerProvider
    ? isForgotPasswordMode
      ? isPasswordResetCodeValid && isNewPasswordValid && isConfirmPasswordValid
      : isCurrentPasswordValid && isNewPasswordValid && isConfirmPasswordValid
    : isNewPasswordValid && isConfirmPasswordValid;
  const formatPasswordChangedHint = (passwordChangedAt?: string) => {
    if (!passwordChangedAt) return "Not changed yet";

    const changedAt = new Date(passwordChangedAt);
    if (Number.isNaN(changedAt.getTime())) return "Last changed recently";

    const diffMs = currentTimeMs - changedAt.getTime();
    const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    if (diffDays === 0) return "Last changed today";
    if (diffDays === 1) return "Last changed 1 day ago";

    return `Last changed ${diffDays} days ago`;
  };
  const passwordActionLabel = hasServerProvider
    ? "Change Password"
    : "Create Password";
  const passwordDescription = hasServerProvider
    ? "Update your password."
    : "Add a password.";
  const passwordStatusLabel = hasServerProvider
    ? "************"
    : "No password set yet";
  const passwordStatusHint = hasServerProvider
    ? formatPasswordChangedHint(user.passwordChangedAt)
    : "Create a password to unlock full account security.";
  const providerActionLabel = hasGoogleProvider ? "Disconnect" : "Connect";
  const providerActionDescription = hasGoogleProvider
    ? "Google sign-in is connected."
    : "Google sign-in is not connected.";
  const maskedEmail = maskEmail(user.email);
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
  ] as const;

  const resetEmailFieldState = () => {
    setIsEmailChangePasswordVisible(false);
  };

  const resetPasswordFlow = () => {
    setIsPasswordFormOpen(false);
    setIsForgotPasswordMode(false);
    setCurrentPassword("");
    setPasswordResetCode("");
    setNewPassword("");
    setConfirmNewPassword("");
    setPasswordResendTimer(0);
    setIsCurrentPasswordVisible(false);
    setIsNewPasswordVisible(false);
    setIsConfirmNewPasswordVisible(false);
  };

  const resetDeleteFlow = () => {
    setIsDeleteAuthStepOpen(false);
    setIsDeleteConfirmOpen(false);
    setDeletePassword("");
    setDeleteCode("");
    setDeleteCodeResendTimer(0);
    setHasSentDeleteCode(false);
    setIsDeleteCodeStepVisible(false);
    setDeleteCodeError("");
    setDeletePasswordError("");
    setIsDeletePasswordVisible(false);
  };

  const resetAllActionStates = (
    activeAction?: "email" | "password" | "delete",
  ) => {
    if (activeAction !== "email") {
      resetEmailFieldState();
      cancelEmailChange();
    }

    if (activeAction !== "password") {
      resetPasswordFlow();
    }

    if (activeAction !== "delete") {
      resetDeleteFlow();
    }
  };

  const beginPasswordFlow = () => {
    resetAllActionStates("password");
    setIsPasswordFormOpen(true);
  };

  const savePasswordFlow = () => {
    if (!canSavePassword) return;

    setIsSavingPassword(true);

    if (!hasServerProvider) {
      const promise = handlePasswordAction(newPassword);

      promise
        .then(() => {
          resetPasswordFlow();
        })
        .catch((error: unknown) => {
          toast.error(
            typeof error === "object" &&
              error !== null &&
              "response" in error &&
              typeof (error as { response?: { data?: { message?: string } } })
                .response?.data?.message === "string"
              ? (error as { response?: { data?: { message?: string } } })
                  .response!.data!.message!
              : "Failed to create password.",
          );
        });

      promise.finally(() => setIsSavingPassword(false));
      return;
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
        });

    promise
      .then((data) => {
        updateUser(data.result.user);
        resetPasswordFlow();
      })
      .catch((error: unknown) => {
        toast.error(
          typeof error === "object" &&
            error !== null &&
            "response" in error &&
            typeof (error as { response?: { data?: { message?: string } } })
              .response?.data?.message === "string"
            ? (error as { response?: { data?: { message?: string } } })
                .response!.data!.message!
            : "Failed to change password.",
        );
      });

    promise.finally(() => setIsSavingPassword(false));
  };

  const handleForgotCurrentPassword = () => {
    setIsSendingPasswordReset(true);
    const promise = forgotPassword({ email: user.email });

    promise
      .then(() => {
        setIsForgotPasswordMode(true);
        setCurrentPassword("");
        setPasswordResetCode("");
        setPasswordResendTimer(60);
      })
      .catch((error: unknown) => {
        toast.error(
          typeof error === "object" &&
            error !== null &&
            "response" in error &&
            typeof (error as { response?: { data?: { message?: string } } })
              .response?.data?.message === "string"
            ? (error as { response?: { data?: { message?: string } } })
                .response!.data!.message!
            : "Failed to send reset code.",
        );
      });

    promise.finally(() => setIsSendingPasswordReset(false));
  };

  const resendPasswordResetCode = () => {
    if (passwordResendTimer > 0 || isSendingPasswordReset) return;

    handleForgotCurrentPassword();
  };

  const isDeletePasswordValid =
    deletePassword.length >= 6 && deletePassword.length <= 50;
  const isDeleteCodeValid = /^\d{6}$/.test(deleteCode);
  const isDeleteCredentialValid = hasServerProvider
    ? isDeletePasswordValid
    : isDeleteCodeValid;
  const isDeleteStepBusy = isDeletingAccount;
  const isDeleteFlowBusy = isDeletingAccount || isSendingDeleteVerify;
  const canContinueDelete = hasServerProvider
    ? isDeleteCredentialValid && !deletePasswordError
    : isDeleteCodeStepVisible && isDeleteCredentialValid && !deleteCodeError;

  const requestDeleteAccountCode = () => {
    if (deleteCodeResendTimer > 0 || isSendingDeleteVerify || isDeletingAccount)
      return;

    setDeleteCodeError("");
    setDeleteCodeResendTimer(60);

    void handleDeleteAccountVerify()
      .then(() => {
        setIsDeleteCodeStepVisible(true);
        setHasSentDeleteCode(true);
        setDeleteCode("");
      })
      .catch((error: unknown) => {
        setDeleteCodeError(
          error instanceof Error && error.message
            ? error.message
            : "Invalid input.",
        );
        setDeleteCodeResendTimer(0);
      });
  };

  const onOpenDeleteConfirm = async () => {
    if (hasServerProvider) {
      if (!isDeletePasswordValid) {
        setDeletePasswordError("Please enter your account password.");
        toast.error("Please enter your account password.");
        return;
      }

      setIsDeleteConfirmOpen(true);
      return;
    }

    if (!isDeleteCodeValid) {
      toast.error("Please enter the 6-digit verification code.");
      return;
    }

    setIsDeleteConfirmOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl bg-card shadow-sm">
        <div className="p-5 md:p-6">
          <div className="min-w-0 space-y-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-100/80 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <BadgeCheck className="size-3.5" />
              Account verified
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-muted p-3 text-foreground">
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
            <div className="grid gap-3 md:grid-cols-3">
              {securityOverviewItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl bg-muted/40 px-4 py-3"
                >
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p
                    className={cn(
                      "mt-2 truncate text-sm font-medium",
                      item.tone === "success" && "text-emerald-600",
                      item.tone === "primary" && "text-foreground",
                      item.tone === "muted" && "text-muted-foreground",
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
        <section className="rounded-xl bg-card p-4 shadow-sm md:p-5">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-muted p-2.5 text-foreground">
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
            <div className="mt-5 flex flex-col gap-3 rounded-xl bg-muted/40 px-4 py-4 md:flex-row md:items-center md:justify-between">
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
                className="w-full md:w-auto"
                disabled={!hasServerProvider}
                onClick={() => {
                  resetAllActionStates("email");
                  resetEmailFieldState();
                  setEmailChangeStep("draft");
                }}
              >
                Change Email
              </Button>
            </div>
          ) : (
            <div className="mt-5 rounded-xl bg-muted/40 px-4 py-3.5">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Current email
              </p>
              <p className="mt-1 font-medium break-all">{user.email}</p>
            </div>
          )}
          {emailChangeStep === "draft" || emailChangeStep === "verify" ? (
            <div className="mt-5 space-y-2">
              <Label htmlFor="account-email" className="text-muted-foreground">
                New email
              </Label>
              <SettingsInput
                id="account-email"
                icon={Mail}
                type="email"
                value={emailDraft}
                onChange={(event) => setEmailDraft(event.target.value)}
                placeholder="name@example.com"
                disabled={isEmailLocked || isEmailChangeBusy}
                aria-invalid={showEmailError}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;

                  e.preventDefault();

                  if (
                    !normalizedEmailDraft ||
                    !isValidEmailDraft ||
                    isSameAsCurrentEmail ||
                    !isEmailChangePasswordValid ||
                    isCheckingChangeEmail
                  ) {
                    return;
                  }

                  verifyEmailChange();
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
              <Label
                htmlFor="email-change-password"
                className="text-muted-foreground"
              >
                Password
              </Label>
              <SettingsInput
                id="email-change-password"
                icon={LockKeyhole}
                type={isEmailChangePasswordVisible ? "text" : "password"}
                value={emailChangePassword}
                onChange={(event) => setEmailChangePassword(event.target.value)}
                placeholder="Enter current password"
                disabled={isEmailChangeBusy}
                showPasswordToggle={emailChangePassword.length > 0}
                isPasswordVisible={isEmailChangePasswordVisible}
                onTogglePasswordVisibility={() =>
                  setIsEmailChangePasswordVisible((prev) => !prev)
                }
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;

                  e.preventDefault();

                  if (
                    !normalizedEmailDraft ||
                    !isValidEmailDraft ||
                    !isEmailChangePasswordValid ||
                    isCheckingChangeEmail
                  ) {
                    return;
                  }

                  verifyEmailChange();
                }}
              />
            </div>
          ) : null}
          {emailChangeStep === "verify" && (
            <div className="mt-4 grid gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="new-email-code"
                    className="text-muted-foreground"
                  >
                    New email verification code
                  </Label>
                </div>
                <SettingsInput
                  id="new-email-code"
                  icon={KeyRound}
                  value={newEmailCode}
                  onChange={(event) =>
                    setNewEmailCode(
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  placeholder="6-digit code"
                  inputMode="numeric"
                  maxLength={6}
                  disabled={isEmailChangeBusy}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;

                    e.preventDefault();

                    if (!isNewCodeValid || isSavingEmailChange) {
                      return;
                    }

                    saveEmailChange();
                  }}
                />
              </div>
            </div>
          )}
          <div className="mt-4 grid gap-2 md:flex md:flex-wrap">
            {emailChangeStep === "verify" ? (
              <>
                <Button
                  className="w-full md:w-auto"
                  onClick={saveEmailChange}
                  disabled={!isNewCodeValid || isEmailChangeBusy}
                >
                  {isSavingEmailChange ? (
                    <Loader2 className="absolute h-4 w-4 animate-spin" />
                  ) : null}
                  <span
                    className={isSavingEmailChange ? "opacity-0" : undefined}
                  >
                    Change Email
                  </span>
                </Button>
                <Button
                  variant="outline"
                  className="w-full md:w-auto"
                  onClick={() => {
                    resetEmailFieldState();
                    cancelEmailChange();
                  }}
                  disabled={isEmailChangeBusy}
                >
                  Cancel
                </Button>
              </>
            ) : emailChangeStep === "draft" ? (
              <>
                <Button
                  className="w-full md:w-auto"
                  onClick={verifyEmailChange}
                  disabled={
                    !normalizedEmailDraft ||
                    !isValidEmailDraft ||
                    isSameAsCurrentEmail ||
                    !isEmailChangePasswordValid ||
                    isEmailChangeBusy
                  }
                >
                  {isCheckingChangeEmail ? (
                    <Loader2 className="absolute h-4 w-4 animate-spin" />
                  ) : null}
                  <span
                    className={isCheckingChangeEmail ? "opacity-0" : undefined}
                  >
                    Verify
                  </span>
                </Button>
                <Button
                  variant="outline"
                  className="w-full md:w-auto"
                  onClick={() => {
                    resetEmailFieldState();
                    cancelEmailChange();
                  }}
                  disabled={isEmailChangeBusy}
                >
                  Cancel
                </Button>
              </>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl bg-card p-4 shadow-sm md:p-5">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-muted p-2.5 text-foreground">
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
            <div className="mt-5 flex flex-col gap-3 rounded-xl bg-muted/40 px-4 py-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="font-medium">{passwordStatusLabel}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {passwordStatusHint}
                </p>
              </div>
              <Button
                variant={hasServerProvider ? "outline" : "default"}
                className="w-full md:w-auto"
                onClick={beginPasswordFlow}
              >
                {passwordActionLabel}
              </Button>
            </div>
          ) : null}
          {isPasswordFormOpen ? (
            <div className="mt-5 space-y-3 rounded-xl bg-muted/40 px-4 py-4">
              {hasServerProvider && !isForgotPasswordMode ? (
                <>
                  <div className="space-y-2">
                    <Label
                      htmlFor="current-password"
                      className="text-muted-foreground"
                    >
                      Current password
                    </Label>
                    <SettingsInput
                      id="current-password"
                      icon={LockKeyhole}
                      type={isCurrentPasswordVisible ? "text" : "password"}
                      value={currentPassword}
                      onChange={(event) =>
                        setCurrentPassword(event.target.value)
                      }
                      placeholder="Enter current password"
                      disabled={isSavingPassword}
                      showPasswordToggle={currentPassword.length > 0}
                      isPasswordVisible={isCurrentPasswordVisible}
                      onTogglePasswordVisibility={() =>
                        setIsCurrentPasswordVisible((prev) => !prev)
                      }
                    />
                  </div>
                  <div className="-mt-1 flex justify-end">
                    <button
                      type="button"
                      className={cn(
                        "text-xs transition-colors disabled:pointer-events-none disabled:opacity-60",
                        isSendingPasswordReset
                          ? "text-muted-foreground"
                          : "text-primary hover:text-primary/80",
                      )}
                      onClick={handleForgotCurrentPassword}
                      disabled={isSendingPasswordReset || isSavingPassword}
                    >
                      {isSendingPasswordReset
                        ? "Sending email code..."
                        : "Forgot current password?"}
                    </button>
                  </div>
                </>
              ) : null}
              {hasServerProvider && isForgotPasswordMode ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="password-reset-code"
                      className="text-muted-foreground"
                    >
                      Email verification code
                    </Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <SettingsInput
                        id="password-reset-code"
                        icon={KeyRound}
                        value={passwordResetCode}
                        onChange={(event) =>
                          setPasswordResetCode(
                            event.target.value.replace(/\D/g, "").slice(0, 6),
                          )
                        }
                        placeholder="Enter 6 digit code"
                        inputMode="numeric"
                        maxLength={6}
                        disabled={isSavingPassword}
                      />
                    </div>
                    {passwordResendTimer === 0 ? (
                      <Button
                        type="button"
                        onClick={resendPasswordResetCode}
                        variant="outline"
                        className="h-8 w-18 shrink-0 px-3 text-xs disabled:bg-input/50 dark:disabled:bg-input/80"
                        disabled={isSendingPasswordReset || isSavingPassword}
                      >
                        {isSendingPasswordReset ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <span>Resend</span>
                        )}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 w-10 shrink-0 px-0 text-xs disabled:bg-input/50 dark:disabled:bg-input/80"
                        disabled
                      >
                        {passwordResendTimer}s
                      </Button>
                    )}
                  </div>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-muted-foreground">
                  New password
                </Label>
                <SettingsInput
                  id="new-password"
                  icon={LockKeyhole}
                  type={isNewPasswordVisible ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Enter new password"
                  disabled={isSavingPassword}
                  showPasswordToggle={newPassword.length > 0}
                  isPasswordVisible={isNewPasswordVisible}
                  onTogglePasswordVisibility={() =>
                    setIsNewPasswordVisible((prev) => !prev)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="confirm-new-password"
                  className="text-muted-foreground"
                >
                  Confirm new password
                </Label>
                <SettingsInput
                  id="confirm-new-password"
                  icon={LockKeyhole}
                  type={isConfirmNewPasswordVisible ? "text" : "password"}
                  value={confirmNewPassword}
                  onChange={(event) =>
                    setConfirmNewPassword(event.target.value)
                  }
                  placeholder="Confirm new password"
                  disabled={isSavingPassword}
                  showPasswordToggle={confirmNewPassword.length > 0}
                  isPasswordVisible={isConfirmNewPasswordVisible}
                  onTogglePasswordVisibility={() =>
                    setIsConfirmNewPasswordVisible((prev) => !prev)
                  }
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;

                    event.preventDefault();

                    if (!canSavePassword) return;

                    savePasswordFlow();
                  }}
                />
              </div>
              {confirmNewPassword.length > 0 && !isConfirmPasswordValid ? (
                <p className="text-sm text-destructive">
                  Passwords do not match.
                </p>
              ) : null}
              <div className="grid gap-2 md:flex md:flex-wrap">
                <Button
                  className="w-full md:w-40"
                  onClick={savePasswordFlow}
                  disabled={!canSavePassword || isSavingPassword}
                >
                  {isSavingPassword ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : hasServerProvider ? (
                    "Change Password"
                  ) : (
                    "Create Password"
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full md:w-auto"
                  onClick={resetPasswordFlow}
                  disabled={isSavingPassword || isSendingPasswordReset}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <div className="space-y-4">
        <section className="rounded-xl bg-card p-4 shadow-sm md:p-5">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-muted p-2.5 text-foreground">
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
            <div className="rounded-xl bg-muted/30 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <span className="rounded-2xl bg-primary/10 p-2.5 text-primary">
                    <FcGoogle className="size-4" />
                  </span>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">Google</p>
                      <span
                        className={cn(
                          "rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium",
                          hasGoogleProvider
                            ? "bg-muted text-foreground"
                            : "bg-muted text-muted-foreground",
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
                    "w-full rounded-xl md:w-auto",
                    hasGoogleProvider ? "text-destructive" : "",
                  )}
                  disabled={isUpdatingGoogleProvider}
                  onClick={() => {
                    resetAllActionStates();
                    handleGoogleProviderAction();
                  }}
                >
                  {isUpdatingGoogleProvider ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <FcGoogle className="size-4" />
                      {providerActionLabel}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-card p-4 shadow-sm md:p-5">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-muted p-2.5 text-destructive">
              <TriangleAlert className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold">Delete account</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Permanently remove your account and all related data.
              </p>
            </div>
          </div>
          <div className="mt-5 rounded-xl bg-muted/40 px-4 py-4">
            <div className="space-y-3">
              <div>
                <p className="font-medium text-destructive">Permanent action</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  This action cannot be undone.
                </p>
              </div>

              {isDeleteAuthStepOpen && hasServerProvider ? (
                <div className="space-y-2">
                  <Label
                    htmlFor="delete-account-password"
                    className="text-muted-foreground"
                  >
                    Enter password
                  </Label>
                  <SettingsInput
                    id="delete-account-password"
                    icon={LockKeyhole}
                    type={isDeletePasswordVisible ? "text" : "password"}
                    value={deletePassword}
                    onChange={(event) => {
                      setDeletePassword(event.target.value);
                      setDeletePasswordError("");
                    }}
                    placeholder="Enter your password"
                    disabled={isDeletingAccount}
                    showPasswordToggle={deletePassword.length > 0}
                    isPasswordVisible={isDeletePasswordVisible}
                    onTogglePasswordVisibility={() =>
                      setIsDeletePasswordVisible((prev) => !prev)
                    }
                    aria-invalid={Boolean(deletePasswordError)}
                  />
                </div>
              ) : null}

              {isDeleteAuthStepOpen &&
              !hasServerProvider &&
              !isDeleteCodeStepVisible ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Send a code to your email to continue delete.
                  </p>
                </div>
              ) : null}

              {isDeleteAuthStepOpen &&
              !hasServerProvider &&
              isDeleteCodeStepVisible ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="delete-account-code"
                      className="text-muted-foreground"
                    >
                      Email verification code
                    </Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <SettingsInput
                        id="delete-account-code"
                        icon={KeyRound}
                        value={deleteCode}
                        onChange={(event) => {
                          setDeleteCode(
                            event.target.value.replace(/\D/g, "").slice(0, 6),
                          );
                          setDeleteCodeError("");
                        }}
                        placeholder="6-digit code"
                        inputMode="numeric"
                        maxLength={6}
                        disabled={isDeleteFlowBusy}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter") return;

                          event.preventDefault();

                          if (isDeleteFlowBusy || !canContinueDelete) {
                            return;
                          }

                          void onOpenDeleteConfirm();
                        }}
                        aria-invalid={Boolean(deleteCodeError)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="relative h-8 w-18 shrink-0 px-3 text-xs disabled:bg-input/50 dark:disabled:bg-input/80"
                      disabled={isDeleteFlowBusy || deleteCodeResendTimer > 0}
                      onClick={() => {
                        requestDeleteAccountCode();
                      }}
                    >
                      {isSendingDeleteVerify ? (
                        <Loader2 className="absolute h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      <span
                        className={
                          isSendingDeleteVerify ? "opacity-0" : undefined
                        }
                      >
                        {deleteCodeResendTimer > 0
                          ? `${deleteCodeResendTimer}s`
                          : hasSentDeleteCode
                            ? "Resend"
                            : "Send"}
                      </span>
                    </Button>
                  </div>
                </div>
              ) : null}

              {!isDeleteAuthStepOpen ? (
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={isDeleteFlowBusy}
                  onClick={() => {
                    resetAllActionStates("delete");
                    setIsDeleteAuthStepOpen(true);
                  }}
                >
                  {isDeleteStepBusy ? (
                    <>
                      <Loader2 className="absolute h-4 w-4 animate-spin" />
                      <span className="opacity-0">Delete Account</span>
                    </>
                  ) : (
                    "Delete Account"
                  )}
                </Button>
              ) : !hasServerProvider && !isDeleteCodeStepVisible ? (
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={isDeleteFlowBusy}
                  onClick={() => {
                    requestDeleteAccountCode();
                  }}
                >
                  {isSendingDeleteVerify ? (
                    <>
                      <Loader2 className="absolute h-4 w-4 animate-spin" />
                      <span className="opacity-0">Send Email Code</span>
                    </>
                  ) : (
                    "Send Email Code"
                  )}
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={isDeleteFlowBusy || !canContinueDelete}
                  onClick={() => {
                    void onOpenDeleteConfirm();
                  }}
                >
                  {isDeleteStepBusy ? (
                    <>
                      <Loader2 className="absolute h-4 w-4 animate-spin" />
                      <span className="opacity-0">Continue Delete</span>
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
                  disabled={isDeleteFlowBusy}
                  onClick={() => {
                    resetDeleteFlow();
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
              variant="destructive"
              className="relative !bg-destructive !text-white hover:!bg-destructive/90"
              disabled={isDeletingAccount || !isDeleteCredentialValid}
              onClick={(event) => {
                event.preventDefault();
                const payload = hasServerProvider
                  ? { password: deletePassword }
                  : { code: deleteCode };

                void handleDeleteAccount(payload)
                  .then(() => {
                    setIsDeleteConfirmOpen(false);
                  })
                  .catch((error: unknown) => {
                    if (hasServerProvider) {
                      setDeletePasswordError(
                        error instanceof Error && error.message
                          ? error.message
                          : "Incorrect password!",
                      );
                    } else {
                      setDeleteCodeError(
                        error instanceof Error && error.message
                          ? error.message
                          : "Invalid verification code!",
                      );
                    }

                    setIsDeleteConfirmOpen(false);
                  });
              }}
            >
              {isDeletingAccount ? (
                <Loader2 className="absolute h-4 w-4 animate-spin text-white" />
              ) : null}
              <span className={isDeletingAccount ? "opacity-0" : undefined}>
                Delete
              </span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
