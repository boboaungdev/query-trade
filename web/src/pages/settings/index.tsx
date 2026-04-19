import { useState } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/auth";
import { AccountSection } from "./sections/account-section";
import { PreferencesSection } from "./sections/preferences-section";

const sections = [
  {
    id: "account",
    label: "Account & Security",
    icon: ShieldCheck,
  },
  {
    id: "preferences",
    label: "Preferences",
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
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response!
              .data!.message!
          : "Failed to send verification code.";

      toast.error(message);
      throw new Error(message);
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
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response!
              .data!.message!
          : "Failed to delete account.";

      toast.error(message);
      throw new Error(message);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 space-y-6 overflow-x-hidden">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="max-w-2xl text-muted-foreground">
          Manage your account details and app preferences in one place.
        </p>
      </div>

      <div className="space-y-2 md:hidden">
        <Label>Settings Category</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="lg"
              className="w-full justify-between"
            >
              <span className="truncate font-medium">
                {
                  sections.find((section) => section.id === activeSection)
                    ?.label
                }
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
            {sections.map((section) => (
              <DropdownMenuItem
                key={section.id}
                onSelect={() => setActiveSection(section.id)}
                className="justify-between"
              >
                {section.label}
                {section.id === activeSection ? (
                  <Check className="size-4" />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs
        orientation="vertical"
        value={activeSection}
        onValueChange={(value) =>
          setActiveSection(value as (typeof sections)[number]["id"])
        }
        className="min-w-0 md:grid md:grid-cols-[220px_minmax(0,1fr)] md:items-start"
      >
        <TabsList
          className="hidden h-auto w-full flex-col items-stretch gap-2 bg-transparent p-0 md:flex"
          aria-label="Settings categories"
        >
          {sections.map((section) => {
            const Icon = section.icon;

            return (
              <TabsTrigger
                key={section.id}
                value={section.id}
                className="group h-auto w-full justify-start gap-2.5 rounded-xl !border-0 bg-card px-3.5 py-2.5 text-left text-sm font-medium text-foreground !shadow-none hover:bg-muted/60 data-active:!border-0 data-active:!bg-primary data-active:text-primary-foreground data-active:!shadow-none data-[state=active]:!border-0 data-[state=active]:!bg-primary data-[state=active]:text-primary-foreground data-[state=active]:!shadow-none dark:data-active:!bg-primary dark:data-active:text-primary-foreground dark:data-[state=active]:!bg-primary dark:data-[state=active]:text-primary-foreground"
              >
                <span className="p-2 transition-colors group-data-active:text-primary-foreground group-data-[state=active]:text-primary-foreground">
                  <Icon className="size-4" />
                </span>
                <span className="transition-colors group-data-active:text-primary-foreground group-data-[state=active]:text-primary-foreground">
                  {section.label}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="account" className="min-w-0">
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
        </TabsContent>

        <TabsContent value="preferences" className="min-w-0">
          <PreferencesSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
