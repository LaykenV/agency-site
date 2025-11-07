Landing Page Copy (Acadiana, Plainspoken)

Mapping notes
- This doc maps 1:1 to existing sections in `app/page.tsx` and children.
- Keep current links and UTM params; only change visible labels where noted.
- Voice: plainspoken/tradesman, short sentences, outcome-first. Localize naturally to “Acadiana”.

1) Hero (app/page.tsx: #hero)
- H1 (current): "A 5‑Star Website for Your Business in Acadiana"
- Subhead (current): "Done‑for‑you website and hosting. Unlimited edit requests via the client portal. Built to bring in calls."
- Proof bullets (beneath rating line; current implementation)
  - "$199/mo • $0 down"
  - "72‑hour go‑live from build"
  - "Unlimited edit requests via the client portal"
- Plan heading: "All‑inclusive plan"
- CTA labels (current)
  - Primary (solid): "Start Onboarding" → `/onboarding?utm_source=lp&cta=hero`
  - Secondary (outline): "Schedule Call" → `ONBOARDING_CAL_LINK`
- Icon trio labels (current)
  - "Tell us your vision" — Schedule a call and do a deep dive on your business, brand, and goals.
  - "We Build Your Website" — Our team designs and develops a custom, high-performance website that's built to convert.
  - "Launch and Grow" — We handle the launch, hosting, and all future updates, so you can enjoy a worry-free online presence.

2) Trust & Reviews (app/page.tsx: #trust, components/ReviewsScroller.tsx)
- Section header
  - Trusted by local pros across Acadiana
- Pill labels (keep current categories)
  - Plumbing • Landscaping • Painting • Home Services
- Review scaffold (current implementation in REVIEWS array)
  - "They launched in 3 days and updates are a portal request away."
    - Name: Alex R.
    - Role: Service Owner in Acadiana
    - Rating: 5
    - Site: landscaping example
  - "Fast, professional build. Our phone calls picked up immediately."
    - Name: Maya P.
    - Role: Plumbing Services in Acadiana
    - Rating: 5
    - Site: plumbing example
  - "We submit changes in the portal and they ship the same day. Couldn't be easier."
    - Name: Jordan K.
    - Role: Home Renovation in Acadiana
    - Rating: 5
    - Site: renovation example
- Credibility nudges (small text under scroller if desired)
  - Built on modern best practices • Pages load fast on mobile • Real support by email

3) How it works (components/our-plan/HowItWorks.tsx)
- Step titles and one‑liners (current implementation)
  - Step 1: "Talk for 15 Minutes"
    - "Tell us your goals. We'll map pages and style, fast."
  - Step 2: "We Build Your Website"
    - "Hand‑coded, mobile‑first, and tuned for speed. You review before launch."
  - Step 3: "Launch and Grow"
    - "We host it, manage the domain, and handle edit requests in the client portal anytime."

4) Plan inclusions (app/page.tsx: What you get)
- Group titles (current): Build & Performance; Hosting & Domain; Conversion; Support & Insights
- Bullets (current implementation)
  - Build & Performance
    - Custom 7‑page website
    - Elite performance
  - Hosting & Domain
    - Managed hosting + SSL
    - Domain included & managed
  - Conversion
    - Google Reviews widget
    - Contact form + email alerts
  - Support & Insights
    - Unlimited edit requests (mobile: "via the client portal")
    - Monthly analytics summary

5) Performance proof (app/page.tsx: #plan-performance)
- Gauge: Shows 95% performance with animated counter
- Stat pills (current)
  - Before: 3.9s
  - After: 0.9s
- Value bullets (current)
  - "Google favors quick, mobile‑first sites"
  - "Fewer bounces, more calls and form fills"
  - "Built with modern best practices"

6) Comparison (table/cards)
- Section header
  - Our Plan vs Traditional
- Row label clarity (use concise, benefit‑first phrasing)
  - Price → Price
  - Timeline to live → Timeline to live
  - Hosting & SSL → Hosting & SSL
  - Domain → Domain
  - Unlimited edits → Unlimited edits
  - PageSpeed target → PageSpeed target
  - Reviews widget → Reviews widget
  - Analytics → Analytics
  - Support → Support
  - Contract term → Contract term
- Row copy (current implementation)
  - Our Plan
    - $199/mo • $0 down
    - 72 hours from build
    - Included
    - Included & managed
    - Yes — via client portal
    - 95+
    - Included
    - Monthly summary
    - Email support, same‑day
    - 12‑month minimum
  - Traditional Agency
    - $3–5k+ upfront + retainers
    - 4–8 weeks
    - Billed separately
    - Bring your own
    - Typically billed hourly
    - Varies (often 60–80)
    - Often extra
    - DIY
    - Ticket queues
    - Project‑based/retainer

7) FAQs (app/page.tsx: #faqs, components/faq/FaqItem.tsx)
- Q: What does "unlimited edits" include?
  - A: Reasonable updates like text, photos, hours, banners, sections, and small layout tweaks. Submit requests in the client portal anytime. Bigger redesigns get a simple scope and quote.
- Q: How fast can we launch?
  - A: Once we start the build, we aim to go live within 72 hours. Kickoff happens after we collect assets.
- Q: Do I keep my domain?
  - A: We include and manage your domain while subscribed. After the 12‑month minimum and if your account is in good standing, we can transfer per the Terms.
- Q: Who owns the website?
  - A: You own your original content (copy, images, logo). We license the implementation during the term. Details are in the Terms.
- Q: How do I cancel?
  - A: Email support. During months 1–12, the early termination policy applies. After 12 months, cancel any month before renewal.

8) Final CTA (app/page.tsx: final CTA card)
- Headline (current): "Launch Your 5‑Star Website"
- Pills (current)
  - "72‑hour go‑live"
  - "Unlimited edits"
  - "$0 down"
  - "Managed hosting + SSL"
- Subhead (current): "Everything you need to launch and grow—managed hosting, SSL, and domain included. Built for local pros in Acadiana with same‑day email support."
- Fine print (current): "$199/mo • 12‑month minimum. Renews monthly thereafter until canceled. Early termination policy applies. See Terms."
- CTAs (current)
  - Primary: "Start Onboarding" → `/onboarding?utm_source=lp&cta=final`
  - Secondary: "Schedule Call" → `ONBOARDING_CAL_LINK`

9) Floating CTA Tray (components/FloatingCtaTray.tsx)
- Current implementation: Logo icon expands to reveal two CTAs
  - "Schedule Call" → `ONBOARDING_CAL_LINK`
  - "Start Onboarding" → `/onboarding?utm_source=fab&cta=fab_tray`
- Behavior: Appears when hero CTAs scroll out of viewport, uses IntersectionObserver
- Animation: Morphs from circular button to horizontal bar with spring animation

10) Footer (app/page.tsx: footer)
- Copyright (current): "© {YEAR} Acadiana Web Design"
- Badges (current)
  - "Vet Owned"
  - "Serving Acadiana"
  - "Local Developer"
- Link (current): "Terms" → `/legal/terms`

11) Accessibility: Alt text suggestions
- Hero device mockups: Decorative — keep aria-hidden as is.
- Icon 1 (“Tell us your vision”):
  - Alt: Phone consultation icon
- Icon 2 (“We Build Your Website”):
  - Alt: Desktop and mobile website icon
- Icon 3 (“Launch and Grow”):
  - Alt: Wrench and gear icon for launch and updates
- Placeholder site images (landscaping, plumbing, renovation):
  - Landscaping: Example landscaping website homepage
  - Plumbing: Example plumbing services website homepage
  - Renovation: Example home renovation website homepage

12) SEO suggestions (for app/layout.tsx)
- Title
  - Websites for Local Service Companies in Acadiana | $0 Down, $199/mo
- Meta description (≤160 chars)
  - Get a fast, done‑for‑you website in Acadiana. $0 down, $199/mo. 72‑hour go‑live, managed hosting, domain included, and unlimited edits by email.

13) Microcopy guardrails (use selectively)
- “Plain‑English pricing. No hidden fees.”
- “We handle tech. You handle the work.”
- “Email us edits anytime. We’ll ship same‑day when possible.”

14) Editor’s map (quick paste targets)
- `app/page.tsx`
  - H1: pick one “Hero H1 option”
  - Subhead: pick one “Hero Subhead option”
  - Trust header: “Trusted by local pros across Acadiana”
  - Benefits/pills: keep categories; optional short credibility line
  - Inclusions: use tightened bullets above
  - Performance: use value framing lines
  - Comparison: keep structure; prefer shorter labels
  - FAQs: replace Q/As with updated copy
  - Final CTA: headline, subhead, microcopy + CTA labels above
- `components/our-plan/HowItWorks.tsx`
  - Step titles and one‑liners
- `components/ReviewsScroller.tsx`
  - Use review scaffold for future additions
- `components/FloatingCtaTray.tsx`
  - Use short prompts above


