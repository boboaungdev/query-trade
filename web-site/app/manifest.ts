import type { MetadataRoute } from "next";

import { APP_DEFAULT_DESCRIPTION, APP_NAME } from "@/lib/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_DEFAULT_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#f8fbff",
    theme_color: "#2f7dd3",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
