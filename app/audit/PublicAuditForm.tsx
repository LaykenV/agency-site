"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { ArrowRight, Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api";

export function PublicAuditForm() {
  const router = useRouter();
  const submit = useMutation(api.publicAudits.submit);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // The visual prefix shows "https://" — strip any scheme the user pastes
      // so the backend doesn't see "https://https://example.com".
      const cleaned = url.trim().replace(/^https?:\/\//i, "");
      const result = await submit({
        url: cleaned,
        source: "business_card_qr",
      });
      router.push(`/audit/request/${result.token}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not start the audit.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-3">
      <label
        htmlFor="audit-url"
        className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]"
      >
        Your website
      </label>

      <div className="group relative flex items-stretch overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_8px_24px_-16px_hsl(var(--primary)/0.55),inset_0_1px_0_hsl(0_0%_100%/0.3)] transition-all focus-within:border-[hsl(var(--primary))]/60 focus-within:ring-2 focus-within:ring-[hsl(var(--primary))]/20">
        {/* https:// prefix shown only when there's room for it */}
        <span
          aria-hidden
          className="hidden sm:grid place-items-center pl-4 pr-2 font-mono text-sm text-[var(--muted-foreground)]"
        >
          https://
        </span>
        <input
          id="audit-url"
          type="text"
          inputMode="url"
          autoComplete="url"
          required
          disabled={isSubmitting}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="yourbusiness.com"
          className="min-w-0 flex-1 bg-transparent px-4 py-3.5 font-[family-name:var(--font-sora)] text-base text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]/60 disabled:opacity-60 sm:pl-0"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-cta flex w-full items-center justify-center gap-2 px-5 py-3.5 text-sm font-bold disabled:opacity-70"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            <span>Scanning your site&hellip;</span>
          </>
        ) : (
          <>
            <span>Run my free audit</span>
            <ArrowRight className="size-4" />
          </>
        )}
      </button>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/10 px-3 py-2 text-sm text-[hsl(var(--destructive))]"
        >
          {error}
        </p>
      )}
    </form>
  );
}
