"use client";

import Link from "next/link";
import { CheckCircle2, Clock, MapPin, ArrowRight, Zap, Shield, Sparkles } from "lucide-react";
import { ONBOARDING_CAL_LINK } from "@/lib/config";
import { ShinyLink } from "@/components/ui/shiny-button";
import { SectionHeader } from "@/components/SectionHeader";
import { LazyMotion, domAnimation, MotionConfig, m as motion } from "framer-motion";
import {
  motionDefaults,
  fadeUp,
  sectionReveal,
  staggerContainer,
  staggerItem,
} from "@/components/animations";

interface CityData {
  name: string;
  slug: string;
  county: string;
  description: string;
  lat: number;
  lng: number;
  nearbyAreas: string[];
}

interface IndustryData {
  name: string;
  slug: string;
  plural: string;
}

interface CityPageClientProps {
  city: CityData;
  industries: IndustryData[];
  otherCities: CityData[];
}

export function CityPageClient({ city, industries, otherCities }: CityPageClientProps) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig transition={motionDefaults.transition}>
        <main className="w-full flex flex-col relative">
          {/* Full-height gradient that extends behind header */}
          <div 
            aria-hidden 
            className="absolute inset-x-0 -top-16 md:-top-20 -z-10 page-gradient h-[120vh] sm:h-[110vh] md:h-[100vh] pointer-events-none" 
          />

          {/* Hero Section */}
          <motion.section 
            className="relative overflow-hidden"
            initial="hidden"
            animate="visible"
            variants={sectionReveal}
          >
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 md:pt-8 pb-12 md:pb-20">
              {/* Location badge with fleur-de-lis accent */}
              <motion.div 
                className="flex items-center justify-center gap-3 mb-6"
                variants={fadeUp}
              >
                <span className="hidden sm:block h-px w-8 sm:w-12 bg-gradient-to-r from-transparent to-white/40" aria-hidden />
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                  <MapPin className="h-3.5 w-3.5 text-white/90" />
                  <span className="text-sm font-medium text-white/90">{city.name}, {city.county}</span>
                </div>
                <span className="hidden sm:block h-px w-8 sm:w-12 bg-gradient-to-l from-transparent to-white/40" aria-hidden />
              </motion.div>

              <motion.h1 
                className="text-center text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] sm:leading-tight mx-auto max-w-[20ch] hero-title text-[hsl(var(--primary-foreground))]"
                variants={fadeUp}
              >
                Web Design in {city.name}, Louisiana
              </motion.h1>

              <motion.p 
                className="text-center text-sm sm:text-base md:text-lg text-[hsl(var(--primary-foreground))]/90 mt-4 sm:mt-6 md:mt-8 mx-auto max-w-[38ch] sm:max-w-[48ch] leading-relaxed"
                variants={fadeUp}
              >
                Professional websites for local service businesses in {city.name}—{city.description}. 
                $0 down, $199/mo, live in 72 hours.
              </motion.p>

              {/* CTAs */}
              <motion.div 
                className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-6 sm:mt-8 md:mt-10"
                variants={fadeUp}
              >
                <ShinyLink
                  href={ONBOARDING_CAL_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="schedule-call-btn inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-bold whitespace-nowrap rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                >
                  Schedule 15-Min Call
                </ShinyLink>
                <Link
                  href="#industries"
                  className="btn-ghost-cta inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold whitespace-nowrap rounded-xl"
                >
                  See Industries We Serve
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>

              {/* Trust badges - enhanced styling */}
              <motion.div 
                className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-10"
                variants={staggerContainer}
              >
                <motion.span 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-sm text-white/90" 
                  variants={staggerItem}
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  $0 Down
                </motion.span>
                <motion.span 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-sm text-white/90" 
                  variants={staggerItem}
                >
                  <Zap className="h-4 w-4 text-amber-300" />
                  Live in 72 Hours
                </motion.span>
                <motion.span 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-sm text-white/90" 
                  variants={staggerItem}
                >
                  <Sparkles className="h-4 w-4 text-sky-300" />
                  Unlimited Edits
                </motion.span>
              </motion.div>
            </div>
          </motion.section>

          {/* Why Local Businesses Choose Us */}
          <motion.section 
            className="py-12 sm:py-16 md:py-20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={sectionReveal}
          >
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <SectionHeader as="h2">
                Why {city.name} Businesses Choose Us
              </SectionHeader>

              <motion.div 
                className="mt-8 sm:mt-10 grid gap-4 sm:gap-6 md:grid-cols-3"
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
              >
                <motion.div 
                  className="group relative surface rounded-2xl p-6 sm:p-7 overflow-hidden transition-all duration-300 hover:ring-2 hover:ring-[hsl(var(--primary))]/30 h-full" 
                  variants={staggerItem}
                >
                  {/* Decorative gradient overlay */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[hsl(var(--primary))]/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
                  <div className="relative">
                    <div className="icon-badge">
                      <MapPin className="h-6 w-6 text-[hsl(var(--primary))]" />
                    </div>
                    <h3 className="font-bold text-lg text-[var(--foreground)]">Local Focus</h3>
                    <p className="mt-3 text-sm text-[var(--muted-foreground)] leading-relaxed">
                      We specialize in {city.name} and {city.county}. Your site is optimized to rank for 
                      local searches like &quot;plumber in {city.name}&quot; or &quot;landscaper near me.&quot;
                    </p>
                  </div>
                </motion.div>

                <motion.div 
                  className="group relative surface rounded-2xl p-6 sm:p-7 overflow-hidden transition-all duration-300 hover:ring-2 hover:ring-[hsl(var(--primary))]/30 h-full" 
                  variants={staggerItem}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[hsl(var(--primary))]/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
                  <div className="relative">
                    <div className="icon-badge">
                      <Zap className="h-6 w-6 text-[hsl(var(--primary))]" />
                    </div>
                    <h3 className="font-bold text-lg text-[var(--foreground)]">Fast Launch</h3>
                    <p className="mt-3 text-sm text-[var(--muted-foreground)] leading-relaxed">
                      Most {city.name} businesses are live within 72 hours of our kickoff call. 
                      No months of waiting—get online and start getting leads.
                    </p>
                  </div>
                </motion.div>

                <motion.div 
                  className="group relative surface rounded-2xl p-6 sm:p-7 overflow-hidden transition-all duration-300 hover:ring-2 hover:ring-[hsl(var(--primary))]/30 h-full" 
                  variants={staggerItem}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[hsl(var(--primary))]/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
                  <div className="relative">
                    <div className="icon-badge">
                      <Shield className="h-6 w-6 text-[hsl(var(--primary))]" />
                    </div>
                    <h3 className="font-bold text-lg text-[var(--foreground)]">All-Inclusive</h3>
                    <p className="mt-3 text-sm text-[var(--muted-foreground)] leading-relaxed">
                      Hosting, domain, SSL, unlimited edits, and support—all included in one flat monthly price. 
                      No surprise bills or hidden fees.
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </motion.section>

          {/* Industries We Serve */}
          <motion.section 
            id="industries"
            className="anchor-target py-12 sm:py-16 md:py-20 relative"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={sectionReveal}
          >
            {/* Subtle background pattern */}
            <div className="absolute inset-0 -z-10 opacity-[0.03] dark:opacity-[0.05]" aria-hidden>
              <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            </div>
            
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <SectionHeader as="h2">
                Industries We Serve in {city.name}
              </SectionHeader>
              <p className="text-center text-[var(--muted-foreground)] mt-3 max-w-2xl mx-auto text-sm sm:text-base">
                Specialized websites designed for the unique needs of each industry
              </p>

              <motion.div 
                className="mt-8 sm:mt-10 grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4"
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
              >
                {industries.slice(0, 8).map((industry) => (
                  <motion.div key={industry.slug} variants={staggerItem} className="h-full">
                    <Link
                      href={`/${city.slug}/${industry.slug}`}
                      className="group relative surface rounded-xl p-4 sm:p-5 hover:ring-2 hover:ring-[hsl(var(--primary))]/40 hover:bg-[hsl(var(--primary))]/[0.03] transition-all duration-200 block h-full"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-[var(--foreground)] group-hover:text-[hsl(var(--primary))] transition-colors">
                          {industry.plural}
                        </h3>
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[hsl(var(--primary))]/10 group-hover:bg-[hsl(var(--primary))]/20 transition-colors flex-shrink-0">
                          <ArrowRight className="h-4 w-4 text-[hsl(var(--primary))] transform group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-[var(--muted-foreground)] leading-relaxed">
                        Websites for {industry.name.toLowerCase()}s in {city.name}
                      </p>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>

              {industries.length > 8 && (
                <p className="mt-8 text-center text-sm text-[var(--muted-foreground)]">
                  Plus {industries.length - 8} more industries including{" "}
                  {industries.slice(8, 11).map((i) => i.plural.toLowerCase()).join(", ")}, and more.
                </p>
              )}
            </div>
          </motion.section>

          {/* Nearby Areas */}
          <motion.section 
            className="py-12 sm:py-16 md:py-20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={sectionReveal}
          >
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <SectionHeader as="h2">
                Also Serving Nearby Areas
              </SectionHeader>

              <p className="text-center text-[var(--muted-foreground)] mt-4 max-w-2xl mx-auto text-sm sm:text-base">
                In addition to {city.name}, we proudly serve businesses throughout {city.county} and 
                the greater Acadiana region.
              </p>

              <motion.div 
                className="mt-8 flex flex-wrap justify-center gap-2 sm:gap-3"
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
              >
                {city.nearbyAreas.map((area) => (
                  <motion.span 
                    key={area} 
                    className="px-4 py-2 rounded-full text-xs sm:text-sm font-medium bg-[var(--secondary)] text-[var(--foreground)] border border-[var(--border)]" 
                    variants={staggerItem}
                  >
                    {area}
                  </motion.span>
                ))}
              </motion.div>

              {/* Other cities as cards */}
              <motion.div 
                className="mt-10 sm:mt-12"
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
              >
                <p className="text-center text-xs sm:text-sm text-[var(--muted-foreground)] uppercase tracking-wider font-medium mb-4">
                  Other Cities We Serve
                </p>
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                  {otherCities.map((otherCity) => (
                    <motion.div key={otherCity.slug} variants={staggerItem}>
                      <Link
                        href={`/${otherCity.slug}`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-[var(--muted-foreground)] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/5 transition-all duration-200"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        {otherCity.name}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.section>

          {/* CTA Section */}
          <motion.section 
            className="py-12 sm:py-16 md:py-20 lg:py-24 relative overflow-hidden"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={sectionReveal}
          >
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <SectionHeader as="h2" align="center" className="mb-8 sm:mb-10">
                Ready to Grow Your {city.name} Business?
              </SectionHeader>
              <div className="cta-card surface-elevated rounded-2xl sm:rounded-3xl mx-auto max-w-4xl p-6 sm:p-8 md:p-10 lg:p-12 relative overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
                <div className="absolute inset-0 beams-overlay" aria-hidden />
                <div className="relative z-[1] flex flex-col gap-6 sm:gap-8 md:grid md:grid-cols-[1fr_auto] md:items-center">
                  <div className="text-center md:text-left">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-4 sm:mb-5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/20">
                        <Zap className="h-3.5 w-3.5" /> Live in 72 hours
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="h-3.5 w-3.5" /> $0 upfront
                      </span>
                    </div>
                    <p className="text-[var(--muted-foreground)] text-sm md:text-base leading-relaxed max-w-lg mx-auto md:mx-0">
                      Join other local service businesses in {city.name} who trust us with their online presence.
                    </p>
                    <p className="mt-3 text-xs text-[var(--muted-foreground)]/80">
                      $199/mo. 12-month minimum. See{" "}
                      <Link href="/legal/terms" className="underline hover:text-[var(--foreground)] transition-colors">
                        Terms
                      </Link>
                      .
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 w-full md:w-auto md:min-w-[280px] lg:min-w-[320px]">
                    <Link 
                      href={ONBOARDING_CAL_LINK} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="btn-cta w-full inline-flex items-center justify-center gap-2 px-6 py-3 sm:py-3.5 text-sm sm:text-base whitespace-nowrap rounded-xl font-semibold"
                    >
                      Book a Free Call
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            {/* Bottom gradient fade-out */}
            <div className="absolute inset-x-0 bottom-0 h-32 pointer-events-none page-gradient-fade" aria-hidden="true" />
          </motion.section>

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
      </MotionConfig>
    </LazyMotion>
  );
}
