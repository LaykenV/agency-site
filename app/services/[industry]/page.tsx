import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, Phone, ArrowRight } from "lucide-react";
import { TARGET_INDUSTRIES, getIndustryBySlug, getAllIndustrySlugs } from "@/lib/seo/industries";
import { ACADIANA_CITIES } from "@/lib/seo/cities";
import { ONBOARDING_CAL_LINK } from "@/lib/config";
import { ShinyLink } from "@/components/ui/shiny-button";
import { SectionHeader } from "@/components/SectionHeader";

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

      <main className="w-full flex flex-col relative">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-x-0 -top-16 md:-top-20 -z-10 page-gradient h-[80vh] pointer-events-none"
          />
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 md:pt-16 pb-12 md:pb-20">
            <div className="flex items-center justify-center gap-2 text-sm text-[hsl(var(--primary-foreground))]/80 mb-4">
              <span className="pill bg-white/20 text-[hsl(var(--primary-foreground))]">
                Built for {industry.plural}
              </span>
            </div>

            <h1 className="text-center text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mx-auto max-w-[22ch] text-[hsl(var(--primary-foreground))]">
              Professional Websites for {industry.plural}
            </h1>

            <p className="text-center text-base sm:text-lg md:text-xl text-[hsl(var(--primary-foreground))]/90 mt-6 mx-auto max-w-2xl leading-relaxed">
              Get a website that actually brings in customers. Built specifically for{" "}
              {industry.name.toLowerCase()}s who want to grow their business online.
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
                $0 Down, $199/mo
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
              Sound Familiar?
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
              What You Get With Your {industry.name} Website
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

        {/* How It Works */}
        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionHeader as="h2">How It Works</SectionHeader>

            <div className="mt-8 grid gap-6 md:grid-cols-3">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[hsl(var(--primary))] text-white font-bold text-lg mb-4">
                  1
                </div>
                <h3 className="font-semibold text-lg text-[var(--foreground)]">Quick Call</h3>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  15 minutes to understand your {industry.name.toLowerCase()} business, services, and goals.
                </p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[hsl(var(--primary))] text-white font-bold text-lg mb-4">
                  2
                </div>
                <h3 className="font-semibold text-lg text-[var(--foreground)]">We Build</h3>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  We create your custom website optimized for {industry.name.toLowerCase()} services.
                </p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[hsl(var(--primary))] text-white font-bold text-lg mb-4">
                  3
                </div>
                <h3 className="font-semibold text-lg text-[var(--foreground)]">Go Live</h3>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  Your site launches in 72 hours and starts bringing in leads.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-12 md:py-16 bg-[var(--muted)]/30">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionHeader as="h2">
              FAQs for {industry.plural}
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

        {/* Service Areas */}
        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionHeader as="h2">
              Serving {industry.plural} Across Acadiana
            </SectionHeader>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {ACADIANA_CITIES.map((city) => (
                <Link
                  key={city.slug}
                  href={`/${city.slug}`}
                  className="pill hover:bg-[hsl(var(--primary))]/10 transition-colors"
                >
                  {city.name}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Other Industries */}
        <section className="py-12 md:py-16 bg-[var(--muted)]/30">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionHeader as="h2">
              We Also Build Websites For
            </SectionHeader>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {otherIndustries.map((otherIndustry) => (
                <Link
                  key={otherIndustry.slug}
                  href={`/websites-for-${otherIndustry.slug}`}
                  className="surface rounded-xl p-4 hover:ring-2 hover:ring-[hsl(var(--primary))]/50 transition-all group"
                >
                  <h3 className="font-medium text-[var(--foreground)] flex items-center justify-between">
                    {otherIndustry.plural}
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
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
                Ready to Grow Your {industry.name} Business?
              </h2>
              <p className="mt-4 text-[var(--muted-foreground)] max-w-xl mx-auto">
                Join other {industry.plural.toLowerCase()} who trust us with their online presence.
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
                <span>Websites for {industry.plural}</span>
                <span>Vet Owned</span>
                <span>Serving Acadiana</span>
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
