/**
 * Blog post data structure for SEO content marketing
 * Blog posts are stored as static data for now; can be migrated to CMS later
 */

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  publishedAt: string; // ISO date string
  updatedAt?: string;
  author: string;
  category: BlogCategory;
  tags: string[];
  readingTime: number; // minutes
  content: string; // Markdown content
}

export type BlogCategory =
  | "local-seo"
  | "web-design"
  | "business-tips"
  | "industry-guides"
  | "case-studies";

export const BLOG_CATEGORIES: Record<BlogCategory, { name: string; description: string }> = {
  "local-seo": {
    name: "Local SEO",
    description: "Tips and strategies for ranking in local search results",
  },
  "web-design": {
    name: "Web Design",
    description: "Best practices for effective small business websites",
  },
  "business-tips": {
    name: "Business Tips",
    description: "Advice for growing your local service business",
  },
  "industry-guides": {
    name: "Industry Guides",
    description: "Specific guidance for different trades and industries",
  },
  "case-studies": {
    name: "Case Studies",
    description: "Real results from real Acadiana businesses",
  },
};

/**
 * Initial blog posts for SEO content marketing
 * Add more posts here as you publish
 */
export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "why-lafayette-businesses-need-fast-websites",
    title: "Why Lafayette Businesses Need Fast Websites in 2026",
    description:
      "Learn why website speed matters for local businesses in Lafayette and how it impacts your Google rankings and customer conversions.",
    publishedAt: "2026-01-28",
    author: "Acadiana Web Design",
    category: "local-seo",
    tags: ["pagespeed", "seo", "lafayette", "performance"],
    readingTime: 5,
    content: `
# Why Lafayette Businesses Need Fast Websites in 2026

If you're running a local service business in Lafayette, your website speed might be costing you customers without you even knowing it.

## The 3-Second Rule

Studies show that 53% of mobile users abandon sites that take longer than 3 seconds to load. For a plumber or landscaper in Lafayette, that means potential customers are clicking the back button and calling your competitor instead.

## Google Cares About Speed

Since 2021, Google has used Core Web Vitals as a ranking factor. This means:

- **Slow sites rank lower** in local search results
- **Fast sites get more visibility** when someone searches "plumber near me"
- **Mobile speed matters most** because 70%+ of local searches happen on phones

## What "Fast" Actually Means

A fast website loads in under 2 seconds and scores 90+ on Google PageSpeed Insights. Here's what that looks like:

| Metric | Poor | Good |
|--------|------|------|
| Load Time | 4+ seconds | Under 2 seconds |
| PageSpeed Score | Under 50 | 90+ |
| Time to Interactive | 5+ seconds | Under 3 seconds |

## How We Build Fast Sites

At Acadiana Web Design, we hand-code every site in Next.js with:

- Optimized images that load instantly
- Clean code with no bloated plugins
- Edge hosting on Vercel's global network
- Mobile-first design from the ground up

The result? Sites that load in under a second and score 95+ on PageSpeed.

## The Bottom Line

In Lafayette's competitive local market, a slow website is losing you money. Every second of delay is a customer who called someone else.

Ready to see how fast your site could be? [Schedule a free 15-minute call](/onboarding) and we'll audit your current site's speed.
`,
  },
  {
    slug: "website-vs-facebook-page-acadiana-businesses",
    title: "Website vs Facebook Page: What's Best for Acadiana Service Companies?",
    description:
      "Should your Acadiana business rely on Facebook or invest in a website? Here's the honest breakdown for plumbers, landscapers, and contractors.",
    publishedAt: "2026-01-25",
    author: "Acadiana Web Design",
    category: "business-tips",
    tags: ["facebook", "website", "local-business", "acadiana"],
    readingTime: 6,
    content: `
# Website vs Facebook Page: What's Best for Acadiana Service Companies?

"I already have a Facebook page—do I really need a website?"

We hear this question a lot from plumbers, landscapers, and contractors across Acadiana. Here's the honest answer.

## When Facebook Is Enough

A Facebook business page works well if:

- You're just starting out and testing the waters
- All your customers come from word of mouth
- You only serve friends and family

## Why a Website Wins for Growth

But if you want to **grow** your business, here's why a website matters:

### 1. You Own It

Facebook can change their algorithm overnight. They can even suspend your page. Your website? That's yours forever.

### 2. Google Can't Find Your Facebook Page

When someone in Lafayette searches "plumber near me," Google shows websites—not Facebook pages. No website means you're invisible to searchers.

### 3. Trust Factor

48% of consumers say a business without a website seems less credible. When you're asking someone to let you into their home, trust matters.

### 4. Lead Capture

On Facebook, customers message you through Messenger—easy to miss, hard to track. A website with a contact form sends leads straight to your email or phone.

## The Best Approach: Both

Smart Acadiana businesses use Facebook AND a website:

- **Facebook**: Share updates, respond to comments, build community
- **Website**: Capture Google traffic, look professional, convert visitors to calls

## Real Example

One Lafayette landscaper came to us getting 2-3 calls per month from Facebook. After launching their website:

- Ranking #3 for "landscaper Lafayette LA"
- Getting 8-10 qualified leads per month
- 4x increase in booked jobs

## The Bottom Line

A Facebook page is a nice-to-have. A website is a must-have for any Acadiana service business that wants to grow.

[Schedule a free call](/onboarding) to see what a professional website can do for your business.
`,
  },
  {
    slug: "google-reviews-guide-local-businesses",
    title: "How to Get More Google Reviews for Your Lafayette Business",
    description:
      "A step-by-step guide for plumbers, landscapers, and contractors in Lafayette to get more 5-star Google reviews and dominate local search.",
    publishedAt: "2026-01-20",
    author: "Acadiana Web Design",
    category: "local-seo",
    tags: ["google-reviews", "local-seo", "lafayette", "reputation"],
    readingTime: 7,
    content: `
# How to Get More Google Reviews for Your Lafayette Business

Google reviews are the lifeblood of local service businesses in Lafayette. Here's how to get more of them.

## Why Reviews Matter

For plumbers, landscapers, and contractors:

- **93% of consumers** read reviews before hiring
- Businesses with 4+ stars get **significantly more clicks**
- Reviews directly impact your **Google Maps ranking**

## The Simple Ask Strategy

The #1 reason businesses don't have reviews? They don't ask. Here's a simple script:

> "Thanks for choosing us! If you were happy with the work, would you mind leaving us a quick Google review? It really helps other folks in [neighborhood] find us."

## Make It Easy

Don't make customers search for your listing. Create a direct review link:

1. Search for your business on Google
2. Click "Write a review"
3. Copy that URL
4. Use a URL shortener (like bit.ly)
5. Text or email it to customers after each job

## When to Ask

Timing matters:

- **Best**: Right after completing a job (while they're happy)
- **Good**: In a follow-up text the same day
- **Okay**: In an invoice or thank-you email

## What NOT to Do

Google's terms are clear:

- ❌ Don't offer incentives for reviews
- ❌ Don't write fake reviews
- ❌ Don't ask for only 5-star reviews
- ✅ DO ask every customer equally

## Responding to Reviews

Always respond to reviews—good and bad:

**Good review response:**
> "Thank you, [Name]! It was great working on your [project]. We appreciate you taking the time to share your experience!"

**Bad review response:**
> "We're sorry to hear this, [Name]. We'd like to make it right—please reach out to us at [phone] so we can address your concerns."

## Display Your Reviews

Once you have reviews, show them off! Your website should feature:

- Overall rating prominently displayed
- Selected review quotes
- Link to your Google profile

At Acadiana Web Design, we include a Google Reviews widget on every site we build.

## The 10-5-1 Goal

For most Lafayette service businesses, aim for:

- **10+ reviews**: Minimum to look established
- **5+ rating**: Ideally 4.7 or higher
- **1 new review**: Per week to show you're active

[Get a website that showcases your reviews](/onboarding) and helps you get more.
`,
  },
];

/**
 * Get a blog post by its slug
 */
export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

/**
 * Get all blog post slugs for static params generation
 */
export function getAllBlogSlugs(): string[] {
  return BLOG_POSTS.map((post) => post.slug);
}

/**
 * Get posts by category
 */
export function getPostsByCategory(category: BlogCategory): BlogPost[] {
  return BLOG_POSTS.filter((post) => post.category === category);
}

/**
 * Get recent posts
 */
export function getRecentPosts(limit: number = 5): BlogPost[] {
  return [...BLOG_POSTS]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, limit);
}
