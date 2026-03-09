/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import { useGoogleLogin } from "@react-oauth/google"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"

import { FcGoogle } from "react-icons/fc"
import { SiBinance } from "react-icons/si"

import { useAuthStore } from "@/store/auth"

import {
  checkUserExist,
  forgotPassword,
  forgotPasswordVerify,
  resetPassword,
  signin,
  signinGoogle,
  signup,
  signupVerify,
} from "@/api/auth"
import { CircleHelp, Loader2 } from "lucide-react"
import { toast } from "sonner"
import axios from "axios"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const NAME_REGEX = /^[A-Za-z0-9 ]{1,20}$/
const USERNAME_REGEX = /^[a-z0-9]{6,20}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidPassword(value: string) {
  return value.length >= 6 && value.length <= 50
}

export default function Auth() {
  const navigate = useNavigate()

  const setAuth = useAuthStore((state) => state.setAuth)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")

  const [showPassword, setShowPassword] = useState(false)
  const [isSignup, setIsSignup] = useState(false)

  const [verifyStep, setVerifyStep] = useState(false)
  const [code, setCode] = useState("")

  const [loading, setLoading] = useState(false)
  const [forgotStep, setForgotStep] = useState(false)
  const [resetStep, setResetStep] = useState(false)

  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")

  const [resendTimer, setResendTimer] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const [isNameTipOpen, setIsNameTipOpen] = useState(false)
  const [isUsernameTipOpen, setIsUsernameTipOpen] = useState(false)
  const [isPasswordTipOpen, setIsPasswordTipOpen] = useState(false)
  const [isEmailCodeTipOpen, setIsEmailCodeTipOpen] = useState(false)

  const normalizedEmail = email.trim().toLowerCase()
  const isValidEmail = EMAIL_REGEX.test(normalizedEmail)
  const validName = NAME_REGEX.test(name.trim())
  const validUsername = USERNAME_REGEX.test(username.trim())
  const validPassword = isValidPassword(password)
  const validNewPassword = isValidPassword(newPassword)

  useEffect(() => {
    if (!forgotStep && !verifyStep) return

    if (resendTimer === 0) {
      setCanResend(true)
      return
    }

    const timer = setTimeout(() => {
      setResendTimer((prev) => prev - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [resendTimer, forgotStep, verifyStep])

  const handleResendVerification = async () => {
    if (!isValidEmail || !validName || !validUsername || !validPassword) {
      toast.error("Please fill valid signup details before resending code")
      return
    }

    setLoading(true)
    try {
      await signup({
        email: normalizedEmail,
        name: name.trim(),
        username: username.trim(),
        password,
      })

      toast.success("Email code resend success.")

      setResendTimer(60)
      setCanResend(false)
      setCode("")
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = async () => {
    if (!normalizedEmail) return

    if (!isValidEmail) {
      toast.error("Please provide a valid email")
      return
    }

    if (showPassword && !forgotStep && !validPassword) {
      toast.error("Password must be between 6 and 50 characters")
      return
    }

    if (isSignup && !verifyStep) {
      if (!validName) {
        toast.error(
          "Name must be 1-20 chars: letters, numbers, and spaces only"
        )
        return
      }

      if (!validUsername) {
        toast.error(
          "Username must be 6-20 chars: lowercase letters and numbers only"
        )
        return
      }

      if (!validPassword) {
        toast.error("Password must be between 6 and 50 characters")
        return
      }
    }

    if (resetStep) {
      if (!validNewPassword) {
        toast.error("New password must be between 6 and 50 characters")
        return
      }

      if (newPassword !== confirmNewPassword) {
        toast.error("Passwords do not match")
        return
      }
    }

    setLoading(true)

    try {
      // STEP 1 — check email
      if (!showPassword && !isSignup) {
        const data = await checkUserExist(normalizedEmail)

        if (data.result.exist) {
          setShowPassword(true)
        } else {
          setIsSignup(true)
        }
      }

      // STEP 2 — sign in
      else if (showPassword && !forgotStep) {
        const data = await signin({ email: normalizedEmail, password })

        const { user, accessToken } = data.result

        setAuth(user, accessToken)

        toast.success(data.message)

        navigate("/dashboard")
      }

      // Forgot password
      else if (forgotStep && !resetStep) {
        const data = await forgotPasswordVerify({
          email: normalizedEmail,
          code,
        })

        toast.success(data.message)

        setResetStep(true)
      }

      // Reset password
      else if (resetStep) {
        const data = await resetPassword({
          email: normalizedEmail,
          newPassword,
        })

        const { user, accessToken } = data.result

        setAuth(user, accessToken)

        toast.success(data.message)

        navigate("/dashboard")
      }

      // STEP 3 — sign up
      else if (isSignup && !verifyStep) {
        const data = await signup({
          email: normalizedEmail,
          name: name.trim(),
          username: username.trim(),
          password,
        })

        toast.success(data.message)
        setVerifyStep(true)

        setResendTimer(60)
        setCanResend(false)
      }

      // STEP 4 - verify email
      else if (verifyStep) {
        const data = await signupVerify({ email: normalizedEmail, code })
        const { user, accessToken } = data.result

        setAuth(user, accessToken)

        toast.success(data.message)

        navigate("/dashboard")
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const loginGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true)

      try {
        // get user info from google
        const userInfo = await axios.get(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
          }
        )

        const { name, email, picture, sub: googleId } = userInfo.data

        const data = await signinGoogle({
          name,
          email,
          avatar: picture,
          googleId,
        })

        const { user, accessToken } = data.result

        setAuth(user, accessToken)

        toast.success(data.message)

        navigate("/dashboard")
      } catch (error: any) {
        toast.error(error?.response?.data?.message || "Google signin failed!")
      } finally {
        setLoading(false)
      }
    },
    onError: () => {
      setLoading(false)
      toast.error("Google signin failed!")
    },
  })

  const handleForgotPassword = async () => {
    if (!isValidEmail) {
      toast.error("Please provide a valid email")
      return
    }

    setLoading(true)

    try {
      const data = await forgotPassword({ email: normalizedEmail })

      toast.success(data.message)

      setForgotStep(true)

      setResendTimer(60)
      setCanResend(false)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to send code!")
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (!isValidEmail) {
      toast.error("Please provide a valid email")
      return
    }

    setLoading(true)

    try {
      const data = await forgotPassword({ email: normalizedEmail })

      toast.success(data.message)

      setResendTimer(60)
      setCanResend(false)
      setCode("")
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to resend code!")
    } finally {
      setLoading(false)
    }
  }

  const title = showPassword ? "Sign in" : isSignup ? "Sing up" : "Welcome"

  const description = showPassword
    ? "Enter your password to sign in"
    : isSignup
      ? "Create your account"
      : "Enter your email or continue with OAuth"

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-6">
      <TooltipProvider>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {!showPassword && !isSignup && (
              <>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                  onClick={() => loginGoogle()}
                >
                  <FcGoogle className="mr-2" />
                  Continue with Google
                </Button>

                <Button variant="outline" className="w-full" disabled={true}>
                  <SiBinance className="mr-2 text-yellow-500" />
                  Continue with Binance
                </Button>

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
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleContinue()
                }}
              />
            </div>

            {/* SIGNIN PASSWORD */}
            {showPassword && !forgotStep && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label>Password</Label>
                  <Tooltip
                    open={isPasswordTipOpen}
                    onOpenChange={setIsPasswordTipOpen}
                  >
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex cursor-help items-center text-muted-foreground hover:text-foreground"
                        aria-label="Password requirements"
                        onClick={() => setIsPasswordTipOpen((prev) => !prev)}
                      >
                        <CircleHelp className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={6}>
                      Password must be 6-50 characters.
                    </TooltipContent>
                  </Tooltip>
                </div>

                <Input
                  type="password"
                  value={password}
                  disabled={loading}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleContinue()
                  }}
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
                  <Tooltip
                    open={isEmailCodeTipOpen}
                    onOpenChange={setIsEmailCodeTipOpen}
                  >
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex cursor-help items-center text-muted-foreground hover:text-foreground"
                        aria-label="Email verification help"
                        onClick={() => setIsEmailCodeTipOpen((prev) => !prev)}
                      >
                        <CircleHelp className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={6}>
                      Email code was sent to your inbox. If you cannot find it,
                      check your spam or junk folder.
                    </TooltipContent>
                  </Tooltip>
                </div>

                <Input
                  placeholder="Enter 6 digit code"
                  value={code}
                  maxLength={6}
                  disabled={loading}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/[^0-9]/g, ""))
                  }
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
                    <Tooltip
                      open={isNameTipOpen}
                      onOpenChange={setIsNameTipOpen}
                    >
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex cursor-help items-center text-muted-foreground hover:text-foreground"
                          aria-label="Name requirements"
                          onClick={() => setIsNameTipOpen((prev) => !prev)}
                        >
                          <CircleHelp className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={6}>
                        Letters, numbers, and spaces only (1-20 characters).
                      </TooltipContent>
                    </Tooltip>
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
                    <Tooltip
                      open={isUsernameTipOpen}
                      onOpenChange={setIsUsernameTipOpen}
                    >
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex cursor-help items-center text-muted-foreground hover:text-foreground"
                          aria-label="Username requirements"
                          onClick={() => setIsUsernameTipOpen((prev) => !prev)}
                        >
                          <CircleHelp className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={6}>
                        Lowercase letters and numbers only (6-20 characters).
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    value={username}
                    maxLength={20}
                    disabled={loading || verifyStep}
                    onChange={(e) =>
                      setUsername(
                        e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "")
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label>Password</Label>
                    <Tooltip
                      open={isPasswordTipOpen}
                      onOpenChange={setIsPasswordTipOpen}
                    >
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex cursor-help items-center text-muted-foreground hover:text-foreground"
                          aria-label="Password requirements"
                          onClick={() => setIsPasswordTipOpen((prev) => !prev)}
                        >
                          <CircleHelp className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={6}>
                        Password must be 6-50 characters.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading || verifyStep}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleContinue()
                    }}
                  />
                </div>
              </>
            )}

            {verifyStep && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label>Email verification code</Label>
                  <Tooltip
                    open={isEmailCodeTipOpen}
                    onOpenChange={setIsEmailCodeTipOpen}
                  >
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex cursor-help items-center text-muted-foreground hover:text-foreground"
                        aria-label="Email verification help"
                        onClick={() => setIsEmailCodeTipOpen((prev) => !prev)}
                      >
                        <CircleHelp className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={6}>
                      Email code was sent to your inbox. If you cannot find it,
                      check your spam or junk folder.
                    </TooltipContent>
                  </Tooltip>
                </div>

                <Input
                  placeholder="Enter 6 digit code"
                  value={code}
                  maxLength={6}
                  disabled={loading}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/[^0-9]/g, ""))
                  }
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
              disabled={
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
                ((verifyStep || (forgotStep && !resetStep)) &&
                  code.length !== 6)
              }
            >
              {loading ? (
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
      </TooltipProvider>
    </div>
  )
}
