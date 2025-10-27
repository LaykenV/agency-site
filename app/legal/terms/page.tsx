import {
  TERMS_CANONICAL_HTML,
  TERMS_LAST_UPDATED,
  TERMS_SECTIONS,
  TERMS_SUMMARY_POINTS,
  TERMS_VERSION,
} from "@/lib/legal/terms";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
};

const buildTOC = () =>
  TERMS_SECTIONS.map((section) => ({
    anchor: section.anchor,
    title: section.title,
  }));

const SummaryList = () => (
  <dl className="grid gap-3 text-sm text-[var(--secondary)] sm:grid-cols-2">
    {TERMS_SUMMARY_POINTS.map((item) => (
      <div key={item.label} className="rounded-xl border border-[var(--border)]/60 bg-[var(--muted)]/50 p-4">
        <dt className="text-xs uppercase tracking-[0.2em] text-[var(--secondary)]/80">
          {item.label}
        </dt>
        <dd className="mt-1 text-[var(--foreground)] font-medium">{item.value}</dd>
      </div>
    ))}
  </dl>
);

const TableOfContents = () => (
  <nav aria-label="Terms of Service table of contents" className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40 p-6">
    <p className="text-xs uppercase tracking-[0.2em] text-[var(--secondary)]">Table of contents</p>
    <ul className="mt-4 space-y-2 text-sm text-[var(--secondary)]">
      {buildTOC().map((entry) => (
        <li key={entry.anchor}>
          <a className="text-[var(--foreground)] transition hover:text-[var(--primary)]" href={`#${entry.anchor}`}>
            {entry.title}
          </a>
        </li>
      ))}
    </ul>
  </nav>
);

const renderSectionContent = () =>
  TERMS_SECTIONS.map((section) => (
    <section key={section.anchor} id={section.anchor} className="scroll-mt-32">
      <h2 className="text-2xl font-semibold text-[var(--foreground)]">{section.title}</h2>
      <div className="mt-4 space-y-4 text-base leading-7 text-[var(--secondary)]">
        {section.blocks.map((block, index) => {
          if (block.type === "paragraph") {
            return <p key={index}>{block.text}</p>;
          }
          if (block.type === "subheading") {
            return (
              <h3 key={index} className="text-xl font-semibold text-[var(--foreground)]">
                {block.text}
              </h3>
            );
          }
          const ListComponent = block.ordered ? "ol" : "ul";
          return (
            <ListComponent key={index} className="ml-4 list-disc space-y-2">
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ListComponent>
          );
        })}
      </div>
      <div className="mt-6 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
    </section>
  ));

type TermsPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function TermsPage({ searchParams }: TermsPageProps) {
  const printMode = searchParams?.print === "1";

  if (printMode) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12 text-black" data-terms-version={TERMS_VERSION}>
        <article className="prose prose-neutral max-w-none">
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm">Version: {TERMS_VERSION}</p>
            <p className="text-sm">Last updated: {TERMS_LAST_UPDATED}</p>
          </div>
          {renderSectionContent()}
        </article>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-dvh bg-[var(--background)] text-[var(--foreground)]"
      data-terms-version={TERMS_VERSION}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,var(--muted)_0%,transparent_70%)] opacity-40" />
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-16">
        <header className="rounded-3xl border border-[var(--border)] bg-[var(--card)]/90 p-10 shadow-2xl backdrop-blur">
          <p className="text-xs uppercase tracking-[0.4em] text-[var(--secondary)]">Terms of Service</p>
          <h1 className="mt-3 text-4xl font-semibold">Website-as-a-Service Agreement</h1>
          <p className="mt-3 text-sm text-[var(--secondary)]">Version {TERMS_VERSION} • Last updated {TERMS_LAST_UPDATED}</p>
          <p className="mt-4 text-base text-[var(--secondary)]">
            These terms govern your Website-as-a-Service subscription. They outline the deliverables, ongoing support, billing obligations, and commitments for both parties.
          </p>
          <div className="mt-8">
            <div className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--muted)]/60 to-[var(--card)]/80 p-8 shadow-lg">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--secondary)]">
                Conspicuous Summary
              </p>
              <div className="mt-6">
                <SummaryList />
              </div>
              <p className="mt-6 text-sm text-[var(--secondary)]">
                Refer to the full agreement below for details, including order summary, scope of service, unlimited edits policy, and early termination terms.
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="rounded-3xl border border-[var(--border)] bg-[var(--card)]/85 p-10 shadow-xl backdrop-blur">
            <div className="space-y-12">{renderSectionContent()}</div>
            <footer className="mt-10 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40 p-6 text-sm text-[var(--secondary)]">
              <p>
                Questions? Email <a className="text-[var(--primary)]" href="mailto:support@acadianawebdesign.com">support@acadianawebdesign.com</a>.
              </p>
              <p className="mt-2">Version {TERMS_VERSION}</p>
            </footer>
          </article>
          <aside className="space-y-6">
            <TableOfContents />
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/80 p-6 text-sm text-[var(--secondary)]">
              <p className="font-semibold text-[var(--foreground)]">Need a printable version?</p>
              <p className="mt-1">Open this page with <span className="font-mono">?print=1</span> to view a print-friendly layout.</p>
            </div>
          </aside>
        </div>
      </div>
      <script
        id="terms-html"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(TERMS_CANONICAL_HTML) }}
      />
    </div>
  );
}