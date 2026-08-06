/**
 * Pure validation for the Stripe Price bound to an issued Order Form.
 * Kept outside the Convex action so the money check has focused unit tests.
 */
export type StripePriceForValidation = {
  id: string;
  active: boolean;
  currency: string;
  type: string;
  unit_amount: number | null;
  recurring: null | {
    interval: string;
    interval_count: number;
    usage_type?: string;
  };
};

export function validateStripePriceForMonthlyOrderForm(
  price: StripePriceForValidation,
  expectedPriceId: string,
  expectedMonthlyCents: number,
): Array<string> {
  const errors: Array<string> = [];
  if (price.id !== expectedPriceId) errors.push("Stripe returned a different Price ID");
  if (!price.active) errors.push("Stripe Price is inactive");
  if (price.currency.toLowerCase() !== "usd") errors.push("Stripe Price is not USD");
  if (price.type !== "recurring" || !price.recurring) {
    errors.push("Stripe Price is not recurring");
  } else {
    if (price.recurring.interval !== "month" || price.recurring.interval_count !== 1) {
      errors.push("Stripe Price is not billed once per month");
    }
    if (price.recurring.usage_type && price.recurring.usage_type !== "licensed") {
      errors.push("Stripe Price must use fixed licensed billing");
    }
  }
  if (price.unit_amount !== expectedMonthlyCents) {
    errors.push("Stripe Price amount does not match the signed Order Form");
  }
  return errors;
}

export function validateStripePriceForSetupFee(
  price: StripePriceForValidation,
  expectedPriceId: string,
  expectedSetupFeeCents: number,
): Array<string> {
  const errors: Array<string> = [];
  if (price.id !== expectedPriceId) errors.push("Stripe returned a different setup Price ID");
  if (!price.active) errors.push("Stripe setup Price is inactive");
  if (price.currency.toLowerCase() !== "usd") errors.push("Stripe setup Price is not USD");
  if (price.type !== "one_time" || price.recurring !== null) {
    errors.push("Stripe setup Price is not one-time");
  }
  if (price.unit_amount !== expectedSetupFeeCents) {
    errors.push("Stripe setup Price amount does not match the signed Order Form");
  }
  return errors;
}
