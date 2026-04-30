import { BadgeCheck } from "lucide-react";

import { cn } from "@/lib/utils";

export type UserMembership = {
  verifiedVariant?: "free" | "plus" | "pro" | string;
  badgeLabel?: string | null;
  title?: string | null;
};

export function getUserAvatarRingClass(membership?: UserMembership) {
  switch (membership?.verifiedVariant) {
    case "pro":
      return "ring-2 ring-amber-500/60 ring-offset-2 ring-offset-background";
    case "plus":
      return "ring-2 ring-sky-500/60 ring-offset-2 ring-offset-background";
    default:
      return "";
  }
}

export function UserMembershipMark({
  membership,
  className,
}: {
  membership?: UserMembership;
  className?: string;
}) {
  if (membership?.verifiedVariant === "pro") {
    return (
      <span
        className="inline-flex items-center text-amber-500"
        title={membership.title ?? membership.badgeLabel ?? "Pro membership"}
      >
        <BadgeCheck
          className={cn("size-4 fill-amber-500 text-white", className)}
        />
      </span>
    );
  }

  if (membership?.verifiedVariant === "plus") {
    return (
      <span
        className="inline-flex items-center text-sky-500"
        title={membership.title ?? membership.badgeLabel ?? "Plus membership"}
      >
        <BadgeCheck
          className={cn("size-4 fill-sky-500 text-white", className)}
        />
      </span>
    );
  }

  return null;
}
