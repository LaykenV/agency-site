import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { DemoCTA } from "@/components/demo/DemoCTA";
import { DemoHero } from "@/components/demo/DemoHero";
import { DemoReview } from "@/components/demo/DemoReview";
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
    <main className="min-h-screen bg-slate-50 pb-24">
      <DemoViewTracker token={token} />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-8 md:py-12">
        <DemoHero
          businessName={demo.businessName}
          description={demo.description}
          imageUrl={demo.imageUrl}
          primaryColor={demo.primaryColor}
        />
        {demo.review ? (
          <DemoReview
            author={demo.review.author}
            text={demo.review.text}
            rating={demo.review.rating}
          />
        ) : null}
        <DemoCTA phone={demo.phone} />
      </div>
      <DemoBanner />
    </main>
  );
}
