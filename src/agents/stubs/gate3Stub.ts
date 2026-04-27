import type { AgentFn } from '../../lib/pipelineTypes';
import type { StubConfig } from './stubConfig';

export const createGate3Stub = (config: StubConfig): AgentFn => {
  return async (ctx, onReasoningChunk) => {
    const reasoningSteps = [
      'Beginning FINAL editorial audit...',
      'Running full completeness checklist...',
      'Verifying all 1500+ character minimums...',
      'Checking sentence length distribution...',
      'Confirming all terms defined for international audience...',
      'Validating 5 Ws + How in every story...',
      'Checking continent angle and country attribution...',
      'Verifying bias consistency throughout...',
      'Final approval decision...',
    ];

    let reasoning = '';
    for (const step of reasoningSteps) {
      await new Promise((r) => setTimeout(r, (config.delayMs || 800) / reasoningSteps.length));
      reasoning += step + '\n';
      onReasoningChunk(step + '\n');
    }

    const decision = config.gate3Decision || 'APPROVE';

    const allRules: Array<{ rule_name: string; status: 'PASS' | 'FAIL'; details?: string; rejection_reason?: string }> = [
      { rule_name: 'MINIMUM_LENGTH', status: 'PASS' },
      { rule_name: 'SENTENCE_LENGTH', status: 'PASS' },
      { rule_name: 'DEFINED_TERMS', status: 'PASS' },
      { rule_name: 'FIVE_WS', status: 'PASS' },
      { rule_name: 'CONTINENT_ANGLE', status: 'PASS' },
      { rule_name: 'BIAS_CONSISTENCY', status: 'PASS' },
    ];

    // If rejecting, flip some rules to FAIL with rejection_reasons
    if (decision === 'REJECT') {
      allRules[1].status = 'FAIL';
      allRules[1].rejection_reason =
        'Only 45% of sentences in Story 3 are 15-30 words (target: 60%+). Combine short sentences or break apart overly long ones to improve oral readability.';

      allRules[5].status = 'FAIL';
      allRules[5].rejection_reason =
        'The Editorial Segment reads neutral despite Moderate-Left bias being selected. Strengthen framing around policy impact on working families and add more activist voices.';
    }

    const failReasons = allRules
      .filter((r) => r.status === 'FAIL')
      .map((r) => r.rejection_reason)
      .filter((r): r is string => !!r);

    const rewriterInstructions =
      decision === 'REJECT'
        ? `FINAL REJECTION — apply these fixes before resubmitting:\n${failReasons.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
        : 'All requirements passed. Script approved for production.';

    const metadata = {
      approval_status: decision,
      stories: Array.from({ length: 8 }, (_, i) => ({
        story_id: i + 1,
        rules: allRules,
      })),
      rewriter_instructions: rewriterInstructions,
    };

    return { draft: ctx.currentDraft, reasoning, metadata };
  };
};
