type DemoReviewProps = {
  author: string;
  text: string;
  rating: number;
};

function renderStars(rating: number): string {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)));
  return `${"★".repeat(clamped)}${"☆".repeat(5 - clamped)}`;
}

export function DemoReview({ author, text, rating }: DemoReviewProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Top Customer Review</p>
      <p className="mt-3 text-lg text-amber-500">{renderStars(rating)}</p>
      <blockquote className="mt-3 text-slate-700">“{text}”</blockquote>
      <p className="mt-4 text-sm font-medium text-slate-900">- {author}</p>
    </section>
  );
}
