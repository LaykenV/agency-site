"use client";

import Link from "next/link";
import { LazyMotion, domAnimation, useReducedMotion } from "framer-motion";
import { ShinyButton } from "@/components/ui/shiny-button";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { submitAgencyQuote } from "@/actions/submitAgencyQuote";
import { initialQuoteState, QUOTE_NEEDS } from "@/lib/marketing/quoteShared";
import { SITE_PHONE } from "@/lib/seo/site";

const fields = [
  {
    name: "name",
    label: "Your name",
    autoComplete: "name",
    required: true,
    maxLength: 120,
  },
  {
    name: "business",
    label: "Business name",
    autoComplete: "organization",
    required: true,
    maxLength: 160,
  },
  {
    name: "email",
    label: "Email",
    autoComplete: "email",
    type: "email",
    required: true,
    maxLength: 200,
  },
  {
    name: "phone",
    label: "Phone (optional)",
    autoComplete: "tel",
    type: "tel",
    maxLength: 40,
  },
  {
    name: "currentWebsite",
    label: "Current website (optional)",
    autoComplete: "url",
    maxLength: 300,
  },
] as const;

export function QuoteForm() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [state, action, pending] = useActionState(
    submitAgencyQuote,
    initialQuoteState,
  );
  const [request, setRequest] = useState({ id: "", renderedAt: 0 });
  const [values, setValues] = useState<Record<string, string>>({});
  const resultRef = useRef<HTMLDivElement>(null);
  const tracked = useRef<string | null>(null);
  useEffect(() => {
    setRequest({ id: crypto.randomUUID(), renderedAt: Date.now() });
  }, []);
  useEffect(() => {
    if (state.message) resultRef.current?.focus();
    if (!state.success || !state.leadId || tracked.current === state.leadId)
      return;
    tracked.current = state.leadId;
    const key = `awd:quote:${state.leadId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* In-memory dedupe still works when storage is disabled. */
    }
    if (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
      const analytics = window as Window & {
        dataLayer?: unknown[];
        gtag?: (...args: unknown[]) => void;
      };
      analytics.dataLayer ??= [];
      const gtag =
        analytics.gtag ??
        function () {
          // gtag uses an Arguments object for queued commands before its script loads.
          // eslint-disable-next-line prefer-rest-params
          analytics.dataLayer!.push(arguments);
        };
      gtag("event", "generate_lead", {
        transaction_id: state.leadId,
        lead_source: "agency-quote-form",
      });
    }
  }, [state]);
  const updateValue = (name: string, value: string) => {
    setValues((previous) => ({ ...previous, [name]: value }));
    setRequest((previous) => ({ ...previous, id: crypto.randomUUID() }));
  };
  const error = (name: string) => state.errors?.[name];
  return (
    <section
      id="quote"
      data-floating-cta-anchor
      className="quote-section anchor-target"
      aria-labelledby="quote-heading"
    >
      <div className="quote-layout">
        <div className="quote-intro">
          <h2 id="quote-heading">Your next customer is Googling right now.</h2>
          <p className="quote-price">
            <span className="quote-price-prefix">from</span>
            <span className="quote-price-amount">$199</span>
            <span className="quote-price-period">/mo</span>
          </p>
          <p className="quote-small quote-terms">
            $0 upfront · 12-month minimum. <Link href="/legal/terms">Terms</Link>.
          </p>
        </div>
        <div className="quote-panel" data-clarity-mask="true">
          <div
            ref={resultRef}
            tabIndex={-1}
            role={state.success ? "status" : "alert"}
            className={state.message ? "quote-result" : "sr-only"}
          >
            {state.message}
            {state.message && !state.success && (
              <p>
                <a href={`tel:${SITE_PHONE}`}>Call (337) 306-3705</a>
              </p>
            )}
          </div>
          {!state.success && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                startTransition(() => action(data));
              }}
              aria-label="Website quote request"
              aria-busy={pending}
            >
              <input type="hidden" name="requestId" value={request.id} />
              <input
                type="hidden"
                name="renderedAt"
                value={request.renderedAt}
              />
              <input type="hidden" name="landingPath" value={pathname} />
              <div className="quote-trap" aria-hidden="true">
                <label htmlFor="company_url">Leave this empty</label>
                <input
                  id="company_url"
                  name="company_url"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>
              <div className="quote-fields">
                {fields.map((field) => (
                  <div
                    key={field.name}
                    className={
                      field.name === "currentWebsite" ? "quote-wide" : ""
                    }
                  >
                    <label htmlFor={`quote-${field.name}`}>{field.label}</label>
                    <input
                      {...field}
                      id={`quote-${field.name}`}
                      value={values[field.name] ?? ""}
                      onChange={(event) =>
                        updateValue(field.name, event.target.value)
                      }
                      aria-invalid={!!error(field.name)}
                      aria-describedby={
                        error(field.name)
                          ? `quote-${field.name}-error`
                          : undefined
                      }
                    />
                    {error(field.name) && (
                      <p
                        className="quote-field-error"
                        id={`quote-${field.name}-error`}
                      >
                        {error(field.name)}
                      </p>
                    )}
                  </div>
                ))}
                <div className="quote-wide">
                  <label htmlFor="quote-need">What do you need?</label>
                  <select
                    id="quote-need"
                    name="need"
                    required
                    value={values.need ?? ""}
                    onChange={(event) =>
                      updateValue("need", event.target.value)
                    }
                    aria-invalid={!!error("need")}
                    aria-describedby={
                      error("need") ? "quote-need-error" : undefined
                    }
                  >
                    <option value="" disabled>
                      Choose an option
                    </option>
                    {QUOTE_NEEDS.map((need) => (
                      <option key={need}>{need}</option>
                    ))}
                  </select>
                  {error("need") && (
                    <p id="quote-need-error" className="quote-field-error">
                      {error("need")}
                    </p>
                  )}
                </div>
                <div className="quote-wide">
                  <label htmlFor="quote-details">
                    Anything else? (optional)
                  </label>
                  <textarea
                    id="quote-details"
                    name="details"
                    rows={4}
                    maxLength={2000}
                    value={values.details ?? ""}
                    onChange={(event) =>
                      updateValue("details", event.target.value)
                    }
                    aria-invalid={!!error("details")}
                    aria-describedby={error("details") ? "quote-details-error" : undefined}
                  />
                  {error("details") && (
                    <p id="quote-details-error" className="quote-field-error">{error("details")}</p>
                  )}
                </div>
              </div>
              <LazyMotion features={domAnimation} strict>
                <ShinyButton
                  type="submit"
                  disabled={pending || !request.id}
                  initial={false}
                  {...(reduceMotion ? { animate: { scale: 1 }, transition: { duration: 0 } } : {})}
                  className="quote-submit schedule-call-btn inline-flex items-center justify-center px-5 py-3.5 text-sm sm:text-base font-bold rounded-xl font-[family-name:var(--font-sora)]"
                >
                  {pending ? "Sending request…" : "Send my quote request"}
                </ShinyButton>
              </LazyMotion>
              <p className="quote-small">
                <Link href="/legal/privacy">Privacy policy</Link>.
              </p>
              <noscript>
                <p>
                  To use this form, enable JavaScript or{" "}
                  <a href={`tel:${SITE_PHONE}`}>call (337) 306-3705</a>.
                </p>
              </noscript>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
