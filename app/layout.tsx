import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans, Sora, Instrument_Serif } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { AppThemeProvider } from "@/components/theme-provider";
import { GlobalHeader } from "@/components/global-header";
import { Analytics } from "@/components/Analytics";
import { getToken } from "@/lib/auth-server";
import {
  DEFAULT_OG_IMAGE,
  getSiteBaseUrl,
  organizationSchema,
  websiteSchema,
} from "@/lib/seo/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
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
    default: "Websites for Local Service Companies in Acadiana | $0 Down, $199/mo",
    template: "%s | Acadiana Web Design",
  },
  description: "Get more customers in Lafayette & Acadiana with a professional website. $0 down, 72-hour launch, unlimited edits. Perfect for plumbers, landscapers, and local service pros.",
  
  // Keywords for Local Search
  keywords: [
    // Location + Service (Primary)
    "web design Lafayette LA",
    "website design Acadiana",
    "Lafayette web developer",
    "New Iberia web design",
    "Opelousas website design",
    
    // Industry-specific (Your ICP)
    "website for plumbers Lafayette",
    "landscaper website Louisiana",
    "contractor website design Acadiana",
    "home services website",
    
    // Business model keywords
    "Website as a Service Louisiana",
    "monthly website subscription",
    "no upfront cost website",
    "affordable web design Lafayette",
    
    // Feature keywords
    "fast website Louisiana",
    "local SEO Lafayette",
    "mobile-first web design",
    "95 PageSpeed website",
    "unlimited website edits"
  ],

  // Authors / Creator
  authors: [{ name: "Acadiana Web Design" }],
  creator: "Acadiana Web Design",

  // Open Graph (How links look on Facebook/LinkedIn/iMessage)
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    title: "Get More Calls in Acadiana with a 5‑Star Website",
    description: "Get more customers in Lafayette & Acadiana with a professional website. $0 down, 72-hour launch, unlimited edits. Perfect for plumbers, landscapers, and local service pros.",
    siteName: "Acadiana Web Design",
    images: [{ ...DEFAULT_OG_IMAGE }],
  },

  // Twitter Card (How links look on X)
  twitter: {
    card: "summary_large_image",
    title: "Websites for Local Service Companies in Acadiana",
    description: "Professional websites for local service businesses in Lafayette & Acadiana. $0 down, $199/mo, 72-hour launch. Hand-coded Next.js for speed.",
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
  
  other: {
    "geo.region": "US-LA",
    "geo.placename": "Lafayette",
    "geo.position": "30.2241;-92.0198",
    "ICBM": "30.2241, -92.0198",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Pre-fetch auth token server-side to avoid client-side hydration delays
  // This fixes magic link redirect issues on mobile browsers where session sync could stall
  // Wrapped in try-catch to prevent root layout crash on cookie/network errors
  let initialToken: string | null | undefined = null;
  try {
    initialToken = await getToken();
  } catch (error) {
    console.error("[layout] Failed to get auth token:", error);
    // Fallback to null - client will do auth validation instead
  }

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
          <ConvexClientProvider initialToken={initialToken}>
            <GlobalHeader />
            {children}
          </ConvexClientProvider>
        </AppThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
