"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { UserMembershipMark } from "@/components/user-membership";
import type { HomeReviewItem } from "@/data/home-reviews";
import { Card, CardContent } from "@/components/ui/card";

type HomeReviewsMarqueeProps = {
  items: HomeReviewItem[];
};

export default function HomeReviewsMarquee({ items }: HomeReviewsMarqueeProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    const animate = (time: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time;
      }

      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;

      const firstHalfWidth = track.scrollWidth / 2;
      const speed = isSlow ? 0.018 : 0.045;

      offsetRef.current -= delta * speed;

      if (Math.abs(offsetRef.current) >= firstHalfWidth) {
        offsetRef.current += firstHalfWidth;
      }

      track.style.transform = `translateX(${offsetRef.current}px)`;
      frameRef.current = window.requestAnimationFrame(animate);
    };

    frameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = null;
      lastTimeRef.current = null;
    };
  }, [isSlow]);

  const marqueeItems = [...items, ...items];

  return (
    <div
      className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
      onMouseEnter={() => setIsSlow(true)}
      onMouseLeave={() => setIsSlow(false)}
    >
      <div ref={trackRef} className="flex w-max gap-4 will-change-transform">
        {marqueeItems.map((item, index) => (
          <Card
            key={`${item.username}-${index}`}
            className="w-[320px] shrink-0 rounded-[1.6rem] border-0 bg-card py-0 shadow-[0_16px_40px_rgba(15,23,42,0.05)] ring-1 ring-black/5"
          >
            <CardContent className="flex h-full flex-col gap-5 px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="size-12 shrink-0 overflow-hidden rounded-full bg-muted">
                  <Image
                    src={item.avatarUrl}
                    alt={`${item.name} avatar`}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-semibold text-foreground">
                      {item.name}
                    </p>
                    <UserMembershipMark membership={item.membership} />
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    @{item.username}
                  </p>
                </div>
              </div>

              <p className="text-sm leading-7 text-muted-foreground">
                &ldquo;{item.review}&rdquo;
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
