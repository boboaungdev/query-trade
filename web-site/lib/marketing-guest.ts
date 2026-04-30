import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { API_URL, APP_URL } from "@/lib/constants";

type SessionResponse = {
  result?: {
    authenticated?: boolean;
    user?: {
      _id: string;
      username: string;
    } | null;
  };
};

export async function requireMarketingGuest() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  if (!cookieHeader) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/session`, {
      headers: {
        cookie: cookieHeader,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as SessionResponse;

    if (payload.result?.authenticated) {
      redirect(APP_URL);
    }
  } catch {
    return;
  }
}
