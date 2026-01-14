"use client";

import {
  Authenticated,
  Unauthenticated,
  AuthLoading,
  useQuery,
  useMutation,
  useAction,
} from "convex/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
import {
  ExternalLink,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  Globe,
  Rocket,
  FileCheck,
  Clock,
  CheckCircle2,
  ArrowRight,
  Palette,
  Link2,
  Upload,
  Send,
  BarChart3,
  FileText,
  Settings,
  HelpCircle
} from "lucide-react";
import { DashboardStats } from "@/components/portal/DashboardStats";
import { PageViewsChart } from "@/components/portal/PageViewsChart";
import { TopPages } from "@/components/portal/TopPages";
import { RecentLeads } from "@/components/portal/RecentLeads";

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
    colorScheme: { primary: string; accent: string };
    logoFile?: File | null;
    imageFiles?: File[];
    logoStorageId?: Id<"_storage">;
    imageStorageIds?: Id<"_storage">[];
  };
};

type EditRequest = {
  _id: string;
  title: string;
  status: "open" | "in_progress" | "waiting_on_client" | "resolved" | "closed";
  priority: "low" | "normal" | "high";
  createdAt: number;
  details?: string;
  attachments?: Id<"_storage">[];
};

// ============================================================================
// UI UTILITIES
// ============================================================================
const pillBase =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shadow-sm";

function toTitleCase(text: string): string {
  return text
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function projectStatusPill(status: string): { className: string; label: string } {
  const mapping: Record<string, string> = {
    ARCHIVED: `${pillBase} bg-rose-600 text-white`,
    LIVE: `${pillBase} bg-emerald-600 text-white`,
    IN_PROGRESS: `${pillBase} bg-blue-600 text-white`,
    IN_REVIEW: `${pillBase} bg-slate-700 text-white`,
    AWAITING_ASSETS: `${pillBase} bg-amber-600 text-white`,
    AWAITING_PAYMENT: `${pillBase} bg-amber-600 text-white`,
    AWAITING_AGREEMENT: `${pillBase} bg-amber-600 text-white`,
  };
  const className = mapping[status] ?? `${pillBase} bg-slate-500 text-white`;
  const label =
    status === "AWAITING_ASSETS"
      ? "Awaiting Assets"
      : status === "IN_PROGRESS"
      ? "In Progress"
      : status === "IN_REVIEW"
      ? "In Review"
      : toTitleCase(status || "Unknown");
  return { className, label };
}

function requestStatusPill(
  status: EditRequest["status"]
): { className: string; label: string } {
  const mapping: Record<EditRequest["status"], string> = {
    open: `${pillBase} bg-sky-600 text-white`,
    in_progress: `${pillBase} bg-indigo-600 text-white`,
    waiting_on_client: `${pillBase} bg-amber-600 text-white`,
    resolved: `${pillBase} bg-emerald-600 text-white`,
    closed: `${pillBase} bg-slate-600 text-white`,
  };
  return { className: mapping[status], label: toTitleCase(status) };
}

export default function ProjectPage() {
  return (
    <>
      <Toaster position="top-center" richColors />
      <AuthLoading>
        <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
          <div className="flex flex-col items-center gap-3 text-sm text-[var(--secondary)]">
            <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)]" />
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
  const subscription = useQuery(api.stripeHelpers.getMySubscription);

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
          <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)]" />
          <p>Loading your project...</p>
        </div>
      </div>
    );
  }

  // Status configuration for timeline
  const statusConfig = {
    AWAITING_ASSETS: { step: 1, icon: Upload, label: "Submit Assets" },
    IN_PROGRESS: { step: 2, icon: Rocket, label: "Building" },
    IN_REVIEW: { step: 3, icon: FileCheck, label: "Review" },
    LIVE: { step: 4, icon: Globe, label: "Live" },
  };

  const currentStep = statusConfig[status as keyof typeof statusConfig]?.step ?? 0;

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {isArchived ? (
          <div className="max-w-2xl mx-auto">
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                <Clock className="h-6 w-6 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold text-red-500 mb-2">Project Archived</h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                This project is archived. Reach out to support if you&apos;d like to re-open it or discuss next steps.
              </p>
              <Button asChild className="mt-6" variant="outline">
                <a href="mailto:support@acadianawebdesign.com">Contact Support</a>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Progress Timeline - Only show for non-live statuses */}
            {status !== "LIVE" && (
              <div className="mb-8">
                <ProgressTimeline currentStep={currentStep} />
              </div>
            )}

            {/* Status-specific content */}
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
                projectSlug={projectId}
                liveUrl={project.deployment?.liveUrl}
                domainPreference={project.buildDetails?.domainPreference ?? undefined}
                editRequests={editRequests ?? []}
                subscriptionCreatedAt={subscription?._creationTime}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

// Status pill component
function StatusPill({ status }: { status: string }) {
  const { className, label } = projectStatusPill(status);
  return <span className={className}>{label}</span>;
}

// Progress Timeline Component
function ProgressTimeline({ currentStep }: { currentStep: number }) {
  const steps = [
    { step: 1, icon: Upload, label: "Submit Assets", description: "Share your brand details" },
    { step: 2, icon: Rocket, label: "Building", description: "We're crafting your site" },
    { step: 3, icon: FileCheck, label: "Review", description: "Preview and feedback" },
    { step: 4, icon: Globe, label: "Live", description: "Your site is live" },
  ];

  return (
    <div className="surface-elevated p-4 sm:p-6 rounded-2xl">
      <div className="flex items-center justify-center sm:justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = currentStep > step.step;
          const isCurrent = currentStep === step.step;

          return (
            <div key={step.step} className="flex items-center flex-1 justify-center sm:justify-start">
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border-2 transition-all
                    ${isCompleted
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : isCurrent
                        ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white shadow-lg shadow-[hsl(var(--primary)/0.3)]"
                        : "border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)]"
                    }
                  `}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
                  ) : (
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  )}
                </div>
                <div className="mt-2 text-center hidden sm:block">
                  <p className={`text-xs font-medium ${isCurrent ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5 max-w-[80px]">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2 sm:mx-4 hidden sm:block">
                  <div
                    className={`h-0.5 rounded-full transition-all ${
                      currentStep > step.step
                        ? "bg-emerald-500"
                        : "bg-[var(--border)]"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile step label */}
      <div className="mt-4 text-center sm:hidden">
        <p className="text-sm font-medium">
          Step {currentStep}: {steps.find(s => s.step === currentStep)?.label}
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          {steps.find(s => s.step === currentStep)?.description}
        </p>
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
      colorScheme: { primary: string; accent: string };
      logoStorageId?: Id<"_storage">;
      imageStorageIds?: Id<"_storage">[];
    };
    brandAssetsUploaded: boolean;
  };
  calKickoffBooking?: CalBooking;
}) {
  const [showForm, setShowForm] = useState(!buildDetails);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main content - spans 2 columns on large screens */}
      <div className="lg:col-span-2 space-y-6">
        {/* Welcome/Instructions Card */}
        <div className="surface-elevated p-6 lg:p-8 rounded-2xl">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--primary)/0.1)]">
              <Palette className="h-6 w-6 text-[hsl(var(--primary))]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold">Share Your Brand Details</h2>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Help us understand your vision. Fill out the form below with your brand colors,
                logo, and any inspiration. The more detail you provide, the better we can bring your site to life.
              </p>
            </div>
          </div>
        </div>

        {/* Form or Submitted State */}
        {buildDetails && !showForm ? (
          <div className="surface p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Build Details Submitted</h3>
                  <p className="text-xs text-[var(--muted-foreground)]">We&apos;ll review and reach out if needed</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowForm(true)}
              >
                Edit Details
              </Button>
            </div>

            {/* Summary of submitted details */}
            <div className="mt-4 pt-4 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-2 gap-4">
              {buildDetails.headline && (
                <div>
                  <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">Headline</p>
                  <p className="text-sm mt-1">{buildDetails.headline}</p>
                </div>
              )}
              {buildDetails.domainPreference && (
                <div>
                  <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">Domain</p>
                  <p className="text-sm mt-1 font-mono">{buildDetails.domainPreference}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">Colors</p>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="h-6 w-6 rounded-full border border-[var(--border)]"
                    style={{ backgroundColor: buildDetails.brand.colorScheme.primary }}
                  />
                  <div
                    className="h-6 w-6 rounded-full border border-[var(--border)]"
                    style={{ backgroundColor: buildDetails.brand.colorScheme.accent }}
                  />
                </div>
              </div>
              {buildDetails.inspirationLinks.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">Inspiration</p>
                  <p className="text-sm mt-1">{buildDetails.inspirationLinks.length} link{buildDetails.inspirationLinks.length !== 1 ? "s" : ""}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <BuildDetailsForm
            projectId={projectId}
            initialValues={buildDetails ? {
              headline: buildDetails.headline ?? "",
              domainPreference: buildDetails.domainPreference ?? "",
              inspirationLinks: buildDetails.inspirationLinks,
              brand: {
                colorScheme: buildDetails.brand.colorScheme ?? { primary: "#111827", accent: "#6EE7B7" },
                logoStorageId: buildDetails.brand.logoStorageId,
                imageStorageIds: buildDetails.brand.imageStorageIds,
              },
            } : undefined}
            onSuccess={() => {
              setShowForm(false);
            }}
            onCancel={buildDetails ? () => {
              setShowForm(false);
            } : undefined}
          />
        )}
      </div>

      {/* Sidebar - right column on large screens */}
      <div className="lg:col-span-1 space-y-4">
        {/* Kickoff Call Card */}
        {buildDetails && (
          <CallCtaOrSummary
            kind="kickoff"
            booking={calKickoffBooking}
            calUrl={CAL_KICKOFF_URL}
          />
        )}

        {/* Tips Card */}
        <div className="surface-soft p-5 rounded-xl">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[hsl(var(--primary))]" />
            Quick Tips
          </h4>
          <ul className="space-y-2 text-xs text-[var(--muted-foreground)]">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">•</span>
              Upload a high-resolution logo (SVG or PNG preferred)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">•</span>
              Choose colors that reflect your brand identity
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">•</span>
              Share 2-3 inspiration sites you love
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">•</span>
              Be specific about your domain preference
            </li>
          </ul>
        </div>

        {/* Contact Card */}
        <div className="surface-soft p-5 rounded-xl">
          <h4 className="font-semibold text-sm mb-2">Need Help?</h4>
          <p className="text-xs text-[var(--muted-foreground)] mb-3">
            Have questions about what to submit? We&apos;re here to help.
          </p>
          <a
            href="mailto:support@acadianawebdesign.com"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--primary))] hover:underline"
          >
            <Send className="h-3.5 w-3.5" />
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}

function BuildDetailsForm({
  projectId,
  initialValues,
  onSuccess,
  onCancel,
}: {
  projectId: Id<"projects">;
  initialValues?: Partial<BuildDetailsFormData>;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [formData, setFormData] = useState<BuildDetailsFormData>({
    headline: initialValues?.headline ?? "",
    domainPreference: initialValues?.domainPreference ?? "",
    inspirationLinks: initialValues?.inspirationLinks ?? [],
    brand: {
      colorScheme: initialValues?.brand?.colorScheme ?? { primary: "#111827", accent: "#6EE7B7" },
      logoFile: null,
      imageFiles: [],
      logoStorageId: initialValues?.brand?.logoStorageId,
      imageStorageIds: initialValues?.brand?.imageStorageIds,
    },
  });

  // Local preview URLs for newly selected files
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);

  const upsertBuildDetails = useMutation(api.projects.upsertBuildDetails);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  // Contrast helpers for preview
  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const normalized = hex.startsWith("#") ? hex.slice(1) : hex;
    const valid = normalized.length === 3 || normalized.length === 6;
    if (!valid) return null;
    const value =
      normalized.length === 3
        ? normalized
            .split("")
            .map((c) => c + c)
            .join("")
        : normalized;
    const num = Number.parseInt(value, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  };
  const relativeLuminance = (r: number, g: number, b: number) => {
    const srgb = [r, g, b].map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  };
  const getContrastingTextColor = (hex: string): "#000" | "#fff" => {
    const rgb = hexToRgb(hex);
    if (!rgb) return "#000";
    const L = relativeLuminance(rgb.r, rgb.g, rgb.b);
    // Threshold around mid-luminance for contrast against background
    return L > 0.4 ? "#000" : "#fff";
  };
  const coerceHexInput = (value: string) => {
    let v = value.trim();
    if (!v.startsWith("#")) v = `#${v}`;
    if (v.length > 7) v = v.slice(0, 7);
    return v;
  };

  // Track initial snapshot to detect dirty state and to reset on cancel
  const initialSnapshot = useMemo(() => {
    const headline = (initialValues?.headline ?? "").trim();
    const domainPreference = (initialValues?.domainPreference ?? "").trim();
    const inspirationLinks = (initialValues?.inspirationLinks ?? []).map((u) => u.trim());
    const primary = (initialValues?.brand?.colorScheme?.primary ?? "#111827").trim();
    const accent = (initialValues?.brand?.colorScheme?.accent ?? "#6EE7B7").trim();
    const logoStorageId = initialValues?.brand?.logoStorageId;
    const imageStorageIds = initialValues?.brand?.imageStorageIds ?? [];
    return {
      headline,
      domainPreference,
      inspirationLinks,
      brand: {
        colorScheme: { primary, accent },
        logoStorageId,
        imageStorageIds,
      },
      newLogoSelected: false,
      newImageCount: 0,
    };
  }, [initialValues]);

  const normalizedNow = useMemo(() => {
    return {
      headline: formData.headline.trim(),
      domainPreference: formData.domainPreference.trim(),
      inspirationLinks: formData.inspirationLinks.map((u) => u.trim()),
      brand: {
        colorScheme: {
          primary: formData.brand.colorScheme.primary.trim(),
          accent: formData.brand.colorScheme.accent.trim(),
        },
        logoStorageId: formData.brand.logoStorageId,
        imageStorageIds: formData.brand.imageStorageIds ?? [],
      },
      newLogoSelected: !!formData.brand.logoFile,
      newImageCount: formData.brand.imageFiles?.length ?? 0,
    };
  }, [formData]);

  const isDirty = useMemo(() => {
    return JSON.stringify(initialSnapshot) !== JSON.stringify(normalizedNow);
  }, [initialSnapshot, normalizedNow]);

  // Fetch signed URLs for existing storage files
  const storageIds = useMemo(() => {
    const ids: Id<"_storage">[] = [];
    if (formData.brand.logoStorageId) ids.push(formData.brand.logoStorageId);
    if (formData.brand.imageStorageIds) ids.push(...formData.brand.imageStorageIds);
    return ids;
  }, [formData.brand.logoStorageId, formData.brand.imageStorageIds]);

  const storedFileUrls = useQuery(
    api.files.getUrls,
    storageIds.length > 0 ? { projectId, storageIds } : "skip"
  );

  // Cleanup object URLs on unmount or when files change
  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [logoPreviewUrl, imagePreviewUrls]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.headline.trim()) {
      toast.error("Please provide a headline for your project");
      return;
    }

    setPending(true);

    try {
      let logoStorageId: Id<"_storage"> | undefined;
      let imageStorageIds: Id<"_storage">[] | undefined;

      // Upload logo if selected
      if (formData.brand.logoFile) {
        const uploadUrl = await generateUploadUrl();
        const uploadResult = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": formData.brand.logoFile.type },
          body: formData.brand.logoFile,
        });
        
        if (!uploadResult.ok) {
          throw new Error("Failed to upload logo");
        }
        
        const { storageId } = await uploadResult.json();
        logoStorageId = storageId;
      }

      // Upload brand images if selected
      if (formData.brand.imageFiles && formData.brand.imageFiles.length > 0) {
        const uploadedIds: Id<"_storage">[] = [];
        
        for (const file of formData.brand.imageFiles) {
          const uploadUrl = await generateUploadUrl();
          const uploadResult = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });
          
          if (!uploadResult.ok) {
            throw new Error(`Failed to upload ${file.name}`);
          }
          
          const { storageId } = await uploadResult.json();
          uploadedIds.push(storageId);
        }
        
        imageStorageIds = uploadedIds;
      }

      await upsertBuildDetails({
        projectId,
        headline: formData.headline.trim() || undefined,
        domainPreference: formData.domainPreference.trim() || undefined,
        inspirationLinks: formData.inspirationLinks.length > 0 ? formData.inspirationLinks : undefined,
        brand: {
          colorScheme: formData.brand.colorScheme,
        },
        logoStorageId,
        imageStorageIds,
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Project Details</h2>
        <p className="text-sm text-[var(--secondary)]">
          Share the details we need to build your perfect site.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="headline" className="mb-1.5 inline-block">Project Headline *</Label>
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
          <Label htmlFor="domain" className="mb-1.5 inline-block">Domain Preference</Label>
          <Input
            id="domain"
            value={formData.domainPreference}
            onChange={(e) => setFormData({ ...formData, domainPreference: e.target.value })}
            placeholder="e.g., mycompany.com or leave blank if undecided"
          />
        </div>

        <div>
          <Label htmlFor="inspiration" className="mb-1.5 inline-block">Inspiration Links</Label>
          <div className="mt-1.5">
            <UrlChipsInput
              value={formData.inspirationLinks}
              onChange={(urls) => setFormData({ ...formData, inspirationLinks: urls })}
              placeholder="Enter URLs of sites you like, separated by commas..."
            />
          </div>
          <p className="mt-1 text-xs text-[var(--secondary)]">
            Share examples of designs or features you love
          </p>
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-6 space-y-4">
        <h3 className="font-semibold">Brand Assets</h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="space-y-4 md:col-span-1">
              <div>
                <Label htmlFor="primaryColor" className="mb-1.5 inline-block">Primary Color</Label>
                <div className="mt-1.5 flex items-center gap-3">
                  <input
                    type="color"
                    id="primaryColor"
                    value={formData.brand.colorScheme.primary}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        brand: {
                          ...formData.brand,
                          colorScheme: { ...formData.brand.colorScheme, primary: e.target.value },
                        },
                      })
                    }
                    className="h-10 w-12 rounded border border-[var(--border)] cursor-pointer"
                  />
                  <Input
                    aria-label="Primary color hex"
                    value={formData.brand.colorScheme.primary}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        brand: {
                          ...formData.brand,
                          colorScheme: {
                            ...formData.brand.colorScheme,
                            primary: coerceHexInput(e.target.value),
                          },
                        },
                      })
                    }
                    className="h-10 w-28 font-mono text-xs"
                    placeholder="#000000"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="accentColor" className="mb-1.5 inline-block">Accent Color</Label>
                <div className="mt-1.5 flex items-center gap-3">
                  <input
                    type="color"
                    id="accentColor"
                    value={formData.brand.colorScheme.accent}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        brand: {
                          ...formData.brand,
                          colorScheme: { ...formData.brand.colorScheme, accent: e.target.value },
                        },
                      })
                    }
                    className="h-10 w-12 rounded border border-[var(--border)] cursor-pointer"
                  />
                  <Input
                    aria-label="Accent color hex"
                    value={formData.brand.colorScheme.accent}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        brand: {
                          ...formData.brand,
                          colorScheme: {
                            ...formData.brand.colorScheme,
                            accent: coerceHexInput(e.target.value),
                          },
                        },
                      })
                    }
                    className="h-10 w-28 font-mono text-xs"
                    placeholder="#6EE7B7"
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <Label className="mb-1.5 inline-block">Color Preview</Label>
              <div
                className="rounded-xl h-40 md:h-48 p-6 flex items-end justify-between overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${formData.brand.colorScheme.primary}, ${formData.brand.colorScheme.accent})`,
                }}
              >
                <div className="space-y-2">
                  <span
                    className="inline-flex px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: formData.brand.colorScheme.primary,
                      color: getContrastingTextColor(formData.brand.colorScheme.primary),
                    }}
                  >
                    Preview
                  </span>
                  <p
                    className="text-sm font-medium"
                    style={{ color: getContrastingTextColor(formData.brand.colorScheme.primary) }}
                  >
                    Sample headline
                  </p>
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-md text-xs font-medium shadow-sm"
                  style={{
                    backgroundColor: formData.brand.colorScheme.accent,
                    color: getContrastingTextColor(formData.brand.colorScheme.accent),
                  }}
                  aria-label="Sample button"
                >
                  Sample Button
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="logoFile" className="mb-1.5 inline-block">Logo Upload</Label>
          <Input
            id="logoFile"
            type="file"
            accept="image/*,.svg"
            className="mt-1.5"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              
              // Cleanup old preview URL
              if (logoPreviewUrl) {
                URL.revokeObjectURL(logoPreviewUrl);
              }
              
              // Create new preview URL
              if (file) {
                setLogoPreviewUrl(URL.createObjectURL(file));
              } else {
                setLogoPreviewUrl(null);
              }
              
              setFormData({
                ...formData,
                brand: { ...formData.brand, logoFile: file, logoStorageId: undefined }
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
          
          {/* Logo preview */}
          {(() => {
            const logoSrc = logoPreviewUrl ?? (formData.brand.logoStorageId ? storedFileUrls?.[formData.brand.logoStorageId] : undefined);
            if (!logoSrc) return null;
            return (
              <div className="mt-3 rounded-lg border border-[var(--border)] p-3 bg-[var(--muted)]/20">
                <Image
                  src={logoSrc as string}
                  alt="Logo preview"
                  width={200}
                  height={128}
                  className="max-h-32 object-contain"
                  unoptimized
                />
              </div>
            );
          })()}
        </div>

        <div>
          <Label htmlFor="imageFiles" className="mb-1.5 inline-block">Brand Images Upload</Label>
          <Input
            id="imageFiles"
            type="file"
            accept="image/*"
            multiple
            className="mt-1.5"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              
              // Cleanup old preview URLs
              imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
              
              // Create new preview URLs
              const newPreviewUrls = files.map(file => URL.createObjectURL(file));
              setImagePreviewUrls(newPreviewUrls);
              
              setFormData({
                ...formData,
                brand: { ...formData.brand, imageFiles: files, imageStorageIds: undefined }
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
          
          {/* Brand images preview */}
          {(imagePreviewUrls.length > 0 || (formData.brand.imageStorageIds && formData.brand.imageStorageIds.length > 0)) && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {imagePreviewUrls.map((url, idx) => (
                <div key={`preview-${idx}`} className="rounded-lg border border-[var(--border)] p-2 bg-[var(--muted)]/20">
                  <Image
                    src={url}
                    alt={`Preview ${idx + 1}`}
                    width={200}
                    height={96}
                    className="w-full h-24 object-cover rounded"
                    unoptimized
                  />
                </div>
              ))}
              {!imagePreviewUrls.length && formData.brand.imageStorageIds?.map((storageId) => (
                storedFileUrls?.[storageId] && (
                  <div key={storageId} className="rounded-lg border border-[var(--border)] p-2 bg-[var(--muted)]/20">
                    <Image
                      src={storedFileUrls[storageId]}
                      alt="Stored image"
                      width={200}
                      height={96}
                      className="w-full h-24 object-cover rounded"
                      unoptimized
                    />
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              // Reset form to initial snapshot
              const next: BuildDetailsFormData = {
                headline: initialSnapshot.headline,
                domainPreference: initialSnapshot.domainPreference,
                inspirationLinks: initialSnapshot.inspirationLinks,
                brand: {
                  colorScheme: {
                    primary: initialSnapshot.brand.colorScheme.primary,
                    accent: initialSnapshot.brand.colorScheme.accent,
                  },
                  logoFile: null,
                  imageFiles: [],
                  logoStorageId: initialSnapshot.brand.logoStorageId,
                  imageStorageIds: initialSnapshot.brand.imageStorageIds,
                },
              };
              // Cleanup previews
              if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
              imagePreviewUrls.forEach((u) => URL.revokeObjectURL(u));
              setLogoPreviewUrl(null);
              setImagePreviewUrls([]);
              setFormData(next);
              onCancel();
            }}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={pending || !isDirty}>
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
        </div>
      </div>
    );
  }

  return (
    <div className="surface p-6 rounded-2xl">
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
        <Button asChild className="schedule-call-btn">
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Hero status card */}
        <div className="surface-elevated p-6 lg:p-8 rounded-2xl relative overflow-hidden">
          {/* Animated background effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary)/0.05)] to-transparent" />

          <div className="relative">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/0.1)]">
                  <Rocket className="h-7 w-7 text-[hsl(var(--primary))]" />
                </div>
                {/* Pulsing indicator */}
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--primary))] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-[hsl(var(--primary))]"></span>
                </span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">Your Site is Being Built</h2>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  Our team is actively working on your website. We&apos;re crafting every detail to match your vision
                  and brand. You&apos;ll receive an update once it&apos;s ready for review.
                </p>
              </div>
            </div>

            {/* Progress indicators */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-xl bg-[var(--background)]/50">
                <p className="text-2xl font-bold text-[hsl(var(--primary))]">2-3</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">Business Days</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-[var(--background)]/50">
                <p className="text-2xl font-bold text-emerald-500">Active</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">Build Status</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-[var(--background)]/50">
                <p className="text-2xl font-bold">Soon</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">Preview Ready</p>
              </div>
            </div>
          </div>
        </div>

        {/* What's happening card */}
        <div className="surface p-6 rounded-2xl">
          <h3 className="font-semibold mb-4">What&apos;s Happening Now</h3>
          <div className="space-y-3">
            {[
              { icon: Palette, label: "Designing your unique layout and visuals", done: true },
              { icon: Settings, label: "Building responsive components", done: false },
              { icon: Globe, label: "Setting up your domain and hosting", done: false },
              { icon: BarChart3, label: "Integrating analytics and forms", done: false },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    item.done
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                  }`}>
                    {item.done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={`text-sm ${item.done ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="lg:col-span-1 space-y-4">
        {/* Kickoff call card */}
        {calKickoffBooking && (
          <CallCtaOrSummary
            kind="kickoff"
            booking={calKickoffBooking}
            calUrl={CAL_KICKOFF_URL}
          />
        )}

        {/* What to expect card */}
        <div className="surface-soft p-5 rounded-xl">
          <h4 className="font-semibold text-sm mb-3">What to Expect Next</h4>
          <ul className="space-y-3 text-xs text-[var(--muted-foreground)]">
            <li className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] text-[10px] font-bold">
                1
              </div>
              <span>We&apos;ll send you a staging link to preview</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] text-[10px] font-bold">
                2
              </div>
              <span>Schedule a review call for feedback</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] text-[10px] font-bold">
                3
              </div>
              <span>We make revisions based on your input</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] text-[10px] font-bold">
                4
              </div>
              <span>Your site goes live!</span>
            </li>
          </ul>
        </div>

        {/* Contact card */}
        <div className="surface-soft p-5 rounded-xl">
          <h4 className="font-semibold text-sm mb-2">Questions?</h4>
          <p className="text-xs text-[var(--muted-foreground)] mb-3">
            We&apos;re here if you need to discuss anything about your build.
          </p>
          <a
            href="mailto:support@acadianawebdesign.com"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--primary))] hover:underline"
          >
            <Send className="h-3.5 w-3.5" />
            Get in Touch
          </a>
        </div>
      </div>
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
  const absoluteStagingUrl = stagingUrl
    ? stagingUrl.startsWith('http://') || stagingUrl.startsWith('https://')
      ? stagingUrl
      : `https://${stagingUrl}`
    : undefined;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Preview hero card */}
        <div className="surface-elevated p-6 lg:p-8 rounded-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />

          <div className="relative">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
                  <FileCheck className="h-7 w-7 text-emerald-500" />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">Your Site is Ready for Review</h2>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  We&apos;ve finished building your website and it&apos;s ready for you to preview.
                  Check out the staging site and let us know your thoughts!
                </p>
              </div>
            </div>

            {/* Staging URL card */}
            <div className="mt-6 p-4 rounded-xl bg-[var(--background)]/50 border border-[var(--border)]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--primary)/0.1)] flex-shrink-0">
                    <Globe className="h-5 w-5 text-[hsl(var(--primary))]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">Staging Preview</p>
                    {absoluteStagingUrl ? (
                      <p className="text-sm font-mono truncate">{stagingUrl}</p>
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)] italic">Link coming soon...</p>
                    )}
                  </div>
                </div>
                {absoluteStagingUrl && (
                  <Button asChild className="schedule-call-btn flex-shrink-0">
                    <a href={absoluteStagingUrl} target="_blank" rel="noopener noreferrer">
                      Open Preview <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Review tips */}
        <div className="surface p-6 rounded-2xl">
          <h3 className="font-semibold mb-4">Review Checklist</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "Check all pages load correctly", icon: FileText },
              { label: "Test on mobile devices", icon: Settings },
              { label: "Review contact forms work", icon: Send },
              { label: "Verify all links are correct", icon: Link2 },
              { label: "Check images and branding", icon: Palette },
              { label: "Test site speed and performance", icon: BarChart3 },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--muted)]/30">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--background)]">
                    <Icon className="h-4 w-4 text-[var(--muted-foreground)]" />
                  </div>
                  <span className="text-sm">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="lg:col-span-1 space-y-4">
        {/* Review call card */}
        <CallCtaOrSummary
          kind="review"
          booking={reviewBooking}
          calUrl={CAL_REVIEW_URL}
        />

        {/* What happens next */}
        <div className="surface-soft p-5 rounded-xl">
          <h4 className="font-semibold text-sm mb-3">After Your Review</h4>
          <ul className="space-y-3 text-xs text-[var(--muted-foreground)]">
            <li className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                1
              </div>
              <span>Share your feedback with us</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                2
              </div>
              <span>We&apos;ll make any requested changes</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                3
              </div>
              <span>Final approval and go live!</span>
            </li>
          </ul>
        </div>

        {/* Need changes? */}
        <div className="surface-soft p-5 rounded-xl">
          <h4 className="font-semibold text-sm mb-2">Found Something?</h4>
          <p className="text-xs text-[var(--muted-foreground)] mb-3">
            Noticed something that needs adjustment? Let us know during your review call or send us a message.
          </p>
          <a
            href="mailto:support@acadianawebdesign.com"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--primary))] hover:underline"
          >
            <Send className="h-3.5 w-3.5" />
            Send Feedback
          </a>
        </div>
      </div>
    </div>
  );
}

function LiveSupportPanel({
  projectId,
  projectSlug,
  liveUrl,
  domainPreference,
  editRequests = [],
  subscriptionCreatedAt,
}: {
  projectId: Id<"projects">;
  projectSlug: string;
  liveUrl?: string;
  domainPreference?: string;
  editRequests?: EditRequest[];
  subscriptionCreatedAt?: number;
}) {
  const [portalLoading, setPortalLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "support">("overview");
  const createPortalSession = useAction(api.stripeActions.createCustomerPortalSession);

  const absoluteLiveUrl = liveUrl
    ? liveUrl.startsWith('http://') || liveUrl.startsWith('https://')
      ? liveUrl
      : `https://${liveUrl}`
    : undefined;

  // Calculate if 12 months have passed since subscription started
  const twelveMonthsMs = 365 * 24 * 60 * 60 * 1000;
  const isEligibleForPortal = subscriptionCreatedAt
    ? Date.now() - subscriptionCreatedAt >= twelveMonthsMs
    : false;

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    try {
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch (error) {
      console.error("Failed to open customer portal:", error);
      toast.error("Failed to open subscription portal. Please try again.");
      setPortalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Live Site Header Banner */}
      <div className="surface-elevated p-6 lg:p-8 rounded-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-[hsl(var(--primary)/0.05)]" />

        <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left side - Site info */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 ring-4 ring-emerald-500/20">
                  <Globe className="h-7 w-7 text-emerald-500" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-semibold">Your Site is Live</h2>
                  <span className="flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                </div>
                {absoluteLiveUrl ? (
                  <a
                    href={absoluteLiveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-mono text-[hsl(var(--primary))] hover:underline inline-flex items-center gap-1"
                  >
                    {liveUrl}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <p className="text-sm text-[var(--muted-foreground)]">URL will appear here shortly</p>
                )}
                {domainPreference && (
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    Domain: <span className="font-mono">{domainPreference}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Right side - Quick actions */}
            <div className="flex flex-wrap items-center gap-3">
              {absoluteLiveUrl && (
                <Button asChild className="schedule-call-btn">
                  <a href={absoluteLiveUrl} target="_blank" rel="noopener noreferrer">
                    Visit Site <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              )}
              {isEligibleForPortal && (
                <Button
                  onClick={handleOpenPortal}
                  variant="outline"
                  disabled={portalLoading}
                  size="sm"
                >
                  {portalLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Settings className="h-4 w-4 mr-1.5" />
                      Billing
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--muted)]/50 w-fit">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === "overview"
              ? "bg-[var(--background)] text-[var(--foreground)] shadow-sm"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          <span className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </span>
        </button>
        <button
          onClick={() => setActiveTab("support")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === "support"
              ? "bg-[var(--background)] text-[var(--foreground)] shadow-sm"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          <span className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Support
            {editRequests.length > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[10px] font-bold text-white px-1.5">
                {editRequests.length}
              </span>
            )}
          </span>
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "overview" ? (
        <div className="space-y-6">
          {/* Recent Leads - full width at top */}
          <RecentLeads projectId={projectSlug} limit={10} />

          {/* KPI Stats Row */}
          <DashboardStats projectId={projectSlug} />

          {/* Analytics Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            {/* Chart - takes more space */}
            <div className="xl:col-span-3">
              <PageViewsChart projectId={projectSlug} days={30} />
            </div>
            {/* Top Pages - sidebar */}
            <div className="xl:col-span-2">
              <TopPages projectId={projectSlug} limit={5} />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Edit Requests List */}
            <EditRequestsList projectId={projectId} editRequests={editRequests} />

            {/* Support form */}
            <div className="surface p-6 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--primary)/0.1)]">
                  <Send className="h-5 w-5 text-[hsl(var(--primary))]" />
                </div>
                <div>
                  <h3 className="font-semibold">Request Edits or Support</h3>
                  <p className="text-xs text-[var(--muted-foreground)]">We typically respond within 24 hours</p>
                </div>
              </div>
              <SupportRequestForm projectId={projectId} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Quick help */}
            <div className="surface-soft p-5 rounded-xl">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-[hsl(var(--primary))]" />
                Need Quick Help?
              </h4>
              <div className="space-y-3">
                <a
                  href="mailto:support@acadianawebdesign.com"
                  className="flex items-center gap-3 p-3 rounded-lg bg-[var(--background)]/50 hover:bg-[var(--background)] transition-colors"
                >
                  <Send className="h-4 w-4 text-[var(--muted-foreground)]" />
                  <div>
                    <p className="text-sm font-medium">Email Support</p>
                    <p className="text-xs text-[var(--muted-foreground)]">support@acadianawebdesign.com</p>
                  </div>
                </a>
              </div>
            </div>

            {/* What's included */}
            <div className="surface-soft p-5 rounded-xl">
              <h4 className="font-semibold text-sm mb-3">Support Includes</h4>
              <ul className="space-y-2 text-xs text-[var(--muted-foreground)]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                  Content updates and text changes
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                  Image and media replacements
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                  Bug fixes and technical issues
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                  Minor design adjustments
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const createEditRequest = useMutation(api.projects.createEditRequest);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  // Cleanup preview URLs on unmount or when files change
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validation: max 5 files
    if (files.length > 5) {
      toast.error("Maximum 5 files allowed");
      return;
    }

    // Validation: file types and sizes
    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    const validFiles: File[] = [];
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name} is not a supported image type. Please use PNG, JPEG, WebP, or SVG.`);
        continue;
      }
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large. Maximum size is 10MB.`);
        continue;
      }
      validFiles.push(file);
    }

    // Cleanup old preview URLs
    previewUrls.forEach(url => URL.revokeObjectURL(url));

    // Create new preview URLs
    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(newPreviewUrls);
    setSelectedFiles(validFiles);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.details.trim()) {
      toast.error("Please provide both a title and details");
      return;
    }

    setPending(true);

    try {
      // Upload files if any
      let attachmentIds: Id<"_storage">[] | undefined;
      if (selectedFiles.length > 0) {
        const uploadedIds: Id<"_storage">[] = [];
        const failedFiles: string[] = [];

        for (const file of selectedFiles) {
          try {
            const uploadUrl = await generateUploadUrl();
            const uploadResult = await fetch(uploadUrl, {
              method: "POST",
              headers: { "Content-Type": file.type },
              body: file,
            });

            if (!uploadResult.ok) {
              throw new Error(`Failed to upload ${file.name}`);
            }

            const { storageId } = await uploadResult.json();
            uploadedIds.push(storageId);
          } catch (error) {
            console.error(`Failed to upload ${file.name}:`, error);
            failedFiles.push(file.name);
          }
        }

        if (failedFiles.length > 0) {
          toast.warning(`Some files failed to upload: ${failedFiles.join(", ")}. Request will be submitted with ${uploadedIds.length} attachment(s).`);
        }

        if (uploadedIds.length > 0) {
          attachmentIds = uploadedIds;
        }
      }

      await createEditRequest({
        projectId,
        title: formData.title.trim(),
        details: formData.details.trim(),
        priority: formData.priority,
        attachmentIds,
      });

      toast.success("Support request submitted!");
      
      // Reset form and files
      setFormData({
        title: "",
        details: "",
        priority: "normal",
      });
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      setSelectedFiles([]);
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
        <Label htmlFor="support-title" className="mb-1.5 inline-block">Title *</Label>
        <Input
          id="support-title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Brief description of your request"
          className="mt-1.5"
          required
        />
      </div>

      <div>
        <Label htmlFor="support-details" className="mb-1.5 inline-block">Details *</Label>
        <Textarea
          id="support-details"
          value={formData.details}
          onChange={(e) => setFormData({ ...formData, details: e.target.value })}
          placeholder="Describe what you'd like changed or what issue you're experiencing..."
          rows={4}
          className="mt-1.5"
          required
        />
      </div>

      <div>
        <Label htmlFor="support-priority" className="mb-1.5 inline-block">Priority</Label>
        <select
          id="support-priority"
          value={formData.priority}
          onChange={(e) => setFormData({ ...formData, priority: e.target.value as "low" | "normal" | "high" })}
          className="form-control mt-1.5 h-10 w-full text-sm"
        >
          <option value="low">Low - Nice to have</option>
          <option value="normal">Normal - Standard request</option>
          <option value="high">High - Urgent issue</option>
        </select>
      </div>

      <div>
        <Label htmlFor="support-attachments" className="mb-1.5 inline-block">Attachments (Optional)</Label>
        <Input
          id="support-attachments"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          multiple
          className="mt-1.5"
          onChange={handleFileChange}
        />
        <p className="mt-1 text-xs text-[var(--secondary)]">
          Upload up to 5 images (PNG, JPEG, WebP, or SVG). Max 10MB per file.
        </p>
        {selectedFiles.length > 0 && (
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
            ✓ {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""} selected
          </p>
        )}

        {/* Preview thumbnails */}
        {previewUrls.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {previewUrls.map((url, idx) => (
              <div key={`preview-${idx}`} className="rounded-lg border border-[var(--border)] p-2 bg-[var(--muted)]/20">
                <Image
                  src={url}
                  alt={`Preview ${idx + 1}`}
                  width={200}
                  height={96}
                  className="w-full h-24 object-cover rounded"
                  unoptimized
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting..." : "Submit Request"}
        </Button>
      </div>
    </form>
  );
}

function EditRequestsList({ 
  projectId,
  editRequests = []
}: { 
  projectId: Id<"projects">;
  editRequests?: EditRequest[]
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cachedUrls, setCachedUrls] = useState<Record<string, Record<Id<"_storage">, string>>>({});

  const fileUrls = useQuery(
    api.files.getUrls,
    expandedId && editRequests.find(r => r._id === expandedId)?.attachments?.length
      ? {
          projectId,
          storageIds: editRequests.find(r => r._id === expandedId)!.attachments!,
        }
      : "skip"
  );

  // Cache URLs when they're fetched
  useEffect(() => {
    if (expandedId && fileUrls) {
      setCachedUrls(prev => ({
        ...prev,
        [expandedId]: fileUrls,
      }));
    }
  }, [expandedId, fileUrls]);

  if (editRequests.length === 0) {
    return (
      <div className="surface-soft p-6 rounded-2xl text-center">
        <p className="text-sm text-[var(--secondary)]">
          No support requests yet. Submit one above if you need any changes!
        </p>
      </div>
    );
  }

  const getPriorityLabel = (priority: EditRequest["priority"]) => {
    const labels = { low: "Low", normal: "Normal", high: "High" };
    return labels[priority];
  };

  return (
    <div className="surface p-6 rounded-2xl">
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
              className="surface p-4 rounded-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-sm">{request.title}</h4>
                    {(() => {
                      const { className, label } = requestStatusPill(request.status);
                      return <span className={className}>{label}</span>;
                    })()}
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

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-[var(--border)]">
                  {request.details && (
                    <p className="text-sm text-[var(--secondary)] whitespace-pre-wrap mb-3">
                      {request.details}
                    </p>
                  )}
                  
                  {/* Attachment thumbnails */}
                  {request.attachments && request.attachments.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-[var(--secondary)] mb-2">
                        Attachments ({request.attachments.length})
                      </p>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {request.attachments.map((storageId) => {
                          const url = cachedUrls[request._id]?.[storageId];
                          if (!url) return null;
                          return (
                            <a
                              key={storageId}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg border border-[var(--border)] p-2 bg-[var(--muted)]/20 hover:bg-[var(--muted)]/40 transition"
                            >
                              <Image
                                src={url}
                                alt="Attachment"
                                width={200}
                                height={96}
                                className="w-full h-24 object-cover rounded"
                                unoptimized
                              />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
