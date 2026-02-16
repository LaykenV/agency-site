export function DemoBanner() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2 md:px-4 md:py-3">
        <p className="text-[11px] text-slate-500 md:text-sm md:font-medium md:text-slate-700">
          Preview by <span className="font-semibold text-slate-700">Acadiana Web Design</span>
        </p>
        <a
          href="https://acadianawebdesign.com"
          className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-500 md:text-xs"
        >
          Get Yours
        </a>
      </div>
    </div>
  );
}
