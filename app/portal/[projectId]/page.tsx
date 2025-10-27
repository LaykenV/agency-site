"use client";

import {
  Authenticated,
  Unauthenticated,
  AuthLoading,
  useQuery,
  useMutation,
} from "convex/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { CAL_KICKOFF_URL, CAL_REVIEW_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UrlChipsInput } from "@/components/ui/url-chips-input";
import { Toaster, toast } from "sonner";
import { ExternalLink, Calendar, ChevronDown, ChevronUp } from "lucide-react";

// Types based on validators
type CalBooking = {
  scheduledAt: number;
  endTime?: number;
  title?: string;
  meetingUrl?: string;
  notes?: string;
};

type BuildDetailsFormData = {
  headline: string;
  domainPreference: string;
  inspirationLinks: string[];
  brand: {
    styleVibe: string;
    logoFile?: File | null;
    imageFiles?: File[];
  };
};

type EditRequest = {
  _id: string;
  title: string;
  status: "open" | "in_progress" | "waiting_on_client" | "resolved" | "closed";
  priority: "low" | "normal" | "high";
  createdAt: number;
  details?: string;
};

export default function ProjectPage() {
  return (
    <>
      <Toaster position="top-center" richColors />
      <AuthLoading>
        <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
          <div className="flex flex-col items-center gap-3 text-sm text-[var(--secondary)]">
            <span className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
          </div>
        </div>
      </AuthLoading>

      <Unauthenticated>
        <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)]">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please sign in to view this project</h1>
            <Link 
              href="/portal"
              className="text-[var(--primary)] hover:underline"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </Unauthenticated>

      <Authenticated>
        <AuthenticatedProjectView />
      </Authenticated>
    </>
  );
}

function AuthenticatedProjectView() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const router = useRouter();

  const decision = useQuery(api.auth.getPortalDecision);
  const project = useQuery(api.projects.getPortalProject, projectId ? { projectId } : "skip");
  const editRequests = useQuery(api.projects.listEditRequests, 
    project?._id ? { projectId: project._id } : "skip"
  );

  useEffect(() => {
    if (!decision) return;
    if (!decision.authed) {
      router.replace("/portal");
    }
  }, [decision, router]);

  useEffect(() => {
    if (!project && projectId) {
      return;
    }
    if (project === null) {
      router.replace("/portal");
    }
  }, [project, projectId, router]);

  const status = project?.projectStatus ?? decision?.primaryProject?.projectStatus ?? "AWAITING_AGREEMENT";
  const isArchived = status === "ARCHIVED";
  const isAwaitingPayment = status === "AWAITING_PAYMENT";
  const isAwaitingAgreement = status === "AWAITING_AGREEMENT";

  const heading = useMemo(() => {
    if (isArchived) {
      return "Project (Archived)";
    }
    if (status === "IN_PROGRESS") {
      return "Project in Progress";
    }
    if (status === "AWAITING_ASSETS") {
      return "We're ready for your assets";
    }
    if (status === "IN_REVIEW") {
      return "Review your project";
    }
    if (status === "LIVE") {
      return "Live project";
    }
    return "Project";
  }, [isArchived, status]);

  const statusBadge = useMemo(() => {
    const label = status ?? "Unknown";
    const baseClass = "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold";
    if (isArchived) {
      return (
        <span className={`${baseClass} bg-red-500/10 text-red-500`}>Archived</span>
      );
    }
    if (status === "LIVE") {
      return <span className={`${baseClass} bg-emerald-500/10 text-emerald-500`}>Live</span>;
    }
    if (status === "IN_PROGRESS") {
      return <span className={`${baseClass} bg-blue-500/10 text-blue-500`}>In Progress</span>;
    }
    if (status === "IN_REVIEW") {
      return <span className={`${baseClass} bg-amber-500/10 text-amber-500`}>In Review</span>;
    }
    if (status === "AWAITING_ASSETS") {
      return <span className={`${baseClass} bg-purple-500/10 text-purple-500`}>Awaiting Assets</span>;
    }
    return <span className={`${baseClass} bg-[var(--muted)] text-[var(--foreground)]`}>{label}</span>;
  }, [isArchived, status]);

  useEffect(() => {
    if (!project || !decision) return;

    if (isAwaitingAgreement) {
      const target = decision.prospectSessionId
        ? `/portal/agreement?sid=${decision.prospectSessionId}`
        : "/portal";
      router.replace(target);
      return;
    }

    if (isAwaitingPayment) {
      router.replace("/portal/subscribe");
    }
  }, [decision, isAwaitingAgreement, isAwaitingPayment, project, router]);

  if (!project) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <div className="flex flex-col items-center gap-3 text-sm text-[var(--secondary)]">
          <span className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
          <p>Loading your project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)] px-6 py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)]/80 p-8 shadow-lg backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[var(--secondary)]">
                Client Portal
              </p>
              <h1 className="mt-3 text-3xl font-semibold">{heading}</h1>
              <p className="mt-2 text-sm text-[var(--secondary)]">
                Project ID: {project.projectId}
              </p>
            </div>
            {statusBadge}
          </div>

          {isArchived ? (
            <div className="mt-8 rounded-2xl border border-red-200 bg-red-500/10 p-6 text-sm text-red-500">
              This project is archived. Reach out to support if you&apos;d like to re-open it or discuss next
              steps.
            </div>
          ) : (
            <div className="mt-8">
              {status === "AWAITING_ASSETS" && (
                <AwaitingAssetsSection 
                  projectId={project._id}
                  buildDetails={project.buildDetails}
                  calKickoffBooking={project.calKickoffBooking}
                />
              )}
              
              {status === "IN_PROGRESS" && (
                <InProgressSection calKickoffBooking={project.calKickoffBooking} />
              )}
              
              {status === "IN_REVIEW" && (
                <ReviewSection 
                  stagingUrl={project.deployment?.stagingUrl}
                  reviewBooking={project.calReviewBooking}
                />
              )}
              
              {status === "LIVE" && (
                <LiveSupportPanel
                  projectId={project._id}
                  liveUrl={project.deployment?.liveUrl}
                  domainPreference={project.buildDetails?.domainPreference ?? undefined}
                  editRequests={editRequests ?? []}
                />
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-[var(--secondary)]">
          <Link href="/portal" className="text-[var(--primary)] hover:underline">
            ← Back to portal home
          </Link>
          <span>Need help? Contact support.</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function AwaitingAssetsSection({
  projectId,
  buildDetails,
  calKickoffBooking,
}: {
  projectId: Id<"projects">;
  buildDetails?: {
    headline: string | null;
    domainPreference: string | null;
    inspirationLinks: string[];
    brand: {
      styleVibe: string | null;
      logoStorageId?: Id<"_storage">;
      imageStorageIds?: Id<"_storage">[];
    };
    brandAssetsUploaded: boolean;
  };
  calKickoffBooking?: CalBooking;
}) {
  const [showForm, setShowForm] = useState(!buildDetails);

  return (
    <div className="space-y-6">
      {buildDetails && !showForm ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Build Details Submitted ✓</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(true)}
            >
              Edit Details
            </Button>
          </div>
          <p className="mt-2 text-sm text-[var(--secondary)]">
            Your project details have been submitted. We&apos;ll review them and reach out if we need anything else.
          </p>
        </div>
      ) : (
        <BuildDetailsForm
          projectId={projectId}
          initialValues={buildDetails ? {
            headline: buildDetails.headline ?? "",
            domainPreference: buildDetails.domainPreference ?? "",
            inspirationLinks: buildDetails.inspirationLinks,
            brand: {
              styleVibe: buildDetails.brand.styleVibe ?? "",
            },
          } : undefined}
          onSuccess={() => {
            setShowForm(false);
            toast.success("Build details saved successfully!");
          }}
        />
      )}

      {buildDetails && (
        <CallCtaOrSummary
          kind="kickoff"
          booking={calKickoffBooking}
          calUrl={CAL_KICKOFF_URL}
        />
      )}
    </div>
  );
}

function BuildDetailsForm({
  projectId,
  initialValues,
  onSuccess,
}: {
  projectId: Id<"projects">;
  initialValues?: Partial<BuildDetailsFormData>;
  onSuccess?: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [formData, setFormData] = useState<BuildDetailsFormData>({
    headline: initialValues?.headline ?? "",
    domainPreference: initialValues?.domainPreference ?? "",
    inspirationLinks: initialValues?.inspirationLinks ?? [],
    brand: {
      styleVibe: initialValues?.brand?.styleVibe ?? "",
      logoFile: null,
      imageFiles: [],
    },
  });

  const upsertBuildDetails = useMutation(api.projects.upsertBuildDetails);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.headline.trim()) {
      toast.error("Please provide a headline for your project");
      return;
    }

    setPending(true);

    try {
      await upsertBuildDetails({
        projectId,
        headline: formData.headline.trim() || undefined,
        domainPreference: formData.domainPreference.trim() || undefined,
        inspirationLinks: formData.inspirationLinks.length > 0 ? formData.inspirationLinks : undefined,
        brand: {
          styleVibe: formData.brand.styleVibe.trim() || undefined,
        },
        // File uploads will be implemented later
        // logoStorageId: undefined,
        // imageStorageIds: undefined,
      });
      
      toast.success("Build details saved!");
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to save build details. Please try again.");
      console.error(error);
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40 p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Project Details</h2>
        <p className="text-sm text-[var(--secondary)]">
          Share the details we need to build your perfect site.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="headline">Project Headline *</Label>
          <Input
            id="headline"
            value={formData.headline}
            onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
            placeholder="e.g., Modern portfolio site for creative agency"
            required
          />
          <p className="mt-1 text-xs text-[var(--secondary)]">
            A short description of what you want to build
          </p>
        </div>

        <div>
          <Label htmlFor="domain">Domain Preference</Label>
          <Input
            id="domain"
            value={formData.domainPreference}
            onChange={(e) => setFormData({ ...formData, domainPreference: e.target.value })}
            placeholder="e.g., mycompany.com or leave blank if undecided"
          />
        </div>

        <div>
          <Label htmlFor="inspiration">Inspiration Links</Label>
          <UrlChipsInput
            value={formData.inspirationLinks}
            onChange={(urls) => setFormData({ ...formData, inspirationLinks: urls })}
            placeholder="Enter URLs of sites you like, separated by commas..."
          />
          <p className="mt-1 text-xs text-[var(--secondary)]">
            Share examples of designs or features you love
          </p>
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-6 space-y-4">
        <h3 className="font-semibold">Brand Assets</h3>

        <div>
          <Label htmlFor="styleVibe">Style & Vibe</Label>
          <Input
            id="styleVibe"
            value={formData.brand.styleVibe}
            onChange={(e) => setFormData({
              ...formData,
              brand: { ...formData.brand, styleVibe: e.target.value }
            })}
            placeholder="e.g., Minimal and modern, Bold and colorful..."
          />
          <p className="mt-1 text-xs text-[var(--secondary)]">
            Describe the look and feel you want for your site
          </p>
        </div>

        <div>
          <Label htmlFor="logoFile">Logo Upload</Label>
          <Input
            id="logoFile"
            type="file"
            accept="image/*,.svg"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setFormData({
                ...formData,
                brand: { ...formData.brand, logoFile: file }
              });
            }}
          />
          <p className="mt-1 text-xs text-[var(--secondary)]">
            Upload your logo (PNG, JPG, SVG recommended)
          </p>
          {formData.brand.logoFile && (
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
              ✓ Selected: {formData.brand.logoFile.name}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="imageFiles">Brand Images Upload</Label>
          <Input
            id="imageFiles"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              setFormData({
                ...formData,
                brand: { ...formData.brand, imageFiles: files }
              });
            }}
          />
          <p className="mt-1 text-xs text-[var(--secondary)]">
            Upload photos or graphics you want us to use (you can select multiple)
          </p>
          {formData.brand.imageFiles && formData.brand.imageFiles.length > 0 && (
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
              ✓ {formData.brand.imageFiles.length} file{formData.brand.imageFiles.length !== 1 ? "s" : ""} selected
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save Build Details"}
        </Button>
      </div>
    </form>
  );
}

function CallCtaOrSummary({
  kind,
  booking,
  calUrl,
}: {
  kind: "kickoff" | "review";
  booking?: CalBooking;
  calUrl: string;
}) {
  const title = kind === "kickoff" ? "Kickoff Call" : "Review Call";
  const icon = <Calendar className="h-4 w-4" />;

  if (booking) {
    const date = new Date(booking.scheduledAt);
    const formattedDate = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const formattedTime = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });

    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              {icon}
              <h3 className="font-semibold">{title} Scheduled</h3>
            </div>
            <p className="mt-2 text-sm">
              {booking.title || title}
            </p>
            <p className="mt-1 text-sm text-[var(--secondary)]">
              {formattedDate} at {formattedTime}
            </p>
          </div>
          {booking.meetingUrl && (
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a href={booking.meetingUrl} target="_blank" rel="noopener noreferrer">
                Join Meeting <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-semibold">Schedule Your {title}</h3>
          </div>
          <p className="mt-2 text-sm text-[var(--secondary)]">
            {kind === "kickoff" 
              ? "Let's meet to discuss your project details and answer any questions."
              : "Walk through the staging site with us and share your feedback."}
          </p>
        </div>
        <Button asChild>
          <a href={calUrl} target="_blank" rel="noopener noreferrer">
            Schedule {icon}
          </a>
        </Button>
      </div>
    </div>
  );
}

function InProgressSection({ calKickoffBooking }: { calKickoffBooking?: CalBooking }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40 p-6">
        <h2 className="text-lg font-semibold mb-2">Build in Progress 🚀</h2>
        <p className="text-sm text-[var(--secondary)]">
          We&apos;re actively building your site. You&apos;ll receive an update once it&apos;s ready for review. 
          Typically this takes 5-7 business days depending on complexity.
        </p>
      </div>

      {calKickoffBooking && (
        <CallCtaOrSummary
          kind="kickoff"
          booking={calKickoffBooking}
          calUrl={CAL_KICKOFF_URL}
        />
      )}
    </div>
  );
}

function ReviewSection({
  stagingUrl,
  reviewBooking,
}: {
  stagingUrl?: string;
  reviewBooking?: CalBooking;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40 p-6">
        <h2 className="text-lg font-semibold mb-2">Ready for Review</h2>
        <p className="text-sm text-[var(--secondary)] mb-4">
          Your project is staged and ready for your feedback. Take a look and schedule a review call
          to walk through it together.
        </p>
        
        {stagingUrl ? (
          <Button asChild variant="default">
            <a href={stagingUrl} target="_blank" rel="noopener noreferrer">
              Open Staging Site <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        ) : (
          <p className="text-sm text-[var(--secondary)] italic">
            Staging link will appear here once available.
          </p>
        )}
      </div>

      <CallCtaOrSummary
        kind="review"
        booking={reviewBooking}
        calUrl={CAL_REVIEW_URL}
      />
    </div>
  );
}

function LiveSupportPanel({
  projectId,
  liveUrl,
  domainPreference,
  editRequests = [],
}: {
  projectId: Id<"projects">;
  liveUrl?: string;
  domainPreference?: string;
  editRequests?: EditRequest[];
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
        <h2 className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
          Your Site is Live! 🎉
        </h2>
        <div className="space-y-3">
          {liveUrl ? (
            <div>
              <p className="text-sm text-[var(--secondary)] mb-2">Live at:</p>
              <Button asChild variant="outline">
                <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-sm">
                  {liveUrl} <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          ) : (
            <p className="text-sm">Your site is live! The URL will be displayed here shortly.</p>
          )}
          
          {domainPreference && (
            <p className="text-xs text-[var(--secondary)]">
              Domain preference: <span className="font-mono">{domainPreference}</span>
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h3 className="text-lg font-semibold mb-4">Request Edits or Support</h3>
        <SupportRequestForm projectId={projectId} />
      </div>

      <EditRequestsList editRequests={editRequests} />
    </div>
  );
}

function SupportRequestForm({ projectId }: { projectId: Id<"projects"> }) {
  const [pending, setPending] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    details: "",
    priority: "normal" as "low" | "normal" | "high",
  });

  const createEditRequest = useMutation(api.projects.createEditRequest);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.details.trim()) {
      toast.error("Please provide both a title and details");
      return;
    }

    setPending(true);

    try {
      await createEditRequest({
        projectId,
        title: formData.title.trim(),
        details: formData.details.trim(),
        priority: formData.priority,
      });

      toast.success("Support request submitted!");
      
      // Reset form
      setFormData({
        title: "",
        details: "",
        priority: "normal",
      });
    } catch (error) {
      toast.error("Failed to submit request. Please try again.");
      console.error(error);
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="support-title">Title *</Label>
        <Input
          id="support-title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Brief description of your request"
          required
        />
      </div>

      <div>
        <Label htmlFor="support-details">Details *</Label>
        <Textarea
          id="support-details"
          value={formData.details}
          onChange={(e) => setFormData({ ...formData, details: e.target.value })}
          placeholder="Describe what you'd like changed or what issue you're experiencing..."
          rows={4}
          required
        />
      </div>

      <div>
        <Label htmlFor="support-priority">Priority</Label>
        <select
          id="support-priority"
          value={formData.priority}
          onChange={(e) => setFormData({ ...formData, priority: e.target.value as "low" | "normal" | "high" })}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-input/30"
        >
          <option value="low">Low - Nice to have</option>
          <option value="normal">Normal - Standard request</option>
          <option value="high">High - Urgent issue</option>
        </select>
      </div>

      <p className="text-xs text-[var(--secondary)] italic">
        Note: File attachments will be supported soon. For now, you can include URLs or references in the details field above.
      </p>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting..." : "Submit Request"}
        </Button>
      </div>
    </form>
  );
}

function EditRequestsList({ 
  editRequests = []
}: { 
  editRequests?: EditRequest[]
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (editRequests.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40 p-6 text-center">
        <p className="text-sm text-[var(--secondary)]">
          No support requests yet. Submit one above if you need any changes!
        </p>
      </div>
    );
  }

  const getStatusColor = (status: EditRequest["status"]) => {
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
        return "bg-[var(--muted)] text-[var(--foreground)]";
    }
  };

  const getPriorityLabel = (priority: EditRequest["priority"]) => {
    const labels = { low: "Low", normal: "Normal", high: "High" };
    return labels[priority];
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40 p-6">
      <h3 className="text-lg font-semibold mb-4">Your Requests</h3>
      <div className="space-y-3">
        {editRequests.map((request) => {
          const isExpanded = expandedId === request._id;
          const date = new Date(request.createdAt);
          const formattedDate = date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });

          return (
            <div
              key={request._id}
              className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-sm">{request.title}</h4>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusColor(request.status)}`}>
                      {request.status.replace("_", " ")}
                    </span>
                    <span className="text-xs text-[var(--secondary)]">
                      {getPriorityLabel(request.priority)} priority
                    </span>
                  </div>
                  <p className="text-xs text-[var(--secondary)] mt-1">{formattedDate}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setExpandedId(isExpanded ? null : request._id)}
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>

              {isExpanded && request.details && (
                <div className="mt-3 pt-3 border-t border-[var(--border)]">
                  <p className="text-sm text-[var(--secondary)] whitespace-pre-wrap">
                    {request.details}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
