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

export function AppSidebar() {
  const { setOpen } = useSidebar()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate("/")
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
      onMouseLeave={() => setOpen(false)}
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
            <div className="group flex w-full items-center">
              {/* PROFILE LINK WITH HOVER */}
              <SidebarMenuButton asChild className="flex-1">
                <Link to="/profile" className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>

                  <span className="truncate group-data-[collapsible=icon]:hidden">
                    {user?.name || "User"}
                  </span>
                </Link>
              </SidebarMenuButton>

              {/* DROPDOWN ICON */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded p-1 transition group-data-[collapsible=icon]:hidden hover:bg-accent">
                    <MoreVertical size={16} />
                  </button>
                </DropdownMenuTrigger>

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
                    onClick={handleLogout}
                    className="text-red-500"
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
