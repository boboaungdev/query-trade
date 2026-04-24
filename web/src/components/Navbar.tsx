/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import ThemeToggle from "./ThemeToggle";
import { APP_NAME } from "@/constants";

import { useAuthStore } from "@/store/auth";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { getApiErrorMessage } from "@/api/axios";
import { signout } from "@/api/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCompactTokenAmount } from "@/lib/formatTokenAmount";
import {
  Settings,
  LogOut,
  Wallet,
  Eye,
  EyeOff,
  TicketPercent,
} from "lucide-react";

export default function Navbar() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const hideWalletBalancePreference =
    user?.preferences?.hideWalletBalance ??
    (typeof user?.preferences?.showWalletBalance === "boolean"
      ? !user.preferences.showWalletBalance
      : false);
  const [isWalletBalanceInverted, setIsWalletBalanceInverted] = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const isAuthPage = location.pathname === "/auth";
  const isMobile = useIsMobile();
  const profileHref = user?.username ? `/${user.username}` : "/profile";

  const handleSignout = async () => {
    try {
      await signout();
      logout();
      navigate("/");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Sign out failed on server."));
    }
  };

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";
  const tokenBalance = formatCompactTokenAmount(
    Number(user?.tokenBalance || 0),
  );
  const showWalletBalance = isWalletBalanceInverted
    ? hideWalletBalancePreference
    : !hideWalletBalancePreference;

  return (
    <nav className="relative flex items-center justify-between border-b px-6 py-4">
      {/* LEFT */}
      <div className="flex items-center gap-3">
        {/* Sidebar toggle only when logged in */}
        {user && isMobile ? <SidebarTrigger /> : null}

        <Link
          to="/"
          className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-primary"
        >
          <img
            src="/query-trade.svg"
            alt={`${APP_NAME} logo`}
            className="h-8 w-8 shrink-0"
          />
          {APP_NAME}
        </Link>
      </div>

      {!user ? (
        <div className="absolute left-1/2 hidden -translate-x-1/2 md:flex">
          <div className="inline-flex w-fit items-center justify-center gap-1 rounded-none bg-transparent p-[3px] text-muted-foreground">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(
                  "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all hover:text-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-1 focus-visible:outline-primary dark:text-muted-foreground dark:hover:text-foreground after:absolute after:inset-x-0 after:bottom-[-5px] after:h-0.5 after:bg-foreground after:opacity-0 after:transition-opacity",
                  isActive &&
                    "text-primary after:bg-primary after:opacity-100 dark:text-primary dark:after:bg-primary",
                )
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/pricing"
              className={({ isActive }) =>
                cn(
                  "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all hover:text-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-1 focus-visible:outline-primary dark:text-muted-foreground dark:hover:text-foreground after:absolute after:inset-x-0 after:bottom-[-5px] after:h-0.5 after:bg-foreground after:opacity-0 after:transition-opacity",
                  isActive &&
                    "text-primary after:bg-primary after:opacity-100 dark:text-primary dark:after:bg-primary",
                )
              }
            >
              Pricing
            </NavLink>
          </div>
        </div>
      ) : null}

      {/* RIGHT */}

      <div className="flex items-center gap-4">
        <ThemeToggle />

        {!user ? (
          !isAuthPage ? (
            <Link to="/auth">
              <Button>Start Free</Button>
            </Link>
          ) : null
        ) : (
          <DropdownMenu
            open={isAvatarMenuOpen}
            onOpenChange={setIsAvatarMenuOpen}
          >
            <DropdownMenuTrigger asChild>
              <Avatar className="cursor-pointer">
                <AvatarImage src={user.avatar} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-auto min-w-40 max-w-72"
            >
              <DropdownMenuItem asChild>
                <Link
                  to={profileHref}
                  className="flex w-full min-w-0 items-start gap-2"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <span className="flex min-w-0 flex-col items-start">
                    <span className="w-full truncate font-medium">
                      {user.name}
                    </span>
                    <span className="w-full truncate text-xs text-muted-foreground">
                      @{user.username}
                    </span>
                  </span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem className="gap-2">
                <Link
                  to="/wallet"
                  className="flex min-w-0 flex-1 items-center gap-2"
                  onClick={() => {
                    setIsAvatarMenuOpen(false);
                  }}
                >
                  <Wallet className="h-4 w-4 shrink-0" />
                  <span className="flex min-w-0 flex-1 flex-col items-start">
                    <span className="w-full truncate">Wallet</span>
                    <span className="w-full truncate text-xs text-muted-foreground">
                      {showWalletBalance ? tokenBalance : "••••••"} token
                    </span>
                  </span>
                </Link>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsWalletBalanceInverted((current) => !current);
                  }}
                  aria-label={
                    showWalletBalance
                      ? "Hide wallet balance"
                      : "Show wallet balance"
                  }
                >
                  {showWalletBalance ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link to="/pricing" className="flex items-center gap-2">
                  <TicketPercent className="h-4 w-4" />
                  <span>Pricing</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-destructive"
                onClick={handleSignout}
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </nav>
  );
}
