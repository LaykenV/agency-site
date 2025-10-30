"use client";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation, Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useState, useEffect, Fragment } from "react";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";

type ProspectDetails = Doc<"prospects">["details"];

const emptyDetails: ProspectDetails = {
  contactName: "",
  contactEmail: "",
  companyName: "",
  phone: "",
  currentWebsite: "",
  businessDescription: "",
  goals: "",
  notes: "",
};

type Tab = "prospects" | "projects" | "calls" | "requests";

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
    <>
      <AuthLoading>
        <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-sm text-gray-500">
            <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
            <p>Loading...</p>
          </div>
        </div>
      </AuthLoading>

      <Unauthenticated>
        <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please sign in to access admin</h1>
            <p className="text-gray-500">You must be authenticated to view this page.</p>
          </div>
        </div>
      </Unauthenticated>

      <Authenticated>
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-8">Admin</h1>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab("prospects")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "prospects"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Prospects
                </button>
                <button
                  onClick={() => setActiveTab("projects")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "projects"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Projects
                </button>
                <button
                  onClick={() => setActiveTab("calls")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "calls"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Scheduled Calls
                </button>
                <button
                  onClick={() => setActiveTab("requests")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "requests"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Edit Requests
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === "prospects" && <ProspectsTab />}
            {activeTab === "projects" && <ProjectsTab />}
            {activeTab === "calls" && <ScheduledCallsTab />}
            {activeTab === "requests" && <EditRequestsTab />}
          </div>
        </div>
      </Authenticated>
    </>
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingProspectId) {
        await updateProspect({
          prospectId: editingProspectId as Id<"prospects">,
          details: formData,
        });
      } else {
        await createProspect({ details: formData });
      }
      handleCancel();
    } catch (error) {
      console.error("Error saving prospect:", error);
      alert("Failed to save prospect. Please try again.");
    } finally {
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
          callbackURL: `/portal/agreement?sid=${prospect.sessionId}`,
          newUserCallbackURL: `/portal/agreement?sid=${prospect.sessionId}`,
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
        <h2 className="text-2xl font-semibold text-gray-900">Prospects</h2>
        <button
          onClick={handleCreateNew}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition"
        >
          + Add New Prospect
        </button>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingProspectId ? "Edit Prospect" : "Create New Prospect"}
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => handleInputChange(e, "contactName")}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => handleInputChange(e, "contactEmail")}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange(e, "companyName")}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange(e, "phone")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.currentWebsite}
                    onChange={(e) => handleInputChange(e, "currentWebsite")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Description *
                  </label>
                  <textarea
                    value={formData.businessDescription}
                    onChange={(e) => handleInputChange(e, "businessDescription")}
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Goals *
                  </label>
                  <textarea
                    value={formData.goals}
                    onChange={(e) => handleInputChange(e, "goals")}
                    required
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange(e, "notes")}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : editingProspectId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {prospects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No prospects yet</p>
            <button
              onClick={handleCreateNew}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Create the first one →
            </button>
          </div>
        ) : (
          prospects.map((prospect) => (
            <div
              key={prospect.sessionId}
              className="border border-gray-300 rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition"
            >
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {prospect.details.contactName}
                  </h2>
                  <p className="text-sm text-gray-500">{prospect.sessionId}</p>
                </div>
                <div className="text-right flex gap-2 justify-end">
                  <button
                    onClick={() => handleSendMagicLink(prospect)}
                    disabled={cooldowns[prospect._id] > 0}
                    className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cooldowns[prospect._id] > 0
                      ? `Wait ${cooldowns[prospect._id]}s`
                      : "Send Magic Link"}
                  </button>
                  <button
                    onClick={() => handleEdit(prospect)}
                    className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium rounded-md transition"
                  >
                    Edit
                  </button>
                  <p className="text-sm font-medium text-gray-700 self-center">
                    {prospect.planGenerationInProgress
                      ? "🔄 Generating Plan..."
                      : "✓ Ready"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 border-t pt-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Company</p>
                  <p className="text-sm text-gray-900">{prospect.details.companyName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Email</p>
                  <p className="text-sm text-gray-900">{prospect.details.contactEmail}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Phone</p>
                  <p className="text-sm text-gray-900">{prospect.details.phone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Website</p>
                  <p className="text-sm text-gray-900">{prospect.details.currentWebsite || "N/A"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Business Description</p>
                  <p className="text-sm text-gray-900">{prospect.details.businessDescription}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 border-t pt-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Goals</p>
                  <p className="text-sm text-gray-900">{prospect.details.goals}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Notes</p>
                  <p className="text-sm text-gray-900">{prospect.details.notes || "N/A"}</p>
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

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-500 border-t pt-4">
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

  const getStatusBadge = (status?: string) => {
    if (!status) return <span className="text-xs text-gray-500">-</span>;
    const baseClass = "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold";
    switch (status) {
      case "ARCHIVED":
        return <span className={`${baseClass} bg-red-500/10 text-red-500`}>Archived</span>;
      case "LIVE":
        return <span className={`${baseClass} bg-emerald-500/10 text-emerald-500`}>Live</span>;
      case "IN_PROGRESS":
        return <span className={`${baseClass} bg-blue-500/10 text-blue-500`}>In Progress</span>;
      case "IN_REVIEW":
        return <span className={`${baseClass} bg-amber-500/10 text-amber-500`}>In Review</span>;
      case "AWAITING_ASSETS":
        return <span className={`${baseClass} bg-purple-500/10 text-purple-500`}>Awaiting Assets</span>;
      case "AWAITING_PAYMENT":
        return <span className={`${baseClass} bg-yellow-500/10 text-yellow-500`}>Awaiting Payment</span>;
      case "AWAITING_AGREEMENT":
        return <span className={`${baseClass} bg-gray-500/10 text-gray-500`}>Awaiting Agreement</span>;
      default:
        return <span className={`${baseClass} bg-gray-500/10 text-gray-500`}>{status}</span>;
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Projects</h2>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No projects yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Headline</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assets</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deployment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {projects.map((project) => (
                <Fragment key={project._id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/portal/${project.projectId}`} className="text-blue-600 hover:text-blue-800 font-medium">
                        {project.projectId.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={project.projectStatus || ""}
                        onChange={(e) => handleStatusChange(project._id, e.target.value as typeof PROJECT_STATUSES[number])}
                        disabled={saving[project._id]}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {PROJECT_STATUSES.map(s => (
                          <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {project.buildDetails?.headline || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {project.buildDetails?.brandAssetsUploaded ? (
                        <span className="text-emerald-600">✓</span>
                      ) : (
                        <span className="text-gray-400">-</span>
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
                                <span className="text-gray-500">Live:</span>{" "}
                                <a href={absoluteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
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
                                <span className="text-gray-500">Staging:</span>{" "}
                                <a href={absoluteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                  {url.slice(0, 20)}...
                                </a>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setExpandedProjectId(expandedProjectId === project._id ? null : project._id)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        {expandedProjectId === project._id ? "Hide" : "Manage"}
                      </button>
                    </td>
                  </tr>
                  {expandedProjectId === project._id && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 bg-gray-50 border-t">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">My Notes</label>
                            <textarea
                              value={editingNotes[project._id] || ""}
                              onChange={(e) => setEditingNotes(prev => ({ ...prev, [project._id]: e.target.value }))}
                              rows={4}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Admin notes (not visible to client)..."
                            />
                            <div className="mt-2 flex gap-2">
                              <button
                                onClick={() => handleNotesSave(project._id)}
                                disabled={saving[`notes-${project._id}`]}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition disabled:opacity-50"
                              >
                                {saving[`notes-${project._id}`] ? "Saving..." : "Save Notes"}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Deployment</label>
                            <div className="grid grid-cols-1 gap-3">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Live URL</label>
                                <input
                                  type="url"
                                  value={editingDeployment[project._id]?.liveUrl || project.deployment?.liveUrl || ""}
                                  onChange={(e) => setEditingDeployment(prev => ({
                                    ...prev,
                                    [project._id]: { ...prev[project._id], liveUrl: e.target.value }
                                  }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Staging URL</label>
                                <input
                                  type="url"
                                  value={editingDeployment[project._id]?.stagingUrl || project.deployment?.stagingUrl || ""}
                                  onChange={(e) => setEditingDeployment(prev => ({
                                    ...prev,
                                    [project._id]: { ...prev[project._id], stagingUrl: e.target.value }
                                  }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Vercel Project ID</label>
                                <input
                                  type="text"
                                  value={editingDeployment[project._id]?.vercelProjectId || project.deployment?.vercelProjectId || ""}
                                  onChange={(e) => setEditingDeployment(prev => ({
                                    ...prev,
                                    [project._id]: { ...prev[project._id], vercelProjectId: e.target.value }
                                  }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                              </div>
                            </div>
                            <div className="mt-2">
                              <button
                                onClick={() => handleDeploymentSave(project._id)}
                                disabled={saving[`deploy-${project._id}`]}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition disabled:opacity-50"
                              >
                                {saving[`deploy-${project._id}`] ? "Saving..." : "Save Deployment"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
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
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Scheduled Calls</h2>

      {calls.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No scheduled calls</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date} className="border border-gray-200 rounded-lg bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{date}</h3>
              <div className="space-y-4">
                {groupedByDate[date].map((call) => (
                  <div key={call._id} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{call.title || call.type}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(call.startTime).toLocaleTimeString()} - {new Date(call.endTime).toLocaleTimeString()}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Type: {call.type} • Status: {call.status}
                        </p>
                        {call.meetingUrl && (
                          <a href={call.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm mt-1 inline-block">
                            Join Meeting →
                          </a>
                        )}
                      </div>
                      <div className="text-right text-sm">
                        {call.projectId && (() => {
                          const projectIdString = getProjectIdString(call.projectId);
                          return projectIdString ? (
                            <Link href={`/portal/${projectIdString}`} className="text-blue-600 hover:text-blue-800">
                              View Project →
                            </Link>
                          ) : null;
                        })()}
                        {call.prospectId && (
                          <p className="text-gray-500 mt-1">Prospect ID: {call.prospectId.slice(0, 8)}...</p>
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

  const getStatusColor = (status: typeof EDIT_REQUEST_STATUSES[number]) => {
    switch (status) {
      case "open":
        return "bg-blue-500/10 text-blue-500";
      case "in_progress":
        return "bg-purple-500/10 text-purple-500";
      case "waiting_on_client":
        return "bg-amber-500/10 text-amber-500";
      case "resolved":
        return "bg-emerald-500/10 text-emerald-500";
      case "closed":
        return "bg-gray-500/10 text-gray-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Edit Requests</h2>

      {requests.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No edit requests</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {requests.map((request) => (
                <tr key={request._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{request.title}</div>
                    <div className="text-xs text-gray-500 mt-1 max-w-md truncate">{request.details}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={request.status}
                      onChange={(e) => handleStatusChange(request._id, e.target.value as typeof EDIT_REQUEST_STATUSES[number])}
                      disabled={saving[request._id]}
                      className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
                      className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
                        <Link href={`/portal/${projectIdString}`} className="text-blue-600 hover:text-blue-800 text-sm">
                          View Project →
                        </Link>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(request.status)}`}>
                      {request.status.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}