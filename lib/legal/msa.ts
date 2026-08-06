/**
 * Master Services Agreement — universal terms only.
 *
 * Price, term, scope, deliverables, and acceptance criteria deliberately do NOT
 * live here. They belong to the per-project Order Form (`lib/legal/orderForm.ts`)
 * so that a $199/mo hosted website and a five-figure bespoke build can share one
 * set of universal terms without either document lying about the other.
 *
 * Both documents are hashed at agreement acceptance and both hashes are recorded
 * on the agreement row. Changing any string in this file changes MSA_HASH_INPUT,
 * so bump MSA_VERSION in the same edit.
 */

import {
  renderSectionsToHtml,
  renderSummaryListToHtml,
  type LegalSection,
  type LegalSummaryPoint,
} from "./render";

export const MSA_VERSION = "2026-08-06" as const;
export const MSA_LAST_UPDATED = "2026-08-06" as const;

/** Contracting entity. Acadiana Web Design is the customer-facing trade name. */
export const CONTRACTING_ENTITY = "Varholdt AI LLC" as const;
export const TRADE_NAME = "Acadiana Web Design" as const;
export const SUPPORT_EMAIL = "support@acadianawebdesign.com" as const;

export type MsaSection = LegalSection;

/**
 * Structure-level highlights. These are intentionally not commercial terms —
 * the Order Form carries price, term, and scope.
 */
export const MSA_SUMMARY_POINTS: Array<LegalSummaryPoint> = [
  {
    label: "Structure",
    value: "This MSA plus a per-project Order Form",
  },
  {
    label: "Ownership",
    value: "Custom deliverables assign to you on full payment",
  },
  {
    label: "Liability cap",
    value: "12 months of fees under the applicable Order Form",
  },
  {
    label: "Governing law",
    value: "Louisiana — Lafayette Parish",
  },
];

export const MSA_SECTIONS: Array<MsaSection> = [
  {
    anchor: "agreement-structure",
    title: "Agreement Structure",
    blocks: [
      {
        type: "paragraph",
        text: `This Master Services Agreement ("MSA") is between you ("Client") and ${CONTRACTING_ENTITY}, a Louisiana limited liability company operating under the trade name ${TRADE_NAME} ("we," "us," or "our"). It sets out the universal terms that apply to every engagement between us.`,
      },
      {
        type: "paragraph",
        text: "This MSA does not by itself commit either party to any particular work, price, or schedule. Each engagement is described in a separate Order Form that states the services, deliverables, fees, payment schedule, term, acceptance criteria, and any engagement-specific terms. An Order Form takes effect when you accept it, and it incorporates this MSA by reference.",
      },
      {
        type: "paragraph",
        text: "Where an Order Form conflicts with this MSA, the Order Form controls for that engagement only. A change to one Order Form does not alter any other Order Form. You may have more than one Order Form in effect at a time; each is a separate engagement with its own fees, term, and liability cap.",
      },
      {
        type: "paragraph",
        text: "The version of this MSA and the version of your Order Form are both recorded, hashed, and stored at the moment you accept, along with the date, time, and browser user agent of your acceptance. You may request a copy of either document at any time.",
      },
    ],
  },
  {
    anchor: "services",
    title: "Services",
    blocks: [
      {
        type: "paragraph",
        text: "We will perform the services described in the applicable Order Form with reasonable skill and care, using personnel and subcontractors of our choosing. We remain responsible for the performance of any subcontractor we engage.",
      },
      {
        type: "paragraph",
        text: "Unless the Order Form says otherwise, we determine the technical means, tooling, hosting providers, and implementation approach used to deliver the services. Where an engagement depends on a third-party platform, vendor approval, or data license, the Order Form will identify it and state which party is responsible for obtaining it.",
      },
    ],
  },
  {
    anchor: "acceptance-and-review",
    title: "Delivery, Review & Acceptance",
    blocks: [
      {
        type: "paragraph",
        text: "We submit deliverables for your review as described in the Order Form. Unless the Order Form specifies a different window, you have five (5) business days from submission to either accept a deliverable or give us a written list of specific items that do not meet the stated acceptance criteria.",
      },
      {
        type: "paragraph",
        text: "We will correct any item that genuinely fails a stated acceptance criterion at no additional charge, then resubmit. If you do not respond within the review window, the deliverable is deemed accepted. Requests that go beyond the stated acceptance criteria are change requests, not rejections.",
      },
    ],
  },
  {
    anchor: "change-requests",
    title: "Change Requests",
    blocks: [
      {
        type: "paragraph",
        text: "Work outside the scope stated in an Order Form requires a written change order describing the additional work, its fee, and its effect on the schedule. Neither party is obligated to agree to a change order.",
      },
      {
        type: "paragraph",
        text: "We will not begin out-of-scope work or bill you for it without your written approval. Nothing in this section limits any ongoing support or edits allowance that an Order Form expressly includes.",
      },
    ],
  },
  {
    anchor: "responsibilities",
    title: "Client Responsibilities",
    blocks: [
      {
        type: "paragraph",
        text: "You agree to provide timely feedback, approvals, access, credentials, and brand assets reasonably necessary for us to deliver the services. Content, claims, and materials you supply must be accurate, lawful, and yours to provide.",
      },
      {
        type: "paragraph",
        text: "Delays in providing assets, approvals, or third-party access shift the schedule accordingly and do not relieve you of payment obligations that have already come due. Continued non-response for thirty (30) days or more allows us to move the engagement to the back of the production queue on written notice.",
      },
    ],
  },
  {
    anchor: "intellectual-property",
    title: "Intellectual Property & License",
    blocks: [
      {
        type: "subheading",
        text: "Your materials",
      },
      {
        type: "paragraph",
        text: "You retain ownership of all content, trademarks, media, data, and other materials you supply (\"Client Materials\"). You grant us a non-exclusive license to use Client Materials solely to perform the services and, unless the Order Form says otherwise, to reference the completed work in our portfolio and marketing.",
      },
      {
        type: "subheading",
        text: "Assigned deliverables",
      },
      {
        type: "paragraph",
        text: "Upon our receipt of all amounts due under the applicable Order Form, we assign to you all right, title, and interest in the items that Order Form identifies as Assigned Deliverables, including the source code, designs, and copy created specifically for you under that Order Form. This assignment is effective automatically on final payment and requires no further action, though we will sign reasonable documents confirming it on request.",
      },
      {
        type: "paragraph",
        text: "Until all amounts due under that Order Form are paid in full, no ownership transfers and any interim access you have is a revocable license for review purposes only.",
      },
      {
        type: "subheading",
        text: "Subscription deliverables",
      },
      {
        type: "paragraph",
        text: "Where an Order Form provides a website or application as an ongoing subscription service rather than as an Assigned Deliverable, we grant you a non-exclusive, non-transferable license to use that deliverable for your business during the subscription term and while your account is current. If the subscription ends and your account is current, we will, on written request, deliver an export of your site content and data or transfer the site to a host you designate.",
      },
      {
        type: "subheading",
        text: "Our retained materials",
      },
      {
        type: "paragraph",
        text: "We retain ownership of our pre-existing materials and of the general-purpose tooling, libraries, internal components, templates, and know-how we use across engagements (\"Retained Materials\"), including any improvements to them. To the extent Retained Materials are embedded in a deliverable, we grant you a perpetual, worldwide, royalty-free, non-exclusive license to use, modify, and host them as part of that deliverable. You may not extract Retained Materials for resale or licensing to third parties as a standalone product.",
      },
      {
        type: "paragraph",
        text: "Deliverables may incorporate third-party open-source or commercially licensed components, which remain governed by their own licenses. We will identify any component whose license materially restricts your use of a deliverable.",
      },
    ],
  },
  {
    anchor: "fees-and-payment",
    title: "Fees & Payment Authorization",
    blocks: [
      {
        type: "paragraph",
        text: "Fees, deposits or setup fees, recurring charges, and the payment schedule are stated in the applicable Order Form. Fees are exclusive of taxes and of third-party costs you agree to in advance, such as domain registration, paid media, or licensed data feeds.",
      },
      {
        type: "paragraph",
        text: "Where an Order Form states a recurring fee, you authorize us to collect that amount on the stated cycle using the payment method identified there: either the payment method saved through checkout or invoices sent separately. Where an Order Form states a deposit or setup fee, that amount is due before fulfillment begins and, once work has commenced, is non-refundable except as expressly stated in the Order Form.",
      },
      {
        type: "paragraph",
        text: "Where automatic payment applies, you must maintain a valid payment method on file. Invoices and receipts are sent by email. Amounts more than ten (10) days past due may accrue interest at the lesser of 1.5% per month or the maximum rate permitted by Louisiana law, and we may suspend services on written notice until the account is current.",
      },
      {
        type: "paragraph",
        text: "We do not store your card details. Payments are processed by our payment processor under its own terms.",
      },
    ],
  },
  {
    anchor: "term-and-termination",
    title: "Term, Cancellation & Suspension",
    blocks: [
      {
        type: "paragraph",
        text: "This MSA takes effect when you accept your first Order Form and continues until every Order Form under it has ended. Each Order Form states its own term, any minimum commitment, and its cancellation notice period.",
      },
      {
        type: "paragraph",
        text: "Either party may terminate an Order Form for material breach if the breach is not cured within fifteen (15) days of written notice. We may suspend or terminate services for non-payment, unlawful content, or abusive conduct toward our team. If we terminate an Order Form without cause, we will refund prepaid fees covering services not yet delivered.",
      },
      {
        type: "paragraph",
        text: "On termination, all amounts accrued through the effective date become due. Sections covering intellectual property, fees already accrued, confidentiality, disclaimers, limitation of liability, and governing law survive termination.",
      },
    ],
  },
  {
    anchor: "confidentiality",
    title: "Confidentiality",
    blocks: [
      {
        type: "paragraph",
        text: "Each party may receive non-public information of the other that is marked confidential or that a reasonable person would understand to be confidential, including business plans, pricing, customer data, credentials, and unreleased product information. Each party will use the other's confidential information only to perform under this MSA and will protect it with at least reasonable care.",
      },
      {
        type: "paragraph",
        text: "These obligations do not apply to information that is or becomes public without breach, was already known without a duty of confidence, or is independently developed. A party may disclose confidential information when legally compelled, after giving the other party reasonable notice where permitted by law.",
      },
    ],
  },
  {
    anchor: "sms-lead-notifications",
    title: "SMS Lead Notifications",
    blocks: [
      {
        type: "paragraph",
        text: "Where your engagement includes lead capture, we may send SMS text messages to the phone number you provide to notify you when a new lead is submitted through your website's contact form. These messages contain the lead's name, email, phone number (if provided), and message so you can follow up promptly.",
      },
      {
        type: "subheading",
        text: "Consent & Opt-In",
      },
      {
        type: "paragraph",
        text: `By providing your phone number during onboarding or through your client portal and affirmatively checking the separate SMS consent box, you consent to receive automated SMS lead notifications from ${TRADE_NAME}. Consent is not a condition of purchase. You may use the service without providing a phone number.`,
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
          `You may also contact us at ${SUPPORT_EMAIL} to opt out or get help.`,
          "Opting out of SMS does not affect your subscription or lead delivery via email.",
        ],
      },
      {
        type: "subheading",
        text: "SMS Provider",
      },
      {
        type: "paragraph",
        text: "SMS messages are sent via Twilio. Mobile information and SMS opt-in consent are not shared with third parties or affiliates for marketing or promotional purposes. Text messaging originator opt-in data and consent will not be shared with any third parties. Carriers are not liable for delayed or undelivered messages. For details on how we handle your data, see our Privacy Policy.",
      },
    ],
  },
  {
    anchor: "disclaimers",
    title: "Disclaimers & Warranties",
    blocks: [
      {
        type: "paragraph",
        text: "We warrant that the services will be performed with reasonable skill and care and that deliverables will materially conform to the acceptance criteria stated in the applicable Order Form. Your exclusive remedy for a breach of this warranty is our correction of the non-conforming deliverable.",
      },
      {
        type: "paragraph",
        text: "Except as stated above, the services and deliverables are provided “as-is” and we disclaim all other warranties, express or implied, including merchantability and fitness for a particular purpose. We do not guarantee search engine rankings, lead volume, conversion rates, app store approval, or revenue outcomes.",
      },
      {
        type: "paragraph",
        text: "We are not responsible for outages, changes, or policy decisions of third-party platforms, or for materials you supply that violate law or a third party's rights.",
      },
    ],
  },
  {
    anchor: "liability",
    title: "Limitation of Liability",
    blocks: [
      {
        type: "paragraph",
        text: "Our total aggregate liability arising out of or relating to an Order Form will not exceed the total fees paid or payable by you under that Order Form during the twelve (12) months preceding the event giving rise to the claim. Each Order Form carries its own separate cap; claims under one engagement do not draw on the fees paid under another.",
      },
      {
        type: "paragraph",
        text: "Neither party is liable for indirect, incidental, special, or consequential damages, including lost profits, lost data, or business interruption, even if advised of the possibility.",
      },
      {
        type: "paragraph",
        text: "These limits do not apply to your obligation to pay amounts due, to either party's breach of the confidentiality section, or to any liability that cannot be limited or excluded under Louisiana law.",
      },
    ],
  },
  {
    anchor: "governing-law",
    title: "Governing Law & Venue",
    blocks: [
      {
        type: "paragraph",
        text: "This MSA and every Order Form under it are governed by the laws of the State of Louisiana without regard to conflict-of-law principles. The parties consent to exclusive jurisdiction in Lafayette Parish, Louisiana.",
      },
    ],
  },
  {
    anchor: "changes",
    title: "Changes to This MSA",
    blocks: [
      {
        type: "paragraph",
        text: "We may publish an updated version of this MSA to reflect operational, legal, or security changes. Material updates will be emailed to active clients at least fourteen (14) days before they take effect.",
      },
      {
        type: "paragraph",
        text: "An updated MSA does not change the price, scope, term, or acceptance criteria of an Order Form you have already accepted. Those are fixed by the Order Form version recorded at your acceptance and can only be changed by a written change order.",
      },
    ],
  },
  {
    anchor: "general",
    title: "General",
    blocks: [
      {
        type: "paragraph",
        text: "This MSA together with your accepted Order Forms is the entire agreement between the parties on its subject matter and supersedes prior proposals and discussions. Neither party may assign this MSA without the other's written consent, except to a successor of substantially all of its business.",
      },
      {
        type: "paragraph",
        text: "We are an independent contractor, not your employee, partner, or joint venturer. If any provision is held unenforceable, the rest remains in effect. A party's failure to enforce a provision is not a waiver of it.",
      },
    ],
  },
  {
    anchor: "notices",
    title: "Notices & Contact",
    blocks: [
      {
        type: "paragraph",
        text: `Official notices must be sent by email to ${SUPPORT_EMAIL}. You are responsible for keeping your contact information current. We will send operational updates and invoices to the email attached to your account.`,
      },
    ],
  },
];

const buildCanonicalHtml = (): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Master Services Agreement — Version ${MSA_VERSION}</title>
  </head>
  <body data-msa-version="${MSA_VERSION}">
    <header>
      <h1>Master Services Agreement</h1>
      <p>${CONTRACTING_ENTITY} (${TRADE_NAME})</p>
      <p>Version: ${MSA_VERSION} • Last updated: ${MSA_LAST_UPDATED}</p>
      <ul>${renderSummaryListToHtml(MSA_SUMMARY_POINTS)}</ul>
    </header>
    ${renderSectionsToHtml(MSA_SECTIONS)}
    <footer>
      <p>Questions? Email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
      <p>Version ${MSA_VERSION}</p>
    </footer>
  </body>
</html>`;

export const MSA_CANONICAL_HTML = buildCanonicalHtml();

export const MSA_HASH_INPUT = MSA_CANONICAL_HTML;
