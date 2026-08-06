/**
 * Per-project Order Form — the commercial half of an agreement.
 *
 * The MSA (`lib/legal/msa.ts`) carries universal terms; this file carries the
 * things that differ per engagement: price, term, scope, deliverables, what is
 * assigned to the client on final payment, and acceptance criteria.
 *
 * Admin-created projects start with WAAS_LOCAL_ORDER_FORM_SPEC as an editable
 * $199/month draft. The admin may change it before issuing the client-visible
 * version.
 *
 * Canonical HTML must be byte-stable for a given (spec, binding) pair because it
 * is hashed at acceptance. Do not use Intl, Date formatting with a locale, or
 * anything else whose output can shift between runtimes.
 */

import {
  escapeHtml,
  renderSectionsToHtml,
  renderSummaryListToHtml,
  type LegalSection,
  type LegalSummaryPoint,
} from "./render";
import { CONTRACTING_ENTITY, SUPPORT_EMAIL, TRADE_NAME } from "./msa";

export type OrderFormPricing = {
  /** One-time deposit or setup fee, charged before fulfillment begins. */
  setupFeeCents: number;
  /** Recurring fee. Zero for a pure fixed-fee build. */
  monthlyCents: number;
  /** Minimum commitment in months. Zero means month-to-month with no minimum. */
  minimumTermMonths: number;
  /** Days of notice required to cancel after any minimum term. */
  cancellationNoticeDays: number;
  /** How amounts due under this Order Form are collected. */
  collectionMethod: "stripe_checkout" | "manual_invoice";
};

export type OrderFormSpec = {
  /** Human title shown to the client, e.g. "Website-as-a-Service — Local". */
  title: string;
  /**
   * Engagement key. Free-form today; becomes the offering registry key in
   * Stage 4B. Do not branch operational behavior on it — that is what named
   * capabilities are for.
   */
  engagementType: string;
  summary: string;
  pricing: OrderFormPricing;
  scope: Array<string>;
  deliverables: Array<string>;
  /**
   * Items assigned to the client outright on receipt of all amounts due, per
   * the MSA § Intellectual Property. Empty means the engagement is delivered as
   * a subscription service and the client holds a license instead.
   */
  assignedDeliverables: Array<string>;
  acceptanceCriteria: Array<string>;
  exclusions: Array<string>;
  clientDependencies: Array<string>;
  notes?: string;
};

export type OrderFormBinding = {
  /** Public project slug, binds this document to one project. */
  projectSlug: string;
  /** Client company name as it appears on the agreement. */
  clientName: string;
  /** MSA version this order form incorporates. */
  msaVersion: string;
  /** Order form version string, unique per project. */
  version: string;
  /** Issue timestamp in epoch ms; rendered as a UTC date. */
  issuedAt: number;
};

/**
 * Locale-independent USD formatter. Intentionally not Intl.NumberFormat — ICU
 * output differs between runtimes and would change the document hash.
 */
export const formatUsd = (cents: number): string => {
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  const grouped = String(dollars).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const body = remainder === 0 ? grouped : `${grouped}.${String(remainder).padStart(2, "0")}`;
  return `${negative ? "-" : ""}$${body}`;
};

/** UTC YYYY-MM-DD. Deterministic across runtimes and time zones. */
export const formatUtcDate = (epochMs: number): string =>
  new Date(epochMs).toISOString().slice(0, 10);

/** One sentence describing the commercial shape, reused in UI and email. */
export const describePricing = (pricing: OrderFormPricing): string => {
  const parts: Array<string> = [];
  if (pricing.setupFeeCents > 0) {
    parts.push(`${formatUsd(pricing.setupFeeCents)} due at signing`);
  }
  if (pricing.monthlyCents > 0) {
    parts.push(`${formatUsd(pricing.monthlyCents)} per month`);
  }
  if (parts.length === 0) {
    return "No fees are payable under this Order Form.";
  }
  const base = parts.join(", then ");
  if (pricing.minimumTermMonths > 0) {
    return `${base}, with a ${pricing.minimumTermMonths}-month minimum term.`;
  }
  return `${base}, month to month with no minimum term.`;
};

/**
 * Validate the fields that make an issued Order Form operationally safe.
 * Drafts may be incomplete; issuing is the point where these rules become hard
 * requirements because the client can accept the document immediately after.
 */
export const validateOrderFormForIssue = (
  spec: OrderFormSpec,
  stripePriceId?: string,
  setupStripePriceId?: string,
): Array<string> => {
  const errors: Array<string> = [];
  const requiredText: Array<[string, string]> = [
    ["Title", spec.title],
    ["Engagement type", spec.engagementType],
    ["Summary", spec.summary],
  ];

  for (const [label, value] of requiredText) {
    if (value.trim().length === 0) errors.push(`${label} is required`);
  }

  const requiredLists: Array<[string, Array<string>]> = [
    ["Scope", spec.scope],
    ["Deliverables", spec.deliverables],
    ["Acceptance criteria", spec.acceptanceCriteria],
  ];
  for (const [label, values] of requiredLists) {
    if (values.length === 0 || values.some((value) => value.trim().length === 0)) {
      errors.push(`${label} must contain at least one non-empty item`);
    }
  }

  const numericFields: Array<[string, number]> = [
    ["Setup fee", spec.pricing.setupFeeCents],
    ["Monthly fee", spec.pricing.monthlyCents],
    ["Minimum term", spec.pricing.minimumTermMonths],
    ["Cancellation notice", spec.pricing.cancellationNoticeDays],
  ];
  for (const [label, value] of numericFields) {
    if (!Number.isSafeInteger(value) || value < 0) {
      errors.push(`${label} must be a non-negative whole number`);
    }
  }

  if (spec.pricing.collectionMethod === "stripe_checkout") {
    if (spec.pricing.monthlyCents <= 0) {
      errors.push("Stripe Checkout requires a positive monthly fee");
    }
    if (!stripePriceId?.trim().match(/^price_[A-Za-z0-9_]+$/)) {
      errors.push("A valid recurring Stripe Price ID is required for Stripe Checkout");
    }
    if (
      spec.pricing.setupFeeCents > 0 &&
      !setupStripePriceId?.trim().match(/^price_[A-Za-z0-9_]+$/)
    ) {
      errors.push(
        "A valid one-time Stripe Price ID is required when the Order Form has a setup fee",
      );
    }
    if (spec.pricing.setupFeeCents === 0 && setupStripePriceId?.trim()) {
      errors.push("Remove the setup Stripe Price ID when the setup fee is zero");
    }
  } else if (stripePriceId?.trim() || setupStripePriceId?.trim()) {
    errors.push("Manual invoice Order Forms must not carry Stripe Price IDs");
  }

  return errors;
};

export const buildOrderFormSummaryPoints = (
  spec: OrderFormSpec,
): Array<LegalSummaryPoint> => {
  const points: Array<LegalSummaryPoint> = [];
  if (spec.pricing.setupFeeCents > 0) {
    points.push({
      label: "Due at signing",
      value: formatUsd(spec.pricing.setupFeeCents),
    });
  }
  points.push({
    label: "Recurring",
    value:
      spec.pricing.monthlyCents > 0
        ? `${formatUsd(spec.pricing.monthlyCents)}/mo`
        : "None — one-time engagement",
  });
  points.push({
    label: "Minimum term",
    value:
      spec.pricing.minimumTermMonths > 0
        ? `${spec.pricing.minimumTermMonths}-month commitment`
        : "None",
  });
  points.push({
    label: "Ownership",
    value:
      spec.assignedDeliverables.length > 0
        ? "Assigned to you on final payment"
        : "Licensed while your subscription is active",
  });
  return points;
};

const listSection = (
  anchor: string,
  title: string,
  intro: string,
  items: Array<string>,
): LegalSection | null => {
  if (items.length === 0) return null;
  return {
    anchor,
    title,
    blocks: [
      { type: "paragraph", text: intro },
      { type: "list", items },
    ],
  };
};

export const buildOrderFormSections = (
  spec: OrderFormSpec,
  binding: OrderFormBinding,
): Array<LegalSection> => {
  const sections: Array<LegalSection> = [];

  sections.push({
    anchor: "engagement",
    title: "Engagement",
    blocks: [
      {
        type: "paragraph",
        text: `This Order Form is between ${binding.clientName} ("Client") and ${CONTRACTING_ENTITY}, operating as ${TRADE_NAME}. It incorporates the Master Services Agreement version ${binding.msaVersion} by reference. Where this Order Form conflicts with the MSA, this Order Form controls for this engagement only.`,
      },
      { type: "paragraph", text: spec.summary },
      {
        type: "list",
        items: [
          `Order Form version: ${binding.version}`,
          `Issued: ${formatUtcDate(binding.issuedAt)} (UTC)`,
          `Project reference: ${binding.projectSlug}`,
          `Engagement type: ${spec.engagementType}`,
        ],
      },
    ],
  });

  sections.push({
    anchor: "fees",
    title: "Fees & Payment Schedule",
    blocks: [
      { type: "paragraph", text: describePricing(spec.pricing) },
      {
        type: "list",
        items: [
          `Deposit / setup fee: ${
            spec.pricing.setupFeeCents > 0
              ? `${formatUsd(spec.pricing.setupFeeCents)}, due before fulfillment begins and non-refundable once work has commenced`
              : "None"
          }`,
          // Branch on collection method: a manual-invoice document that claims
          // a saved payment method contradicts its own payment-collection line,
          // and the contradiction would be sealed into the hash.
          `Recurring fee: ${
            spec.pricing.monthlyCents === 0
              ? "None"
              : spec.pricing.collectionMethod === "stripe_checkout"
                ? `${formatUsd(
                    spec.pricing.monthlyCents,
                  )} per month, charged to the payment method saved at checkout, recurring on the same day each month`
                : `${formatUsd(
                    spec.pricing.monthlyCents,
                  )} per month, invoiced separately each month and payable on the terms stated in the invoice`
          }`,
          `Minimum term: ${
            spec.pricing.minimumTermMonths > 0
              ? `${spec.pricing.minimumTermMonths} consecutive months, beginning on the first successful payment`
              : "None"
          }`,
          `Cancellation notice: ${
            spec.pricing.cancellationNoticeDays > 0
              ? `${spec.pricing.cancellationNoticeDays} days before the next billing date`
              : "Not applicable"
          }`,
          `Payment collection: ${
            spec.pricing.collectionMethod === "stripe_checkout"
              ? "Recurring fees are collected through Stripe Checkout using the payment method Client supplies"
              : "Amounts due are invoiced separately and are not collected through self-serve checkout"
          }`,
        ],
      },
      ...(spec.pricing.minimumTermMonths > 0 && spec.pricing.monthlyCents > 0
        ? [
            {
              type: "paragraph" as const,
              text: "If Client terminates before the minimum term concludes other than for our uncured material breach, the remaining months of the minimum term become immediately due.",
            },
          ]
        : []),
      {
        type: "paragraph",
        text: "Fees are exclusive of taxes and of third-party costs approved in advance, such as domain registration, paid media, app store fees, or licensed data feeds.",
      },
    ],
  });

  const scope = listSection(
    "scope",
    "Scope of Work",
    "We will perform the following work under this Order Form:",
    spec.scope,
  );
  if (scope) sections.push(scope);

  const deliverables = listSection(
    "deliverables",
    "Deliverables",
    "This engagement produces the following deliverables:",
    spec.deliverables,
  );
  if (deliverables) sections.push(deliverables);

  sections.push({
    anchor: "ownership",
    title: "Ownership of Deliverables",
    blocks:
      spec.assignedDeliverables.length > 0
        ? [
            {
              type: "paragraph",
              text: "Upon our receipt of all amounts due under this Order Form, the following are Assigned Deliverables and are assigned to Client under the MSA § Intellectual Property & License:",
            },
            { type: "list", items: spec.assignedDeliverables },
            {
              type: "paragraph",
              text: "Our Retained Materials embedded in these deliverables remain ours, licensed to Client perpetually as part of the deliverable under the MSA.",
            },
          ]
        : [
            {
              type: "paragraph",
              text: "This engagement is delivered as an ongoing subscription service. Client holds a non-exclusive license to use the deliverable during the subscription term under the MSA § Intellectual Property & License, and no deliverable is assigned outright.",
            },
            {
              type: "paragraph",
              text: "If the subscription ends while the account is current, we will on written request deliver an export of Client content and data, or transfer the site to a host Client designates.",
            },
          ],
  });

  const acceptance = listSection(
    "acceptance",
    "Acceptance Criteria",
    "A deliverable is accepted when it meets the following criteria, subject to the review window in the MSA § Delivery, Review & Acceptance:",
    spec.acceptanceCriteria,
  );
  if (acceptance) sections.push(acceptance);

  const exclusions = listSection(
    "exclusions",
    "Out of Scope",
    "The following are not included in this Order Form and require a written change order:",
    spec.exclusions,
  );
  if (exclusions) sections.push(exclusions);

  const dependencies = listSection(
    "dependencies",
    "Client Dependencies",
    "Delivery depends on Client providing the following. Delay in any of these shifts the schedule accordingly:",
    spec.clientDependencies,
  );
  if (dependencies) sections.push(dependencies);

  if (spec.notes && spec.notes.trim().length > 0) {
    sections.push({
      anchor: "additional-terms",
      title: "Additional Terms",
      blocks: [{ type: "paragraph", text: spec.notes.trim() }],
    });
  }

  return sections;
};

export const buildOrderFormCanonicalHtml = (
  spec: OrderFormSpec,
  binding: OrderFormBinding,
): string => {
  const version = escapeHtml(binding.version);
  const projectSlug = escapeHtml(binding.projectSlug);
  const msaVersion = escapeHtml(binding.msaVersion);
  const title = escapeHtml(spec.title);
  const clientName = escapeHtml(binding.clientName);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Order Form ${version} — ${projectSlug}</title>
  </head>
  <body data-order-form-version="${version}" data-msa-version="${msaVersion}" data-project="${projectSlug}">
    <header>
      <h1>Order Form</h1>
      <p>${title}</p>
      <p>${escapeHtml(CONTRACTING_ENTITY)} (${escapeHtml(TRADE_NAME)}) and ${clientName}</p>
      <p>Version: ${version} • Issued: ${formatUtcDate(binding.issuedAt)} • MSA: ${msaVersion}</p>
      <ul>${renderSummaryListToHtml(buildOrderFormSummaryPoints(spec))}</ul>
    </header>
    ${renderSectionsToHtml(buildOrderFormSections(spec, binding))}
    <footer>
      <p>Questions? Email <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}">${escapeHtml(SUPPORT_EMAIL)}</a>.</p>
      <p>Order Form ${version} • MSA ${msaVersion}</p>
    </footer>
  </body>
</html>`;
};

/**
 * The self-serve Website-as-a-Service engagement. This is the commercial prose
 * that used to be hardcoded in the global terms document — $199/mo, 12-month
 * minimum, seven pages, unlimited edits.
 */
export const WAAS_LOCAL_ORDER_FORM_SPEC: OrderFormSpec = {
  title: "Website-as-a-Service — Local",
  engagementType: "waas_local",
  summary:
    "A custom-designed, high-performance website delivered as an ongoing service. We handle design, development, hosting, optimization, and continual support so that you can focus on your business.",
  pricing: {
    setupFeeCents: 0,
    monthlyCents: 19900,
    minimumTermMonths: 12,
    cancellationNoticeDays: 14,
    collectionMethod: "stripe_checkout",
  },
  scope: [
    "Design and build up to seven fully responsive pages using Next.js, deployed on managed hosting.",
    "Performance tuning targeting a 95+ Lighthouse performance score where technically feasible.",
    "Reviews showcase, lead capture form with email notifications, and SMS lead alerts where consented.",
    "Managed hosting, SSL certificates, uptime and analytics monitoring for the duration of the subscription.",
    "Unlimited content edits requested by email within reasonable use, batched within two business days where possible.",
  ],
  deliverables: [
    "A live website served from a domain you control.",
    "A client portal showing site metrics, leads, and edit request status.",
    "Ongoing hosting, maintenance, and content edits for the duration of the subscription.",
  ],
  assignedDeliverables: [],
  acceptanceCriteria: [
    "All pages in scope are published and reachable on the live domain.",
    "The contact form delivers a test submission to the notification email on file.",
    "The site renders without layout defects on current versions of mobile and desktop Chrome and Safari.",
    "Business name, address, phone number, and hours match the information you supplied.",
  ],
  exclusions: [
    "Net-new site concepts or full redesigns after launch.",
    "E-commerce, custom application development, or bespoke third-party integrations.",
    "Paid advertising management, and any paid media spend.",
    "Content writing beyond editing and arranging the material you supply.",
  ],
  clientDependencies: [
    "Logo, photography, and any brand assets you want used.",
    "Business details: services, service area, hours, phone, and address.",
    "Timely review and approval of the staged site.",
    "Domain registrar access, or authorization for us to point DNS.",
  ],
};
