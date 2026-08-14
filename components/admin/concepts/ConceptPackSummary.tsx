"use client";

import Image from "next/image";
import type {
  EvidenceCandidate,
  EvidenceDecision,
} from "@/lib/concepts/evidence";
import type { PackItem } from "@/lib/concepts/facebookPack";
import { ConceptEvidenceReport } from "./ConceptEvidenceReport";

/**
 * What the analysis concluded, as a report rather than a form.
 *
 * This card replaces the Phase B approval queue. There is nothing to tick: the
 * evidence reviewer already decided, and the corrections available are the ones
 * that change the input — remove an item, paste more, re-analyze, or edit the
 * brief by hand. Those all live in the cards above and below this one, which is
 * why this card has no buttons of its own.
 *
 * What it must do well is make a wrong decision *visible*. So it shows the
 * omitted facts with the reviewer's reason, not just a count, and it labels the
 * result "approved from supplied Facebook evidence" — never verified, owned, or
 * true.
 */

export function ConceptPackSummary({
  candidates,
  decisions,
  conflicts,
  assets,
  items,
  previewUrls,
}: {
  candidates: Array<EvidenceCandidate>;
  decisions: Array<EvidenceDecision>;
  conflicts: Array<string>;
  assets: {
    logoItemId?: string;
    heroItemId?: string;
    galleryItemIds: Array<string>;
  };
  items: Array<PackItem>;
  previewUrls: Record<string, string | null>;
}) {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const gallery = assets.galleryItemIds.filter((id) => itemById.has(id));

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card p-3 sm:p-4">
      <h3 className="text-sm font-semibold">What Luna took from the pack</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Approved from supplied Facebook evidence — not verified as true, and not
        a finding that the business owns these images. To change any of it,
        remove or add pack material above and re-analyze.
      </p>

      {/* --- Selected imagery --- */}
      <div className="mt-3 flex flex-wrap items-start gap-3">
        <SelectedImage
          label="Logo"
          itemId={assets.logoItemId}
          items={itemById}
          previewUrls={previewUrls}
        />
        <SelectedImage
          label="Hero"
          itemId={assets.heroItemId}
          items={itemById}
          previewUrls={previewUrls}
        />
        <div className="min-w-[6rem]">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Gallery
          </p>
          <p className="mt-1 text-sm font-medium">
            {gallery.length} photo{gallery.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <ConceptEvidenceReport
          candidates={candidates}
          decisions={decisions}
          conflicts={conflicts}
          emptyMessage="No readable facts in this pack. That is a normal result for photographs alone — the page will be built from your notes and the imagery above."
        />
      </div>
    </div>
  );
}

function SelectedImage({
  label,
  itemId,
  items,
  previewUrls,
}: {
  label: string;
  itemId?: string;
  items: Map<string, PackItem>;
  previewUrls: Record<string, string | null>;
}) {
  const item = itemId ? items.get(itemId) : undefined;
  const url = itemId ? previewUrls[itemId] : null;

  return (
    <div className="min-w-[5rem]">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {item && url ? (
        <div className="relative mt-1 h-16 w-16 overflow-hidden rounded-lg border border-border bg-muted">
          {/* Unoptimized for the same reason the pack strip is: Convex storage
              is not a configured remote pattern, and this is a 64px thumbnail. */}
          <Image
            src={url}
            alt={item.classification?.alt ?? `Selected ${label.toLowerCase()}`}
            fill
            unoptimized
            sizes="64px"
            className="object-cover"
          />
        </div>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">None</p>
      )}
    </div>
  );
}
