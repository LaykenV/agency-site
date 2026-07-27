import type { Metadata } from "next";

// Internal asset generator (1640x624 Facebook cover) — not a marketing page.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
