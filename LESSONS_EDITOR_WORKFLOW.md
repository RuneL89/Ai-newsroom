# Editor Workflow — Generic Lessons for Agent Swarms

> Read this file at the START of any newsroom podcast pipeline. These lessons prevent the most common rejection reasons that cause iteration loops.

---

## 1. Frontload the Sentence Length Constraint

**The mistake:** Putting the "60% of sentences must be 15-30 words" rule only in the Editor checklist. By the time the Editor sees the draft, the entire script has wrong sentence lengths and needs a full rewrite.

**The fix:** The Researcher/First-Draft Writer MUST enforce this WHILE writing. Add this to the Writer's prompt:

```
SENTENCE LENGTH RULE (non-negotiable):
- 65-75% of sentences must be 15-30 words
- Average sentence length must exceed 15 words
- While writing: if a sentence exceeds 30 words, split it
- While writing: if a sentence is under 15 words, merge it with the next
  using: and, but, while, as, which, although
- Target 70% in range — this builds a buffer above the 60% minimum
```

**Why 65-75% and not exactly 60%:** The Editor check is binary — pass or fail. Aiming for 70% means a few edge-case sentences won't push you below the threshold. We saw a script oscillate: 0% pass -> overcorrect to 100% short sentences -> combine back up. Targeting the middle band prevents this.

---

## 2. Mechanical Edit Artifact Cleanup

**The mistake:** When a Writer fixes sentence-length issues by mechanically combining short sentences, artifacts appear that the Editor will catch and reject.

**Common artifacts to hunt for after any mechanical sentence edit:**

| Artifact | Example | Fix |
|----------|---------|-----|
| Double conjunction | `, and However,` | `. However,` |
| Double conjunction | `, and But` | `. But` |
| Triple conjunction | `, and And yet` | `. And yet` |
| Run-on >35 words | Two unrelated ideas jammed together | Split at the natural logical break |
| Sentence fragment | Starts with lowercase after combining | Capitalize or restructure |

**The fix:** Any mechanical edit pass MUST be followed by a cleanup scan. Add to the Writer prompt:

```
AFTER combining sentences, scan for and fix:
1. Any ", and [Capitalized word]" -> replace with ". [Capitalized word]"
2. Any sentence over 30 words -> split at natural break
3. Any sentence under 15 words -> expand or re-merge
4. Read combined sentences aloud — if they sound awkward, rewrite
```

---

## 3. Fact Recovery: Verify Before Replacing

**The mistake:** When the Fact Checker grades a story "FAILED," the Fact Recovery agent's first instinct is to search for a replacement story. But the failure might just mean the initial search didn't find the sources — not that the story is fabricated.

**The fix:** Change the Fact Recovery priority order:

```
FACT RECOVERY PRIORITY (strict order):
1. FIRST: Run targeted verification searches using EXACT quotes,
   different source combinations, and narrower date ranges
2. If 2+ corroborating sources found -> Update grade to FULLY CORRECT
3. If 1 corroborating source found -> Update grade to PARTIALLY CORRECT
4. ONLY IF zero sources found after deep search -> Replace the story
```

**Why this matters:** A replaced story means the Writer must rewrite a segment, the Editor must re-check it, and the Fact Checker must re-verify it. That's 3 extra iterations. Verifying in place costs 1 iteration.

---

## 4. Zero-Knowledge Self-Check

**The mistake:** Assuming the Writer will naturally define all terms for an international audience. Even experienced agents miss terms that seem obvious to them (organization names, political titles, regional acronyms).

**The fix:** Add an explicit self-check step to the Writer prompt:

```
BEFORE submitting the draft, run this self-check on EVERY story:
1. Highlight every proper noun (person, place, organization)
2. Highlight every acronym or abbreviation
3. Highlight every political term or concept
4. Highlight every historical reference
5. Verify EACH ONE has a parenthetical definition on first mention
6. If any are undefined, add: "TERM (DEFINITION)" on first use
```

**Common terms that get missed:**
- Memorandum names ("the Cairo Agreement" -> what is it?)
- Political titles ("the Supreme Leader" -> of which country? what does it mean?)
- Geographic features ("the Strait" -> which strait? why does it matter?)
- Organization acronyms ("the IRGC" -> what does it stand for? what does it do?)

---

## 5. Country Attribution Rules

**Simple rules that get broken:**

```
MANDATORY (checked by Editor, rejection if violated):
- Every story in the Continent block MUST start with "In [COUNTRY], ..."
- [COUNTRY] must be an actual country or widely recognized territory
- Gaza Strip -> "In the Palestinian territories, ..."
- West Bank -> "In the Palestinian territories, ..."
- Do NOT put Country stories in the Continent block
- Do NOT put Continent stories that lack a Continent-specific angle
```

---

## 6. Bias Verification Checklist

**The mistake:** Telling the Editor to "check if the Moderate perspective was applied" is too vague. The Editor needs concrete, checkable items.

**Generic checklist (adapt adjectives for your selected bias):**

```
BIAS VERIFICATION CHECKLIST:
- [ ] Headlines use neutral/factual language, not loaded terms
- [ ] Story order prioritizes newsworthiness over political angle
- [ ] Attribution phrases used: "according to X," "officials stated," "reports indicate"
- [ ] Both/all sides of contentious issues are quoted
- [ ] No judgment adjectives outside direct quotes ("brutal," "heroic," "oppressive")
- [ ] Editorial segment has HIGHER intensity than news segments
- [ ] No section suddenly reads like a different bias was applied
```

---

## 7. Editorial Segment Structure

**The mistake:** The editorial reads like another news story instead of an analytical conclusion.

**The fix:** Enforce this structure in the Writer prompt:

```
EDITORIAL SEGMENT — REQUIRED STRUCTURE:
<!-- HOOK: 2-3 sentences referencing 2-3 specific stories from this broadcast -->
<!-- ANALYSIS: 60% of segment — connect themes, identify patterns across blocks -->
<!-- PERSPECTIVE: 30% — explicitly state the [BIAS] viewpoint -->
<!-- CLOSING: 10% — memorable final thought, natural transition to sign-off -->

RULES:
- Minimum 2500 characters
- Sentence length: 65-75% in 15-30 word range
- Intensity must be NOTICEABLY higher than news segments
- Must reference specific stories (not generic observations)
- Must provide analytical closure, not just summary
```

---

## 8. The Hard Gate Before Audio

**This is non-negotiable.** The Editor's final check is the last quality gate before expensive audio production. The rule:

```
NEVER skip the final Editor check.
NEVER generate audio for a script that hasn't passed Editor final review.
If the Editor rejects, fix and re-submit. Audio generation is the REWARD for passing.
```

**Why:** Audio generation involves 20+ TTS calls, sound effect generation, and ffmpeg assembly. That's hundreds of tool calls. Fixing a script and regenerating audio costs 3-5x more iterations than fixing before audio.

**The loop structure:**
```
Writer -> Editor (REJECT) -> Writer (fix) -> Editor (PASS) -> Audio
```
Not:
```
Writer -> Editor (skip) -> Audio (generate) -> Editor (check, REJECT) -> Audio (regenerate)
```

---

## 9. Editor Rejection Criteria (Complete List)

These are the ONLY reasons the Editor should reject a script. All are checkable:

```
AUTOMATIC REJECTION (no exceptions):
- [ ] Any story under 1500 characters
- [ ] Any story with <60% of sentences in 15-30 word range
- [ ] Any story with average sentence length <15 words
- [ ] Any undefined term, acronym, organization, or political concept
- [ ] Any story missing Who, What, When, Where, Why, How
- [ ] Any story assuming prior knowledge of local affairs
- [ ] Any Country story in the Continent block
- [ ] Any Continent story lacking a Continent-specific angle
- [ ] Any Continent story not starting with "In [COUNTRY], ..."
- [ ] Editorial under 2500 characters
- [ ] Editorial with same or lower bias intensity than news segments
- [ ] Bias inconsistency (different sections read like different biases)
- [ ] Mechanical edit artifacts (", and However," etc.)
```

---

## 10. Expected Iteration Count

**With these lessons applied, expect:**
- **5-6 total agent iterations** (vs. 9 without fixes)
- **1 Editor rejection at most** (vs. 2 without fixes)
- **0 audio regenerations** (final check catches everything)

**Iteration breakdown:**
```
1. Writer (first draft, with constraints) ->
2. Editor (Phase 1, likely PASSES) ->
3. Fact Checker (verification) ->
   [Optional: Fact Recovery if issues found] ->
4. Editor (Final Check, PASSES) ->
5. Audio Producer (generates final MP3)
```

**Without these lessons:**
```
Writer -> Editor (REJECT, length) -> Writer (fix) ->
Fact Checker (ISSUES) -> Fact Recovery -> Writer (fix) ->
Fact Checker (re-verify) -> Editor (Final, REJECT, length) ->
Writer (fix) -> Editor (PASS) -> Audio Producer
```

The difference: 5 iterations vs. 9+. Apply these lessons.
