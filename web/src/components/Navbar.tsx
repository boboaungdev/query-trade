/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link, useLocation, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import ThemeToggle from "./ThemeToggle"
import { APP_NAME } from "@/constants"

import { useAuthStore } from "@/store/auth"

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { getApiErrorMessage } from "@/api/axios"
import { signout } from "@/api/auth"
import { toast } from "sonner"
import { CircleHelp, Settings, LogOut } from "lucide-react"

export default function Navbar() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const location = useLocation()
  const navigate = useNavigate()
  const isAuthPage = location.pathname === "/auth"

  const handleSignout = () => {
    toast.promise(signout(), {
      loading: "Signing out...",
      success: (data) => {
        logout()
        navigate("/")
        return data.message
      },
      error: (error: unknown) =>
        getApiErrorMessage(error, "Sign out failed on server."),
    })
  }

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U"

  return (
    <nav className="flex items-center justify-between border-b px-6 py-4">
      {/* LEFT */}
      <div className="flex items-center gap-3">
        {/* Sidebar toggle only when logged in */}
        {user && <SidebarTrigger />}

        <Link to="/" className="flex items-center gap-2 text-lg font-bold">
          <img
            src="/query-trade.svg"
            alt={`${APP_NAME} logo`}
            className="h-6 w-6 shrink-0"
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

            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex w-full items-start gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <span className="flex flex-col items-start">
                    <span className="font-medium">{user.name}</span>
                    <span className="text-xs text-muted-foreground">
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
  )
}
