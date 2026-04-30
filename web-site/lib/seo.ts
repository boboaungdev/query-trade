import type { Metadata } from "next";

import {
  APP_DEFAULT_DESCRIPTION,
  APP_NAME,
  APP_TAGLINE,
  SITE_URL,
} from "@/lib/constants";

const defaultKeywords = [
  "trading strategy builder",
  "backtesting app",
  "crypto trading strategies",
  "strategy backtesting",
  "trading workflow",
  "trader tools",
  "algorithmic trading",
  "trading platform",
];

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export function isIndexableSiteUrl() {
  try {
    const { hostname, protocol } = new URL(SITE_URL);

    if (protocol !== "https:") {
      return false;
    }

    return !["localhost", "127.0.0.1", "0.0.0.0"].includes(hostname);
  } catch {
    return false;
  }
}

export function getDefaultOgImage() {
  return {
    url: absoluteUrl("/opengraph-image"),
    width: 1200,
    height: 630,
    alt: `${APP_NAME} social preview`,
  };
}

type CreateMetadataOptions = {
  title: string;
  description?: string;
  path?: string;
  keywords?: string[];
};

export function createPageMetadata({
  title,
  description = APP_DEFAULT_DESCRIPTION,
  path = "/",
  keywords = [],
}: CreateMetadataOptions): Metadata {
  const url = absoluteUrl(path);
  const ogImage = getDefaultOgImage();

  return {
    title,
    description,
    keywords: [...defaultKeywords, ...keywords],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: APP_NAME,
      type: "website",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage.url],
    },
  };
}

export function getOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: APP_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/query-trade.svg"),
    description: APP_DEFAULT_DESCRIPTION,
  };
}

export function getWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: APP_NAME,
    url: SITE_URL,
    description: APP_DEFAULT_DESCRIPTION,
    alternateName: APP_TAGLINE,
  };
}
