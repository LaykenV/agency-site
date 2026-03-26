export const TERMS_VERSION = "2026-03-10" as const;
export const TERMS_LAST_UPDATED = "2026-03-10" as const;

export type TermsContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered?: boolean; items: Array<string> }
  | { type: "subheading"; text: string };

export type TermsSection = {
  anchor: string;
  title: string;
  blocks: Array<TermsContentBlock>;
};

type SummaryPoint = {
  label: string;
  value: string;
  html?: string;
};

export const TERMS_SUMMARY_POINTS: Array<SummaryPoint> = [
  { label: "Plan", value: "$199/mo, $0 down" },
  { label: "Minimum Term", value: "12-month commitment" },
  { label: "Early Termination", value: "Remaining months due in full" },
  { label: "Billing", value: "Recurring monthly charge until canceled" },
];

export const TERMS_SECTIONS: Array<TermsSection> = [
  {
    anchor: "order-summary",
    title: "Order Summary",
    blocks: [
      {
        type: "paragraph",
        text: "Your subscription includes a custom-designed, high-performance website delivered as an ongoing service. We handle design, development, hosting, optimization, and continual support so that you can focus on your business.",
      },
      {
        type: "list",
        items: [
          "Website-as-a-Service subscription priced at $199 per month after $0 down.",
          "12-month minimum commitment starting on your first successful payment.",
          "Unlimited content edits delivered via email within reasonable use.",
          "Hosting, SSL certificates, analytics monitoring, and performance tuning included.",
        ],
      },
      {
        type: "paragraph",
        text: "Following the initial 12-month term, the subscription renews month-to-month until canceled under these terms.",
      },
    ],
  },
  {
    anchor: "scope-of-service",
    title: "Scope of Service",
    blocks: [
      {
        type: "paragraph",
        text: "We build and maintain up to seven fully responsive pages powered by Next.js and deployed on Vercel. Each build targets a 95+ Lighthouse performance score where technically feasible.",
      },
      {
        type: "paragraph",
        text: "Features include a reviews showcase, lead capture form with email notifications, managed hosting, and SSL. Additional integrations or features outside of this scope may require a separate agreement.",
      },
    ],
  },
  {
    anchor: "unlimited-edits",
    title: "Unlimited Edits Policy",
    blocks: [
      {
        type: "paragraph",
        text: "Unlimited edits means you can request reasonable content updates, copy tweaks, image swaps, and layout refinements at any time via email. We batch minor requests within two business days whenever possible.",
      },
      {
        type: "list",
        items: [
          "Included: copy changes, swapping photos, adjusting colors, publishing testimonials, adding new sections to existing pages.",
          "Not included: net-new site concepts, e-commerce builds, custom app development, or complex integrations requiring bespoke engineering.",
          "Large redesigns or functionality expansions may be scoped separately with additional fees.",
        ],
      },
    ],
  },
  {
    anchor: "responsibilities",
    title: "Client Responsibilities",
    blocks: [
      {
        type: "paragraph",
        text: "You agree to provide timely feedback, approvals, and brand assets necessary to deliver and maintain the website. Content and claims supplied by you must be accurate and lawful.",
      },
      {
        type: "paragraph",
        text: "Delays in providing assets or approvals may impact project timelines and launch dates. Continued non-response for 30 days or more may move the project to the back of the production queue.",
      },
    ],
  },
  {
    anchor: "intellectual-property",
    title: "Intellectual Property & License",
    blocks: [
      {
        type: "paragraph",
        text: "You retain ownership of all original content, trademarks, and media you supply. We grant you a non-exclusive, non-transferable license to use the delivered website during an active subscription and while your account is in good standing.",
      },
      {
        type: "paragraph",
        text: "If the subscription ends and your account is current, we will transfer the site to your preferred host or deliver a static export upon written request. Outstanding balances must be paid in full prior to transfer.",
      },
    ],
  },
  {
    anchor: "billing-and-payment",
    title: "Billing & Payment Authorization",
    blocks: [
      {
        type: "paragraph",
        text: "You authorize recurring monthly charges of $199 to the payment method saved during checkout. Charges begin immediately upon subscription activation and recur on the same day each month.",
      },
      {
        type: "paragraph",
        text: "Invoices and receipts are emailed automatically. You must maintain a valid payment method on file. Failed payments may pause services until the account is brought current.",
      },
    ],
  },
  {
    anchor: "minimum-term",
    title: "Minimum Term & Early Termination",
    blocks: [
      {
        type: "paragraph",
        text: "The initial commitment is twelve (12) consecutive months. After the minimum term, the subscription continues monthly until canceled with at least 14 days' notice before the next billing date.",
      },
      {
        type: "paragraph",
        text: "If you terminate before the minimum term concludes, the remaining months become immediately due. We may offer a negotiated early termination fee at our discretion, but are not obligated to do so.",
      },
    ],
  },
  {
    anchor: "scheduling",
    title: "Scheduling & Communication",
    blocks: [
      {
        type: "paragraph",
        text: "Kickoff calls are scheduled within five business days of subscription activation. Ongoing support is coordinated via email, and we respond to new requests within one business day.",
      },
      {
        type: "paragraph",
        text: "We will schedule periodic review calls to ensure the site continues to reflect your business goals. Missed or repeatedly rescheduled meetings may extend the overall delivery timeline.",
      },
    ],
  },
  {
    anchor: "sms-lead-notifications",
    title: "SMS Lead Notifications",
    blocks: [
      {
        type: "paragraph",
        text: "As part of your subscription, we may send SMS text messages to the phone number you provide to notify you when a new lead is submitted through your website's contact form. These messages contain the lead's name, email, phone number (if provided), and message so you can follow up promptly.",
      },
      {
        type: "subheading",
        text: "Consent & Opt-In",
      },
      {
        type: "paragraph",
        text: "By providing your phone number during onboarding or through your client portal and affirmatively checking the SMS consent box, you consent to receive automated SMS lead notifications from Acadiana Web Design. Consent is not a condition of purchase. You may use the service without providing a phone number.",
      },
      {
        type: "subheading",
        text: "Message Frequency & Rates",
      },
      {
        type: "paragraph",
        text: "Message frequency varies based on the number of leads your website receives. You will receive one SMS per lead submission. Message and data rates may apply depending on your mobile carrier and plan.",
      },
      {
        type: "subheading",
        text: "Opt-Out & Help",
      },
      {
        type: "list",
        items: [
          "Reply STOP to any message to opt out of SMS notifications at any time.",
          "Reply HELP to any message for support information.",
          "You may also contact us at support@acadianawebdesign.com to opt out or get help.",
          "Opting out of SMS does not affect your subscription or lead delivery via email.",
        ],
      },
      {
        type: "subheading",
        text: "SMS Provider",
      },
      {
        type: "paragraph",
        text: "SMS messages are sent via Twilio. Your phone number is stored securely and is not shared with third parties for marketing purposes. For details on how we handle your data, see our Privacy Policy.",
      },
    ],
  },
  {
    anchor: "disclaimers",
    title: "Disclaimers & Warranties",
    blocks: [
      {
        type: "paragraph",
        text: "We provide the service “as-is” and disclaim all implied warranties including merchantability and fitness for a particular purpose. We do not guarantee search engine rankings, lead volume, or revenue outcomes.",
      },
      {
        type: "paragraph",
        text: "We are not liable for damages arising from third-party platforms, outages beyond our control, or client-provided materials that violate law or policy.",
      },
    ],
  },
  {
    anchor: "liability",
    title: "Limitation of Liability",
    blocks: [
      {
        type: "paragraph",
        text: "Our total liability for any claim related to this agreement will not exceed fees paid in the three (3) months preceding the event that gave rise to the claim.",
      },
      {
        type: "paragraph",
        text: "We are not liable for indirect, incidental, or consequential damages, including lost profits, lost data, or business interruption.",
      },
    ],
  },
  {
    anchor: "termination-and-suspension",
    title: "Termination & Suspension",
    blocks: [
      {
        type: "paragraph",
        text: "We may suspend or terminate services for non-payment, abusive behavior toward our team, or unlawful content. If we terminate without cause, we will refund prepaid fees for unused months.",
      },
      {
        type: "paragraph",
        text: "Upon termination, your license to the hosted assets ends and we may disable hosting access after providing reasonable notice.",
      },
    ],
  },
  {
    anchor: "governing-law",
    title: "Governing Law & Venue",
    blocks: [
      {
        type: "paragraph",
        text: "This agreement is governed by the laws of the State of Louisiana without regard to conflict-of-law principles. The parties consent to exclusive jurisdiction in Lafayette Parish, Louisiana.",
      },
    ],
  },
  {
    anchor: "changes",
    title: "Changes to Terms",
    blocks: [
      {
        type: "paragraph",
        text: "We may update these Terms to reflect operational, legal, or security changes. Material updates will be emailed to subscribed clients at least 14 days before they take effect. Continued use of the service after the effective date constitutes acceptance.",
      },
    ],
  },
  {
    anchor: "notices",
    title: "Notices & Contact",
    blocks: [
      {
        type: "paragraph",
        text: "Official notices must be sent by email to support@acadianawebdesign.com. You are responsible for keeping your contact information current. We will send operational updates and invoices to the email attached to your account.",
      },
    ],
  },
];

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderBlockToHtml = (block: TermsContentBlock): string => {
  if (block.type === "paragraph") {
    return `<p>${escapeHtml(block.text)}</p>`;
  }
  if (block.type === "subheading") {
    return `<h3>${escapeHtml(block.text)}</h3>`;
  }
  const tag = block.ordered ? "ol" : "ul";
  const items = block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `<${tag}>${items}</${tag}>`;
};

const buildCanonicalHtml = (): string => {
  const sectionsHtml = TERMS_SECTIONS.map((section) => {
    const blocks = section.blocks.map(renderBlockToHtml).join("");
    return `
      <section id="${section.anchor}">
        <h2>${escapeHtml(section.title)}</h2>
        ${blocks}
      </section>
    `;
  }).join("");

  const summaryList = TERMS_SUMMARY_POINTS.map((item) => {
    const value = item.html ?? escapeHtml(item.value);
    return `<li><strong>${escapeHtml(item.label)}:</strong> ${value}</li>`;
  }).join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Terms of Service — Version ${TERMS_VERSION}</title>
  </head>
  <body data-terms-version="${TERMS_VERSION}">
    <header>
      <h1>Terms of Service</h1>
      <p>Version: ${TERMS_VERSION} • Last updated: ${TERMS_LAST_UPDATED}</p>
      <ul>${summaryList}</ul>
    </header>
    ${sectionsHtml}
    <footer>
      <p>Questions? Email <a href="mailto:support@acadianawebdesign.com">support@acadianawebdesign.com</a>.</p>
      <p>Version ${TERMS_VERSION}</p>
    </footer>
  </body>
</html>`;
};

export const TERMS_CANONICAL_HTML = buildCanonicalHtml();

export const TERMS_HASH_INPUT = TERMS_CANONICAL_HTML;
