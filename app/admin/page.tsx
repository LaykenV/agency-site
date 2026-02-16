"use client";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation, useConvex } from "convex/react";
import { useState, useEffect, Fragment, useMemo, useRef } from "react";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import Image from "next/image";
import { SectionHeader } from "@/components/SectionHeader";
import { clsx } from "clsx";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StickyAuth } from "@/components/StickyAuth";

type ProspectDetails = Doc<"prospects">["details"];

const emptyDetails: ProspectDetails = {
  contactName: "",
  contactEmail: "",
  companyName: "",
  phone: "",
  currentWebsite: "",
  businessDescription: "",
  prospectNotes: "",
  myNotes: "",
};

type Tab = "prospects" | "projects" | "calls" | "requests" | "activity";

const PROJECT_STATUSES = [
  "AWAITING_AGREEMENT",
  "AWAITING_PAYMENT",
  "AWAITING_ASSETS",
  "IN_PROGRESS",
  "IN_REVIEW",
  "LIVE",
  "ARCHIVED",
] as const;

const EDIT_REQUEST_STATUSES = [
  "open",
  "in_progress",
  "waiting_on_client",
  "resolved",
  "closed",
] as const;

const PRIORITIES = ["low", "normal", "high"] as const;

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("prospects");

  return (
    <StickyAuth
      loadingFallback={
        <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-sm text-gray-500">
            <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
            <p>Loading...</p>
          </div>
        </div>
      }
      unauthenticatedFallback={
        <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please sign in to access admin</h1>
            <p className="text-gray-500">You must be authenticated to view this page.</p>
          </div>
        </div>
      }
    >
      <div className="min-h-screen px-4 sm:px-6 md:px-8 py-6 md:py-8 relative">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <SectionHeader as="h1" align="left" size="md" className="max-w-none mx-0">Admin</SectionHeader>
              <Link
                href="/admin/marketing"
                className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Marketing Pipeline
              </Link>
            </div>

            {/* Underline Tabs */}
            <div className="mb-6 border-b border-[hsl(var(--border))]">
              <nav className="flex gap-4 md:gap-6 overflow-x-auto" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab("prospects")}
                  className={clsx(
                    "px-1.5 py-3 text-sm font-semibold -mb-px border-b-2",
                    activeTab === "prospects"
                      ? "border-[hsl(var(--primary))] text-[var(--foreground)]"
                      : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  )}
                >
                  Prospects
                </button>
                <button
                  onClick={() => setActiveTab("projects")}
                  className={clsx(
                    "px-1.5 py-3 text-sm font-semibold -mb-px border-b-2",
                    activeTab === "projects"
                      ? "border-[hsl(var(--primary))] text-[var(--foreground)]"
                      : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  )}
                >
                  Projects
                </button>
                <button
                  onClick={() => setActiveTab("calls")}
                  className={clsx(
                    "px-1.5 py-3 text-sm font-semibold -mb-px border-b-2",
                    activeTab === "calls"
                      ? "border-[hsl(var(--primary))] text-[var(--foreground)]"
                      : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  )}
                >
                  Scheduled Calls
                </button>
                <button
                  onClick={() => setActiveTab("requests")}
                  className={clsx(
                    "px-1.5 py-3 text-sm font-semibold -mb-px border-b-2",
                    activeTab === "requests"
                      ? "border-[hsl(var(--primary))] text-[var(--foreground)]"
                      : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  )}
                >
                  Edit Requests
                </button>
                <button
                  onClick={() => setActiveTab("activity")}
                  className={clsx(
                    "px-1.5 py-3 text-sm font-semibold -mb-px border-b-2",
                    activeTab === "activity"
                      ? "border-[hsl(var(--primary))] text-[var(--foreground)]"
                      : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  )}
                >
                  Activity
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === "prospects" && <ProspectsTab />}
            {activeTab === "projects" && <ProjectsTab />}
            {activeTab === "calls" && <ScheduledCallsTab />}
            {activeTab === "requests" && <EditRequestsTab />}
            {activeTab === "activity" && <ActivityLogTab />}
          </div>
        </div>
    </StickyAuth>
  );
}

function ProspectsTab() {
  const prospects = useQuery(api.admin.listProspects);
  const createProspect = useMutation(api.admin.createProspect);
  const updateProspect = useMutation(api.admin.updateProspectDetails);
  const logMagicLinkSent = useMutation(api.admin.logMagicLinkSent);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProspectId, setEditingProspectId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProspectDetails>(emptyDetails);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  
  // State for duplicate warning confirmation
  const [duplicateWarning, setDuplicateWarning] = useState<{
    show: boolean;
    existingProspect: { companyName: string; createdAt: number } | null;
    existingProject: { projectId: string; projectStatus?: string } | null;
  }>({ show: false, existingProspect: null, existingProject: null });

  useEffect(() => {
    const interval = setInterval(() => {
      setCooldowns((prev) => {
        const updated = { ...prev };
        let hasChanges = false;
        for (const key in updated) {
          if (updated[key] > 0) {
            updated[key] -= 1;
            hasChanges = true;
          }
        }
        return hasChanges ? updated : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateNew = () => {
    setFormData(emptyDetails);
    setEditingProspectId(null);
    setShowCreateForm(true);
  };

  const handleEdit = (prospect: Doc<"prospects">) => {
    setFormData(prospect.details);
    setEditingProspectId(prospect._id);
    setShowCreateForm(true);
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingProspectId(null);
    setFormData(emptyDetails);
  };

  const convex = useConvex();

  // Proceed with creation after user confirms (or if no duplicate)
  const proceedWithCreate = async () => {
    setIsSubmitting(true);
    setDuplicateWarning({ show: false, existingProspect: null, existingProject: null });
    try {
      await createProspect({ details: formData });
      handleCancel();
    } catch (error) {
      console.error("Error creating prospect:", error);
      alert("Failed to create prospect. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingProspectId) {
        // Editing existing prospect - no duplicate check needed
        await updateProspect({
          prospectId: editingProspectId as Id<"prospects">,
          details: formData,
        });
        setIsSubmitting(false);
        handleCancel();
      } else {
        // Creating new prospect - check for duplicates first
        const existing = await convex.query(api.admin.checkExistingByEmail, {
          email: formData.contactEmail,
        });

        if (existing.hasExisting) {
          // Show warning dialog
          setDuplicateWarning({
            show: true,
            existingProspect: existing.existingProspect,
            existingProject: existing.existingProject,
          });
          setIsSubmitting(false);
          return;
        }

        // No duplicates, proceed with creation
        await proceedWithCreate();
      }
    } catch (error) {
      console.error("Error saving prospect:", error);
      alert("Failed to save prospect. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: keyof ProspectDetails
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleSendMagicLink = async (prospect: Doc<"prospects">) => {
    const cooldownKey = prospect._id;
    if (cooldowns[cooldownKey] && cooldowns[cooldownKey] > 0) {
      return;
    }

    try {
      setCooldowns((prev) => ({ ...prev, [cooldownKey]: 60 }));

      await authClient.signIn.magicLink(
        {
          email: prospect.details.contactEmail,
          name: prospect.details.contactName,
          callbackURL: `/portal/verify?sid=${prospect.sessionId}`,
          newUserCallbackURL: `/portal/verify?sid=${prospect.sessionId}`,
          errorCallbackURL: `/portal/autherror?sid=${prospect.sessionId}&error=magic_link`,
        },
        {
          onError: async (ctx) => {
            if (ctx.response.status === 429) {
              const retryAfter = ctx.response.headers.get("X-Retry-After");
              const waitTime = retryAfter ? `${retryAfter} seconds` : "a moment";
              alert(`Too many requests. Please try again in ${waitTime}.`);
              if (retryAfter) {
                setCooldowns((prev) => ({
                  ...prev,
                  [cooldownKey]: parseInt(retryAfter, 10),
                }));
              }
            } else {
              alert("Failed to send magic link. Please try again.");
            }
          },
        }
      );

      await logMagicLinkSent({
        prospectId: prospect._id,
        email: prospect.details.contactEmail,
      });

      alert("Magic link sent successfully!");
    } catch (error) {
      console.error("Failed to send magic link:", error);
      setCooldowns((prev) => ({ ...prev, [cooldownKey]: 0 }));
      alert("Failed to send magic link. Please try again.");
    }
  };

  if (prospects === undefined) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        <p className="mt-4 text-gray-500">Loading prospects...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-[var(--foreground)]">Prospects</h2>
        <button
          onClick={handleCreateNew}
          className="btn-cta px-6 py-2"
        >
          + Add New Prospect
        </button>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[hsl(var(--background)/0.6)] dark:bg-black/50 backdrop-blur-sm">
          <div className="surface-elevated rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
                  <h2 className="text-xl md:text-2xl font-bold text-[var(--foreground)] mb-2">
                {editingProspectId ? "Edit Prospect" : "Create New Prospect"}
              </h2>

                  <div className="surface rounded-lg p-4 sm:p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                <div>
                      <Label className="mb-1 text-[var(--foreground)]">Contact Name *</Label>
                      <Input
                    value={formData.contactName}
                    onChange={(e) => handleInputChange(e, "contactName")}
                    required
                  />
                </div>
                <div>
                      <Label className="mb-1 text-[var(--foreground)]">Email *</Label>
                      <Input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => handleInputChange(e, "contactEmail")}
                    required
                  />
                </div>
                <div>
                      <Label className="mb-1 text-[var(--foreground)]">Company Name *</Label>
                      <Input
                    value={formData.companyName}
                    onChange={(e) => handleInputChange(e, "companyName")}
                    required
                  />
                </div>
                <div>
                      <Label className="mb-1 text-[var(--foreground)]">Phone</Label>
                      <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange(e, "phone")}
                  />
                </div>
                    <div className="md:col-span-2">
                      <Label className="mb-1 text-[var(--foreground)]">Website</Label>
                      <Input
                    type="url"
                    value={formData.currentWebsite}
                    onChange={(e) => handleInputChange(e, "currentWebsite")}
                  />
                </div>
                    <div className="md:col-span-2">
                      <Label className="mb-1 text-[var(--foreground)]">Business Description *</Label>
                      <Textarea
                    value={formData.businessDescription}
                    onChange={(e) => handleInputChange(e, "businessDescription")}
                    required
                    rows={3}
                  />
                </div>
                    <div className="md:col-span-2">
                      <Label className="mb-1 text-[var(--foreground)]">Prospect Notes</Label>
                      <Textarea
                    value={formData.prospectNotes}
                    onChange={(e) => handleInputChange(e, "prospectNotes")}
                    rows={2}
                  />
                </div>
                    <div className="md:col-span-2">
                      <Label className="mb-1 text-[var(--foreground)]">Prospect My Notes (private)</Label>
                      <Textarea
                    value={formData.myNotes || ""}
                    onChange={(e) => handleInputChange(e, "myNotes")}
                    rows={2}
                    placeholder="Admin-only notes (not visible to client)"
                  />
                </div>
                    </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="flex-1 btn-outline-strong"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 btn-cta"
                >
                  {isSubmitting ? "Saving..." : editingProspectId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Duplicate Warning Dialog */}
      {duplicateWarning.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[hsl(var(--background)/0.6)] dark:bg-black/50 backdrop-blur-sm">
          <div className="surface-elevated rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
              ⚠️ Existing Record Found
            </h3>
            <div className="space-y-3 text-sm text-[var(--muted-foreground)] mb-6">
              <p>A prospect or project already exists for this email:</p>
              {duplicateWarning.existingProspect && (
                <div className="surface rounded-lg p-3">
                  <p className="font-medium text-[var(--foreground)]">Existing Prospect</p>
                  <p>Company: {duplicateWarning.existingProspect.companyName}</p>
                  <p>Created: {new Date(duplicateWarning.existingProspect.createdAt).toLocaleDateString()}</p>
                </div>
              )}
              {duplicateWarning.existingProject && (
                <div className="surface rounded-lg p-3">
                  <p className="font-medium text-[var(--foreground)]">Existing Project</p>
                  <p>Status: {duplicateWarning.existingProject.projectStatus ?? "Unknown"}</p>
                </div>
              )}
              <p className="text-amber-600 dark:text-amber-400">
                Creating another prospect may cause confusion. Are you sure you want to proceed?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDuplicateWarning({ show: false, existingProspect: null, existingProject: null })}
                className="flex-1 btn-outline-strong"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={proceedWithCreate}
                disabled={isSubmitting}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {isSubmitting ? "Creating..." : "Create Anyway"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {prospects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--muted-foreground)] text-lg">No prospects yet</p>
            <button
              onClick={handleCreateNew}
              className="mt-4 btn-secondary px-4 py-2"
            >
              Create the first one →
            </button>
          </div>
        ) : (
          prospects.map((prospect) => (
            <div
              key={prospect.sessionId}
              className="surface rounded-xl p-6 transition"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--foreground)]">
                    {prospect.details.contactName}
                  </h2>
                  <p className="text-sm text-[var(--muted-foreground)]">{prospect.sessionId}</p>
                </div>
                <div className="text-right flex gap-2 justify-end">
                  <button
                    onClick={() => handleSendMagicLink(prospect)}
                    disabled={cooldowns[prospect._id] > 0}
                    className="btn-cta px-4 py-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cooldowns[prospect._id] > 0
                      ? `Wait ${cooldowns[prospect._id]}s`
                      : "Send Magic Link"}
                  </button>
                  <button
                    onClick={() => handleEdit(prospect)}
                    className="btn-secondary px-4 py-2 transition"
                  >
                    Edit
                  </button>
                  <p className="text-sm font-medium text-[var(--muted-foreground)] self-center">
                    {prospect.planGenerationInProgress
                      ? "🔄 Generating Plan..."
                      : "✓ Ready"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 border-t pt-4">
                <div>
                  <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase">Company</p>
                  <p className="text-sm text-[var(--foreground)]">{prospect.details.companyName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase">Email</p>
                  <p className="text-sm text-[var(--foreground)]">{prospect.details.contactEmail}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase">Phone</p>
                  <p className="text-sm text-[var(--foreground)]">{prospect.details.phone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase">Website</p>
                  <p className="text-sm text-[var(--foreground)]">{prospect.details.currentWebsite || "N/A"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase">Business Description</p>
                  <p className="text-sm text-[var(--foreground)]">{prospect.details.businessDescription}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 border-t pt-4">
                <div>
                  <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase">Prospect Notes</p>
                  <p className="text-sm text-[var(--foreground)]">{prospect.details.prospectNotes || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase">Prospect My Notes (private)</p>
                  <p className="text-sm text-[var(--foreground)]">{prospect.details.myNotes || "N/A"}</p>
                </div>
              </div>

              {prospect.aiGeneratedPlan && (
                <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
                  <p className="text-sm font-semibold text-blue-900 mb-2">📋 Generated Plan</p>
                  <div className="space-y-2 text-sm text-blue-800">
                    <p>
                      <span className="font-semibold">Headline:</span> {prospect.aiGeneratedPlan.headline}
                    </p>
                    <p>
                      <span className="font-semibold">Summary:</span> {prospect.aiGeneratedPlan.summary}
                    </p>
                    <div>
                      <span className="font-semibold">Highlights:</span>
                      <ul className="list-disc list-inside mt-1">
                        {prospect.aiGeneratedPlan.highlights.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="font-semibold">Next Steps:</span>
                      <ul className="list-disc list-inside mt-1">
                        {prospect.aiGeneratedPlan.nextSteps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs text-gray-500 border-t pt-4">
                <div>
                  <p className="font-semibold">Created</p>
                  <p>{new Date(prospect.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="font-semibold">Updated</p>
                  <p>{new Date(prospect.updatedAt).toLocaleDateString()}</p>
                </div>
                {prospect.calProspectBooking && (
                  <div>
                    <p className="font-semibold">Booking</p>
                    <p>{new Date(prospect.calProspectBooking.scheduledAt).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ProjectsTab() {
  const projects = useQuery(api.admin.listProjects);
  const updateProjectStatus = useMutation(api.admin.updateProjectStatus);
  const updateProjectMyNotes = useMutation(api.admin.updateProjectMyNotes);
  const updateDeployment = useMutation(api.admin.updateDeployment);

  const [expandedProjectId, setExpandedProjectId] = useState<Id<"projects"> | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [editingDeployment, setEditingDeployment] = useState<Record<string, { liveUrl?: string; stagingUrl?: string; vercelProjectId?: string }>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [cachedFileUrls, setCachedFileUrls] = useState<Record<Id<"projects">, Record<Id<"_storage">, string>>>({});

  // Helper component to fetch and cache URLs for a project
  const ProjectFileUrlsFetcher = ({ projectId, storageIds }: { projectId: Id<"projects">; storageIds: Id<"_storage">[] }) => {
    const urls = useQuery(
      api.admin.getProjectFileUrls,
      storageIds.length > 0 ? { projectId, storageIds } : "skip"
    );

    const hasSetUrlsRef = useRef(false);
    
    useEffect(() => {
      // Only set URLs once when they're first fetched
      if (urls && !hasSetUrlsRef.current) {
        hasSetUrlsRef.current = true;
        setCachedFileUrls(prev => {
          // Only update if we don't already have URLs for this project
          if (prev[projectId]) {
            return prev;
          }
          return {
            ...prev,
            [projectId]: urls,
          };
        });
      }
    }, [projectId, urls]);

    return null;
  };

  if (projects === undefined) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        <p className="mt-4 text-gray-500">Loading projects...</p>
      </div>
    );
  }

  const handleStatusChange = async (projectId: Id<"projects">, status: typeof PROJECT_STATUSES[number]) => {
    setSaving(prev => ({ ...prev, [projectId]: true }));
    try {
      await updateProjectStatus({ projectId, status });
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update project status. Please try again.");
    } finally {
      setSaving(prev => ({ ...prev, [projectId]: false }));
    }
  };

  const handleNotesSave = async (projectId: Id<"projects">) => {
    setSaving(prev => ({ ...prev, [`notes-${projectId}`]: true }));
    try {
      await updateProjectMyNotes({ projectId, myNotes: editingNotes[projectId] || null });
      setEditingNotes(prev => {
        const updated = { ...prev };
        delete updated[projectId];
        return updated;
      });
    } catch (error) {
      console.error("Failed to update notes:", error);
      alert("Failed to update notes. Please try again.");
    } finally {
      setSaving(prev => ({ ...prev, [`notes-${projectId}`]: false }));
    }
  };

  const handleDeploymentSave = async (projectId: Id<"projects">) => {
    setSaving(prev => ({ ...prev, [`deploy-${projectId}`]: true }));
    try {
      const deployment = editingDeployment[projectId];
      await updateDeployment({
        projectId,
        liveUrl: deployment?.liveUrl,
        stagingUrl: deployment?.stagingUrl,
        vercelProjectId: deployment?.vercelProjectId,
      });
      setEditingDeployment(prev => {
        const updated = { ...prev };
        delete updated[projectId];
        return updated;
      });
    } catch (error) {
      console.error("Failed to update deployment:", error);
      alert("Failed to update deployment. Please try again.");
    } finally {
      setSaving(prev => ({ ...prev, [`deploy-${projectId}`]: false }));
    }
  };


  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Projects</h2>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--muted-foreground)] text-lg">No projects yet</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {projects.map((project) => (
              <div key={project._id} className="surface rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/portal/${project.projectId}`} className="text-[hsl(var(--primary))] font-medium">
                      {project.projectId.slice(0, 8)}...
                    </Link>
                    {project.prospect && (
                      <div className="mt-1">
                        <p className="text-sm font-medium text-[var(--foreground)]">{project.prospect.contactName}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{project.prospect.contactEmail}</p>
                      </div>
                    )}
                  </div>
                  <select
                    value={project.projectStatus || ""}
                    onChange={(e) => handleStatusChange(project._id, e.target.value as typeof PROJECT_STATUSES[number])}
                    disabled={saving[project._id]}
                    className="form-control !h-8 !py-1 !text-sm disabled:opacity-50"
                  >
                    {PROJECT_STATUSES.map(s => (
                      <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-2 text-sm">
                  <div className="text-[var(--muted-foreground)]">
                    <span className="text-[var(--muted-foreground)]">Headline:</span>{" "}
                    <span className="text-[var(--foreground)]">{project.buildDetails?.headline || "-"}</span>
                  </div>
                  <div className="mt-1">
                    <span className="text-[var(--muted-foreground)]">Assets:</span>{" "}
                    {project.buildDetails?.brandAssetsUploaded ? (
                      <span className="text-emerald-600">✓</span>
                    ) : (
                      <span className="text-[var(--muted-foreground)]">-</span>
                    )}
                  </div>
                  <div className="mt-1">
                    <span className="text-[var(--muted-foreground)]">Updated:</span>{" "}
                    <span className="text-[var(--foreground)]">
                      {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : "-"}
                    </span>
                  </div>
                  {(project.deployment?.liveUrl || project.deployment?.stagingUrl) && (
                    <div className="mt-1 space-y-1">
                      {project.deployment?.liveUrl && (() => {
                        const url = project.deployment.liveUrl!;
                        const absoluteUrl = url.startsWith("http") ? url : `https://${url}`;
                        return (
                          <div>
                            <span className="text-[var(--muted-foreground)]">Live:</span>{" "}
                            <a href={absoluteUrl} target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--primary))] hover:underline">
                              {url.slice(0, 24)}...
                            </a>
                          </div>
                        );
                      })()}
                      {project.deployment?.stagingUrl && (() => {
                        const url = project.deployment.stagingUrl!;
                        const absoluteUrl = url.startsWith("http") ? url : `https://${url}`;
                        return (
                          <div>
                            <span className="text-[var(--muted-foreground)]">Staging:</span>{" "}
                            <a href={absoluteUrl} target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--primary))] hover:underline">
                              {url.slice(0, 24)}...
                            </a>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <button
                    onClick={() => setExpandedProjectId(expandedProjectId === project._id ? null : project._id)}
                    className="text-[hsl(var(--primary))] text-sm font-medium"
                  >
                    {expandedProjectId === project._id ? "Hide" : "Manage"}
                  </button>
                </div>
                {expandedProjectId === project._id && (() => {
                  const storageIds: Id<"_storage">[] = [];
                  if (project.buildDetails?.brand?.logoStorageId) {
                    storageIds.push(project.buildDetails.brand.logoStorageId);
                  }
                  if (project.buildDetails?.brand?.imageStorageIds) {
                    storageIds.push(...project.buildDetails.brand.imageStorageIds);
                  }
                  return (
                    <div className="mt-3 border-t pt-3 space-y-4">
                      {storageIds.length > 0 && (
                        <ProjectFileUrlsFetcher projectId={project._id} storageIds={storageIds} />
                      )}
                      {project.buildDetails && (
                        <div>
                          <label className="block text-sm font-medium text-[var(--foreground)] mb-3">Build Details</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                            <div>
                              <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase mb-1">Headline</p>
                              <p className="text-sm text-[var(--foreground)]">{project.buildDetails.headline || "-"}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase mb-1">Domain Preference</p>
                              <p className="text-sm text-[var(--foreground)]">{project.buildDetails.domainPreference || "-"}</p>
                            </div>
                          </div>
                          {(project.buildDetails.brand.logoStorageId || (project.buildDetails.brand.imageStorageIds && project.buildDetails.brand.imageStorageIds.length > 0)) && (
                            <div className="mt-2">
                              <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase mb-2">Brand Assets</p>
                              <div className="flex flex-wrap gap-2">
                                {project.buildDetails.brand.logoStorageId && (() => {
                                  const logoUrl = cachedFileUrls[project._id]?.[project.buildDetails.brand.logoStorageId!];
                                  return logoUrl ? (
                                    <a href={logoUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
                                      <Image
                                        src={logoUrl}
                                        alt="Logo"
                                        width={64}
                                        height={64}
                                        unoptimized
                                        className="h-16 w-16 object-contain border rounded"
                                      />
                                    </a>
                                  ) : null;
                                })()}
                                {project.buildDetails.brand.imageStorageIds?.map((storageId) => {
                                  const imageUrl = cachedFileUrls[project._id]?.[storageId];
                                  return imageUrl ? (
                                    <a key={storageId} href={imageUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
                                      <Image
                                        src={imageUrl}
                                        alt="Brand image"
                                        width={64}
                                        height={64}
                                        unoptimized
                                        className="h-16 w-16 object-cover rounded border"
                                      />
                                    </a>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">My Notes</label>
                        <textarea
                          value={editingNotes[project._id] || project.buildDetails?.myNotes || ""}
                          onChange={(e) => setEditingNotes(prev => ({ ...prev, [project._id]: e.target.value }))}
                          rows={4}
                          className="form-control form-textarea"
                          placeholder="Admin notes (not visible to client)..."
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => handleNotesSave(project._id)}
                            disabled={saving[`notes-${project._id}`]}
                            className="btn-cta px-4 py-2 text-sm disabled:opacity-50"
                          >
                            {saving[`notes-${project._id}`] ? "Saving..." : "Save Notes"}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Deployment</label>
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="block text-xs text-[var(--muted-foreground)] mb-1">Live URL</label>
                            <input
                              type="url"
                              value={editingDeployment[project._id]?.liveUrl || project.deployment?.liveUrl || ""}
                              onChange={(e) => setEditingDeployment(prev => ({
                                ...prev,
                                [project._id]: { ...prev[project._id], liveUrl: e.target.value }
                              }))}
                              className="form-control text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[var(--muted-foreground)] mb-1">Staging URL</label>
                            <input
                              type="url"
                              value={editingDeployment[project._id]?.stagingUrl || project.deployment?.stagingUrl || ""}
                              onChange={(e) => setEditingDeployment(prev => ({
                                ...prev,
                                [project._id]: { ...prev[project._id], stagingUrl: e.target.value }
                              }))}
                              className="form-control text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[var(--muted-foreground)] mb-1">Vercel Project ID</label>
                            <input
                              type="text"
                              value={editingDeployment[project._id]?.vercelProjectId || project.deployment?.vercelProjectId || ""}
                              onChange={(e) => setEditingDeployment(prev => ({
                                ...prev,
                                [project._id]: { ...prev[project._id], vercelProjectId: e.target.value }
                              }))}
                              className="form-control text-sm"
                            />
                          </div>
                        </div>
                        <div className="mt-2">
                          <button
                            onClick={() => handleDeploymentSave(project._id)}
                            disabled={saving[`deploy-${project._id}`]}
                            className="btn-cta px-4 py-2 text-sm disabled:opacity-50"
                          >
                            {saving[`deploy-${project._id}`] ? "Saving..." : "Save Deployment"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block surface rounded-xl overflow-x-auto">
          <table className="min-w-full">
            <thead className="">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Headline</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Assets</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Deployment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Updated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {projects.map((project) => (
                <Fragment key={project._id}>
                  <tr className="hover:bg-[hsl(var(--primary)/0.06)] dark:hover:bg-[hsl(var(--accent)/0.16)]">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/portal/${project.projectId}`} className="text-[hsl(var(--primary))] hover:underline font-medium">
                        {project.projectId.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      {project.prospect ? (
                        <div>
                          <div className="text-sm font-medium text-[var(--foreground)]">{project.prospect.contactName}</div>
                          <div className="text-xs text-[var(--muted-foreground)]">{project.prospect.contactEmail}</div>
                        </div>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={project.projectStatus || ""}
                        onChange={(e) => handleStatusChange(project._id, e.target.value as typeof PROJECT_STATUSES[number])}
                        disabled={saving[project._id]}
                        className="form-control !h-8 !py-1 !text-sm disabled:opacity-50"
                      >
                        {PROJECT_STATUSES.map(s => (
                          <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-[var(--foreground)] max-w-xs truncate">
                        {project.buildDetails?.headline || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {project.buildDetails?.brandAssetsUploaded ? (
                        <span className="text-emerald-600">✓</span>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {project.deployment?.liveUrl || project.deployment?.stagingUrl ? (
                        <div className="space-y-1">
                          {project.deployment.liveUrl && (() => {
                            const url = project.deployment.liveUrl;
                            const absoluteUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
                            return (
                              <div>
                                <span className="text-[var(--muted-foreground)]">Live:</span>{" "}
                                <a href={absoluteUrl} target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--primary))] hover:underline">
                                  {url.slice(0, 20)}...
                                </a>
                              </div>
                            );
                          })()}
                          {project.deployment.stagingUrl && (() => {
                            const url = project.deployment.stagingUrl;
                            const absoluteUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
                            return (
                              <div>
                                <span className="text-[var(--muted-foreground)]">Staging:</span>{" "}
                                <a href={absoluteUrl} target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--primary))] hover:underline">
                                  {url.slice(0, 20)}...
                                </a>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted-foreground)]">
                      {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setExpandedProjectId(expandedProjectId === project._id ? null : project._id)}
                        className="text-[hsl(var(--primary))] hover:underline text-sm font-medium"
                      >
                        {expandedProjectId === project._id ? "Hide" : "Manage"}
                      </button>
                    </td>
                  </tr>
                  {expandedProjectId === project._id && (() => {
                    // Collect storage IDs for file fetching
                    const storageIds: Id<"_storage">[] = [];
                    if (project.buildDetails?.brand?.logoStorageId) {
                      storageIds.push(project.buildDetails.brand.logoStorageId);
                    }
                    if (project.buildDetails?.brand?.imageStorageIds) {
                      storageIds.push(...project.buildDetails.brand.imageStorageIds);
                    }

                    return (
                      <>
                        {/* Fetch file URLs when expanded */}
                        {storageIds.length > 0 && (
                          <ProjectFileUrlsFetcher projectId={project._id} storageIds={storageIds} />
                        )}
                        <tr>
                          <td colSpan={8} className="px-6 py-4">
                            <div className="space-y-4">
                              {/* Build Details Section */}
                              {project.buildDetails && (
                                <div>
                                  <label className="block text-sm font-medium text-[var(--foreground)] mb-3">Build Details</label>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                      <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase mb-1">Headline</p>
                                      <p className="text-sm text-[var(--foreground)]">{project.buildDetails.headline || "-"}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase mb-1">Domain Preference</p>
                                      <p className="text-sm text-[var(--foreground)]">{project.buildDetails.domainPreference || "-"}</p>
                                    </div>
                                    {project.buildDetails.inspirationLinks && project.buildDetails.inspirationLinks.length > 0 && (
                                      <div className="md:col-span-2">
                                        <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase mb-1">Inspiration Links</p>
                                        <ul className="list-disc list-inside space-y-1">
                                          {project.buildDetails.inspirationLinks.map((link, i) => (
                                            <li key={i} className="text-sm">
                                              <a href={link} target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--primary))] hover:underline">
                                                {link}
                                              </a>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase mb-1">Color Scheme</p>
                                      <div className="flex gap-2 mt-1">
                                          <div 
                                            className="w-6 h-6 rounded border border-gray-300"
                                            style={{ backgroundColor: project.buildDetails.brand.colorScheme.primary }}
                                            title={`Primary: ${project.buildDetails.brand.colorScheme.primary}`}
                                          />
                                          <span className="text-xs text-[var(--muted-foreground)]">Primary</span>
                                          <span> {project.buildDetails.brand.colorScheme.primary}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <div 
                                            className="w-6 h-6 rounded border border-gray-300"
                                            style={{ backgroundColor: project.buildDetails.brand.colorScheme.accent }}
                                            title={`Accent: ${project.buildDetails.brand.colorScheme.accent}`}
                                          />
                                          <span className="text-xs text-[var(--muted-foreground)]">Accent</span>
                                          <span> {project.buildDetails.brand.colorScheme.accent}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Brand Assets Section */}
                                  {(project.buildDetails.brand.logoStorageId || (project.buildDetails.brand.imageStorageIds && project.buildDetails.brand.imageStorageIds.length > 0)) && (
                                    <div className="mb-4 border-t pt-4">
                                      <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase mb-2">Brand Assets</p>
                                      <div className="flex flex-wrap gap-3">
                                        {/* Logo */}
                                        {project.buildDetails.brand.logoStorageId && (() => {
                                          const logoUrl = cachedFileUrls[project._id]?.[project.buildDetails.brand.logoStorageId!];
                                          return logoUrl ? (
                                            <div>
                                              <p className="text-xs text-[var(--muted-foreground)] mb-1">Logo</p>
                                              <a
                                                href={logoUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-block"
                                              >
                                                <Image
                                                  src={logoUrl}
                                                  alt="Logo"
                                                  width={80}
                                                  height={80}
                                                  unoptimized
                                                  className="h-20 w-20 object-contain border rounded hover:border-blue-500 transition"
                                                />
                                              </a>
                                            </div>
                                          ) : null;
                                        })()}
                                        {/* Images */}
                                        {project.buildDetails.brand.imageStorageIds && project.buildDetails.brand.imageStorageIds.length > 0 && (
                                          <div>
                                            <p className="text-xs text-[var(--muted-foreground)] mb-1">Images</p>
                                            <div className="flex flex-wrap gap-2">
                                              {project.buildDetails.brand.imageStorageIds.map((storageId) => {
                                                const imageUrl = cachedFileUrls[project._id]?.[storageId];
                                                return imageUrl ? (
                                                  <a
                                                    key={storageId}
                                                    href={imageUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-block"
                                                  >
                                                    <Image
                                                      src={imageUrl}
                                                      alt="Brand image"
                                                      width={80}
                                                      height={80}
                                                      unoptimized
                                                      className="h-20 w-20 object-cover rounded border hover:border-blue-500 transition"
                                                    />
                                                  </a>
                                                ) : null;
                                              })}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              <div>
                                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">My Notes</label>
                                <textarea
                                  value={editingNotes[project._id] || project.buildDetails?.myNotes || ""}
                                  onChange={(e) => setEditingNotes(prev => ({ ...prev, [project._id]: e.target.value }))}
                                  rows={4}
                                  className="form-control form-textarea"
                                  placeholder="Admin notes (not visible to client)..."
                                />
                                <div className="mt-2 flex gap-2">
                                  <button
                                    onClick={() => handleNotesSave(project._id)}
                                    disabled={saving[`notes-${project._id}`]}
                                    className="btn-cta px-4 py-2 text-sm disabled:opacity-50"
                                  >
                                    {saving[`notes-${project._id}`] ? "Saving..." : "Save Notes"}
                                  </button>
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Deployment</label>
                                <div className="grid grid-cols-1 gap-3">
                                  <div>
                                    <label className="block text-xs text-[var(--muted-foreground)] mb-1">Live URL</label>
                                    <input
                                      type="url"
                                      value={editingDeployment[project._id]?.liveUrl || project.deployment?.liveUrl || ""}
                                      onChange={(e) => setEditingDeployment(prev => ({
                                        ...prev,
                                        [project._id]: { ...prev[project._id], liveUrl: e.target.value }
                                      }))}
                                      className="form-control text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-[var(--muted-foreground)] mb-1">Staging URL</label>
                                    <input
                                      type="url"
                                      value={editingDeployment[project._id]?.stagingUrl || project.deployment?.stagingUrl || ""}
                                      onChange={(e) => setEditingDeployment(prev => ({
                                        ...prev,
                                        [project._id]: { ...prev[project._id], stagingUrl: e.target.value }
                                      }))}
                                      className="form-control text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-[var(--muted-foreground)] mb-1">Vercel Project ID</label>
                                    <input
                                      type="text"
                                      value={editingDeployment[project._id]?.vercelProjectId || project.deployment?.vercelProjectId || ""}
                                      onChange={(e) => setEditingDeployment(prev => ({
                                        ...prev,
                                        [project._id]: { ...prev[project._id], vercelProjectId: e.target.value }
                                      }))}
                                      className="form-control text-sm"
                                    />
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <button
                                    onClick={() => handleDeploymentSave(project._id)}
                                    disabled={saving[`deploy-${project._id}`]}
                                    className="btn-cta px-4 py-2 text-sm disabled:opacity-50"
                                  >
                                    {saving[`deploy-${project._id}`] ? "Saving..." : "Save Deployment"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </>
                    );
                  })()}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}

function ScheduledCallsTab() {
  const calls = useQuery(api.admin.listScheduledCalls, {});
  const projects = useQuery(api.admin.listProjects);

  const getProjectIdString = (projectId: Id<"projects"> | undefined) => {
    if (!projectId) return null;
    const project = projects?.find(p => p._id === projectId);
    return project?.projectId || null;
  };

  if (calls === undefined) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        <p className="mt-4 text-gray-500">Loading scheduled calls...</p>
      </div>
    );
  }

  const groupedByDate = calls.reduce((acc, call) => {
    const date = new Date(call.startTime).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(call);
    return acc;
  }, {} as Record<string, typeof calls>);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });

  return (
    <div>
      <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-6">Scheduled Calls</h2>

      {calls.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--muted-foreground)] text-lg">No scheduled calls</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date} className="surface rounded-xl p-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">{date}</h3>
              <div className="space-y-4">
                {groupedByDate[date].map((call) => (
                  <div key={call._id} className="surface-soft border-l-2 border-[hsl(var(--primary))] pl-4 py-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{call.title || call.type}</p>
                        <p className="text-sm text-[var(--muted-foreground)] mt-1">
                          {new Date(call.startTime).toLocaleTimeString()} - {new Date(call.endTime).toLocaleTimeString()}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">
                          Type: {call.type} • Status: {call.status}
                        </p>
                        {call.meetingUrl && (
                          <a href={call.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--primary))] hover:underline text-sm mt-1 inline-block">
                            Join Meeting →
                          </a>
                        )}
                      </div>
                      <div className="text-right text-sm">
                        {call.projectId && (() => {
                          const projectIdString = getProjectIdString(call.projectId);
                          return projectIdString ? (
                            <Link href={`/portal/${projectIdString}`} className="text-[hsl(var(--primary))] hover:underline">
                              View Project →
                            </Link>
                          ) : null;
                        })()}
                        {call.prospectId && (
                          <p className="text-[var(--muted-foreground)] mt-1">Prospect ID: {call.prospectId.slice(0, 8)}...</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditRequestsTab() {
  const requests = useQuery(api.admin.listEditRequests, {});
  const projects = useQuery(api.admin.listProjects);
  const updateEditRequestStatus = useMutation(api.admin.updateEditRequestStatus);

  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [cachedFileUrls, setCachedFileUrls] = useState<Record<Id<"projects">, Record<Id<"_storage">, string>>>({});

  // Group requests by projectId and aggregate storage IDs (as plain object for stable reference)
  const projectStorageIdsMap = useMemo(() => {
    const map: Record<Id<"projects">, Id<"_storage">[]> = {};
    const seenIds = new Set<string>();
    
    requests?.forEach(request => {
      if (request.attachments && request.attachments.length > 0) {
        const projectId = request.projectId;
        if (!map[projectId]) {
          map[projectId] = [];
        }
        request.attachments.forEach(id => {
          const key = `${projectId}:${id}`;
          if (!seenIds.has(key)) {
            seenIds.add(key);
            map[projectId].push(id);
          }
        });
      }
    });
    
    return map;
  }, [requests]);

  // Create stable array of unique projects with their storage IDs
  const uniqueProjects = useMemo(() => {
    const result: Array<{ projectId: Id<"projects">; storageIds: Id<"_storage">[] }> = [];
    const projectIds = Object.keys(projectStorageIdsMap) as Id<"projects">[];
    
    projectIds.slice(0, 10).forEach(projectId => {
      const storageIds = projectStorageIdsMap[projectId];
      if (storageIds && storageIds.length > 0) {
        // Create a new array reference but with sorted IDs for stability
        result.push({ projectId, storageIds: [...storageIds].sort() });
      }
    });
    
    return result;
  }, [projectStorageIdsMap]);

  // Helper component to fetch and cache URLs for a project
  const ProjectFileUrlsFetcher = ({ projectId, storageIds }: { projectId: Id<"projects">; storageIds: Id<"_storage">[] }) => {
    const urls = useQuery(
      api.admin.getProjectFileUrls,
      storageIds.length > 0 ? { projectId, storageIds } : "skip"
    );

    const hasSetUrlsRef = useRef(false);
    
    useEffect(() => {
      // Only set URLs once when they're first fetched
      if (urls && !hasSetUrlsRef.current) {
        hasSetUrlsRef.current = true;
        setCachedFileUrls(prev => {
          // Only update if we don't already have URLs for this project
          if (prev[projectId]) {
            return prev;
          }
          return {
            ...prev,
            [projectId]: urls,
          };
        });
      }
    }, [projectId, urls]);

    return null;
  };

  const getProjectIdString = (projectId: Id<"projects"> | undefined) => {
    if (!projectId) return null;
    const project = projects?.find(p => p._id === projectId);
    return project?.projectId || null;
  };

  if (requests === undefined) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        <p className="mt-4 text-gray-500">Loading edit requests...</p>
      </div>
    );
  }

  const handleStatusChange = async (requestId: Id<"edit_requests">, status: typeof EDIT_REQUEST_STATUSES[number]) => {
    setSaving(prev => ({ ...prev, [requestId]: true }));
    try {
      await updateEditRequestStatus({ requestId, status });
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update request status. Please try again.");
    } finally {
      setSaving(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const handlePriorityChange = async (requestId: Id<"edit_requests">, priority: typeof PRIORITIES[number]) => {
    setSaving(prev => ({ ...prev, [`priority-${requestId}`]: true }));
    try {
      const request = requests.find(r => r._id === requestId);
      if (request) {
        await updateEditRequestStatus({ requestId, status: request.status, priority });
      }
    } catch (error) {
      console.error("Failed to update priority:", error);
      alert("Failed to update priority. Please try again.");
    } finally {
      setSaving(prev => ({ ...prev, [`priority-${requestId}`]: false }));
    }
  };

  const statusClass = (status: typeof EDIT_REQUEST_STATUSES[number]) =>
    ({
      open: "pill text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.10)]",
      in_progress: "pill text-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.10)]",
      waiting_on_client: "pill text-[hsl(var(--brand-amber))] bg-[hsl(var(--brand-amber)/0.10)]",
      resolved: "pill-success",
      closed: "pill",
    }[status]);

  return (
    <div>
      <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-6">Edit Requests</h2>

      {/* Fetch URLs for unique projects */}
      {uniqueProjects.map(({ projectId, storageIds }) => (
        <ProjectFileUrlsFetcher key={projectId} projectId={projectId} storageIds={storageIds} />
      ))}

      {requests.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--muted-foreground)] text-lg">No edit requests</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {requests.map((request) => (
              <div key={request._id} className="surface rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-[var(--foreground)]">{request.title}</div>
                    <div className="text-xs text-[var(--muted-foreground)] mt-1">{new Date(request.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <select
                      value={request.status}
                      onChange={(e) => handleStatusChange(request._id, e.target.value as typeof EDIT_REQUEST_STATUSES[number])}
                      disabled={saving[request._id]}
                      className="form-control !h-8 !py-1 !text-sm disabled:opacity-50"
                    >
                      {EDIT_REQUEST_STATUSES.map(s => (
                        <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                    <select
                      value={request.priority}
                      onChange={(e) => handlePriorityChange(request._id, e.target.value as typeof PRIORITIES[number])}
                      disabled={saving[`priority-${request._id}`]}
                      className="form-control !h-8 !py-1 !text-sm disabled:opacity-50"
                    >
                      {PRIORITIES.map(p => (
                        <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {request.details && (
                  <div className="mt-2 text-sm text-[var(--muted-foreground)]">{request.details}</div>
                )}
                {request.attachments && request.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {request.attachments.slice(0, 3).map((storageId) => {
                      const url = cachedFileUrls[request.projectId]?.[storageId];
                      if (!url) return null;
                      return (
                        <a
                          key={storageId}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block"
                        >
                          <Image
                            src={url}
                            alt="Attachment"
                            width={48}
                            height={48}
                            unoptimized
                            className="h-12 w-12 object-cover rounded border"
                          />
                        </a>
                      );
                    })}
                    {request.attachments.length > 3 && (
                      <span className="text-xs text-[var(--muted-foreground)] self-center">
                        +{request.attachments.length - 3} more
                      </span>
                    )}
                  </div>
                )}
                <div className="mt-3 text-sm">
                  {(() => {
                    const projectIdString = getProjectIdString(request.projectId);
                    return projectIdString ? (
                      <Link href={`/portal/${projectIdString}`} className="text-[hsl(var(--primary))] hover:underline">
                        View Project →
                      </Link>
                    ) : (
                      <span className="text-[var(--muted-foreground)]">No project link</span>
                    );
                  })()}
                </div>
                <div className="mt-3">
                  <span className={statusClass(request.status)}>
                    {request.status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
        <div className="hidden md:block surface rounded-xl overflow-x-auto">
          <table className="min-w-full">
            <thead className="">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {requests.map((request) => (
                <tr key={request._id} className="hover:bg-[hsl(var(--primary)/0.06)] dark:hover:bg-[hsl(var(--accent)/0.16)]">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-[var(--foreground)]">{request.title}</div>
                    <div className="text-xs text-[var(--muted-foreground)] mt-1 max-w-md truncate">{request.details}</div>
                    {/* Attachment thumbnails */}
                    {request.attachments && request.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {request.attachments.slice(0, 3).map((storageId) => {
                          const url = cachedFileUrls[request.projectId]?.[storageId];
                          if (!url) return null;
                          return (
                            <a
                              key={storageId}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block"
                            >
                              <Image
                                src={url}
                                alt="Attachment"
                                width={48}
                                height={48}
                                unoptimized
                                className="h-12 w-12 object-cover rounded border hover:border-blue-500 transition"
                              />
                            </a>
                          );
                        })}
                        {request.attachments.length > 3 && (
                          <span className="text-xs text-[var(--muted-foreground)] self-center">
                            +{request.attachments.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={request.status}
                      onChange={(e) => handleStatusChange(request._id, e.target.value as typeof EDIT_REQUEST_STATUSES[number])}
                      disabled={saving[request._id]}
                      className="form-control !h-8 !py-1 !text-sm disabled:opacity-50"
                    >
                      {EDIT_REQUEST_STATUSES.map(s => (
                        <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={request.priority}
                      onChange={(e) => handlePriorityChange(request._id, e.target.value as typeof PRIORITIES[number])}
                      disabled={saving[`priority-${request._id}`]}
                      className="form-control !h-8 !py-1 !text-sm disabled:opacity-50"
                    >
                      {PRIORITIES.map(p => (
                        <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      const projectIdString = getProjectIdString(request.projectId);
                      return projectIdString ? (
                        <Link href={`/portal/${projectIdString}`} className="text-[hsl(var(--primary))] hover:underline text-sm">
                          View Project →
                        </Link>
                      ) : (
                        <span className="text-[var(--muted-foreground)] text-sm">-</span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted-foreground)]">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={statusClass(request.status)}>
                      {request.status.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}

// Helper to format activity kind into human-readable text
function formatActivityKind(kind: string, payload?: Record<string, unknown>): string {
  const kindMap: Record<string, string | ((p?: Record<string, unknown>) => string)> = {
    "magic_link_sent": "Magic link sent",
    "project.status_updated": (p) => {
      if (p?.from && p?.to) return `Status changed: ${String(p.from).replace(/_/g, " ")} → ${String(p.to).replace(/_/g, " ")}`;
      if (p?.to) return `Status set to ${String(p.to).replace(/_/g, " ")}`;
      return "Status updated";
    },
    "project.deployment_updated": "Deployment updated",
    "build.admin_notes_updated": "Admin notes updated",
    "ticket.status_updated": (p) => {
      if (p?.from && p?.to) return `Ticket: ${String(p.from).replace(/_/g, " ")} → ${String(p.to).replace(/_/g, " ")}`;
      return "Ticket status updated";
    },
    "agreement.signed": "Agreement signed",
    "payment.completed": "Payment completed",
    "payment.failed": "Payment failed",
    "subscription.created": "Subscription created",
    "subscription.cancelled": "Subscription cancelled",
    "booking.created": "Call scheduled",
    "booking.cancelled": "Call cancelled",
    "booking.rescheduled": "Call rescheduled",
    "project.created": "Project created",
    "prospect.created": "Prospect created",
    "edit_request.created": "Edit request submitted",
    "build.assets_uploaded": "Brand assets uploaded",
  };

  const formatter = kindMap[kind];
  if (typeof formatter === "function") {
    return formatter(payload);
  }
  if (typeof formatter === "string") {
    return formatter;
  }
  // Fallback: convert kind to readable format
  return kind.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Helper to get actor badge styles
function getActorBadge(actor: "system" | "user" | "admin"): { label: string; className: string } {
  switch (actor) {
    case "system":
      return { label: "System", className: "pill text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted)/0.3)]" };
    case "user":
      return { label: "User", className: "pill text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.10)]" };
    case "admin":
      return { label: "Admin", className: "pill text-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.10)]" };
  }
}

// Helper to format relative time
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function ActivityLogTab() {
  const activities = useQuery(api.admin.listActivityLog, { limit: 100 });

  if (activities === undefined) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        <p className="mt-4 text-gray-500">Loading activity...</p>
      </div>
    );
  }

  // Group activities by date
  const groupedByDate = activities.reduce((acc, activity) => {
    const date = new Date(activity.createdAt).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(activity);
    return acc;
  }, {} as Record<string, typeof activities>);

  const sortedDates = Object.keys(groupedByDate);

  return (
    <div>
      <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-6">Activity Log</h2>

      {activities.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--muted-foreground)] text-lg">No activity recorded yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date} className="surface rounded-xl p-6">
              <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-4">
                {date}
              </h3>
              <div className="space-y-3">
                {groupedByDate[date].map((activity) => {
                  const actorBadge = getActorBadge(activity.actor);
                  const description = formatActivityKind(
                    activity.kind,
                    activity.payload as Record<string, unknown> | undefined
                  );

                  return (
                    <div
                      key={activity._id}
                      className="flex items-start gap-3 py-3 border-b border-[hsl(var(--border)/0.5)] last:border-0"
                    >
                      {/* Timeline dot */}
                      <div className="flex-shrink-0 mt-1.5">
                        <div className="w-2 h-2 rounded-full bg-[hsl(var(--primary))]" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-[var(--foreground)]">
                            {description}
                          </span>
                          <span className={actorBadge.className}>{actorBadge.label}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted-foreground)]">
                          <span>{formatRelativeTime(activity.createdAt)}</span>
                          <span>
                            {new Date(activity.createdAt).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                          {activity.projectIdString && (
                            <Link
                              href={`/portal/${activity.projectIdString}`}
                              className="text-[hsl(var(--primary))] hover:underline"
                            >
                              View Project →
                            </Link>
                          )}
                        </div>

                        {/* Show payload details for certain event types */}
                        {activity.payload && activity.kind === "magic_link_sent" && (
                          <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                            Email: {(activity.payload as { email?: string }).email}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
