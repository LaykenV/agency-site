"use client";

import * as RadioGroup from "@radix-ui/react-radio-group";
import {
  NeedOption,
  NEED_OPTIONS,
  OnboardingBrief,
  OnboardingField,
  PRIMARY_ACTION_OPTIONS,
  PlanProposal,
  PlanTierOption,
} from "@/types/profile";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { ALL_TIERS_INCLUDED, AFTER_PAYMENT_COPY } from "./constants";

type StepProps = {
  value: OnboardingBrief;
  onChange: (field: OnboardingField, value: unknown) => void;
};

export function BriefContactStep({ value, onChange }: StepProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-[var(--foreground)]">
          Your name
        </label>
        <input
          type="text"
          value={value.contactName}
          onChange={(event) => onChange("contactName", event.target.value)}
          placeholder="Jess Lee"
          className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)]"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-[var(--foreground)]">
          Work email
        </label>
        <input
          type="email"
          value={value.contactEmail}
          placeholder="you@company.com"
          onChange={(event) => onChange("contactEmail", event.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)]"
        />
        <p className="text-xs text-[var(--secondary)]">
          We&apos;ll send your tailored plan here and notify you as the build progresses.
        </p>
      </div>
      <div className="flex flex-col gap-2 md:col-span-2">
        <label className="text-sm font-semibold text-[var(--foreground)]">
          Company or project name
        </label>
        <input
          type="text"
          value={value.companyName}
          placeholder="Atlas Outbound"
          onChange={(event) => onChange("companyName", event.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)]"
        />
      </div>
    </div>
  );
}

export function BriefNeedsStep({ value, onChange }: StepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-[var(--foreground)]">
          Describe what you do in one line
        </label>
        <textarea
          value={value.businessDescription}
          onChange={(event) => onChange("businessDescription", event.target.value)}
          placeholder="We build AI-powered outbound programs for B2B teams."
          rows={3}
          className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)]"
        />
        <p className="text-xs text-[var(--secondary)]">
          Plain language is perfect. We&apos;ll use this line to tailor the copy in your plan.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-[var(--foreground)]">
          Industry (optional)
        </label>
        <input
          type="text"
          value={value.industry}
          placeholder="Marketing, Wellness, SaaS, etc."
          onChange={(event) => onChange("industry", event.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)]"
        />
      </div>

      <div className="flex flex-col gap-4">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          What do you need right now?
        </p>
        <RadioGroup.Root
          className="grid gap-4 md:grid-cols-2"
          value={value.primaryNeed}
          onValueChange={(newValue) => onChange("primaryNeed", newValue as NeedOption)}
        >
          {NEED_OPTIONS.map((option) => (
            <RadioGroup.Item
              key={option.id}
              value={option.id}
              className={cn(
                "group rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5 text-left transition",
                value.primaryNeed === option.id && "border-[var(--primary)] bg-[var(--primary)]/5"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    {option.title}
                  </span>
                  <span className="text-xs text-[var(--secondary)]">
                    {option.description}
                  </span>
                </div>
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] transition",
                    value.primaryNeed === option.id && "border-[var(--primary)]"
                  )}
                >
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full bg-[var(--primary)] opacity-0 transition",
                      value.primaryNeed === option.id && "opacity-100"
                    )}
                  />
                </span>
              </div>
            </RadioGroup.Item>
          ))}
        </RadioGroup.Root>
      </div>

      <div className="flex flex-col gap-4">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          What should visitors do when they land?
        </p>
        <RadioGroup.Root
          className="grid gap-4 md:grid-cols-3"
          value={value.primaryAction}
          onValueChange={(newValue) => onChange("primaryAction", newValue)}
        >
          {PRIMARY_ACTION_OPTIONS.map((option) => (
            <RadioGroup.Item
              key={option.id}
              value={option.id}
              className={cn(
                "group rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5 text-left transition",
                value.primaryAction === option.id && "border-[var(--primary)] bg-[var(--primary)]/5"
              )}
            >
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  {option.title}
                </span>
                <span className="text-xs text-[var(--secondary)]">
                  {option.description}
                </span>
              </div>
            </RadioGroup.Item>
          ))}
        </RadioGroup.Root>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          When do you need this live?
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => onChange("timeline", { option: "asap", date: null })}
            className={cn(
              "rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-4 text-left text-sm font-semibold transition",
              value.timeline.option === "asap" && "border-[var(--primary)] bg-[var(--primary)]/5"
            )}
          >
            ASAP – I want to launch in days
          </button>
          <div
            className={cn(
              "rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-4",
              value.timeline.option === "date" && "border-[var(--primary)] bg-[var(--primary)]/5"
            )}
          >
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">
                Pick a date
              </span>
              <input
                type="date"
                value={value.timeline.date ?? ""}
                onChange={(event) =>
                  onChange("timeline", {
                    option: "date",
                    date: event.target.value,
                  })
                }
                className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)]"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BriefNotesStep({ value, onChange }: StepProps) {
  const notesCounter = useMemo(
    () => `${value.additionalNotes.length}/300`,
    [value.additionalNotes.length],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-[var(--foreground)]">
          Anything else we should know? (optional)
        </label>
        <textarea
          value={value.additionalNotes}
          maxLength={300}
          rows={4}
          onChange={(event) => onChange("additionalNotes", event.target.value)}
          placeholder="Share any context that will help us tailor your plan."
          className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)]"
        />
        <span className="self-end text-xs text-[var(--secondary)]">{notesCounter}</span>
      </div>
      <label className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/60 p-4 text-sm text-[var(--foreground)]">
        <input
          type="checkbox"
          checked={value.termsAccepted}
          onChange={(event) => onChange("termsAccepted", event.target.checked)}
          className="mt-1 h-5 w-5 rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--primary)] accent-[var(--primary)]"
        />
        <span>
          I agree to the Terms of Service and Privacy Policy. Generate my tailored plan.
        </span>
      </label>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40 p-4 text-xs text-[var(--secondary)]">
        <p className="font-semibold text-[var(--foreground)]">You can keep it simple.</p>
        <p className="mt-2">
          Notes are optional. You can upload brand assets and design preferences inside the portal after payment.
        </p>
      </div>
    </div>
  );
}

export function BriefSummaryStep({
  value,
  plan,
  onCheckout,
  isCheckingOut,
  isGeneratingPlan,
}: {
  value: OnboardingBrief;
  plan?: PlanProposal;
  onCheckout?: (tierId: PlanTierOption) => void;
  isCheckingOut?: boolean;
  isGeneratingPlan?: boolean;
}) {
  const timelineLabel =
    value.timeline.option === "asap"
      ? "Launch ASAP"
      : value.timeline.date
        ? `Launch by ${value.timeline.date}`
        : "Launch timing to be confirmed";

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--muted)]/30 p-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--secondary)]">
            Summary
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <SummaryCard
              title="Contact"
              items={[
                value.contactName,
                value.contactEmail,
                value.companyName,
              ]}
            />
            <SummaryCard
              title="Project"
              items={[value.businessDescription, value.industry || undefined]}
            />
            <SummaryCard
              title="Goal"
              items={[
                NEED_OPTIONS.find((option) => option.id === value.primaryNeed)?.title ?? "",
                PRIMARY_ACTION_OPTIONS.find((option) => option.id === value.primaryAction)?.title ??
                  "",
                timelineLabel,
              ]}
            />
            {value.additionalNotes && (
              <SummaryCard title="Notes" items={[value.additionalNotes]} />
            )}
          </div>
        </div>
      </section>
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--secondary)]">
            Your tailored plan
          </h2>
          <p className="mt-2 text-sm text-[var(--secondary)]">
            Pick the path that matches your momentum. You&apos;ll sign in with Google to proceed to checkout.
          </p>
        </div>
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--muted)]/20 p-6">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            Included with every plan
          </h3>
          <ul className="mt-3 grid gap-2 text-sm text-[var(--secondary)] md:grid-cols-2">
            {ALL_TIERS_INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <PlanSummaryInline
          plan={plan}
          onCheckout={onCheckout}
          isCheckingOut={isCheckingOut}
          isLoading={Boolean(isGeneratingPlan || !plan)}
        />
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--background)] p-6">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            After payment — what happens next
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-[var(--secondary)]">
            {AFTER_PAYMENT_COPY.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

type SummaryCardProps = {
  title: string;
  items: Array<string | undefined>;
};

function SummaryCard({ title, items }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--secondary)]">
        {title}
      </p>
      <ul className="mt-2 space-y-1 text-sm text-[var(--foreground)]">
        {items.filter(Boolean).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function PlanSummary({
  tierId,
  headline,
  tierSummary,
  summary,
  pages,
  features,
  deliverableNotes,
  onCheckout,
  isCheckingOut,
  isRecommended,
}: {
  tierId: PlanTierOption;
  headline: string;
  tierSummary: string;
  summary: string;
  pages: Array<string>;
  features: Array<string>;
  deliverableNotes: string;
  onCheckout?: (tierId: PlanTierOption) => void;
  isCheckingOut?: boolean;
  isRecommended: boolean;
}) {
  return (
    <div className="flex flex-col gap-5 rounded-3xl border border-[var(--border)] bg-[var(--background)]/60 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--secondary)]">
              {tierId === "starter"
                ? "Starter"
                : tierId === "professional"
                  ? "Professional"
                  : "Enterprise"}
            </span>
            <h3 className="text-xl font-semibold text-[var(--foreground)]">{headline}</h3>
          </div>
          {isRecommended && (
            <span className="rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              Recommended
            </span>
          )}
        </div>
        <p className="text-sm text-[var(--secondary)]">{tierSummary}</p>
        <p className="text-sm text-[var(--secondary)]">{summary}</p>
        <p className="text-xs text-[var(--secondary)]">{deliverableNotes}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--secondary)]">
            Pages
          </h4>
          <ul className="mt-2 space-y-1 text-sm text-[var(--foreground)]">
            {pages.map((page) => (
              <li key={page}>{page}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--secondary)]">
            Key features
          </h4>
          <ul className="mt-2 space-y-1 text-sm text-[var(--foreground)]">
            {features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onCheckout?.(tierId)}
        disabled={isCheckingOut}
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-semibold text-[var(--background)] transition hover:opacity-90",
          isCheckingOut && "pointer-events-none opacity-60",
        )}
      >
        {isCheckingOut ? "Processing..." : `Checkout – ${headline}`}
      </button>
    </div>
  );
}

export function PlanSummaryInline({
  plan,
  onCheckout,
  isCheckingOut,
  isLoading,
}: {
  plan?: PlanProposal;
  onCheckout?: (tierId: PlanTierOption) => void;
  isCheckingOut?: boolean;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return <PlanLoadingState />;
  }

  if (!plan) {
    return (
      <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--background)]/40 p-6 text-sm text-[var(--secondary)]">
        We&#39;ll surface your AI-generated recommendations here once ready.
      </div>
    );
  }

  const tierOrder: Array<PlanTierOption> = ["starter", "professional", "enterprise"];

  return (
    <div className="grid gap-4">
      {tierOrder.map((tierId) => {
        const tier = plan.tiers[tierId];
        return (
          <PlanSummary
            key={tierId}
            tierId={tierId}
            headline={tier.headline}
            tierSummary={tier.tierSummary}
            summary={tier.summary}
            pages={tier.pages}
            features={tier.features}
            deliverableNotes={tier.deliverableNotes}
            onCheckout={onCheckout}
            isCheckingOut={isCheckingOut}
            isRecommended={plan.recommendedTier === tierId}
          />
        );
      })}
    </div>
  );
}


function PlanLoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-[var(--border)] bg-[var(--background)]/40 p-6 text-center">
      <span className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
      <p className="text-sm font-semibold text-[var(--foreground)]">
        Crafting your custom offer
      </p>
      <p className="text-sm text-[var(--secondary)]">
        Give us a moment while we tailor your plan.
      </p>
    </div>
  );
}

