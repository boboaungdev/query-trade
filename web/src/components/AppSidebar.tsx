import { Link, useLocation, useNavigate } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuAction,
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

import {
  Home,
  LayoutDashboard,
  Trophy,
  Target,
  Bookmark,
  CandlestickChart,
  Settings,
  UserRound,
  CircleHelp,
  LogOut,
  MoreVertical,
} from "lucide-react";

import { useAuthStore } from "@/store/auth";
import { useState } from "react";
import { getApiErrorMessage } from "@/api/axios";
import { signout } from "@/api/auth";
import { toast } from "sonner";

export function AppSidebar() {
  const { isMobile, setOpen, setOpenMobile } = useSidebar();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignout = () => {
    toast.promise(signout(), {
      loading: "Signing out...",
      success: (data) => {
        logout();
        navigate("/");
        return data.message;
      },
      error: (error: unknown) =>
        getApiErrorMessage(error, "Sign out failed on server."),
    });
  };

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

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
      {/* TOP MENU */}
      <SidebarContent className="pt-10 pl-2">
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
            <SidebarMenuButton asChild isActive={isRouteActive("/dashboard")}>
              <Link to="/dashboard" onClick={handleMenuNavigation}>
                <LayoutDashboard />
                <span>Dashboard</span>
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
        </SidebarMenu>
      </SidebarContent>

      {/* BOTTOM USER */}
      <SidebarFooter className="pb-5 pl-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <SidebarMenuButton asChild>
                <Link to="/profile" onClick={handleMenuNavigation}>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>

                  <span className="truncate group-data-[collapsible=icon]:hidden">
                    {user?.name || "User"}
                  </span>
                </Link>
              </SidebarMenuButton>

              <DropdownMenuTrigger asChild>
                <SidebarMenuAction
                  className="group-data-[collapsible=icon]:hidden"
                  onClick={(event) => event.stopPropagation()}
                >
                  <MoreVertical size={16} />
                </SidebarMenuAction>
              </DropdownMenuTrigger>

              <DropdownMenuContent side="right" align="end" className="w-44">
                <DropdownMenuItem asChild>
                  <Link
                    to="/profile"
                    className="flex items-center gap-2"
                    onClick={handleMenuNavigation}
                  >
                    <UserRound className="h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link
                    to="/help"
                    className="flex items-center gap-2"
                    onClick={handleMenuNavigation}
                  >
                    <CircleHelp className="h-4 w-4" />
                    <span>Help</span>
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
