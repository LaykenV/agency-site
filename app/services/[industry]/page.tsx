import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TARGET_INDUSTRIES, getIndustryBySlug, getAllIndustrySlugs } from "@/lib/seo/industries";
import { ACADIANA_CITIES } from "@/lib/seo/cities";
import { IndustryPageClient } from "./IndustryPageClient";

// Setup Base URL
const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  ? `https://${process.env.NEXT_PUBLIC_APP_URL}`
  : process.env.SITE_URL ?? "http://localhost:3000";

interface IndustryPageProps {
  params: Promise<{ industry: string }>;
}

// Generate static params for all industries
export async function generateStaticParams() {
  return getAllIndustrySlugs().map((industry) => ({ industry }));
}

// Generate metadata for each industry
export async function generateMetadata({ params }: IndustryPageProps): Promise<Metadata> {
  const { industry: industrySlug } = await params;
  const industry = getIndustryBySlug(industrySlug);

  if (!industry) {
    return {
      title: "Page Not Found",
    };
  }

  const title = `Websites for ${industry.plural} | $0 Down, $199/mo | Acadiana`;
  const description = `Professional website design for ${industry.plural.toLowerCase()} in Louisiana. Fast, mobile-optimized sites that help ${industry.name.toLowerCase()}s get more customers. 72-hour launch, unlimited edits included.`;

  return {
    title,
    description,
    keywords: [
      ...industry.keywords,
      `${industry.name.toLowerCase()} website Lafayette`,
      `${industry.name.toLowerCase()} website Louisiana`,
      `website for ${industry.name.toLowerCase()}s`,
      `${industry.plural.toLowerCase()} website design`,
    ],
    alternates: {
      canonical: `/websites-for-${industry.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/websites-for-${industry.slug}`,
      type: "website",
    },
  };
}

export default async function IndustryPage({ params }: IndustryPageProps) {
  const { industry: industrySlug } = await params;
  const industry = getIndustryBySlug(industrySlug);

  if (!industry) {
    notFound();
  }

  // Get other industries for internal linking
  const otherIndustries = TARGET_INDUSTRIES.filter((i) => i.slug !== industry.slug).slice(0, 4);

  // Prepare cities data for client component
  const cities = ACADIANA_CITIES.map((c) => ({
    name: c.name,
    slug: c.slug,
  }));

  return (
    <>
      {/* Service JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: `Website Design for ${industry.plural}`,
            description: `Professional website design services for ${industry.plural.toLowerCase()} in Acadiana, Louisiana.`,
            provider: {
              "@type": "ProfessionalService",
              name: "Acadiana Web Design",
              url: baseUrl,
            },
            areaServed: {
              "@type": "State",
              name: "Louisiana",
            },
            serviceType: "Web Design",
          }),
        }}
      />

      {/* FAQPage JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: industry.faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
              },
            })),
          }),
        }}
      />

      {/* BreadcrumbList JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: baseUrl,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: `Websites for ${industry.plural}`,
                item: `${baseUrl}/websites-for-${industry.slug}`,
              },
            ],
          }),
        }}
      />

      <IndustryPageClient
        industry={{
          name: industry.name,
          slug: industry.slug,
          plural: industry.plural,
          painPoints: industry.painPoints,
          benefits: industry.benefits,
          faqs: industry.faqs,
        }}
        cities={cities}
        otherIndustries={otherIndustries.map((i) => ({
          name: i.name,
          slug: i.slug,
          plural: i.plural,
        }))}
      />
    </>
  );
}
