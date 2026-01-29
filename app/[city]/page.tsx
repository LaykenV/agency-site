import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ACADIANA_CITIES, getCityBySlug, getAllCitySlugs } from "@/lib/seo/cities";
import { TARGET_INDUSTRIES } from "@/lib/seo/industries";
import { CityPageClient } from "./CityPageClient";

// Setup Base URL
const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  ? `https://${process.env.NEXT_PUBLIC_APP_URL}`
  : process.env.SITE_URL ?? "http://localhost:3000";

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

  const title = `Web Design in ${city.name}, LA | $0 Down, $199/mo`;
  const description = `Professional website design for ${city.name} businesses. Fast, mobile-optimized sites with 72-hour launch. Serving plumbers, landscapers, contractors, and local service pros in ${city.county}.`;

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
    openGraph: {
      title,
      description,
      url: `${baseUrl}/${city.slug}`,
      type: "website",
    },
    other: {
      "geo.region": "US-LA",
      "geo.placename": city.name,
      "geo.position": `${city.lat};${city.lng}`,
      ICBM: `${city.lat}, ${city.lng}`,
    },
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
      {/* LocalBusiness JSON-LD with city-specific data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ProfessionalService",
            name: "Acadiana Web Design",
            description: `Professional website design services for local businesses in ${city.name}, Louisiana. Fast, mobile-optimized sites with $0 down and $199/mo.`,
            image: `${baseUrl}/heroimg.png`,
            "@id": `${baseUrl}/${city.slug}`,
            url: `${baseUrl}/${city.slug}`,
            telephone: "+1-337-306-3705",
            email: "hello@acadianawebdesign.com",
            address: {
              "@type": "PostalAddress",
              addressLocality: city.name,
              addressRegion: "LA",
              addressCountry: "US",
            },
            geo: {
              "@type": "GeoCoordinates",
              latitude: city.lat.toString(),
              longitude: city.lng.toString(),
            },
            areaServed: {
              "@type": "City",
              name: city.name,
            },
            priceRange: "$199",
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
