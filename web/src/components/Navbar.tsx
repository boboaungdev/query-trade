import { Link, NavLink, useNavigate } from "react-router-dom"

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
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  ChartCandlestick,
  LayoutDashboard,
  Menu,
  TestTubeDiagonal,
} from "lucide-react"

const appNavItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/trading", label: "Trading", icon: ChartCandlestick },
  { to: "/backtesting", label: "Backtesting", icon: TestTubeDiagonal },
]

export default function Navbar() {
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
    <nav className="flex items-center justify-between border-b px-6 py-4">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon-sm" aria-label="Open sidebar">
              <Menu />
            </Button>
          </SheetTrigger>

          <SheetContent side="left" className="w-[280px] p-0 sm:max-w-[280px]">
            <SheetHeader className="border-b px-4 py-3">
              <SheetTitle>{APP_NAME}</SheetTitle>
              <SheetDescription>
                Quick access to your workspace pages.
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-1 p-3">
              {appNavItems.map((item) => {
                const Icon = item.icon

                return (
                  <SheetClose key={item.to} asChild>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`
                      }
                    >
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </NavLink>
                  </SheetClose>
                )
              })}
            </div>
          </SheetContent>
        </Sheet>

        <Link to="/" className="text-lg font-bold">
          {APP_NAME}
        </Link>
      </div>

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
              {/* User Info */}
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex flex-col items-start">
                  <span className="font-medium">{user.name}</span>
                  <span className="text-xs text-muted-foreground">
                    @{user.username}
                  </span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Dashboard */}
              <DropdownMenuItem asChild>
                <Link to="/dashboard">Dashboard</Link>
              </DropdownMenuItem>

              {/* Profile */}
              <DropdownMenuItem asChild>
                <Link to="/profile">Profile</Link>
              </DropdownMenuItem>

              {/* Settings */}
              <DropdownMenuItem asChild>
                <Link to="/settings">Settings</Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Logout */}
              <DropdownMenuItem className="text-red-500" onClick={handleLogout}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </nav>
  )
}
