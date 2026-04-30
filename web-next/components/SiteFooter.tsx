"use client";

import Link from "next/link";

import ScrollToTopLink from "@/components/ScrollToTopLink";
import { APP_NAME } from "@/lib/constants";

type SiteFooterLink = {
  href: string;
  label: string;
  scrollToTopOnCurrentPage?: boolean;
};

type SiteFooterProps = {
  links: SiteFooterLink[];
};

export default function SiteFooter({ links }: SiteFooterProps) {
  return (
    <footer className="border-t border-border/60 px-6 py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p className="text-center md:text-left">
          &copy; {new Date().getFullYear()}{" "}
          <ScrollToTopLink className="font-medium text-primary transition-colors hover:text-primary/80">
            {APP_NAME}
          </ScrollToTopLink>
          . All rights reserved.
        </p>

        <div className="flex items-center justify-center gap-5 md:justify-end">
          {links.map((link) =>
            link.scrollToTopOnCurrentPage ? (
              <ScrollToTopLink
                key={link.label}
                href={link.href}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </ScrollToTopLink>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ),
          )}
        </div>
      </div>
    </footer>
  );
}
