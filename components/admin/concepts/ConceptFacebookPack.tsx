"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import {
  AlertTriangle,
  ImageIcon,
  Loader2,
  Sparkles,
  Type,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  PACK_MAX_IMAGE_ITEMS,
  PACK_MAX_ITEMS,
  PACK_ANALYSIS_MAX_TOTAL_BYTES,
  summarizePack,
  type PackClassificationKind,
  type PackItem,
  type PackState,
} from "@/lib/concepts/facebookPack";
import { cn } from "@/lib/utils";

/**
 * The primary content surface: one place to put everything from the Page.
 *
 * Built for a phone first, because that is where Layken has Facebook open. The
 * paste box takes clipboard images and copied text through the same control, so
 * there is nothing to choose between before pasting, and the item strip scrolls
 * sideways rather than stacking twelve full-width cards.
 *
 * Nothing here approves anything. Classification is shown so a wrong verdict is
 * visible and correctable by removing the item; the decisions that put pixels on
 * a page belong to the model and to `canUsePackItemAsPageImagery`.
 */

const CLASSIFICATION_LABELS: Record<PackClassificationKind, string> = {
  logo: "Logo",
  business_photo: "Photo",
  context_screenshot: "Context only",
  text_context: "Text",
  duplicate: "Duplicate",
  unusable_or_uncertain: "Not usable",
};

function classificationClass(kind: PackClassificationKind): string {
  switch (kind) {
    case "logo":
    case "business_photo":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-300";
    case "context_screenshot":
    case "text_context":
      return "bg-[var(--muted)] text-[var(--muted-foreground)]";
    default:
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  }
}

const STATE_LABELS: Record<PackState, string> = {
  collecting: "Collecting",
  analyzing: "Analyzing",
  ready: "Sorted",
  failed: "Analysis failed",
};

export function ConceptFacebookPack({
  items,
  state,
  error,
  previewUrls,
  isBusy,
  onAddImages,
  onAddText,
  onRemoveItem,
  onAnalyze,
}: {
  items: Array<PackItem>;
  state?: PackState;
  error?: string;
  previewUrls: Record<string, string | null>;
  isBusy: boolean;
  onAddImages: (files: Array<File>) => Promise<void>;
  /** Resolves true when the text was accepted, so the box only clears then. */
  onAddText: (text: string) => Promise<boolean>;
  onRemoveItem: (itemId: string) => Promise<unknown>;
  onAnalyze: () => Promise<unknown>;
}) {
  const [text, setText] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const summary = summarizePack(items);
  const analyzing = state === "analyzing";
  const controlsLocked = isBusy || analyzing;
  const imagesFull = summary.images >= PACK_MAX_IMAGE_ITEMS;
  const packFull = summary.total >= PACK_MAX_ITEMS;
  const imageBytes = items.reduce(
    (sum, item) => sum + (item.kind === "image" ? (item.sizeBytes ?? 0) : 0),
    0,
  );

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);

    // Text falls through to the textarea untouched; images are intercepted so a
    // pasted screenshot never becomes a blob URL sitting in a form field.
    if (files.length === 0) return;
    event.preventDefault();
    void onAddImages(files);
  };

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 sm:p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Facebook Pack</h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">
            Paste logo, work photos, About screenshots, or copied text. Screenshots
            stay context-only.
          </p>
        </div>
        {state ? (
          <span
            className={cn(
              "inline-flex flex-none items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium",
              state === "ready"
                ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                : state === "failed"
                  ? "bg-red-500/15 text-red-700 dark:text-red-300"
                  : "bg-[var(--muted)] text-[var(--muted-foreground)]",
            )}
          >
            {analyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            {STATE_LABELS[state]}
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-2.5 text-xs text-red-700 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" />
          <span className="break-words [overflow-wrap:anywhere]">{error}</span>
        </p>
      ) : null}

      {/* --- One intake surface for clipboard images and copied text --- */}
      <div className="mt-3 space-y-2">
        <Textarea
          rows={3}
          value={text}
          disabled={controlsLocked || packFull}
          onChange={(event) => setText(event.target.value)}
          onPaste={handlePaste}
          placeholder={
            packFull
              ? `This pack is full at ${PACK_MAX_ITEMS} items.`
              : "Paste a screenshot here with ⌘V, or paste their About text and press Add text."
          }
          className="text-sm"
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            if (files.length > 0) void onAddImages(files);
          }}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={controlsLocked || imagesFull || packFull}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload images
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={controlsLocked || packFull || !text.trim()}
            onClick={() =>
              void onAddText(text).then((added) => {
                if (added) setText("");
              })
            }
          >
            <Type className="h-3.5 w-3.5" />
            Add text
          </Button>
        </div>

        <p className="text-[11px] text-[var(--muted-foreground)]">
          {summary.total} of {PACK_MAX_ITEMS} items · {summary.images} of{" "}
          {PACK_MAX_IMAGE_ITEMS} images ·{" "}
          {(imageBytes / 1024 / 1024).toFixed(1)} of{" "}
          {PACK_ANALYSIS_MAX_TOTAL_BYTES / 1024 / 1024} MB. Large images are
          resized before upload. JPEG, PNG, and WebP only; a copied image URL is
          not fetched.
        </p>
      </div>

      {/* --- Item strip --- */}
      {items.length > 0 ? (
        <>
          {items.length > 1 ? (
            <p className="mt-3 text-[11px] text-[var(--muted-foreground)] sm:hidden">
              Swipe sideways to review each item.
            </p>
          ) : null}
          <div className="-mx-1 mt-3 flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
            {items.map((item) => (
              <PackItemCard
                key={item.id}
                item={item}
                previewUrl={previewUrls[item.id] ?? null}
                isBusy={controlsLocked}
                onRemove={() => onRemoveItem(item.id)}
              />
            ))}
          </div>
        </>
      ) : null}

      {/* --- Analysis --- */}
      <div className="mt-4 border-t border-[var(--border)] pt-4">
        {state === "ready" ? (
          <dl className="mb-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div>
              <dt className="text-[var(--muted-foreground)]">Logo</dt>
              <dd className="font-medium">{summary.logos}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted-foreground)]">Photos</dt>
              <dd className="font-medium">{summary.photos}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted-foreground)]">Context only</dt>
              <dd className="font-medium">{summary.screenshots}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted-foreground)]">Set aside</dt>
              <dd className="font-medium">
                {summary.duplicates + summary.unusable}
              </dd>
            </div>
          </dl>
        ) : null}

        <Button
          size="sm"
          disabled={controlsLocked || items.length === 0}
          onClick={() => void onAnalyze()}
        >
          {analyzing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {analyzing
            ? "Analyzing..."
            : state === "ready"
              ? "Re-analyze pack"
              : "Analyze Facebook Pack"}
        </Button>

        <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
          {state === "ready"
            ? "Sorted and reviewed. What survived review is what the next generation may say."
            : state === "collecting" && items.length > 0
              ? "Generation waits until this pack is analyzed, so nothing you pasted is silently left out."
              : "Analysis is one paid model call. Paste everything you want first, then analyze once."}
        </p>
      </div>
    </div>
  );
}

function PackItemCard({
  item,
  previewUrl,
  isBusy,
  onRemove,
}: {
  item: PackItem;
  previewUrl: string | null;
  isBusy: boolean;
  onRemove: () => Promise<unknown>;
}) {
  const classification = item.classification;

  return (
    <article className="flex w-[76vw] max-w-[300px] flex-none snap-start flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)] sm:w-auto sm:max-w-none">
      <div className="relative aspect-[4/3] bg-[var(--muted)]">
        {item.kind === "image" && previewUrl ? (
          // Unoptimized: Convex storage is not in `next.config.ts`
          // remotePatterns, and an admin thumbnail buys nothing from the
          // optimizer.
          <Image
            src={previewUrl}
            alt={classification?.alt ?? "Facebook Pack item"}
            fill
            unoptimized
            sizes="300px"
            className="object-cover"
          />
        ) : item.kind === "text" ? (
          <p className="line-clamp-6 h-full overflow-hidden p-2.5 text-[11px] leading-relaxed text-[var(--muted-foreground)]">
            {item.text}
          </p>
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--muted-foreground)]">
            <ImageIcon className="h-5 w-5" />
          </div>
        )}

        <button
          type="button"
          disabled={isBusy}
          onClick={() => void onRemove()}
          aria-label="Remove this item"
          className="absolute right-1.5 top-1.5 rounded bg-black/60 p-1.5 text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-w-0 space-y-1.5 p-2.5">
        {classification ? (
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
              classificationClass(classification.kind),
            )}
          >
            {CLASSIFICATION_LABELS[classification.kind]}
            {classification.roleHint ? ` · ${classification.roleHint}` : ""}
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-[var(--muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)]">
            Not sorted yet
          </span>
        )}

        {classification?.description ? (
          <p className="text-[11px] leading-relaxed text-[var(--muted-foreground)]">
            {classification.description}
          </p>
        ) : null}
        {classification?.reason ? (
          <p className="text-[11px] leading-relaxed text-[var(--muted-foreground)]">
            {classification.reason}
          </p>
        ) : null}
        {item.classificationError ? (
          <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
            {item.classificationError}
          </p>
        ) : null}
      </div>
    </article>
  );
}
