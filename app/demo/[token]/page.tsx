import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { DemoVariations } from "@/components/demo/DemoVariations";
import { DemoViewTracker } from "@/components/demo/DemoViewTracker";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

type DemoPageProps = {
  params: Promise<{ token: string }>;
};

export default async function DemoPage({ params }: DemoPageProps) {
  const { token } = await params;
  const demo = await fetchQuery(api.marketing.public.getDemoData, { token });

  if (!demo) {
    notFound();
  }

  return (
    <>
      <DemoViewTracker token={token} />
      <DemoVariations
        data={{
          businessName: demo.businessName,
          description: demo.description,
          phone: demo.phone,
          primaryColor: demo.primaryColor,
          imageUrl: demo.imageUrl,
          review: demo.review ?? undefined,
        }}
      />
      <DemoBanner />
    </>
  );
}
