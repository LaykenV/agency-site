import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { AppThemeProvider } from "@/components/theme-provider";
import { GlobalHeader } from "@/components/global-header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Websites for Local Service Companies in Acadiana | $0 Down, $199/mo",
  description: "Get a fast, done‑for‑you website in Acadiana. $0 down, $199/mo. 72‑hour go‑live, hosting, domain included, unlimited edit requests in the client portal.",
  icons: {
    icon: "/convex.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppThemeProvider>
          <ConvexClientProvider>
            <GlobalHeader />
            {children}
          </ConvexClientProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}
