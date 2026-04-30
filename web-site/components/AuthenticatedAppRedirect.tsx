"use client";

import { useEffect } from "react";

import { API_URL, APP_URL } from "@/lib/constants";

type SessionResponse = {
  result?: {
    authenticated?: boolean;
  };
};

export default function AuthenticatedAppRedirect() {
  useEffect(() => {
    let isCancelled = false;

    const checkSession = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/session`, {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok || isCancelled) {
          return;
        }

        const payload = (await response.json()) as SessionResponse;

        if (payload.result?.authenticated) {
          window.location.replace(APP_URL);
        }
      } catch {
        return;
      }
    };

    void checkSession();

    return () => {
      isCancelled = true;
    };
  }, []);

  return null;
}
