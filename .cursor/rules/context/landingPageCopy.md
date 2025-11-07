Landing Page Copy (Acadiana, Plainspoken)

Mapping notes
- This doc maps 1:1 to existing sections in `app/page.tsx` and children.
- Keep current links and UTM params; only change visible labels where noted.
- Voice: plainspoken/tradesman, short sentences, outcome-first. Localize naturally to “Acadiana”.

1) Hero (app/page.tsx: #hero)
- H1 options (pick one)
  - Your Website, Live in 72 Hours — $0 Down, $199/mo (Acadiana)
  - A 5‑Star Website for Your Business in Acadiana
  - Get More Calls from a Faster Site. We Build It for You.
- Subhead options
  - We hand‑build and host your site here in Acadiana. Fast load times. Real support. No big upfront bill.
  - Done‑for‑you website and hosting. Unlimited edits by email. Built to bring in calls.
  - Local team. Fast builds. Plain pricing. Focus on the work—you’ll have us on call.
- Proof bullets (beneath rating line; tighten as needed)
  - 72‑hour go‑live from build
  - Unlimited edits by email
  - Managed hosting + SSL
  - Domain included & managed
- CTA labels (keep hrefs; change labels only)
  - Primary (solid): Start Onboarding
    - Microcopy (small, near CTA): Takes 2 minutes. No upfront payment.
  - Secondary (outline): Schedule 15‑min Call
    - Microcopy (small, near CTA): Friendly walkthrough. No pressure.

2) Trust & Reviews (app/page.tsx: #trust, components/ReviewsScroller.tsx)
- Section header
  - Trusted by local pros across Acadiana
- Pill labels (keep current categories)
  - Plumbing • Landscaping • Painting • Home Services
- Review scaffold (for new quotes)
  - “They built it fast. Calls picked up right away.”
    - Name: First L.
    - Role: Service Owner in Acadiana
  - “Edits are an email away. Super easy to work with.”
    - Name: Maria R.
    - Role: Home Services
  - “Site loads quick on phones. More form fills.”
    - Name: James K.
    - Role: Painting
- Credibility nudges (small text under scroller if desired)
  - Built on modern best practices • Pages load fast on mobile • Real support by email

3) How it works (components/our-plan/HowItWorks.tsx)
- Step titles and one‑liners
  - Step 1: Talk for 15 Minutes
    - Tell us your business goals. We’ll map your pages and style, fast.
  - Step 2: We Build Your Website
    - Hand‑coded, mobile‑first, and tuned for speed. You review before launch.
  - Step 3: Launch and Grow
    - We host it, manage the domain, and handle edits by email anytime.

4) Plan inclusions (app/page.tsx: What you get)
- Group titles (unchanged): Build & Performance; Hosting & Domain; Conversion; Support & Insights
- Bullets (tightened; keep exactly what you offer)
  - Build & Performance
    - Custom 7‑page website
    - Elite performance (aim 95+ PageSpeed)
  - Hosting & Domain
    - Managed hosting + SSL
    - Domain included & managed
  - Conversion
    - Google Reviews widget
    - Contact form + email alerts
  - Support & Insights
    - Unlimited edits via email
    - Monthly analytics summary

5) Performance proof (app/page.tsx: #plan-performance)
- Caption ideas (small text near gauge)
  - Fast pages mean more calls and form fills.
  - Google favors quick, mobile‑first sites.
- “Before/After” value framing (list near stat pills)
  - Fewer bounces from slow loads
  - More calls and form fills
  - Built with modern best practices

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
- Row copy (tightened; keep existing cells but prefer shorter phrasing)
  - Our Plan
    - $199/mo • $0 down
    - 72 hours from build
    - Included
    - Included & managed
    - Yes — via email
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
- Q: What does “unlimited edits” include?
  - A: Reasonable updates like text, photos, hours, banners, sections, and small layout tweaks. Just email us anytime. Bigger redesigns get a simple scope and quote.
- Q: How fast can we launch?
  - A: Once we start the build, we aim to go live within 72 hours. Kickoff happens after we collect assets.
- Q: Do I keep my domain?
  - A: We include and manage your domain while subscribed. After the 12‑month minimum and if your account is in good standing, we can transfer per the Terms.
- Q: Who owns the website?
  - A: You own your original content (copy, images, logo). We license the implementation during the term. Details are in the Terms.
- Q: How do I cancel?
  - A: Email support. During months 1–12, the early termination policy applies. After 12 months, cancel any month before renewal.

8) Final CTA (app/page.tsx: final CTA card)
- Headline options
  - Launch Your 5‑Star Website in Acadiana
  - Go Live Fast. We’ll Handle the Rest.
- Subhead (keep price and terms clear)
  - $0 down • $199/mo • Unlimited edits • 72‑hour go‑live from build
  - 12‑month minimum. Renews monthly until canceled. See Terms.
- CTAs (keep hrefs; change labels only)
  - Primary: Start Onboarding
  - Secondary: Schedule 15‑min Call
  - Microcopy: Takes 2 minutes. No upfront payment.

9) Floating CTA Tray (components/FloatingCtaTray.tsx)
- Short prompts (rotate or pick one)
  - Ready to move fast? Start onboarding — 2 minutes.
  - Got questions? Book a 15‑min call.
  - $0 down. Go live in days, not weeks.

10) Footer (app/page.tsx: footer)
- Copy line (keep brand tokenized if desired)
  - © {YEAR} Your Agency • Built for local pros in Acadiana
  - Link: Terms

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


