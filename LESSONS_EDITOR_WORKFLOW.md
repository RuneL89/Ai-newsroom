# AI Newsroom — Editorial Best Practices & Run Memory

> Living document. Each run appends findings. Do not overwrite — add dated sections.
> This file captures ONLY things discovered during execution that the main prompt does not cover.
> Read this before assigning the Editor agent. Current as of 2026-07-05 (Iran Weekly Review).

---

## 2026-07-05 — Run 1: Iran Weekly Review

### Sentence-length oscillation
The prompt requires "60% of sentences 15-30 words." The Writer's first draft had 0% of stories passing (sentences too long, 30-50 words). The fix overcorrected to nearly all sentences under 15 words (9.9%-52% in range). A second mechanical-combine pass was needed to land in the 62-86% range.

**Lesson:** Instruct the Writer to target 70% in the 15-30 word range — not the minimum 60%. This prevents overcorrection.

**Impact:** Cost us one full extra Editor-Writer loop (Iteration 8-9).

---

### Mechanical combining produces artifacts
When the Writer fixed the short-sentence problem by mechanically merging adjacent sentences, the Editor found 6 artifacts: `, and However,` `, and But` `, and And yet` and similar double-conjunction patterns across Stories 3, 6, 8 and the Editorial.

**Lesson:** Any sentence-combining fix must include an explicit cleanup pass that scans for `, and [Capitalized transition word]` and replaces with `. [Word]`.

**Impact:** Minor — Editor caught and described them, Writer fixed inline. But without the Editor looking for this specifically, they would have shipped.

---

### "Fact Check Failed" does not mean "fabricated"
The Fact Checker graded Story 7 (Syria cafe bombing) as FAILED after finding zero sources. The Fact Recovery Specialist found 9 confirming sources on deeper search using different terms and sources. The story was verified; the initial search simply didn't hit the right sources.

**Lesson:** When Fact Checker reports FAILED, the Fact Recovery agent should ALWAYS attempt deeper targeted verification (exact quotes, different source combinations) BEFORE treating it as a replacement candidate. The prompt currently jumps to replacement too quickly.

**Impact:** If we had replaced Story 7 immediately, we would have lost a verified story and added 2-3 extra iterations for the replacement to be written, edited, and checked.

---

### Editor final check can reject even after Fact Checker passes
The workflow diagram shows: Fact Checker -> (conditional recovery) -> Editor -> Audio. The Editor's final check on the v2 script (after Fact Checker had passed all stories) STILL rejected it for sentence-length distribution going the other direction.

**Lesson:** The Fact Checker verifies facts; the Editor verifies craft. Passing one does not guarantee passing the other. The Editor's final check is a hard gate that can reject for reasons completely unrelated to fact-checking. Do not assume a script that passed fact-checking is automatically cleared for audio.

---

### Specific corrections from this run (for pattern recognition)

| What was wrong | What it was corrected to | Category |
|---|---|---|
| Date "June 28th" for $6B funds announcement | "June 29th" | Factual date error |
| "Ayatollah Shubairi Zanjani" | "Ayatollah Hashem Hosseini Bushehri, chairman of the Society of Seminary Teachers of Qom" | Name + title wrong |
| Death toll "at least six" in Damascus cafe | "at least nine" | Undercount |
| Missing: foiled bus bomb July 3 Al-Wurud | Added paragraph | Missing related event |
| Israeli control "approximately 60 percent" | "approximately 70 percent" | Understatement |
| Missing: "According to Gaza Government Media Office" before breakdown figures | Added attribution | Missing source attribution |

**Pattern:** Errors cluster around specific numbers (dates, death tolls, percentages) and proper names/titles. Fact Recovery should prioritize these claim types when a story grades PARTIALLY CORRECT.

---

### Writer tends to overcorrect wholesale
When given a fix instruction, the Writer applies it to the entire script rather than surgically. Sentence splitting hit every story. Sentence combining hit every story. Both passes were global when they should have been targeted.

**Lesson:** Fix instructions to the Writer should specify WHICH segments to touch and WHICH to leave alone. "Fix Stories 2, 3, 4, 5, 6, 8 and Editorial only. Stories 1 and 7 passed — do not touch them."

---

### Iteration count for this run

| Iteration | Agent | Action | Trigger |
|---|---|---|---|
| 1 | Writer | First draft | Initial |
| 2 | Editor | Phase 1 REJECT | 3 issues (length, undefined term, attribution) |
| 3 | Writer | Phase 2 + fixes | Editor rejection |
| 4 | Fact Checker | Full verification | Workflow step |
| 5 | Fact Recovery | Deep re-research | Story 7 "FAILED" + Stories 4, 8 partial |
| 6 | Writer | Apply corrections | Fact Recovery findings |
| 7 | Fact Checker | Re-verify 3 stories | Corrections applied |
| 8 | Editor | Final check REJECT | Sentence length too short (overcorrection) |
| 9 | Writer | Mechanical edit | Editor rejection |
| 10 | Editor | Final check PASS | Cleared for audio |

**Total: 10 agent iterations.** Target for future runs with these lessons applied: 5-6.
