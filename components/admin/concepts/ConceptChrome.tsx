import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  workspaceSteps,
  type ConceptQueueFields,
} from "@/lib/concepts/workspace";

/**
 * Shared chrome for `/admin/marketing`.
 *
 * A concept is a thing that moves through four gates — match, sources, page,
 * send — and almost every question Layken asks this screen is "where is this
 * one, and what unblocks it". So the gate rail is the recurring device: full
 * size with labels in the detail header, shrunk to a gauge in each queue row.
 * The same four segments in both places means a glance at the list and a
 * glance at the open concept are read the same way.
 *
 * Labels and numerals are set in the mono face, prose in the sans face. That
 * split is what keeps the panels legible without a border around every
 * sentence.
 */

/** What the concept wants from you, collapsed from nine statuses to four. */
export type ConceptTone = "attention" | "live" | "done" | "failed";

const LIVE_STATUSES = new Set(["enriching", "harvesting", "generating"]);

export function conceptTone(status: string): ConceptTone {
  if (status === "failed") return "failed";
  if (LIVE_STATUSES.has(status)) return "live";
  if (status === "published") return "done";
  return "attention";
}

const TONE_FILL: Record<ConceptTone, string> = {
  attention: "bg-amber-500",
  live: "bg-primary",
  done: "bg-emerald-500",
  failed: "bg-destructive",
};

const TONE_TEXT: Record<ConceptTone, string> = {
  attention: "text-amber-700 dark:text-amber-300",
  live: "text-primary",
  done: "text-emerald-700 dark:text-emerald-300",
  failed: "text-destructive",
};

const TONE_CHIP: Record<ConceptTone, string> = {
  attention:
    "bg-amber-500/12 text-amber-700 ring-amber-500/25 dark:text-amber-300",
  live: "bg-primary/12 text-primary ring-primary/25",
  done: "bg-emerald-500/12 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
  failed: "bg-destructive/12 text-destructive ring-destructive/25",
};

/**
 * The four gates, labelled. `tone` colours only the segment you are standing
 * on: the trail behind it stays brand blue so progress reads as distance
 * travelled rather than as four unrelated status colours.
 */
export function PipelineRail({
  concept,
  tone,
  className,
}: {
  concept: ConceptQueueFields;
  tone: ConceptTone;
  className?: string;
}) {
  const steps = workspaceSteps(concept);
  const currentLabel = steps.find((step) => step.state === "current")?.label;

  return (
    <ol
      className={cn("flex items-start gap-1.5", className)}
      aria-label={
        currentLabel ? `Pipeline, now at ${currentLabel}` : "Pipeline"
      }
    >
      {steps.map((step) => (
        <li key={step.id} className="min-w-0 flex-1">
          <span
            className={cn(
              "block h-[3px] rounded-full transition-colors",
              step.state === "done" && "bg-primary",
              step.state === "current" && TONE_FILL[tone],
              step.state === "current" &&
                tone === "live" &&
                "motion-safe:animate-pulse",
              step.state === "todo" && "bg-border",
            )}
          />
          <span
            className={cn(
              "mt-1.5 block truncate font-mono text-[10px] tracking-[0.14em] uppercase",
              step.state === "current"
                ? cn("font-semibold", TONE_TEXT[tone])
                : step.state === "done"
                  ? "text-muted-foreground"
                  : "text-muted-foreground/55",
            )}
          >
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * The rail at queue scale. Fixed-width segments rather than flexible ones, so
 * every row's gauge lines up into a column you can read straight down.
 */
export function PipelineGauge({
  concept,
  tone,
  className,
}: {
  concept: ConceptQueueFields;
  tone: ConceptTone;
  className?: string;
}) {
  const steps = workspaceSteps(concept);
  const done = steps.filter((step) => step.state === "done").length;

  return (
    <span
      className={cn("flex flex-none items-center gap-[3px]", className)}
      aria-label={`${done} of ${steps.length} gates cleared`}
    >
      {steps.map((step) => (
        <span
          key={step.id}
          className={cn(
            "h-[3px] w-3 rounded-full",
            step.state === "done" && "bg-primary",
            step.state === "current" && TONE_FILL[tone],
            step.state === "current" &&
              tone === "live" &&
              "motion-safe:animate-pulse",
            step.state === "todo" && "bg-border",
          )}
        />
      ))}
    </span>
  );
}

export function StatusChip({
  tone,
  label,
  busy,
  className,
}: {
  tone: ConceptTone;
  label: string;
  busy?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex flex-none items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.12em] uppercase ring-1 ring-inset",
        TONE_CHIP[tone],
        className,
      )}
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
      {label}
    </span>
  );
}

/** Section surface. One radius, one border, no decoration. */
export function Panel({
  tone = "neutral",
  className,
  children,
}: {
  tone?: "neutral" | "attention" | "danger";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border p-4",
        tone === "neutral" && "border-border bg-card",
        tone === "attention" && "border-amber-500/30 bg-amber-500/5",
        tone === "danger" && "border-destructive/30 bg-destructive/5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PanelTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold">{children}</h3>;
}

export function PanelHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}

/** A labelled figure. Numerals get the mono face and tabular spacing. */
export function StatGrid({
  stats,
  className,
}: {
  stats: Array<{ label: string; value: React.ReactNode }>;
  className?: string;
}) {
  return (
    <dl className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", className)}>
      {stats.map((stat) => (
        <div key={stat.label}>
          <dt className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
            {stat.label}
          </dt>
          <dd className="mt-1 font-mono text-sm tabular-nums">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}
