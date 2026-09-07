import type { Metadata } from "next";
import { PageContent } from "./page-content";
import {
  faqPageSchema,
  getSiteBaseUrl,
  HOMEPAGE_FAQS,
  marketingOpenGraph,
} from "@/lib/seo/site";

const baseUrl = getSiteBaseUrl();

const title = "Web Design in Lafayette, LA | Acadiana Web Design";
const description =
  "Custom web design for service businesses in Lafayette and Acadiana. $0 down, from $199/month. Hosting, edits, and support included. 12-month minimum.";

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
