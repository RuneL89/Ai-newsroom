import type { AgentFn } from '../../lib/pipelineTypes';
import type { StubConfig } from './stubConfig';

export const createGate2Stub = (config: StubConfig): AgentFn => {
  return async (ctx, onReasoningChunk) => {
    const reasoningSteps = [
      'Beginning fact-check verification...',
      `Extracting factual claims from ${ctx.sessionConfig.geography.country.name} themes...`,
      'Cross-referencing against local priority sources...',
      `Extracting factual claims from ${ctx.sessionConfig.geography.continent.name} themes...`,
      'Cross-referencing against continental priority sources...',
      'Verifying source alignment with configured news sources...',
      'Verifying dates fall within coverage window...',
      'Compiling verification report...',
    ];

    let reasoning = '';
    for (const step of reasoningSteps) {
      await new Promise((r) => setTimeout(r, (config.delayMs || 800) / reasoningSteps.length));
      reasoning += step + '\n';
      onReasoningChunk(step + '\n');
    }

    const decision = config.gate2Decision || 'PASS';
    const countrySources = ctx.sessionConfig.geography.country.newsSources;
    const continentSources = ctx.sessionConfig.geography.continent.newsSources.map(s => s.name);

    const metadata = {
      check_date: ctx.sessionConfig.dates.today,
      coverage_period: `${ctx.sessionConfig.dates.earliestDate} to ${ctx.sessionConfig.dates.today}`,
      script_phase: 'Phase 2 COMPLETE',
      overall_status: decision,
      source_verification: {
        priority_local_sources: countrySources,
        priority_continent_sources: continentSources,
        verified_against_priority: decision === 'PASS',
      },
      themes: [
        {
          theme_id: 1,
          section: `${ctx.sessionConfig.geography.country.name} Local`,
          topic: ctx.sessionConfig.content.topics[0] || 'General News',
          original_language: ctx.sessionConfig.geography.country.language,
          grade: decision === 'PASS' ? 'FACT_CHECKED_FULLY_CORRECT' : 'FACT_CHECK_FAILED',
          verified_sources: countrySources.slice(0, 2),
          source_languages: [ctx.sessionConfig.geography.country.language, 'English'],
          source_dates: [ctx.sessionConfig.dates.today],
          unverified_claims: decision === 'PASS' ? [] : ['Specific claim not found in priority sources'],
          researcher_action: decision === 'PASS' ? 'NONE' : 'REPLACE_SOURCE',
          notes: `All core facts verified against priority sources for ${ctx.sessionConfig.geography.country.name}.`,
        },
      ],
    };

    return { draft: ctx.currentDraft, reasoning, metadata };
  };
};
