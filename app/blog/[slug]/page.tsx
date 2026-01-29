import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Clock, ArrowLeft, ArrowRight } from "lucide-react";
import { BLOG_POSTS, BLOG_CATEGORIES, getBlogPostBySlug, getAllBlogSlugs } from "@/lib/seo/blog";
import { ONBOARDING_CAL_LINK } from "@/lib/config";

// Setup Base URL
const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  ? `https://${process.env.NEXT_PUBLIC_APP_URL}`
  : process.env.SITE_URL ?? "http://localhost:3000";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

// Generate static params for all blog posts
export async function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }));
}

// Generate metadata for each blog post
export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  return {
    title: post.title,
    description: post.description,
    keywords: post.tags,
    authors: [{ name: post.author }],
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `${baseUrl}/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt || post.publishedAt,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Simple markdown-to-HTML converter for blog content
function renderMarkdown(content: string): string {
  return content
    // Headers
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-6 mb-3 text-[var(--foreground)]">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-8 mb-4 text-[var(--foreground)]">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-8 mb-4 text-[var(--foreground)]">$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-[var(--foreground)]">$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[hsl(var(--primary))] hover:underline">$1</a>')
    // Unordered lists
    .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>')
    // Ordered lists (basic)
    .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal">$1</li>')
    // Blockquotes
    .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-[hsl(var(--primary))] pl-4 italic my-4 text-[var(--muted-foreground)]">$1</blockquote>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-[var(--muted)] px-1.5 py-0.5 rounded text-sm">$1</code>')
    // Tables (basic)
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split("|").filter(Boolean);
      const isHeader = cells.some((cell) => cell.includes("---"));
      if (isHeader) return "";
      const cellHtml = cells
        .map((cell) => `<td class="border border-[var(--border)] px-3 py-2">${cell.trim()}</td>`)
        .join("");
      return `<tr>${cellHtml}</tr>`;
    })
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="my-8 border-[var(--border)]">')
    // Checkmarks
    .replace(/❌/g, '<span class="text-red-500">❌</span>')
    .replace(/✅/g, '<span class="text-green-500">✅</span>')
    // Paragraphs (wrap remaining lines)
    .split("\n\n")
    .map((block) => {
      if (
        block.startsWith("<h") ||
        block.startsWith("<blockquote") ||
        block.startsWith("<li") ||
        block.startsWith("<hr") ||
        block.startsWith("<tr") ||
        block.trim() === ""
      ) {
        return block;
      }
      // Wrap list items in ul
      if (block.includes('<li class="ml-4 list-disc">')) {
        return `<ul class="my-4 space-y-1">${block}</ul>`;
      }
      if (block.includes('<li class="ml-4 list-decimal">')) {
        return `<ol class="my-4 space-y-1">${block}</ol>`;
      }
      return `<p class="my-4 text-[var(--muted-foreground)] leading-relaxed">${block.replace(/\n/g, " ")}</p>`;
    })
    .join("\n");
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  // Get related posts (same category, excluding current)
  const relatedPosts = BLOG_POSTS.filter(
    (p) => p.category === post.category && p.slug !== post.slug
  ).slice(0, 2);

  // Get next/previous posts
  const sortedPosts = [...BLOG_POSTS].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
  const currentIndex = sortedPosts.findIndex((p) => p.slug === post.slug);
  const prevPost = currentIndex < sortedPosts.length - 1 ? sortedPosts[currentIndex + 1] : null;
  const nextPost = currentIndex > 0 ? sortedPosts[currentIndex - 1] : null;

  const htmlContent = renderMarkdown(post.content);

  return (
    <>
      {/* Article JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.description,
            datePublished: post.publishedAt,
            dateModified: post.updatedAt || post.publishedAt,
            author: {
              "@type": "Organization",
              name: post.author,
              url: baseUrl,
            },
            publisher: {
              "@type": "Organization",
              name: "Acadiana Web Design",
              url: baseUrl,
              logo: {
                "@type": "ImageObject",
                url: `${baseUrl}/icon.svg`,
              },
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `${baseUrl}/blog/${post.slug}`,
            },
            keywords: post.tags.join(", "),
          }),
        }}
      />

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
              {
                "@type": "ListItem",
                position: 3,
                name: post.title,
                item: `${baseUrl}/blog/${post.slug}`,
              },
            ],
          }),
        }}
      />

      <main className="w-full flex flex-col relative">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-x-0 -top-16 md:-top-20 -z-10 page-gradient h-[40vh] pointer-events-none"
          />
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 md:pt-16 pb-8">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm text-[hsl(var(--primary-foreground))]/80 hover:text-[hsl(var(--primary-foreground))] transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Blog
            </Link>

            <div className="flex items-center gap-2 text-sm text-[hsl(var(--primary-foreground))]/80 mb-4">
              <span className="pill bg-white/20 text-[hsl(var(--primary-foreground))] text-xs">
                {BLOG_CATEGORIES[post.category].name}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-[hsl(var(--primary-foreground))]">
              {post.title}
            </h1>

            <div className="flex items-center gap-4 mt-6 text-sm text-[hsl(var(--primary-foreground))]/80">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatDate(post.publishedAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {post.readingTime} min read
              </span>
            </div>
          </div>
        </section>

        {/* Article Content */}
        <article className="py-8 md:py-12">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        </article>

        {/* Tags */}
        <section className="py-6">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="pill text-xs">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-8 md:py-12 bg-[var(--muted)]/30">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="surface-elevated rounded-2xl p-6 sm:p-8 text-center ring-1 ring-black/5 dark:ring-white/5">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">
                Need a Website That Works?
              </h2>
              <p className="mt-3 text-[var(--muted-foreground)]">
                Get a professional website that brings in customers. $0 down, $199/mo, live in 72
                hours.
              </p>
              <div className="mt-5">
                <Link
                  href={ONBOARDING_CAL_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-cta inline-flex items-center justify-center gap-2 px-6 py-3 text-base whitespace-nowrap rounded-xl font-semibold"
                >
                  Schedule Free Call
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Navigation */}
        <section className="py-8">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between gap-4">
              {prevPost ? (
                <Link
                  href={`/blog/${prevPost.slug}`}
                  className="flex-1 surface rounded-xl p-4 hover:ring-2 hover:ring-[hsl(var(--primary))]/50 transition-all group"
                >
                  <span className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
                    <ArrowLeft className="h-3 w-3" />
                    Previous
                  </span>
                  <span className="mt-1 block font-medium text-[var(--foreground)] line-clamp-1 group-hover:text-[hsl(var(--primary))]">
                    {prevPost.title}
                  </span>
                </Link>
              ) : (
                <div className="flex-1" />
              )}

              {nextPost ? (
                <Link
                  href={`/blog/${nextPost.slug}`}
                  className="flex-1 surface rounded-xl p-4 hover:ring-2 hover:ring-[hsl(var(--primary))]/50 transition-all group text-right"
                >
                  <span className="text-xs text-[var(--muted-foreground)] flex items-center gap-1 justify-end">
                    Next
                    <ArrowRight className="h-3 w-3" />
                  </span>
                  <span className="mt-1 block font-medium text-[var(--foreground)] line-clamp-1 group-hover:text-[hsl(var(--primary))]">
                    {nextPost.title}
                  </span>
                </Link>
              ) : (
                <div className="flex-1" />
              )}
            </div>
          </div>
        </section>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="py-8 md:py-12">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-6">
                Related Articles
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {relatedPosts.map((relatedPost) => (
                  <Link
                    key={relatedPost.slug}
                    href={`/blog/${relatedPost.slug}`}
                    className="surface rounded-xl p-4 hover:ring-2 hover:ring-[hsl(var(--primary))]/50 transition-all group"
                  >
                    <h3 className="font-medium text-[var(--foreground)] group-hover:text-[hsl(var(--primary))] line-clamp-2">
                      {relatedPost.title}
                    </h3>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)] line-clamp-2">
                      {relatedPost.description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="footer-container pb-6 sm:pb-8">
          <div className="footer-content">
            <div className="footer-info">
              <p className="footer-copyright text-xs sm:text-sm">
                © {new Date().getFullYear()} Acadiana Web Design
              </p>
            </div>
            <Link href="/legal/terms" className="footer-link text-xs sm:text-sm">
              Terms
            </Link>
          </div>
        </footer>
      </main>
    </>
  );
}
