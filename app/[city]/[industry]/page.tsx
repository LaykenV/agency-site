import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, MapPin, Phone, ArrowRight } from "lucide-react";
import { ACADIANA_CITIES, getCityBySlug, getAllCitySlugs } from "@/lib/seo/cities";
import { TARGET_INDUSTRIES, getIndustryBySlug, getAllIndustrySlugs } from "@/lib/seo/industries";
import { ONBOARDING_CAL_LINK } from "@/lib/config";
import { ShinyLink } from "@/components/ui/shiny-button";
import { SectionHeader } from "@/components/SectionHeader";

// Setup Base URL
const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  ? `https://${process.env.NEXT_PUBLIC_APP_URL}`
  : process.env.SITE_URL ?? "http://localhost:3000";

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

  const title = `${industry.name} Website Design in ${city.name}, LA | $0 Down, $199/mo`;
  const description = `Professional website design for ${industry.plural.toLowerCase()} in ${city.name}, Louisiana. Get more customers with a fast, mobile-optimized site. 72-hour launch, unlimited edits included.`;

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
    openGraph: {
      title,
      description,
      url: `${baseUrl}/${city.slug}/${industry.slug}`,
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
            description: `Professional ${industry.name.toLowerCase()} website design services in ${city.name}, Louisiana. Fast, mobile-optimized sites with $0 down and $199/mo.`,
            image: `${baseUrl}/heroimg.png`,
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
              latitude: city.lat.toString(),
              longitude: city.lng.toString(),
            },
            areaServed: {
              "@type": "City",
              name: city.name,
            },
            priceRange: "$199",
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
              "@type": "ProfessionalService",
              name: "Acadiana Web Design",
              url: baseUrl,
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
              <span>Serving {industry.plural} in {city.name}, LA</span>
            </div>

            <h1 className="text-center text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mx-auto max-w-[24ch] text-[hsl(var(--primary-foreground))]">
              {industry.name} Website Design in {city.name}
            </h1>

            <p className="text-center text-base sm:text-lg md:text-xl text-[hsl(var(--primary-foreground))]/90 mt-6 mx-auto max-w-2xl leading-relaxed">
              Get a professional website that helps your {industry.name.toLowerCase()} business stand out in {city.name}. 
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

        {/* Pain Points Section */}
        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionHeader as="h2">
              Challenges {city.name} {industry.plural} Face Online
            </SectionHeader>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {industry.painPoints.map((pain, index) => (
                <div
                  key={index}
                  className="surface rounded-xl p-5 border-l-4 border-red-400/50"
                >
                  <p className="text-[var(--foreground)]">{pain}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-12 md:py-16 bg-[var(--muted)]/30">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionHeader as="h2">
              What Your {city.name} {industry.name} Website Includes
            </SectionHeader>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {industry.benefits.map((benefit, index) => (
                <div key={index} className="surface rounded-xl p-5 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[hsl(var(--primary))] flex-shrink-0 mt-0.5" />
                  <p className="text-[var(--foreground)]">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Local Focus Section */}
        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionHeader as="h2">
              Why Local {industry.plural} in {city.name} Choose Us
            </SectionHeader>

            <div className="mt-8 grid gap-6 md:grid-cols-3">
              <div className="surface rounded-xl p-6">
                <h3 className="font-semibold text-lg text-[var(--foreground)]">{city.name} Focused</h3>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  We optimize your site to rank for &quot;{industry.name.toLowerCase()} in {city.name}&quot; and 
                  &quot;{industry.name.toLowerCase()} near me&quot; searches in {city.county}.
                </p>
              </div>

              <div className="surface rounded-xl p-6">
                <h3 className="font-semibold text-lg text-[var(--foreground)]">Built for {industry.plural}</h3>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  We understand what {industry.name.toLowerCase()} customers want. Your site showcases your 
                  services and makes it easy to get quotes.
                </p>
              </div>

              <div className="surface rounded-xl p-6">
                <h3 className="font-semibold text-lg text-[var(--foreground)]">All-Inclusive</h3>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  Hosting, domain, SSL, unlimited edits—all included. No surprise bills. 
                  Just one flat monthly price.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-12 md:py-16 bg-[var(--muted)]/30">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionHeader as="h2">
              FAQs for {city.name} {industry.plural}
            </SectionHeader>

            <div className="mt-8 max-w-3xl mx-auto space-y-4">
              {industry.faqs.map((faq, index) => (
                <div key={index} className="surface rounded-xl p-5">
                  <h3 className="font-semibold text-[var(--foreground)]">{faq.question}</h3>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Other Industries in This City */}
        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionHeader as="h2">
              Other Services We Build Websites For in {city.name}
            </SectionHeader>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {otherIndustries.map((otherIndustry) => (
                <Link
                  key={otherIndustry.slug}
                  href={`/${city.slug}/${otherIndustry.slug}`}
                  className="surface rounded-xl p-4 hover:ring-2 hover:ring-[hsl(var(--primary))]/50 transition-all group"
                >
                  <h3 className="font-medium text-[var(--foreground)] flex items-center justify-between">
                    {otherIndustry.plural}
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    in {city.name}
                  </p>
                </Link>
              ))}
            </div>

            <div className="mt-6 text-center">
              <Link
                href={`/${city.slug}`}
                className="text-sm text-[hsl(var(--primary))] hover:underline"
              >
                View all services in {city.name} →
              </Link>
            </div>
          </div>
        </section>

        {/* Same Industry in Other Cities */}
        <section className="py-12 md:py-16 bg-[var(--muted)]/30">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionHeader as="h2">
              {industry.name} Websites in Other Acadiana Cities
            </SectionHeader>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {otherCities.map((otherCity) => (
                <Link
                  key={otherCity.slug}
                  href={`/${otherCity.slug}/${industry.slug}`}
                  className="pill hover:bg-[hsl(var(--primary))]/10 transition-colors"
                >
                  {otherCity.name}
                </Link>
              ))}
            </div>

            <div className="mt-6 text-center">
              <Link
                href={`/websites-for-${industry.slug}`}
                className="text-sm text-[hsl(var(--primary))] hover:underline"
              >
                View all {industry.name.toLowerCase()} website services →
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="surface-elevated rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center ring-1 ring-black/5 dark:ring-white/5">
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
                Ready to Grow Your {industry.name} Business in {city.name}?
              </h2>
              <p className="mt-4 text-[var(--muted-foreground)] max-w-xl mx-auto">
                Join other {industry.plural.toLowerCase()} in {city.name} who trust us with their online presence.
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
                <span>{industry.plural} in {city.name}</span>
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
