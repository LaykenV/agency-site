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
  painPoints: Array<string>;
  sellingPoints: Array<string>;
  outreachAngle?: string;
  review?: {
    author: string;
    text: string;
    rating: number;
  };
};

type Tone = {
  badge: string;
  ring: string;
  text: string;
  label: string;
};

type PortfolioItem = {
  name: string;
  niche: string;
  siteUrl: string;
  imageSrc: string;
  imageAlt: string;
  imageWidth: number;
  imageHeight: number;
};

const PORTFOLIO: Array<PortfolioItem> = [
  {
    name: "TB Tree Service",
    niche: "Tree Services",
    siteUrl: "https://tbtreeservice.org/",
    imageSrc: "/client-tb-tree.png",
    imageAlt: "TB Tree Service website screenshot",
    imageWidth: 1916,
    imageHeight: 992,
  },
  {
    name: "All About Towing",
    niche: "Towing Services",
    siteUrl: "https://allabouttowingservice.com/",
    imageSrc: "/client-all-about-towin.png",
    imageAlt: "All About Towing website screenshot",
    imageWidth: 2940,
    imageHeight: 1656,
  },
  {
    name: "Bordelon's Tree Service",
    niche: "Tree Services",
    siteUrl: "https://bordelons-tree-service.vercel.app/",
    imageSrc: "/client-bordelons.png",
    imageAlt: "Bordelon's Tree Service website screenshot",
    imageWidth: 2940,
    imageHeight: 1660,
  },
];

function clampScore(score?: number): number | undefined {
  if (typeof score !== "number" || Number.isNaN(score)) {
    return undefined;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function formatMs(ms?: number): string {
  if (typeof ms !== "number" || Number.isNaN(ms)) {
    return "N/A";
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatCls(cls?: number): string {
  if (typeof cls !== "number" || Number.isNaN(cls)) {
    return "N/A";
  }
  return cls.toFixed(3);
}

function getSpeedTone(score?: number): Tone {
  if (typeof score !== "number") {
    return {
      badge: "bg-slate-700/50 text-slate-200",
      ring: "stroke-slate-400",
      text: "text-slate-100",
      label: "Not available",
    };
  }

  if (score >= 90) {
    return {
      badge: "bg-emerald-500/20 text-emerald-200",
      ring: "stroke-emerald-400",
      text: "text-emerald-200",
      label: "Strong",
    };
  }

  if (score >= 50) {
    return {
      badge: "bg-amber-500/20 text-amber-200",
      ring: "stroke-amber-300",
      text: "text-amber-200",
      label: "Needs work",
    };
  }

  return {
    badge: "bg-rose-500/20 text-rose-200",
    ring: "stroke-rose-300",
    text: "text-rose-200",
    label: "Critical",
  };
}

function getFcpTone(value?: number): Tone {
  if (typeof value !== "number") {
    return {
      badge: "bg-slate-100 text-slate-600",
      ring: "",
      text: "text-slate-900",
      label: "Not available",
    };
  }
  if (value <= 1800) {
    return {
      badge: "bg-emerald-100 text-emerald-700",
      ring: "",
      text: "text-slate-900",
      label: "Good",
    };
  }
  if (value <= 3000) {
    return {
      badge: "bg-amber-100 text-amber-700",
      ring: "",
      text: "text-slate-900",
      label: "Improve",
    };
  }
  return {
    badge: "bg-rose-100 text-rose-700",
    ring: "",
    text: "text-slate-900",
    label: "Poor",
  };
}

function getLcpTone(value?: number): Tone {
  if (typeof value !== "number") {
    return {
      badge: "bg-slate-100 text-slate-600",
      ring: "",
      text: "text-slate-900",
      label: "Not available",
    };
  }
  if (value <= 2500) {
    return {
      badge: "bg-emerald-100 text-emerald-700",
      ring: "",
      text: "text-slate-900",
      label: "Good",
    };
  }
  if (value <= 4000) {
    return {
      badge: "bg-amber-100 text-amber-700",
      ring: "",
      text: "text-slate-900",
      label: "Improve",
    };
  }
  return {
    badge: "bg-rose-100 text-rose-700",
    ring: "",
    text: "text-slate-900",
    label: "Poor",
  };
}

function getClsTone(value?: number): Tone {
  if (typeof value !== "number") {
    return {
      badge: "bg-slate-100 text-slate-600",
      ring: "",
      text: "text-slate-900",
      label: "Not available",
    };
  }
  if (value <= 0.1) {
    return {
      badge: "bg-emerald-100 text-emerald-700",
      ring: "",
      text: "text-slate-900",
      label: "Good",
    };
  }
  if (value <= 0.25) {
    return {
      badge: "bg-amber-100 text-amber-700",
      ring: "",
      text: "text-slate-900",
      label: "Improve",
    };
  }
  return {
    badge: "bg-rose-100 text-rose-700",
    ring: "",
    text: "text-slate-900",
    label: "Poor",
  };
}

function buildIssues(data: AuditReportData): Array<string> {
  const issues = [...data.painPoints];
  const score = clampScore(data.performanceScore);

  if (!data.websiteUrl) {
    issues.push("No official website URL is listed, which can reduce lead trust and conversions.");
  }

  if (typeof score === "number" && score < 90) {
    issues.push(`Performance score is ${score}/100. Faster pages usually capture more calls.`);
  }

  if (data.technology) {
    issues.push(`Current technology stack (${data.technology}) may be limiting speed and flexibility.`);
  }

  if (data.isHttps === false) {
    issues.push("HTTPS is not fully configured, which can hurt trust and browser security signals.");
  }

  if (issues.length === 0) {
    issues.push("No critical issues were flagged automatically. A manual UX and SEO pass is still recommended.");
  }

  return Array.from(new Set(issues)).slice(0, 8);
}

function ScoreGauge({ score }: { score?: number }) {
  const safeScore = clampScore(score);
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const progress = typeof safeScore === "number" ? safeScore / 100 : 0;
  const offset = circumference * (1 - progress);
  const tone = getSpeedTone(safeScore);

  return (
    <div className="relative flex h-44 w-44 items-center justify-center">
      <svg viewBox="0 0 180 180" className="h-44 w-44 -rotate-90">
        <circle cx="90" cy="90" r={radius} className="stroke-slate-700" strokeWidth="14" fill="none" />
        <circle
          cx="90"
          cy="90"
          r={radius}
          strokeWidth="14"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={tone.ring}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-4xl font-black tracking-tight text-white">
          {typeof safeScore === "number" ? safeScore : "--"}
        </p>
        <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Performance</p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: Tone;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-black tracking-tight ${tone.text}`}>{value}</p>
      <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone.badge}`}>
        {tone.label}
      </span>
    </article>
  );
}

export function AuditReport({ data }: { data: AuditReportData }) {
  const safeScore = clampScore(data.performanceScore);
  const speedTone = getSpeedTone(safeScore);
  const issues = buildIssues(data);
  const now = new Date().toLocaleDateString();

  return (
    <main className="relative overflow-hidden bg-slate-950 pb-28 text-slate-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_22%,rgba(59,130,246,0.32),transparent_35%),radial-gradient(circle_at_84%_18%,rgba(14,165,233,0.2),transparent_40%),linear-gradient(to_bottom,rgba(15,23,42,0.95),rgba(2,6,23,1))]"
      />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
        <section className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-[0_30px_80px_-40px_rgba(59,130,246,0.75)] backdrop-blur md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
                Website Audit Report
              </p>
              <h1 className="mt-3 font-[family-name:var(--font-sora)] text-3xl font-black tracking-tight text-white md:text-5xl">
                {data.businessName}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-base">
                {data.description}
              </p>
            </div>
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${speedTone.badge}`}>
              Speed status: {speedTone.label}
            </span>
          </div>

          <div className="mt-6 grid gap-3 text-sm text-slate-200 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Address</p>
              <p className="mt-1 font-medium text-slate-100">{data.address ?? "Not available"}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Google rating</p>
              <p className="mt-1 font-medium text-slate-100">
                {typeof data.rating === "number" ? `${data.rating.toFixed(1)} / 5` : "Not available"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Reviews</p>
              <p className="mt-1 font-medium text-slate-100">
                {typeof data.reviewCount === "number" ? data.reviewCount : "Not available"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Report date</p>
              <p className="mt-1 font-medium text-slate-100">{now}</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-[family-name:var(--font-sora)] text-2xl font-black tracking-tight md:text-3xl">
              Current Site Screenshot
            </h2>
            {data.websiteUrl ? (
              <a
                href={data.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                {data.websiteUrl}
              </a>
            ) : null}
          </div>

          {data.screenshotUrl ? (
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <Image
                src={data.screenshotUrl}
                alt={`${data.businessName} website screenshot`}
                width={1440}
                height={860}
                unoptimized
                className="h-auto w-full"
              />
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="text-sm text-slate-600">No current website screenshot is available yet.</p>
              <p className="mt-2 text-xs text-slate-500">
                {data.websiteUrl
                  ? "We detected a site URL, but a screenshot was not captured."
                  : "No website URL was detected for this business."}
              </p>
            </div>
          )}

          {data.review ? (
            <blockquote className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Top review ({data.review.rating}/5)</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                &ldquo;{data.review.text}&rdquo;
              </p>
              <footer className="mt-2 text-xs font-semibold text-slate-600">{data.review.author}</footer>
            </blockquote>
          ) : null}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-100 p-6 text-slate-900 shadow-xl md:p-8">
          <h2 className="font-[family-name:var(--font-sora)] text-2xl font-black tracking-tight md:text-3xl">
            Performance Scorecard
          </h2>
          <div className="mt-6 grid items-center gap-6 lg:grid-cols-[220px_1fr]">
            <div className="mx-auto">
              <ScoreGauge score={safeScore} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard label="FCP" value={formatMs(data.fcp)} tone={getFcpTone(data.fcp)} />
              <MetricCard label="LCP" value={formatMs(data.lcp)} tone={getLcpTone(data.lcp)} />
              <MetricCard label="CLS" value={formatCls(data.cls)} tone={getClsTone(data.cls)} />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-rose-200 bg-white p-6 text-slate-900 shadow-xl md:p-8">
          <h2 className="font-[family-name:var(--font-sora)] text-2xl font-black tracking-tight md:text-3xl">
            Issues Found
          </h2>
          <div className="mt-5 grid gap-3">
            {issues.map((issue, index) => (
              <article key={issue} className="flex gap-3 rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white">
                  {index + 1}
                </span>
                <p className="text-sm leading-relaxed text-slate-700">{issue}</p>
              </article>
            ))}
          </div>

          {data.outreachAngle ? (
            <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-700">Priority opportunity</p>
              <p className="mt-2 text-sm text-slate-700">{data.outreachAngle}</p>
            </div>
          ) : null}

          {data.sellingPoints.length > 0 ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Fix plan highlights</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {data.sellingPoints.slice(0, 4).map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl md:p-8">
          <h2 className="font-[family-name:var(--font-sora)] text-2xl font-black tracking-tight md:text-3xl">
            What a Modern Site Looks Like
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Real websites we built for local service businesses focused on speed and conversions.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {PORTFOLIO.map((item) => (
              <article key={item.siteUrl} className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <Image
                  src={item.imageSrc}
                  alt={item.imageAlt}
                  width={item.imageWidth}
                  height={item.imageHeight}
                  className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="space-y-1 p-4">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{item.niche}</p>
                  <p className="text-base font-bold text-slate-900">{item.name}</p>
                  <a
                    href={item.siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex text-sm font-semibold text-blue-700 hover:text-blue-600"
                  >
                    Visit live site
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-6 text-slate-900 shadow-xl md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Ready to Fix These Issues?</p>
              <h2 className="mt-3 font-[family-name:var(--font-sora)] text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                Custom site build for $199/month
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                No large upfront invoice. You get a modern conversion-focused site, hosting, support,
                and unlimited edits in one monthly plan.
              </p>
              {data.phone ? (
                <p className="mt-2 text-sm font-semibold text-slate-800">Questions now? Call {data.phone}</p>
              ) : null}
            </div>

            <a
              href={CAL_LINK}
              className="inline-flex items-center justify-center rounded-full bg-sky-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-sky-500"
            >
              Book Your Free Consultation
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
