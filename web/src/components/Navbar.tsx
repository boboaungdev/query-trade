/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link, useLocation, useNavigate } from "react-router-dom";

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
import { CircleHelp, Settings, LogOut, WalletCards } from "lucide-react";

export default function Navbar() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

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

  return (
    <nav className="flex items-center justify-between border-b px-6 py-4">
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
          <DropdownMenu>
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

              <DropdownMenuItem asChild>
                <Link to="/help" className="flex items-center gap-2">
                  <CircleHelp className="h-4 w-4" />
                  <span>Help</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link to="/billing" className="flex items-center gap-2">
                  <WalletCards className="h-4 w-4" />
                  <span>Billing</span>
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
