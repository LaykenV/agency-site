type DemoCTAProps = {
  phone?: string;
};

export function DemoCTA({ phone }: DemoCTAProps) {
  const callHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : undefined;

  return (
    <section className="rounded-2xl bg-slate-900 px-6 py-8 text-white md:px-8">
      <h2 className="text-2xl font-semibold">Ready to get started?</h2>
      <p className="mt-2 text-slate-300">
        We can launch your new site fast and keep it updated for you every month.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <a
          href="https://cal.com"
          className="inline-flex items-center rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400"
        >
          Schedule a Call
        </a>
        {callHref ? (
          <a
            href={callHref}
            className="inline-flex items-center rounded-md border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Call {phone}
          </a>
        ) : null}
      </div>
    </section>
  );
}
