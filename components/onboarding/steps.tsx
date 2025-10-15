"use client";

import * as RadioGroup from "@radix-ui/react-radio-group";
import {
  NeedOption,
  NEED_OPTIONS,
  OnboardingBrief,
  OnboardingField,
  PRIMARY_ACTION_OPTIONS,
  PlanState,
  PlanTierOption,
} from "@/types/profile";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

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
  showAuthFallback,
  onFallbackAuth,
}: {
  value: OnboardingBrief;
  plan?: PlanState;
  onCheckout?: (tierId: PlanTierOption) => void;
  isCheckingOut?: boolean;
  showAuthFallback?: boolean;
  onFallbackAuth?: () => void;
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
        <PlanSummaryInline 
          plan={plan} 
          onCheckout={onCheckout} 
          isCheckingOut={isCheckingOut}
        />
        {showAuthFallback && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40 p-6">
            <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">
              Sign in to continue
            </p>
            <p className="mb-4 text-sm text-[var(--secondary)]">
              Google One Tap isn&apos;t available. Use the button below to sign in with Google and complete your checkout.
            </p>
            <button
              type="button"
              onClick={onFallbackAuth}
              disabled={isCheckingOut}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-6 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--muted)]",
                isCheckingOut && "pointer-events-none opacity-60"
              )}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </div>
        )}
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
  summary,
  price,
  pages,
  features,
  onCheckout,
  isCheckingOut,
}: {
  tierId: PlanTierOption;
  headline: string;
  summary: string;
  price: string;
  pages: Array<string>;
  features: Array<string>;
  onCheckout?: (tierId: PlanTierOption) => void;
  isCheckingOut?: boolean;
}) {
  return (
    <div className="flex flex-col gap-5 rounded-3xl border border-[var(--border)] bg-[var(--background)]/60 p-6">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--secondary)]">
          Recommended focus
        </span>
        <h3 className="text-xl font-semibold text-[var(--foreground)]">{headline}</h3>
        <p className="text-sm text-[var(--secondary)]">{summary}</p>
        <p className="text-base font-semibold text-[var(--foreground)]">{price}</p>
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
          isCheckingOut && "pointer-events-none opacity-60"
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
}: {
  plan?: PlanState;
  onCheckout?: (tierId: PlanTierOption) => void;
  isCheckingOut?: boolean;
}) {
  if (!plan?.aiProposal) {
    return (
      <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--background)]/40 p-6 text-sm text-[var(--secondary)]">
        We&#39;ll surface your AI-generated recommendations here once ready.
      </div>
    );
  }

  const { tiers } = plan.aiProposal;
  const tierOrder: Array<PlanTierOption> = ["starter", "professional", "enterprise"];

  return (
    <div className="grid gap-4">
      {tierOrder.map((tierId) => {
        const tier = tiers[tierId];
        return (
          <PlanSummary
            key={tierId}
            tierId={tierId}
            headline={tier.headline}
            summary={tier.summary}
            price={tier.price}
            pages={tier.pages}
            features={tier.features}
            onCheckout={onCheckout}
            isCheckingOut={isCheckingOut}
          />
        );
      })}
    </div>
  );
}

