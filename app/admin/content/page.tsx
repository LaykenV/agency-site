"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  ExternalLink,
  Film,
  Gauge,
  ImageIcon,
  MessageCircle,
  Target,
} from "lucide-react";
import { clsx } from "clsx";

type ContentStatus =
  | "Idea"
  | "Needs asset"
  | "Ready"
  | "Scheduled"
  | "Posted"
  | "Running as ad";

type ContentIdea = {
  id: string;
  title: string;
  pillar: "Proof" | "Receipts" | "Product" | "Founder" | "Launch";
  format: "Reel" | "Static" | "Reel or static";
  need: string;
  next: string;
  adEligible: boolean;
  defaultStatus: ContentStatus;
};

type CampaignStats = {
  spend: number;
  conversations: number;
  qualified: number;
  calls: number;
  closes: number;
};

const STORAGE_KEY = "awd-content-ops-v4";

const LAUNCH_TASKS = [
  { id: "button", label: "Send message button approved", defaultDone: true },
  { id: "budget", label: "Budget changed to $7/day", defaultDone: true },
  {
    id: "fresh-post",
    label: "4:5 AI lead-filter post published Jul 31 at 8:30 AM",
    defaultDone: true,
  },
  { id: "creative", label: "Select the live AI-filtering post in Ads Manager", defaultDone: true },
  { id: "template", label: "Create the one-question Messenger opener", defaultDone: true },
  { id: "terms", label: "Accept Meta Lead Generation Terms", defaultDone: true },
  { id: "auth", label: "Complete Meta account authentication", defaultDone: true },
  { id: "billing", label: "Add and verify billing", defaultDone: false },
  { id: "review", label: "Review placements and creative previews", defaultDone: true },
  { id: "publish", label: "Publish the campaign", defaultDone: false },
] as const;

const CONTENT_IDEAS: ContentIdea[] = [
  {
    id: "towing-reel",
    title: "All About Towing testimonial re-edit",
    pillar: "Proof",
    format: "Reel",
    need: "Original 2:10 file and client permission",
    next: "Cut to 20–45 seconds, 9:16, caption the “HE IS YOUR GUY” line.",
    adEligible: true,
    defaultStatus: "Needs asset",
  },
  {
    id: "chelsea-testimonial",
    title: "Chelsea Social Co. testimonial",
    pillar: "Proof",
    format: "Reel",
    need: "Ask Chelsea for a 15–30 second vertical clip",
    next: "Prompt: problem, experience, result, recommendation.",
    adEligible: true,
    defaultStatus: "Needs asset",
  },
  {
    id: "ai-lead-filter",
    title: "AI lead filtering: allowed vs. filtered",
    pillar: "Product",
    format: "Static",
    need: "1080×1350 workflow graphic complete",
    next: "Live and selected in Ads Manager. Ready for the final billing check and Publish.",
    adEligible: true,
    defaultStatus: "Posted",
  },
  {
    id: "comments-proof",
    title: "Client comment proof card",
    pillar: "Proof",
    format: "Static",
    need: "Public comments already captured",
    next: "Keep as a future organic proof asset; do not use as the launch ad.",
    adEligible: true,
    defaultStatus: "Ready",
  },
  {
    id: "pagespeed",
    title: "PageSpeed head-to-head",
    pillar: "Receipts",
    format: "Reel",
    need: "10-minute screen recording",
    next: "Show the test live. Anonymize the comparison site.",
    adEligible: true,
    defaultStatus: "Ready",
  },
  {
    id: "google-them",
    title: "“Google them” ranking receipt",
    pillar: "Receipts",
    format: "Reel",
    need: "Search-result screen recording",
    next: "Record the query, result, and mobile site in one take.",
    adEligible: true,
    defaultStatus: "Idea",
  },
  {
    id: "includes",
    title: "What $199/month includes",
    pillar: "Receipts",
    format: "Reel or static",
    need: "Simple checklist graphic",
    next: "Site, hosting, domain, SSL, edits, support, and portal.",
    adEligible: true,
    defaultStatus: "Ready",
  },
  {
    id: "lead-notification",
    title: "Real lead hitting the inbox",
    pillar: "Receipts",
    format: "Static",
    need: "Redacted client lead notification",
    next: "Remove names, phone numbers, email addresses, and message details.",
    adEligible: true,
    defaultStatus: "Needs asset",
  },
  {
    id: "portal",
    title: "Client portal walkthrough",
    pillar: "Product",
    format: "Reel",
    need: "Demo account check",
    next: "Show edit request, status, analytics, and leads in 30–45 seconds.",
    adEligible: false,
    defaultStatus: "Idea",
  },
  {
    id: "same-day-edit",
    title: "Same-day edit timelapse",
    pillar: "Product",
    format: "Reel",
    need: "One real edit request",
    next: "Show request and live change with timestamps.",
    adEligible: false,
    defaultStatus: "Needs asset",
  },
  {
    id: "writes-code",
    title: "I write the code myself",
    pillar: "Founder",
    format: "Reel",
    need: "20–30 second single take",
    next: "Explain what no templates means for speed, support, and Google.",
    adEligible: false,
    defaultStatus: "Idea",
  },
  {
    id: "zero-down",
    title: "Why $0 down works",
    pillar: "Founder",
    format: "Reel",
    need: "20–30 second single take",
    next: "Explain that Acadiana only wins when the client stays.",
    adEligible: false,
    defaultStatus: "Idea",
  },
  {
    id: "launch-reel",
    title: "Next client launch",
    pillar: "Launch",
    format: "Reel",
    need: "New live site",
    next: "20–30 second vertical scroll-through and one customer line.",
    adEligible: false,
    defaultStatus: "Idea",
  },
];

const STATUS_OPTIONS: ContentStatus[] = [
  "Idea",
  "Needs asset",
  "Ready",
  "Scheduled",
  "Posted",
  "Running as ad",
];

const DEFAULT_STATS: CampaignStats = {
  spend: 0,
  conversations: 0,
  qualified: 0,
  calls: 0,
  closes: 0,
};

function safeNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function MetricInput({
  label,
  value,
  onChange,
  money = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  money?: boolean;
}) {
  return (
    <label className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <span className="mt-2 flex items-center gap-1 text-2xl font-semibold text-slate-950">
        {money ? <span className="text-base text-slate-400">$</span> : null}
        <input
          aria-label={label}
          inputMode="decimal"
          min="0"
          type="number"
          value={value}
          onChange={(event) => onChange(safeNumber(event.target.value))}
          className="min-w-0 flex-1 bg-transparent tabular-nums outline-none"
        />
      </span>
    </label>
  );
}

export default function ContentOperationsPage() {
  const [tasks, setTasks] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(LAUNCH_TASKS.map((task) => [task.id, task.defaultDone]))
  );
  const [statuses, setStatuses] = useState<Record<string, ContentStatus>>(() =>
    Object.fromEntries(CONTENT_IDEAS.map((idea) => [idea.id, idea.defaultStatus]))
  );
  const [stats, setStats] = useState<CampaignStats>(DEFAULT_STATS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as {
          tasks?: Record<string, boolean>;
          statuses?: Record<string, ContentStatus>;
          stats?: CampaignStats;
        };
        if (parsed.tasks) {
          setTasks((current) => ({
            ...current,
            ...parsed.tasks,
            "fresh-post": true,
            creative: true,
            review: true,
          }));
        }
        if (parsed.statuses) {
          setStatuses((current) => ({ ...current, ...parsed.statuses, "ai-lead-filter": "Posted" }));
        }
        if (parsed.stats) setStats({ ...DEFAULT_STATS, ...parsed.stats });
      }
    } catch {
      // A broken local value should never block the admin page.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks, statuses, stats }));
  }, [hydrated, stats, statuses, tasks]);

  const completedTasks = LAUNCH_TASKS.filter((task) => tasks[task.id]).length;
  const costPerConversation =
    stats.conversations > 0 ? stats.spend / stats.conversations : null;
  const closeRate = stats.conversations > 0 ? (stats.closes / stats.conversations) * 100 : null;

  const visibleIdeas = useMemo(
    () =>
      [...CONTENT_IDEAS].sort((left, right) => {
        const order: Record<ContentStatus, number> = {
          "Running as ad": 0,
          Posted: 1,
          Scheduled: 2,
          Ready: 3,
          "Needs asset": 4,
          Idea: 5,
        };
        return order[statuses[left.id]] - order[statuses[right.id]];
      }),
    [statuses]
  );

  return (
    <main className="min-h-[calc(100dvh_-_var(--global-header-height))] bg-[#f4f1ea] text-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-10">
        <header className="border-b border-slate-300 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Link
                href="/admin"
                className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-950"
              >
                <ArrowLeft className="h-4 w-4" />
                Admin
              </Link>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-amber-700">
                Acadiana Web Design
              </p>
              <h1 className="mt-2 font-[var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-5xl">
                Content + ad operations
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                One place to run the 90-day Messenger pilot, prepare two weekly posts,
                and separate an ad problem from a sales problem.
              </p>
            </div>
            <a
              href="https://adsmanager.facebook.com/adsmanager/manage/ads/edit/standalone?act=168067751820059&selected_campaign_ids=120251936673770668&selected_adset_ids=120251936673760668&selected_ad_ids=120251936673750668"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
            >
              Open Ads Manager
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </header>

        <section className="mt-6 grid items-start gap-4 lg:grid-cols-[1.45fr_0.75fr]">
          <div className="overflow-hidden rounded-2xl border border-slate-300 bg-slate-950 text-white shadow-[0_18px_50px_-30px_rgba(15,23,42,0.8)]">
            <div className="grid gap-px bg-white/10 sm:grid-cols-2">
              <div className="bg-slate-950 p-6">
                <div className="flex items-center gap-2 text-amber-300">
                  <CircleDollarSign className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-[0.18em]">Budget</span>
                </div>
                <p className="mt-3 text-4xl font-bold">$7/day</p>
                <p className="mt-2 text-sm text-slate-300">About $210/month · about $630 total</p>
              </div>
              <div className="bg-slate-950 p-6">
                <div className="flex items-center gap-2 text-amber-300">
                  <CalendarDays className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-[0.18em]">Window</span>
                </div>
                <p className="mt-3 text-xl font-bold">Jul 31 → Oct 29</p>
                <p className="mt-2 text-sm text-slate-300">Do not judge before the day-45 checkpoint.</p>
              </div>
              <div className="bg-slate-950 p-6">
                <div className="flex items-center gap-2 text-amber-300">
                  <Target className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-[0.18em]">Audience</span>
                </div>
                <p className="mt-3 text-xl font-bold">Lafayette +25 miles</p>
                <p className="mt-2 text-sm text-slate-300">Age 25+ · local expansion off · broad interests</p>
              </div>
              <div className="bg-slate-950 p-6">
                <div className="flex items-center gap-2 text-amber-300">
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-[0.18em]">Objective</span>
                </div>
                <p className="mt-3 text-xl font-bold">Leads → Messenger</p>
                <p className="mt-2 text-sm text-slate-300">Advantage+ placements · highest volume</p>
              </div>
            </div>
            <div className="border-t border-white/10 bg-amber-300 px-6 py-4 text-slate-950">
              <div className="flex items-start gap-3">
                <Gauge className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-bold">Creative selected and reviewed</p>
                  <p className="mt-1 text-sm leading-5 text-slate-800">
                    The native 4:5 AI lead-filtering post is selected. Automatic visual
                    touch-ups, animation, and multi-image adaptation are off so Meta preserves
                    the branded graphic.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Launch gate
                </p>
                <h2 className="mt-1 text-xl font-bold">
                  {completedTasks}/{LAUNCH_TASKS.length} complete
                </h2>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-950 text-sm font-bold text-white">
                {Math.round((completedTasks / LAUNCH_TASKS.length) * 100)}%
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-amber-500 transition-[width]"
                style={{ width: `${(completedTasks / LAUNCH_TASKS.length) * 100}%` }}
              />
            </div>
            <div className="mt-5 space-y-2">
              {LAUNCH_TASKS.map((task) => (
                <label
                  key={task.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(tasks[task.id])}
                    onChange={(event) =>
                      setTasks((current) => ({ ...current, [task.id]: event.target.checked }))
                    }
                    className="peer sr-only"
                  />
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border border-slate-300 bg-white peer-checked:border-slate-950 peer-checked:bg-slate-950">
                    {tasks[task.id] ? <Check className="h-3.5 w-3.5 text-white" /> : null}
                  </span>
                  <span
                    className={clsx(
                      "text-sm leading-5",
                      tasks[task.id] ? "text-slate-400 line-through" : "text-slate-700"
                    )}
                  >
                    {task.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-amber-300 bg-[#fff8dd] p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-amber-800">
                Live ad creative
              </p>
              <h2 className="mt-2 text-2xl font-bold">AI lead filtering: allowed vs. filtered</h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Published on Facebook Jul 31 at 8:30 AM Central and selected as the existing
                post in Ads Manager. The campaign is ready for a final billing check and
                Publish.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-900">
              <ImageIcon className="h-4 w-4" />
              1080 × 1350
            </span>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-amber-200 bg-white">
              <Image
                src="/social/awd-ai-lead-filtering-2026-07-31.png"
                alt="Acadiana Web Design AI lead filter showing allowed leads delivered to email, text, and dashboard while spam is filtered"
                width={1080}
                height={1350}
                className="h-auto w-full"
                priority
              />
            </div>
            <div className="rounded-xl border border-amber-200 bg-white p-5">
              <h3 className="font-bold">Live post copy</h3>
              <div className="mt-4 whitespace-pre-line rounded-lg bg-slate-950 p-4 text-sm leading-6 text-slate-100">
                {`Real customers should reach you. SEO pitches shouldn’t.

✅ Real inquiry → email, text + dashboard update
🛡️ Spam → saved quietly for review

AI filtering included. $0 upfront • $199/month.

Already have a website or want one? Send me a message!`}
              </div>
              <a
                href="/social/awd-ai-lead-filtering-2026-07-31.png"
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-amber-900 underline decoration-amber-400 underline-offset-4"
              >
                Open the 1080 × 1350 asset
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Scoreboard
              </p>
              <h2 className="mt-1 text-2xl font-bold">Separate traffic from closing</h2>
            </div>
            <p className="text-xs text-slate-500">Saved automatically in this browser</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MetricInput
              label="Spend"
              value={stats.spend}
              money
              onChange={(value) => setStats((current) => ({ ...current, spend: value }))}
            />
            <MetricInput
              label="Conversations"
              value={stats.conversations}
              onChange={(value) => setStats((current) => ({ ...current, conversations: value }))}
            />
            <MetricInput
              label="Qualified"
              value={stats.qualified}
              onChange={(value) => setStats((current) => ({ ...current, qualified: value }))}
            />
            <MetricInput
              label="Calls"
              value={stats.calls}
              onChange={(value) => setStats((current) => ({ ...current, calls: value }))}
            />
            <MetricInput
              label="Market-rate closes"
              value={stats.closes}
              onChange={(value) => setStats((current) => ({ ...current, closes: value }))}
            />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-300 bg-transparent p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Cost / conversation</p>
              <p className="mt-1 text-xl font-bold">
                {costPerConversation === null ? "—" : `$${costPerConversation.toFixed(2)}`}
              </p>
            </div>
            <div className="rounded-xl border border-slate-300 bg-transparent p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Conversation → close</p>
              <p className="mt-1 text-xl font-bold">
                {closeRate === null ? "—" : `${closeRate.toFixed(1)}%`}
              </p>
            </div>
            <div className="rounded-xl border border-slate-300 bg-transparent p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Real milestone</p>
              <p className="mt-1 text-sm font-bold leading-5">
                First stranger at $199/month
              </p>
            </div>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {[
              ["Day 45", "No conversations means change the creative first, then reassess targeting."],
              ["10+ conversations, 0 closes", "The ads work. Fix qualification, response speed, and the close."],
              ["Close in month one", "Raise the budget to $12/day and keep the winning creative."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-xl bg-slate-200/70 p-4">
                <p className="text-sm font-bold">{title}</p>
                <p className="mt-1 text-sm leading-5 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 border-t border-slate-300 pt-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Two posts each week
              </p>
              <h2 className="mt-1 text-2xl font-bold">Content queue</h2>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
              <span className="rounded-full border border-slate-300 px-3 py-1.5">
                A: Proof or receipt
              </span>
              <span className="rounded-full border border-slate-300 px-3 py-1.5">
                B: Product, founder, or launch
              </span>
            </div>
          </div>

          <div className="mt-5 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-300 bg-white">
            {visibleIdeas.map((idea) => (
              <article
                key={idea.id}
                className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.4fr_0.7fr_0.8fr_auto] lg:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={clsx(
                        "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                        idea.adEligible
                          ? "bg-amber-100 text-amber-900"
                          : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {idea.pillar}
                    </span>
                    {idea.adEligible ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        Ad eligible
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-2 font-bold">{idea.title}</h3>
                  <p className="mt-1 text-sm leading-5 text-slate-600">{idea.next}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Format</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
                    {idea.format === "Static" ? (
                      <ImageIcon className="h-4 w-4 text-slate-400" />
                    ) : (
                      <Film className="h-4 w-4 text-slate-400" />
                    )}
                    {idea.format}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Needs</p>
                  <p className="mt-1 text-sm leading-5 text-slate-600">{idea.need}</p>
                </div>
                <label className="min-w-36">
                  <span className="sr-only">Status for {idea.title}</span>
                  <select
                    value={statuses[idea.id]}
                    onChange={(event) =>
                      setStatuses((current) => ({
                        ...current,
                        [idea.id]: event.target.value as ContentStatus,
                      }))
                    }
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold outline-none focus:border-slate-950"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-4 border-t border-slate-300 pt-7 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-300 bg-white p-5">
            <h2 className="text-lg font-bold">Messenger handoff</h2>
            <p className="mt-1 text-sm text-slate-600">
              One opening question, then Layken or Harley replies personally.
            </p>
            <div className="mt-4 space-y-2">
              {[
                "Greeting: Hi [first name], do you already have a website?",
                "Quick replies: Yes, I do · No, not yet",
                "No automated response or next-day nudge",
              ].map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-lg bg-slate-100 p-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-950 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <p className="text-sm font-semibold">{step}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              Reply target: under 15 minutes during waking hours. Both phones should receive
              Messenger notifications before launch.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-300 bg-white p-5">
            <h2 className="text-lg font-bold">Production rules</h2>
            <div className="mt-4 divide-y divide-slate-100">
              {[
                ["Static", "1080×1350 · 4:5 · one focal point · minimal text"],
                ["Reel", "1080×1920 · 9:16 · 20–45 sec · captions · safe-zone text"],
                ["Source", "Real customers, real screens, real results. No stock or AI imagery."],
                ["CTA", "One action only: Send us a message."],
              ].map(([label, detail]) => (
                <div key={label} className="flex gap-4 py-3 text-sm">
                  <span className="w-16 shrink-0 font-bold">{label}</span>
                  <span className="text-slate-600">{detail}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-300 py-6 text-xs text-slate-500">
          <p>Only proof, receipts, and standout launches receive ad budget by default.</p>
          <Link href="/admin/marketing" className="inline-flex items-center gap-1 font-bold text-slate-700">
            Marketing pipeline
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </footer>
      </div>
    </main>
  );
}
