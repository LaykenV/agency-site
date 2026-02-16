type DemoHeroProps = {
  businessName: string;
  description: string;
  imageUrl?: string;
  primaryColor?: string;
};

export function DemoHero({
  businessName,
  description,
  imageUrl,
  primaryColor,
}: DemoHeroProps) {
  const color = primaryColor ?? "#2B7FE0";

  return (
    <section
      className="relative overflow-hidden rounded-2xl px-6 py-12 md:px-10 md:py-16 text-white"
      style={{
        background: `linear-gradient(135deg, ${color} 0%, #0f172a 110%)`,
      }}
    >
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/15 blur-2xl" />
      <div className="relative grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/80">Website Preview</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-5xl">{businessName}</h1>
          <p className="mt-4 max-w-2xl text-sm text-white/90 md:text-base">{description}</p>
        </div>
        {imageUrl ? (
          <div className="rounded-xl border border-white/30 bg-black/10 p-2 shadow-xl">
            <img
              src={imageUrl}
              alt={`${businessName} preview`}
              className="h-56 w-full rounded-lg object-cover md:h-64"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
