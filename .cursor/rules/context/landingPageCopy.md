Landing Page Copy (Acadiana, Plainspoken)

Mapping notes
- This doc maps 1:1 to existing sections in `app/page.tsx` and children.
- Keep current links and UTM params; only change visible labels where noted.
- Voice: plainspoken, short sentences, outcome-first. Localize naturally to "Acadiana".
- No em dashes. Use regular hyphens only.

1) Hero (app/page.tsx: #hero)
- H1: "More Calls. Less Hassle. One Simple Price."
- Subhead: "We build, host, and manage your website for one flat monthly fee. $0 upfront. Live in 72 hours. Unlimited changes included."
- Proof bullets (beneath rating line)
  - "$199/mo, nothing upfront"
  - "Live in 72 hours"
  - "Unlimited changes, no extra charge"
- Plan heading: "One plan. Everything included."
- CTA
  - Centered CTA: "Schedule 15-Min Call" → `ONBOARDING_CAL_LINK`
- Hero image
  - Single image `/heroimg.png` rendered inside the hero card (`aspect-[16/9]` at all breakpoints). Alt: "Website preview" (or empty alt if purely decorative).
- Visibility behavior
  - Mobile (<md): Rating line, plan heading, and bullets reveal after the card float-in completes.
  - md+ (≥768px): Rating line, plan heading, and bullets wait until they are scrolled into view.

2) Trust & Reviews (app/page.tsx: #trust, components/ReviewsScroller.tsx)
- Section header
  - Trusted by local businesses across Acadiana
- Pill labels (keep current categories)
  - Plumbing, Landscaping, Painting, Home Services
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
- Credibility nudges (small text under scroller)
  - Built the right way. Loads fast on any phone. Same-day support.

3) How it works (components/our-plan/HowItWorks.tsx)
- Step titles and one-liners
  - Step 1: "Quick Call, Real Plan"
    - "Tell us about your business. We'll show you exactly what your site will look like."
  - Step 2: "We Build It, You Approve It"
    - "Custom site designed around your business. Loads fast on any phone. You see it before it goes live."
  - Step 3: "Launch and Forget the Tech"
    - "We handle hosting, security, and your domain. Need changes? Submit a request through your portal."

4) Plan inclusions (app/page.tsx: What you get)
- Group titles: Build & Performance; Hosting & Domain; Conversion; Support & Insights
- Bullets
  - Build & Performance
    - 7-page site built around your services
    - Loads in under a second on any phone
  - Hosting & Domain
    - Always online, always secure
    - Your own .com, registered and managed
  - Conversion
    - Show off your 5-star reviews automatically
    - Leads go straight to your inbox
  - Support & Insights
    - Unlimited changes through your portal
    - Monthly traffic summary delivered to you

5) Performance proof (app/page.tsx: #plan-performance)
- Gauge: Shows 95% performance with animated counter
- Stat pills
  - Before: 3.9s
  - After: 0.9s
- Value bullets
  - "Fast sites rank higher on Google"
  - "Customers don't wait. Slow sites lose calls."
  - "Built the right way, works on every device"

6) Comparison (table/cards)
- Section header
  - Our Plan vs Traditional
- Row copy
  - Our Plan
    - $199/mo, $0 down
    - 72 hours from build
    - Included
    - Included & managed
    - Yes, through your portal
    - 95+
    - Included
    - Monthly summary
    - Same-day responses
    - 12-month minimum
  - Traditional Agency
    - $3-5k+ upfront + retainers
    - 4-8 weeks
    - Billed separately
    - Bring your own
    - $75-150/hour for every change
    - Varies (often 60-80)
    - Often extra
    - DIY
    - Submit a ticket, wait days
    - Project-based/retainer

7) FAQs (app/page.tsx: #faqs, components/faq/FaqItem.tsx)
- Q: What does "unlimited edits" include?
  - A: Swap a photo, fix a typo, add a new service, change your hours. Submit requests through your portal anytime. If you want a full redesign, we'll give you a simple quote. No nickel-and-diming.
- Q: How fast can we launch?
  - A: After our kickoff call, most sites go live in 72 hours. Send us your logo and photos, and we move fast.
- Q: Do I keep my domain?
  - A: We register and manage your domain while you're subscribed. After the 12-month minimum and if your account is in good standing, we can transfer it to you per the Terms.
- Q: Who owns the website?
  - A: You own your content: your copy, your images, your logo. We license the design and code during your subscription. Details are in the Terms.
- Q: How do I cancel?
  - A: Reach out to support. During months 1-12, the early termination policy applies. After 12 months, cancel any month before renewal.

8) Final CTA (app/page.tsx: final CTA card)
- Headline: "Ready to Get Started?"
- Pills
  - "Live in 72 hours"
  - "Unlimited changes"
  - "$0 upfront"
  - "Hosting included"
- Subhead: "One flat price. No tech headaches. Just a website that makes your business look as good as it really is."
- Fine print: "$199/mo. 12-month minimum. Renews monthly until canceled. See Terms."
- CTA (single button)
  - "Book a Free Call" → `ONBOARDING_CAL_LINK`

9) Floating CTA Tray (components/FloatingCtaTray.tsx)
- Current implementation: Logo icon expands to reveal two CTAs
  - "Schedule Call" → `ONBOARDING_CAL_LINK`
  - "Start Onboarding" → `/onboarding?utm_source=fab&cta=fab_tray`
- Behavior: Appears when hero CTAs scroll out of viewport, uses IntersectionObserver
- Animation: Morphs from circular button to horizontal bar with spring animation

10) Footer (app/page.tsx: footer)
- Copyright: "© {YEAR} Acadiana Web Design"
- Badges
  - "Vet Owned"
  - "Serving Acadiana"
  - "Local Developer"
- Link: "Terms" → `/legal/terms`

11) Accessibility: Alt text suggestions
- Hero image inside hero card:
  - Alt: "Website preview" (or `alt=""` if purely decorative)
- Hero device mockups: Decorative - keep aria-hidden as is.
- Placeholder site images (landscaping, plumbing, renovation):
  - Landscaping: Example landscaping website homepage
  - Plumbing: Example plumbing services website homepage
  - Renovation: Example home renovation website homepage

12) SEO suggestions (for app/layout.tsx)
- Title
  - Websites for Local Service Companies in Acadiana | $0 Down, $199/mo
- Meta description (≤160 chars)
  - Get a fast, done-for-you website in Acadiana. $0 down, $199/mo. 72-hour go-live, managed hosting, domain included, and unlimited changes.

13) Microcopy guardrails (use selectively)
- "Plain-English pricing. No hidden fees."
- "We handle tech. You handle the work."
- "Submit changes through your portal. We'll ship same-day when possible."

14) Editor's map (quick paste targets)
- `app/page.tsx`
  - H1: "More Calls. Less Hassle. One Simple Price."
  - Subhead: current version
  - Trust header: "Trusted by local businesses across Acadiana"
  - Benefits/pills: keep categories; optional short credibility line
  - Inclusions: use tightened bullets above
  - Performance: use value framing lines
  - Comparison: keep structure; prefer shorter labels
  - FAQs: replace Q/As with updated copy
  - Final CTA: headline, subhead, microcopy + single CTA button
- `components/our-plan/HowItWorks.tsx`
  - Step titles and one-liners
- `components/ReviewsScroller.tsx`
  - Use review scaffold for future additions
- `components/FloatingCtaTray.tsx`
  - Use short prompts above
