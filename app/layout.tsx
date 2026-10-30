import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans, Sora, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { SiteShell } from "@/components/SiteShell";
import { AppThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@/components/Analytics";
import {
  DEFAULT_OG_IMAGE,
  getSiteBaseUrl,
  SITE_DESCRIPTION,
  organizationSchema,
  websiteSchema,
} from "@/lib/seo/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  preload: false,
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
  preload: false,
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

// Setup Base URL (Critical for Open Graph images)
const baseUrl = getSiteBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? {
          other: {
            "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION,
          },
        }
      : {}),
  },
  
  // Title & Description
  title: {
    default: "Acadiana Web Design | Website work by Layken Varholdt",
    template: "%s | Acadiana Web Design",
  },
  description: SITE_DESCRIPTION,

  // Authors / Creator
  authors: [{ name: "Acadiana Web Design" }],
  creator: "Acadiana Web Design",

  // Open Graph (How links look on Facebook/LinkedIn/iMessage)
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    title: "Acadiana Web Design | Website work by Layken Varholdt",
    description: SITE_DESCRIPTION,
    siteName: "Acadiana Web Design",
    images: [{ ...DEFAULT_OG_IMAGE }],
  },

  // Twitter Card (How links look on X)
  twitter: {
    card: "summary_large_image",
    title: "Acadiana Web Design | Website work by Layken Varholdt",
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
    site: "@LLVarholdt",
    creator: "@LLVarholdt",
  },

  // Canonical URL (Prevents duplicate content issues)
  alternates: {
    canonical: "/",
  },
  
  // Robots (Allow Google to index you)
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* next/font self-hosts; no Google Fonts network request needed */}
        <link rel="dns-prefetch" href="https://convex.cloud" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${plusJakarta.variable} ${sora.variable} ${instrumentSerif.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema(baseUrl)),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema(baseUrl)),
          }}
        />
        <AppThemeProvider>
          <SiteShell>{children}</SiteShell>
        </AppThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
