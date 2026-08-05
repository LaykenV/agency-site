"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type Props = {
  projectId: Id<"projects">;
};

function formatTs(ms: number | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString();
}

/**
 * Admin panel: issue / list / revoke Hub API credentials.
 * Raw keys are shown exactly once after issue — never re-fetched.
 */
export function ProjectCredentialsPanel({ projectId }: Props) {
  const credentials = useQuery(api.projectCredentials.listForProject, {
    projectId,
  });
  const issue = useMutation(api.projectCredentials.issue);
  const revoke = useMutation(api.projectCredentials.revoke);

  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<"secret" | "publishable">("secret");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** One-time display of the just-issued raw key (cleared on dismiss). */
  const [rawKeyOnce, setRawKeyOnce] = useState<{
    rawKey: string;
    keyId: string;
    kind: "secret" | "publishable";
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleIssue = async () => {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const result = await issue({
        projectId,
        kind,
        ...(label.trim() ? { label: label.trim() } : {}),
      });
      setRawKeyOnce({
        rawKey: result.rawKey,
        keyId: result.keyId,
        kind: result.kind,
      });
      setLabel("");
    } catch (e) {
      console.error("[admin] credential issue failed", e);
      setError(e instanceof Error ? e.message : "Failed to issue credential");
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (credentialId: Id<"project_credentials">, keyId: string) => {
    if (
      !confirm(
        `Revoke key ${keyId}? Client sites using this key will get 401 until you issue a replacement.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await revoke({ credentialId });
    } catch (e) {
      console.error("[admin] credential revoke failed", e);
      setError(e instanceof Error ? e.message : "Failed to revoke credential");
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!rawKeyOnce) return;
    try {
      await navigator.clipboard.writeText(rawKeyOnce.rawKey);
      setCopied(true);
    } catch {
      setError("Could not copy — select and copy the key manually.");
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
          API Credentials
        </label>
        <p className="text-xs text-[var(--muted-foreground)] mb-2">
          Secret keys (<code className="text-[11px]">sk_live_…</code>) authorize{" "}
          <code className="text-[11px]">POST /api/v2/leads</code> from the client
          site&apos;s server Function. Raw keys are shown once at issue — store
          them in the client&apos;s env, never in browser JS.
        </p>
      </div>

      {rawKeyOnce && (
        <div
          role="alert"
          className="rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950/40 p-3 space-y-2"
        >
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            Copy this key now — it will not be shown again
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-200">
            {rawKeyOnce.kind === "secret" ? "Secret" : "Publishable"} · keyId{" "}
            <code>{rawKeyOnce.keyId}</code>
          </p>
          <code className="block break-all rounded bg-white dark:bg-black/40 px-2 py-2 text-xs font-mono text-[var(--foreground)] border border-amber-200 dark:border-amber-800">
            {rawKeyOnce.rawKey}
          </code>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="btn-cta px-3 py-1.5 text-xs"
            >
              {copied ? "Copied" : "Copy key"}
            </button>
            <button
              type="button"
              onClick={() => {
                setRawKeyOnce(null);
                setCopied(false);
              }}
              className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/50"
            >
              I have saved it — dismiss
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1">
          <label className="block text-xs text-[var(--muted-foreground)] mb-1">
            Label (optional)
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
            placeholder="e.g. tb-tree prod"
            className="form-control text-sm"
            disabled={busy}
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted-foreground)] mb-1">
            Kind
          </label>
          <select
            value={kind}
            onChange={(e) =>
              setKind(e.target.value as "secret" | "publishable")
            }
            className="form-control !h-9 !py-1 !text-sm"
            disabled={busy}
          >
            <option value="secret">Secret (sk_live — leads)</option>
            <option value="publishable">Publishable (pk_live — events)</option>
          </select>
        </div>
        <button
          type="button"
          onClick={handleIssue}
          disabled={busy}
          className="btn-cta px-4 py-2 text-sm disabled:opacity-50 whitespace-nowrap"
        >
          {busy ? "Working…" : "Issue key"}
        </button>
      </div>

      {credentials === undefined ? (
        <p className="text-xs text-[var(--muted-foreground)]">Loading credentials…</p>
      ) : credentials.length === 0 ? (
        <p className="text-xs text-[var(--muted-foreground)]">
          No credentials yet. Issue a secret key to unlock{" "}
          <code className="text-[11px]">/api/v2/leads</code>.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[hsl(var(--border))]">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-[hsl(var(--muted)/0.4)] text-left">
                <th className="px-2 py-1.5 font-medium">keyId</th>
                <th className="px-2 py-1.5 font-medium">Kind</th>
                <th className="px-2 py-1.5 font-medium">Label</th>
                <th className="px-2 py-1.5 font-medium">Created</th>
                <th className="px-2 py-1.5 font-medium">Last used</th>
                <th className="px-2 py-1.5 font-medium">Status</th>
                <th className="px-2 py-1.5 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {credentials.map((c) => {
                const isRevoked = Boolean(c.revokedAt);
                return (
                  <tr key={c._id} className={isRevoked ? "opacity-60" : ""}>
                    <td className="px-2 py-1.5 font-mono">{c.keyId}</td>
                    <td className="px-2 py-1.5">
                      {c.kind === "secret" ? "sk" : "pk"}
                    </td>
                    <td className="px-2 py-1.5">{c.label || "—"}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      {formatTs(c.createdAt)}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      {formatTs(c.lastUsedAt)}
                    </td>
                    <td className="px-2 py-1.5">
                      {isRevoked ? (
                        <span className="text-red-600">Revoked</span>
                      ) : (
                        <span className="text-emerald-600">Active</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {!isRevoked && (
                        <button
                          type="button"
                          onClick={() => handleRevoke(c._id, c.keyId)}
                          disabled={busy}
                          className="text-red-600 hover:underline disabled:opacity-50"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
