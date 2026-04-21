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
  CheckCircle2,
  ChevronLeft,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  RefreshCw,
  UserRound,
  XCircle,
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

type UsernameStatus =
  | "idle"
  | "invalid"
  | "checking"
  | "available"
  | "unavailable"
  | "error";

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
  const [debouncedUsername, setDebouncedUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const usernameRequestIdRef = useRef(0);

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
      (!validName ||
        !validUsername ||
        usernameStatus !== "available" ||
        !validPassword)) ||
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
    if (!isSignup || verifyStep) {
      setDebouncedUsername("");
      setUsernameStatus("idle");
      return;
    }

    const normalizedUsername = username.trim();

    if (!normalizedUsername) {
      setDebouncedUsername("");
      setUsernameStatus("idle");
      return;
    }

    if (!USERNAME_REGEX.test(normalizedUsername)) {
      setDebouncedUsername("");
      setUsernameStatus("invalid");
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDebouncedUsername(normalizedUsername);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isSignup, username, verifyStep]);

  useEffect(() => {
    if (!isSignup || verifyStep || !debouncedUsername) {
      return;
    }

    if (debouncedUsername !== username.trim()) {
      return;
    }

    const requestId = usernameRequestIdRef.current + 1;
    usernameRequestIdRef.current = requestId;
    setUsernameStatus("checking");

    checkUserExist({ username: debouncedUsername })
      .then((data) => {
        if (usernameRequestIdRef.current !== requestId) {
          return;
        }

        setUsernameStatus(data?.result?.exist ? "unavailable" : "available");
      })
      .catch(() => {
        if (usernameRequestIdRef.current !== requestId) {
          return;
        }

        setUsernameStatus("error");
      });
  }, [debouncedUsername, isSignup, username, verifyStep]);

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
        toast.success("Verification code sent");
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

    // STEP 1 â€” check email
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

    // STEP 2 â€” sign in
    else if (showPassword && !forgotStep) {
      const promise = signin({ email: normalizedEmail, password });

      promise
        .then((data) => {
          const { user, accessToken } = data.result;
          setAuth(user, accessToken);
          navigate("/strategy");
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
          navigate("/strategy");
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

    // STEP 3 â€” signup
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
          toast.success("Verification code sent");
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

    // STEP 4 â€” verify email
    else if (verifyStep) {
      const promise = signupVerify({ email: normalizedEmail, code });

      promise
        .then((data) => {
          const { user, accessToken } = data.result;
          setAuth(user, accessToken);
          navigate("/strategy");
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
      navigate("/strategy");
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
        toast.success("Verification code sent");
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
      setDebouncedUsername("");
      setUsernameStatus("idle");
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
        toast.success("Verification code sent");
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
  const isWelcomeState =
    !showPassword && !isSignup && !forgotStep && !resetStep && !verifyStep;
  const isUsernameSearchPending =
    isSignup &&
    !verifyStep &&
    validUsername &&
    username.trim().length > 0 &&
    username.trim() !== debouncedUsername;
  const isUsernameLiveInvalid =
    usernameStatus === "invalid" ||
    usernameStatus === "unavailable" ||
    usernameStatus === "error";
  const usernameHelperText =
    usernameStatus === "invalid"
      ? "Username must be 6-20 characters"
      : usernameStatus === "checking" || isUsernameSearchPending
        ? "Checking username availability..."
        : usernameStatus === "unavailable"
          ? "Username is not available"
          : usernameStatus === "error"
            ? "Unable to check username right now"
            : "";

  return (
    <div className="min-h-[80vh] p-6">
      <div className="mx-auto flex min-h-[80vh] max-w-6xl items-center justify-center">
        <div
          className={`w-full ${
            isWelcomeState
              ? "md:overflow-hidden md:rounded-[28px] md:border md:bg-card"
              : ""
          }`}
        >
          <div
            className={`grid w-full gap-6 ${
              isWelcomeState
                ? "md:grid-cols-[minmax(0,1.05fr)_1px_24rem] md:gap-0"
                : ""
            }`}
          >
            {isWelcomeState ? (
              <section className="relative hidden overflow-hidden rounded-[28px] border bg-gradient-to-br from-primary/12 via-background to-primary/5 p-8 md:block md:rounded-none md:border-0 md:p-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.55),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_28%)]" />
                <div className="relative flex h-full items-center">
                  <div className="max-w-md space-y-5 text-left">
                    <div className="flex items-center gap-3">
                      <img
                        src="/query-trade.svg"
                        alt={`${APP_NAME} logo`}
                        className="h-12 w-12 shrink-0"
                      />
                      <div className="inline-flex items-center rounded-full border bg-background/80 px-3 py-1 text-xs font-medium tracking-[0.18em] text-primary uppercase backdrop-blur">
                        {APP_NAME}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h2 className="text-4xl font-black tracking-tight text-foreground">
                        Discipline over emotion
                      </h2>
                      <p className="text-sm leading-6 text-muted-foreground">
                        Sign in or create your account to explore strategies,
                        build your setup, and run backtests in one place.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {isWelcomeState ? (
              <div className="hidden bg-border md:block" aria-hidden="true" />
            ) : null}

            <Card
              className={`w-full max-w-sm justify-self-center ${
                isWelcomeState
                  ? "md:max-w-none md:rounded-none md:border-0 md:shadow-none"
                  : ""
              }`}
            >
              <CardHeader
                className={`px-6 pb-4 ${isWelcomeState ? "pt-4" : "pt-4"}`}
              >
                <div
                  className={`flex items-center justify-start ${
                    isWelcomeState ? "mb-0 min-h-0" : "mb-1 min-h-9"
                  }`}
                >
                  {!isWelcomeState ? (
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
                  ) : null}
                </div>
                {isWelcomeState ? (
                  <div className="mb-4 flex flex-col items-center gap-2 text-center">
                    <img
                      src="/query-trade.svg"
                      alt={`${APP_NAME} logo`}
                      className="h-12 w-12 shrink-0"
                    />
                    <p className="text-lg font-semibold tracking-tight text-primary">
                      {APP_NAME}
                    </p>
                  </div>
                ) : null}

                {!isWelcomeState ? (
                  <div className="mb-4 flex flex-col items-center gap-2 text-center">
                    <img
                      src="/query-trade.svg"
                      alt={`${APP_NAME} logo`}
                      className="h-12 w-12 shrink-0"
                    />
                    <p className="text-lg font-semibold tracking-tight text-primary">
                      {APP_NAME}
                    </p>
                  </div>
                ) : null}
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>

              <CardContent
                className={`space-y-4 px-6 pt-0 ${isWelcomeState ? "pb-6" : "pb-6"}`}
              >
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
                  <Label className="text-muted-foreground">Email</Label>
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
                      <Label className="text-muted-foreground">Password</Label>
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
                      <Label className="text-muted-foreground">
                        Email verification code
                      </Label>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
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
                      </div>
                      {canResend ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 w-18 shrink-0 px-3 text-xs disabled:bg-input/50 dark:disabled:bg-input/80"
                          disabled={loading || !canResend}
                          onClick={handleResendCode}
                          aria-label="Resend code"
                          title="Resend code"
                        >
                          {loading && loadingSource === "resend" ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
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
                          aria-label={`Resend available in ${resendTimer} seconds`}
                          title={`Resend available in ${resendTimer} seconds`}
                        >
                          {resendTimer}s
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {resetStep && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">
                        New password
                      </Label>
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
                      <Label className="text-muted-foreground">
                        Confirm new password
                      </Label>
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
                        <Label className="text-muted-foreground">Name</Label>
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
                        <Label className="text-muted-foreground">
                          Username
                        </Label>
                      </div>
                      <div className="space-y-2">
                        <div className="relative">
                          <AtSign
                            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <Input
                            className="pl-9 pr-10"
                            placeholder="Username"
                            aria-label="Username"
                            value={username}
                            maxLength={20}
                            aria-invalid={
                              invalidFields.username || isUsernameLiveInvalid
                            }
                            disabled={loading || verifyStep}
                            onChange={(e) => {
                              clearInvalidField("username");
                              setUsername(
                                e.target.value
                                  .toLowerCase()
                                  .replace(/[^a-z0-9]/g, ""),
                              );
                            }}
                          />
                          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
                            {usernameStatus === "checking" ||
                            isUsernameSearchPending ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : usernameStatus === "available" ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : usernameStatus === "invalid" ||
                              usernameStatus === "unavailable" ||
                              usernameStatus === "error" ? (
                              <XCircle className="h-4 w-4 text-destructive" />
                            ) : null}
                          </span>
                        </div>
                        {usernameHelperText ? (
                          <p
                            className={`text-xs ${
                              usernameStatus === "invalid" ||
                              usernameStatus === "unavailable" ||
                              usernameStatus === "error"
                                ? "text-destructive"
                                : "text-muted-foreground"
                            }`}
                          >
                            {usernameHelperText}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-muted-foreground">
                          Password
                        </Label>
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
                      <Label className="text-muted-foreground">
                        Email verification code
                      </Label>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
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
                      </div>
                      {canResend ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 w-18 shrink-0 px-3 text-xs disabled:bg-input/50 dark:disabled:bg-input/80"
                          disabled={loading || !canResend}
                          onClick={handleResendVerification}
                          aria-label="Resend verification code"
                          title="Resend verification code"
                        >
                          {loading && loadingSource === "resend" ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
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
                          aria-label={`Resend available in ${resendTimer} seconds`}
                          title={`Resend available in ${resendTimer} seconds`}
                        >
                          {resendTimer}s
                        </Button>
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
        </div>
      </div>
    </div>
  );
}
