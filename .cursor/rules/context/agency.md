### **The Agency Blueprint: Website-as-a-Service (WaaS) Edition**

**Document Version:** 2.0
**Last Updated:** October 19, 2025

#### **I. Business Positioning & Vision**

**Our Vision:** To be the default web partner for small, service-based businesses by offering a seamless, all-inclusive "Website-as-a-Service" (WaaS) that eliminates the friction, complexity, and high upfront costs typically associated with getting a professional online presence.

**Our Positioning:** We are not just a website builder; we are a client's personal web team. Our core product is **peace of mind**, delivered through a high-performance website and unlimited support. We sell a relationship, and the website is the tangible proof of our commitment.

---

#### **II. The Plan Catalog (The "One-Offer" Model)**

To maximize clarity and sales velocity, we will launch with a single, all-inclusive plan.

*   **Plan Name:** The All-Inclusive Plan
*   **Pricing:** **$0 Down, $199 per Month** (Requires a 12-month minimum service agreement)
*   **Headline:** Your Professional Website & Personal Web Team for One Simple Price.
*   **Promise:** We handle everything—from design and development to hosting, maintenance, and unlimited edits—so you can focus on running your business.
*   **Core Features:**
    *   **Custom-Designed Website:** A professionally designed, mobile-first website of up to 7 core pages (e.g., Home, About, Services, Reviews, Contact).
    *   **High-Performance Code:** Hand-coded using Next.js for elite page speeds (95+ on Google PageSpeed Insights), which is crucial for SEO and user experience.
    *   **Google Reviews Widget:** Automatically display your latest positive reviews to build trust.
    *   **Standard Contact Form:** With email notifications sent directly to you.
    *   **Managed Hosting & Security:** Hosted on Vercel's global network with an SSL certificate included.
    *   **Unlimited Edits & Support:** Need to change text, update photos, or add an event? Just email us. We are your on-call web team.
    *   **Domain Name Included:** We purchase and manage your custom domain name for as long as you're a client.
    *   **Monthly Analytics Report:** A simple, easy-to-understand report on your website's traffic.

---

#### **III. Marketing & Sales Strategy**

Our strategy is built on proactive, targeted outreach and establishing trust through authenticity.

*   **Target Audience:** Local, service-based businesses (e.g., painters, plumbers, electricians, landscapers, consultants) who have an outdated/poor website or no website at all, but have positive customer reviews.
*   **Lead Generation: Pre-Qualified Cold Calling**
    1.  **Identify a Market:** Choose a specific industry in a specific geographic area (e.g., "Landscapers in Austin, TX").
    2.  **Build a Lead List:** Use Google Maps and Yelp to find businesses.
    3.  **Qualify/Disqualify:**
        *   **Call:** Businesses with no site, a basic `.business.site` or GoDaddy builder site, or a site with poor page speed scores. They must have recent, positive reviews.
        *   **Do NOT Call:** Businesses already working with a marketing agency, those with a large, professional website, or those with consistently bad reviews or a poor attitude in their responses.
*   **The Sales Call: The "Authentic Consultant" Pitch**
    1.  **Humanizing Opener:** "Hi, is this [Business Name]? My name is [Your Name], I'm a local web developer... I found you on Google, saw your great reviews, and noticed a few things on your website I thought I could help with."
    2.  **Lead with the Low-Risk Offer:** When asked about cost, immediately present the "$0 Down, $199/month" model. This disarms them and generates curiosity.
    3.  **Educate, Don't "Sell":** When asked "Why are you better?", explain the tangible value in simple terms:
        *   "I custom-code every site, which is why they load instantly. Google heavily favors fast mobile sites, and my sites score near-perfectly, helping you rank higher over time than competitors using slow builders."
        *   "It's more than just a site; it's a service. You get me as your personal point of contact. Need an edit? Just call or email. I handle it so you don't have to."
    4.  **Let Them Lead:** Frame it as a conversation. Answer their questions honestly. Your goal is to be a helpful expert, not a pushy salesperson.

---

#### **IV. The "Golden Path": End-to-End Client Journey & Application Flow**

This is the precise, automated flow from first contact to live website.

1.  **First Contact (Two Entry Points):**
    *   **Inbound:** A prospect fills out the onboarding form on the website, which generates an `onboarding_session`. The final step prompts them to schedule the "15-Min Confirmation Call."
    *   **Outbound:** You conduct a cold call. If they are interested, you use your Admin Dashboard to create an `onboarding_session` for them while on the phone, unifying the data model.

2.  **The 15-Min Confirmation Call:** The goal is to build rapport, review the project scope, confirm they are a good fit, and get a verbal "Yes." End the call with, "Great, I'm sending over the service agreement for you to e-sign right now."

3.  **The Service Agreement (E-Signature):** Using your Admin Dashboard, you trigger a templated email that sends a unique DocuSign/Adobe Sign link to the client. This is a mandatory step before any payment.

4.  **Stripe Payment & Project Creation (The Core Automation):**
    *   Upon contract signature, you (or a future automated trigger) send a "Welcome Aboard" email containing a Stripe Payment Link.
    *   This link includes the `sessionId` as a `client_reference_id`.
    *   The client pays the first $199.
    *   The Stripe Webhook fires. This is the **Master Conductor.**

5.  **The Welcome Email & Auth Flow:**
    *   The webhook creates the `project` record in the database.
    *   It immediately calls `better-auth`'s `signInMagicLink` function, embedding the new `projectId` into the `newUserCallbackURL`.
    *   The client receives **one single email** containing the secure magic link to access their portal.

6.  **Account Creation & Portal Access:**
    *   Client clicks the magic link.
    *   `better-auth` creates the `user` record and redirects them to a special `/portal/welcome` route.
    *   This route invisibly links the `userId` to the `projectId` in the database.
    *   The client is then instantly redirected to their main `/portal` dashboard, fully logged in.

7.  **Inside the Client Portal:** The first thing the client sees is a clear call-to-action to:
    *   **Schedule the 45-Min Project Kickoff Call.**
    *   **Complete the Brand Asset Upload Form.**

8.  **The 45-Min Kickoff Call:** This is the deep dive. You discuss their brand, target audience, content, and review the assets they've uploaded.

9.  **Build & Review:** You build the site. You then schedule a "30-Min Review Call" where you present the completed site on a Vercel staging URL.

10. **Go Live:** After final approval, you connect their custom domain and launch the site.

---

#### **V. Application Architecture & Data Model**

*   **Tech Stack:** Next.js, Vercel, Stripe (Subscriptions & Invoicing), `better-auth` (Magic Links), Resend (Transactional Emails), a SQL/NoSQL Database (e.g., Convex, Supabase).
*   **Database Tables:**
    *   **`onboarding_sessions`** – Canonical record for every lead.
        *   Identifiers: `sessionId` (PK), `resumeToken`, `createdAt`, `updatedAt`.
        *   Lifecycle: `status` (`pending_call` | `pending_contract` | `pending_payment` | `complete` | `archived`), `leadSource`, `assignedRep`.
        *   `brief`: trimmed intake (`contactName`, `contactEmail`, `companyName`, `phone`, `businessDescription`, `currentWebsite`, optional `notes`).
        *   `plan`: stored AI proposal + selected tier snapshot to keep pricing aligned when the project is created.
        *   `contract`: DocuSign metadata (`envelopeId`, `sentAt`, `status`, `completedAt`, `documentUrl`).
        *   `payment`: Stripe handoff data (`paymentLinkId`, `clientReferenceId`, `lastEmailSentAt`).
        *   `scheduling`: latest confirmation-call booking (`calBookingId`, `startTime`, `endTime`, `status`).
        *   Indexes on `sessionId`, `resumeToken`, `brief.contactEmail`, `status`.
    *   **`projects`** – Active client accounts linked to authenticated users.
        *   Identifiers: `projectId` (slug, PK), `sessionId` (FK), `authUserId` (FK to `users`), `createdAt`.
        *   `projectStatus`: (`awaiting_assets` | `in_progress` | `in_review` | `live` | `paused` | `archived`) with optional `statusReason` and timestamps.
        *   `briefSnapshot`: immutable copy of the onboarding brief and tier at time of creation.
        *   `postPay`: structure for kick-off tasks (`brand` { `styleVibe`, `logoUrl`, `palette` }, `copy`, `inspirationLinks`, `functionalRequirements`, upload metadata).
        *   `deployment`: environment info (`stagingUrl`, `liveUrl`, `vercelProjectId`, `domainStatus`).
        *   `team`: array of secondary contacts (`name`, `email`, `role`, `invitedAt`, `authUserId?`).
        *   Indexes on `authUserId`, `sessionId`, `projectStatus`.
    *   **`subscriptions`** – Stripe contract tracking (1:1 with projects).
        *   `subscriptionId` (PK), `projectId` (FK), `customerId`, `priceId`, `status`, `currentPeriodStart`, `currentPeriodEnd`, `cancelAt`, `latestInvoiceId`.
        *   Store unpaid invoices and charge attempts for churn automation.
    *   **`scheduled_calls`** – Unified calendar view from Cal.com webhooks.
        *   `callId` (PK), `externalId` (Cal booking ID), `projectId?`, `sessionId?`, `type` (`confirmation` | `kickoff` | `review` | `support`), `startTime`, `endTime`, `status`, `location`, raw attendee metadata.
        *   Reschedule/cancel events update the same row for auditability.
    *   **`activity_log`** – Immutable event stream for analytics and support.
        *   `logId`, `projectId?`, `sessionId?`, `actor` (`system` | `user` | `admin`), `kind` (`contract.sent`, `contract.completed`, `payment.succeeded`, `call.booked`, `portal.asset_submitted`, etc.), `payload` JSON, `createdAt`.
        *   Drives portal timelines, admin dashboards, and dispute resolution.
    *   **`support_requests`** *(future enhancement)* – Tracks unlimited edit requests or tickets once clients are live. Fields: `requestId`, `projectId`, `submittedBy`, `category`, `description`, `status`, `resolutionNotes`.
    *   **`users`** – Managed by `better-auth`; mirror `id`, `email`, `name`, `role`, `createdAt`, plus link to the current `projectId` when applicable.

*   **Data Captured (Updated):**
    *   **Onboarding Form (Pre-Call):** Keep it lean (contact basics, company, high-level description, current site). Align with `onboarding_sessions.brief` shape for autosave.
    *   **Contract Stage:** DocuSign envelope metadata and call scheduling status ensure the admin can nudge prospects without leaving the dashboard.
    *   **Payment Stage:** Stripe payment-link status, last emailed timestamp, and webhook receipts live in `onboarding_sessions.payment` until the project is created.
    *   **Post-Pay Asset Form (In Portal):** Detailed brand assets, copy blocks, and functional requirements hydrate `projects.postPay` and generate `activity_log` entries when clients complete tasks.
    *   **Lifecycle & Support:** `scheduled_calls`, `subscriptions`, and `support_requests` keep the long-term relationship visible, informing renewal, upsell, and service SLAs.

*   **Core Automation Logic:** The `/api/stripe-webhook` endpoint is the heart of the application. It orchestrates subscription updates, project creation, and `better-auth` magic links; Cal.com and DocuSign webhooks feed `scheduled_calls` and `activity_log`, giving ops a single source of truth for every client milestone.