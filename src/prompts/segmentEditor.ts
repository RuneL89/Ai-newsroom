import type { SessionConfig } from '../lib/sessionConfig';
import { formatSessionContextForLLM } from '../lib/sessionConfig';
import type { SegmentId } from '../lib/fileManager';

export function buildSegmentEditorPrompt(
  config: SessionConfig,
  segmentContent: string,
  targetSegmentId: SegmentId,
  targetStoryId: number,
  topicName: string,
  iteration: number = 1
): string {
  const isEditorial = targetSegmentId === 'topic7';
  const geographyLabel = targetStoryId <= 3
    ? `Local themes = only ${config.geography.country.name} stories`
    : `Continent themes = only ${config.geography.continent.name} countries with continent angle`;

  const editorialRules = isEditorial
    ? `    { "story_id": ${targetStoryId}, "rules": [
        { "rule_name": "EDITORIAL_SEGMENT_PRESENT", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "EDITORIAL_SEGMENT_PLACEMENT", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "EDITORIAL_SEGMENT_LENGTH", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "EDITORIAL_SEGMENT_BIAS_INTENSITY", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "EDITORIAL_SEGMENT_ANALYSIS", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "EDITORIAL_SEGMENT_CLOSURE", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." }
      ] }`
    : `    { "story_id": ${targetStoryId}, "rules": [
        { "rule_name": "LENGTH", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "DEPTH", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "SENTENCE_STRUCTURE", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "ACCESSIBILITY", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "FORWARD_CLOSE", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "SOURCE_ATTRIBUTION", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "GEOGRAPHY", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." }
      ] }`;

  const evaluationSteps = isEditorial
    ? `Step 1: Evaluate EDITORIAL SEGMENT — **PRESENT**. Does it exist and is it clearly labeled?
Step 2: Evaluate EDITORIAL SEGMENT — **PLACEMENT**. Is it after the continent block and before the sign-off?
Step 3: Evaluate EDITORIAL SEGMENT — **LENGTH**. Is it ≥2500 characters?
Step 4: Evaluate EDITORIAL SEGMENT — **BIAS INTENSITY**. Is the ${config.editorial.biasLabel} perspective applied MORE prominently than in news themes?
Step 5: Evaluate EDITORIAL SEGMENT — **ANALYSIS**. Does it connect and analyze themes from BOTH ${config.geography.country.name} and ${config.geography.continent.name}?
Step 6: Evaluate EDITORIAL SEGMENT — **CLOSURE**. Does it provide closure and wrap up the podcast?`
    : `Step 1: Evaluate Story ${targetStoryId} (${targetSegmentId}, topic: ${topicName}) — **LENGTH**. Is it ≥2000 characters?
Step 2: Evaluate Story ${targetStoryId} (${targetSegmentId}) — **DEPTH**. Does it synthesize ≥3 distinct developments, events, or angles?
Step 3: Evaluate Story ${targetStoryId} (${targetSegmentId}) — **SENTENCE_STRUCTURE**. Are ≥60% of sentences 15-30 words? Is average >15 words?
Step 4: Evaluate Story ${targetStoryId} (${targetSegmentId}) — **ACCESSIBILITY**. Would a zero-knowledge listener follow without Googling? Are all terms defined on first mention?
Step 5: Evaluate Story ${targetStoryId} (${targetSegmentId}) — **FORWARD_CLOSE**. Does it end with "what to watch" or "what happens next"?
Step 6: Evaluate Story ${targetStoryId} (${targetSegmentId}) — **SOURCE_ATTRIBUTION**. Are specific sources cited by name in the text?
Step 7: Evaluate Story ${targetStoryId} (${targetSegmentId}) — **GEOGRAPHY**. ${geographyLabel}.`;

  return `## ROLE
You are a senior podcast editor performing a focused topic audit. You evaluate ONLY the single topic segment provided below. You do NOT check transitions to other segments or bias consistency across the script — those are handled by the Full Script Editor.

${formatSessionContextForLLM(config)}

## SEGMENT TO AUDIT (Iteration ${iteration})

${isEditorial ? 'Editorial Segment' : `Story ${targetStoryId} (${targetSegmentId}, topic: ${topicName})`}

\`\`\`
${segmentContent}
\`\`\`

## EVALUATION SEQUENCE — FOLLOW THESE STEPS IN EXACT ORDER

**CRITICAL: Work through each step sequentially. Do not skip steps. Record your PASS/FAIL verdict for each step as you go, then move to the next.**

${evaluationSteps}

Step ${isEditorial ? 7 : 8}: Tally results and apply ROUTING RULES.

## ROUTING RULES

You have exactly TWO possible outcomes. No third option. No escape hatch.

**APPROVED** — Use ONLY when:
- Every rule evaluated has 0 FAILs.

→ Set: approval_status: "APPROVED", has_feedback: false, rewrite_scope: "", failed_segments: []

**REJECTED** — Use when ANY of the following is true:
- One or more rules have ≥1 FAIL.

→ Set: approval_status: "REJECTED", has_feedback: true, rewrite_scope: "SEGMENTS", failed_segments: [${targetStoryId}]

Step ${isEditorial ? 8 : 9}: Build the JSON output.

## JSON OUTPUT FORMAT

Produce EXACTLY one JSON object. No markdown, no extra text.

\`\`\`json
{
  "approval_status": "APPROVED" | "REJECTED",
  "has_feedback": true | false,
  "rewrite_scope": "" | "SEGMENTS",
  "failed_segments": [${targetStoryId}],
  "stories": [
${editorialRules}
  ],
  "rewriter_instructions": "Specific, actionable fixes. Or: 'All requirements passed. No changes needed.'"
}
\`\`\`

## CRITICAL RULES

- "has_feedback" MUST match approval_status exactly: "APPROVED" → false, "REJECTED" → true. No exceptions.
- Include "rejection_reason" for EVERY FAIL rule. Be specific: quote the problematic text, explain why it fails, and say exactly what to change.
- "rewriter_instructions" is your catch-all for any feedback that does NOT fit the specific rules above. It must be actionable enough that a writer can fix the draft without re-reading the criteria.
- If all rules pass and you have no extra observations, set rewriter_instructions to "All requirements passed. No changes needed."
`;
}
