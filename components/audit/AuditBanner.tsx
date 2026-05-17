import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

const CAL_LINK =
  "https://cal.com/layken-varholdt/agency-prospect?utm_source=audit&utm_medium=banner&utm_campaign=marketing";

/**
 * Sticky bottom CTA on audit pages. Forces the brand light palette inline
 * so it stays consistent regardless of the visitor's color-scheme.
 */
export function AuditBanner() {
  return (
    <div
      style={{
        ["--background" as never]: "225 38% 95%",
        ["--card" as never]: "0 0% 100%",
        ["--foreground" as never]: "225 30% 22%",
        ["--muted-foreground" as never]: "225 18% 46%",
        ["--border" as never]: "230 16% 84%",
        ["--primary" as never]: "215 85% 55%",
        ["--primary-foreground" as never]: "0 0% 100%",
        ["--radius" as never]: "0.625rem",
        colorScheme: "light",
      }}
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 sm:px-4 sm:pb-3 sm:pt-3"
    >
      <div
        className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]/95 px-3 py-2.5 shadow-[0_18px_40px_-22px_hsl(var(--primary)/0.55),0_6px_18px_-12px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:px-4 sm:py-3"
      >
        <Image
          src="/logo.png"
          alt="AWD"
          width={24}
          height={24}
          className="size-6 shrink-0 rounded"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
            Free audit by
          </p>
          <p className="truncate font-[family-name:var(--font-sora)] text-[13px] font-bold text-[hsl(var(--foreground))]">
            Acadiana Web Design
          </p>
        </div>
        <a
          href={CAL_LINK}
          className="btn-cta inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3.5 py-2 text-[12px] font-bold sm:px-5 sm:py-2.5 sm:text-sm"
        >
          <span className="sm:hidden">Book a call</span>
          <span className="hidden sm:inline">Schedule a free consultation</span>
          <ArrowUpRight className="size-3.5 sm:size-4" />
        </a>
      </div>
    </div>
  );
}
