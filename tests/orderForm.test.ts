import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  WAAS_LOCAL_ORDER_FORM_SPEC,
  buildOrderFormCanonicalHtml,
  buildOrderFormSections,
  validateOrderFormForIssue,
  type OrderFormSpec,
} from "../lib/legal/orderForm";
import {
  validateStripePriceForMonthlyOrderForm,
  validateStripePriceForSetupFee,
} from "../lib/legal/stripePrice";

const binding = {
  projectSlug: "project-123",
  clientName: "Example Client",
  msaVersion: "2026-08-06",
  version: "1",
  issuedAt: Date.UTC(2026, 7, 6),
};

describe("Stage 4A Order Forms", () => {
  test("canonical HTML is deterministic and includes the complete document", () => {
    const first = buildOrderFormCanonicalHtml(WAAS_LOCAL_ORDER_FORM_SPEC, binding);
    const second = buildOrderFormCanonicalHtml(WAAS_LOCAL_ORDER_FORM_SPEC, binding);
    const sections = buildOrderFormSections(WAAS_LOCAL_ORDER_FORM_SPEC, binding);

    expect(first).toBe(second);
    expect(sections.map((section) => section.anchor)).toEqual([
      "engagement",
      "fees",
      "scope",
      "deliverables",
      "ownership",
      "acceptance",
      "exclusions",
      "dependencies",
    ]);
    expect(first).toContain("All pages in scope are published");
    expect(first).toContain("E-commerce, custom application development");
    expect(first).toContain("Stripe Checkout");
  });

  test("escapes dynamic header fields in stored HTML", () => {
    const html = buildOrderFormCanonicalHtml(
      { ...WAAS_LOCAL_ORDER_FORM_SPEC, title: '<img src=x onerror="alert(1)">' },
      { ...binding, clientName: "</p><script>alert(1)</script>" },
    );

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain('<img src=x onerror="alert(1)">');
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  test("requires a valid Stripe binding for subscription checkout", () => {
    expect(
      validateOrderFormForIssue(WAAS_LOCAL_ORDER_FORM_SPEC, "price_standard123"),
    ).toEqual([]);
    expect(validateOrderFormForIssue(WAAS_LOCAL_ORDER_FORM_SPEC)).toContain(
      "A valid recurring Stripe Price ID is required for Stripe Checkout",
    );

    const depositThroughCheckout: OrderFormSpec = {
      ...WAAS_LOCAL_ORDER_FORM_SPEC,
      pricing: {
        ...WAAS_LOCAL_ORDER_FORM_SPEC.pricing,
        setupFeeCents: 500_000,
      },
    };
    expect(
      validateOrderFormForIssue(depositThroughCheckout, "price_standard123"),
    ).toContain(
      "A valid one-time Stripe Price ID is required when the Order Form has a setup fee",
    );
    expect(
      validateOrderFormForIssue(
        depositThroughCheckout,
        "price_standard123",
        "price_setup123",
      ),
    ).toEqual([]);
  });

  test("allows deposits through manual invoicing without a Stripe Price ID", () => {
    const manual: OrderFormSpec = {
      ...WAAS_LOCAL_ORDER_FORM_SPEC,
      pricing: {
        ...WAAS_LOCAL_ORDER_FORM_SPEC.pricing,
        setupFeeCents: 500_000,
        monthlyCents: 1_500_00,
        collectionMethod: "manual_invoice",
      },
    };
    expect(validateOrderFormForIssue(manual)).toEqual([]);
  });

  test("a manual-invoice document never claims a saved payment method", () => {
    const manual: OrderFormSpec = {
      ...WAAS_LOCAL_ORDER_FORM_SPEC,
      pricing: {
        ...WAAS_LOCAL_ORDER_FORM_SPEC.pricing,
        monthlyCents: 150_000,
        collectionMethod: "manual_invoice",
      },
    };
    const manualHtml = buildOrderFormCanonicalHtml(manual, binding);
    const checkoutHtml = buildOrderFormCanonicalHtml(WAAS_LOCAL_ORDER_FORM_SPEC, binding);

    // The contradiction this guards: the fee bullet promising a card on file
    // while the collection bullet says the same fees are invoiced separately.
    expect(manualHtml).not.toContain("payment method saved at checkout");
    expect(manualHtml).toContain("invoiced separately each month");
    expect(checkoutHtml).toContain("payment method saved at checkout");
  });

  test("Stripe Price must match the signed monthly amount and cadence", () => {
    const price = {
      id: "price_standard123",
      active: true,
      currency: "usd",
      type: "recurring",
      unit_amount: 19_900,
      recurring: { interval: "month", interval_count: 1, usage_type: "licensed" },
    };
    expect(
      validateStripePriceForMonthlyOrderForm(price, "price_standard123", 19_900),
    ).toEqual([]);
    expect(
      validateStripePriceForMonthlyOrderForm(price, "price_standard123", 49_00),
    ).toContain("Stripe Price amount does not match the signed Order Form");
  });

  test("Stripe setup Price must be one-time and match the signed setup fee", () => {
    const price = {
      id: "price_setup123",
      active: true,
      currency: "usd",
      type: "one_time",
      unit_amount: 500_000,
      recurring: null,
    };
    expect(
      validateStripePriceForSetupFee(price, "price_setup123", 500_000),
    ).toEqual([]);
    expect(
      validateStripePriceForSetupFee(price, "price_setup123", 250_000),
    ).toContain("Stripe setup Price amount does not match the signed Order Form");
  });

  test("acceptance, checkout, and email stay bound to the accepted row", () => {
    const agreementSource = readFileSync("convex/agreement.ts", "utf8");
    const stripeSource = readFileSync("convex/stripeActions.ts", "utf8");
    const emailSource = readFileSync("convex/emails.ts", "utf8");

    expect(agreementSource).toContain('orderFormId: v.id("order_forms")');
    expect(agreementSource).toContain("args.orderFormHash");
    expect(agreementSource).toContain("await ctx.db.get(args.orderFormId)");
    expect(stripeSource).toContain("orderFormId: agreement.orderFormId");
    expect(stripeSource).toContain("validateStripePriceForMonthlyOrderForm");
    expect(stripeSource).toContain("validateStripePriceForSetupFee");
    expect(stripeSource).toContain("lineItems.unshift");
    expect(emailSource).toContain("orderFormId: agreement.orderFormId");
  });

  test("the public payment-success action cannot mark an unpaid project paid", () => {
    const stripeSource = readFileSync("convex/stripeActions.ts", "utf8");
    const customerSync = stripeSource.slice(
      stripeSource.indexOf("export const syncStripeCustomer"),
      stripeSource.indexOf("export const createCheckoutSession"),
    );
    const successAction = stripeSource.slice(
      stripeSource.indexOf("export const syncAfterSuccessForSelf"),
      stripeSource.indexOf("export const createCustomerPortalSession"),
    );

    // Preserve the Theo/T3 architecture: both the success page and webhooks
    // call one canonical Stripe -> database sync, and that sync persists the
    // subscription before deriving project status from active Stripe state.
    expect(customerSync).toContain("internal.stripeHelpers.writeSubscription");
    expect(
      customerSync.indexOf("writeSubscription") <
        customerSync.indexOf("internalSetStatusIfEligible"),
    ).toBe(true);
    expect(successAction).toContain("syncStripeCustomer");

    // The removed bypass was the extra fallback after that sync. A URL visit
    // must never create a customer or independently mark the project paid.
    expect(successAction).not.toContain("internalSetStatusIfEligible");
    expect(successAction).not.toContain("ensureCustomerForUser");
  });
});
