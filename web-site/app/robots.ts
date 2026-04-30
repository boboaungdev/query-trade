import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/constants";
import { isIndexableSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const isIndexable = isIndexableSiteUrl();

  return {
    rules: isIndexable
      ? {
          userAgent: "*",
          allow: "/",
        }
      : {
          userAgent: "*",
          disallow: "/",
        },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
