import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LeadDemoPage } from "@/components/lead-demo/LeadDemoPage";
import { getLeadDemo, getLeadDemoSlugs } from "@/lib/lead-demos";

type PreviewPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getLeadDemoSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PreviewPageProps): Promise<Metadata> {
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

  return <LeadDemoPage demo={demo} />;
}
