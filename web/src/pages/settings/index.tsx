import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import {
  Check,
  ChevronsUpDown,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/api/axios";
import {
  checkChangeEmail,
  connectGoogle,
  createPassword,
  deleteAccountVerify,
  deleteAccount,
  disconnectGoogle,
  verifyChangeEmail,
} from "@/api/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { AccountSection } from "./sections/account-section";
import { PreferencesSection } from "./sections/preferences-section";

const sections = [
  {
    id: "account",
    label: "Account & Security",
    description: "Identity, login methods, and session protection.",
    icon: ShieldCheck,
  },
  {
    id: "preferences",
    label: "Preferences",
    description: "Theme and app-level preferences.",
    icon: SlidersHorizontal,
  },
] as const;

export default function Settings() {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<
    (typeof sections)[number]["id"]
  >(sections[0].id);
  const [emailChangeStep, setEmailChangeStep] = useState<
    "idle" | "draft" | "verify"
  >("idle");
  const [emailChangePassword, setEmailChangePassword] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [newEmailCode, setNewEmailCode] = useState("");
  const [isCheckingChangeEmail, setIsCheckingChangeEmail] = useState(false);
  const [isSavingEmailChange, setIsSavingEmailChange] = useState(false);
  const [isUpdatingGoogleProvider, setIsUpdatingGoogleProvider] =
    useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isSendingDeleteVerify, setIsSendingDeleteVerify] = useState(false);

  const currentSection = useMemo(
    () =>
      sections.find((section) => section.id === activeSection) ?? sections[0],
    [activeSection],
  );

  const connectGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsUpdatingGoogleProvider(true);

      try {
        const userInfo = await axios.get(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
          },
        );

        const { sub: googleId } = userInfo.data;
        const promise = connectGoogle({ googleId });
        const data = await promise;

        if (data?.result?.user) {
          updateUser(data.result.user);
        }
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Failed to connect Google."));
      } finally {
        setIsUpdatingGoogleProvider(false);
      }
    },
    onError: () => {
      setIsUpdatingGoogleProvider(false);
      toast.error("Google connect failed!");
    },
  });

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const cancelEmailChange = () => {
    setEmailChangeStep("idle");
    setEmailChangePassword("");
    setEmailDraft("");
    setNewEmailCode("");
  };

  const verifyEmailChange = () => {
    const nextEmail = emailDraft.trim().toLowerCase();

    if (
      !nextEmail ||
      nextEmail === user.email.toLowerCase() ||
      emailChangePassword.length < 6 ||
      emailChangePassword.length > 50
    ) {
      return;
    }

    setIsCheckingChangeEmail(true);
    const promise = checkChangeEmail({
      newEmail: nextEmail,
      password: emailChangePassword,
    });

    promise
      .then(() => {
        setEmailDraft(nextEmail);
        setEmailChangeStep("verify");
      })
      .catch((error: unknown) => {
        toast.error(getApiErrorMessage(error, "Failed to check email."));
      });

    promise.finally(() => setIsCheckingChangeEmail(false));
  };

  const saveEmailChange = () => {
    const nextEmail = emailDraft.trim();

    if (!nextEmail || nextEmail === user.email || !newEmailCode.trim()) {
      return;
    }

    setIsSavingEmailChange(true);

    const promise = verifyChangeEmail({
      newEmail: nextEmail,
      newEmailCode: newEmailCode,
    });

    promise
      .then(() => {
        updateUser({ email: nextEmail });
        setEmailDraft("");
        setNewEmailCode("");
        setEmailChangeStep("idle");
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
            : "Failed to change email.",
        );
      });

    promise.finally(() => setIsSavingEmailChange(false));
  };

  const handlePasswordAction = async (password: string) => {
    if (user.authProviders.some((provider) => provider.provider === "server")) {
      return;
    }

    const data = await createPassword({ password });

    if (data?.result?.user) {
      updateUser(data.result.user);
      return;
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
    });
  };

  const handleGoogleProviderAction = () => {
    const hasGoogleProvider = user.authProviders.some(
      (provider) => provider.provider === "google",
    );

    if (hasGoogleProvider) {
      setIsUpdatingGoogleProvider(true);

      const promise = disconnectGoogle();

      promise
        .then((data) => {
          if (data?.result?.user) {
            updateUser(data.result.user);
          }
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
              : "Failed to disconnect Google.",
          );
        });

      promise.finally(() => setIsUpdatingGoogleProvider(false));
      return;
    }

    connectGoogleLogin();
  };

  const handleDeleteAccountVerify = async () => {
    setIsSendingDeleteVerify(true);

    try {
      await deleteAccountVerify();
    } catch (error) {
      toast.error(
        typeof error === "object" &&
          error !== null &&
          "response" in error &&
          typeof (error as { response?: { data?: { message?: string } } })
            .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response!
              .data!.message!
          : "Failed to send verification code.",
      );
    } finally {
      setIsSendingDeleteVerify(false);
    }
  };

  const handleDeleteAccount = async (payload: {
    password?: string;
    code?: string;
  }) => {
    setIsDeletingAccount(true);

    try {
      await deleteAccount(payload);
      logout();
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(
        typeof error === "object" &&
          error !== null &&
          "response" in error &&
          typeof (error as { response?: { data?: { message?: string } } })
            .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response!
              .data!.message!
          : "Failed to delete account.",
      );
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 space-y-6 overflow-x-hidden">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="max-w-2xl text-muted-foreground">
          Manage your account details and app preferences in one place. Use the
          section picker to move between settings without leaving the page.
        </p>
      </div>

      <Card className="min-w-0 overflow-visible">
        <CardContent className="grid min-w-0 gap-6 px-3 py-3 md:px-4 md:py-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="min-w-0 space-y-4">
            <div className="space-y-2 lg:hidden">
              <Label>Settings Category</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-auto min-h-12 w-full justify-between rounded-xl px-3 py-2 whitespace-normal"
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden text-left">
                      <span className="shrink-0 rounded-lg bg-muted p-2">
                        <currentSection.icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1 overflow-hidden">
                        <span className="block truncate font-medium">
                          {currentSection.label}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {currentSection.description}
                        </span>
                      </span>
                    </span>
                    <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  collisionPadding={16}
                  className="w-[min(var(--radix-dropdown-menu-trigger-width),calc(100vw-2rem))] max-w-[calc(100vw-2rem)]"
                >
                  <DropdownMenuLabel>Select section</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {sections.map((section) => {
                    const Icon = section.icon;
                    const isActive = section.id === activeSection;

                    return (
                      <DropdownMenuItem
                        key={section.id}
                        onSelect={() => setActiveSection(section.id)}
                        className="min-h-12 gap-3 px-3 py-2"
                      >
                        <span
                          className={cn(
                            "rounded-lg p-2",
                            isActive
                              ? "bg-muted text-foreground"
                              : "bg-muted text-foreground",
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {section.label}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {section.description}
                          </span>
                        </span>
                        {isActive ? (
                          <Check className="size-4 shrink-0 text-foreground" />
                        ) : null}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="hidden space-y-2 lg:block">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = section.id === activeSection;

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                      isActive
                        ? "border-primary/40 bg-primary/8"
                        : "border-transparent bg-muted/40 hover:border-border hover:bg-muted/80",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 rounded-lg p-2",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-background",
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
                );
              })}
            </div>
          </div>

          <div className="min-w-0 space-y-4">
            <Card className="min-w-0 border border-border/70 shadow-none">
              <CardHeader className="px-4 pb-0 md:px-6">
                <div className="flex items-start gap-3">
                  <span className="rounded-xl bg-muted p-2">
                    <currentSection.icon className="size-5" />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <CardTitle>{currentSection.label}</CardTitle>
                    <CardDescription>
                      {currentSection.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="min-w-0 space-y-6 overflow-x-hidden px-4 pt-6 md:px-6">
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
                    verifyEmailChange={verifyEmailChange}
                    saveEmailChange={saveEmailChange}
                    cancelEmailChange={cancelEmailChange}
                    isCheckingChangeEmail={isCheckingChangeEmail}
                    isSavingEmailChange={isSavingEmailChange}
                    handlePasswordAction={handlePasswordAction}
                    isUpdatingGoogleProvider={isUpdatingGoogleProvider}
                    handleGoogleProviderAction={handleGoogleProviderAction}
                    isDeletingAccount={isDeletingAccount}
                    isSendingDeleteVerify={isSendingDeleteVerify}
                    handleDeleteAccountVerify={handleDeleteAccountVerify}
                    handleDeleteAccount={handleDeleteAccount}
                  />
                )}

                {activeSection === "preferences" && <PreferencesSection />}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
