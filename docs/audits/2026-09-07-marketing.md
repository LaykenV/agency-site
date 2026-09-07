# September 7, 2026 website audit

Status: SEO changes deployed; quote activation and delivery proof pending.
SEO/rendering changes are in PR #6. Quote intake is a separate dependent change.
The owner confirmed the three existing homepage client-result claims are accurate;
this audit retained them and did not create new client evidence or rating schema.

## Implemented

- Descriptive Lafayette web-design title and heading, consistent service-area
  entities, accurate canonical URLs, real sitemap update dates, and crawlable FAQs.
- Public marketing prerendering without authentication requests; protected layouts
  retain prefetched auth and noindex. Audit/concept routes retain their runtime.
- Visible initial content, responsive prebuilt hero images, fewer font preloads,
  accessible mobile navigation, contrast, list markup, and legal-page landmarks.
- Shared on-site quote form across marketing templates and `/quote`; public Cal.com
  CTAs and retired onboarding redirect now lead to the form. Existing client
  scheduling remains available in the portal.
- Bounded server validation, spam controls, authenticated Hub v2 delivery, atomic
  lead storage and scheduling, and request IDs preventing duplicate notification
  jobs. Failed submissions retain all entries; successful ones show confirmation.
- Admin-authenticated recipient setup records explicit owner SMS consent and keeps the
  notification phone and server credential out of public code and repository docs.
- Next.js 15.5.25 and matching lint config, removing the installed Next.js advisory
  findings before adding the public Server Action.

## Evidence and limits

`bun run verify` passes: 367 tests, TypeScript, lint, and production build.
The new tests cover malformed submissions, service failures, retry idempotency,
project isolation, anonymous inbox denial, consent, and repeatable recipient setup.
Convex codegen and deployment pass against the development deployment. A paused
synthetic development lead returns the same ID on retry with no notification job.
These checks do not prove delivery through Resend or Twilio.

A local crawl checked all 152 sitemap URLs: all returned 200, their own canonical,
a description, and one H1; their JSON-LD parsed successfully. Browser audits found
no axe violations or horizontal overflow on representative home, city, industry,
city/industry, quote, blog, legal, and SMS-consent routes. Home was checked at
320, 375, 414, 768, and 1440 pixels. Native FAQs work with JavaScript disabled.
Form browser checks verify retained entries, error focus, phone fallback, and
success UI using a locally mocked acceptance response. No live test quote was sent.

| Mobile Lighthouse | Live baseline | Final local build |
| --- | ---: | ---: |
| Performance | 90 | 91 |
| Accessibility | 88 | 100 |
| Best practices | 100 | 100 |
| SEO | 100 | 100 |
| Simulated LCP | 3.4 s | 3.4 s |
| Total blocking time | 40 ms | 0 ms |
| Layout shift | 0 | 0 |

These are lab runs on different delivery environments, not a controlled claim of
production improvement or field Core Web Vitals. Intermediate local runs ranged
from 71 to 90 while fixes and cold-image behavior were investigated. The final
run removes auth network traffic on marketing pages and cold hero transformations;
live remeasurement remains required. AEO work improves readable answers and entity
consistency; no search or AI-engine inclusion/ranking is guaranteed. Search Console,
Business Profile performance, conversion attribution, and field data were not
available for this audit.

The dependency audit still flags other packages, including Better Auth and build
transitives. This is not a security clearance. The published passwordless
pre-account-hijacking advisory also requires password signup, which this app disables;
that finding alone is not proof of an exploitable takeover here. The auth stack's
separate dependency update and IPv6 rate-limiter advisory need dedicated follow-up.

## Activation gate

Production Resend and Twilio variables already exist. The AWD recipient and its
Vercel form credentials are not yet configured. The owner selected
`layken@acadianawebdesign.com` and explicitly consented to quote-alert texts at the
private number ending in 2973. DNS advertises an inbound mail service, but DNS does
not establish mailbox delivery or push notifications. No extra notification
provider is needed for the implementation; delivery still needs a labeled canary.

Follow `docs/OPERATIONS.md`: deploy reviewed backend, configure recipient as the
admin, securely install the one-time secret and production HTTP origin in Vercel,
then deploy the frontend. Confirm exact release status, production smoke, signed-in
admin/portal routes, one stored quote, triage decision, one email, one consented SMS,
and the configured GA4 conversion event. Check spam and provider-error behavior.
Do not call this live until those checks complete.

## References

- [Google guidance for AI features](https://developers.google.com/search/docs/appearance/ai-features)
- [Next.js Server Action advisory](https://github.com/vercel/next.js/security/advisories/GHSA-m99w-x7hq-7vfj)
- [Better Auth advisory and prerequisites](https://github.com/better-auth/better-auth/security/advisories/GHSA-qq9h-g4jm-xgf3)
