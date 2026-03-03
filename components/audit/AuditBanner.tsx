import Image from "next/image";

const CAL_LINK =
  "https://cal.com/layken-varholdt/agency-prospect?utm_source=audit&utm_medium=banner&utm_campaign=marketing";

export function AuditBanner() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-[#0a0a0f]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 md:px-4 md:py-3">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="AWD" width={20} height={20} className="rounded" />
          <p className="text-[11px] text-white/40 md:text-sm md:text-white/50">
            Free audit by <span className="font-semibold text-white/70">Acadiana Web Design</span>
          </p>
        </div>
        <a
          href={CAL_LINK}
          className="inline-flex items-center rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur transition-colors hover:bg-white/20 md:text-xs"
        >
          Schedule a Free Consultation
        </a>
      </div>
    </div>
  );
}
