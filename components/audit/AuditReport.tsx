import Image from "next/image";
import { ArrowUpRight, Check, Lock, MapPin, Sparkles, Star, X } from "lucide-react";

const CAL_LINK =
  "https://cal.com/layken-varholdt/agency-prospect?utm_source=audit&utm_medium=report&utm_campaign=marketing";

type AuditReportData = {
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
  {
    name: "TB Tree Service",
    niche: "Tree Services",
    siteUrl: "https://tbtreeservice.org/",
    imageSrc: "/client-tb-tree.png",
    imageWidth: 1916,
    imageHeight: 992,
  },
  {
    name: "All About Towing",
    niche: "Towing Services",
    siteUrl: "https://allabouttowingservice.com/",
    imageSrc: "/client-all-about-towin.png",
    imageWidth: 2940,
    imageHeight: 1656,
  },
  {
    name: "Bordelon's Tree Service",
    niche: "Tree Services",
    siteUrl: "https://bordelonstreeremoval.com/",
    imageSrc: "/client-bordelons.png",
    imageWidth: 2940,
    imageHeight: 1660,
  },
];

/**
 * Re-declares the brand's LIGHT-theme HSL tokens inline so this surface is
 * always rendered light — even if the user's OS or app theme is set to dark.
 * Audit reports are sales artifacts viewed by leads via QR code, so visual
 * consistency wins over respecting the visitor's color-scheme preference.
 */
const LIGHT_SURFACE_VARS: React.CSSProperties = {
  ["--background" as never]: "225 38% 95%",
  ["--foreground" as never]: "225 30% 22%",
  ["--card" as never]: "0 0% 100%",
  ["--secondary" as never]: "225 24% 94%",
  ["--muted" as never]: "225 20% 92%",
  ["--muted-foreground" as never]: "225 18% 46%",
  ["--accent" as never]: "215 56% 92%",
  ["--border" as never]: "230 16% 84%",
  ["--primary" as never]: "215 85% 55%",
  ["--primary-foreground" as never]: "0 0% 100%",
  ["--destructive" as never]: "0 72% 50%",
  ["--success" as never]: "152 60% 38%",
  ["--warning" as never]: "37 92% 50%",
  colorScheme: "light",
};

function clamp(s?: number) {
  if (typeof s !== "number" || Number.isNaN(s)) return undefined;
  return Math.max(0, Math.min(100, Math.round(s)));
}

function stateFromScore(score?: number) {
  if (typeof score !== "number") return "unknown" as const;
  if (score >= 90) return "good" as const;
  if (score >= 50) return "warn" as const;
  return "bad" as const;
}

function verdictCopy(state: ReturnType<typeof stateFromScore>) {
  switch (state) {
    case "good":
      return { label: "Healthy", line: "Your site is doing well." };
    case "warn":
      return { label: "Underperforming", line: "Some room to grow." };
    case "bad":
      return { label: "Critical", line: "Your site is costing you customers." };
    default:
      return { label: "Unknown", line: "Score unavailable." };
  }
}

function tone(state: "good" | "warn" | "bad" | "unknown") {
  if (state === "good") return "hsl(var(--success))";
  if (state === "warn") return "hsl(var(--warning))";
  if (state === "bad") return "hsl(var(--destructive))";
  return "hsl(var(--muted-foreground))";
}

function buildIssues(data: AuditReportData): string[] {
  const issues = [...data.painPoints];
  const score = clamp(data.performanceScore);
  if (typeof score === "number" && score < 90)
    issues.push(`Mobile speed score is ${score}/100 — Google penalizes this in local search.`);
  if (data.technology && data.technology !== "custom")
    issues.push(`Running on ${data.technology} — bloated and slow to update.`);
  if (data.isHttps === false) issues.push("No HTTPS — browsers warn visitors before they land.");
  if (!data.websiteUrl) issues.push("No website detected — every Google search is a missed customer.");
  return Array.from(new Set(issues)).slice(0, 6);
}

function ScoreArc({ score }: { score?: number }) {
  const safe = clamp(score);
  const state = stateFromScore(safe);
  const r = 62;
  const circ = 2 * Math.PI * r;
  const pct = typeof safe === "number" ? safe / 100 : 0;
  const offset = circ * (1 - pct);
  const color = tone(state);
  const verdict = verdictCopy(state);

  return (
    <div className="flex flex-col items-center">
      <div className="relative grid h-44 w-44 place-items-center sm:h-48 sm:w-48">
        {/* soft brand glow behind the arc */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 rounded-full opacity-70 blur-2xl"
          style={{
            background: `radial-gradient(closest-side, ${color} 0%, transparent 70%)`,
            opacity: 0.18,
          }}
        />
        <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
          <circle
            cx="80"
            cy="80"
            r={r}
            stroke="hsl(var(--border))"
            strokeWidth="10"
            fill="none"
            opacity="0.7"
          />
          <circle
            cx="80"
            cy="80"
            r={r}
            strokeWidth="10"
            fill="none"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke={color}
            style={{ transition: "stroke-dashoffset 700ms cubic-bezier(.2,.8,.2,1)" }}
          />
        </svg>
        <div className="absolute text-center">
          <p className="font-[family-name:var(--font-sora)] text-5xl font-black leading-none" style={{ color }}>
            {typeof safe === "number" ? safe : "—"}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
            / 100
          </p>
        </div>
      </div>
      <p
        className="mt-4 font-mono text-[10px] font-bold uppercase tracking-[0.22em]"
        style={{ color }}
      >
        {verdict.label}
      </p>
    </div>
  );
}

export function AuditReport({ data }: { data: AuditReportData }) {
  const score = clamp(data.performanceScore);
  const state = stateFromScore(score);
  const verdict = verdictCopy(state);
  const issues = buildIssues(data);

  const metrics: Array<{
    label: string;
    sub: string;
    value: string;
    state: "good" | "warn" | "bad" | "unknown";
  }> = [
    {
      label: "LCP",
      sub: "Largest Paint",
      value: typeof data.lcp === "number" ? `${(data.lcp / 1000).toFixed(1)}s` : "—",
      state:
        typeof data.lcp === "number"
          ? data.lcp <= 2500
            ? "good"
            : data.lcp <= 4000
              ? "warn"
              : "bad"
          : "unknown",
    },
    {
      label: "FCP",
      sub: "First Paint",
      value: typeof data.fcp === "number" ? `${(data.fcp / 1000).toFixed(1)}s` : "—",
      state:
        typeof data.fcp === "number"
          ? data.fcp <= 1800
            ? "good"
            : data.fcp <= 3000
              ? "warn"
              : "bad"
          : "unknown",
    },
    {
      label: "CLS",
      sub: "Layout Shift",
      value: typeof data.cls === "number" ? data.cls.toFixed(3) : "—",
      state:
        typeof data.cls === "number"
          ? data.cls <= 0.1
            ? "good"
            : data.cls <= 0.25
              ? "warn"
              : "bad"
          : "unknown",
    },
    {
      label: "HTTPS",
      sub: "Encryption",
      value: data.isHttps === undefined ? "—" : data.isHttps ? "Yes" : "No",
      state:
        data.isHttps === undefined ? "unknown" : data.isHttps ? "good" : "bad",
    },
  ];

  const cleanedUrl = data.websiteUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <main
      style={LIGHT_SURFACE_VARS}
      className="relative min-h-screen bg-[hsl(var(--background))] pb-32 text-[hsl(var(--foreground))]"
    >
      {/* Soft brand backdrop — bleeds upward behind the global header. */}
      <div
        aria-hidden
        className="page-gradient pointer-events-none absolute inset-x-0 -top-16 -z-10 h-[60vh] sm:h-[70vh]"
      />

      <div className="mx-auto w-full max-w-5xl px-4 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        {/* ─── Header / business identity ─────────────────────── */}
        <header>
          <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
            <Sparkles className="size-3.5 text-[hsl(var(--primary))]" />
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em]">
              Audit Report · {new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          <h1 className="mt-3 font-[family-name:var(--font-sora)] text-[2rem] font-black leading-[1.05] tracking-tight text-[hsl(var(--foreground))] sm:text-5xl">
            <span className="block break-words">{data.businessName}</span>
            {cleanedUrl && (
              <span className="mt-1 block break-all font-[family-name:var(--font-instrument-serif)] text-base font-normal italic text-[hsl(var(--muted-foreground))] sm:text-xl">
                {cleanedUrl}
              </span>
            )}
          </h1>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))]/70 px-3 py-1.5 backdrop-blur-sm">
            <span
              className="inline-flex h-2 w-2 rounded-full"
              style={{ background: tone(state), boxShadow: `0 0 10px ${tone(state)}` }}
            />
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--foreground))]">
              {verdict.label}
            </span>
            <span className="hidden text-[12px] text-[hsl(var(--muted-foreground))] sm:inline">
              · {verdict.line}
            </span>
          </div>
        </header>

        {/* ─── Score + headline card ─────────────────────────── */}
        <section className="surface-elevated relative mt-6 overflow-hidden rounded-2xl p-6 sm:mt-8 sm:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full opacity-50 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, hsl(var(--primary) / 0.45), transparent 70%)",
            }}
          />

          <div className="relative grid items-center gap-7 sm:grid-cols-[auto_1fr] sm:gap-10">
            <ScoreArc score={score} />
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                Google Mobile Speed
              </p>
              <p className="mt-2 font-[family-name:var(--font-sora)] text-xl font-extrabold leading-snug text-[hsl(var(--foreground))] sm:text-2xl">
                {state === "bad" && "Your site is costing you customers."}
                {state === "warn" && (
                  <>
                    Your site has{" "}
                    <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-[hsl(var(--primary))]">
                      room to grow
                    </span>
                    .
                  </>
                )}
                {state === "good" &&
                  "Your site is doing well — here is how to keep it that way."}
                {state === "unknown" &&
                  !data.websiteUrl &&
                  "You're invisible on Google."}
              </p>
              <p className="mt-3 max-w-prose text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
                53% of mobile visitors leave a site that takes longer than 3 seconds
                to load. Google ranks fast sites higher in local search — so a slow
                site loses you customers{" "}
                <em className="font-[family-name:var(--font-instrument-serif)] not-italic text-[hsl(var(--foreground))]">
                  before they ever see your work
                </em>
                .
              </p>
            </div>
          </div>
        </section>

        {/* ─── Metric chips (mobile-first 2×2) ─────────────────── */}
        <section className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:grid-cols-4">
          {metrics.map((m) => {
            const c = tone(m.state);
            return (
              <div
                key={m.label}
                className="surface relative overflow-hidden rounded-xl p-4"
              >
                <div className="flex items-baseline justify-between">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                    {m.label}
                  </p>
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: c, boxShadow: `0 0 6px ${c}` }}
                  />
                </div>
                <p
                  className="mt-3 font-[family-name:var(--font-sora)] text-3xl font-black leading-none"
                  style={{ color: c }}
                >
                  {m.value}
                </p>
                <p className="mt-2 text-[11px] text-[hsl(var(--muted-foreground))]">
                  {m.sub}
                </p>
              </div>
            );
          })}
        </section>

        {/* ─── Screenshot frame ───────────────────────────────── */}
        <section className="surface mt-5 overflow-hidden rounded-2xl">
          <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/60 px-3 py-2 sm:px-4 sm:py-2.5">
            <span className="size-2.5 rounded-full bg-[hsl(0_70%_64%)]" />
            <span className="size-2.5 rounded-full bg-[hsl(40_85%_60%)]" />
            <span className="size-2.5 rounded-full bg-[hsl(140_50%_55%)]" />
            <div className="ml-2 flex min-w-0 flex-1 items-center gap-1.5 truncate rounded-md bg-[hsl(var(--card))] px-2.5 py-1 ring-1 ring-[hsl(var(--border))]">
              {data.isHttps && (
                <Lock className="size-3 shrink-0 text-[hsl(var(--success))]" />
              )}
              <span className="truncate font-mono text-[11px] text-[hsl(var(--muted-foreground))]">
                {cleanedUrl ?? "no website detected"}
              </span>
            </div>
          </div>
          {data.screenshotUrl ? (
            <Image
              src={data.screenshotUrl}
              alt={`${data.businessName} website`}
              width={1440}
              height={860}
              unoptimized
              className="h-auto w-full"
            />
          ) : (
            <div className="grid h-56 place-items-center bg-[hsl(var(--muted))]">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                No website detected
              </p>
            </div>
          )}
        </section>

        {/* ─── Findings: issues + side meta ───────────────────── */}
        <section className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          {/* Issues */}
          <article
            className="relative overflow-hidden rounded-2xl border border-[hsl(var(--destructive)/0.22)] bg-[hsl(var(--destructive)/0.04)] p-5 sm:p-6"
          >
            <div className="flex items-baseline justify-between">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--destructive))]">
                What we found
              </p>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                {issues.length} {issues.length === 1 ? "issue" : "issues"}
              </span>
            </div>
            <h2 className="mt-2 font-[family-name:var(--font-sora)] text-xl font-extrabold leading-tight text-[hsl(var(--foreground))] sm:text-2xl">
              {issues.length > 0
                ? `${issues.length} ${issues.length === 1 ? "thing" : "things"} hurting your visibility`
                : "Nothing critical — nice work."}
            </h2>
            <ol className="mt-4 divide-y divide-[hsl(var(--destructive)/0.12)]">
              {issues.map((issue, i) => (
                <li key={issue} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--destructive)/0.12)] font-mono text-[10px] font-bold text-[hsl(var(--destructive))]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="text-sm leading-relaxed text-[hsl(var(--foreground))]">{issue}</p>
                </li>
              ))}
            </ol>
          </article>

          {/* Tech + rating */}
          <article className="surface flex flex-col gap-5 rounded-2xl p-5 sm:p-6">
            {data.technology && (
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                  Platform
                </p>
                <p className="mt-1.5 font-[family-name:var(--font-sora)] text-lg font-bold capitalize text-[hsl(var(--foreground))]">
                  {data.technology}
                </p>
              </div>
            )}

            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                Encryption
              </p>
              <p className="mt-1.5 inline-flex items-center gap-1.5 font-[family-name:var(--font-sora)] text-lg font-bold text-[hsl(var(--foreground))]">
                {data.isHttps === true ? (
                  <>
                    <Check className="size-4 text-[hsl(var(--success))]" />
                    HTTPS active
                  </>
                ) : data.isHttps === false ? (
                  <>
                    <X className="size-4 text-[hsl(var(--destructive))]" />
                    Not secured
                  </>
                ) : (
                  "Unknown"
                )}
              </p>
            </div>

            {typeof data.rating === "number" && (
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                  Google Rating
                </p>
                <p className="mt-1.5 flex items-center gap-1.5 font-[family-name:var(--font-sora)] text-lg font-bold text-[hsl(var(--foreground))]">
                  <Star className="size-4 fill-[hsl(var(--warning))] text-[hsl(var(--warning))]" />
                  {data.rating.toFixed(1)}
                  <span className="text-sm font-normal text-[hsl(var(--muted-foreground))]">
                    / 5
                    {typeof data.reviewCount === "number"
                      ? ` (${data.reviewCount})`
                      : ""}
                  </span>
                </p>
              </div>
            )}

            {data.review && (
              <blockquote className="border-l-2 border-[hsl(var(--primary))] pl-3">
                <p className="font-[family-name:var(--font-instrument-serif)] text-base italic leading-snug text-[hsl(var(--foreground))]">
                  &ldquo;
                  {data.review.text.slice(0, 140)}
                  {data.review.text.length > 140 ? "…" : ""}
                  &rdquo;
                </p>
                <footer className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                  — {data.review.author}
                </footer>
              </blockquote>
            )}
          </article>
        </section>

        {/* ─── Portfolio ─────────────────────────────────────── */}
        <section className="mt-10 sm:mt-14">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                Recent work
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-sora)] text-2xl font-black tracking-tight text-[hsl(var(--foreground))]">
                Sites I&apos;ve built for local{" "}
                <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-[hsl(var(--primary))]">
                  trades
                </span>
              </h2>
            </div>
          </div>

          {/* Horizontal scroll on mobile, grid on md+ */}
          <div
            className="mt-5 -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mt-6 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0"
            style={{ scrollbarWidth: "none" }}
          >
            {PORTFOLIO.map((p) => (
              <a
                key={p.siteUrl}
                href={p.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="surface group relative w-[78%] shrink-0 snap-start overflow-hidden rounded-2xl transition-shadow hover:shadow-lg sm:w-auto"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-[hsl(var(--muted))]">
                  <Image
                    src={p.imageSrc}
                    alt={p.name}
                    fill
                    sizes="(max-width: 640px) 78vw, 33vw"
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                      {p.niche}
                    </p>
                    <p className="mt-1 font-[family-name:var(--font-sora)] text-sm font-bold text-[hsl(var(--foreground))]">
                      {p.name}
                    </p>
                  </div>
                  <ArrowUpRight className="size-4 text-[hsl(var(--muted-foreground))] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[hsl(var(--primary))]" />
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* ─── Closing CTA ───────────────────────────────────── */}
        <section className="mt-10 sm:mt-14">
          <div
            className="relative overflow-hidden rounded-3xl border border-[hsl(var(--primary)/0.18)] p-6 sm:p-10"
            style={{
              background:
                "linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--accent)) 100%)",
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -left-24 -top-24 size-80 rounded-full opacity-60 blur-3xl"
              style={{
                background:
                  "radial-gradient(circle, hsl(var(--primary) / 0.45), transparent 70%)",
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -bottom-24 size-72 rounded-full opacity-40 blur-3xl"
              style={{
                background:
                  "radial-gradient(circle, hsl(var(--primary) / 0.35), transparent 70%)",
              }}
            />

            <div className="relative flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))]/80 px-3 py-1 backdrop-blur-sm">
                <Image
                  src="/logo.png"
                  alt=""
                  width={18}
                  height={18}
                  className="rounded"
                />
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--foreground))]">
                  Acadiana Web Design
                </span>
              </div>

              <h2 className="mt-5 font-[family-name:var(--font-sora)] text-3xl font-black leading-tight tracking-tight text-[hsl(var(--foreground))] sm:text-4xl">
                <span className="font-[family-name:var(--font-instrument-serif)] text-[1.1em] font-normal italic text-[hsl(var(--primary))]">
                  $0
                </span>{" "}
                down. $199/mo.
                <br className="hidden sm:block" /> Everything included.
              </h2>

              <p className="mt-3 max-w-md text-sm leading-relaxed text-[hsl(var(--muted-foreground))] sm:text-base">
                Custom design · Fast hosting · Unlimited edits · 95+ PageSpeed
              </p>

              <a
                href={CAL_LINK}
                className="btn-cta mt-7 inline-flex w-full items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold sm:w-auto sm:px-8"
              >
                Schedule a free consultation
                <ArrowUpRight className="size-4" />
              </a>

              <p className="mt-4 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                <MapPin className="size-3 text-[hsl(var(--primary))]" />
                Built in Youngsville, LA · No pressure, no slides
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
