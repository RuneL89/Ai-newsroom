# AI Newsroom

**Your personal AI news producer. In your pocket.**

Pick any country on Earth. Select what kind of news you want, how you want it told, and who you want telling it. Then watch a team of six AI agents research local sources, write stories, edit them, fact-check every claim, and polish the final script — all in real time, right on your phone.

No newsroom. No subscription. No backend. Just you, your API key, and a fully autonomous pipeline that turns raw global events into a professional news podcast tailored exactly to your perspective.

---

## What It Does

Imagine waking up in Berlin and wanting to know what's happening in Nairobi — but not from a Western lens, and not from sanitized headlines. You want the local perspective, translated and contextualized for an international audience, delivered by a voice you chose, with the editorial angle you prefer.

**AI Newsroom makes that happen in under 5 minutes.**

You configure:
- **Country** — 196 countries with local language and native news sources
- **Timeframe** — Daily briefing, weekly review, or monthly roundup
- **Topics** — Up to 3 from politics, economy, sport, technology, crime, and more
- **Voice** — Professional narrators with distinct accents and personalities
- **Music** — Custom intro, outro, stings, and transitions
- **Editorial Perspective** — From extreme left to extreme right, or dead-center moderate

Then you hit **Run Full Pipeline**. Seven AI agents go to work:

1. **Researcher** — Searches local sources in the country's native language, translates findings, and picks the top stories
2. **Editor (Phase 1)** — Checks for completeness, clarity, and professional broadcast standards
3. **Writer** — Polishes the script for active voice, oral readability, and narrative flow
4. **Fact Checker** — Verifies every claim against independent sources
5. **Researcher (Fix)** — If facts fail, finds replacements and provides repair instructions
6. **Editor (Final)** — Gives the final approval gate before audio production
7. **Audio Producer** — Generates narration with the selected voice, mixes music stings, and assembles the final MP3

Each agent streams its reasoning in real time. You can tap any stage to see exactly what it's thinking and what it produced. If an editor rejects a story, you see the specific rule that failed and why — the writer gets that feedback, fixes it, and resubmits. The pipeline loops until everything passes.

**This is not a chatbot. This is a production pipeline.**

---

## The Pipeline

The AI Newsroom pipeline is a state machine that orchestrates six specialized agents. It runs fully automatically, handles rejection loops without limits, and retries failed API calls up to 3 times before aborting.

```
Researcher
    ↓
Editor (Phase 1)
    ↓ Approved          ↓ Rejected
    ↓                   └──────────→ back to Researcher
Writer
    ↓
Fact Checker
    ↓ PASS              ↓ ISSUES_FOUND
    ↓                   └──────────→ Fixer → back to Writer
Editor (Final)
    ↓ APPROVED          ↓ REJECTED
    ↓                   └──────────→ back to Writer
Audio Producer
    ↓
   ✅ COMPLETE
```

**Key behaviors:**
- **Rejection loops have no limit** — the pipeline prioritizes correctness over speed
- **API failures retry 3 times** — then abort with a clear error
- **Session context is ephemeral** — configuration exists only in memory for the current run; close the app and it disappears
- **All agents work from the same draft** — revisions are applied to the current version, never from scratch

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
- **Editor** → `AuditResult` with per-story/per-rule PASS/FAIL status and `rejection_reason` for every failure
- **Fact Checker** → `FactCheckResult` with per-story grades and `overall_status: PASS | ISSUES_FOUND`
- **Fixer** → `RecoveryResult` with `writer_instructions` for the Writer to apply

### Permanent Requirements

Story completeness rules and editor audit checklists live in `src/prompts/shared/completenessRequirements.ts` as session-independent constants. They include:

- Minimum 1500 characters per story
- 60%+ of sentences between 15–30 words
- All local terms defined on first mention
- All 5 Ws + How answered
- Zero-knowledge assumption (write for listeners with no prior context)
- Continent-specific angles for continental news

These are the golden rules. They don't change per session.

---

## Mobile-First UI

The pipeline UI is designed for phones:

- **Horizontal stage strip** — A scrollable row of compact stage cards at the top. Each shows an icon, short name, and status dot. Active stages pulse. Completed stages show green checks. Rejected stages show amber warnings.
- **Tap to inspect** — Tap any stage to expand its reasoning chain and output below
- **Loop counters** — Badges show when a stage has run multiple times (×2, ×3...)
- **Real-time streaming** — Reasoning tokens stream in as agents think, just like watching a live terminal

---

## Technical Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS |
| Maps | Leaflet |
| Build | Vite |
| Mobile | Capacitor (Android APK) |
| Storage | `@capacitor/preferences` (Android SharedPreferences) |
| LLM API | OpenAI-compatible `/chat/completions` (SSE streaming) |
| CI/CD | GitHub Actions |

### Self-Contained APK

Everything bundles into the APK. No external web server. No cloud backend. The app talks directly to your chosen LLM provider using your API key.

### Supported Providers

- OpenAI (GPT-4o, etc.)
- Anthropic (Claude via OpenRouter or direct)
- Google Gemini
- OpenRouter (unified access to many models)
- Local/Custom endpoints (Ollama, llama.cpp, vLLM, etc.)

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
│   ├── agents/               # Agent implementations & stubs
│   │   ├── stubs/            # Configurable stub agents for pipeline testing
│   │   │   ├── agent1Stub.ts
│   │   │   ├── agent3Stub.ts
│   │   │   ├── agent5Stub.ts
│   │   │   ├── gate1Stub.ts
│   │   │   ├── gate2Stub.ts
│   │   │   ├── gate3Stub.ts
│   │   │   └── stubConfig.ts
│   │   └── index.ts          # Agent map factory
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
│   │   ├── countries.ts      # 196-country dataset with flags & sources
│   │   ├── countryBounds.ts
│   │   ├── music.ts
│   │   ├── timeframes.ts
│   │   ├── topics.ts
│   │   └── voices.ts
│   ├── lib/                  # Core logic
│   │   ├── apiConfig.ts      # API persistence, LLM calls, SSE streaming
│   │   ├── pipeline.ts       # Pipeline runner state machine
│   │   ├── pipelineTypes.ts  # Pipeline type definitions
│   │   ├── sessionConfig.ts  # SessionConfig builder & formatter
│   │   └── utils.ts
│   ├── prompts/
│   │   └── shared/           # Permanent, session-independent prompt building blocks
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

1. **Configure your API** — Go to Configure API, select your provider, enter your key and model, save and test
2. **Configure your podcast** — Go to Newsroom 2, pick a country, timeframe, topics, voice, music, and editorial angle
3. **Run Full Pipeline** — Tap the button and watch the agents work
4. **Inspect stages** — Tap any stage card to see reasoning and output

---

## Repository

https://github.com/atavist89-max/Ai-newsroom
