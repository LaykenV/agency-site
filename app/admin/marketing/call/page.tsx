"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { clsx } from "clsx";
import { StickyAuth } from "@/components/StickyAuth";

type LeadDoc = Doc<"scraped_leads">;

type ObjectionCard = {
  question: string;
  response: string;
};

const OBJECTION_RESPONSES: Array<ObjectionCard> = [
  {
    question: "I already have a website.",
    response:
      "Makes sense. I looked at it and your mobile speed can likely be improved. Slow load times hide good businesses in Google results. I can rebuild it to load fast and keep your brand, without an upfront build fee.",
  },
  {
    question: "How much does it cost?",
    response:
      "It is $199 per month with $0 down. That includes design, hosting, domain, updates, support, and unlimited content edits.",
  },
  {
    question: "$199/month is too much.",
    response:
      "Totally fair to ask. For most home-service businesses, one extra booked job can cover several months. The real cost is missed calls from a slow or outdated site.",
  },
  {
    question: "I do not want a 12-month commitment.",
    response:
      "The 12-month term lets me do a full custom build without charging upfront. After that, it is month-to-month and you can cancel anytime.",
  },
  {
    question: "I need to think about it.",
    response:
      "No pressure. Let me send a preview tailored to your business so you can evaluate something concrete. I can follow up next week after you review it.",
  },
  {
    question: "Can you do a one-time flat fee?",
    response:
      "I can, but then hosting, security, updates, and edits become separate work. The monthly setup keeps everything managed so you never need to handle website issues yourself.",
  },
  {
    question: "I tried a website before and it did not work.",
    response:
      "That happens a lot when sites are slow, not mobile-first, or not built for local search intent. My process focuses on speed and local conversion so the site actually supports calls.",
  },
  {
    question: "How is this better than Wix or Squarespace?",
    response:
      "Those are DIY builders. This is a hand-built service site optimized for mobile speed, local rankings, and ongoing support. You get performance and a dedicated person for changes.",
  },
  {
    question: "Send me info by email.",
    response:
      "Absolutely. I will send your preview plus examples and keep it short. What is the best email to use?",
  },
];

function formatDate(ts?: number): string {
  if (!ts) return "-";
  return new Date(ts).toLocaleString();
}

function getScenario(lead: LeadDoc): "no_website" | "slow_site" | "needs_improvement" {
  if (!lead.googleData.websiteUrl) {
    return "no_website";
  }

  const score = lead.pageSpeedData?.performanceScore;
  if (typeof score === "number" && score < 75) {
    return "slow_site";
  }

  return "needs_improvement";
}

function getOpeners(lead: LeadDoc): Array<string> {
  const business = lead.googleData.businessName;
  const scenario = getScenario(lead);

  if (scenario === "no_website") {
    return [
      `Hey, is this the owner at ${business}? I am Layken, a local web developer. I saw your strong Google reviews and noticed there is no website yet. Do you have 60 seconds for one quick idea?`,
      `I was looking at businesses in your area and saw ${business} standing out on reviews. I think you are missing calls because competitors with websites get picked first. Can I share a fast fix?`,
      `I help local service businesses launch fast websites without upfront build fees. I had one thought specific to ${business}. Got one minute?`,
    ];
  }

  if (scenario === "slow_site") {
    const score = lead.pageSpeedData?.performanceScore;
    return [
      `I pulled up ${business}'s website on mobile and noticed it is loading slowly. If your PageSpeed score is ${score ?? "low"}, that can cost local search visibility. Can I explain quickly?`,
      `You have good reviews, but your current site speed is likely hurting conversions on phones. I build local sites that load fast and rank better. Got a quick minute?`,
      `I ran a quick speed check while reviewing local companies. I think ${business} can recover missed calls with a faster site. Want the 30-second version?`,
    ];
  }

  return [
    `I came across ${business} while reviewing local service businesses. Your presence is solid, but I spotted a couple of website issues that may be costing calls. Do you have a minute?`,
    `I help businesses like ${business} turn website traffic into booked jobs. I had one specific improvement idea after checking your current site. Quick share?`,
    `You are doing the hard part well with reviews and reputation. I think the website can match that trust better and convert more of your local search traffic.`,
  ];
}

function getPainPoints(lead: LeadDoc): Array<string> {
  const aiPainPoints = lead.aiAnalysis?.painPoints ?? [];
  const generated: Array<string> = [];

  if (!lead.googleData.websiteUrl) {
    generated.push("No official website means searchers often call a competitor first.");
  }

  const speed = lead.pageSpeedData?.performanceScore;
  if (typeof speed === "number" && speed < 75) {
    generated.push(
      `Mobile performance score is ${speed}/100, which can hurt rankings and increase bounces.`
    );
  }

  if ((lead.googleData.reviewCount ?? 0) > 0 && !lead.googleData.websiteUrl) {
    generated.push(
      "Strong reviews are not being fully monetized because visitors have no professional site to validate trust."
    );
  }

  if (!lead.googleData.phone) {
    generated.push("Public contact details are incomplete, making it harder for prospects to convert.");
  }

  return [...aiPainPoints, ...generated].slice(0, 8);
}

function getSellingPoints(lead: LeadDoc): Array<string> {
  const aiSellingPoints = lead.aiAnalysis?.sellingPoints ?? [];
  const defaults = [
    "$0 down and $199/month with hosting, domain, support, and unlimited edits included.",
    "72-hour launch timeline after kickoff, so they see value fast.",
    "Hand-coded Next.js builds focused on mobile speed and local SEO visibility.",
    "You stay the dedicated point of contact for updates instead of generic ticket support.",
  ];

  return [...aiSellingPoints, ...defaults].slice(0, 8);
}

function LeadQuickStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn";
}) {
  return (
    <div
      className={clsx(
        "rounded-lg border px-3 py-2",
        tone === "good" && "border-emerald-500/30 bg-emerald-500/10",
        tone === "warn" && "border-amber-500/30 bg-amber-500/10",
        tone === "neutral" && "border-border bg-muted/60"
      )}
    >
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ErrorStatePage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="min-h-[calc(100dvh_-_var(--global-header-height))] px-4 py-10 md:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-xl border border-border bg-card p-6">
          <h1 className="text-2xl font-bold text-card-foreground">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          <Link
            href="/admin/marketing"
            className="mt-4 inline-flex rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Back to Marketing Pipeline
          </Link>
        </div>
      </div>
    </div>
  );
}

function CallHelpContent() {
  const searchParams = useSearchParams();
  const leadId = (searchParams.get("id") ?? "").trim();
  const looksLikeLeadId = /^[A-Za-z0-9_-]{8,}$/.test(leadId);

  const leadResult = useQuery(
    api.marketing.search.getLeadByIdForCallHelp,
    leadId && looksLikeLeadId ? { leadId: leadId as Id<"scraped_leads"> } : "skip"
  ) as { unauthorized: boolean; lead: LeadDoc | null } | undefined;

  const hasId = Boolean(leadId);

  if (!hasId) {
    return (
      <ErrorStatePage
        title="Call Help"
        description="Missing `id` query param. Open this page from a lead card to load the full call script."
      />
    );
  }

  if (!looksLikeLeadId) {
    return (
      <ErrorStatePage
        title="Invalid lead id"
        description="This link is missing a valid lead identifier. Open the page from a lead card."
      />
    );
  }

  if (leadResult === undefined) {
    return (
      <div className="min-h-[calc(100dvh_-_var(--global-header-height))] px-4 py-10 md:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            <div className="inline-flex h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
            Loading lead call prep...
          </div>
        </div>
      </div>
    );
  }

  if (leadResult.unauthorized) {
    return (
      <ErrorStatePage
        title="Admin access required"
        description="You do not have permission to view this call help page."
      />
    );
  }

  const lead = leadResult.lead;

  if (!lead) {
    return (
      <ErrorStatePage
        title="Lead not found"
        description="This lead may have been deleted or the link is invalid."
      />
    );
  }

  const speedScore = lead.pageSpeedData?.performanceScore;
  const fitScore = lead.aiAnalysis?.fitScore;
  const painPoints = getPainPoints(lead);
  const sellingPoints = getSellingPoints(lead);
  const openers = getOpeners(lead);

  return (
    <div className="min-h-[calc(100dvh_-_var(--global-header-height))] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-primary">
              Call Console
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {lead.googleData.businessName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {lead.googleData.formattedAddress}
            </p>
          </div>

          <Link
            href="/admin/marketing"
            className="inline-flex items-center rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Back to Pipeline
          </Link>
        </div>

        {/* Hero card — CTA + primary opener + quick stats */}
        <section className="rounded-xl border border-border bg-card p-4 md:p-5">
          <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
            {/* Left: actions + opener */}
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {lead.googleData.phone ? (
                  <a
                    href={`tel:${lead.googleData.phone.replace(/[^\d+]/g, "")}`}
                    className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                  >
                    Call {lead.googleData.phone}
                  </a>
                ) : null}
                {lead.googleData.websiteUrl ? (
                  <a
                    href={lead.googleData.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    Open Website
                  </a>
                ) : null}
                {lead.googleData.googleMapsUrl ? (
                  <a
                    href={lead.googleData.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    Google Maps
                  </a>
                ) : null}
                {lead.demoToken ? (
                  <a
                    href={`/audit/${lead.demoToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-lg bg-primary/15 px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/25"
                  >
                    Open Audit
                  </a>
                ) : null}
              </div>

              <div className="rounded-lg bg-primary/10 p-4">
                <p className="text-xs font-medium uppercase tracking-widest text-primary">
                  Primary opener
                </p>
                <p className="mt-2 text-sm leading-relaxed text-foreground">{openers[0]}</p>
              </div>
            </div>

            {/* Right: quick stats grid */}
            <div className="grid grid-cols-2 gap-2">
              <LeadQuickStat
                label="Status"
                value={lead.status.replace("_", " ")}
                tone={
                  ["qualified", "contacted", "follow_up", "responded"].includes(lead.status)
                    ? "good"
                    : "neutral"
                }
              />
              <LeadQuickStat
                label="Fit score"
                value={typeof fitScore === "number" ? `${fitScore}/10` : "N/A"}
                tone={typeof fitScore === "number" && fitScore >= 7 ? "good" : "warn"}
              />
              <LeadQuickStat
                label="PageSpeed"
                value={typeof speedScore === "number" ? `${speedScore}/100` : "N/A"}
                tone={typeof speedScore === "number" && speedScore >= 80 ? "good" : "warn"}
              />
              <LeadQuickStat
                label="Google reviews"
                value={
                  typeof lead.googleData.rating === "number"
                    ? `${lead.googleData.rating} (${lead.googleData.reviewCount ?? 0})`
                    : "N/A"
                }
              />
              <LeadQuickStat label="Attempts" value={`${lead.contactAttempts ?? 0}`} />
              <LeadQuickStat label="Last called" value={formatDate(lead.calledAt)} />
            </div>
          </div>

          {/* Contact details strip */}
          <div className="mt-4 grid gap-x-4 gap-y-1 rounded-lg bg-muted/60 p-3 text-sm md:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Phone:</span>{" "}
              <span className="font-medium text-foreground">{lead.googleData.phone ?? "-"}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Website:</span>{" "}
              <span className="font-medium text-foreground">
                {lead.googleData.websiteUrl ?? "No website"}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Contact Email:</span>{" "}
              <span className="font-medium text-foreground">{lead.contactEmail ?? "-"}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Primary Type:</span>{" "}
              <span className="font-medium text-foreground">
                {lead.googleData.primaryType ?? "-"}
              </span>
            </p>
          </div>
        </section>

        {/* Two-column body */}
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          {/* Left column — scripts & flow */}
          <section className="space-y-6">
            {/* Openers */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold text-card-foreground">Openers you can use</h2>
              <ul className="mt-4 space-y-3">
                {openers.map((opener) => (
                  <li
                    key={opener}
                    className="rounded-lg bg-muted/60 p-3 text-sm leading-relaxed text-foreground"
                  >
                    {opener}
                  </li>
                ))}
              </ul>
            </div>

            {/* Objections */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold text-card-foreground">
                Objections and responses
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Tap an objection to expand the recommended response.
              </p>
              <div className="mt-4 space-y-2">
                {OBJECTION_RESPONSES.map((item) => (
                  <details
                    key={item.question}
                    className="group rounded-lg border border-border bg-muted/40 transition-colors open:border-primary/30 open:bg-primary/5"
                  >
                    <summary className="cursor-pointer list-none px-3 py-2.5 pr-8 text-sm font-semibold text-foreground">
                      {item.question}
                      <span className="float-right text-primary transition-transform duration-200 group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="border-t border-border px-3 py-3 text-sm leading-relaxed text-muted-foreground">
                      {item.response}
                    </p>
                  </details>
                ))}
              </div>
            </div>

            {/* Call flow */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold text-card-foreground">Call flow</h2>
              <ol className="mt-4 grid gap-3 md:grid-cols-2">
                {[
                  "Hook in 15 seconds and ask for permission to continue.",
                  "Diagnose: ask 2 quick questions about calls, source of leads, and current site.",
                  "Agitate with one concrete cost (missed calls, poor mobile conversion, low search visibility).",
                  "Present your offer in 3 bullets max: speed, support, price model.",
                  "Close with a low-friction next step: send preview, quick kickoff, or follow-up date.",
                  "Log notes immediately and set next action before the next dial.",
                ].map((step, index) => (
                  <li key={step} className="rounded-lg bg-muted/60 p-3 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                      Step {index + 1}
                    </p>
                    <p className="mt-1 leading-relaxed text-foreground">{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* Right column — intel cards */}
          <aside className="space-y-6">
            {/* Pain points */}
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
              <h3 className="text-lg font-semibold text-red-700 dark:text-red-300">
                Pain points to mention
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                {painPoints.length ? (
                  painPoints.map((point) => (
                    <li
                      key={point}
                      className="rounded-lg border border-red-500/15 bg-red-500/10 p-2.5 text-red-800 dark:text-red-200"
                    >
                      {point}
                    </li>
                  ))
                ) : (
                  <li className="text-muted-foreground">
                    No explicit pain points found yet for this lead.
                  </li>
                )}
              </ul>
            </div>

            {/* Selling points */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <h3 className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                Selling points to hit
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                {sellingPoints.map((point) => (
                  <li
                    key={point}
                    className="rounded-lg border border-emerald-500/15 bg-emerald-500/10 p-2.5 text-emerald-800 dark:text-emerald-200"
                  >
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Outreach angle */}
            {lead.aiAnalysis?.outreachAngle ? (
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
                <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                  Outreach angle
                </h3>
                <p className="mt-3 rounded-lg border border-blue-500/15 bg-blue-500/10 p-3 text-sm leading-relaxed text-blue-800 dark:text-blue-200">
                  {lead.aiAnalysis.outreachAngle}
                </p>
              </div>
            ) : null}

            {/* Post-call AI review */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
              <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-300">
                Post-call AI review (coming soon)
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="rounded-lg border border-amber-500/15 bg-amber-500/10 p-2.5 text-amber-800 dark:text-amber-200">
                  Transcript quality and talk-listen ratio
                </li>
                <li className="rounded-lg border border-amber-500/15 bg-amber-500/10 p-2.5 text-amber-800 dark:text-amber-200">
                  Objection handling score and missed opportunities
                </li>
                <li className="rounded-lg border border-amber-500/15 bg-amber-500/10 p-2.5 text-amber-800 dark:text-amber-200">
                  Recommended follow-up and best next message
                </li>
              </ul>
            </div>

            {/* Admin notes */}
            {lead.adminNotes ? (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-lg font-semibold text-card-foreground">Current admin notes</h3>
                <p className="mt-3 rounded-lg bg-muted/60 p-3 text-sm leading-relaxed text-foreground">
                  {lead.adminNotes}
                </p>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function MarketingCallHelpPage() {
  return (
    <StickyAuth
      loadingFallback={
        <div className="flex min-h-[calc(100dvh_-_var(--global-header-height))] items-center justify-center bg-background text-foreground">
          <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
            <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
            <p>Loading call workspace...</p>
          </div>
        </div>
      }
      unauthenticatedFallback={
        <div className="flex min-h-[calc(100dvh_-_var(--global-header-height))] items-center justify-center bg-background px-6 text-foreground">
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Please sign in to access admin</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You must be authenticated to view this page.
            </p>
          </div>
        </div>
      }
    >
      <CallHelpContent />
    </StickyAuth>
  );
}
