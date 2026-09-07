import type { Metadata } from "next";
import { QuoteForm } from "@/components/marketing/QuoteForm";
import { getSiteBaseUrl, marketingOpenGraph } from "@/lib/seo/site";

const title = "Request a Website Quote";
const description =
  "Tell Acadiana Web Design what your business needs. Get a custom website quote, with $0 down and plans from $199/month. No scheduling or account required.";
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/quote" },
  openGraph: marketingOpenGraph({
    title,
    description,
    url: `${getSiteBaseUrl()}/quote`,
  }),
};
export default function QuotePage() {
  return (
    <main>
      <h1 className="sr-only">
        Request a website quote from Acadiana Web Design
      </h1>
      <QuoteForm />
    </main>
  );
}
