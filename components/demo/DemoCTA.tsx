type DemoCTAProps = {
  phone?: string;
  primaryColor?: string;
};

export function DemoCTA({ phone, primaryColor }: DemoCTAProps) {
  const color = primaryColor ?? "#2B7FE0";
  const callHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : undefined;

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 md:p-8">
      <h2 className="text-xl font-bold tracking-tight text-slate-900">
        Get a website that works for you
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
        $0 down &middot; live in 72 hours &middot; unlimited monthly edits
      </p>
      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <a
          href="https://cal.com/layken-varholdt/agency-prospect?utm_source=demo&utm_medium=cta&utm_campaign=marketing"
          className="inline-flex w-full items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.02] sm:w-auto"
          style={{
            backgroundColor: color,
            boxShadow: `0 4px 14px ${color}30`,
          }}
        >
          Schedule a Free Call
        </a>
        {callHref ? (
          <a
            href={callHref}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-6 py-3 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 sm:w-auto"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Call {phone}
          </a>
        ) : null}
      </div>
    </section>
  );
}
