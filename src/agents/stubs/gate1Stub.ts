import type { AgentFn } from '../../lib/pipelineTypes';
import type { StubConfig } from './stubConfig';

export const createGate1Stub = (config: StubConfig): AgentFn => {
  return async (ctx, onReasoningChunk) => {
    const reasoningSteps = [
      'Beginning Phase 1 editorial audit...',
      'Checking opening phrasing...',
      'Verifying music cue placements...',
      'Checking block structure and transitions...',
      'Validating continent country attribution...',
      'Checking oral readability and sentence length...',
      `Running completeness audit for ${ctx.sessionConfig.geography.country.name} stories...`,
      'All checks complete.',
    ];

    let reasoning = '';
    for (const step of reasoningSteps) {
      await new Promise((r) => setTimeout(r, (config.delayMs || 800) / reasoningSteps.length));
      reasoning += step + '\n';
      onReasoningChunk(step + '\n');
    }

    const decision = config.gate1Decision || 'APPROVE';

    const allRules: Array<{ rule_name: string; status: 'PASS' | 'FAIL'; details?: string; rejection_reason?: string }> = [
      { rule_name: 'MINIMUM_LENGTH', status: 'PASS', details: 'All stories ≥1500 chars' },
      { rule_name: 'SENTENCE_LENGTH', status: 'PASS', details: '60%+ sentences 15-30 words' },
      { rule_name: 'DEFINED_TERMS', status: 'PASS', details: 'All terms defined on first mention' },
      { rule_name: 'FIVE_WS', status: 'PASS', details: 'Who/What/When/Where/Why/How answered' },
      { rule_name: 'CONTINENT_ANGLE', status: 'PASS', details: 'Continent stories have angle' },
    ];

    // If rejecting, flip some rules to FAIL with rejection_reasons
    if (decision === 'REJECT') {
      allRules[0].status = 'FAIL';
      allRules[0].details = 'Story 2 is 980 characters';
      allRules[0].rejection_reason =
        'Story 2 is only 980 characters (minimum 1500). Expand with additional details, direct quotes, or historical background to reach the required length.';

      allRules[3].status = 'FAIL';
      allRules[3].details = 'Story 4 missing "How"';
      allRules[3].rejection_reason =
        'Story 4 explains who, what, when, where, and why, but does not explain HOW the event unfolded. Add a sentence describing the mechanism or process.';
    }

    const failReasons = allRules
      .filter((r) => r.status === 'FAIL')
      .map((r) => r.rejection_reason)
      .filter((r): r is string => !!r);

    const rewriterInstructions =
      decision === 'REJECT'
        ? `REJECTION FEEDBACK — apply these fixes:\n${failReasons.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
        : 'All requirements passed. No changes needed.';

    const metadata = {
      approval_status: decision,
      stories: [
        {
          story_id: 1,
          rules: allRules,
        },
      ],
      rewriter_instructions: rewriterInstructions,
    };

    return { draft: ctx.currentDraft, reasoning, metadata };
  };
};
