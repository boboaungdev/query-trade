import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata, Viewport } from "next";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import {
  APP_DEFAULT_DESCRIPTION,
  APP_NAME,
  APP_TAGLINE,
  GOOGLE_SITE_VERIFICATION,
  SITE_URL,
} from "@/lib/constants";
import {
  getDefaultOgImage,
  getOrganizationSchema,
  getWebsiteSchema,
  isIndexableSiteUrl,
} from "@/lib/seo";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const defaultOgImage = getDefaultOgImage();
const isIndexable = isIndexableSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: APP_NAME,
  title: {
    default: `${APP_NAME} | ${APP_TAGLINE}`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DEFAULT_DESCRIPTION,
  keywords: [
    "trading strategy builder",
    "backtesting app",
    "crypto strategy tester",
    "algorithmic trading workflows",
  ],
  referrer: "origin-when-cross-origin",
  creator: APP_NAME,
  publisher: APP_NAME,
  category: "finance",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  manifest: "/manifest.webmanifest",
  verification: GOOGLE_SITE_VERIFICATION
    ? {
        google: GOOGLE_SITE_VERIFICATION,
      }
    : undefined,
  openGraph: {
    siteName: APP_NAME,
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    title: `${APP_NAME} | ${APP_TAGLINE}`,
    description: APP_DEFAULT_DESCRIPTION,
    images: [defaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} | ${APP_TAGLINE}`,
    description: APP_DEFAULT_DESCRIPTION,
    images: [defaultOgImage.url],
  },
  robots: {
    index: isIndexable,
    follow: isIndexable,
    googleBot: {
      index: isIndexable,
      follow: isIndexable,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fbff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = [getOrganizationSchema(), getWebsiteSchema()];

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "scroll-smooth antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable,
      )}
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
