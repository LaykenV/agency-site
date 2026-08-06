"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MSA_SECTIONS, MSA_VERSION } from "@/lib/legal/msa";
import {
  buildOrderFormSections,
  buildOrderFormSummaryPoints,
  describePricing,
  formatUsd,
} from "@/lib/legal/orderForm";
import type { LegalSection } from "@/lib/legal/render";
import { PageHeader } from "@/components/PageHeader";
import { ProgressTimeline } from "@/components/portal";
import { StickyAuth } from "@/components/StickyAuth";

function LegalDocumentSections({ sections }: { sections: Array<LegalSection> }) {
  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.anchor} id={section.anchor} className="scroll-mt-28">
          <h3 className="text-base font-semibold text-[var(--foreground)]">
            {section.title}
          </h3>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
            {section.blocks.map((block, index) => {
              if (block.type === "paragraph") {
                return <p key={index}>{block.text}</p>;
              }
              if (block.type === "subheading") {
                return (
                  <h4 key={index} className="font-semibold text-[var(--foreground)]">
                    {block.text}
                  </h4>
                );
              }
              const List = block.ordered ? "ol" : "ul";
              return (
                <List
                  key={index}
                  className={`${block.ordered ? "list-decimal" : "list-disc"} space-y-1 pl-5`}
                >
                  {block.items.map((item, itemIndex) => (
                    <li key={`${itemIndex}-${item}`}>{item}</li>
                  ))}
                </List>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function AgreementPage() {
  return (
    <StickyAuth
      unauthenticatedFallback={<UnauthenticatedAgreementView />}
    >
      <AuthenticatedAgreementView />
    </StickyAuth>
  );
}

function UnauthenticatedAgreementView() {
  const searchParams = useSearchParams();
  const sid = searchParams.get("sid");
  const error = searchParams.get("error");

  // Redirect to error page if there's an error
  useEffect(() => {
    if (error && sid) {
      window.location.href = `/portal/autherror?sid=${sid}&error=${error}`;
    }
  }, [error, sid]);

  return (
    <div className="min-h-[calc(100dvh_-_var(--global-header-height))] bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="surface rounded-xl p-6">
          <h1 className="text-xl md:text-2xl font-semibold text-[var(--foreground)]">Please sign in to view the agreement</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            You need to be authenticated to access this page.
          </p>
        </div>
      </div>
    </div>
  );
}

function AuthenticatedAgreementView() {
  const searchParams = useSearchParams();
  const sid = searchParams.get("sid");
  const error = searchParams.get("error");
  const [isInitialized, setIsInitialized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [acceptanceError, setAcceptanceError] = useState<string | null>(null);
  const [acceptStage, setAcceptStage] = useState<'idle' | 'agreement' | 'checkout'>('idle');
  const [isChecked, setIsChecked] = useState(false);
  const router = useRouter();
  const errorRef = useRef<HTMLDivElement | null>(null);

  const claimProject = useMutation(api.projects.claimProjectForProspect);
  const createFromClickwrap = useMutation(api.agreement.createFromClickwrap);
  const createCheckout = useAction(api.stripeActions.createCheckoutSession);

  // Get prospect by sessionId
  const prospect = useQuery(
    api.prospects.getProspectBySessionId,
    sid ? { sessionId: sid } : "skip"
  );

  // Get current user
  const user = useQuery(api.auth.getCurrentUser);

  // Load the portal decision to reuse redirect logic and the primary project
  const decision = useQuery(api.auth.getPortalDecision);

  const setError = useCallback((message: string | null) => {
    setErrorMessage(message);
  }, []);

  useEffect(() => {
    if (acceptanceError) {
      const timer = window.setTimeout(() => {
        setAcceptanceError(null);
      }, 4000);
      // Move focus to the error for screen readers
      if (errorRef.current) {
        errorRef.current.focus();
      }
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [acceptanceError]);

  // Redirect to error page if there's an error
  useEffect(() => {
    if (error && sid) {
      window.location.href = `/portal/autherror?sid=${sid}&error=${error}`;
    }
  }, [error, sid]);

  const [primaryProjectId, setPrimaryProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !prospect || isInitialized) return;

    const normalizedUserEmail = (user.email ?? "").trim().toLowerCase();
    const normalizedProspectEmail = prospect.details.contactEmail.trim().toLowerCase();
    if (!normalizedUserEmail || normalizedUserEmail !== normalizedProspectEmail) {
      setError("This agreement belongs to another account.");
      router.replace(`/portal/autherror?sid=${prospect.sessionId}&error=ownership`);
      return;
    }

    void claimProject({
      prospectId: prospect._id,
    })
      .then((projectId) => {
        setPrimaryProjectId(projectId);
        setIsInitialized(true);
      })
      .catch((initializationError) => {
        console.error("[agreement] failed to load admin-created project", initializationError);
        setError(
          initializationError instanceof Error
            ? initializationError.message
            : "We couldn't load your project. Please contact support.",
        );
      });
  }, [claimProject, isInitialized, prospect, router, setError, user]);

  useEffect(() => {
    if (!decision || !prospect || !user?._id) return;

    // Skip redirects while actively accepting the agreement (prevents race with checkout action)
    if (acceptStage !== 'idle') return;

    // User must have a primary project when initialized. If already awaiting payment or assets, redirect.
    if (decision.primaryProject) {
      const status = decision.primaryProject.projectStatus ?? "AWAITING_AGREEMENT";
      if (status === "AWAITING_PAYMENT") {
        router.replace("/portal/subscribe");
        return;
      }
      if (status === "AWAITING_AGREEMENT") {
        return;
      }
      router.replace(`/portal/${decision.primaryProject.projectId}`);
      return;
    }
    if (decision.redirect && decision.redirect !== `/portal/agreement?sid=${prospect.sessionId}`) {
      router.replace(decision.redirect);
    }
  }, [acceptStage, decision, prospect, router, user?._id]);

  // Compute latestProject before early returns (hooks must come before conditionals)
  const latestProject = useMemo(() => {
    if (decision?.primaryProject) {
      return decision.primaryProject;
    }
    if (primaryProjectId) {
      return {
        _id: primaryProjectId as unknown as Id<"projects">,
        projectId: "",
        projectStatus: "AWAITING_AGREEMENT" as const,
      };
    }
    return null;
  }, [decision?.primaryProject, primaryProjectId]);

  // The commercial half of the agreement. The MSA is universal; price, term,
  // and scope come from the project's issued order form.
  const orderForm = useQuery(
    api.orderForms.getIssuedForMyProject,
    latestProject?._id ? { projectId: latestProject._id } : "skip",
  );

  const orderFormSections = useMemo(() => {
    if (!orderForm?.issuedAt) return [];
    return buildOrderFormSections(orderForm.spec, {
      projectSlug: orderForm.projectSlug,
      clientName: orderForm.clientName,
      msaVersion: orderForm.msaVersion,
      version: orderForm.version,
      issuedAt: orderForm.issuedAt,
    });
  }, [orderForm]);

  // A reactive amendment can replace the document while this page is open.
  // Require a fresh checkbox click for the exact version now on screen.
  useEffect(() => {
    setIsChecked(false);
  }, [orderForm?._id, orderForm?.issuedHash]);

  const renderStatusPill = (status: string | undefined) => {
    const base = "pill";
    switch (status) {
      case "LIVE":
        return <span className={`${base} bg-emerald-600 text-white`}>Live</span>;
      case "IN_PROGRESS":
        return <span className={`${base} bg-blue-600 text-white`}>In progress</span>;
      case "IN_REVIEW":
        return <span className={`${base} bg-slate-700 text-white`}>In review</span>;
      case "AWAITING_ASSETS":
      case "AWAITING_PAYMENT":
      case "AWAITING_AGREEMENT":
        return (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border border-[hsl(var(--primary))] shadow-sm">
            Awaiting action
          </span>
        );
      case "ARCHIVED":
        return <span className={`${base} bg-rose-600 text-white`}>Archived</span>;
      default:
        return <span className={`${base} bg-slate-600 text-white`}>Unknown</span>;
    }
  };

  const handleAgreementAccept = async () => {
    if (
      !latestProject ||
      !orderForm?.issuedHash ||
      orderForm.msaVersion !== MSA_VERSION ||
      !isChecked ||
      acceptStage !== 'idle'
    ) return;
    setAcceptanceError(null);
    setAcceptStage('agreement');
    try {
      // Both document hashes are computed server-side from the canonical
      // documents; a hash this browser supplied would prove nothing.
      const userAgent = typeof window !== "undefined" ? window.navigator.userAgent : undefined;
      const acceptance = await createFromClickwrap({
        projectId: latestProject._id,
        orderFormId: orderForm._id,
        orderFormHash: orderForm.issuedHash,
        userAgent,
      });

      if (acceptance.paymentNextStep === "manual_invoice") {
        setAcceptStage("idle");
        router.replace("/portal/subscribe");
        return;
      }

      // Try to redirect directly to Stripe checkout for frictionless happy path
      setAcceptStage('checkout');
      try {
        const { url } = await createCheckout({});
        window.location.href = url;
        return; // Exit early on success
      } catch (checkoutErr) {
        console.error("[portal] checkout creation failed, falling back to subscribe page", checkoutErr);
        // Reset state before fallback navigation to maintain consistency
        setAcceptStage('idle');
      }

      // Fallback: redirect to subscribe page if checkout creation fails
      router.replace("/portal/subscribe");
    } catch (err) {
      console.error("[portal] failed to accept agreement", err);
      setAcceptanceError("We couldn't capture your agreement. Please try again.");
      setAcceptStage('idle');
    }
  };

  // Early returns after all hooks
  if (!sid) {
    return (
      <div className="min-h-[calc(100dvh_-_var(--global-header-height))] bg-[var(--background)] text-[var(--foreground)]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="surface rounded-xl p-6">
            <h1 className="text-xl md:text-2xl font-semibold text-red-600">Invalid Session</h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">No session ID provided.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="flex min-h-[calc(100dvh_-_var(--global-header-height))] items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)]" />
          <p className="text-sm text-[var(--muted-foreground)]">Loading agreement...</p>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="flex min-h-[calc(100dvh_-_var(--global-header-height))] items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)]" />
          <p className="text-sm text-[var(--muted-foreground)]">Preparing your agreement...</p>
          {errorMessage && <p className="mt-2 text-sm text-red-600">{errorMessage}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh_-_var(--global-header-height))] bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:py-16">
        {/* Progress Timeline */}
        <ProgressTimeline currentStatus="AWAITING_AGREEMENT" className="mb-8" />

        <PageHeader
          title="Service Agreement"
          description={`Hi ${prospect.details.contactName}, review and approve your onboarding agreement to move forward.`}
          secondaryAction={
            <a
              href="/legal/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary px-4 py-2"
            >
              View Master Agreement
            </a>
          }
        />

        <div className="space-y-6">
          <div className="surface rounded-xl p-6 glow-primary">
            <h2 className="text-lg font-semibold text-[var(--foreground)] heading-gradient-soft">Project details</h2>
            <dl className="mt-4 grid grid-cols-1 gap-4 text-sm text-[var(--muted-foreground)] sm:grid-cols-2">
              <div>
                <dt className="font-medium text-[var(--foreground)]">Company</dt>
                <dd>{prospect.details.companyName}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--foreground)]">Primary contact</dt>
                <dd>{prospect.details.contactName}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--foreground)]">Email</dt>
                <dd>{prospect.details.contactEmail}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--foreground)]">Project status</dt>
                <dd>{renderStatusPill(latestProject?.projectStatus ?? "AWAITING_AGREEMENT")}</dd>
              </div>
            </dl>
            {errorMessage && (
              <div className="mt-4 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-600" role="alert" aria-live="polite">
                {errorMessage}
              </div>
            )}
          </div>

          {orderForm === undefined ? (
            <div className="surface-soft rounded-xl p-6">
              <p className="text-sm text-[var(--muted-foreground)]">Loading your order form…</p>
            </div>
          ) : orderForm === null ? (
            <div className="surface-soft rounded-xl p-6 border border-amber-500/50">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted-foreground)]">Order Form</p>
              <p className="mt-3 text-sm text-[var(--foreground)]">
                No order form has been issued for this project yet, so there is nothing to
                accept. Email{" "}
                <a className="text-[var(--primary)]" href="mailto:support@acadianawebdesign.com">
                  support@acadianawebdesign.com
                </a>{" "}
                and we will send your terms.
              </p>
            </div>
          ) : (
            <div className="surface-soft rounded-xl p-6 glow-primary">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted-foreground)]">Order Form</p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--foreground)] heading-gradient-soft">
                {orderForm.spec.title}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">{orderForm.spec.summary}</p>

              <ul className="mt-5 space-y-3 text-sm">
                {buildOrderFormSummaryPoints(orderForm.spec).map((item) => (
                  <li key={item.label} className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-2 w-2 flex-none rounded-full bg-[var(--primary)]" />
                    <span>
                      <span className="font-semibold text-[var(--foreground)]">{item.label}:</span> {item.value}
                    </span>
                  </li>
                ))}
              </ul>

              {orderForm.spec.scope.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    What&apos;s included
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-[var(--muted-foreground)]">
                    {orderForm.spec.scope.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span className="mt-1.5 inline-flex h-1.5 w-1.5 flex-none rounded-full bg-[var(--muted-foreground)]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="mt-6 text-xs text-[var(--muted-foreground)]">
                Order Form {orderForm.version} • Master Services Agreement {orderForm.msaVersion}
              </p>

              {orderForm.msaVersion !== MSA_VERSION && (
                <p className="mt-4 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700">
                  This Order Form references an older Master Services Agreement. Contact
                  support for a current version before accepting.
                </p>
              )}

              <div className="mt-8 border-t border-[var(--border)] pt-8">
                <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                  Complete Order Form
                </p>
                <LegalDocumentSections sections={orderFormSections} />
              </div>
            </div>
          )}

          <div className="surface-soft rounded-xl p-6 glow-primary">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
                  Universal Terms
                </p>
                <h2 className="mt-2 text-lg font-semibold text-[var(--foreground)] heading-gradient-soft">
                  Master Services Agreement
                </h2>
              </div>
              <span className="text-xs text-[var(--muted-foreground)]">
                Version {MSA_VERSION}
              </span>
            </div>
            <p className="mt-3 text-sm text-[var(--muted-foreground)]">
              These terms apply across every engagement. Your project-specific price,
              scope, deliverables, and acceptance criteria are in the Order Form above.
            </p>
            <div className="mt-8 border-t border-[var(--border)] pt-8">
              <LegalDocumentSections sections={MSA_SECTIONS} />
            </div>
          </div>

          <div className="surface rounded-xl p-6 glow-primary">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <input
                  id="agree"
                  type="checkbox"
                  className="mt-1 h-5 w-5 rounded accent-[hsl(var(--primary))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                  checked={isChecked}
                  onChange={(event) => setIsChecked(event.target.checked)}
                  aria-describedby="agreement-fine-print"
                />
                <label htmlFor="agree" className="text-sm">
                  I have read and agree to the Master Services Agreement and to Order Form{" "}
                  {orderForm?.version ?? "—"}
                  {orderForm && orderForm.spec.pricing.minimumTermMonths > 0
                    ? `, including the ${orderForm.spec.pricing.minimumTermMonths}-month commitment and billing authorization.`
                    : ", including its billing authorization."}
                </label>
              </div>
              <p id="agreement-fine-print" className="text-xs text-[var(--muted-foreground)]">
                {orderForm ? `By clicking accept, you authorize the following: ${describePricing(orderForm.spec.pricing)}` : ""}
                {orderForm && orderForm.spec.pricing.setupFeeCents > 0
                  ? orderForm.spec.pricing.collectionMethod === "stripe_checkout"
                    ? ` The ${formatUsd(orderForm.spec.pricing.setupFeeCents)} setup fee is included in the initial Checkout charge.`
                    : ` The ${formatUsd(orderForm.spec.pricing.setupFeeCents)} due at signing will be invoiced separately.`
                  : ""}{" "}
                Questions? Email{" "}
                <a className="text-[var(--primary)]" href="mailto:support@acadianawebdesign.com">
                  support@acadianawebdesign.com
                </a>.
              </p>
              {acceptanceError && (
                <div
                  ref={errorRef}
                  tabIndex={-1}
                  className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-600"
                  role="alert"
                  aria-live="polite"
                >
                  {acceptanceError}
                </div>
              )}
              <button
                onClick={handleAgreementAccept}
                className="btn-cta w-full px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!isChecked || acceptStage !== 'idle' || !orderForm || orderForm.msaVersion !== MSA_VERSION}
                aria-disabled={!isChecked || acceptStage !== 'idle' || !orderForm || orderForm.msaVersion !== MSA_VERSION}
                aria-busy={acceptStage !== 'idle'}
              >
                {acceptStage === 'agreement' 
                  ? "Capturing agreement..." 
                  : acceptStage === 'checkout' 
                    ? "Redirecting to payment..." 
                    : orderForm?.spec.pricing.collectionMethod === "manual_invoice"
                      ? "Accept Agreement"
                      : "Accept & Continue to Payment"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
