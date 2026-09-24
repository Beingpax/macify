export type PricingType = "free" | "freemium" | "paid";
export type BillingType = "one_time" | "subscription" | null;

export const pricingLabels: Record<PricingType, string> = {
  free: "Free",
  freemium: "Freemium",
  paid: "Paid",
};

const billingLabels: Record<Exclude<BillingType, null>, string> = {
  one_time: "One-time payment",
  subscription: "Subscription",
};

export function formatPricing({ billingType, pricingDetails, pricingType }: { billingType: BillingType; pricingDetails?: string | null; pricingType: PricingType }) {
  if (pricingDetails) return pricingDetails;
  return billingType ? `${pricingLabels[pricingType]} · ${billingLabels[billingType]}` : pricingLabels[pricingType];
}
