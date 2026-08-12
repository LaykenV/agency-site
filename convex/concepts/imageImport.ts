"use node";

import { lookup } from "node:dns/promises";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import {
  REMOTE_IMAGE_MAX_BYTES,
  REMOTE_IMAGE_MAX_REDIRECTS,
  detectSupportedImageMime,
  isBlockedImageAddress,
  validateRemoteImageUrl,
} from "../../lib/concepts/remoteImage";

async function assertPublicDns(hostname: string): Promise<void> {
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0) throw new Error("Image host did not resolve.");
  if (addresses.some(({ address }) => isBlockedImageAddress(address))) {
    throw new Error("Image host resolved to a non-public address.");
  }
}

async function readBoundedBody(response: Response): Promise<Uint8Array> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > REMOTE_IMAGE_MAX_BYTES) {
    throw new Error("Image is larger than 8 MiB.");
  }
  if (!response.body) throw new Error("Image response had no body.");

  const reader = response.body.getReader();
  const chunks: Array<Uint8Array> = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > REMOTE_IMAGE_MAX_BYTES) {
      await reader.cancel();
      throw new Error("Image is larger than 8 MiB.");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function fetchWebsiteImage(input: {
  remoteUrl: string;
  harvestSourceUrl: string;
}): Promise<{ bytes: Uint8Array; mime: string }> {
  let current = validateRemoteImageUrl(input.remoteUrl, input.harvestSourceUrl);

  for (
    let redirects = 0;
    redirects <= REMOTE_IMAGE_MAX_REDIRECTS;
    redirects++
  ) {
    await assertPublicDns(current.hostname);
    const response = await fetch(current, {
      redirect: "manual",
      headers: {
        Accept: "image/webp,image/png,image/jpeg",
        "User-Agent": "AcadianaWebDesign-ConceptImagePreview/1.0",
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Image redirect had no destination.");
      if (redirects === REMOTE_IMAGE_MAX_REDIRECTS) {
        throw new Error("Image redirected too many times.");
      }
      current = validateRemoteImageUrl(
        new URL(location, current).toString(),
        input.harvestSourceUrl,
      );
      continue;
    }

    if (!response.ok) {
      throw new Error(`Image request failed with ${response.status}.`);
    }

    const headerMime = response.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase();
    if (
      headerMime !== "image/jpeg" &&
      headerMime !== "image/png" &&
      headerMime !== "image/webp"
    ) {
      throw new Error("Image response was not JPEG, PNG, or WebP.");
    }

    const bytes = await readBoundedBody(response);
    const mime = detectSupportedImageMime(bytes);
    if (!mime || mime !== headerMime) {
      throw new Error("Image bytes did not match the declared file type.");
    }
    return { bytes, mime };
  }

  throw new Error("Image redirect limit reached.");
}

/**
 * Copy every unstaged image in one harvest into Convex storage sequentially.
 * The browser never receives or fetches the remote URL.
 *
 * Staging is now automatic and unconditional, because nothing downstream asks a
 * human which images to copy. When it finishes it hands the staged files to the
 * classifier, which decides which of them — if any — become page imagery.
 */
export const stageHarvestImages = internalAction({
  args: {
    conceptId: v.id("website_concepts"),
    expectedHarvestedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const concept: Doc<"website_concepts"> | null = await ctx.runQuery(
      internal.concepts.internal.getById,
      { conceptId: args.conceptId },
    );
    if (!concept || concept.harvestedAt !== args.expectedHarvestedAt)
      return null;
    if (!concept.harvestSourceUrl) return null;

    for (const candidate of concept.harvestImageCandidates ?? []) {
      if (candidate.previewStorageId || candidate.stageStatus === "rejected") {
        continue;
      }
      if (
        candidate.stageStatus !== undefined &&
        candidate.stageStatus !== "staging" &&
        candidate.stageStatus !== "failed"
      ) {
        continue;
      }

      try {
        const { bytes, mime } = await fetchWebsiteImage({
          remoteUrl: candidate.remoteUrl,
          harvestSourceUrl: concept.harvestSourceUrl,
        });
        const ownedBuffer = new ArrayBuffer(bytes.byteLength);
        new Uint8Array(ownedBuffer).set(bytes);
        const storageId = await ctx.storage.store(
          new Blob([ownedBuffer], { type: mime }),
        );
        const accepted: boolean = await ctx.runMutation(
          internal.concepts.internal.saveHarvestImageStage,
          {
            conceptId: args.conceptId,
            expectedHarvestedAt: args.expectedHarvestedAt,
            candidateId: candidate.id,
            storageId,
          },
        );
        if (!accepted) await ctx.storage.delete(storageId);
      } catch (error) {
        await ctx.runMutation(
          internal.concepts.internal.saveHarvestImageStage,
          {
            conceptId: args.conceptId,
            expectedHarvestedAt: args.expectedHarvestedAt,
            candidateId: candidate.id,
            error:
              error instanceof Error
                ? error.message.slice(0, 240)
                : "Image staging failed.",
          },
        );
      }
    }

    // Scheduled rather than called: classification is a separate paid model
    // request, and a failure there must not look like a staging failure or
    // re-run the fetches that already succeeded.
    await ctx.scheduler.runAfter(
      0,
      internal.concepts.imageClassify.classifyWebsiteImages,
      {
        conceptId: args.conceptId,
        expectedHarvestedAt: args.expectedHarvestedAt,
      },
    );

    return null;
  },
});
