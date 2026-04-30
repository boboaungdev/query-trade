import { BadgeCheck } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type UserMembership = {
  plan?: "free" | "plus" | "pro" | string;
  badgeLabel?: string | null;
  badgeVariant?: "free" | "plus" | "pro" | string;
  verifiedVariant?: "free" | "plus" | "pro" | string;
  title?: string | null;
  description?: string | null;
};

export function getUserMembershipMeta(membership?: UserMembership) {
  switch (membership?.verifiedVariant) {
    case "pro":
      return {
        Icon: BadgeCheck,
        iconClassName: "fill-amber-500 text-white",
        iconWrapperClassName: "text-amber-500",
        labelClassName: "text-amber-500",
      };
    case "plus":
      return {
        Icon: BadgeCheck,
        iconClassName: "fill-sky-500 text-white",
        iconWrapperClassName: "text-sky-500",
        labelClassName: "text-sky-500",
      };
    default:
      return {
        Icon: null,
        iconClassName: "",
        iconWrapperClassName: "",
        labelClassName: "",
      };
  }
}

export function getUserAvatarRingClass(_membership?: UserMembership) {
  return "";
}

export function UserMembershipMark({
  membership,
  className,
  interactive = false,
}: {
  membership?: UserMembership;
  className?: string;
  interactive?: boolean;
}) {
  const membershipMeta = getUserMembershipMeta(membership);

  if (!membershipMeta.Icon) {
    return null;
  }

  const label = membership?.badgeLabel ?? null;
  const title = membership?.title ?? null;
  const description = membership?.description ?? null;

  const icon = (
    <span
      className={cn(
        "inline-flex items-center",
        membershipMeta.iconWrapperClassName,
      )}
      title={!interactive ? description ?? undefined : undefined}
    >
      <membershipMeta.Icon
        className={cn("size-4", membershipMeta.iconClassName, className)}
      />
    </span>
  );

  if (!interactive || !label) {
    return icon;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          aria-label={title ?? `${label} membership`}
        >
          {icon}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        className="w-auto max-w-44 px-2.5 py-2"
      >
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <membershipMeta.Icon
              className={cn("size-3.5", membershipMeta.iconClassName)}
            />
            <p
              className={cn(
                "text-xs font-semibold tracking-tight",
                membershipMeta.labelClassName,
              )}
            >
              {title}
            </p>
          </div>
          <p className="text-[11px] leading-4 text-muted-foreground">
            {description}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
