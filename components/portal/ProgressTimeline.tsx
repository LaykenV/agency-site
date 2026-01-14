"use client";

import { useState } from "react";
import {
  FileText,
  CreditCard,
  Upload,
  Rocket,
  FileCheck,
  Globe,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";

type ProjectStatus =
  | "AWAITING_AGREEMENT"
  | "AWAITING_PAYMENT"
  | "AWAITING_ASSETS"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "LIVE"
  | "ARCHIVED";

interface ProgressTimelineProps {
  currentStatus: ProjectStatus;
  className?: string;
}

const STEPS = [
  {
    status: "AWAITING_AGREEMENT" as const,
    icon: FileText,
    label: "Agreement",
    description: "Review and sign",
  },
  {
    status: "AWAITING_PAYMENT" as const,
    icon: CreditCard,
    label: "Payment",
    description: "Complete checkout",
  },
  {
    status: "AWAITING_ASSETS" as const,
    icon: Upload,
    label: "Assets",
    description: "Share your brand",
  },
  {
    status: "IN_PROGRESS" as const,
    icon: Rocket,
    label: "Building",
    description: "Crafting your site",
  },
  {
    status: "IN_REVIEW" as const,
    icon: FileCheck,
    label: "Review",
    description: "Preview and feedback",
  },
  {
    status: "LIVE" as const,
    icon: Globe,
    label: "Live",
    description: "Your site is live",
  },
];

function getStepNumber(status: ProjectStatus): number {
  const index = STEPS.findIndex((s) => s.status === status);
  return index >= 0 ? index + 1 : 0;
}

export function ProgressTimeline({
  currentStatus,
  className = "",
}: ProgressTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const currentStep = getStepNumber(currentStatus);
  const currentStepData = STEPS[currentStep - 1];

  // Don't show timeline for LIVE status (they see the dashboard instead)
  // or ARCHIVED status
  if (currentStatus === "LIVE" || currentStatus === "ARCHIVED") {
    return null;
  }

  return (
    <div className={`surface-elevated rounded-2xl ${className}`}>
      {/* Mobile: Compact pill with expand */}
      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 flex items-center justify-between gap-3"
          aria-expanded={isExpanded}
          aria-controls="mobile-timeline-expanded"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white shadow-lg shadow-[hsl(var(--primary)/0.3)]">
              {currentStepData && <currentStepData.icon className="h-5 w-5" />}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">
                Step {currentStep} of {STEPS.length}: {currentStepData?.label}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {currentStepData?.description}
              </p>
            </div>
          </div>
          <ChevronDown
            className={`h-5 w-5 text-[var(--muted-foreground)] transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Expanded mobile timeline */}
        <div
          id="mobile-timeline-expanded"
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
            isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="px-4 pb-4 pt-2 border-t border-[var(--border)]">
              <div className="flex flex-col gap-2">
                {STEPS.map((step, index) => {
                  const stepNum = index + 1;
                  const Icon = step.icon;
                  const isCompleted = currentStep > stepNum;
                  const isCurrent = currentStep === stepNum;

                  return (
                    <div
                      key={step.status}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                        isCurrent
                          ? "bg-[hsl(var(--primary)/0.1)]"
                          : isCompleted
                            ? "bg-emerald-500/5"
                            : "bg-transparent"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all flex-shrink-0 ${
                          isCompleted
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : isCurrent
                              ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white"
                              : "border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)]"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            isCurrent
                              ? "text-[var(--foreground)]"
                              : isCompleted
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-[var(--muted-foreground)]"
                          }`}
                        >
                          {step.label}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)] truncate">
                          {step.description}
                        </p>
                      </div>
                      {isCompleted && (
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          Done
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-xs font-medium text-[hsl(var(--primary))]">
                          Current
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: Full horizontal timeline */}
      <div className="hidden sm:block p-4 sm:p-6">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const stepNum = index + 1;
            const Icon = step.icon;
            const isCompleted = currentStep > stepNum;
            const isCurrent = currentStep === stepNum;

            return (
              <div
                key={step.status}
                className="flex items-center flex-1 justify-center sm:justify-start"
              >
                {/* Step indicator */}
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      flex h-10 w-10 lg:h-12 lg:w-12 items-center justify-center rounded-full border-2 transition-all
                      ${
                        isCompleted
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : isCurrent
                            ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white shadow-lg shadow-[hsl(var(--primary)/0.3)]"
                            : "border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)]"
                      }
                    `}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 lg:h-6 lg:w-6" />
                    ) : (
                      <Icon className="h-5 w-5 lg:h-6 lg:w-6" />
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p
                      className={`text-xs font-medium ${
                        isCurrent
                          ? "text-[var(--foreground)]"
                          : isCompleted
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-[var(--muted-foreground)]"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5 max-w-[80px] hidden lg:block">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Connector line */}
                {index < STEPS.length - 1 && (
                  <div className="flex-1 mx-2 lg:mx-4">
                    <div
                      className={`h-0.5 rounded-full transition-all ${
                        currentStep > stepNum
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
      </div>
    </div>
  );
}
