import type { Metadata } from "next";
import { Cormorant_Garamond, Oswald } from "next/font/google";
import { notFound } from "next/navigation";
import { LeadDemoPage } from "@/components/lead-demo/LeadDemoPage";
import { PreviewViewTracker } from "@/components/lead-demo/PreviewViewTracker";
import { getLeadDemo, getLeadDemoSlugs } from "@/lib/lead-demos";

const leadDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-lead-display",
  display: "swap",
});

const tradeDisplay = Oswald({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-trade-display",
  display: "swap",
});

type PreviewPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getLeadDemoSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PreviewPageProps): Promise<Metadata> {
  const { slug } = await params;
  const demo = getLeadDemo(slug);

  if (!demo) {
    return {};
  }

  return {
    title: `${demo.businessName} — Website Concept`,
    description: `An unlisted website concept prepared for ${demo.businessName}.`,
    robots: {
      index: false,
      follow: false,
      noarchive: true,
    },
  };
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { slug } = await params;
  const demo = getLeadDemo(slug);

  if (!demo) {
    notFound();
  }

  const displayFont =
    demo.template === "trade-field" ? tradeDisplay : leadDisplay;

  return (
    <div className={displayFont.variable}>
      <PreviewViewTracker slug={slug} />
      <LeadDemoPage demo={demo} />
    </div>
  );
}
