"use client"

import Image from "next/image"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { usePathname } from "next/navigation"
import { useState } from "react"

import ThemeToggle from "@/components/ThemeToggle"
import { Button } from "@/components/ui/button"
import { APP_NAME } from "@/lib/constants"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
]

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:5173"

export default function Navbar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur-xl">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-primary"
          onClick={() => setIsOpen(false)}
        >
          <Image
            src="/query-trade.svg"
            alt={`${APP_NAME} logo`}
            width={32}
            height={32}
            className="h-8 w-8 shrink-0"
          />
          {APP_NAME}
        </Link>

        <div className="absolute left-1/2 hidden -translate-x-1/2 md:flex">
          <div className="inline-flex w-fit items-center justify-center gap-1 rounded-none bg-transparent p-[3px] text-muted-foreground">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === item.href
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all after:absolute after:inset-x-0 after:bottom-[-5px] after:h-0.5 after:bg-foreground after:opacity-0 after:transition-opacity hover:text-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-1 focus-visible:outline-primary dark:text-muted-foreground dark:hover:text-foreground",
                    isActive &&
                      "text-primary after:bg-primary after:opacity-100 dark:text-primary dark:after:bg-primary"
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>

        <div className="hidden items-center gap-4 md:flex">
          <ThemeToggle />
          <Button asChild>
            <a href={appUrl}>Start Free</a>
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label={isOpen ? "Close menu" : "Open menu"}
            onClick={() => setIsOpen((current) => !current)}
          >
            {isOpen ? <X size={18} /> : <Menu size={18} />}
          </Button>
        </div>
      </nav>

      {isOpen ? (
        <div className="border-t px-6 py-4 md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-3">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === item.href
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted/60 hover:text-foreground",
                    isActive && "border-primary/20 bg-primary/8 text-primary"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              )
            })}

            <Button asChild className="mt-1">
              <a href={appUrl} onClick={() => setIsOpen(false)}>
                Start Free
              </a>
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  )
}
