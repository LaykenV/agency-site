import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, MapPin, Phone } from "lucide-react";
import { ACADIANA_CITIES, getCityBySlug, getAllCitySlugs } from "@/lib/seo/cities";
import { TARGET_INDUSTRIES } from "@/lib/seo/industries";
import { ONBOARDING_CAL_LINK } from "@/lib/config";
import { ShinyLink } from "@/components/ui/shiny-button";
import { SectionHeader } from "@/components/SectionHeader";

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

      <main className="w-full flex flex-col relative">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-x-0 -top-16 md:-top-20 -z-10 page-gradient h-[80vh] pointer-events-none"
          />
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 md:pt-16 pb-12 md:pb-20">
            <div className="flex items-center justify-center gap-2 text-sm text-[hsl(var(--primary-foreground))]/80 mb-4">
              <MapPin className="h-4 w-4" />
              <span>Serving {city.name} & {city.county}</span>
            </div>

            <h1 className="text-center text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mx-auto max-w-[20ch] text-[hsl(var(--primary-foreground))]">
              Web Design in {city.name}, Louisiana
            </h1>

            <p className="text-center text-base sm:text-lg md:text-xl text-[hsl(var(--primary-foreground))]/90 mt-6 mx-auto max-w-2xl leading-relaxed">
              Professional websites for local service businesses in {city.name}—{city.description}. 
              $0 down, $199/mo, live in 72 hours.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <ShinyLink
                href={ONBOARDING_CAL_LINK}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3 text-base font-bold whitespace-nowrap rounded-xl shadow-lg hover:shadow-xl transition-shadow"
              >
                <Phone className="h-4 w-4" />
                Schedule Free Call
              </ShinyLink>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 mt-8 text-sm text-[hsl(var(--primary-foreground))]/80">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" />
                $0 Down
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-[hsl(var(--primary))]" />
                Live in 72 Hours
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" />
                Unlimited Edits
              </span>
            </div>
          </div>
        </section>

        {/* Why Local Businesses Choose Us */}
        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionHeader as="h2">
              Why {city.name} Businesses Choose Us
            </SectionHeader>

            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="surface rounded-xl p-6">
                <h3 className="font-semibold text-lg text-[var(--foreground)]">Local Focus</h3>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  We specialize in {city.name} and {city.county}. Your site is optimized to rank for 
                  local searches like &quot;plumber in {city.name}&quot; or &quot;landscaper near me.&quot;
                </p>
              </div>

              <div className="surface rounded-xl p-6">
                <h3 className="font-semibold text-lg text-[var(--foreground)]">Fast Launch</h3>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  Most {city.name} businesses are live within 72 hours of our kickoff call. 
                  No months of waiting—get online and start getting leads.
                </p>
              </div>

              <div className="surface rounded-xl p-6">
                <h3 className="font-semibold text-lg text-[var(--foreground)]">All-Inclusive</h3>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  Hosting, domain, SSL, unlimited edits, and support—all included in one flat monthly price. 
                  No surprise bills or hidden fees.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Industries We Serve */}
        <section className="py-12 md:py-16 bg-[var(--muted)]/30">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionHeader as="h2">
              Industries We Serve in {city.name}
            </SectionHeader>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {TARGET_INDUSTRIES.slice(0, 8).map((industry) => (
                <Link
                  key={industry.slug}
                  href={`/${city.slug}/${industry.slug}`}
                  className="surface rounded-xl p-4 hover:ring-2 hover:ring-[hsl(var(--primary))]/50 transition-all"
                >
                  <h3 className="font-medium text-[var(--foreground)]">
                    {industry.plural}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    Websites for {industry.name.toLowerCase()}s in {city.name}
                  </p>
                </Link>
              ))}
            </div>

            {TARGET_INDUSTRIES.length > 8 && (
              <div className="mt-6 text-center">
                <p className="text-sm text-[var(--muted-foreground)]">
                  Plus {TARGET_INDUSTRIES.length - 8} more industries including{" "}
                  {TARGET_INDUSTRIES.slice(8, 11).map((i) => i.plural.toLowerCase()).join(", ")}, and more.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Nearby Areas */}
        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionHeader as="h2">
              Also Serving Nearby Areas
            </SectionHeader>

            <p className="text-center text-[var(--muted-foreground)] mt-4 max-w-2xl mx-auto">
              In addition to {city.name}, we proudly serve businesses throughout {city.county} and 
              the greater Acadiana region.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {city.nearbyAreas.map((area) => (
                <span key={area} className="pill text-sm">
                  {area}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {otherCities.map((otherCity) => (
                <Link
                  key={otherCity.slug}
                  href={`/${otherCity.slug}`}
                  className="text-sm text-[hsl(var(--primary))] hover:underline"
                >
                  Web Design in {otherCity.name}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="surface-elevated rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center ring-1 ring-black/5 dark:ring-white/5">
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
                Ready to Grow Your {city.name} Business?
              </h2>
              <p className="mt-4 text-[var(--muted-foreground)] max-w-xl mx-auto">
                Join other local service businesses in {city.name} who trust us with their online presence. 
                $0 down, live in 72 hours.
              </p>
              <div className="mt-6">
                <Link
                  href={ONBOARDING_CAL_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-cta inline-flex items-center justify-center gap-2 px-6 py-3 text-base whitespace-nowrap rounded-xl font-semibold"
                >
                  Book a Free 15-Min Call
                </Link>
              </div>
              <p className="mt-4 text-xs text-[var(--muted-foreground)]">
                $199/mo. 12-month minimum. See{" "}
                <Link href="/legal/terms" className="underline hover:text-[var(--foreground)]">
                  Terms
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer-container pb-6 sm:pb-8">
          <div className="footer-content">
            <div className="footer-info">
              <p className="footer-copyright text-xs sm:text-sm">
                © {new Date().getFullYear()} Acadiana Web Design
              </p>
              <div className="footer-badges text-[10px] sm:text-xs">
                <span>Serving {city.name}</span>
                <span>Vet Owned</span>
                <span>Local Developer</span>
              </div>
            </div>
            <Link href="/legal/terms" className="footer-link text-xs sm:text-sm">
              Terms
            </Link>
          </div>
        </footer>
      </main>
    </>
  );
}
