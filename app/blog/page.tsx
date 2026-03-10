import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { BLOG_POSTS, BLOG_CATEGORIES, type BlogCategory } from "@/lib/seo/blog";
import { SectionHeader } from "@/components/SectionHeader";

// Setup Base URL
const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  ? `https://${process.env.NEXT_PUBLIC_APP_URL}`
  : process.env.SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  title: "Blog | Web Design Tips for Local Businesses",
  description:
    "Expert tips on web design, local SEO, and growing your service business in Acadiana. Practical advice for plumbers, landscapers, and contractors.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Blog | Acadiana Web Design",
    description:
      "Expert tips on web design, local SEO, and growing your service business in Acadiana.",
    url: `${baseUrl}/blog`,
    type: "website",
  },
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogPage() {
  // Sort posts by date (newest first)
  const sortedPosts = [...BLOG_POSTS].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  // Group posts by category for display
  const categories = Object.keys(BLOG_CATEGORIES) as BlogCategory[];

  return (
    <>
      {/* BreadcrumbList JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: baseUrl,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Blog",
                item: `${baseUrl}/blog`,
              },
            ],
          }),
        }}
      />

      {/* Blog JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "Acadiana Web Design Blog",
            description:
              "Expert tips on web design, local SEO, and growing your service business in Acadiana.",
            url: `${baseUrl}/blog`,
            publisher: {
              "@type": "Organization",
              name: "Acadiana Web Design",
              url: baseUrl,
            },
          }),
        }}
      />

      <main className="w-full flex flex-col relative">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-x-0 -top-16 md:-top-20 -z-10 page-gradient h-[50vh] pointer-events-none"
          />
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 md:pt-16 pb-12">
            <h1 className="text-center text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[hsl(var(--primary-foreground))]">
              Blog
            </h1>
            <p className="text-center text-base sm:text-lg text-[hsl(var(--primary-foreground))]/90 mt-4 mx-auto max-w-2xl">
              Tips and insights for local service businesses in Acadiana. Learn how to get more
              customers with a better online presence.
            </p>
          </div>
        </section>

        {/* Blog Posts Grid */}
        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            {sortedPosts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[var(--muted-foreground)]">
                  Blog posts coming soon! Check back later.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {sortedPosts.map((post) => (
                  <article
                    key={post.slug}
                    className="surface rounded-xl overflow-hidden hover:ring-2 hover:ring-[hsl(var(--primary))]/50 transition-all group"
                  >
                    <Link href={`/blog/${post.slug}`} className="block p-6">
                      <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] mb-3">
                        <span className="pill text-[10px] py-0.5">
                          {BLOG_CATEGORIES[post.category].name}
                        </span>
                      </div>

                      <h2 className="font-semibold text-lg text-[var(--foreground)] group-hover:text-[hsl(var(--primary))] transition-colors line-clamp-2">
                        {post.title}
                      </h2>

                      <p className="mt-2 text-sm text-[var(--muted-foreground)] line-clamp-2">
                        {post.description}
                      </p>

                      <div className="mt-4 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(post.publishedAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {post.readingTime} min
                          </span>
                        </div>
                        <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Categories */}
        <section className="py-12 md:py-16 bg-[var(--muted)]/30">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionHeader as="h2">Browse by Topic</SectionHeader>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => {
                const categoryPosts = BLOG_POSTS.filter((p) => p.category === category);
                if (categoryPosts.length === 0) return null;

                return (
                  <div key={category} className="surface rounded-xl p-5">
                    <h3 className="font-semibold text-[var(--foreground)]">
                      {BLOG_CATEGORIES[category].name}
                    </h3>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      {BLOG_CATEGORIES[category].description}
                    </p>
                    <p className="mt-2 text-xs text-[hsl(var(--primary))]">
                      {categoryPosts.length} article{categoryPosts.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="surface-elevated rounded-2xl p-6 sm:p-10 text-center ring-1 ring-black/5 dark:ring-white/5">
              <h2 className="text-2xl font-bold text-[var(--foreground)]">
                Ready to Put These Tips Into Action?
              </h2>
              <p className="mt-3 text-[var(--muted-foreground)] max-w-lg mx-auto">
                Get a professional website that implements all the best practices we write about.
                $0 down, live in 72 hours.
              </p>
              <div className="mt-6">
                <Link
                  href="/"
                  className="btn-cta inline-flex items-center justify-center gap-2 px-6 py-3 text-base whitespace-nowrap rounded-xl font-semibold"
                >
                  Learn About Our Plan
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer-container pb-6 sm:pb-8">
          <div className="footer-content">
            <div className="footer-info">
              <p className="footer-copyright text-xs sm:text-sm">
                © {new Date().getFullYear()} Acadiana Web Design
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/legal/terms" className="footer-link text-xs sm:text-sm">Terms</Link>
              <Link href="/legal/privacy" className="footer-link text-xs sm:text-sm">Privacy</Link>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
