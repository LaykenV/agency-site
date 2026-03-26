import type { TermsSection, TermsContentBlock } from "./terms";

export type { TermsSection as PrivacySection, TermsContentBlock as PrivacyContentBlock };

export const PRIVACY_VERSION = "2026-03-10" as const;
export const PRIVACY_LAST_UPDATED = "2026-03-10" as const;

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
          "Contact information: name, email address, phone number, and business name provided during onboarding or through your client portal.",
          "Business details: company description, current website URL, brand assets, and service preferences.",
          "Communications: messages, edit requests, and support inquiries submitted through the portal or email.",
        ],
      },
      {
        type: "subheading",
        text: "Information Collected Automatically",
      },
      {
        type: "list",
        items: [
          "Website analytics: page views and top-performing pages collected from your client website via our analytics pixel.",
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
          "Provide monthly analytics reports on your website's performance.",
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
        text: "If you provide a phone number and affirmatively opt in through the client portal checkbox, we use it to send SMS lead notifications when someone submits a contact form on your website. Message frequency varies based on lead volume. Message and data rates may apply.",
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
        text: "Your phone number is not shared with third parties for marketing purposes. SMS messages are delivered through our provider, Twilio. See our Terms of Service for full SMS terms.",
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
        text: "When someone visits your client website, we collect anonymized analytics data (page views, device type, referral source) and any information they voluntarily submit through your contact form (name, email, phone, message).",
      },
      {
        type: "paragraph",
        text: "This visitor data is used solely to provide you with lead notifications and analytics reports. We do not use your visitors' data for our own marketing, sell it, or share it with third parties beyond what is necessary to deliver the service.",
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
        text: "Lead submissions and analytics data associated with your website are retained while your subscription is active. After cancellation, you may request deletion of this data by emailing support@acadianawebdesign.com.",
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
        text: "Client websites use a lightweight analytics pixel to collect anonymized page view data. This pixel does not use cookies and does not track visitors across other websites.",
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
