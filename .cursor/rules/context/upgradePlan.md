# Onboarding Refactoring Plan

**Status:** Ready to implement  
**Last Updated:** October 19, 2025  
**Priority:** High - Foundation for future maintainability

## Overview

This plan addresses three critical architectural improvements to the onboarding system:
1. **DRY up validators** - Eliminate duplication across schema, functions, and types
2. **Decompose the hook** - Split `useOnboardingSession` into focused, testable pieces
3. **Type safety** - Leverage Convex's generated types for single source of truth

---

## Task 1: Extract Validators to Shared File

### Problem
Validators are duplicated in three places:
- `convex/schema.ts` - Schema definition
- `convex/onboarding/sessions.ts` - Function args validation
- `types/onboarding.ts` - TypeScript types (manual)

This creates maintenance burden and risk of drift.

### Solution
Create a single canonical validator file and import it everywhere.

### Implementation Steps

#### 1.1 Create Validator File
**File:** `convex/onboarding/validators.ts`

```typescript
import { v } from "convex/values";

export const briefValidator = v.object({
  contactName: v.string(),
  contactEmail: v.string(),
  companyName: v.string(),
  phone: v.string(),
  currentWebsite: v.string(),
  businessDescription: v.string(),
  goals: v.string(),
  notes: v.string(),
});

export const planValidator = v.object({
  generatedAt: v.number(),
  promptVersion: v.string(),
  headline: v.string(),
  summary: v.string(),
  highlights: v.array(v.string()),
  nextSteps: v.array(v.string()),
});

// Add constants while we're at it
export const PLAN_GENERATION_THROTTLE_MS = 15_000; // 15 seconds
export const PLAN_TEXT_MAX_LENGTH = 280;
export const SESSION_EXPIRY_DAYS = 30;
```

#### 1.2 Update Schema
**File:** `convex/schema.ts`

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { briefValidator, planValidator } from "./onboarding/validators";

// Remove the local definitions:
// const onboardingBrief = v.object({...}); ❌ DELETE
// const onboardingPlan = v.object({...}); ❌ DELETE

export default defineSchema({
  onboarding_sessions: defineTable({
    sessionId: v.string(),
    resumeToken: v.string(),
    brief: briefValidator, // ✅ Import from validators
    plan: v.optional(planValidator), // ✅ Import from validators
    contactEmail: v.optional(v.string()),
    lastPlanRequestedAt: v.optional(v.number()),
    planGenerationInProgress: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_resumeToken", ["resumeToken"])
    .index("by_contactEmail", ["contactEmail"])
    .index("by_updatedAt", ["updatedAt"]),

  projects: defineTable({
    authUserId: v.string(),
    projectId: v.string(),
    onboardingSessionId: v.optional(v.id("onboarding_sessions")),
    planTier: v.union(v.string(), v.null()),
    planProposal: v.optional(planValidator), // ✅ Reuse here too
    projectStatus: v.optional(projectStatus),
    paymentStatus: v.optional(paymentStatus),
    postPay: v.optional(postPay),
    deployment: v.optional(deployment),
  })
    .index("by_authUserId", ["authUserId"])
    .index("by_projectId", ["projectId"]),
});
```

#### 1.3 Update Sessions Functions
**File:** `convex/onboarding/sessions.ts`

```typescript
import { internalAction, internalMutation, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import type { OnboardingPlan } from "../../types/onboarding";
import { generatePlanWithAgent } from "./agent";
import type { ActionCtx } from "../_generated/server";
import { 
  briefValidator, 
  planValidator, 
  PLAN_GENERATION_THROTTLE_MS 
} from "./validators"; // ✅ Import validators

// Remove local definitions:
// const briefValidator = v.object({...}); ❌ DELETE
// const planValidator = v.object({...}); ❌ DELETE

// ... rest of file stays the same

// In generatePlan mutation, replace magic number:
export const generatePlan = mutation({
  args: {
    sessionId: v.string(),
    resumeToken: v.string(),
    brief: briefValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // ... existing validation

    const now = Date.now();

    if (session.planGenerationInProgress) {
      return null;
    }
    
    // ✅ Use constant instead of magic number
    if (typeof session.lastPlanRequestedAt === "number" && 
        now - session.lastPlanRequestedAt < PLAN_GENERATION_THROTTLE_MS) {
      throw new Error("Plan generation is throttled. Please wait before trying again.");
    }

    // ... rest of handler
  },
});
```

#### 1.4 Update Agent File
**File:** `convex/onboarding/agent.ts`

```typescript
import { groq } from "@ai-sdk/groq";
import { Agent } from "@convex-dev/agent";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";
import { components } from "../_generated/api";
import type { OnboardingBrief, OnboardingPlanCore } from "../../types/onboarding";
import { briefValidator, PLAN_TEXT_MAX_LENGTH } from "./validators"; // ✅ Import

// Update action args to use shared validator:
export const generateOnboardingPlan = internalAction({
  args: {
    brief: briefValidator, // ✅ Use shared validator
  },
  returns: v.object({
    promptVersion: v.string(),
    headline: v.string(),
    summary: v.string(),
    highlights: v.array(v.string()),
    nextSteps: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    return await generatePlanWithAgent(ctx as ActionCtx, args.brief);
  },
});

// In sanitizeString, use constant:
function sanitizeString(value: unknown, fallback: string): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed.slice(0, PLAN_TEXT_MAX_LENGTH); // ✅ Use constant
    }
  }
  return fallback;
}
```

#### 1.5 Verification Steps
- [ ] Run `npx convex dev` to ensure schema compiles
- [ ] Check that all imports resolve correctly
- [ ] Test form submission to verify validators work
- [ ] Test plan generation to ensure throttling still works

---

## Task 2: Split useOnboardingSession into Smaller Hooks

### Problem
`useOnboardingSession` has 260 lines and handles 8 different concerns:
- Session initialization & localStorage
- Remote data fetching & hydration
- Debounced autosave logic
- Dirty field tracking
- Plan generation orchestration
- Error handling
- Multiple useEffect chains with complex dependencies

This makes it:
- Hard to understand
- Hard to test
- Hard to debug
- Hard to reuse parts in isolation

### Solution
Decompose into 4 focused hooks with clear responsibilities:
1. `useSessionInit` - Handle session creation & persistence
2. `useSessionData` - Fetch & hydrate remote data
3. `useAutosave` - Debounced saving logic
4. `usePlanGenerator` - Plan generation orchestration
5. `useOnboardingSession` - Compose everything together

### Implementation Steps

#### 2.1 Create Session Initialization Hook
**File:** `lib/convex/onboarding/hooks/useSessionInit.ts`

```typescript
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const SESSION_STORAGE_KEY = "onboarding_session";

type StoredSession = {
  sessionId: string;
  resumeToken: string;
};

type UseSessionInitResult = {
  sessionId: string | null;
  resumeToken: string | null;
  isInitializing: boolean;
  error: Error | null;
};

export function useSessionInit(): UseSessionInitResult {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [resumeToken, setResumeToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const initializingRef = useRef(false);

  const initSession = useMutation(api.onboarding.sessions.initSession);

  const initializeSession = useCallback(async () => {
    if (initializingRef.current) return;

    initializingRef.current = true;
    setIsInitializing(true);

    try {
      // Check localStorage first
      const stored = typeof window !== "undefined" 
        ? localStorage.getItem(SESSION_STORAGE_KEY) 
        : null;

      if (stored) {
        const parsed: StoredSession = JSON.parse(stored);
        setSessionId(parsed.sessionId);
        setResumeToken(parsed.resumeToken);
        setIsInitializing(false);
        return;
      }

      // Create new session
      const result = await initSession({});
      setSessionId(result.sessionId);
      setResumeToken(result.resumeToken);

      // Persist to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({ 
            sessionId: result.sessionId, 
            resumeToken: result.resumeToken 
          })
        );
      }
    } catch (err) {
      console.error("Failed to initialize session", err);
      setError(err instanceof Error ? err : new Error("Session init failed"));
    } finally {
      setIsInitializing(false);
      initializingRef.current = false;
    }
  }, [initSession]);

  useEffect(() => {
    if (!sessionId && !initializingRef.current) {
      initializeSession();
    }
  }, [sessionId, initializeSession]);

  return {
    sessionId,
    resumeToken,
    isInitializing,
    error,
  };
}
```

#### 2.2 Create Session Data Hook
**File:** `lib/convex/onboarding/hooks/useSessionData.ts`

```typescript
"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { OnboardingBrief, OnboardingPlan, defaultBrief } from "@/types/onboarding";

type UseSessionDataOptions = {
  sessionId: string | null;
  localBrief: OnboardingBrief;
};

type UseSessionDataResult = {
  remoteBrief: OnboardingBrief;
  remotePlan: OnboardingPlan | undefined;
  isHydrated: boolean;
};

export function useSessionData({ 
  sessionId, 
  localBrief 
}: UseSessionDataOptions): UseSessionDataResult {
  const [isHydrated, setIsHydrated] = useState(false);
  const [remoteBrief, setRemoteBrief] = useState<OnboardingBrief>(defaultBrief);
  const [remotePlan, setRemotePlan] = useState<OnboardingPlan | undefined>(undefined);

  const sessionQuery = useQuery(
    api.onboarding.sessions.getSession,
    sessionId ? { sessionId } : "skip"
  );

  useEffect(() => {
    if (sessionQuery === undefined) return;
    if (!sessionQuery) return;

    // On first hydration, use server data
    if (!isHydrated) {
      setRemoteBrief({
        ...defaultBrief,
        ...sessionQuery.brief,
      });
      setIsHydrated(true);
    }

    // Always sync plan from server
    if (sessionQuery.plan) {
      setRemotePlan(sessionQuery.plan);
    }
  }, [sessionQuery, isHydrated]);

  return {
    remoteBrief: isHydrated ? remoteBrief : localBrief,
    remotePlan,
    isHydrated,
  };
}
```

#### 2.3 Create Autosave Hook
**File:** `lib/convex/onboarding/hooks/useAutosave.ts`

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { OnboardingBrief, OnboardingField } from "@/types/onboarding";

type UseAutosaveOptions = {
  sessionId: string | null;
  resumeToken: string | null;
  brief: OnboardingBrief;
  dirtyFields: Set<OnboardingField>;
  onClearDirty: () => void;
  onError?: () => void;
};

type UseAutosaveResult = {
  isSaving: boolean;
  forceSave: () => Promise<void>;
};

const DEBOUNCE_MS = 500;

export function useAutosave({
  sessionId,
  resumeToken,
  brief,
  dirtyFields,
  onClearDirty,
  onError,
}: UseAutosaveOptions): UseAutosaveResult {
  const [isSaving, setIsSaving] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const updateBrief = useMutation(api.onboarding.sessions.updateBrief);

  // Autosave on field changes
  useEffect(() => {
    if (!dirtyFields.size || !sessionId || !resumeToken) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        await updateBrief({
          sessionId,
          resumeToken,
          brief,
        });
        onClearDirty();
      } catch (error) {
        console.error("Failed to update brief", error);
        onError?.();
      } finally {
        setIsSaving(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [dirtyFields.size, sessionId, resumeToken, brief, updateBrief, onClearDirty, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Force immediate save (useful before plan generation)
  const forceSave = async () => {
    if (!sessionId || !resumeToken || !dirtyFields.size) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    try {
      setIsSaving(true);
      await updateBrief({
        sessionId,
        resumeToken,
        brief,
      });
      onClearDirty();
    } catch (error) {
      console.error("Failed to force save brief", error);
      onError?.();
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isSaving,
    forceSave,
  };
}
```

#### 2.4 Create Plan Generator Hook
**File:** `lib/convex/onboarding/hooks/usePlanGenerator.ts`

```typescript
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { OnboardingBrief, OnboardingPlan } from "@/types/onboarding";

type UsePlanGeneratorOptions = {
  sessionId: string | null;
  resumeToken: string | null;
  brief: OnboardingBrief;
  remotePlan: OnboardingPlan | undefined;
  onError?: () => void;
};

type UsePlanGeneratorResult = {
  isGenerating: boolean;
  generate: () => Promise<void>;
};

export function usePlanGenerator({
  sessionId,
  resumeToken,
  brief,
  remotePlan,
  onError,
}: UsePlanGeneratorOptions): UsePlanGeneratorResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const latestPlanTimestampRef = useRef<number | null>(null);

  const generatePlanMutation = useMutation(api.onboarding.sessions.generatePlan);

  // Watch for plan updates to stop spinner
  useEffect(() => {
    const planTimestamp = remotePlan?.generatedAt ?? null;
    if (planTimestamp !== latestPlanTimestampRef.current) {
      latestPlanTimestampRef.current = planTimestamp;
      setIsGenerating(false);
    }
  }, [remotePlan]);

  const generate = useCallback(async () => {
    if (!sessionId || !resumeToken) {
      throw new Error("Session not initialized");
    }

    try {
      setIsGenerating(true);
      await generatePlanMutation({
        sessionId,
        resumeToken,
        brief,
      });
    } catch (error) {
      console.error("Failed to generate plan", error);
      setIsGenerating(false);
      onError?.();
      throw error;
    }
  }, [sessionId, resumeToken, brief, generatePlanMutation, onError]);

  return {
    isGenerating,
    generate,
  };
}
```

#### 2.5 Refactor Main Hook
**File:** `lib/convex/onboarding/useOnboardingSession.ts`

```typescript
"use client";

import { useCallback, useState } from "react";
import { OnboardingBrief, OnboardingField, defaultBrief } from "@/types/onboarding";
import { useSessionInit } from "./hooks/useSessionInit";
import { useSessionData } from "./hooks/useSessionData";
import { useAutosave } from "./hooks/useAutosave";
import { usePlanGenerator } from "./hooks/usePlanGenerator";

type UseOnboardingSessionOptions = {
  onError?: () => void;
};

export function useOnboardingSession({ 
  onError 
}: UseOnboardingSessionOptions = {}) {
  // Local state for optimistic updates
  const [localBrief, setLocalBrief] = useState<OnboardingBrief>(defaultBrief);
  const [dirtyFields, setDirtyFields] = useState<Set<OnboardingField>>(new Set());

  // Session initialization
  const { sessionId, resumeToken, isInitializing } = useSessionInit();

  // Remote data sync
  const { remoteBrief, remotePlan, isHydrated } = useSessionData({
    sessionId,
    localBrief,
  });

  // Use remote brief if hydrated, otherwise local
  const brief = isHydrated ? localBrief : remoteBrief;

  // Autosave
  const { isSaving, forceSave } = useAutosave({
    sessionId,
    resumeToken,
    brief: localBrief,
    dirtyFields,
    onClearDirty: () => setDirtyFields(new Set()),
    onError,
  });

  // Plan generation
  const { isGenerating, generate } = usePlanGenerator({
    sessionId,
    resumeToken,
    brief: localBrief,
    remotePlan,
    onError,
  });

  // Field update handler
  const write = useCallback(
    <K extends OnboardingField>(field: K, value: OnboardingBrief[K]) => {
      setLocalBrief((prev) => ({
        ...prev,
        [field]: value,
      }));
      setDirtyFields((prev) => {
        const next = new Set(prev);
        next.add(field);
        return next;
      });
    },
    []
  );

  // Plan generation with force save
  const generatePlan = useCallback(async () => {
    if (!sessionId) {
      throw new Error("Session not initialized");
    }

    // Force save any pending changes first
    if (dirtyFields.size > 0) {
      await forceSave();
    }

    await generate();
  }, [sessionId, dirtyFields.size, forceSave, generate]);

  return {
    sessionId,
    brief,
    plan: remotePlan,
    dirtyFields,
    write,
    isHydrated,
    isSaving,
    isGeneratingPlan: isGenerating,
    generatePlan,
  } as const;
}
```

#### 2.6 Create Hooks Index
**File:** `lib/convex/onboarding/hooks/index.ts`

```typescript
export { useSessionInit } from "./useSessionInit";
export { useSessionData } from "./useSessionData";
export { useAutosave } from "./useAutosave";
export { usePlanGenerator } from "./usePlanGenerator";
```

#### 2.7 Update Component Import
**File:** `app/onboarding/OnboardingClient.tsx`

```typescript
// No changes needed! Hook signature stays the same
import { useOnboardingSession } from "@/lib/convex/onboarding/useOnboardingSession";

// Everything else stays the same
```

#### 2.8 Verification Steps
- [ ] Create the four new hook files
- [ ] Update the main `useOnboardingSession.ts` to compose them
- [ ] Test session initialization works
- [ ] Test form autosave still works
- [ ] Test plan generation still works
- [ ] Verify no functionality regression

---

## Task 3: Use Convex Generated Types

### Problem
Types are manually defined in `types/onboarding.ts` and can drift from the actual Convex schema. This creates:
- Maintenance burden (updating types in two places)
- Type safety gaps (schema changes don't break TypeScript)
- Confusion about which fields are internal vs public

### Solution
Use Convex's generated `Doc<"table_name">` types as the source of truth, and derive client-facing types from them.

### Implementation Steps

#### 3.1 Update Types File
**File:** `types/onboarding.ts`

```typescript
import type { Doc } from "@/convex/_generated/dataModel";

// ✅ Use Convex generated doc type as base
type OnboardingSessionDoc = Doc<"onboarding_sessions">;

// Brief is a nested field in the doc
export type OnboardingBrief = OnboardingSessionDoc["brief"];

// Plan is also nested
export type OnboardingPlan = NonNullable<OnboardingSessionDoc["plan"]>;

// Core plan payload generated by AI (without server timestamp)
export type OnboardingPlanCore = Omit<OnboardingPlan, "generatedAt">;

// Legacy alias for compatibility
export type PlanProposal = OnboardingPlan;

// Plan tier option (this is still custom for UI)
export type PlanTierOption = {
  id: string;
  label: string;
  price: string;
  description: string;
};

// Field names for form handling
export type OnboardingField = keyof OnboardingBrief;

// Public-facing session (subset of full doc)
export type OnboardingSession = Pick<
  OnboardingSessionDoc,
  "sessionId" | "resumeToken" | "brief" | "plan" | "createdAt" | "updatedAt"
>;

// Default brief for initialization
export const defaultBrief: OnboardingBrief = {
  contactName: "",
  contactEmail: "",
  companyName: "",
  phone: "",
  currentWebsite: "",
  businessDescription: "",
  goals: "",
  notes: "",
};
```

#### 3.2 Update Agent to Use Convex Validator Types
**File:** `convex/onboarding/agent.ts`

```typescript
import { groq } from "@ai-sdk/groq";
import { Agent } from "@convex-dev/agent";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";
import { components } from "../_generated/api";
import type { Doc } from "../_generated/dataModel"; // ✅ Import Doc type
import { briefValidator, PLAN_TEXT_MAX_LENGTH } from "./validators";

// ✅ Derive types from Convex schema
type OnboardingBrief = Doc<"onboarding_sessions">["brief"];
type OnboardingPlan = NonNullable<Doc<"onboarding_sessions">["plan"]>;
type OnboardingPlanCore = Omit<OnboardingPlan, "generatedAt">;

// ... rest of file stays the same, but now we're using generated types
```

#### 3.3 Update Sessions to Use Convex Types
**File:** `convex/onboarding/sessions.ts`

```typescript
import { internalAction, internalMutation, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel"; // ✅ Import Doc
import { generatePlanWithAgent } from "./agent";
import type { ActionCtx } from "../_generated/server";
import { 
  briefValidator, 
  planValidator, 
  PLAN_GENERATION_THROTTLE_MS 
} from "./validators";

// ✅ Derive types from schema
type OnboardingPlan = NonNullable<Doc<"onboarding_sessions">["plan"]>;

// Remove manual type import:
// import type { OnboardingPlan } from "../../types/onboarding"; ❌

// ... rest of file stays the same
```

#### 3.4 Update Hook to Use Convex Types
**File:** `lib/convex/onboarding/hooks/useSessionData.ts`

```typescript
"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel"; // ✅ Import

// ✅ Derive from Convex
type OnboardingBrief = Doc<"onboarding_sessions">["brief"];
type OnboardingPlan = NonNullable<Doc<"onboarding_sessions">["plan"]>;

// Or import from types file (which now derives from Convex):
// import { OnboardingBrief, OnboardingPlan } from "@/types/onboarding";

// ... rest of hook
```

#### 3.5 Add Type Helper Utilities
**File:** `convex/onboarding/types.ts`

```typescript
import type { Doc } from "../_generated/dataModel";

// Helper to extract nested types from Convex docs
export type OnboardingSessionDoc = Doc<"onboarding_sessions">;
export type OnboardingBrief = OnboardingSessionDoc["brief"];
export type OnboardingPlan = NonNullable<OnboardingSessionDoc["plan"]>;
export type OnboardingPlanCore = Omit<OnboardingPlan, "generatedAt">;

// Project types
export type ProjectDoc = Doc<"projects">;
export type ProjectStatus = NonNullable<ProjectDoc["projectStatus"]>;
export type PaymentStatus = NonNullable<ProjectDoc["paymentStatus"]>;
export type PostPay = NonNullable<ProjectDoc["postPay"]>;
export type Deployment = NonNullable<ProjectDoc["deployment"]>;
```

#### 3.6 Update All Imports Project-Wide

Files to update:
- `types/onboarding.ts` - Already done in 3.1
- `convex/onboarding/agent.ts` - Already done in 3.2
- `convex/onboarding/sessions.ts` - Already done in 3.3
- `lib/convex/onboarding/hooks/useSessionData.ts` - Already done in 3.4
- `lib/convex/onboarding/hooks/usePlanGenerator.ts` - Update imports
- `lib/convex/onboarding/useOnboardingSession.ts` - Update imports
- `app/onboarding/OnboardingClient.tsx` - Update imports

For each file:
```typescript
// ❌ Remove manual types:
// import type { OnboardingBrief, OnboardingPlan } from "@/types/onboarding";

// ✅ Use types that derive from Convex:
import { OnboardingBrief, OnboardingPlan } from "@/types/onboarding";
// (which now internally use Doc<"onboarding_sessions">)
```

#### 3.7 Verification Steps
- [ ] Run `npx convex dev` to regenerate types
- [ ] Search for all manual type definitions and replace with Convex-derived ones
- [ ] Fix any TypeScript errors that surface (these are good - they show drift!)
- [ ] Test that changing the schema now breaks TypeScript (proof of type safety)
- [ ] Verify all components still compile and work

---

## Testing Checklist

After implementing all three tasks:

### Functional Tests
- [ ] Visit `/onboarding` and form loads
- [ ] Fill out form fields and see autosave status
- [ ] Leave page and return - data persists
- [ ] Generate plan - spinner shows, plan appears
- [ ] Change form fields after plan - button says "Regenerate plan"
- [ ] Click "Schedule a call" link - Cal.com opens
- [ ] Check browser console - no errors
- [ ] Open dev tools Network tab - verify mutation timing

### Code Quality Tests
- [ ] Run TypeScript check: `npx tsc --noEmit`
- [ ] Run linter: `npm run lint` or `npx eslint .`
- [ ] Search for `v.object({` duplication - should only be in validators.ts
- [ ] Search for magic numbers (15000, 280, etc.) - should only be in constants
- [ ] Check that hooks are < 100 lines each
- [ ] Verify imports resolve correctly

### Type Safety Tests
- [ ] Change a field in `convex/schema.ts` (add `newField: v.string()`)
- [ ] Run `npx convex dev` to regenerate types
- [ ] Verify TypeScript errors appear in components (proof types are connected)
- [ ] Revert the change

---

## Rollback Plan

If something goes wrong:

### Task 1 Rollback (Validators)
```bash
# Restore old files
git checkout convex/schema.ts
git checkout convex/onboarding/sessions.ts
git checkout convex/onboarding/agent.ts

# Delete new file
rm convex/onboarding/validators.ts
```

### Task 2 Rollback (Hook Split)
```bash
# Restore old hook
git checkout lib/convex/onboarding/useOnboardingSession.ts

# Delete new hooks
rm -rf lib/convex/onboarding/hooks/
```

### Task 3 Rollback (Types)
```bash
# Restore old types
git checkout types/onboarding.ts

# Restore any files that imported the old types
git checkout convex/onboarding/agent.ts
git checkout convex/onboarding/sessions.ts
```

---

## Success Criteria

You'll know the refactor is successful when:

1. ✅ **No duplication** - Validators exist in one place only
2. ✅ **Hook clarity** - Each hook under 100 lines, single responsibility
3. ✅ **Type safety** - Schema changes break TypeScript (in a good way)
4. ✅ **Tests pass** - All functional tests work as before
5. ✅ **No regressions** - Onboarding flow works identically to users
6. ✅ **Better DX** - Easier to add new fields, easier to test, easier to debug

---

## Timeline Estimate

- **Task 1 (Validators):** 30-45 minutes
- **Task 2 (Hook Split):** 90-120 minutes
- **Task 3 (Types):** 45-60 minutes
- **Testing & Verification:** 30-45 minutes

**Total:** 3-5 hours for all three tasks

---

## Notes & Context

### Why These Three?
These are foundational refactors that make **all future work easier**:
- Adding new form fields becomes trivial (one place to update validators)
- Testing becomes possible (small hooks are testable)
- Type safety catches bugs at compile time instead of runtime

### Order Matters
Do these in sequence (1 → 2 → 3) because:
- Task 1 creates the shared validators that Task 2's hooks will use
- Task 3 relies on stable schema from Task 1

### Future Tasks Enabled
After these refactors, you can easily:
- Add session cleanup cron (uses the validators)
- Add form field validation (small hook to test)
- Add new fields to brief (type safety catches all usage)
- Add request ID tracking for plan generation (usePlanGenerator is isolated)
- Write unit tests for each hook (now possible!)

