import type { TermsSection, TermsContentBlock } from "./terms";

export type { TermsSection as PrivacySection, TermsContentBlock as PrivacyContentBlock };

export const PRIVACY_VERSION = "2026-08-06" as const;
export const PRIVACY_LAST_UPDATED = "2026-08-06" as const;

export const PRIVACY_SECTIONS: Array<TermsSection> = [
  {
    anchor: "information-we-collect",
    title: "Information We Collect",
    blocks: [
      {
        type: "subheading",
        text: "Information You Provide",
      },
      {
        type: "list",
        items: [
          "Contact information: name, email address, phone number, and business name provided when you contact us, book a call, or use your client portal.",
          "Business details: company description, current website URL, brand assets, and service preferences.",
          "Communications: messages, edit requests, and support inquiries submitted through the portal or email.",
          "Agreement records: when you accept an agreement in the portal we record the date and time, your browser user agent, and a cryptographic hash of the exact documents shown to you, as evidence of what you accepted.",
        ],
      },
      {
        type: "subheading",
        text: "Information Collected Automatically",
      },
      {
        type: "list",
        items: [
          "Website analytics: page views, page paths, and the referring site reported by your client website to our authenticated events endpoint.",
          "Conversion events: taps and clicks on your phone number, email address, and directions links, so your portal can show how visitors try to reach you.",
          "Lead submissions: name, email, phone number, and message content submitted through your website's contact form by your visitors.",
          "Usage data: interactions with the client portal, including login activity and feature usage.",
        ],
      },
    ],
  },
  {
    anchor: "how-we-use-information",
    title: "How We Use Your Information",
    blocks: [
      {
        type: "paragraph",
        text: "We use the information we collect to provide, maintain, and improve our Website-as-a-Service offering. Specifically:",
      },
      {
        type: "list",
        items: [
          "Build, host, and maintain your custom website.",
          "Deliver lead submissions to your inbox and via SMS notifications to the phone number you provide.",
          "Show website performance metrics — page views, top pages, and conversion taps — in your client portal.",
          "Screen incoming lead submissions with an automated model so we can suppress obvious spam before notifying you.",
          "Process payments and manage your subscription.",
          "Communicate with you about your account, service updates, and support requests.",
          "Improve our services based on usage patterns and feedback.",
        ],
      },
    ],
  },
  {
    anchor: "sms-notifications",
    title: "SMS Notifications",
    blocks: [
      {
        type: "paragraph",
        text: "If you provide a phone number and affirmatively opt in through the separate client portal checkbox, we use it to send SMS lead notifications when someone submits a contact form on your website. Message frequency varies based on lead volume. Message and data rates may apply.",
      },
      {
        type: "list",
        items: [
          "Reply STOP to opt out of SMS notifications at any time.",
          "Reply HELP for support information.",
          "Opting out of SMS does not affect lead delivery via email or your subscription.",
        ],
      },
      {
        type: "paragraph",
        text: "Mobile information and SMS opt-in consent are not shared with third parties or affiliates for marketing or promotional purposes. Text messaging originator opt-in data and consent will not be shared with any third parties. SMS messages are delivered through our provider, Twilio. See our Terms of Service for full SMS terms.",
      },
    ],
  },
  {
    anchor: "third-party-services",
    title: "Third-Party Services",
    blocks: [
      {
        type: "paragraph",
        text: "We use trusted third-party services to operate our platform. These services process data on our behalf and are bound by their own privacy policies:",
      },
      {
        type: "list",
        items: [
          "Vercel — website hosting and deployment.",
          "Convex — backend infrastructure and database.",
          "Stripe — payment processing and subscription management.",
          "Twilio — SMS lead notification delivery.",
          "Resend — transactional email delivery.",
          "Cal.com — scheduling and appointment booking.",
          "Groq — AI processing used to screen lead submissions and to summarize public website audits.",
          "Firecrawl — public web page content extraction used in website audits.",
          "Google — Places and PageSpeed Insights data used in business research and website audits.",
        ],
      },
      {
        type: "paragraph",
        text: "We do not sell, rent, or share your personal information with third parties for their own marketing purposes.",
      },
    ],
  },
  {
    anchor: "data-from-your-website-visitors",
    title: "Data from Your Website Visitors",
    blocks: [
      {
        type: "paragraph",
        text: "When someone visits your client website, we collect page views, the page path, the referring site, and taps on your phone, email, and directions links, along with any information they voluntarily submit through your contact form (name, email, phone, message). We do not set cookies on your visitors, do not build visitor profiles, and do not track them across other websites.",
      },
      {
        type: "paragraph",
        text: "This visitor data is used solely to deliver leads to you and to show you performance metrics in your portal. Lead content is passed to our AI provider only to screen it for spam. We do not use your visitors' data for our own marketing, sell it, or share it with third parties beyond what is necessary to deliver the service.",
      },
    ],
  },
  {
    anchor: "business-research-and-audits",
    title: "Business Research & Website Audits",
    blocks: [
      {
        type: "paragraph",
        text: "We research local businesses that may be a fit for our services. That research uses publicly available information — business listings, publicly published contact details, and the public pages of a business's own website — together with automated performance scores and an AI-generated summary of what we found. The result may be published as a website audit at a private, unguessable link and shared with that business by email.",
      },
      {
        type: "paragraph",
        text: "This research covers businesses, not consumers, and we do not buy personal contact lists. If you are a business owner and want your audit removed or your business excluded from future outreach, email support@acadianawebdesign.com and we will delete the record. Every outreach email also tells you how to opt out, and replying \"unsubscribe\" removes you.",
      },
    ],
  },
  {
    anchor: "data-security",
    title: "Data Security",
    blocks: [
      {
        type: "paragraph",
        text: "We implement industry-standard security measures to protect your information, including SSL encryption, secure authentication, and access controls. However, no method of transmission or storage is completely secure, and we cannot guarantee absolute security.",
      },
    ],
  },
  {
    anchor: "data-retention",
    title: "Data Retention",
    blocks: [
      {
        type: "paragraph",
        text: "We retain your account information and website data for the duration of your subscription. After cancellation, we may retain data for a reasonable period to facilitate potential reactivation or site transfer. You may request deletion of your data at any time by contacting us.",
      },
      {
        type: "paragraph",
        text: "Lead submissions and analytics data associated with your website are retained while your subscription is active. After it ends we keep them for at least 30 days so you can request an export or a site transfer, and we may delete them after 60 days. You may request deletion sooner by emailing support@acadianawebdesign.com.",
      },
    ],
  },
  {
    anchor: "cookies",
    title: "Cookies & Tracking",
    blocks: [
      {
        type: "paragraph",
        text: "Our main website and client portal use essential cookies for authentication and session management. We do not use third-party advertising cookies or cross-site tracking.",
      },
      {
        type: "paragraph",
        text: "Client websites report page views and conversion taps to an authenticated events endpoint on our platform. This reporting does not use cookies, does not store visitor identifiers, and does not track visitors across other websites.",
      },
    ],
  },
  {
    anchor: "childrens-privacy",
    title: "Children's Privacy",
    blocks: [
      {
        type: "paragraph",
        text: "Our services are intended for business owners and are not directed at individuals under 18. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us and we will promptly delete it.",
      },
    ],
  },
  {
    anchor: "your-rights",
    title: "Your Rights",
    blocks: [
      {
        type: "paragraph",
        text: "You may request access to, correction of, or deletion of your personal information at any time by contacting us at support@acadianawebdesign.com. We will respond to requests within 30 days.",
      },
      {
        type: "paragraph",
        text: "You may opt out of SMS notifications by replying STOP. You may update your contact information through your client portal or by emailing us.",
      },
    ],
  },
  {
    anchor: "changes-to-policy",
    title: "Changes to This Policy",
    blocks: [
      {
        type: "paragraph",
        text: "We may update this Privacy Policy to reflect changes in our practices or for legal, operational, or regulatory reasons. Material changes will be communicated via email to active subscribers at least 14 days before they take effect.",
      },
    ],
  },
  {
    anchor: "contact",
    title: "Contact",
    blocks: [
      {
        type: "paragraph",
        text: "If you have questions about this Privacy Policy or how we handle your data, contact us at support@acadianawebdesign.com.",
      },
    ],
  },
];
