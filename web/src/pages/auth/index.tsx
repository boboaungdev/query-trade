import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
} from "react";
import { useNavigate } from "react-router-dom";

import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { FcGoogle } from "react-icons/fc";

import { useAuthStore } from "@/store/auth";

import {
  checkUserExist,
  forgotPassword,
  forgotPasswordVerify,
  resetPassword,
  signin,
  signinGoogle,
  signup,
  signupVerify,
} from "@/api/auth";
import { getApiErrorMessage } from "@/api/axios";
import { APP_NAME } from "@/constants";
import {
  AtSign,
  ChevronLeft,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

const NAME_REGEX = /^[A-Za-z0-9 ]{1,20}$/;
const USERNAME_REGEX = /^[a-z0-9]{6,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidPassword(value: string) {
  return value.length >= 6 && value.length <= 50;
}

type AuthFieldKey =
  | "email"
  | "password"
  | "name"
  | "username"
  | "code"
  | "newPassword"
  | "confirmNewPassword";

type AuthInputProps = ComponentProps<typeof Input> & {
  icon: typeof Mail;
  isPasswordToggle?: boolean;
  isPasswordVisible?: boolean;
  showPasswordToggle?: boolean;
  onTogglePasswordVisibility?: () => void;
};

function AuthInput({
  icon: Icon,
  className,
  isPasswordToggle = false,
  isPasswordVisible = false,
  showPasswordToggle = false,
  onTogglePasswordVisibility,
  disabled,
  ...props
}: AuthInputProps) {
  const ToggleIcon = isPasswordVisible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Icon
        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        className={`pl-9 ${showPasswordToggle ? "pr-10" : ""} ${className ?? ""}`.trim()}
        disabled={disabled}
        {...props}
      />
      {isPasswordToggle && showPasswordToggle && onTogglePasswordVisibility ? (
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

export default function Auth() {
  const navigate = useNavigate();
  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [isSigninPasswordVisible, setIsSigninPasswordVisible] = useState(false);
  const [isSignupPasswordVisible, setIsSignupPasswordVisible] = useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);
  const [isSignup, setIsSignup] = useState(false);

  const [verifyStep, setVerifyStep] = useState(false);
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingSource, setLoadingSource] = useState<
    "submit" | "google" | "resend" | "forgot" | null
  >(null);
  const [forgotStep, setForgotStep] = useState(false);
  const [resetStep, setResetStep] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [invalidFields, setInvalidFields] = useState<
    Record<AuthFieldKey, boolean>
  >({
    email: false,
    password: false,
    name: false,
    username: false,
    code: false,
    newPassword: false,
    confirmNewPassword: false,
  });

  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const normalizedEmail = email.trim().toLowerCase();
  const isValidEmail = EMAIL_REGEX.test(normalizedEmail);
  const validName = NAME_REGEX.test(name.trim());
  const validUsername = USERNAME_REGEX.test(username.trim());
  const validPassword = isValidPassword(password);
  const validNewPassword = isValidPassword(newPassword);
  const shouldShowContinueSpinner = loading && loadingSource === "submit";
  const isGoogleLoading = loading && loadingSource === "google";
  const hasInvalidField = Object.values(invalidFields).some(Boolean);
  const isSubmitDisabled =
    loading ||
    hasInvalidField ||
    (!verifyStep && !forgotStep && !isValidEmail) ||
    (showPassword && !forgotStep && !validPassword) ||
    (isSignup &&
      !verifyStep &&
      (!validName || !validUsername || !validPassword)) ||
    (resetStep &&
      (!validNewPassword ||
        !confirmNewPassword.trim() ||
        newPassword !== confirmNewPassword)) ||
    ((verifyStep || (forgotStep && !resetStep)) && code.length !== 6);

  const setInvalidFieldState = (...fields: AuthFieldKey[]) => {
    setInvalidFields({
      email: false,
      password: false,
      name: false,
      username: false,
      code: false,
      newPassword: false,
      confirmNewPassword: false,
      ...Object.fromEntries(fields.map((field) => [field, true])),
    });
  };

  const clearInvalidField = (field: AuthFieldKey) => {
    setInvalidFields((prev) => ({ ...prev, [field]: false }));
  };

  const markCurrentStepInvalid = () => {
    const markFilledFields = (fields: Array<[AuthFieldKey, string]>) => {
      const filledFields = fields
        .filter(([, value]) => value.trim().length > 0)
        .map(([field]) => field);

      setInvalidFieldState(...filledFields);
    };

    if (resetStep) {
      markFilledFields([
        ["newPassword", newPassword],
        ["confirmNewPassword", confirmNewPassword],
      ]);
      return;
    }

    if (forgotStep || verifyStep) {
      markFilledFields([["code", code]]);
      return;
    }

    if (isSignup) {
      markFilledFields([
        ["email", email],
        ["name", name],
        ["username", username],
        ["password", password],
      ]);
      return;
    }

    if (showPassword) {
      markFilledFields([
        ["email", email],
        ["password", password],
      ]);
      return;
    }

    markFilledFields([["email", email]]);
  };

  const shouldMarkInvalidFromError = (error: unknown) => {
    return (
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      Boolean((error as { response?: unknown }).response)
    );
  };

  const markSignupErrorFields = (error: unknown) => {
    if (!shouldMarkInvalidFromError(error)) {
      return;
    }

    const response = (
      error as {
        response?: { status?: number; data?: { message?: string } };
      }
    ).response;

    const message = response?.data?.message?.toLowerCase() ?? "";

    if (
      response?.status === 409 &&
      message.includes("username already exists")
    ) {
      setInvalidFieldState("username");
      return;
    }

    if (
      (response?.status === 409 && message.includes("email already exists")) ||
      response?.status === 400 ||
      response?.status === 503 ||
      message.includes("email")
    ) {
      setInvalidFieldState("email");
    }
  };

  useEffect(() => {
    if (!forgotStep && !verifyStep) return;

    if (resendTimer === 0) {
      setCanResend(true);
      return;
    }

    const timer = setTimeout(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendTimer, forgotStep, verifyStep]);

  useEffect(() => {
    if (!showPassword || forgotStep || resetStep || isSignup) return;

    const frame = window.requestAnimationFrame(() => {
      passwordInputRef.current?.focus();
      passwordInputRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [showPassword, forgotStep, resetStep, isSignup]);

  useEffect(() => {
    if (verifyStep) {
      setIsSignupPasswordVisible(false);
    }
  }, [verifyStep]);

  const handleSubmitKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;

    e.preventDefault();

    if (isSubmitDisabled) return;

    handleContinue();
  };

  const handleResendVerification = () => {
    if (!isValidEmail || !validName || !validUsername || !validPassword) {
      toast.error("Please fill valid signup details before resending code");
      return;
    }

    setLoading(true);
    setLoadingSource("resend");

    const promise = signup({
      email: normalizedEmail,
      name: name.trim(),
      username: username.trim(),
      password,
    });

    promise
      .then(() => {
        setResendTimer(60);
        setCanResend(false);
        setCode("");
      })
      .catch((error: unknown) => {
        markSignupErrorFields(error);
        toast.error(getApiErrorMessage(error, "Something went wrong"));
      })
      .finally(() => {
        setLoading(false);
        setLoadingSource(null);
      });
  };

  const handleContinue = () => {
    if (!normalizedEmail) return;

    if (!isValidEmail) {
      toast.error("Please provide a valid email");
      return;
    }

    if (showPassword && !forgotStep && !validPassword) {
      toast.error("Password must be between 6 and 50 characters");
      return;
    }

    if (isSignup && !verifyStep) {
      if (!validName) {
        toast.error(
          "Name must be 1-20 chars: letters, numbers, and spaces only",
        );
        return;
      }

      if (!validUsername) {
        toast.error(
          "Username must be 6-20 chars: lowercase letters and numbers only",
        );
        return;
      }

      if (!validPassword) {
        toast.error("Password must be between 6 and 50 characters");
        return;
      }
    }

    if (resetStep) {
      if (!validNewPassword) {
        toast.error("New password must be between 6 and 50 characters");
        return;
      }

      if (newPassword !== confirmNewPassword) {
        toast.error("Passwords do not match");
        return;
      }
    }

    setLoading(true);
    setLoadingSource("submit");

    // STEP 1 — check email
    if (!showPassword && !isSignup) {
      const promise = checkUserExist({ email: normalizedEmail });

      promise
        .then((data) => {
          if (data.result.exist) {
            setShowPassword(true);
          } else {
            setIsSignup(true);
          }
        })
        .catch((error: unknown) => {
          if (shouldMarkInvalidFromError(error)) {
            markCurrentStepInvalid();
          }
          toast.error(getApiErrorMessage(error, "Something went wrong"));
        });

      promise.finally(() => {
        setLoading(false);
        setLoadingSource(null);
      });
    }

    // STEP 2 — sign in
    else if (showPassword && !forgotStep) {
      const promise = signin({ email: normalizedEmail, password });

      promise
        .then((data) => {
          const { user, accessToken } = data.result;
          setAuth(user, accessToken);
          navigate("/dashboard");
        })
        .catch((error: unknown) => {
          if (shouldMarkInvalidFromError(error)) {
            setInvalidFieldState(password.trim() ? "password" : "email");
          }

          toast.error(getApiErrorMessage(error, "Signin failed"));
        });

      promise.finally(() => {
        setLoading(false);
        setLoadingSource(null);
      });
    }

    // Forgot verify
    else if (forgotStep && !resetStep) {
      const promise = forgotPasswordVerify({
        email: normalizedEmail,
        code,
      });

      promise
        .then(() => {
          setResetStep(true);
        })
        .catch((error: unknown) => {
          if (shouldMarkInvalidFromError(error)) {
            markCurrentStepInvalid();
          }
          toast.error(getApiErrorMessage(error, "Verification failed"));
        });

      promise.finally(() => {
        setLoading(false);
        setLoadingSource(null);
      });
    }

    // Reset password
    else if (resetStep) {
      const promise = resetPassword({
        email: normalizedEmail,
        newPassword,
      });

      promise
        .then((data) => {
          const { user, accessToken } = data.result;
          setAuth(user, accessToken);
          navigate("/dashboard");
        })
        .catch((error: unknown) => {
          if (shouldMarkInvalidFromError(error)) {
            markCurrentStepInvalid();
          }
          toast.error(getApiErrorMessage(error, "Reset password failed"));
        });

      promise.finally(() => {
        setLoading(false);
        setLoadingSource(null);
      });
    }

    // STEP 3 — signup
    else if (isSignup && !verifyStep) {
      const promise = signup({
        email: normalizedEmail,
        name: name.trim(),
        username: username.trim(),
        password,
      });

      promise
        .then(() => {
          setVerifyStep(true);
          setResendTimer(60);
          setCanResend(false);
        })
        .catch((error: unknown) => {
          markSignupErrorFields(error);
          toast.error(getApiErrorMessage(error, "Signup failed"));
        });

      promise.finally(() => {
        setLoading(false);
        setLoadingSource(null);
      });
    }

    // STEP 4 — verify email
    else if (verifyStep) {
      const promise = signupVerify({ email: normalizedEmail, code });

      promise
        .then((data) => {
          const { user, accessToken } = data.result;
          setAuth(user, accessToken);
          navigate("/dashboard");
        })
        .catch((error: unknown) => {
          if (shouldMarkInvalidFromError(error)) {
            markCurrentStepInvalid();
          }
          toast.error(getApiErrorMessage(error, "Verification failed"));
        });

      promise.finally(() => {
        setLoading(false);
        setLoadingSource(null);
      });
    }
  };

  const handleGoogleSuccess = async (
    credentialResponse: CredentialResponse,
  ) => {
    const credential = credentialResponse.credential;

    if (!credential) {
      toast.error("Google signin failed!");
      return;
    }

    setLoading(true);
    setLoadingSource("google");

    try {
      const promise = signinGoogle({ credential });
      const data = await promise;
      const { user, accessToken } = data.result;
      setAuth(user, accessToken);
      navigate("/dashboard");
    } catch (error) {
      if (shouldMarkInvalidFromError(error)) {
        markCurrentStepInvalid();
      }
      toast.error(getApiErrorMessage(error, "Google signin failed!"));
    } finally {
      setLoading(false);
      setLoadingSource(null);
    }
  };

  const handleGoogleError = () => {
    setLoading(false);
    setLoadingSource(null);
    toast.error("Google signin failed!");
  };

  const handleForgotPassword = () => {
    if (!isValidEmail) {
      toast.error("Please provide a valid email");
      return;
    }

    setLoading(true);
    setLoadingSource("forgot");

    const promise = forgotPassword({ email: normalizedEmail });

    promise
      .then(() => {
        setForgotStep(true);
        setResendTimer(60);
        setCanResend(false);
      })
      .catch((error: unknown) => {
        if (shouldMarkInvalidFromError(error)) {
          setInvalidFieldState("email");
        }
        toast.error(getApiErrorMessage(error, "Failed to send code!"));
      })
      .finally(() => {
        setLoading(false);
        setLoadingSource(null);
      });
  };

  const handleStepBack = () => {
    setInvalidFieldState();

    if (resetStep) {
      setResetStep(false);
      setCode("");
      setNewPassword("");
      setConfirmNewPassword("");
      setIsNewPasswordVisible(false);
      setIsConfirmPasswordVisible(false);
      return;
    }

    if (forgotStep) {
      setForgotStep(false);
      setResetStep(false);
      setCode("");
      setResendTimer(60);
      setCanResend(false);
      return;
    }

    if (verifyStep) {
      setVerifyStep(false);
      setCode("");
      setResendTimer(60);
      setCanResend(false);
      return;
    }

    if (isSignup) {
      setIsSignup(false);
      setName("");
      setUsername("");
      setPassword("");
      setIsSignupPasswordVisible(false);
      return;
    }

    if (showPassword) {
      setShowPassword(false);
      setPassword("");
      setIsSigninPasswordVisible(false);
      return;
    }

    handleGoBack();
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/");
  };

  const handleResendCode = () => {
    if (!isValidEmail) {
      toast.error("Please provide a valid email");
      return;
    }

    setLoading(true);
    setLoadingSource("resend");

    const promise = forgotPassword({ email: normalizedEmail });

    promise
      .then(() => {
        setResendTimer(60);
        setCanResend(false);
        setCode("");
      })
      .catch((error: unknown) => {
        if (shouldMarkInvalidFromError(error)) {
          setInvalidFieldState("code");
        }
        toast.error(getApiErrorMessage(error, "Failed to resend code!"));
      })
      .finally(() => {
        setLoading(false);
        setLoadingSource(null);
      });
  };

  const title = resetStep
    ? "Reset password"
    : forgotStep
      ? "Verify your email"
      : verifyStep
        ? "Verify your email"
        : showPassword
          ? "Sign in"
          : isSignup
            ? "Sign up"
            : "Welcome";

  const description = resetStep
    ? "Create a new password for your account"
    : forgotStep
      ? "Enter the verification code sent to your email"
      : verifyStep
        ? "Enter the verification code to finish creating your account"
        : showPassword
          ? "Enter your password to sign in"
          : isSignup
            ? "Create your account"
            : "Enter your email or continue with OAuth";

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="px-6 pt-4 pb-4">
          <div className="mb-1 flex items-center justify-start">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              onClick={handleStepBack}
              disabled={loading}
              aria-label="Go back one step"
              title="Go back one step"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          <div className="mb-4 flex flex-col items-center gap-2 text-center">
            <img
              src="/query-trade.svg"
              alt={`${APP_NAME} logo`}
              className="h-10 w-10 shrink-0"
            />
            <p className="text-lg font-semibold tracking-tight text-primary">
              {APP_NAME}
            </p>
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 px-6 pt-0 pb-6">
          {!showPassword && !isSignup && (
            <>
              <div className="relative w-full">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                >
                  {isGoogleLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FcGoogle className="mr-2" />
                  )}
                  Continue with Google
                </Button>

                <div
                  className={`absolute inset-0 overflow-hidden rounded-md opacity-0 ${
                    loading ? "pointer-events-none" : ""
                  }`}
                  aria-hidden="true"
                >
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    text="continue_with"
                    shape="rectangular"
                    width="400"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border"></div>
                <span className="text-xs text-muted-foreground">OR</span>
                <div className="h-px flex-1 bg-border"></div>
              </div>
            </>
          )}

          {/* EMAIL */}
          <div className="space-y-2">
            <Label>Email</Label>
            <AuthInput
              icon={Mail}
              type="email"
              placeholder="you@example.com"
              aria-label="Email"
              value={email}
              aria-invalid={invalidFields.email}
              disabled={showPassword || isSignup || loading}
              onChange={(e) => {
                clearInvalidField("email");
                setEmail(e.target.value.toLowerCase());
              }}
              onKeyDown={handleSubmitKeyDown}
            />
          </div>

          {/* SIGNIN PASSWORD */}
          {showPassword && !forgotStep && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label>Password</Label>
              </div>
              <AuthInput
                icon={LockKeyhole}
                ref={passwordInputRef}
                type={isSigninPasswordVisible ? "text" : "password"}
                placeholder="Enter your password"
                aria-label="Password"
                isPasswordToggle
                isPasswordVisible={isSigninPasswordVisible}
                showPasswordToggle={password.length > 0}
                onTogglePasswordVisibility={() =>
                  setIsSigninPasswordVisible((prev) => !prev)
                }
                value={password}
                aria-invalid={invalidFields.password}
                disabled={loading}
                onChange={(e) => {
                  clearInvalidField("password");
                  setPassword(e.target.value);
                }}
                onKeyDown={handleSubmitKeyDown}
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleForgotPassword}
                  className={`text-xs ${
                    loading && loadingSource === "forgot"
                      ? "text-muted-foreground"
                      : "text-primary hover:text-primary/80"
                  }`}
                >
                  {loading && loadingSource === "forgot"
                    ? "Sending email code..."
                    : "Forgot password?"}
                </button>
              </div>
            </div>
          )}

          {forgotStep && !resetStep && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label>Email verification code</Label>
              </div>
              <AuthInput
                icon={KeyRound}
                placeholder="Enter 6 digit code"
                aria-label="Email verification code"
                value={code}
                maxLength={6}
                aria-invalid={invalidFields.code}
                disabled={loading}
                onChange={(e) => {
                  clearInvalidField("code");
                  setCode(e.target.value.replace(/[^0-9]/g, ""));
                }}
                onKeyDown={handleSubmitKeyDown}
              />

              <div className="flex justify-end">
                {canResend ? (
                  <button
                    type="button"
                    disabled={loading || !canResend}
                    onClick={handleResendCode}
                    className={`text-xs ${
                      loading && loadingSource === "resend"
                        ? "text-muted-foreground"
                        : "text-primary hover:text-primary/80"
                    }`}
                  >
                    {loading && loadingSource === "resend"
                      ? "Resending code..."
                      : "Resend code"}
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Resend in {resendTimer}s
                  </span>
                )}
              </div>
            </div>
          )}

          {resetStep && (
            <>
              <div className="space-y-2">
                <Label>New password</Label>
                <AuthInput
                  icon={LockKeyhole}
                  type={isNewPasswordVisible ? "text" : "password"}
                  placeholder="New password"
                  aria-label="New password"
                  isPasswordToggle
                  isPasswordVisible={isNewPasswordVisible}
                  showPasswordToggle={newPassword.length > 0}
                  onTogglePasswordVisibility={() =>
                    setIsNewPasswordVisible((prev) => !prev)
                  }
                  value={newPassword}
                  aria-invalid={invalidFields.newPassword}
                  disabled={loading}
                  onChange={(e) => {
                    clearInvalidField("newPassword");
                    setNewPassword(e.target.value);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Confirm new password</Label>
                <AuthInput
                  icon={LockKeyhole}
                  type={isConfirmPasswordVisible ? "text" : "password"}
                  placeholder="Confirm new password"
                  aria-label="Confirm new password"
                  isPasswordToggle
                  isPasswordVisible={isConfirmPasswordVisible}
                  showPasswordToggle={confirmNewPassword.length > 0}
                  onTogglePasswordVisibility={() =>
                    setIsConfirmPasswordVisible((prev) => !prev)
                  }
                  value={confirmNewPassword}
                  aria-invalid={invalidFields.confirmNewPassword}
                  disabled={loading}
                  onChange={(e) => {
                    clearInvalidField("confirmNewPassword");
                    setConfirmNewPassword(e.target.value);
                  }}
                />
              </div>
            </>
          )}

          {/* SIGNUP FIELDS */}
          {isSignup && (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label>Name</Label>
                </div>
                <AuthInput
                  icon={UserRound}
                  placeholder="Full name"
                  aria-label="Name"
                  value={name}
                  maxLength={20}
                  aria-invalid={invalidFields.name}
                  disabled={loading || verifyStep}
                  onChange={(e) => {
                    clearInvalidField("name");
                    setName(e.target.value);
                  }}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label>Username</Label>
                </div>
                <AuthInput
                  icon={AtSign}
                  placeholder="Username"
                  aria-label="Username"
                  value={username}
                  maxLength={20}
                  aria-invalid={invalidFields.username}
                  disabled={loading || verifyStep}
                  onChange={(e) => {
                    clearInvalidField("username");
                    setUsername(
                      e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""),
                    );
                  }}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label>Password</Label>
                </div>
                <AuthInput
                  icon={LockKeyhole}
                  type={isSignupPasswordVisible ? "text" : "password"}
                  placeholder="Create a password"
                  aria-label="Password"
                  isPasswordToggle
                  isPasswordVisible={isSignupPasswordVisible}
                  showPasswordToggle={password.length > 0}
                  onTogglePasswordVisibility={() =>
                    setIsSignupPasswordVisible((prev) => !prev)
                  }
                  value={password}
                  aria-invalid={invalidFields.password}
                  onChange={(e) => {
                    clearInvalidField("password");
                    setPassword(e.target.value);
                  }}
                  disabled={loading || verifyStep}
                  onKeyDown={handleSubmitKeyDown}
                />
              </div>
            </>
          )}

          {verifyStep && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label>Email verification code</Label>
              </div>
              <AuthInput
                icon={KeyRound}
                placeholder="Enter 6 digit code"
                aria-label="Email verification code"
                value={code}
                maxLength={6}
                aria-invalid={invalidFields.code}
                disabled={loading}
                onChange={(e) => {
                  clearInvalidField("code");
                  setCode(e.target.value.replace(/[^0-9]/g, ""));
                }}
                onKeyDown={handleSubmitKeyDown}
              />

              <div className="flex justify-end">
                {canResend ? (
                  <button
                    type="button"
                    disabled={loading || !canResend}
                    onClick={handleResendVerification}
                    className={`text-xs ${
                      loading && loadingSource === "resend"
                        ? "text-muted-foreground"
                        : "text-primary hover:text-primary/80"
                    }`}
                  >
                    {loading && loadingSource === "resend"
                      ? "Resending code..."
                      : "Resend code"}
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Resend in {resendTimer}s
                  </span>
                )}
              </div>
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleContinue}
            disabled={isSubmitDisabled}
          >
            {shouldShowContinueSpinner ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : resetStep ? (
              "Reset password"
            ) : forgotStep ? (
              "Verify"
            ) : showPassword ? (
              "Sign in"
            ) : isSignup && !verifyStep ? (
              "Next"
            ) : verifyStep ? (
              "Sign up"
            ) : (
              "Continue"
            )}
          </Button>

          {!showPassword && !isSignup && !forgotStep && !resetStep && (
            <p className="text-center text-xs leading-5 text-muted-foreground">
              By clicking Continue, you agree to our Terms of Service and
              Privacy Policy.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
