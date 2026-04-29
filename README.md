# AI Newsroom

**Your personal AI news producer. In your pocket.**

Pick any country on Earth. Select three news topics, how you want them told, and who you want telling it. Then watch a team of six AI agents research local sources, synthesize themes, edit them, fact-check every claim, and polish the final script — all in real time, right on your phone.

No newsroom. No subscription. No backend. Just you, your API keys, and a fully autonomous pipeline that turns raw global events into a professional news podcast tailored exactly to your perspective.

---

## What It Does

Imagine waking up in Berlin and wanting to know what's happening in Nairobi — but not from a Western lens, and not from sanitized headlines. You want the local perspective, translated and contextualized for an international audience, delivered by a voice you chose, with the editorial angle you prefer.

**AI Newsroom makes that happen in under 5 minutes.**

You configure:
- **Country** — 195 countries with local language and native news sources
- **Timeframe** — Daily briefing, weekly review, or monthly roundup
- **Topics** — Exactly 3 from politics, economy, sport, technology, crime, and more
- **Voice** — Professional narrators with distinct accents and personalities
- **Music** — Custom intro, outro, stings, and transitions
- **Editorial Perspective** — From extreme left to extreme right, or dead-center moderate

Then you hit **Run Full Pipeline**. Ten AI agents go to work:

| # | Agent | Status | What It Does |
|---|---|---|---|
| 1 | **Researcher** | ✅ Real | Queries Brave Search for local + continent news across your 3 topics, writes the first draft as XML segments (`intro.txt`, `Topic1-6.txt`, `outro.txt`) with music cues and editorial framing |
| 2 | **Full Script Editor** | ✅ Real | Evaluates all 6 themes + optional editorial segment against structured rules. Decides `rewrite_scope`: `FULL_SCRIPT` (≥4 failures) or `SEGMENTS` (1-3 failures). Returns per-theme PASS/FAIL audit |
| 3 | **Full Script Writer** | ✅ Real | Receives editor feedback, rewrites the **entire** script, parses XML segments, writes them back to files |
| 4 | **Segment Writer** | ✅ Real | Receives `failed_segments` list, reads only failing `TopicN.txt` files + adjacent segments for transition context. Rewrites **only** the failing segments |
| 5 | **Segment Editor** | ✅ Real | Audits rewritten segments in context of adjacent segments. Checks transitions are smooth |
| 6 | **Assembler** | ✅ Real | Pure code stage — concatenates all segment files into `full_script.txt`. Routes back to Full Script Editor for cross-segment re-verify |
| 7 | **Fact Checker** | ⏳ Stub | Verifies every claim against independent sources |
| 8 | **Researcher (Fix)** | ⏳ Stub | If facts fail, finds replacements and provides repair instructions |
| 9 | **Editor (Final)** | ⏳ Stub | Gives the final approval gate before audio production |
| 10 | **Audio Producer** | ⏳ Stub | Strips XML tags, generates narration with the selected voice, mixes music stings, and assembles the final MP3 |

Each agent streams its reasoning in real time. You can tap any stage to see exactly what it's thinking, the **full prompt** that was sent to the LLM, the **first draft** (for the Researcher), and the **structured audit** (for Editors). If an editor rejects a theme, you see the specific rule that failed and why — the writer gets that feedback, fixes it, and resubmits. The pipeline loops until everything passes.

**This is not a chatbot. This is a production pipeline.**

---

## The Pipeline

The AI Newsroom pipeline is a state machine that orchestrates ten specialized agents. It runs fully automatically, handles rejection loops without limits, retries failed API calls up to 3 times before aborting, and writes every segment to individual files via `@capacitor/filesystem`.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FULL PIPELINE FLOW                            │
└─────────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐
    │  Researcher │  ← Queries Brave Search, writes first draft as
    │   (Agent 1) │     XML segments → files (intro.txt, Topic1-6.txt, outro.txt)
    └──────┬──────┘
           │
           ▼
    ┌─────────────────┐
    │ Full Script     │  ← Evaluates 6 themes + editorial segment
    │ Editor          │     Decides rewrite_scope: FULL_SCRIPT or SEGMENTS
    │ (Gate 1)        │
    └──────┬──────────┘
           │
           ├─────────────────┬────────────────────────────────────────┐
           │                 │                                        │
           ▼                 ▼ rewrite_scope = FULL_SCRIPT            │
    ┌─────────────┐   ┌─────────────────┐                             │
    │   Fact      │   │ Full Script     │  ← Rewrites entire script,  │
    │  Checker    │   │ Writer          │     writes all segments     │
    │  (Gate 2)   │   │                 │     back to files           │
    └──────┬──────┘   └──────┬──────────┘                             │
           │                 │                                         │
           │                 └─────────────────────────────────────────┘
           │
           │  (skip if approved)
           │
           ▼
    ┌─────────────────┐
    │ Segment Writer  │  ← Reads failing TopicN.txt + adjacent segments
    │                 │     Rewrites ONLY failing segments
    └──────┬──────────┘
           │
           ▼
    ┌─────────────────┐
    │ Segment Editor  │  ← Audits rewritten segments + transitions
    │                 │
    └──────┬──────────┘
           │
           ├────────┬─────────────────────────────────────────────────┐
           │        │                                                 │
           ▼        ▼ Rejected                                        │
    ┌─────────────┐  └─────────────────────────────────────────────────┘
    │  Assembler  │  ← Pure code: concatenates all segments into
    │             │     full_script.txt. Routes back to Full Script Editor
    └──────┬──────┘     for cross-segment re-verify.
           │
           ▼
    ┌─────────────────┐
    │   Editor        │  ← Final approval gate
    │  (Final)        │
    │  (Gate 3)       │
    └──────┬──────────┘
           │
           ├────────────┬─────────────────────────────────────────────┐
           │            │                                             │
           ▼            ▼ Rejected                                    │
    ┌─────────────┐  ┌─────────────────┐                             │
    │    Audio    │  │ Full Script     │  ← Rewrites per final       │
    │  Producer   │  │ Writer          │     editor feedback         │
    │  (Agent 6)  │  └──────┬──────────┘                             │
    └──────┬──────┘         │                                         │
           │                └─────────────────────────────────────────┘
           ▼
      ✅ COMPLETE
```

### Rejection Loops

**Full Script Editor → Full Script Writer loop (FULL_SCRIPT):**
- Full Script Editor audits the draft. If ≥4 themes fail, any segment is missing, or cross-segment coherence is broken, it sets `rewrite_scope: "FULL_SCRIPT"`.
- Full Script Writer receives the entire script + `rewriter_instructions`, rewrites everything top-to-bottom, parses XML segments, and writes all files back.
- The draft goes **back to Full Script Editor** for re-evaluation.

**Full Script Editor → Segment Writer → Segment Editor loop (SEGMENTS):**
- If only 1-3 themes fail and all segments exist with intact transitions, the Editor sets `rewrite_scope: "SEGMENTS"` and lists `failed_segments: [1, 3]`.
- Segment Writer reads **only** the failing `TopicN.txt` files + adjacent segments for transition context. It rewrites **only** those segments, leaving approved segments untouched.
- Segment Editor audits the rewritten segments in context of their neighbors, checking transitions are smooth.
- If approved, an **Assembler** concatenates all segments into `full_script.txt` and routes back to Full Script Editor for cross-segment re-verify.
- If rejected, the loop returns to Segment Writer with updated feedback.

**Fact Checker → Fixer → Full Script Writer loop:**
- Fact Checker verifies claims. If issues are found, the Fixer finds replacements and sends repair instructions to the Full Script Writer.
- Full Script Writer applies fixes and returns to Fact Checker for re-verification.

**Editor (Final) → Full Script Writer loop:**
- Final Editor gives the last quality gate. If rejected, the Full Script Writer polishes again and resubmits.

All loops are **unbounded** — the pipeline prioritizes correctness over speed.

**Key behaviors:**
- **Rejection loops have no limit** — the pipeline prioritizes correctness over speed
- **API failures retry 3 times** — then abort with a clear error
- **Session context is ephemeral** — configuration exists only in memory for the current run; close the app and it disappears
- **Segment files persist** — Every segment is written to `Directory.Data/newsroom/` via `@capacitor/filesystem`. Even if the app closes mid-run, the files remain for inspection.

### Agent Contracts

Every agent implements the same interface:

```typescript
interface AgentOutput {
  draft: string;       // The current script (or unchanged for gates)
  reasoning: string;   // Full reasoning text
  metadata?: unknown;  // JSON for gates (audit results, fact-check reports, etc.)
}
```

Gates (Editor and Fact Checker) return structured JSON:
- **Editor** → `AuditResult` with per-theme/per-rule PASS/FAIL status, `rejection_reason` for every failure, and `has_feedback` flag. If `has_feedback` is false, the Writer stage is skipped entirely.
- **Fact Checker** → `FactCheckResult` with per-theme grades and `overall_status: PASS | ISSUES_FOUND`
- **Fixer** → `RecoveryResult` with `writer_instructions` for the Writer to apply

### Permanent Requirements

Theme completeness rules and editor audit checklists live in `src/prompts/shared/completenessRequirements.ts` as session-independent constants. They include:

- Minimum **2000 characters per theme summary**
- At least **3 distinct developments, events, or angles** per theme
- **60%+ of sentences between 15–30 words**
- All local terms defined on first mention
- Zero-knowledge assumption (write for listeners with no prior context)
- Continent-specific angles for continental news
- **Cross-theme coherence** — transitions, logical progression, and explicit cross-references between themes
- **Source attribution** — cite specific sources by name within the theme text
- **Forward-looking close** — every theme ends with "what to watch"

These are the golden rules. They don't change per session.

---

## Topic-Based News Summaries

Unlike traditional newscasts that report individual stories one by one, AI Newsroom produces **thematic summaries**. For each of your 3 selected topics, you get:

- **A local theme** — synthesizing 3+ developments in your chosen country
- **A continental theme** — synthesizing 3+ developments across the continent

Each theme is ~2,000 characters and weaves together multiple sources into a coherent narrative. This approach:
- **Works with web search snippets** — no full-article API required
- **Surfaces trends and context** — not just isolated events
- **Produces better podcasts** — thematic segments flow naturally, with explicit transitions

The Researcher is explicitly instructed to **prioritize the country's listed news sources** (from `src/data/countries.ts`) and to **prefer local-language sources** for local themes. When multiple articles cover the same development, the source from the priority list wins.

---

## Mobile-First UI

The pipeline UI is designed for phones:

- **Vertical stage strip** — A scrollable column of compact stage cards on the left. Each shows an icon, short name, and status dot. Active stages pulse. Completed stages show green checks. Rejected stages show amber warnings.
- **Tap to inspect** — Tap any stage to expand its reasoning chain, the **full LLM prompt**, the **first draft** (for the Researcher), the **structured audit** (for Editors), and output below
- **Loop counters** — Badges show when a stage has run multiple times (×2, ×3...)
- **Real-time streaming** — Reasoning tokens stream in as agents think, just like watching a live terminal
- **StageDetail tabs** — Articles (Agent 1 only), Stream (live reasoning), Agent Output (parsed first draft), Audit (Editor gates — per-theme PASS/FAIL), Prompt (full LLM prompt)

---

## Technical Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS |
| Maps | Leaflet |
| Build | Vite |
| Mobile | Capacitor (Android APK) |
| Storage | `@capacitor/preferences` (settings), `@capacitor/filesystem` (segment files in `Directory.Data/newsroom/`) |
| News Search | Brave Search API (web search with `freshness` filtering) |
| LLM API | OpenAI-compatible `/chat/completions` (SSE streaming) |
| CI/CD | GitHub Actions |

### Self-Contained APK

Everything bundles into the APK. No external web server. No cloud backend. The app talks directly to your chosen LLM provider and Brave Search using your API keys.

### Supported Providers

**LLM Providers:**
- OpenAI (GPT-4o, etc.)
- Anthropic (Claude via OpenRouter or direct)
- Google Gemini
- OpenRouter (unified access to many models)
- Local/Custom endpoints (Ollama, llama.cpp, vLLM, etc.)

**News Search:**
- Brave Search API — Web search with freshness filtering (day/week/month). Free tier: 2,000 queries/month.

---

## Project Structure

```
├── ai-newsroom/              # Static assets & public files
│   ├── assets/               # Image & media assets
│   ├── audio/                # Podcast audio previews & music samples
│   ├── index.html            # Static HTML fallback
│   └── logo.png              # Application logo
├── android/                  # Capacitor Android project
│   ├── app/                  # Android app module
│   ├── build.gradle          # Root Gradle build file
│   └── ...
├── src/
│   ├── agents/               # Agent implementations
│   │   ├── agent1.ts              # News Researcher — real Brave Search + LLM, writes XML segments to files
│   │   ├── agent1Parse.ts         # Output parser for Agent 1 (6 theme sections)
│   │   ├── fullScriptWriter.ts    # Full Script Writer — rewrites entire script, writes all segments
│   │   ├── fullScriptEditor.ts    # Full Script Editor — audits full script, decides FULL_SCRIPT vs SEGMENTS routing
│   │   ├── fullScriptEditorParse.ts  # JSON parser for audit results (rewrite_scope, failed_segments)
│   │   ├── segmentWriter.ts       # Segment Writer — targeted rewrite of failing segments only
│   │   ├── segmentEditor.ts       # Segment Editor — audits rewritten segments + transitions
│   │   ├── assembler.ts           # Assembler — pure code concatenation of segments into full_script.txt
│   │   ├── stubs/                 # Configurable stub agents for pipeline testing
│   │   │   ├── agent5Stub.ts
│   │   │   ├── gate2Stub.ts
│   │   │   ├── gate3Stub.ts
│   │   │   └── stubConfig.ts
│   │   └── index.ts               # Agent map factory
│   ├── components/           # React UI components
│   │   ├── pipeline/         # Pipeline UI components
│   │   │   ├── PipelinePanel.tsx
│   │   │   ├── StageDetail.tsx
│   │   │   └── StageStrip.tsx
│   │   ├── BiasSelector.tsx
│   │   ├── ConfigureApiScreen.tsx
│   │   ├── CountryMap.tsx
│   │   ├── CountrySearch.tsx
│   │   ├── NewsroomScreen.tsx
│   │   ├── Newsroom2Screen.tsx
│   │   └── ScreenTabs.tsx
│   ├── data/                 # Static data & configuration
│   │   ├── bias.ts
│   │   ├── countries.ts      # 195-country dataset with news sources & languages
│   │   ├── countryBounds.ts
│   │   ├── music.ts
│   │   ├── timeframes.ts
│   │   ├── topics.ts         # Topic taxonomy with translations
│   │   └── voices.ts
│   ├── lib/                  # Core logic
│   │   ├── apiConfig.ts      # API persistence, LLM calls, SSE streaming, Brave key storage
│   │   ├── newsSearch.ts     # Brave Search API wrapper with fallback chain
│   │   ├── apiConfig.ts      # API persistence, LLM calls, SSE streaming, Brave key storage
│   │   ├── fileManager.ts    # File I/O via @capacitor/filesystem (segment files, full_script.txt)
│   │   ├── newsSearch.ts     # Brave Search API wrapper with fallback chain
│   │   ├── pipeline.ts       # Pipeline runner state machine with FULL_SCRIPT / SEGMENTS routing
│   │   ├── pipelineTypes.ts  # Pipeline type definitions (AuditResult with rewrite_scope, failed_segments)
│   │   ├── scriptParser.ts   # XML segment parser, assembler, tag stripper for TTS
│   │   ├── sessionConfig.ts  # SessionConfig builder & formatter
│   │   └── utils.ts
│   ├── prompts/
│   │   ├── agent1.ts              # Agent 1 prompt builder — XML segment output instructions
│   │   ├── fullScriptWriter.ts    # Full Script Writer prompt — preserve XML tags, rewrite everything
│   │   ├── fullScriptEditor.ts    # Full Script Editor prompt — per-theme audit + rewrite_scope routing
│   │   ├── segmentWriter.ts       # Segment Writer prompt — rewrite only failing segments + transition context
│   │   ├── segmentEditor.ts       # Segment Editor prompt — audit rewritten segments + transition checks
│   │   └── shared/                # Permanent, session-independent prompt building blocks
│   │       └── completenessRequirements.ts
│   ├── App.tsx               # Main application component with tab router
│   ├── index.css
│   ├── main.tsx
│   └── types.ts              # Shared TypeScript interfaces
├── .github/workflows/
│   └── build-android.yml     # APK build workflow
├── capacitor.config.ts
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Download

1. Go to the **Actions** tab in this GitHub repository
2. Select the **Build Android APK** workflow
3. Open the latest successful run on the `AI-Newsroom-Full-App` branch
4. Download the **`ai-newsroom-full-app-debug`** artifact
5. Extract the ZIP and install `app-debug.apk` on your Android device
   - You may need to enable **Install from unknown sources**

---

## Usage

1. **Configure your APIs** — Go to Configure API, add your LLM provider key AND your Brave Search API key, save and test both
2. **Configure your podcast** — Go to Newsroom 2, pick a country, timeframe, **exactly 3 topics**, voice, music, and editorial angle
3. **Run Full Pipeline** — Tap the button and watch the agents work
4. **Inspect stages** — Tap any stage card to see reasoning, the full LLM prompt, the first draft, the structured audit, and output

---

## Repository

https://github.com/atavist89-max/Ai-newsroom
