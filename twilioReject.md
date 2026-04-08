# Twilio A2P 10DLC Rejection Brief

## Summary

We are trying to register an A2P 10DLC campaign for **Acadiana Web Design** so subscribed business clients can receive SMS alerts when a new lead is submitted through their website.

The campaign has been rejected **three times** with the same issue:

> "The campaign submission has been reviewed and rejected due to issues verifying the Call to Action (CTA) provided for the campaign."

- Error code: **30909**
- Brand SID: `BN72fd03e3f4455ccd18161c1ca48aded5`
- Campaign SID: `CM8802a55afdfed35f11a0b5a4334e193a`

This appears to be a **CTA verification problem**, not a messaging-content problem. Our opt-in flow exists inside an authenticated client portal, so we created a public page that documents the exact consent flow and includes a screenshot of the real checkbox UI. That public documentation has still not been accepted.

---

## What The Campaign Does

- **Use case**: Sole Proprietor
- **Audience**: Our business clients only
- **Purpose**: Send a text message to the subscribed business owner when a website visitor submits a contact form
- **Recipients**: Only the business owner who opted in
- **Not sent to**: Website visitors or third parties
- **Frequency**: One SMS per lead submission; volume varies by lead activity
- **Opt-out**: Reply `STOP`
- **Help**: Reply `HELP`

### Sample message pattern

```text
New lead for All About Towing
Name: John Smith
Email: john@gmail.com
Phone: (337) 555-1234
Message: I need a tow truck at 123 Main St.
Reply to this lead ASAP for the best chance of closing.
```

---

## Why CTA Verification Is Difficult

The consent flow is inside an authenticated client portal, so a Twilio reviewer cannot click through the live opt-in experience directly.

To make the flow reviewable, we published a public explainer page that shows:

- What the SMS alerts are
- Who receives them
- How consent is collected
- The exact disclosure language
- A screenshot of the real unchecked checkbox UI
- Links to the related Terms and Privacy pages

Even with that public page in place, the campaign was rejected again for CTA verification.

---

## The Actual Opt-In Flow

### 1. Portal consent UI

- File: `app/portal/[projectId]/page.tsx`
- URL pattern: `acadianawebdesign.com/portal/[projectId]`
- Access: Authenticated

Inside the "Lead SMS Alerts" section, the client sees:

- A phone number input
- An **unchecked checkbox**
- Disclosure text
- Links to Terms and Privacy

The user cannot save a phone number unless they actively check the consent box.

### Exact disclosure text

> "I agree to receive SMS lead notifications from Acadiana Web Design at the phone number above. Message frequency varies based on lead volume. Msg & data rates may apply. Reply STOP to opt out. Reply HELP for support. Consent is not a condition of purchase. Terms & Privacy."

### 2. Public CTA documentation page

- URL: `https://acadianawebdesign.com/sms-consent`
- File: `app/sms-consent/page.tsx`

This page was created specifically so Twilio reviewers could verify the CTA without logging into the portal.

It includes:

- A plain-language explanation of the opt-in flow
- A screenshot of the real unchecked checkbox UI: `/sms-consent.png`
- The exact disclosure copy
- An example SMS message
- Opt-in, frequency, opt-out, and help details
- Links to Terms and Privacy

### 3. Terms and Privacy pages

- Terms: `https://acadianawebdesign.com/legal/terms`
- Terms SMS section: `https://acadianawebdesign.com/legal/terms#sms-lead-notifications`
- Privacy: `https://acadianawebdesign.com/legal/privacy`
- Privacy SMS section: `https://acadianawebdesign.com/legal/privacy#sms-notifications`

These pages explain:

- What the alerts are
- How consent is collected
- Message frequency and carrier rates
- `STOP` and `HELP`
- Twilio as the delivery provider
- No third-party sharing for third-party marketing

### 4. Backend enforcement

We do not rely on UI-only consent.

- `convex/projects.ts` rejects saving a phone number unless `smsConsentAccepted: true`
- Consent is stored with timestamp, disclosure version, and source
- `convex/leadTriage.ts` only sends SMS if both `notificationPhone` and `smsConsent` are present

---

## What Was Submitted To Twilio

### Campaign description

> This campaign sends real-time SMS notifications to subscribed business clients when a new lead is submitted through their website's contact form. Messages include the lead's name, email, phone number, and message. Only the subscribing business owner receives these notifications.

### CTA description

> Business owners opt in to SMS lead notifications through our client portal at acadianawebdesign.com. When a client enters their phone number in the "Lead SMS Alerts" field of their project dashboard, an unchecked checkbox is displayed with the following disclosure: "I agree to receive SMS lead notifications from Acadiana Web Design at the phone number above. Message frequency varies based on lead volume. Msg & data rates may apply. Reply STOP to opt out. Reply HELP for support. Consent is not a condition of purchase. Terms & Privacy." The client must actively check this box before the form can be saved. Consent is recorded server-side with a timestamp and disclosure version. The opt-in flow is documented publicly at acadianawebdesign.com/sms-consent with a screenshot of the consent checkbox and the exact disclosure language. Our privacy policy at acadianawebdesign.com/legal/privacy and terms at acadianawebdesign.com/legal/terms#sms-lead-notifications are linked directly from the consent checkbox.

### Submission details

- Privacy Policy URL: `https://acadianawebdesign.com/legal/privacy`
- Terms and Conditions URL: `https://acadianawebdesign.com/legal/terms`
- Embedded links in SMS: No
- Phone numbers in SMS: Yes
- Direct lending: No
- Age-gated content: No
- Opt-in keywords: None
- Opt-in message: None

---

## Rejection History

### Attempt 1

- Had Terms and Privacy pages with SMS language
- CTA described phone-number collection during onboarding
- Did **not** include a public CTA documentation page
- Result: Rejected for CTA verification

### Attempt 2

- Added `/sms-consent`
- Added an explicit unchecked checkbox in the portal UI
- Added backend consent enforcement
- Updated CTA description to reference the public consent page
- Result: Rejected again for CTA verification

### Attempt 3

- Added a screenshot of the actual unchecked checkbox UI to `/sms-consent`
- Confirmed the screenshot shows the disclosure and Terms/Privacy links
- Confirmed all pages were deployed and publicly accessible
- Result: Rejected again for CTA verification

---

## Public URLs Available For Review

| Page | URL |
|------|-----|
| SMS consent page | https://acadianawebdesign.com/sms-consent |
| Privacy Policy | https://acadianawebdesign.com/legal/privacy |
| Terms of Service | https://acadianawebdesign.com/legal/terms |
| Terms SMS section | https://acadianawebdesign.com/legal/terms#sms-lead-notifications |
| Privacy SMS section | https://acadianawebdesign.com/legal/privacy#sms-notifications |

---

## Most Likely Remaining Issue

The most likely problem is that the reviewer either:

- did not open the public CTA documentation page,
- expected the CTA proof to appear directly in one of the URL fields,
- or could not determine that the public screenshot accurately reflects the real authenticated opt-in flow.

In other words, the remaining issue may be **how the CTA is being reviewed**, not whether consent actually exists.

---

## What We Need Clarified

We need a specific answer to one question:

**What exact piece of CTA verification evidence is still missing?**

More specifically:

1. Is a public documentation page plus screenshot an acceptable way to verify a CTA that lives behind login?
2. Should the CTA documentation page be entered as the Terms or Privacy URL instead of only being described in the campaign text?
3. Does this use case fail review because it is under **Sole Proprietor**, even though the consent flow itself is compliant?
4. Does Twilio require a live, publicly interactive opt-in flow rather than a documented one?

---

## Recommended Next Move

Open a Twilio support ticket and send this case as a **manual review / clarification request** rather than resubmitting blindly.

The ask should be:

- confirm whether the CTA proof format is acceptable,
- identify the missing verification element,
- and advise whether this use case should be registered differently.

---

## Draft Support Ticket

### Subject

`Request for manual review: A2P 10DLC campaign repeatedly rejected for CTA verification (30909)`

### Message

Hello Twilio Support,

We are requesting manual review and clarification for an A2P 10DLC campaign that has now been rejected three times for CTA verification.

- Brand SID: `BN72fd03e3f4455ccd18161c1ca48aded5`
- Campaign SID: `CM8802a55afdfed35f11a0b5a4334e193a`
- Rejection code: `30909`

This campaign is for **Acadiana Web Design** and is used only to send SMS lead alerts to subscribed business clients when a new lead is submitted through their website.

The recipient is only the business owner who opted in. We do not send messages to consumers, website visitors, or third parties.

Our opt-in flow exists inside an authenticated client portal, so to make the CTA reviewable we created a public page that documents the exact consent flow:

- CTA documentation page: `https://acadianawebdesign.com/sms-consent`
- Privacy Policy: `https://acadianawebdesign.com/legal/privacy`
- Terms: `https://acadianawebdesign.com/legal/terms`
- Terms SMS section: `https://acadianawebdesign.com/legal/terms#sms-lead-notifications`

The public CTA documentation page includes:

- the exact disclosure language,
- a screenshot of the real unchecked checkbox UI,
- opt-in details,
- message frequency language,
- STOP and HELP instructions,
- and links to our Terms and Privacy pages.

In the actual product flow, a client cannot save a phone number for SMS lead alerts unless they actively check the consent box. We also enforce this server-side and store consent metadata.

Could you please clarify what exact CTA verification evidence is still missing?

Specifically, we would appreciate guidance on the following:

1. Is a public documentation page with a screenshot acceptable when the real opt-in flow is behind authentication?
2. Should the CTA documentation URL be submitted in one of the campaign URL fields instead of only in the CTA description?
3. Is this use case incompatible with the Sole Proprietor campaign type even if the consent flow is compliant?

We are happy to make changes, but the current rejection reason does not identify what reviewers still cannot verify. A manual review or specific guidance on the missing CTA element would help us correct the submission properly.

Thank you.

---

## Relevant Files

| File | Purpose |
|------|---------|
| `app/sms-consent/page.tsx` | Public CTA documentation page |
| `public/sms-consent.png` | Screenshot of the real consent UI |
| `app/legal/privacy/page.tsx` | Privacy Policy page |
| `lib/legal/privacy.ts` | Privacy content |
| `app/legal/terms/page.tsx` | Terms page |
| `lib/legal/terms.ts` | Terms content |
| `app/portal/[projectId]/page.tsx` | Authenticated portal opt-in UI |
| `convex/projects.ts` | Consent enforcement and storage |
| `convex/leadTriage.ts` | SMS gated on recorded consent |

