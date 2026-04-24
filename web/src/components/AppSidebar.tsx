import { Link, useLocation, useNavigate } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  Home,
  Trophy,
  Target,
  Bookmark,
  CandlestickChart,
  ChevronsUpDown,
  PanelLeftClose,
  PanelLeft,
  Settings,
  Wallet,
  TicketPercent,
  Eye,
  EyeOff,
  ShieldCheck,
  UserRound,
  LogOut,
} from "lucide-react";

import { useAuthStore } from "@/store/auth";
import { useState } from "react";
import { getApiErrorMessage } from "@/api/axios";
import { signout } from "@/api/auth";
import { toast } from "sonner";
import { formatCompactTokenAmount } from "@/lib/formatTokenAmount";

export function AppSidebar() {
  const { isMobile, openMobile, setOpen, setOpenMobile, toggleSidebar, state } =
    useSidebar();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const hideWalletBalancePreference =
    user?.preferences?.hideWalletBalance ??
    (typeof user?.preferences?.showWalletBalance === "boolean"
      ? !user.preferences.showWalletBalance
      : false);
  const [isWalletBalanceInverted, setIsWalletBalanceInverted] = useState(false);
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

  const handleMenuNavigation = () => {
    if (isMobile) {
      setOpenMobile(false);
      return;
    }

    setOpen(false);
  };

  const isRouteActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return (
      location.pathname === href || location.pathname.startsWith(`${href}/`)
    );
  };

  const isMenuOpen = isMobile ? openMobile : state === "expanded";
  const MenuToggleIcon = isMenuOpen ? PanelLeftClose : PanelLeft;

  return (
    <Sidebar
      side="left"
      variant="sidebar"
      collapsible="icon"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (!menuOpen) setOpen(false);
      }}
    >
      <SidebarHeader className="px-2 pt-4 pb-2">
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex h-10 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <span className="flex size-4 shrink-0 items-center justify-center">
            <MenuToggleIcon className="h-4 w-4" />
          </span>
          <span className="group-data-[collapsible=icon]:hidden">Menu</span>
        </button>
      </SidebarHeader>

      {/* TOP MENU */}
      <SidebarContent className="px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isRouteActive("/")}>
              <Link to="/" onClick={handleMenuNavigation}>
                <Home />
                <span>Home</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isRouteActive("/leaderboard")}>
              <Link to="/leaderboard" onClick={handleMenuNavigation}>
                <Trophy />
                <span>Leaderboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isRouteActive("/strategy")}>
              <Link to="/strategy" onClick={handleMenuNavigation}>
                <Target />
                <span>Strategy</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isRouteActive("/bookmark")}>
              <Link to="/bookmark" onClick={handleMenuNavigation}>
                <Bookmark />
                <span>Bookmark</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isRouteActive("/backtest")}>
              <Link to="/backtest" onClick={handleMenuNavigation}>
                <CandlestickChart />
                <span>Backtest</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isRouteActive("/settings")}>
              <Link to="/settings" onClick={handleMenuNavigation}>
                <Settings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {user?.role === "admin" ? (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isRouteActive("/admin/dashboard")}
              >
                <Link to="/admin/dashboard" onClick={handleMenuNavigation}>
                  <ShieldCheck />
                  <span>Admin</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}
        </SidebarMenu>
      </SidebarContent>

      {/* BOTTOM USER */}
      <SidebarFooter className="px-2 pb-5">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full">
                  <span className="flex size-4 items-center justify-center">
                    <UserRound className="h-4 w-4" />
                  </span>

                  <span className="truncate group-data-[collapsible=icon]:hidden">
                    {user?.name || "User"}
                  </span>
                  <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                side="top"
                align="start"
                className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)]"
              >
                <DropdownMenuItem asChild>
                  <Link
                    to={profileHref}
                    className="flex w-full min-w-0 items-start gap-2"
                    onClick={handleMenuNavigation}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatar} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <span className="flex min-w-0 flex-col items-start">
                      <span className="w-full truncate font-medium">
                        {user?.name || "User"}
                      </span>
                      <span className="w-full truncate text-xs text-muted-foreground">
                        @{user?.username || "unknown"}
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
                      setMenuOpen(false);
                      handleMenuNavigation();
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
                  <Link
                    to="/pricing"
                    className="flex items-center gap-2"
                    onClick={handleMenuNavigation}
                  >
                    <TicketPercent className="h-4 w-4" />
                    <span>Pricing</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to="/settings"
                    className="flex items-center gap-2"
                    onClick={handleMenuNavigation}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleSignout}
                  className="text-destructive"
                >
                  <LogOut className="h-4 w-4 text-destructive" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
