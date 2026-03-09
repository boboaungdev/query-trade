/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link, useNavigate } from "react-router-dom"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useSidebar } from "@/components/ui/sidebar"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

import { Home, LayoutDashboard, Settings, MoreVertical } from "lucide-react"

import { useAuthStore } from "@/store/auth"
import { useState } from "react"
import { signout } from "@/api/auth"
import { toast } from "sonner"

export function AppSidebar() {
  const { setOpen } = useSidebar()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleSignout = () => {
    toast.promise(signout(), {
      loading: "Signing out...",
      success: (data) => {
        logout()
        navigate("/")
        return data.message
      },
      error: (error: any) =>
        error?.response?.data?.message || "Sign out failed on server.",
    })
  }

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U"

  return (
    <Sidebar
      side="left"
      variant="sidebar"
      collapsible="icon"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (!menuOpen) setOpen(false)
      }}
    >
      {/* TOP MENU */}
      <SidebarContent className="pt-10 pl-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/">
                <Home />
                <span>Home</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/dashboard">
                <LayoutDashboard />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/backtest">
                <LayoutDashboard />
                <span>Backtest</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/settings">
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
              <SidebarMenuButton className="w-full justify-between">
                {/* LEFT SIDE (avatar + name) */}
                <Link to="/profile" className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>

                  <span className="truncate group-data-[collapsible=icon]:hidden">
                    {user?.name || "User"}
                  </span>
                </Link>

                {/* RIGHT SIDE (3 dots) */}
                <DropdownMenuTrigger asChild>
                  <button className="rounded p-1 group-data-[collapsible=icon]:hidden hover:bg-accent">
                    <MoreVertical size={16} />
                  </button>
                </DropdownMenuTrigger>
              </SidebarMenuButton>

              <DropdownMenuContent side="right" align="end" className="w-44">
                <DropdownMenuItem asChild>
                  <Link to="/profile">Profile</Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to="/settings">Settings</Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to="/billing">Billing</Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleSignout}
                  className="text-red-500"
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
