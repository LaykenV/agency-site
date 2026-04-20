import Image from "next/image";

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
  { name: "TB Tree Service", niche: "Tree Services", siteUrl: "https://tbtreeservice.org/", imageSrc: "/client-tb-tree.png", imageWidth: 1916, imageHeight: 992 },
  { name: "All About Towing", niche: "Towing Services", siteUrl: "https://allabouttowingservice.com/", imageSrc: "/client-all-about-towin.png", imageWidth: 2940, imageHeight: 1656 },
  { name: "Bordelon's Tree Service", niche: "Tree Services", siteUrl: "https://bordelonstreeremoval.com/", imageSrc: "/client-bordelons.png", imageWidth: 2940, imageHeight: 1660 },
];

function clamp(s?: number) {
  if (typeof s !== "number" || Number.isNaN(s)) return undefined;
  return Math.max(0, Math.min(100, Math.round(s)));
}

function buildIssues(data: AuditReportData): string[] {
  const issues = [...data.painPoints];
  const score = clamp(data.performanceScore);
  if (typeof score === "number" && score < 90) issues.push(`Performance score is ${score}/100.`);
  if (data.technology && data.technology !== "custom") issues.push(`Running on ${data.technology}.`);
  if (data.isHttps === false) issues.push("No HTTPS encryption.");
  if (!data.websiteUrl) issues.push("No website URL found.");
  return Array.from(new Set(issues)).slice(0, 6);
}

function ScoreArc({ score }: { score?: number }) {
  const safe = clamp(score);
  const r = 58;
  const circ = 2 * Math.PI * r;
  const pct = typeof safe === "number" ? safe / 100 : 0;
  const offset = circ * (1 - pct);
  const color =
    typeof safe === "number"
      ? safe >= 90
        ? "#34d399"
        : safe >= 50
          ? "#fbbf24"
          : "#f87171"
      : "#475569";

  return (
    <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
      <svg viewBox="0 0 140 140" className="h-40 w-40 -rotate-90">
        <circle cx="70" cy="70" r={r} stroke="#1e293b" strokeWidth="12" fill="none" />
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
          style={{ filter: `drop-shadow(0 0 8px ${color}60)` }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="font-mono text-4xl font-black" style={{ color }}>
          {typeof safe === "number" ? safe : "—"}
        </p>
      </div>
    </div>
  );
}

export function AuditReport({ data }: { data: AuditReportData }) {
  const score = clamp(data.performanceScore);
  const issues = buildIssues(data);

  const metricColor = (state: "good" | "bad" | "unknown") =>
    state === "bad" ? "text-red-400" : state === "good" ? "text-emerald-400" : "text-white/40";
  const metrics: Array<{ label: string; value: string; state: "good" | "bad" | "unknown" }> = [
    {
      label: "FCP",
      value: typeof data.fcp === "number" ? `${(data.fcp / 1000).toFixed(1)}s` : "—",
      state: typeof data.fcp === "number" ? (data.fcp > 1800 ? "bad" : "good") : "unknown",
    },
    {
      label: "LCP",
      value: typeof data.lcp === "number" ? `${(data.lcp / 1000).toFixed(1)}s` : "—",
      state: typeof data.lcp === "number" ? (data.lcp > 2500 ? "bad" : "good") : "unknown",
    },
    {
      label: "CLS",
      value: typeof data.cls === "number" ? data.cls.toFixed(3) : "—",
      state: typeof data.cls === "number" ? (data.cls > 0.1 ? "bad" : "good") : "unknown",
    },
    {
      label: "HTTPS",
      value: data.isHttps === undefined ? "?" : data.isHttps ? "YES" : "NO",
      state: data.isHttps === undefined ? "unknown" : data.isHttps ? "good" : "bad",
    },
  ];

  return (
    <main className="min-h-screen bg-[#0a0a0f] pb-28 text-white">
      <div className="mx-auto max-w-7xl px-4 pt-10">
        {/* — Title — */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-white/30">AUDIT_REPORT</p>
            <h1 className="mt-1 font-[family-name:var(--font-sora)] text-3xl font-black tracking-tight md:text-5xl">
              {data.businessName}
            </h1>
          </div>
          {typeof score === "number" && (
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-3 w-3 rounded-full ${
                  score >= 90 ? "bg-emerald-400" : score >= 50 ? "bg-amber-400" : "bg-red-400"
                }`}
                style={{
                  boxShadow: `0 0 12px ${score >= 90 ? "#34d39960" : score >= 50 ? "#fbbf2460" : "#f8717160"}`,
                }}
              />
              <span className="font-mono text-sm text-white/50">
                {score >= 90 ? "HEALTHY" : score >= 50 ? "DEGRADED" : "CRITICAL"}
              </span>
            </div>
          )}
        </div>

        {/* — Bento grid — */}
        <div className="mt-8 grid gap-3 md:grid-cols-3 lg:grid-cols-4">
          {/* Score card — large */}
          <div className="md:col-span-1 rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur">
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/30">Performance</p>
            <div className="mt-4">
              <ScoreArc score={score} />
            </div>
            <p className="mt-3 text-center font-mono text-xs text-white/40">Mobile Speed</p>
          </div>

          {/* Screenshot — spans 2-3 cols */}
          <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
              <span className="ml-2 truncate font-mono text-xs text-white/20">{data.websiteUrl ?? "no website"}</span>
            </div>
            {data.screenshotUrl ? (
              <Image
                src={data.screenshotUrl}
                alt={`${data.businessName} website`}
                width={1440}
                height={860}
                unoptimized
                className="w-full h-auto"
              />
            ) : (
              <div className="flex h-48 items-center justify-center text-white/20">
                <p className="font-mono text-sm">NO_WEBSITE_DETECTED</p>
              </div>
            )}
          </div>

          {/* Metrics — 4 small cards */}
          {metrics.map((m) => (
            <div key={m.label} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/30">{m.label}</p>
              <p className={`mt-3 font-mono text-2xl font-black ${metricColor(m.state)}`}>{m.value}</p>
            </div>
          ))}

          {/* Issues — large card */}
          <div className="md:col-span-2 lg:col-span-2 rounded-2xl border border-red-500/10 bg-red-500/[0.03] p-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-red-400/60">Issues ({issues.length})</p>
            <div className="mt-4 space-y-3">
              {issues.map((issue, i) => (
                <div key={issue} className="flex items-start gap-3">
                  <span className="mt-0.5 font-mono text-xs text-red-400/40">{String(i + 1).padStart(2, "0")}</span>
                  <p className="text-sm text-white/70">{issue}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tech + Review card */}
          <div className="md:col-span-1 lg:col-span-2 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
            {data.technology && (
              <div className="mb-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/30">Platform</p>
                <p className="mt-2 text-lg font-bold capitalize text-white/80">{data.technology}</p>
              </div>
            )}
            {typeof data.rating === "number" && (
              <div className="mb-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/30">Google Rating</p>
                <p className="mt-2 text-lg font-bold text-amber-400">
                  {data.rating.toFixed(1)}{" "}
                  <span className="text-sm font-normal text-white/30">
                    / 5
                    {typeof data.reviewCount === "number" ? ` (${data.reviewCount} reviews)` : ""}
                  </span>
                </p>
              </div>
            )}
            {data.review && (
              <div className="mt-4 border-t border-white/5 pt-4">
                <p className="text-sm italic text-white/50">&ldquo;{data.review.text.slice(0, 120)}{data.review.text.length > 120 ? "…" : ""}&rdquo;</p>
                <p className="mt-2 font-mono text-xs text-white/30">— {data.review.author}</p>
              </div>
            )}
          </div>
        </div>

        {/* — Portfolio row — */}
        <section className="mt-12">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/30">Portfolio</p>
          <h2 className="mt-2 font-[family-name:var(--font-sora)] text-2xl font-black tracking-tight">
            What we build
          </h2>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {PORTFOLIO.map((p) => (
              <a
                key={p.siteUrl}
                href={p.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] transition-colors hover:border-white/10"
              >
                <Image
                  src={p.imageSrc}
                  alt={p.name}
                  width={p.imageWidth}
                  height={p.imageHeight}
                  className="h-44 w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
                <div className="p-4">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-white/30">{p.niche}</p>
                  <p className="mt-1 text-sm font-semibold text-white/80">{p.name}</p>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* — CTA — */}
        <section className="mt-16">
          <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/10 p-8 text-center md:p-14">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl"
            />
            <Image src="/logo.png" alt="Acadiana Web Design" width={40} height={40} className="relative mx-auto rounded" />
            <p className="relative mt-3 text-sm font-semibold text-white/70">Acadiana Web Design</p>
            <h2 className="relative mt-4 font-[family-name:var(--font-sora)] text-3xl font-black tracking-tight md:text-4xl">
              $0 Down. $199/mo. Everything included.
            </h2>
            <p className="relative mx-auto mt-3 max-w-md text-sm text-white/50">
              Custom design &middot; Fast hosting &middot; Unlimited edits &middot; 95+ Performance
            </p>
            <a
              href={CAL_LINK}
              className="relative mt-8 inline-flex rounded-full bg-white px-8 py-3 text-sm font-bold text-black transition-transform hover:scale-105"
            >
              Schedule Free Consultation
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
