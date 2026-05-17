import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = {
  title: "Website Audit — Acadiana Web Design",
  robots: { index: false, follow: false },
};

const CAL_LINK = "https://cal.com/layken-varholdt/agency-prospect";
const PHONE_DISPLAY = "(337) 306-3705";
const PHONE_TEL = "+13373063705";

type AuditData = {
  businessName: string;
  description: string;
  phone?: string;
  websiteUrl?: string;
  address?: string;
  rating?: number;
  reviewCount?: number;
  screenshotUrl?: string;
  technology?: string;
  isHttps?: boolean;
  performanceScore?: number;
  fcp?: number;
  lcp?: number;
  cls?: number;
  painPoints: string[];
  sellingPoints: string[];
  outreachAngle?: string;
  review?: { author: string; text: string; rating: number };
};

const PORTFOLIO = [
  { name: "TB Tree Service", niche: "Tree Services", imageSrc: "/client-tb-tree.png", w: 1916, h: 992 },
  { name: "All About Towing", niche: "Towing", imageSrc: "/client-all-about-towin.png", w: 2940, h: 1656 },
  { name: "Bordelon's Tree Service", niche: "Tree Services", imageSrc: "/client-bordelons.png", w: 2940, h: 1660 },
];

function clamp(n?: number) {
  if (typeof n !== "number" || Number.isNaN(n)) return undefined;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function fmtToday() {
  return new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function buildIssues(data: AuditData): string[] {
  const issues = [...data.painPoints];
  const score = clamp(data.performanceScore);
  if (typeof score === "number" && score < 90) issues.push(`Mobile speed score is ${score}/100 — Google penalizes this in local search.`);
  if (data.technology && data.technology !== "custom") issues.push(`Site runs on ${data.technology} — bloated, slow, and hard to update.`);
  if (data.isHttps === false) issues.push("Site is not secured with HTTPS — browsers warn visitors before they even land.");
  if (!data.websiteUrl) issues.push("No website found — every Google search for your business is a missed customer.");
  return Array.from(new Set(issues)).slice(0, 4);
}

function ScoreCircle({ score }: { score?: number }) {
  const safe = clamp(score);
  const r = 56;
  const circ = 2 * Math.PI * r;
  const pct = typeof safe === "number" ? safe / 100 : 0;
  const offset = circ * (1 - pct);
  const color =
    typeof safe !== "number" ? "#94a3b8" : safe >= 90 ? "#059669" : safe >= 50 ? "#d97706" : "#dc2626";
  return (
    <div className="relative flex h-36 w-36 items-center justify-center print-exact">
      <svg viewBox="0 0 140 140" className="h-36 w-36 -rotate-90">
        <circle cx="70" cy="70" r={r} stroke="#e5e7eb" strokeWidth="12" fill="none" />
        <circle
          cx="70"
          cy="70"
          r={r}
          strokeWidth="12"
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke={color}
        />
      </svg>
      <div className="absolute text-center">
        <p className="font-mono text-4xl font-black" style={{ color }}>
          {typeof safe === "number" ? safe : "—"}
        </p>
        <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500">/ 100</p>
      </div>
    </div>
  );
}

type AuditPrintProps = {
  params: Promise<{ token: string }>;
};

export default async function AuditPrintPage({ params }: AuditPrintProps) {
  const { token } = await params;
  const data = (await fetchQuery(api.marketing.public.getAuditData, { token })) as AuditData | null;
  if (!data) notFound();

  const score = clamp(data.performanceScore);
  const issues = buildIssues(data);
  const verdict =
    typeof score === "number" ? (score >= 90 ? "Healthy" : score >= 50 ? "Underperforming" : "Critical") : "Unknown";
  const verdictColor =
    typeof score === "number" ? (score >= 90 ? "#059669" : score >= 50 ? "#d97706" : "#dc2626") : "#475569";

  const metrics: Array<{ label: string; value: string; ok: boolean | null; hint: string }> = [
    {
      label: "Page Load",
      value: typeof data.lcp === "number" ? `${(data.lcp / 1000).toFixed(1)}s` : "—",
      ok: typeof data.lcp === "number" ? data.lcp <= 2500 : null,
      hint: "Under 2.5s ideal",
    },
    {
      label: "First Paint",
      value: typeof data.fcp === "number" ? `${(data.fcp / 1000).toFixed(1)}s` : "—",
      ok: typeof data.fcp === "number" ? data.fcp <= 1800 : null,
      hint: "Under 1.8s ideal",
    },
    {
      label: "Layout Shift",
      value: typeof data.cls === "number" ? data.cls.toFixed(2) : "—",
      ok: typeof data.cls === "number" ? data.cls <= 0.1 : null,
      hint: "Under 0.10 ideal",
    },
    {
      label: "Secure (HTTPS)",
      value: data.isHttps === undefined ? "—" : data.isHttps ? "Yes" : "No",
      ok: data.isHttps === undefined ? null : data.isHttps,
      hint: "Required by Google",
    },
  ];

  return (
    <>
      <style>{`
        @page { size: letter; margin: 0.4in; }
        @media print {
          html, body { background: #ffffff !important; }
          .no-print { display: none !important; }
          .print-exact { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page-break { page-break-after: always; break-after: page; }
          .avoid-break { page-break-inside: avoid; break-inside: avoid; }
        }
        .print-exact { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>

      <div className="no-print sticky top-0 z-50 flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3 shadow-sm">
        <p className="text-sm text-neutral-500">Print preview · use Cmd/Ctrl + P or click →</p>
        <PrintButton />
      </div>

      <main className="mx-auto max-w-[8.5in] bg-white px-10 py-8 text-neutral-900 print:p-0">
        {/* HEADER */}
        <header className="flex items-end justify-between border-b-2 border-neutral-900 pb-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Acadiana Web Design" width={44} height={44} className="rounded" unoptimized />
            <div>
              <p className="font-[family-name:var(--font-sora)] text-lg font-black leading-tight">Acadiana Web Design</p>
              <p className="text-[11px] text-neutral-500">Websites for Acadiana businesses · Built in Youngsville, LA</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">Website Audit</p>
            <p className="text-[11px] text-neutral-600">{fmtToday()}</p>
          </div>
        </header>

        {/* HERO */}
        <section className="mt-6 avoid-break">
          <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">Prepared for</p>
          <h1 className="mt-1 font-[family-name:var(--font-sora)] text-3xl font-black tracking-tight leading-tight">
            {data.businessName}
          </h1>
          {data.websiteUrl ? (
            <p className="mt-1 break-all text-sm text-neutral-500">{data.websiteUrl.replace(/^https?:\/\//, "")}</p>
          ) : (
            <p className="mt-1 text-sm text-neutral-500">No active website detected</p>
          )}

          <div className="mt-5 grid grid-cols-[auto_1fr] gap-6 rounded-xl border border-neutral-200 bg-neutral-50 p-5 print-exact">
            <div className="flex flex-col items-center">
              <ScoreCircle score={score} />
              <p className="mt-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: verdictColor }}>
                {verdict}
              </p>
            </div>
            <div className="self-center">
              <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">Google Mobile Speed</p>
              <p className="mt-1 font-[family-name:var(--font-sora)] text-xl font-black leading-tight">
                {typeof score === "number" && score < 50
                  ? "Your site is costing you customers."
                  : typeof score === "number" && score < 90
                    ? "Your site has room to grow."
                    : !data.websiteUrl
                      ? "You're invisible on Google."
                      : "Your site is doing well — here's how to keep it that way."}
              </p>
              <p className="mt-2 text-[13px] leading-snug text-neutral-600">
                53% of mobile visitors leave a site that takes longer than 3 seconds to load. Google ranks fast sites
                higher in local search — so a slow site loses you customers <em>before they ever see your work</em>.
              </p>
            </div>
          </div>
        </section>

        {/* METRICS */}
        <section className="mt-6 avoid-break">
          <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">The numbers</p>
          <div className="mt-2 grid grid-cols-4 gap-3">
            {metrics.map((m) => (
              <div key={m.label} className="rounded-lg border border-neutral-200 p-3 print-exact">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{m.label}</p>
                <p
                  className="mt-1 font-mono text-2xl font-black"
                  style={{ color: m.ok === null ? "#475569" : m.ok ? "#059669" : "#dc2626" }}
                >
                  {m.value}
                </p>
                <p className="mt-0.5 text-[9px] text-neutral-400">{m.hint}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ISSUES */}
        {issues.length > 0 && (
          <section className="mt-6 avoid-break">
            <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">What we found</p>
            <h2 className="mt-1 font-[family-name:var(--font-sora)] text-xl font-black tracking-tight">
              {issues.length} {issues.length === 1 ? "issue" : "issues"} hurting your business
            </h2>
            <ol className="mt-3 space-y-2">
              {issues.map((issue, i) => (
                <li key={issue} className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3 print-exact">
                  <span className="font-mono text-sm font-black text-red-600">{String(i + 1).padStart(2, "0")}</span>
                  <p className="text-[13px] leading-snug text-neutral-800">{issue}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* OFFER */}
        <section className="mt-6 avoid-break rounded-xl border-2 border-neutral-900 bg-neutral-900 p-6 text-white print-exact">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">Our offer</p>
              <h2 className="mt-1 font-[family-name:var(--font-sora)] text-2xl font-black leading-tight">
                $0 down. $199/month. Everything included.
              </h2>
            </div>
            <p className="text-right font-mono text-[10px] uppercase tracking-widest text-neutral-400">
              Cancel anytime
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12px]">
            {[
              "Custom design — no templates",
              "Fast hosting & SSL (HTTPS)",
              "Unlimited content edits",
              "Mobile-first, 95+ speed score",
              "Local SEO setup for Acadiana",
              "Contact forms & lead capture",
              "Analytics & monthly reports",
              "Owned by you, not us",
            ].map((feat) => (
              <div key={feat} className="flex items-start gap-2">
                <span className="mt-0.5 text-emerald-400">✓</span>
                <span className="text-neutral-200">{feat}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 border-t border-white/10 pt-3 text-[11px] text-neutral-400">
            Comparable agency build: <span className="line-through">$5,000+ upfront, $99/mo hosting</span> · We
            replaced the upfront cost with a flat monthly — so you keep your cash and we keep earning yours.
          </p>
        </section>

        {/* PORTFOLIO */}
        <section className="mt-6 avoid-break">
          <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">Recent work</p>
          <h2 className="mt-1 font-[family-name:var(--font-sora)] text-xl font-black tracking-tight">
            Sites we&apos;ve built for local trades
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {PORTFOLIO.map((p) => (
              <div key={p.name} className="overflow-hidden rounded-lg border border-neutral-200">
                <Image
                  src={p.imageSrc}
                  alt={p.name}
                  width={p.w}
                  height={p.h}
                  unoptimized
                  className="h-28 w-full object-cover object-top print-exact"
                />
                <div className="p-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">{p.niche}</p>
                  <p className="text-[11px] font-semibold text-neutral-800">{p.name}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA FOOTER */}
        <section className="mt-6 avoid-break rounded-xl border-2 border-neutral-900 p-5 print-exact">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-5">
            <Image src="/logo.png" alt="Acadiana Web Design" width={56} height={56} className="rounded" unoptimized />
            <div>
              <p className="font-[family-name:var(--font-sora)] text-lg font-black leading-tight">
                Ready to fix it? Let&apos;s talk for 15 minutes.
              </p>
              <p className="mt-0.5 text-[12px] text-neutral-600">
                No pressure, no slides. I&apos;ll show you exactly what I&apos;d change and walk you through your numbers.
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">Call or text</p>
              <a href={`tel:${PHONE_TEL}`} className="font-[family-name:var(--font-sora)] text-xl font-black text-neutral-900">
                {PHONE_DISPLAY}
              </a>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-3 text-[11px]">
            <p className="text-neutral-500">
              <span className="font-bold text-neutral-900">Layken Varholdt</span> · Founder · Youngsville, LA
            </p>
            <p className="text-neutral-500">
              Book online: <span className="font-mono text-neutral-900">{CAL_LINK.replace("https://", "")}</span>
            </p>
          </div>
        </section>

        <p className="mt-4 text-center font-mono text-[9px] uppercase tracking-widest text-neutral-400">
          Audit generated for {data.businessName} · acadianawebdesign.com
        </p>
      </main>
    </>
  );
}
