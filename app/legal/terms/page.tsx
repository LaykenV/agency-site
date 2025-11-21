import {
  TERMS_CANONICAL_HTML,
  TERMS_LAST_UPDATED,
  TERMS_SECTIONS,
  TERMS_SUMMARY_POINTS,
  TERMS_VERSION,
} from "@/lib/legal/terms";
import { type Metadata } from "next";
import { PrintButton } from "@/components/PrintButton";

export const metadata: Metadata = {
  title: "Terms of Service",
};

const buildTOC = () =>
  TERMS_SECTIONS.map((section) => ({
    anchor: section.anchor,
    title: section.title,
  }));

const SummaryList = () => (
  <dl className="grid gap-4 sm:grid-cols-2">
    {TERMS_SUMMARY_POINTS.map((item) => (
      <div key={item.label} className="surface relative overflow-hidden rounded-xl p-4">
        {/* Stronger gradient wash for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/10 via-[var(--card)] to-[var(--accent)]/10 opacity-100" />
        
        <div className="relative z-10">
          <dt className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
            {item.label}
          </dt>
          <dd className="mt-2 text-lg font-bold text-[var(--foreground)] tracking-tight">{item.value}</dd>
        </div>
      </div>
    ))}
  </dl>
);

const TableOfContents = () => (
  <nav aria-label="Terms of Service table of contents" className="sticky top-24 rounded-2xl border border-[var(--border)]/60 bg-[var(--card)]/80 p-6 backdrop-blur-xl transition-all hover:border-[var(--border)] hover:bg-[var(--card)] hover:shadow-lg">
    <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Contents</p>
    <ul className="mt-4 space-y-2.5 text-sm font-medium text-[var(--muted-foreground)]">
      {buildTOC().map((entry) => (
        <li key={entry.anchor}>
          <a 
            className="block transition-colors hover:text-[var(--primary)] focus:text-[var(--primary)] focus:outline-none" 
            href={`#${entry.anchor}`}
          >
            {entry.title}
          </a>
        </li>
      ))}
    </ul>
    <div className="mt-8 hidden lg:block">
      <PrintButton className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--secondary)]/50 px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition-all hover:bg-[var(--secondary)] hover:text-[var(--primary)]">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
        Print Agreement
      </PrintButton>
    </div>
  </nav>
);

const renderSectionContent = () =>
  TERMS_SECTIONS.map((section) => (
    <section key={section.anchor} id={section.anchor} className="anchor-target scroll-mt-32">
      <h2 className="heading-gradient-soft text-2xl font-bold tracking-tight md:text-3xl">{section.title}</h2>
      <div className="mt-6 space-y-5 text-base leading-relaxed text-[var(--secondary-foreground)]/90">
        {section.blocks.map((block, index) => {
          if (block.type === "paragraph") {
            return <p key={index} className="text-[var(--muted-foreground)]">{block.text}</p>;
          }
          if (block.type === "subheading") {
            return (
              <h3 key={index} className="mt-8 text-lg font-semibold text-[var(--foreground)]">
                {block.text}
              </h3>
            );
          }
          const ListComponent = block.ordered ? "ol" : "ul";
          return (
            <ListComponent key={index} className={`ml-4 space-y-2 pl-2 text-[var(--muted-foreground)] ${block.ordered ? 'list-decimal' : 'list-disc marker:text-[var(--primary)]'}`}>
              {block.items.map((item) => (
                <li key={item} className="pl-2">{item}</li>
              ))}
            </ListComponent>
          );
        })}
      </div>
      <div className="mt-10 h-px w-full bg-gradient-to-r from-transparent via-[var(--border)] to-transparent opacity-50" />
    </section>
  ));

type TermsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TermsPage({ searchParams }: TermsPageProps) {
  const params = await searchParams;
  const printMode = params?.print === "1";

  if (printMode) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-12 text-black" data-terms-version={TERMS_VERSION}>
        <article className="prose prose-neutral max-w-none">
          <div className="mb-8 border-b border-neutral-200 pb-8">
            <h1 className="text-4xl font-bold text-neutral-900">Terms of Service</h1>
            <p className="mt-2 text-lg text-neutral-600">Website-as-a-Service Agreement</p>
            <div className="mt-4 flex gap-6 text-sm text-neutral-500">
              <p>Version: {TERMS_VERSION}</p>
              <p>Last updated: {TERMS_LAST_UPDATED}</p>
            </div>
          </div>
          {renderSectionContent()}
        </article>
      </div>
    );
  }

  return (
    <div className="min-h-dvh w-full bg-[var(--background)] text-[var(--foreground)]" data-terms-version={TERMS_VERSION}>
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
        
        {/* Header Section */}
        <div className="mx-auto mb-16 max-w-3xl text-center md:mb-24">
          <h1 className="hero-title mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Terms of Service
          </h1>
          
          <p className="mx-auto max-w-2xl text-lg leading-8 text-[var(--muted-foreground)] md:text-xl">
            Clear, fair, and transparent. Our Website-as-a-Service agreement is designed to protect both your business and ours.
          </p>

          <div className="mt-8 flex justify-center lg:hidden">
            <PrintButton className="flex cursor-pointer items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-6 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-colors hover:bg-[var(--muted)]">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Print Agreement
            </PrintButton>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_300px] xl:gap-12">
          <div className="space-y-8">
            {/* Key Terms Card */}
            <div className="surface relative overflow-hidden rounded-3xl p-8 glow-primary md:p-10">
              {/* Subtle internal gradient wash */}
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 via-transparent to-[var(--accent)]/5 pointer-events-none" />
              
              <div className="relative">
                <div className="mb-8 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] shadow-sm ring-1 ring-[var(--primary)]/20">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h2 className="text-lg font-bold text-[var(--foreground)]">Quick Summary</h2>
                </div>
                
                <p className="mb-8 text-[var(--muted-foreground)]">
                  These terms govern your Website-as-a-Service subscription. While we recommend reading the full agreement, here are the key points you should know:
                </p>
                
                <SummaryList />
                
                <p className="mt-6 text-sm text-[var(--muted-foreground)]/80">
                  Refer to the full agreement below for complete details, including order summary, scope of service, unlimited edits policy, and early termination terms.
                </p>
              </div>
            </div>

            {/* Main Content */}
            <article className="surface-elevated relative rounded-3xl p-8 glow-primary md:p-12">
              {/* Decorative top gradient line */}
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--primary)]/30 to-transparent opacity-50" />
              
              <div className="space-y-12">{renderSectionContent()}</div>
              
              <footer className="mt-16 rounded-2xl border border-[var(--border)]/60 bg-gradient-to-br from-[var(--card)] to-[var(--muted)]/50 p-6 md:p-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold text-[var(--foreground)]">Still have questions?</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Reach out to our team at <a className="font-medium text-[var(--primary)] hover:underline" href="mailto:support@acadianawebdesign.com">support@acadianawebdesign.com</a>.
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-[var(--muted-foreground)] md:flex-col md:items-end md:gap-1">
                    <span className="rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1">
                      Version {TERMS_VERSION}
                    </span>
                    <span className="hidden md:inline">•</span>
                    <span className="rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1 md:border-0 md:bg-transparent md:p-0 md:opacity-80">
                      Updated {TERMS_LAST_UPDATED}
                    </span>
                  </div>
                </div>
              </footer>
            </article>
          </div>

          <aside className="hidden lg:block">
            <TableOfContents />
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