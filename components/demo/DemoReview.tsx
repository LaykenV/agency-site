type DemoReviewProps = {
  author: string;
  text: string;
  rating: number;
  primaryColor?: string;
};

export function DemoReview({ author, text, rating, primaryColor }: DemoReviewProps) {
  const color = primaryColor ?? "#2B7FE0";
  const clamped = Math.max(0, Math.min(5, Math.round(rating)));

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 md:p-8">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg
            key={i}
            className="h-4 w-4"
            fill={i < clamped ? "#f59e0b" : "#e2e8f0"}
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <blockquote className="mt-3 text-[15px] leading-relaxed text-slate-700">
        &ldquo;{text}&rdquo;
      </blockquote>
      <div className="mt-4 flex items-center gap-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {author.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm font-medium text-slate-900">{author}</span>
      </div>
    </section>
  );
}
