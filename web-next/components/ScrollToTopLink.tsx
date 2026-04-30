"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type ScrollToTopLinkProps = {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
};

export default function ScrollToTopLink({
  children,
  className,
  onClick,
}: ScrollToTopLinkProps) {
  const pathname = usePathname();

  return (
    <Link
      href="/"
      className={className}
      onClick={(event) => {
        onClick?.();

        if (pathname === "/") {
          event.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }}
    >
      {children}
    </Link>
  );
}
