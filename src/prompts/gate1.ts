import type { SessionConfig } from '../lib/sessionConfig';
import { formatSessionContextForLLM } from '../lib/sessionConfig';
import {
  THEME_COMPLETENESS_REQUIREMENTS,
  EDITOR_COMPLETENESS_AUDIT,
  COHERENCE_REQUIREMENTS,
  BIAS_VERIFICATION_CHECKLIST,
} from './shared/completenessRequirements';

function replacePlaceholders(template: string, config: SessionConfig): string {
  return template
    .replace(/\[COUNTRY_NAME\]/g, config.geography.country.name)
    .replace(/\[CONTINENT_NAME\]/g, config.geography.continent.name)
    .replace(/\[COUNTRY_LANGUAGE\]/g, config.geography.country.language)
    .replace(/\[BIAS_LABEL\]/g, config.editorial.biasLabel);
}

export function buildGate1Prompt(
  config: SessionConfig,
  draft: string
): string {
  const completenessReqs = replacePlaceholders(THEME_COMPLETENESS_REQUIREMENTS, config);
  const editorAudit = replacePlaceholders(EDITOR_COMPLETENESS_AUDIT, config);
  const coherenceReqs = replacePlaceholders(COHERENCE_REQUIREMENTS, config);
  const biasChecklist = replacePlaceholders(BIAS_VERIFICATION_CHECKLIST, config);
  const topicList = config.content.topics.join(', ');
  const hasEditorialSegment = config.editorial.includeSegment;

  const editorialSegmentAudit = hasEditorialSegment
    ? `**EDITORIAL SEGMENT AUDIT — MANDATORY:**

The user selected "Include Editorial Segment". The draft MUST contain an Editorial Segment.

- **REJECT IF NO EDITORIAL SEGMENT**: The segment must exist in the script.
- **REJECT IF WRONG PLACEMENT**: Must appear AFTER the ${config.geography.continent.name} News block and BEFORE the sign-off.
- **REJECT IF UNDER 2500 CHARS**: The editorial segment must be at least 2500 characters.
- **REJECT IF BIAS NOT PROMINENT**: The editorial segment must apply ${config.editorial.biasLabel} perspective MORE prominently than the news themes. Higher intensity required.
- **REJECT IF NO CROSS-BLOCK ANALYSIS**: Must analyze and connect themes from BOTH ${config.geography.country.name} and ${config.geography.continent.name} blocks.
- **REJECT IF NO CLOSURE**: Must provide closure and wrap up the podcast.`
    : `**NO EDITORIAL SEGMENT — MANDATORY:**

The user did NOT select "Include Editorial Segment". The draft MUST NOT contain an Editorial Segment.

- **REJECT IF EDITORIAL SEGMENT PRESENT**: The script should go directly from ${config.geography.continent.name} News block to sign-off with no editorial segment.`;

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

  const editorialStoryCount = hasEditorialSegment ? '7' : '6';
  const editorialTaskBlock = hasEditorialSegment
    ? `Evaluate EACH of the 6 themes independently, then evaluate the Editorial Segment (story_id 7), then evaluate cross-theme coherence and bias consistency.`
    : `Evaluate EACH of the 6 themes independently, then verify NO Editorial Segment exists, then evaluate cross-theme coherence and bias consistency.`;

  return `## ROLE
You are a senior podcast editor performing a Phase 1 editorial audit. You evaluate first-draft scripts against strict quality criteria. You are thorough, specific, and actionable in your feedback.

${formatSessionContextForLLM(config)}

## DRAFT TO AUDIT

The following first-draft script contains 6 theme summaries based on these topics: ${topicList}.

Themes 1-3 are LOCAL (${config.geography.country.name}) news.
Themes 4-6 are ${config.geography.continent.name} continent news.
${hasEditorialSegment ? 'Story 7 is the EDITORIAL SEGMENT.' : 'NO Editorial Segment should be present.'}

\`\`\`
${draft}
\`\`\`

## AUDIT CRITERIA

${completenessReqs}

${editorAudit}

${coherenceReqs}

${biasChecklist}

${editorialSegmentAudit}

## YOUR TASK

${editorialTaskBlock}

For EACH theme (1-6), check:
1. MINIMUM_LENGTH — Is the theme ≥2000 characters?
2. MULTIPLE_DEVELOPMENTS — Does it cover ≥3 distinct angles/events?
3. SENTENCE_LENGTH — Are 60%+ of sentences 15-30 words? Is average >15 words?
4. INTERNATIONAL_CONTEXT — Would a listener from another continent understand without Googling?
5. DEFINED_TERMS — Are ALL local terms, acronyms, and organizations defined on first mention?
6. FORWARD_LOOKING_CLOSE — Does it end with "what to watch" or "what happens next"?
7. SOURCE_ATTRIBUTION — Are sources cited by name within the theme text?
8. GEOGRAPHY_CORRECTNESS — Local themes only cover ${config.geography.country.name}; continent themes only cover ${config.geography.continent.name} countries.

${hasEditorialSegment ? `For the EDITORIAL SEGMENT (story_id 7), check:
9. EDITORIAL_SEGMENT_PRESENT — Does the segment exist?
10. EDITORIAL_SEGMENT_PLACEMENT — Is it after the continent block and before sign-off?
11. EDITORIAL_SEGMENT_LENGTH — Is it ≥2500 characters?
12. EDITORIAL_SEGMENT_BIAS_INTENSITY — Is ${config.editorial.biasLabel} perspective applied MORE prominently than in news themes?
13. EDITORIAL_SEGMENT_ANALYSIS — Does it analyze themes from BOTH ${config.geography.country.name} and ${config.geography.continent.name}?
14. EDITORIAL_SEGMENT_CLOSURE — Does it provide closure and wrap up the podcast?` : `9. NO_EDITORIAL_SEGMENT — Confirm there is NO editorial segment between the continent block and sign-off.`}

Then check cross-theme:
15. TRANSITIONS — Does each theme (after the first) open with a bridge to the previous?
16. PROGRESSION — Logical flow from Local Topic 1 → 2 → 3 → Continent Topic 1 → 2 → 3?
17. CROSS_REFERENCES — At least one explicit reference between themes?
18. TONE_CONSISTENCY — Same register and assumptions across all themes?
19. BIAS_CONSISTENCY — Does the entire script maintain ${config.editorial.biasLabel} perspective?

## STREAM YOUR REASONING

As you evaluate, stream your thinking in real time:
- "Checking Theme 1 (${config.content.topics[0] || 'Local'}) length... 2,340 chars. PASS."
- "Checking Theme 1 developments... 4 distinct angles. PASS."
- etc.

Be specific about word counts, character counts, and which terms are undefined.

## OUTPUT FORMAT

After your reasoning, produce EXACTLY one JSON object (no markdown, no extra text):

\`\`\`json
{
  "approval_status": "APPROVED" | "REJECTED",
  "has_feedback": true | false,
  "stories": [
    {
      "story_id": 1,
      "rules": [
        { "rule_name": "MINIMUM_LENGTH", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "MULTIPLE_DEVELOPMENTS", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "SENTENCE_LENGTH", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "INTERNATIONAL_CONTEXT", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "DEFINED_TERMS", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "FORWARD_LOOKING_CLOSE", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "SOURCE_ATTRIBUTION", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "GEOGRAPHY_CORRECTNESS", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." }
      ]
    },
    { "story_id": 2, "rules": [...] },
    { "story_id": 3, "rules": [...] },
    { "story_id": 4, "rules": [...] },
    { "story_id": 5, "rules": [...] },
    { "story_id": 6, "rules": [...] }${editorialStoryBlock}
  ],
  "rewriter_instructions": "If rejected or has_feedback: specific, actionable fixes per theme. If approved with no feedback: 'All requirements passed. No changes needed.'"
}
\`\`\`

## CRITICAL RULES

- Set "has_feedback": true if you have ANY observations, suggestions, or required changes — even minor ones.
- Set "has_feedback": false ONLY if the draft is perfect and needs absolutely zero changes.
- If approval_status is "REJECTED", has_feedback MUST be true.
- If approval_status is "APPROVED" but you have minor suggestions, set has_feedback: true.
- Include "rejection_reason" for EVERY FAIL rule. Be specific: quote the problematic text, explain why it fails, and say exactly what to change.
- "rewriter_instructions" must be actionable enough that a writer can fix the draft without re-reading the criteria.
- There must be exactly ${editorialStoryCount} stories in the output (6 themes${hasEditorialSegment ? ' + 1 editorial segment' : ''}).
`;
}
