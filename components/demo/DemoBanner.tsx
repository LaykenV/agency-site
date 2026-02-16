export function DemoBanner() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <p className="text-xs font-medium text-slate-700 md:text-sm">
          This is a preview by Acadiana Web Design.
        </p>
        <a
          href="https://acadianawebdesign.com"
          className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
        >
          Get Your Website
        </a>
      </div>
    </div>
  );
}
