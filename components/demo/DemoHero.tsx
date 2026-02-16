type DemoHeroProps = {
  businessName: string;
  description: string;
  imageUrl?: string;
  primaryColor?: string;
  phone?: string;
};

export function DemoHero({
  businessName,
  description,
  imageUrl,
  primaryColor,
  phone,
}: DemoHeroProps) {
  const color = primaryColor ?? "#2B7FE0";

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
      {/* Image — full width, hero-style */}
      {imageUrl ? (
        <div className="relative h-56 md:h-72">
          <img
            src={imageUrl}
            alt={businessName}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
          {/* Business initial badge overlapping image bottom */}
          <div className="absolute -bottom-5 left-6">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white shadow-lg ring-4 ring-white"
              style={{ backgroundColor: color }}
            >
              {businessName.charAt(0)}
            </div>
          </div>
        </div>
      ) : null}

      {/* Content */}
      <div className={`px-6 pb-6 md:px-8 md:pb-8 ${imageUrl ? "pt-9" : "pt-6 md:pt-8"}`}>
        {!imageUrl ? (
          <div
            className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {businessName.charAt(0)}
          </div>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          {businessName}
        </h1>
        <p className="mt-2.5 max-w-lg text-[15px] leading-relaxed text-slate-500">
          {description}
        </p>

        {/* Phone badge */}
        {phone ? (
          <a
            href={`tel:${phone.replace(/[^\d+]/g, "")}`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100"
            style={{ color }}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {phone}
          </a>
        ) : null}
      </div>
    </section>
  );
}
