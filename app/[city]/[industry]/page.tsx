import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ACADIANA_CITIES, getCityBySlug, getAllCitySlugs } from "@/lib/seo/cities";
import { TARGET_INDUSTRIES, getIndustryBySlug, getAllIndustrySlugs } from "@/lib/seo/industries";
import { CityIndustryPageClient } from "./CityIndustryPageClient";
import { faqPageSchema, getSiteBaseUrl, marketingOpenGraph } from "@/lib/seo/site";

const baseUrl = getSiteBaseUrl();

interface CityIndustryPageProps {
  params: Promise<{ city: string; industry: string }>;
}

// Generate static params for all city + industry combinations
export async function generateStaticParams() {
  const cities = getAllCitySlugs();
  const industries = getAllIndustrySlugs();
  
  const params: { city: string; industry: string }[] = [];
  
  for (const city of cities) {
    for (const industry of industries) {
      params.push({ city, industry });
    }
  }
  
  return params;
}

// Generate metadata for each city + industry combination
export async function generateMetadata({ params }: CityIndustryPageProps): Promise<Metadata> {
  const { city: citySlug, industry: industrySlug } = await params;
  const city = getCityBySlug(citySlug);
  const industry = getIndustryBySlug(industrySlug);

  if (!city || !industry) {
    return {
      title: "Page Not Found",
    };
  }

  const title = `${city.name} ${industry.name} Websites`;
  const description = `Websites for ${industry.plural.toLowerCase()} in ${city.name}, LA. $0 down, from $199/mo, 72-hour launch, unlimited edits. Built to turn local searches into calls.`;

  return {
    title,
    description,
    keywords: [
      `${industry.name.toLowerCase()} website ${city.name}`,
      `${industry.name.toLowerCase()} web design ${city.name} LA`,
      `website for ${industry.name.toLowerCase()}s ${city.name}`,
      `${city.name} ${industry.name.toLowerCase()} website`,
      `${industry.plural.toLowerCase()} website ${city.name} Louisiana`,
      ...industry.keywords.map(k => `${k} ${city.name}`),
    ],
    alternates: {
      canonical: `/${city.slug}/${industry.slug}`,
    },
    openGraph: marketingOpenGraph({
      title,
      description,
      url: `${baseUrl}/${city.slug}/${industry.slug}`,
    }),
    other: {
      "geo.region": "US-LA",
      "geo.placename": city.name,
      "geo.position": `${city.lat};${city.lng}`,
      ICBM: `${city.lat}, ${city.lng}`,
    },
  };
}

export default async function CityIndustryPage({ params }: CityIndustryPageProps) {
  const { city: citySlug, industry: industrySlug } = await params;
  const city = getCityBySlug(citySlug);
  const industry = getIndustryBySlug(industrySlug);

  if (!city || !industry) {
    notFound();
  }

  // Get other cities for this industry
  const otherCities = ACADIANA_CITIES.filter((c) => c.slug !== city.slug).slice(0, 4);
  
  // Get other industries for this city
  const otherIndustries = TARGET_INDUSTRIES.filter((i) => i.slug !== industry.slug).slice(0, 4);

  return (
    <>
      {/* LocalBusiness JSON-LD with city + industry specific data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ProfessionalService",
            name: "Acadiana Web Design",
            description: `Professional ${industry.name.toLowerCase()} website design services in ${city.name}, Louisiana. Fast, mobile-optimized sites with $0 down and pricing from $199/mo.`,
            image: `${baseUrl}/heroimg.jpg`,
            "@id": `${baseUrl}/${city.slug}/${industry.slug}`,
            url: `${baseUrl}/${city.slug}/${industry.slug}`,
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
              latitude: city.lat,
              longitude: city.lng,
            },
            areaServed: {
              "@type": "City",
              name: city.name,
            },
            priceRange: "$$",
            serviceType: [`${industry.name} Website Design`, "Web Design", "Website Development"],
          }),
        }}
      />

      {/* Service JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: `${industry.name} Website Design in ${city.name}`,
            description: `Professional website design for ${industry.plural.toLowerCase()} in ${city.name}, ${city.county}.`,
            provider: {
              "@id": `${baseUrl}/#organization`,
            },
            areaServed: {
              "@type": "City",
              name: city.name,
              containedInPlace: {
                "@type": "State",
                name: "Louisiana",
              },
            },
            serviceType: `${industry.name} Website Design`,
          }),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqPageSchema(industry.faqs)),
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
              {
                "@type": "ListItem",
                position: 3,
                name: `${industry.plural}`,
                item: `${baseUrl}/${city.slug}/${industry.slug}`,
              },
            ],
          }),
        }}
      />

      <CityIndustryPageClient
        city={{
          name: city.name,
          slug: city.slug,
          county: city.county,
        }}
        industry={{
          name: industry.name,
          slug: industry.slug,
          plural: industry.plural,
          painPoints: industry.painPoints,
          benefits: industry.benefits,
          faqs: industry.faqs,
        }}
        otherCities={otherCities.map((c) => ({
          name: c.name,
          slug: c.slug,
          county: c.county,
        }))}
        otherIndustries={otherIndustries.map((i) => ({
          name: i.name,
          slug: i.slug,
          plural: i.plural,
        }))}
      />
    </>
  );
}
