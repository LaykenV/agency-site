"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  describePricing,
  formatUsd,
  type OrderFormSpec,
} from "@/lib/legal/orderForm";

type Props = {
  projectId: Id<"projects">;
};

function formatTs(ms: number | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString();
}

const linesToList = (value: string): Array<string> =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

const listToLines = (items: Array<string>): string => items.join("\n");

/** Dollars in the UI, cents in the document. */
const dollarsToCents = (value: string): number => {
  const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
};

const centsToDollars = (cents: number): string =>
  (cents / 100).toFixed(2).replace(/\.00$/, "");

/**
 * Admin panel: author and issue a project's order form.
 *
 * The MSA is universal and versioned in code. This is where the commercial
 * terms of one engagement are written. Issued rows are immutable. Before the
 * client signs, replace one by drafting and issuing a new version. After a
 * signature, replacement is blocked until a separate re-acceptance flow exists.
 */
export function OrderFormPanel({ projectId }: Props) {
  const orderForms = useQuery(api.orderForms.listForProject, { projectId });
  const saveDraft = useMutation(api.orderForms.saveDraft);
  const issue = useMutation(api.orderForms.issue);
  const deleteDraft = useMutation(api.orderForms.deleteDraft);
  const createDraftFromDefault = useMutation(api.orderForms.createDraftFromDefault);

  const [editingId, setEditingId] = useState<Id<"order_forms"> | null>(null);
  const [draft, setDraft] = useState<OrderFormSpec | null>(null);
  const [stripePriceId, setStripePriceId] = useState("");
  const [setupStripePriceId, setSetupStripePriceId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const issued = orderForms?.find((row) => row.status === "issued") ?? null;
  const drafts = orderForms?.filter((row) => row.status === "draft") ?? [];

  const beginEdit = (
    id: Id<"order_forms">,
    spec: OrderFormSpec,
    existingStripePriceId?: string,
    existingSetupStripePriceId?: string,
  ) => {
    setEditingId(id);
    setDraft({ ...spec, pricing: { ...spec.pricing } });
    setStripePriceId(existingStripePriceId ?? "");
    setSetupStripePriceId(existingSetupStripePriceId ?? "");
    setError(null);
    setNotice(null);
  };

  const handleNewDraft = async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await createDraftFromDefault({ projectId });
      beginEdit(
        created.orderFormId,
        created.spec,
        created.stripePriceId,
        created.setupStripePriceId,
      );
      setNotice("Draft created. Edit the terms, then issue it.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create draft");
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!editingId || !draft) return;
    setBusy(true);
    setError(null);
    try {
      await saveDraft({
        projectId,
        orderFormId: editingId,
        spec: draft,
        stripePriceId:
          draft.pricing.collectionMethod === "stripe_checkout"
            ? stripePriceId
            : undefined,
        setupStripePriceId:
          draft.pricing.collectionMethod === "stripe_checkout" &&
          draft.pricing.setupFeeCents > 0
            ? setupStripePriceId
            : undefined,
      });
      setNotice("Draft saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save draft");
    } finally {
      setBusy(false);
    }
  };

  const handleIssue = async (orderFormId: Id<"order_forms">) => {
    if (
      !confirm(
        "Issue this Order Form? It becomes immutable, supersedes the current unsigned version, and is what the client will accept on the agreement page.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await issue({ orderFormId });
      setEditingId(null);
      setDraft(null);
      setStripePriceId("");
      setSetupStripePriceId("");
      setNotice(`Issued version ${result.version} (${result.issuedHash.slice(0, 12)}…).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to issue order form");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (orderFormId: Id<"order_forms">) => {
    if (!confirm("Delete this draft?")) return;
    setBusy(true);
    setError(null);
    try {
      await deleteDraft({ orderFormId });
      if (editingId === orderFormId) {
        setEditingId(null);
        setDraft(null);
        setStripePriceId("");
        setSetupStripePriceId("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete draft");
    } finally {
      setBusy(false);
    }
  };

  const updateSpec = <K extends keyof OrderFormSpec>(key: K, value: OrderFormSpec[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const updatePricing = <K extends keyof OrderFormSpec["pricing"]>(
    key: K,
    value: OrderFormSpec["pricing"][K],
  ) => {
    setDraft((current) =>
      current ? { ...current, pricing: { ...current.pricing, [key]: value } } : current,
    );
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
          Order Form
        </label>
        <p className="text-xs text-[var(--muted-foreground)] mb-2">
          Price, term, scope, and what the client owns at the end. The universal MSA is
          versioned in code; this is the per-project half. Replace an unsigned version
          with a new draft; signed changes require a new acceptance workflow.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {notice && <p className="text-sm text-emerald-600">{notice}</p>}

      {orderForms === undefined ? (
        <p className="text-xs text-[var(--muted-foreground)]">Loading order forms…</p>
      ) : (
        <>
          <div className="rounded-md border border-[hsl(var(--border))] p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Currently issued
            </p>
            {issued ? (
              <div className="mt-2 space-y-1 text-xs">
                <p className="text-sm font-medium text-[var(--foreground)]">
                  v{issued.version} — {issued.spec.title}
                </p>
                <p className="text-[var(--muted-foreground)]">
                  {describePricing(issued.spec.pricing)}
                </p>
                <p className="text-[var(--muted-foreground)]">
                  Issued {formatTs(issued.issuedAt)} · MSA {issued.msaVersion} ·{" "}
                  {issued.authoredBy === "system" ? "standard draft issued by admin" : "admin-authored"}
                </p>
                <p className="font-mono text-[11px] text-[var(--muted-foreground)] break-all">
                  {issued.issuedHash ?? "—"}
                </p>
                <p className="text-[var(--muted-foreground)]">
                  Payment: {issued.spec.pricing.collectionMethod === "stripe_checkout"
                    ? `Stripe Checkout · recurring ${issued.stripePriceId ?? "missing Price ID"}${issued.spec.pricing.setupFeeCents > 0 ? ` · setup ${issued.setupStripePriceId ?? "missing Price ID"}` : ""}`
                    : "Manual invoice"}
                </p>
                <p className="text-[var(--muted-foreground)]">
                  Ownership:{" "}
                  {issued.spec.assignedDeliverables.length > 0
                    ? "assigned on final payment"
                    : "licensed during subscription"}
                </p>
                {issued.spec.pricing.setupFeeCents > 0 && (
                  <p className="text-[var(--muted-foreground)]">
                    The {formatUsd(issued.spec.pricing.setupFeeCents)} setup fee is charged
                    on the initial Checkout invoice.
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                None. The client cannot accept an agreement until one is issued.
              </p>
            )}
          </div>

          {drafts.length > 0 && (
            <div className="rounded-md border border-[hsl(var(--border))] p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Drafts
              </p>
              {drafts.map((row) => (
                <div
                  key={row._id}
                  className="flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <span className="text-[var(--foreground)]">
                    v{row.version} — {row.spec.title} · updated {formatTs(row.updatedAt)}
                  </span>
                  <span className="flex gap-2">
                    <button
                      type="button"
                      className="text-[var(--primary)] hover:underline disabled:opacity-50"
                      disabled={busy}
                      onClick={() =>
                        beginEdit(
                          row._id,
                          row.spec,
                          row.stripePriceId,
                          row.setupStripePriceId,
                        )
                      }
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-emerald-600 hover:underline disabled:opacity-50"
                      disabled={busy}
                      onClick={() => handleIssue(row._id)}
                    >
                      Issue
                    </button>
                    <button
                      type="button"
                      className="text-red-600 hover:underline disabled:opacity-50"
                      disabled={busy}
                      onClick={() => handleDelete(row._id)}
                    >
                      Delete
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}

          {!editingId && (
            <button
              type="button"
              onClick={handleNewDraft}
              disabled={busy}
              className="btn-cta px-4 py-2 text-sm disabled:opacity-50"
            >
              {busy ? "Working…" : issued ? "Draft a replacement" : "Draft an order form"}
            </button>
          )}

          {editingId && draft && (
            <div className="rounded-md border border-[hsl(var(--border))] p-3 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Editing draft
              </p>

              <div className="grid gap-2 sm:grid-cols-3">
                <label className="block text-xs text-[var(--muted-foreground)]">
                  Title
                  <input
                    type="text"
                    className="form-control text-sm mt-1"
                    value={draft.title}
                    onChange={(e) => updateSpec("title", e.target.value)}
                  />
                </label>
                <label className="block text-xs text-[var(--muted-foreground)]">
                  Engagement type
                  <input
                    type="text"
                    className="form-control text-sm mt-1"
                    value={draft.engagementType}
                    placeholder="waas_local | mobile_app | idx_website"
                    onChange={(e) => updateSpec("engagementType", e.target.value)}
                  />
                </label>
              </div>

              <label className="block text-xs text-[var(--muted-foreground)]">
                Summary
                <textarea
                  className="form-control text-sm mt-1"
                  rows={2}
                  value={draft.summary}
                  onChange={(e) => updateSpec("summary", e.target.value)}
                />
              </label>

              <div className="grid gap-2 sm:grid-cols-3">
                <label className="block text-xs text-[var(--muted-foreground)]">
                  Deposit / setup ($)
                  <input
                    type="text"
                    inputMode="decimal"
                    className="form-control text-sm mt-1"
                    value={centsToDollars(draft.pricing.setupFeeCents)}
                    onChange={(e) =>
                      updatePricing("setupFeeCents", dollarsToCents(e.target.value))
                    }
                  />
                </label>
                <label className="block text-xs text-[var(--muted-foreground)]">
                  Monthly ($)
                  <input
                    type="text"
                    inputMode="decimal"
                    className="form-control text-sm mt-1"
                    value={centsToDollars(draft.pricing.monthlyCents)}
                    onChange={(e) =>
                      updatePricing("monthlyCents", dollarsToCents(e.target.value))
                    }
                  />
                </label>
                <label className="block text-xs text-[var(--muted-foreground)]">
                  Minimum term (mo)
                  <input
                    type="number"
                    min={0}
                    className="form-control text-sm mt-1"
                    value={draft.pricing.minimumTermMonths}
                    onChange={(e) =>
                      updatePricing(
                        "minimumTermMonths",
                        Math.max(0, Number.parseInt(e.target.value, 10) || 0),
                      )
                    }
                  />
                </label>
                <label className="block text-xs text-[var(--muted-foreground)]">
                  Cancel notice (days)
                  <input
                    type="number"
                    min={0}
                    className="form-control text-sm mt-1"
                    value={draft.pricing.cancellationNoticeDays}
                    onChange={(e) =>
                      updatePricing(
                        "cancellationNoticeDays",
                        Math.max(0, Number.parseInt(e.target.value, 10) || 0),
                      )
                    }
                  />
                </label>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block text-xs text-[var(--muted-foreground)]">
                  Payment collection
                  <select
                    className="form-control text-sm mt-1"
                    value={draft.pricing.collectionMethod}
                    onChange={(e) =>
                      updatePricing(
                        "collectionMethod",
                        e.target.value as OrderFormSpec["pricing"]["collectionMethod"],
                      )
                    }
                  >
                    <option value="stripe_checkout">Stripe subscription checkout</option>
                    <option value="manual_invoice">Manual invoice</option>
                  </select>
                </label>
                {draft.pricing.collectionMethod === "stripe_checkout" && (
                  <label className="block text-xs text-[var(--muted-foreground)]">
                    Recurring Stripe Price ID
                    <input
                      type="text"
                      className="form-control text-sm mt-1 font-mono"
                      value={stripePriceId}
                      placeholder="price_..."
                      onChange={(e) => setStripePriceId(e.target.value.trim())}
                    />
                  </label>
                )}
                {draft.pricing.collectionMethod === "stripe_checkout" &&
                  draft.pricing.setupFeeCents > 0 && (
                    <label className="block text-xs text-[var(--muted-foreground)]">
                      One-time setup Stripe Price ID
                      <input
                        type="text"
                        className="form-control text-sm mt-1 font-mono"
                        value={setupStripePriceId}
                        placeholder="price_..."
                        onChange={(e) => setSetupStripePriceId(e.target.value.trim())}
                      />
                    </label>
                  )}
              </div>

              {draft.pricing.collectionMethod === "stripe_checkout" &&
                draft.pricing.setupFeeCents > 0 && (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Checkout charges the one-time setup Price on the initial invoice and the
                    recurring Price now and on future monthly invoices.
                  </p>
                )}

              <p className="text-xs text-[var(--muted-foreground)]">
                Reads as: {describePricing(draft.pricing)}
              </p>

              {(
                [
                  ["scope", "Scope of work"],
                  ["deliverables", "Deliverables"],
                  ["assignedDeliverables", "Assigned deliverables (owned by client on final payment)"],
                  ["acceptanceCriteria", "Acceptance criteria"],
                  ["exclusions", "Out of scope"],
                  ["clientDependencies", "Client dependencies"],
                ] as Array<[keyof OrderFormSpec, string]>
              ).map(([key, label]) => (
                <label key={key} className="block text-xs text-[var(--muted-foreground)]">
                  {label} — one per line
                  <textarea
                    className="form-control text-sm mt-1 font-mono"
                    rows={4}
                    value={listToLines(draft[key] as Array<string>)}
                    onChange={(e) =>
                      updateSpec(key, linesToList(e.target.value) as never)
                    }
                  />
                </label>
              ))}

              <label className="block text-xs text-[var(--muted-foreground)]">
                Additional terms (optional)
                <textarea
                  className="form-control text-sm mt-1"
                  rows={2}
                  value={draft.notes ?? ""}
                  onChange={(e) => updateSpec("notes", e.target.value)}
                />
              </label>

              <p className="text-xs text-[var(--muted-foreground)]">
                Leave <em>assigned deliverables</em> empty for subscription work — the client
                then holds a license during the subscription instead of owning the build.
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={busy}
                  className="btn-cta px-4 py-2 text-sm disabled:opacity-50"
                >
                  {busy ? "Working…" : "Save draft"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!draft) return;
                    setBusy(true);
                    setError(null);
                    try {
                      await saveDraft({
                        projectId,
                        orderFormId: editingId,
                        spec: draft,
                        stripePriceId:
                          draft.pricing.collectionMethod === "stripe_checkout"
                            ? stripePriceId
                            : undefined,
                        setupStripePriceId:
                          draft.pricing.collectionMethod === "stripe_checkout" &&
                          draft.pricing.setupFeeCents > 0
                            ? setupStripePriceId
                            : undefined,
                      });
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Failed to save draft");
                      setBusy(false);
                      return;
                    }
                    setBusy(false);
                    await handleIssue(editingId);
                  }}
                  disabled={busy}
                  className="rounded-md border border-emerald-500 px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                >
                  Save &amp; issue
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setDraft(null);
                    setStripePriceId("");
                    setSetupStripePriceId("");
                  }}
                  disabled={busy}
                  className="rounded-md border border-[hsl(var(--border))] px-4 py-2 text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                &ldquo;Save &amp; issue&rdquo; saves the current fields, validates them, and then
                makes this version available for client acceptance.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
