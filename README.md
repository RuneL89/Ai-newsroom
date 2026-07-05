# AI Newsroom — Web Prompt Generator

**Generate Agent Swarm prompts for automated news podcast production.**

A React web application that configures and generates detailed prompts for the AI Newsroom Agent Swarm. Select a country, timeframe, topics, voice, music, and editorial perspective — then receive a complete, ready-to-paste prompt that runs a full 6-agent newsroom pipeline inside Kimi Agent.

This branch (`webapp-dev`) is the **web-based prompt generator**. For the full Android app with native pipeline execution, see the `main` branch.

---

## Table of Contents

- [What It Does](#what-it-does)
- [The Agent Swarm](#the-agent-swarm)
- [The Prompt Pipeline](#the-prompt-pipeline)
- [Prompt Structure in Detail](#prompt-structure-in-detail)
- [Configuration Options](#configuration-options)
- [Project Structure](#project-structure)
- [Usage](#usage)
- [Deploy](#deploy)

---

## What It Does

This webapp generates a complete, structured prompt that instructs a team of AI agents to research, write, edit, fact-check, and produce a professional news podcast — fully automatically.

You configure:
- **Country** — 100+ countries with local news sources and native language support
- **Timeframe** — Daily briefing, weekly review, or monthly roundup
- **Topics** — Up to 3 from politics, economy, sport, technology, crime, and more
- **Voice** — AI narration voice with preview audio
- **Music** — Custom intro, outro, stings, and transitions with preview
- **Editorial Perspective** — From extreme left to extreme right, or dead-center moderate
- **Editorial Segment** — Optional thematic analysis at the end of the broadcast

Then you hit **Generate Podcast Prompt**. Copy the output, paste it into a new Kimi Agent chat, and the swarm goes to work.

---

## The Agent Swarm

The generated prompt defines six specialized agents. Each has a single job, and they pass work to each other like a real newsroom:

| # | Agent | What It Does | Why It Matters |
|---|---|---|---|
| 1 | **News Researcher & First Draft Writer** | Searches local and continental news sources in the country's native language, translates to English, scores stories on BBC news values, and writes the first draft script | This is where the raw information comes from. All local sources are searched in the native language, translated, and evaluated before any writing happens |
| 2 | **The Editor** | Reviews the first draft for BBC standards, structural completeness, consistent bias framing, and story quality | Catches problems the Writer can't see — like a topic that contradicts another, or a bias that drifts halfway through. Acts as the executive editor with full rejection authority |
| 3 | **The Writer** | Rewrites the full script based on the Editor's feedback, polishing for active voice, tense consistency, oral readability, and bias alignment | The fixer for script-wide problems. Applies the editorial perspective consistently across all segments |
| 4 | **Fact Checker** | Verifies every factual claim against official sources in both the country's native language and English | Ensures accuracy by cross-referencing with the same local and international news sources used for research |
| 5 | **Researcher (Conditional)** | Only activates if the Fact Checker finds issues. Fixes or replaces failed stories | The recovery specialist. Handles edge cases without disrupting the rest of the pipeline |
| 6 | **Audio Producer** | Generates all audio files using OpenAI TTS, mixes music stings between segments, and assembles a single final MP3 | The sound engineer. Handles voice synthesis, audio mixing, and incremental encoding |

---

## The Prompt Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PROMPT GENERATION FLOW                               │
└─────────────────────────────────────────────────────────────────────────┘

  Webapp UI
    │
    │  User selects:
    │  • Country (100+)
    │  • Timeframe (daily/weekly/monthly)
    │  • Topics (up to 3)
    │  • Voice (with preview)
    │  • Music suite (with preview)
    │  • Editorial perspective (5 positions)
    │  • Editorial segment (optional)
    │
    ▼
┌─────────────────────────────────────────────────┐
│  GENERATE PODCAST PROMPT                        │
│  Build structured agent swarm prompt (~24K chars)│
└─────────────────────────────────────────────────┘
    │
    ▼
  Copy to Clipboard
    │
    ▼
┌─────────────────────────────────────────────────┐
│  PASTE INTO KIMI AGENT                          │
│  Agents execute autonomously                     │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        AGENT SWARM EXECUTION                            │
└─────────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│  AGENT 1: NEWS RESEARCHER                       │
│  Search → Translate → Score → First Draft       │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  AGENT 2: THE EDITOR                            │
│  Structural check → Bias verification → Audit   │
└─────────────────────────────────────────────────┘
                      │
        ┌─────────────┴──────────────┐
        │      APPROVED    REJECTED  │
        │                            ▼
        │                   ┌─────────────────┐
        │                   │ Return to Agent 1│
        │                   └─────────────────┘
        ▼
┌─────────────────────────────────────────────────┐
│  AGENT 3: THE WRITER                            │
│  Polish → Active voice → Consistent bias        │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  AGENT 4: FACT CHECKER                          │
│  Verify claims against sources in native lang   │
└─────────────────────────────────────────────────┘
                      │
        ┌─────────────┴──────────────┐
        │      PASS       ISSUES     │
        │                            ▼
        │                   ┌─────────────────┐
        │                   │ AGENT 5: RESEARCH│
        │                   │ Fix/replace stories│
        │                   └─────────────────┘
        ▼
┌─────────────────────────────────────────────────┐
│  AGENT 6: AUDIO PRODUCER                        │
│  TTS narration → Music mixing → Single MP3      │
└─────────────────────────────────────────────────┘
                      │
                      ▼
                     ✅
```

---

## Prompt Structure in Detail

### Configuration Block

The generated prompt opens with a complete configuration summary:

```
# AI NEWSROOM - Agent Swarm Prompt
## [Country] [Timeframe] - [Date]

### Configuration
- Country: [name] ([language])
- Continent: [name]
- Timeframe: [label] (past [n] days)
- Topics: [topic1, topic2, topic3]
- Voice: [voice name]
- Editorial Perspective: [bias label]
- Include Editorial Segment: [Yes/No]

### News Sources
- [Country] sources ([language]): [source list]
- [Continent] sources (English): [source list]
```

### Editorial Perspective

The selected bias is woven through every agent's instructions:

- **Agent 1 (Researcher)**: Framing instructions for the first draft — headline emphasis, story ordering, language choices, quote selection
- **Agent 2 (Editor)**: Bias verification checklist — ensures consistent perspective throughout
- **Agent 3 (Writer)**: Polish instructions that strengthen the selected framing

Five positions available:
- **Extreme Left** — Emphasizes systemic failures, power imbalances, collective action
- **Moderate Left** — Balances progress with challenges, policy-focused
- **Moderate** — Neutral, factual, balanced perspectives
- **Moderate Right** — Emphasizes economic success, market solutions, individual achievement
- **Extreme Right** — Emphasizes threats, sovereignty, traditional values

> **Core principle**: Same facts, different framing. Never invent facts. Never omit relevant facts.

### Editorial Segment (Optional)

When enabled, the prompt includes instructions for a concluding editorial analysis:

- Minimum 2,500 characters
- Connects the day's stories to broader thematic patterns
- Applies the selected bias most prominently
- Structure: Opening Hook → Theme Development → Analysis → Closing Thought

### Story Completeness Requirements

Embedded in Agent 1's instructions and verified by Agent 2:

- **Minimum 1,500 characters** per story
- **60%+ of sentences** must be 15–30 words
- **International context** for all local references
- **All terms defined** on first mention
- **5 Ws + How** answered for every story
- **Continent-specific angle** for international stories

---

## Configuration Options

### Countries (100+)

Every country includes:
- Native language code (for translation and search)
- 2 local news sources
- Continent code (links to continental sources)

### Topics

- General News
- Economy
- Entertainment
- Politics
- Society
- Sport
- Technology
- Crime

### Voices (with preview)

- Adam — Professional male, American
- Bella — Professional female, American
- Josh — Authoritative male, British
- Rachel — Warm female, American

### Music Suite (with preview)

| Slot | Options | Duration |
|---|---|---|
| Intro | Orchestral A, Modern B, Nordic C, BBC Style, Contemporary E | 8s |
| Outro | Orchestral A, Modern B, Nordic C, BBC Style, Contemporary E | 6s |
| Story Sting | Orchestral A, Modern B, Nordic C, BBC Style, Contemporary E | 1–2s |
| Block Transition | Orchestral A, Modern B, Nordic C, BBC Style, Contemporary E | 3s |

---

## Project Structure

```
├── src/
│   ├── App.tsx                 # Main app with all sections
│   ├── main.tsx                # React entry point
│   ├── index.css               # Tailwind styles
│   ├── types.ts                # TypeScript interfaces
│   ├── data/
│   │   ├── countries.ts        # 100+ countries with sources
│   │   ├── topics.ts           # Available topics
│   │   ├── voices.ts           # Voice configs with IDs
│   │   ├── music.ts            # Music style definitions
│   │   ├── bias.ts             # Bias options + agent instructions
│   │   └── timeframes.ts       # Timeframe configs
│   └── components/
│       ├── BiasSelector.tsx    # 5-position bias picker
│       └── CountryMap.tsx      # Interactive Leaflet map
├── index.html                  # HTML entry point
├── package.json
├── vite.config.ts              # Vite build config
├── tsconfig.json               # TypeScript config
├── tailwind.config.js          # Tailwind config
└── postcss.config.js           # PostCSS config
```

---

## Usage

### Local Development

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
```

Output goes to `ai-newsroom/` (configured in `vite.config.ts`).

### Using the Generated Prompt

1. **Configure your podcast** — Select country, timeframe, up to 3 topics, voice, music, editorial angle, and optional editorial segment
2. **Generate** — Click "Generate Podcast Prompt"
3. **Copy** — Click the copy button (or select all)
4. **Paste into Kimi Agent** — Open a new Kimi Agent chat, paste the prompt, press Enter
5. **Watch the swarm work** — The agents execute autonomously, producing a complete podcast script and MP3

---

## Deploy

The built output in `ai-newsroom/` is a static site ready for any static host:

```bash
npm run build
# Deploy ai-newsroom/ to your static host
```

---

## Branches

| Branch | Description |
|---|---|
| `main` | Android app with full native pipeline execution |
| `webapp-dev` | **This branch** — Web prompt generator for Kimi Agent Swarm |

---

*AI Newsroom — Configure, Generate, Deploy*
