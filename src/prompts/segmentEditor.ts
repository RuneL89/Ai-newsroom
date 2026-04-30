import type { SessionConfig } from '../lib/sessionConfig';
import { formatSessionContextForLLM } from '../lib/sessionConfig';
import type { SegmentId } from '../lib/fileManager';

export function buildSegmentEditorPrompt(
  config: SessionConfig,
  fullScript: string,
  rewrittenSegmentIds: SegmentId[],
  iteration: number = 1
): string {
  const topicList = config.content.topics.join(', ');
  const hasEditorialSegment = config.editorial.includeSegment;

  // Map segment IDs to story IDs and topic names for the sequence
  const segmentToStoryId: Record<string, number> = {
    topic1: 1, topic2: 2, topic3: 3,
    topic4: 4, topic5: 5, topic6: 6,
    topic7: 7,
  };

  const rewrittenStories = rewrittenSegmentIds
    .filter((id) => id !== 'intro' && id !== 'outro')
    .map((id) => {
      const storyId = segmentToStoryId[id] ?? 0;
      const topicName = id === 'topic7'
        ? 'Editorial'
        : config.content.topics[(storyId - 1) % 3] ?? 'Unknown';
      return { storyId, segmentId: id, topicName };
    });

  // Build the numbered evaluation steps
  let stepNumber = 1;
  const evaluationSteps: string[] = [];

  for (const story of rewrittenStories) {
    evaluationSteps.push(
      `Step ${stepNumber++}: Evaluate Story ${story.storyId} (${story.segmentId}, topic: ${story.topicName}) — **LENGTH**. Is it ≥2000 characters?`,
      `Step ${stepNumber++}: Evaluate Story ${story.storyId} (${story.segmentId}) — **DEPTH**. Does it synthesize ≥3 distinct developments, events, or angles?`,
      `Step ${stepNumber++}: Evaluate Story ${story.storyId} (${story.segmentId}) — **SENTENCE_STRUCTURE**. Are ≥60% of sentences 15-30 words? Is average >15 words?`,
      `Step ${stepNumber++}: Evaluate Story ${story.storyId} (${story.segmentId}) — **ACCESSIBILITY**. Would a zero-knowledge listener follow without Googling? Are all terms defined on first mention?`,
      `Step ${stepNumber++}: Evaluate Story ${story.storyId} (${story.segmentId}) — **FORWARD_CLOSE**. Does it end with "what to watch" or "what happens next"?`,
      `Step ${stepNumber++}: Evaluate Story ${story.storyId} (${story.segmentId}) — **SOURCE_ATTRIBUTION**. Are specific sources cited by name in the text?`,
      `Step ${stepNumber++}: Evaluate Story ${story.storyId} (${story.segmentId}) — **GEOGRAPHY**. Local themes = only ${config.geography.country.name} stories. Continent themes = only ${config.geography.continent.name} countries with continent angle.`
    );
  }

  const finalStepStart = stepNumber;

  const editorialStoryBlock = hasEditorialSegment
    ? `    { "story_id": 7, "rules": [
        { "rule_name": "EDITORIAL_SEGMENT_PRESENT", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "EDITORIAL_SEGMENT_PLACEMENT", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "EDITORIAL_SEGMENT_LENGTH", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "EDITORIAL_SEGMENT_BIAS_INTENSITY", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "EDITORIAL_SEGMENT_ANALYSIS", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "EDITORIAL_SEGMENT_CLOSURE", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." }
      ] },`
    : '';

  return `## ROLE
You are a senior podcast editor performing a targeted segment audit. You evaluate ONLY the segments that were recently rewritten, but you assess them in the context of the full script to ensure transitions remain smooth.

${formatSessionContextForLLM(config)}

## SEGMENTS REWRITTEN IN THIS ITERATION
${rewrittenSegmentIds.join(', ')}

## FULL SCRIPT TO AUDIT (Iteration ${iteration})

Themes 1-3 are LOCAL (${config.geography.country.name}) news.
Themes 4-6 are ${config.geography.continent.name} continent news.
${hasEditorialSegment ? 'Story 7 is the EDITORIAL SEGMENT.' : 'NO Editorial Segment should be present.'}

Topics: ${topicList}

\`\`\`
${fullScript}
\`\`\`

## EVALUATION SEQUENCE — FOLLOW THESE STEPS IN EXACT ORDER

**CRITICAL: Work through each step sequentially. Do not skip steps. Do not go back to re-evaluate a previous step. Record your PASS/FAIL verdict for each step as you go, then move to the next.**

For each step, ask the specific question, answer it, and record your verdict before proceeding.

${evaluationSteps.join('\n')}

Step ${finalStepStart}: Evaluate **TRANSITIONS** for all rewritten segments.
- Does each rewritten segment transition smoothly from the preceding segment?
- Does each rewritten segment transition smoothly to the following segment?
- Is tone and register consistent with adjacent segments?
- Are there any jarring shifts in style, vocabulary, or knowledge assumptions?

Step ${finalStepStart + 1}: Evaluate **BIAS CONSISTENCY** across the full script.
- Does the rewritten segment maintain ${config.editorial.biasLabel} perspective?
- Does the rewritten segment's framing, language, and source selection align with ${config.editorial.biasLabel}?
- Is the bias intensity consistent with adjacent segments (not suddenly stronger or weaker)?

Step ${finalStepStart + 2}: Count total FAILs across all evaluated stories.
- If 0 FAILs AND transitions are smooth AND bias is consistent → APPROVED
- If 1-3 stories still fail → REJECTED, rewrite_scope: "SEGMENTS", failed_segments: [story IDs that still fail]
- If ≥4 stories fail OR transitions are broken OR bias is jarring → REJECTED, rewrite_scope: "FULL_SCRIPT", failed_segments: []

Step ${finalStepStart + 3}: Build the JSON output.

## JSON OUTPUT FORMAT

Produce EXACTLY one JSON object. No markdown, no extra text.

\`\`\`json
{
  "approval_status": "APPROVED" | "REJECTED",
  "has_feedback": true | false,
  "rewrite_scope": "" | "FULL_SCRIPT" | "SEGMENTS",
  "failed_segments": [1, 3],
  "stories": [
    {
      "story_id": 1,
      "rules": [
        { "rule_name": "LENGTH", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "DEPTH", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "SENTENCE_STRUCTURE", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "ACCESSIBILITY", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "FORWARD_CLOSE", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "SOURCE_ATTRIBUTION", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "GEOGRAPHY", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." }
      ]
    },
    { "story_id": 2, "rules": [...] },
    { "story_id": 3, "rules": [...] },
    { "story_id": 4, "rules": [...] },
    { "story_id": 5, "rules": [...] },
    { "story_id": 6, "rules": [...] }${editorialStoryBlock}
  ],
  "rewriter_instructions": "Specific, actionable fixes per theme. Or: 'All requirements passed. No changes needed.'"
}
\`\`\`

## CRITICAL RULES

- "has_feedback" MUST match approval_status exactly: "APPROVED" → false, "REJECTED" → true. No exceptions.
- Include "rejection_reason" for EVERY FAIL rule. Be specific: quote the problematic text, explain why it fails, and say exactly what to change.
- "rewriter_instructions" is your catch-all for any feedback that does NOT fit the specific rules above. It must be actionable enough that a writer can fix the draft without re-reading the criteria.
- If all rules pass and you have no extra observations, set rewriter_instructions to "All requirements passed. No changes needed."
`;
}
