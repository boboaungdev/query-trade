import { useEffect, useRef, useState, type KeyboardEvent } from "react";
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
import { ChevronLeft, Loader2, X } from "lucide-react";
import { toast } from "sonner";

const NAME_REGEX = /^[A-Za-z0-9 ]{1,20}$/;
const USERNAME_REGEX = /^[a-z0-9]{6,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidPassword(value: string) {
  return value.length >= 6 && value.length <= 50;
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
  const isSubmitDisabled =
    loading ||
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

    toast.promise(promise, {
      loading: "Resending verification code...",
      success: "Email code resend success.",
      error: (error: unknown) =>
        getApiErrorMessage(error, "Something went wrong"),
    });

    promise
      .then(() => {
        setResendTimer(60);
        setCanResend(false);
        setCode("");
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

      toast.promise(promise, {
        loading: "Checking account...",
        success: () => {
          promise.then((data) => {
            if (data.result.exist) {
              setShowPassword(true);
            } else {
              setIsSignup(true);
            }
          });
          return "Email checked";
        },
        error: (error: unknown) =>
          getApiErrorMessage(error, "Something went wrong"),
      });

      promise.finally(() => {
        setLoading(false);
        setLoadingSource(null);
      });
    }

    // STEP 2 — sign in
    else if (showPassword && !forgotStep) {
      const promise = signin({ email: normalizedEmail, password });

      toast.promise(promise, {
        loading: "Signing in...",
        success: (data) => {
          const { user, accessToken } = data.result;
          setAuth(user, accessToken);
          navigate("/dashboard");
          return data.message;
        },
        error: (error: unknown) => getApiErrorMessage(error, "Signin failed"),
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

      toast.promise(promise, {
        loading: "Verifying code...",
        success: (data) => {
          setResetStep(true);
          return data.message;
        },
        error: (error: unknown) =>
          getApiErrorMessage(error, "Verification failed"),
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

      toast.promise(promise, {
        loading: "Resetting password...",
        success: (data) => {
          const { user, accessToken } = data.result;
          setAuth(user, accessToken);
          navigate("/dashboard");
          return data.message;
        },
        error: (error: unknown) =>
          getApiErrorMessage(error, "Reset password failed"),
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

      toast.promise(promise, {
        loading: "Creating account...",
        success: (data) => {
          setVerifyStep(true);
          setResendTimer(60);
          setCanResend(false);
          return data.message;
        },
        error: (error: unknown) => getApiErrorMessage(error, "Signup failed"),
      });

      promise.finally(() => {
        setLoading(false);
        setLoadingSource(null);
      });
    }

    // STEP 4 — verify email
    else if (verifyStep) {
      const promise = signupVerify({ email: normalizedEmail, code });

      toast.promise(promise, {
        loading: "Verifying email...",
        success: (data) => {
          const { user, accessToken } = data.result;
          setAuth(user, accessToken);
          navigate("/dashboard");
          return data.message;
        },
        error: (error: unknown) =>
          getApiErrorMessage(error, "Verification failed"),
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

      toast.promise(promise, {
        loading: "Signing in with Google...",
        success: (data) => {
          const { user, accessToken } = data.result;
          setAuth(user, accessToken);
          navigate("/dashboard");
          return data.message;
        },
        error: (error: unknown) =>
          getApiErrorMessage(error, "Google signin failed!"),
      });

      await promise;
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

    toast.promise(promise, {
      loading: "Sending reset code...",
      success: (data) => data.message,
      error: (error: unknown) =>
        getApiErrorMessage(error, "Failed to send code!"),
    });

    promise
      .then(() => {
        setForgotStep(true);
        setResendTimer(60);
        setCanResend(false);
      })
      .finally(() => {
        setLoading(false);
        setLoadingSource(null);
      });
  };

  const handleStepBack = () => {
    if (resetStep) {
      setResetStep(false);
      setCode("");
      setNewPassword("");
      setConfirmNewPassword("");
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
      return;
    }

    if (showPassword) {
      setShowPassword(false);
      setPassword("");
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

  const handleClose = () => {
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

    toast.promise(promise, {
      loading: "Resending code...",
      success: (data) => data.message,
      error: (error: unknown) =>
        getApiErrorMessage(error, "Failed to resend code!"),
    });

    promise
      .then(() => {
        setResendTimer(60);
        setCanResend(false);
        setCode("");
      })
      .finally(() => {
        setLoading(false);
        setLoadingSource(null);
      });
  };

  const title = showPassword ? "Sign in" : isSignup ? "Sign up" : "Welcome";

  const description = showPassword
    ? "Enter your password to sign in"
    : isSignup
      ? "Create your account"
      : "Enter your email or continue with OAuth";

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-6">
      <Card className="w-full max-w-sm">
          <CardHeader>
            <div className="mb-2 flex items-center justify-between">
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
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                onClick={handleClose}
                disabled={loading}
                aria-label="Close"
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
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
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                disabled={showPassword || isSignup || loading}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                onKeyDown={handleSubmitKeyDown}
              />
            </div>

            {/* SIGNIN PASSWORD */}
            {showPassword && !forgotStep && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label>Password</Label>
                </div>

                <Input
                  ref={passwordInputRef}
                  type="password"
                  value={password}
                  disabled={loading}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleSubmitKeyDown}
                />

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleForgotPassword}
                    className="text-xs text-muted-foreground hover:text-primary"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
            )}

            {forgotStep && !resetStep && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label>Email verification code</Label>
                </div>

                <Input
                  placeholder="Enter 6 digit code"
                  value={code}
                  maxLength={6}
                  disabled={loading}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  onKeyDown={handleSubmitKeyDown}
                />

                <div className="flex justify-end">
                  {canResend ? (
                    <button
                      type="button"
                      disabled={loading || !canResend}
                      onClick={handleResendCode}
                      className="text-xs text-muted-foreground hover:text-primary"
                    >
                      Resend code
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
                  <Input
                    type="password"
                    value={newPassword}
                    disabled={loading}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Confirm new password</Label>
                  <Input
                    type="password"
                    value={confirmNewPassword}
                    disabled={loading}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
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
                  <Input
                    value={name}
                    maxLength={20}
                    disabled={loading || verifyStep}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label>Username</Label>
                  </div>
                  <Input
                    value={username}
                    maxLength={20}
                    disabled={loading || verifyStep}
                    onChange={(e) =>
                      setUsername(
                        e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""),
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label>Password</Label>
                  </div>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

                <Input
                  placeholder="Enter 6 digit code"
                  value={code}
                  maxLength={6}
                  disabled={loading}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  onKeyDown={handleSubmitKeyDown}
                />

                <div className="flex justify-end">
                  {canResend ? (
                    <button
                      type="button"
                      disabled={loading || !canResend}
                      onClick={handleResendVerification}
                      className="text-xs text-muted-foreground hover:text-primary"
                    >
                      Resend code
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
          </CardContent>
      </Card>
    </div>
  );
}
