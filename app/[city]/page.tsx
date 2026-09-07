import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ACADIANA_CITIES, getCityBySlug, getAllCitySlugs } from "@/lib/seo/cities";
import { TARGET_INDUSTRIES } from "@/lib/seo/industries";
import { CityPageClient } from "./CityPageClient";
import { getSiteBaseUrl, marketingOpenGraph } from "@/lib/seo/site";

const baseUrl = getSiteBaseUrl();

interface CityPageProps {
  params: Promise<{ city: string }>;
}

// Generate static params for all cities
export async function generateStaticParams() {
  return getAllCitySlugs().map((city) => ({ city }));
}

// Generate metadata for each city
export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { city: citySlug } = await params;
  const city = getCityBySlug(citySlug);

  if (!city) {
    return {
      title: "Page Not Found",
    };
  }

  const title = `Web Design in ${city.name}, LA`;
  const description = `Professional website design for ${city.name} businesses. $0 down, from $199/mo, 72-hour launch. Built for plumbers, landscapers, and local service pros.`;

  return {
    title,
    description,
    keywords: [
      `web design ${city.name} LA`,
      `website design ${city.name}`,
      `${city.name} web developer`,
      `website for business ${city.name}`,
      `small business website ${city.name} Louisiana`,
      `affordable web design ${city.name}`,
    ],
    alternates: {
      canonical: `/${city.slug}`,
    },
    openGraph: marketingOpenGraph({
      title,
      description,
      url: `${baseUrl}/${city.slug}`,
    }),
  };
}

export default async function CityPage({ params }: CityPageProps) {
  const { city: citySlug } = await params;
  const city = getCityBySlug(citySlug);

  if (!city) {
    notFound();
  }

  // Get other cities for internal linking
  const otherCities = ACADIANA_CITIES.filter((c) => c.slug !== city.slug).slice(0, 5);

  // Prepare industries data for client component
  const industries = TARGET_INDUSTRIES.map((i) => ({
    name: i.name,
    slug: i.slug,
    plural: i.plural,
  }));

  return (
    <>
      {/* Service area linked to the single site-wide business entity */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: `Web Design in ${city.name}`,
            provider: { "@id": `${baseUrl}/#organization` },
            description: `Professional website design services for local businesses in ${city.name}, Louisiana. Fast, mobile-optimized sites with $0 down and pricing from $199/mo.`,
            image: `${baseUrl}/heroimg.jpg`,
            "@id": `${baseUrl}/${city.slug}`,
            url: `${baseUrl}/${city.slug}`,
            areaServed: {
              "@type": "City",
              name: city.name,
            },
            priceRange: "$$",
            serviceType: ["Web Design", "Website Development", "Website Hosting", "Local SEO"],
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
                name: city.name,
                item: `${baseUrl}/${city.slug}`,
              },
            ],
          }),
        }}
      />

      <CityPageClient 
        city={{
          name: city.name,
          slug: city.slug,
          county: city.county,
          description: city.description,
          lat: city.lat,
          lng: city.lng,
          nearbyAreas: city.nearbyAreas,
        }}
        industries={industries}
        otherCities={otherCities.map((c) => ({
          name: c.name,
          slug: c.slug,
          county: c.county,
          description: c.description,
          lat: c.lat,
          lng: c.lng,
          nearbyAreas: c.nearbyAreas,
        }))}
      />
    </>
  );
}
