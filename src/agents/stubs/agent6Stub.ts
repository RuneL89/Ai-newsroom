import type { AgentFn } from '../../lib/pipelineTypes';

export const createAgent6Stub = (delayMs: number = 800): AgentFn => {
  return async (ctx, onReasoningChunk) => {
    const voice = ctx.sessionConfig.content.voice;
    const music = ctx.sessionConfig.content.musicSuite;

    const reasoningSteps = [
      'Audio Producer activated. Loading final approved script...',
      `Voice selected: ${voice.label} (ID: ${voice.id})`,
      music ? `Music suite loaded: Intro=${music.intro}, Outro=${music.outro}` : 'No music suite configured',
      'STEP 1: Planning 13 narration segments...',
      '  - Opening narration',
      '  - Headlines summary',
      '  - 5 country story narrations',
      '  - 3 continent story narrations',
      '  - 2 transition narrations',
      '  - Sign-off narration',
      'STEP 2: Generating narration files with TTS...',
      '  [05_opening.mp3] ✓',
      '  [06_headlines.mp3] ✓',
      '  [07a_country_1.mp3] ✓',
      '  [07b_country_2.mp3] ✓',
      '  [07c_country_3.mp3] ✓',
      '  [07d_country_4.mp3] ✓',
      '  [07e_country_5.mp3] ✓',
      '  [08a_continent_1.mp3] ✓',
      '  [08b_continent_2.mp3] ✓',
      '  [08c_continent_3.mp3] ✓',
      '  [09a_transition_1.mp3] ✓',
      '  [09b_transition_2.mp3] ✓',
      '  [10_signoff.mp3] ✓',
      'STEP 3: Loading music stings and assembly track...',
      `  Intro music: ${music?.intro || 'default'}`,
      `  Outro music: ${music?.outro || 'default'}`,
      `  Story sting: ${music?.storySting || 'default'}`,
      `  Block sting: ${music?.blockSting || 'default'}`,
      'STEP 4: Assembling final MP3 with pydub...',
      '  Rule enforced: MUSIC AND NARRATION NEVER OVERLAP',
      '  Adding 0.5s silence padding...',
      `  Exporting: ${ctx.sessionConfig.geography.country.name}_${ctx.sessionConfig.dates.timeframeLabel}_${ctx.sessionConfig.dates.today}.mp3`,
      'Audio production complete.',
    ];

    let reasoning = '';
    for (const step of reasoningSteps) {
      await new Promise((r) => setTimeout(r, delayMs / reasoningSteps.length));
      reasoning += step + '\n';
      onReasoningChunk(step + '\n');
    }

    const draft = `## AUDIO PRODUCTION COMPLETE

Final MP3: ${ctx.sessionConfig.geography.country.name}_${ctx.sessionConfig.dates.timeframeLabel}_${ctx.sessionConfig.dates.today}.mp3
Bitrate: 320kbps
Format: Single combined MP3 (no separate files)

### Segments Assembled (${music ? '26' : '13'} tracks)
- Intro Music + Opening Narration
- Block Sting + Headlines Narration
- 5× (Story Sting + Country Story Narration)
- Block Sting + Transition 1
- 3× (Story Sting + Continent Story Narration)
- Block Sting + Transition 2
- Outro Music + Sign-off Narration

### Voice
${voice.label} (${voice.gender}, ${voice.accent})

${music ? `### Music Suite
- Intro: ${music.intro}
- Outro: ${music.outro}
- Story Sting: ${music.storySting}
- Block Sting: ${music.blockSting}` : '### Music Suite: None configured'}

### Critical Rule Enforced
Music and narration NEVER overlap. All segments play sequentially.
`;

    return { draft, reasoning };
  };
};
