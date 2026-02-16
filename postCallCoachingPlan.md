# Post-Call Coaching Implementation Plan

Document Version: 1.0  
Date: February 16, 2026  
Owner: Acadiana Web Design

## 1) Executive Summary

This plan adds a full post-call coaching system to the existing agency platform so every outbound cold call can be:

1. Captured
2. Transcribed
3. Analyzed against a custom coaching rubric and system prompt
4. Reviewed in admin UI alongside existing lead workflow

The recommended implementation is:

- Keep coaching in this existing codebase
- Use Convex for workflow orchestration, storage, and admin queries
- Migrate telephony from Google Voice to Twilio for reliable call metadata + recording webhooks

This matches the current architecture and roadmap:

- Existing outbound lead workflow in `/admin/marketing`
- Existing Convex workflow pattern in `convex/marketing/workflow.ts`
- Existing admin activity logging and role gating
- Existing documented future enhancement for call recording + transcription in `marketing.md`

## 2) Business Context and Success Criteria

### Business Context

- Offer: $0 down, $199/month WaaS for local service businesses
- Sales motion: pre-qualified outbound calling to local businesses with weak websites
- Existing pipeline: search -> scrape -> analyze -> demo link -> outreach -> follow-up -> convert
- Missing capability: repeatable post-call coaching to improve conversion and script quality

### Success Criteria (v1)

1. 90%+ of outbound calls have a recording + transcript + analysis
2. Coaching report available within 5 minutes after call end
3. Admin can edit prompt/rubric and re-run analysis
4. Measurable lift in meeting-booked rate and/or close rate over 30 days

### Non-Goals (v1)

1. Live in-call whisper coaching
2. Full conversation intelligence platform
3. Multi-rep enterprise seat management

## 3) Telephony Strategy (Current Constraint: Google Voice)

Google Voice is not suitable as the core ingestion layer for automated post-call coaching because it does not provide production-grade call lifecycle webhooks and recording workflows for this use case.

### Recommended Path

1. Adopt Twilio Programmable Voice for outbound calls and recordings
2. Port the current Google Voice number to Twilio (can take days/weeks)
3. Use a temporary Twilio number during porting for implementation/testing

### Transitional Path (Start Immediately)

Add manual upload in admin so coaching can start before telephony migration:

1. Admin uploads call audio file
2. System creates call record + runs transcript/analysis pipeline
3. Data model and UI remain the same; only ingestion source differs

## 4) Product Scope and User Flow

## Primary User Story

As an admin doing cold outreach, I want each completed call to generate coaching feedback so I improve opening, discovery, objection handling, and closing.

## End-to-End Flow (Automated)

1. Outbound call placed from Twilio number
2. Twilio sends call status webhook
3. On call completion, Twilio sends recording callback
4. Convex stores/links call to `scraped_leads`
5. Workflow transcribes audio
6. Workflow analyzes transcript using active prompt + rubric
7. Result appears in Admin call coaching UI
8. Admin marks review complete and applies suggested script updates

## Manual Upload Flow (Fallback)

1. In lead panel, click "Upload Call Recording"
2. Attach audio file and basic metadata (lead, timestamp, optional notes)
3. Trigger same transcription + analysis workflow

## 5) Architecture Plan

### Keep in Existing Repo

Use current app as control plane and intelligence layer:

- Next.js admin UI
- Convex schema + functions + workflows
- Existing admin auth/authorization patterns
- Existing activity log

### Services

1. Telephony and recording: Twilio
2. ASR + LLM analysis: Groq models
3. Storage:
   - Preferred: store audio in Convex file storage (or keep provider URL + fetch at processing time)
4. Orchestration: `@convex-dev/workflow` (same approach as marketing pipeline)

### High-Level Component Map

- `convex/http.ts`: Twilio webhooks + upload callback endpoints
- `convex/calls/workflow.ts`: durable workflow steps
- `convex/calls/pipeline.ts`: Node actions for transcription + analysis
- `convex/calls/search.ts`: admin queries/mutations
- `app/admin/marketing/page.tsx` or `app/admin/calls/page.tsx`: coaching UI

## 6) Data Model Plan

Add these tables in `convex/schema.ts` and validators in `convex/validators.ts`.

### `sales_calls`

Purpose: one row per outbound call.

Core fields:

- `leadId`: `v.optional(v.id("scraped_leads"))`
- `prospectId`: `v.optional(v.id("prospects"))`
- `projectId`: `v.optional(v.id("projects"))`
- `provider`: `v.union(v.literal("twilio"), v.literal("manual_upload"))`
- `providerCallId`: `v.string()`
- `providerRecordingId`: `v.optional(v.string())`
- `fromNumber`: `v.string()`
- `toNumber`: `v.string()`
- `direction`: `v.union(v.literal("outbound"), v.literal("inbound"))`
- `status`: `v.union(v.literal("queued"), v.literal("ringing"), v.literal("in_progress"), v.literal("completed"), v.literal("failed"), v.literal("no_answer"), v.literal("busy"), v.literal("canceled"))`
- `startedAt`: `v.optional(v.number())`
- `endedAt`: `v.optional(v.number())`
- `durationSec`: `v.optional(v.number())`
- `recordingUrl`: `v.optional(v.string())`
- `recordingStorageId`: `v.optional(v.id("_storage"))`
- `transcriptionStatus`: `v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed"))`
- `analysisStatus`: `v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed"))`
- `error`: `v.optional(v.string())`
- `createdAt`: `v.number()`
- `updatedAt`: `v.number()`

Indexes:

- `by_leadId`
- `by_providerCallId`
- `by_createdAt`
- `by_status`

### `sales_call_transcripts`

Purpose: transcript artifacts by call and version.

Fields:

- `callId`: `v.id("sales_calls")`
- `model`: `v.string()`
- `language`: `v.optional(v.string())`
- `fullText`: `v.string()`
- `segments`: `v.array(v.object({ speaker: v.optional(v.string()), startMs: v.number(), endMs: v.number(), text: v.string(), confidence: v.optional(v.number()) }))`
- `wordCount`: `v.number()`
- `durationMs`: `v.optional(v.number())`
- `rawProviderPayload`: `v.optional(v.string())`
- `createdAt`: `v.number()`

Indexes:

- `by_callId`
- `by_createdAt`

### `sales_call_analyses`

Purpose: structured coaching output and scoring.

Fields:

- `callId`: `v.id("sales_calls")`
- `transcriptId`: `v.id("sales_call_transcripts")`
- `promptVersion`: `v.string()`
- `rubricVersion`: `v.string()`
- `overallScore`: `v.number()`
- `categoryScores`: `v.array(v.object({ category: v.string(), score: v.number(), reason: v.string() }))`
- `strengths`: `v.array(v.string())`
- `misses`: `v.array(v.string())`
- `objectionsHandledWell`: `v.array(v.string())`
- `objectionsMissed`: `v.array(v.string())`
- `sayThisInstead`: `v.array(v.object({ original: v.string(), improved: v.string(), why: v.string() }))`
- `nextCallDrill`: `v.array(v.string())`
- `openingRewrite`: `v.string()`
- `closingRewrite`: `v.string()`
- `confidence`: `v.optional(v.number())`
- `createdAt`: `v.number()`

Indexes:

- `by_callId`
- `by_createdAt`

### `sales_call_prompts`

Purpose: versioned analysis system prompts.

Fields:

- `name`: `v.string()`
- `version`: `v.string()`
- `content`: `v.string()`
- `isActive`: `v.boolean()`
- `createdBy`: `v.string()`
- `createdAt`: `v.number()`

Index:

- `by_isActive`

### `sales_call_rubrics`

Purpose: versioned scoring rules.

Fields:

- `name`: `v.string()`
- `version`: `v.string()`
- `weights`: `v.array(v.object({ category: v.string(), weight: v.number() }))`
- `scoringGuide`: `v.string()`
- `isActive`: `v.boolean()`
- `createdBy`: `v.string()`
- `createdAt`: `v.number()`

Index:

- `by_isActive`

## 7) Backend Function Plan

### A) HTTP/Webhook Layer (`convex/http.ts`)

Add routes:

1. `POST /twilio/voice/status`  
   - Validates Twilio signature
   - Upserts call status into `sales_calls`

2. `POST /twilio/voice/recording`  
   - Validates Twilio signature
   - Stores recording metadata
   - Queues workflow start

3. `POST /api/calls/manual-upload` (optional if using upload URL flow)  
   - Creates `sales_calls` with `provider = manual_upload`
   - Queues workflow

### B) Workflow Layer (`convex/calls/workflow.ts`)

Create durable workflow `postCallCoachingWorkflow`:

1. `prepareCallAudio`
2. `transcribeCall`
3. `analyzeCall`
4. `persistOutputs`
5. `markCompleted`

Use bounded parallelism and retries (same approach as marketing pipeline).

### C) Pipeline Actions (`convex/calls/pipeline.ts`)

Node actions:

1. `transcribeCall`
   - Pull recording
   - Send to Groq ASR
   - Normalize segments
   - Write `sales_call_transcripts`
   - Update call state

2. `analyzeTranscript`
   - Fetch active prompt + rubric
   - Build strict JSON request
   - Include:
     - transcript
     - lead context from `scraped_leads`
     - offer context summary from business docs
   - Parse/validate output
   - Write `sales_call_analyses`

### D) Admin Queries/Mutations (`convex/calls/search.ts`)

Queries:

1. `listCallsByLead`
2. `getCallDetails`
3. `getCallTranscript`
4. `getCallAnalysis`
5. `listRecentCalls`

Mutations:

1. `createManualCallUpload`
2. `reRunAnalysis`
3. `setActivePrompt`
4. `setActiveRubric`
5. `markCoachingReviewed`

All admin-facing operations gated with existing `requireAdmin` pattern.

## 8) Prompt and Rubric Design

### Prompt Requirements

The active system prompt must enforce:

1. Score strictly from transcript evidence
2. No generic fluff; only actionable coaching
3. Output strict JSON schema
4. Prioritize cold call goals:
   - trust opener
   - fast relevance
   - diagnostic discovery
   - value framing in plain language
   - objection response
   - concrete close for next step

### Rubric Categories (Initial Weights)

1. Opener and Permission (15)
2. Discovery Quality (20)
3. Value Proposition Fit (20)
4. Objection Handling (20)
5. Confidence and Clarity (10)
6. Close and Next Step Ask (15)

Total: 100

### Versioning Rules

1. Never edit historical prompt/rubric records in place
2. New changes create a new version
3. Analysis rows always store `promptVersion` and `rubricVersion`

## 9) Admin UI Plan

### Option A (recommended first)

Extend existing `/admin/marketing` lead detail panel in `app/admin/marketing/page.tsx`:

1. New "Calls" section in expanded lead card
2. Call timeline entries
3. Transcript accordion
4. Scorecard with category breakdown
5. "Say this instead" coaching snippets
6. Re-run analysis action

### Option B (phase 2)

Dedicated route `app/admin/calls/page.tsx` for cross-lead coaching analytics.

### UX Requirements

1. Show processing states clearly:
   - recording received
   - transcript processing
   - analysis processing
   - completed/failed
2. Show confidence markers and parse errors
3. Link each call back to lead/prospect/project record

## 10) Activity Logging and Audit Trail

Use existing `convex/activityLog.ts` patterns.

Log events:

1. `calls.recording_received`
2. `calls.transcript_completed`
3. `calls.analysis_completed`
4. `calls.analysis_failed`
5. `calls.analysis_rerun`
6. `calls.prompt_updated`
7. `calls.rubric_updated`
8. `calls.coaching_reviewed`

## 11) Reliability and Idempotency

### Idempotency Rules

1. Deduplicate by `providerCallId` + `providerRecordingId`
2. Ignore duplicate webhook retries if state already advanced
3. Do not create duplicate transcript rows for same call/model unless explicitly rerun

### Retry Rules

1. Webhook handlers are fast and queue work
2. Long-running processing only in workflow/actions
3. Retry transient provider errors with bounded backoff

### Failure Handling

1. Persist error messages on `sales_calls.error`
2. Surface failed items in admin for manual re-run

## 12) Security, Privacy, and Compliance

### Access Control

1. Admin-only visibility for recordings, transcripts, and coaching
2. Reuse existing server and Convex admin guards

### Data Handling

1. Redact obvious PII where possible before analysis
2. Keep minimum necessary raw payloads

### Retention Defaults (initial)

1. Raw recordings: 90 days
2. Transcripts and analyses: 12 months
3. Activity logs: align with existing retention

### Consent and Legal

1. Add call recording disclosure script before recording in relevant jurisdictions
2. Maintain state-by-state call recording policy checklist before scale
3. Keep timestamped evidence that recording disclosure was enabled

## 13) Implementation Phases and Timeline

## Phase 0: Foundation (2-3 days)

1. Finalize schema + validators
2. Build prompt/rubric seed records
3. Add manual upload ingestion path

Deliverable:

- End-to-end manual upload -> transcript -> coaching report

## Phase 1: Twilio Integration (3-5 days)

1. Add webhook endpoints and signature verification
2. Map Twilio status events to `sales_calls`
3. Queue workflow on recording complete

Deliverable:

- Automated call ingestion from Twilio with robust retries

## Phase 2: Admin Experience (2-4 days)

1. Add calls/coaching UI to `/admin/marketing`
2. Add prompt/rubric management panel
3. Add re-run and review markers

Deliverable:

- Practical day-to-day coaching workflow in existing admin

## Phase 3: Calibration and Optimization (ongoing, first 2 weeks)

1. Build labeled set of 20-30 calls
2. Compare AI scores to manual grading
3. Tune prompt and rubric weights

Deliverable:

- v1 frozen prompt/rubric with acceptable coaching quality

## 14) Metrics and Reporting

Track weekly:

1. Calls processed rate
2. Transcript completion rate
3. Analysis completion rate
4. Median time-to-coaching report
5. Average coaching score trend
6. Objection category frequency
7. Meeting-booked rate before vs after coaching adoption

## 15) Cost Planning (Estimate)

Per 100 calls/month estimate buckets:

1. Telephony and recording (Twilio)
2. ASR compute (Groq)
3. LLM analysis tokens (Groq)
4. Storage and transfer for audio/transcripts

Use this plan:

1. Start with manual upload + small pilot (20-30 calls)
2. Measure real token/audio costs
3. Set monthly budget threshold + alerting in phase 2

## 16) Risks and Mitigations

1. Risk: poor transcript quality on noisy calls  
   Mitigation: headset standards, audio normalization, fallback rerun with alternate model/settings

2. Risk: AI feedback too generic  
   Mitigation: strict schema, transcript-anchored evidence requirement, iterative prompt tuning

3. Risk: webhook duplication and race conditions  
   Mitigation: idempotency keys + monotonic status transitions

4. Risk: legal exposure from recording without proper disclosure  
   Mitigation: scripted disclosure, policy checklist, documented configuration

5. Risk: adoption drops due to extra admin effort  
   Mitigation: keep coaching embedded in existing `/admin/marketing` workflow

## 17) Definition of Done (v1)

1. Calls from Twilio (or manual upload) create `sales_calls` reliably
2. Transcript and analysis records are generated and linked to lead
3. Admin can view coaching report in app and re-run analysis
4. Prompt/rubric versioning works and is auditable
5. All major events logged to activity log
6. Security checks pass for admin-only access
7. Pilot run completed on at least 20 real calls

## 18) Immediate Next Actions

1. Confirm telephony choice: Twilio approved
2. Start with Phase 0 manual upload path to unblock model/rubric tuning
3. Implement schema + workflow scaffolding
4. Add coaching section to `app/admin/marketing/page.tsx`
5. Begin Twilio onboarding + number port request

