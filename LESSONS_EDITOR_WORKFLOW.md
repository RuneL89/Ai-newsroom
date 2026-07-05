# Lessons Learned: Editor Review Workflow

> Documented after executing the full Iran Weekly Review pipeline (2026-07-05).
> This file captures every pitfall, workaround, and hard-won insight from the Editor agent flows so future runs can avoid the same traps.

---

## Table of Contents

1. [The Sentence Length Trap](#1-the-sentence-length-trap)
2. [Mechanical Edit Artifacts](#2-mechanical-edit-artifacts)
3. [Fact Recovery Loop Efficiency](#3-fact-recovery-loop-efficiency)
4. [Zero-Knowledge Assumption](#4-zero-knowledge-assumption)
5. [Bias Verification Checklist](#5-bias-verification-checklist)
6. [Editorial Segment Intensity](#6-editorial-segment-intensity)
7. [Hard Gate Before Audio](#7-hard-gate-before-audio)
8. [Loop Structure Cost](#8-loop-structure-cost)
9. [Rejection Criteria Precision](#9-rejection-criteria-precision)
10. [Recommended Workflow Improvements](#10-recommended-workflow-improvements)

---

## 1. The Sentence Length Trap

**Problem:** The 60% sentence-length requirement (15-30 words) is easy to fail in BOTH directions.

**What happened:**
- First draft: 0% of stories passed (sentences too long, 30-50 words)
- First fix: Writer split everything aggressively -> 86% of stories failed the OTHER way (sentences too short, 8-12 words)
- Second fix: Mechanical combining of short sentences -> All 8 stories + editorial passed

**The lesson:** Give the Writer explicit instructions to target **65-75% in range**, not just scrape past 60%. This builds in a buffer and avoids the oscillation we experienced.

**The root cause:** The First Draft Writer was not given the sentence-length constraint upfront. The constraint only appeared in the Editor checklist. By the time the Editor flagged it, the entire script needed rewriting.

**Fix for future runs:**
```
Add to Agent 1 (Researcher/Writer) prompt:
"TARGET: 65-75% of sentences must be 15-30 words.
AVERAGE: >15 words per sentence.
WHILE WRITING: Count words per sentence as you go. 
If a sentence exceeds 30 words, split it into two.
If a sentence is under 15 words, combine it with the next sentence 
using 'and', 'but', 'while', 'as', or 'which'."
```

---

## 2. Mechanical Edit Artifacts

**Problem:** When the Writer combined short sentences mechanically, artifacts appeared:

| Artifact | Cause | Fix |
|----------|-------|-----|
| `", and However,"` | Joined two sentences where second started with "However" | Replace with `". However,"` |
| `", and But"` | Same pattern with "But" | Replace with `". But"` |
| `", and And yet"` | Triple conjunction | Replace with `". And yet"` |
| Run-on sentences | Joined unrelated ideas | Split back apart, add transition |

**The lesson:** Any mechanical sentence-combining pass needs a FOLLOWING cleanup pass that specifically hunts for:
- Double conjunctions: `, and [But/However/And Yet/Therefore]`
- Run-ons that lost their logical connection
- Sentences that became >30 words during combining

**Fix for future runs:** Add an explicit cleanup step in the Writer's instructions:
```
AFTER combining sentences, scan for these patterns and fix:
1. ", and [Capitalized transition word]" -> ". [Word]"
2. Any sentence >30 words -> split at natural break
3. Any sentence <15 words -> combine or expand
```

---

## 3. Fact Recovery Loop Efficiency

**What happened:**
1. Fact Checker flagged Story 7 (Syria cafe bombing) as unverified/fabricated
2. Fact Recovery Specialist did deep research and found 9 confirming sources
3. The story was actually correct; the Fact Checker had missed sources
4. Minor corrections were also found for Stories 4 and 8

**The lesson:** The Fact Checker uses web_search which can miss stories that exist. The Fact Recovery Specialist uses more targeted searches and often finds what the initial check missed. This means:

- **A FAILED grade should trigger deeper search, not automatic replacement.** The workflow currently assumes FAILED = hallucination. In our case, it was a search coverage gap.
- **Fact Recovery should always attempt verification BEFORE replacement.** The current prompt says "search for a replacement" as the first action. It should say "first attempt to verify the existing claims with more targeted searches, THEN replace if truly fabricated."

**Fix for future runs:**
```
Agent 5 (Fact Recovery) revised priority:
1. FIRST: Attempt targeted verification of "failed" claims 
   (use exact quotes, different source combinations)
2. IF verified -> Update grade to PARTIALLY or FULLY CORRECT
3. IF truly unverified after deep search -> THEN replace
```

---

## 4. Zero-Knowledge Assumption

**What worked well:** All 8 stories included comprehensive background for international listeners. Terms like "Supreme Leader," "Strait of Hormuz," "Hezbollah," and "UNESCO World Heritage Site" were all defined on first mention.

**What the Editor caught:**
- "Islamabad Memorandum" appeared in Story 2 without definition
- Story 8 originally opened with "In the Gaza Strip..." (Gaza is not a country)

**The lesson:** The zero-knowledge assumption is easy to state but hard to enforce consistently. Even experienced agents miss terms that seem obvious to them. The Editor's explicit checklist items (`REJECT IF ANY UNDEFINED TERMS`, `REJECT IF ASSUMES PRIOR KNOWLEDGE`) are essential and must remain.

**Fix for future runs:** Add a specific instruction to Agent 1:
```
"After writing each story, re-read it and highlight every:
- Proper noun (person, place, organization)
- Acronym or abbreviation
- Political term or concept
- Historical reference
Then verify each one is defined on first mention. 
If not, add a parenthetical definition."
```

---

## 5. Bias Verification Checklist

**What worked:** The Moderate perspective was consistently applied across all segments. The Editorial Segment had the highest intensity of Moderate framing.

**What the Editor verified:**
- Headlines: Neutral, factual
- Story order: Most newsworthy first (not most political)
- Language: "according to reports," "officials stated"
- Quotes: Multiple perspectives balanced
- No contradictory framing

**The lesson:** Bias verification needs SPECIFIC checklist items, not just "check if Moderate was applied." The Editor needs concrete things to look for:

```markdown
### Bias Verification Checklist (Moderate example)
- [ ] Headlines use neutral language, not loaded terms
- [ ] Story order prioritizes consequence over political angle
- [ ] Attribution phrases used: "according to X," "officials stated"
- [ ] Both/all sides of contentious issues are quoted
- [ ] No adjectives that imply judgment (e.g., "brutal," "heroic") 
  unless in direct quotes
- [ ] Editorial segment: presents multiple frameworks, 
  acknowledges complexity
```

---

## 6. Editorial Segment Intensity

**What the Editor checked:**
- Minimum 2500 characters (ours: 7,100 - well above)
- Moderate perspective MOST prominent (higher than news segments)
- Connects themes from both blocks
- Analytical closure, not just summary
- 60%+ sentences 15-30 words

**What worked:** The editorial was structurally sound:
1. Opening hook referencing 2-3 key stories
2. Thematic analysis (60%) - connecting dots
3. Moderate perspective (30%) - explicit viewpoint
4. Closing (10%) - memorable final thought

**The lesson:** The editorial is where the podcast's "personality" lives. It's also the longest single segment. The intensity must be noticeably higher than news segments. If it reads like another news story, it fails.

**Fix for future runs:** Add explicit structure markers to the editorial prompt:
```
"Mark these sections in your draft with comments:
<!-- HOOK: 2-3 sentences referencing specific stories -->
<!-- ANALYSIS: 60% of segment - connect themes, identify patterns -->
<!-- PERSPECTIVE: 30% - state the [BIAS] viewpoint explicitly -->
<!-- CLOSING: 10% - memorable final thought, transition to sign-off -->"
```

---

## 7. Hard Gate Before Audio

**Why it matters:** Audio production is expensive (in time and compute). The Editor's final check is the last chance to catch issues before burning resources on audio generation.

**What happened:** The first Editor final check REJECTED the script due to sentence length distribution. If we had skipped this gate, the Audio Producer would have generated audio for a script that failed quality standards.

**The lesson:** NEVER skip the final Editor check. The loop (Writer -> Editor re-check) is cheaper than regenerating audio. The workflow's explicit rule is correct:

```
ONLY WHEN EDITOR APPROVES ALL: Forward to Agent 6
```

---

## 8. Loop Structure Cost

**Full loop count for this run:**
1. Agent 1 (First Draft) -> Agent 2 (REJECTED) -> Agent 3 (Fix)
2. Agent 4 (ISSUES_FOUND) -> Agent 5 (Recovery) -> Agent 3 (Apply fixes) -> Agent 4 (Re-verify)
3. Agent 2 (Final Check v3 REJECTED) -> Agent 3 (Mechanical edit) -> Agent 2 (BBC CLEARED)

**Total: 9 agent iterations to complete.**

**Where we could save iterations:**

| Loop | Cause | Prevention |
|------|-------|------------|
| Editor reject #1 | Sentence length not enforced in Agent 1 | Add length constraint to Agent 1 prompt |
| Fact Checker miss | Initial search didn't find Story 7 sources | Wider initial search terms |
| Editor reject #2 | Over-correction of sentence length | Target 65-75% instead of 60% |

**Estimated savings with fixes: 3-4 iterations** (from 9 down to 5-6)

---

## 9. Rejection Criteria Precision

**The original prompt had excellent rejection criteria:**

```
REJECT IF UNDER 1500 CHARS
REJECT IF <60% SENTENCES 15-30 WORDS
REJECT IF AVERAGE SENTENCE LENGTH <15 WORDS
REJECT IF INTERNATIONAL LISTENER WOULD GOOGLE
REJECT IF ANY UNDEFINED TERMS
REJECT IF MISSING 5 Ws + HOW
REJECT IF UNDEFINED POLITICAL/GEOGRAPHICAL CONCEPTS
REJECT IF ASSUMES PRIOR KNOWLEDGE
REJECT IF [COUNTRY] STORIES IN [CONTINENT] BLOCK
REJECT IF [CONTINENT] NEWS LACKS CONTINENT ANGLE
REJECT IF [CONTINENT] NEWS DOESN'T START WITH "In [country]..."
```

**The lesson:** These worked. Every rejection the Editor made was justified by one of these criteria. The specificity is what makes them effective. "Be thorough" would not have caught the same issues.

**One addition needed:**
```
REJECT IF SENTENCE COMBINING ARTIFACTS FOUND:
  - ", and However," / ", and But," / ", and And"
  - Double conjunctions: "and and", "but but"
  - Run-on sentences >35 words without natural break
```

---

## 10. Recommended Workflow Improvements

Based on all lessons, here is the optimized workflow:

### Agent 1 (Researcher/Writer) - ADD THESE CONSTRAINTS:
```markdown
## MANDATORY WRITING CONSTRAINTS (checked by Editor, NOT optional)
- Each story: 65-75% of sentences must be 15-30 words
- Average sentence length: >15 words
- After writing: self-check sentence distribution
- Define ALL terms on first mention
- Answer 5 Ws + How for every story
- Middle East stories: start with "In [country]..."
- Editorial: minimum 2500 chars, higher intensity than news
```

### Agent 2 (Editor) - ADD THESE CHECKS:
```markdown
## NEW CHECKS
- [ ] Sentence combining artifacts (", and However," etc.)
- [ ] Mechanical edit quality (not just length distribution)
- [ ] Fact recovery: verify BEFORE replacing (not after)
```

### Agent 5 (Fact Recovery) - REVISED PRIORITY:
```markdown
## REVISED: Attempt verification BEFORE replacement
1. Targeted verification search with exact quotes
2. If found 2+ sources -> Update grade, no replacement
3. If 0-1 sources found after deep search -> THEN replace
```

### Expected impact:
- Iterations: 9 -> 5-6 (33-44% reduction)
- Audio re-generation: 0 (always caught before audio)
- Sentence length oscillation: eliminated
- Artifact cleanup: automated

---

## Quick Reference: Common Rejection Reasons

| Issue | Frequency | Severity | Fix Location |
|-------|-----------|----------|--------------|
| Sentence length distribution | Very High | Critical | Agent 1 prompt |
| Undefined terms | Medium | Critical | Agent 1 self-check |
| Country attribution missing | Low | Critical | Agent 1 prompt |
| "In [country]..." missing | Low | Critical | Agent 1 prompt |
| Editorial too short | Low | Medium | Agent 1 prompt |
| Bias inconsistency | Low | Medium | Agent 2 checklist |
| Fact verification gaps | Medium | High | Agent 5 revision |
| Combining artifacts | Medium | Low | Agent 3 cleanup step |
