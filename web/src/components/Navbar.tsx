/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link, useNavigate } from "react-router-dom"

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
import { signout } from "@/api/auth"
import { toast } from "sonner"

export default function Navbar() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const navigate = useNavigate()

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
    <nav className="flex items-center justify-between border-b px-6 py-4">
      {/* LEFT */}
      <div className="flex items-center gap-3">
        {/* Sidebar toggle only when logged in */}
        {user && <SidebarTrigger />}

        <Link to="/" className="text-lg font-bold">
          {APP_NAME}
        </Link>
      </div>

      {/* RIGHT */}

      <div className="flex items-center gap-4">
        <ThemeToggle />

        {!user ? (
          <Link to="/auth">
            <Button>Get Started</Button>
          </Link>
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
                <Link to="/profile" className="flex flex-col items-start">
                  <span className="font-medium">{user.name}</span>
                  <span className="text-xs text-muted-foreground">
                    @{user.username}
                  </span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link to="/billing">Billing</Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link to="/help">Help</Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link to="/settings">Settings</Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-red-500"
                onClick={handleSignout}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </nav>
  )
}
