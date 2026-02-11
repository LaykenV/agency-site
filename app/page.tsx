import type { Metadata } from "next";
import { PageContent } from "./page-content";

// Setup Base URL (Critical for Open Graph images)
const baseUrl = process.env.NEXT_PUBLIC_APP_URL 
  ? `https://${process.env.NEXT_PUBLIC_APP_URL}` 
  : process.env.SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  title: "Get More Calls in Acadiana with a 5‑Star Website",
  description: "Done-for-you website for local service pros in Lafayette. $0 down, $199/mo, 72-hour launch. Custom Next.js websites with unlimited edits.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Get More Calls in Acadiana with a 5‑Star Website",
    description: "Get more customers in Lafayette & Acadiana with a professional website. $0 down, 72-hour launch, unlimited edits. Perfect for plumbers, landscapers, and local service pros.",
  },
};

export default function Home() {
  return (
    <>
      {/* FAQPage JSON-LD for rich results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "What does \"unlimited edits\" include?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Reasonable updates like text, photos, hours, banners, sections, and small layout tweaks. Submit requests in the client portal anytime. Bigger redesigns get a simple scope and quote."
                }
              },
              {
                "@type": "Question",
                "name": "How fast can we launch?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Once we start the build, we aim to go live within 72 hours. Kickoff happens after we collect assets."
                }
              },
              {
                "@type": "Question",
                "name": "Do I keep my domain?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "We register and manage it for you while you're subscribed. After 12 months, it's yours to transfer if you want. Details in the Terms."
                }
              },
              {
                "@type": "Question",
                "name": "Who owns the website?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Your content is yours — copy, photos, logo. We handle the design and code while you're subscribed. It's all spelled out in the Terms."
                }
              },
              {
                "@type": "Question",
                "name": "How do I cancel?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Just email us. We ask that you stay for the first 12 months. After that, cancel anytime with a month's notice. No hoops."
                }
              }
            ]
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": baseUrl
              }
            ]
          })
        }}
      />
      <PageContent />
    </>
  );
}
