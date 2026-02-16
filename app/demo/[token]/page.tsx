import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { DemoCTA } from "@/components/demo/DemoCTA";
import { DemoHero } from "@/components/demo/DemoHero";
import { DemoReview } from "@/components/demo/DemoReview";
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

  const originalContent = (
    <main className="min-h-screen bg-slate-50 pb-24">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 md:px-6 md:py-10">
        <DemoHero
          businessName={demo.businessName}
          description={demo.description}
          imageUrl={demo.imageUrl}
          primaryColor={demo.primaryColor}
          phone={demo.phone}
        />
        {demo.review ? (
          <DemoReview
            author={demo.review.author}
            text={demo.review.text}
            rating={demo.review.rating}
            primaryColor={demo.primaryColor}
          />
        ) : null}
        <DemoCTA phone={demo.phone} primaryColor={demo.primaryColor} />
      </div>
    </main>
  );

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
        originalContent={originalContent}
      />
      <DemoBanner />
    </>
  );
}
