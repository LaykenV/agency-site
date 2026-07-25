import type { Metadata } from "next";
import { PageContent } from "./page-content";
import {
  faqPageSchema,
  getSiteBaseUrl,
  HOMEPAGE_FAQS,
  marketingOpenGraph,
} from "@/lib/seo/site";

const baseUrl = getSiteBaseUrl();

const title = "Get More Calls in Acadiana with a 5‑Star Website";
const description =
  "Done-for-you website for local service pros in Lafayette. $0 down, $199/mo, 72-hour launch. Custom Next.js sites with unlimited edits.";

export const metadata: Metadata = {
  // absolute avoids double-branding from the root title template
  title: { absolute: title },
  description,
  alternates: {
    canonical: "/",
  },
  openGraph: marketingOpenGraph({
    title,
    description:
      "Get more customers in Lafayette & Acadiana with a professional website. $0 down, 72-hour launch, unlimited edits.",
    url: baseUrl,
  }),
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqPageSchema(HOMEPAGE_FAQS)),
        }}
      />
      <PageContent />
    </>
  );
}
