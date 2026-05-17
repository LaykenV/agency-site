"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { AlertCircle, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { AuditBanner } from "@/components/audit/AuditBanner";
import { AuditReport } from "@/components/audit/AuditReport";

const LIGHT_VARS: React.CSSProperties = {
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
  colorScheme: "light",
};

export function PublicAuditReportClient({ token }: { token: string }) {
  const audit = useQuery(api.publicAudits.getByToken, { token });
  const recordView = useMutation(api.publicAudits.recordView);

  useEffect(() => {
    if (audit?.status !== "ready") {
      return;
    }
    void recordView({ token });
  }, [audit?.status, recordView, token]);

  if (
    audit === undefined ||
    (audit && (audit.status === "queued" || audit.status === "running"))
  ) {
    return (
      <main
        style={LIGHT_VARS}
        className="relative grid min-h-screen place-items-center bg-[hsl(var(--background))] px-5 text-[hsl(var(--foreground))]"
      >
        <div
          aria-hidden
          className="page-gradient pointer-events-none absolute inset-x-0 -top-16 -z-10 h-[80vh]"
        />
        <div className="surface-elevated w-full max-w-md rounded-3xl p-8 text-center sm:p-10">
          <div className="relative mx-auto grid size-16 place-items-center">
            <div
              aria-hidden
              className="absolute inset-0 rounded-full opacity-60 blur-2xl"
              style={{
                background:
                  "radial-gradient(circle, hsl(var(--primary) / 0.5), transparent 70%)",
              }}
            />
            <Loader2 className="relative size-9 animate-spin text-[hsl(var(--primary))]" />
          </div>

          <p className="mt-6 inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
            <Sparkles className="size-3 text-[hsl(var(--primary))]" />
            Scanning
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-sora)] text-2xl font-black leading-tight tracking-tight text-[hsl(var(--foreground))] sm:text-3xl">
            Building your{" "}
            <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-[hsl(var(--primary))]">
              audit
            </span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
            I&apos;m checking the homepage, mobile speed, and a few conversion
            signals. This usually takes under a minute.
          </p>

          <ul className="mt-6 space-y-2 text-left text-[13px] text-[hsl(var(--muted-foreground))]">
            {[
              "Pulling Lighthouse Core Web Vitals…",
              "Checking HTTPS, meta tags, and platform…",
              "Drafting plain-English findings…",
            ].map((line) => (
              <li key={line} className="flex items-center gap-2">
                <span className="inline-block size-1.5 animate-pulse rounded-full bg-[hsl(var(--primary))]" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </main>
    );
  }

  if (!audit || audit.status === "failed") {
    return (
      <main
        style={LIGHT_VARS}
        className="relative grid min-h-screen place-items-center bg-[hsl(var(--background))] px-5 text-[hsl(var(--foreground))]"
      >
        <div
          aria-hidden
          className="page-gradient pointer-events-none absolute inset-x-0 -top-16 -z-10 h-[80vh]"
        />
        <div className="w-full max-w-md rounded-3xl border border-[hsl(var(--destructive)/0.25)] bg-[hsl(var(--destructive)/0.05)] p-8 text-center sm:p-10">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-[hsl(var(--destructive)/0.12)]">
            <AlertCircle className="size-6 text-[hsl(var(--destructive))]" />
          </div>
          <p className="mt-5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--destructive))]">
            Audit failed
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-sora)] text-2xl font-black leading-tight tracking-tight text-[hsl(var(--foreground))] sm:text-3xl">
            That one didn&apos;t go through.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
            The site may have blocked the scan or timed out. I still logged the
            request so I can review it manually.
          </p>
          <Link
            href="/audit"
            className="btn-cta mt-6 inline-flex w-full items-center justify-center gap-2 px-5 py-3 text-sm font-bold sm:w-auto"
          >
            <ArrowLeft className="size-4" />
            Try another URL
          </Link>
        </div>
      </main>
    );
  }

  return (
    <>
      <AuditReport
        data={{
          businessName:
            audit.websiteData?.metaTitle ||
            new URL(audit.normalizedUrl).hostname.replace(/^www\./, ""),
          description:
            audit.aiAnalysis?.businessDescription ??
            "Website audit generated from a public request.",
          websiteUrl: audit.normalizedUrl,
          screenshotUrl: audit.websiteData?.screenshotUrl,
          technology: audit.websiteData?.technology,
          isHttps: audit.websiteData?.hasHttps,
          performanceScore: audit.pageSpeedData?.performanceScore,
          fcp: audit.pageSpeedData?.fcp,
          lcp: audit.pageSpeedData?.lcp,
          cls: audit.pageSpeedData?.cls,
          painPoints: audit.aiAnalysis?.painPoints ?? [],
          sellingPoints: audit.aiAnalysis?.sellingPoints ?? [],
          outreachAngle: audit.aiAnalysis?.outreachAngle,
        }}
      />
      <AuditBanner />
    </>
  );
}
