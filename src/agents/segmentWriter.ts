import type { AgentFn } from '../lib/pipelineTypes';
import { loadApiConfig, streamLLM } from '../lib/apiConfig';
import { buildSegmentWriterPrompt } from '../prompts/segmentWriter';
import { writeSegment, writeFullScript, readAllSegments, type SegmentId } from '../lib/fileManager';
import { parseFullScript, assembleFullScript, type Segment } from '../lib/scriptParser';

const INDEX_TO_SEGMENT: SegmentId[] = [
  'topic1', 'topic2', 'topic3',
  'topic4', 'topic5', 'topic6', 'topic7',
];

const ALL_SEGMENT_IDS: SegmentId[] = [
  'intro', 'topic1', 'topic2', 'topic3', 'topic4', 'topic5', 'topic6', 'topic7', 'outro',
];

export function createSegmentWriter(): AgentFn {
  return async (ctx, onReasoningChunk) => {
    const { sessionConfig, segmentLoopIndex, feedback } = ctx;

    if (segmentLoopIndex < 0 || segmentLoopIndex >= INDEX_TO_SEGMENT.length) {
      throw new Error(`Segment Writer received invalid segmentLoopIndex: ${segmentLoopIndex}`);
    }

    const targetSegmentId = INDEX_TO_SEGMENT[segmentLoopIndex];

    const rewriterInstructions =
      feedback && typeof feedback === 'object' && 'rewriter_instructions' in feedback
        ? String((feedback as Record<string, unknown>).rewriter_instructions)
        : 'Fix the identified issues in the target segment.';

    // Read all segments for context
    onReasoningChunk(`Reading segment files for context...\n`);
    const allSegments = await readAllSegments();

    // Build context: target segment + adjacent segments for transitions
    const contextSegments: Record<SegmentId, string> = {} as Record<SegmentId, string>;
    contextSegments[targetSegmentId] = allSegments[targetSegmentId];

    const idx = ALL_SEGMENT_IDS.indexOf(targetSegmentId);
    if (idx > 0) {
      const prevId = ALL_SEGMENT_IDS[idx - 1];
      contextSegments[prevId] = allSegments[prevId];
    }
    if (idx < ALL_SEGMENT_IDS.length - 1) {
      const nextId = ALL_SEGMENT_IDS[idx + 1];
      contextSegments[nextId] = allSegments[nextId];
    }

    // Build prompt
    onReasoningChunk(`Building segment rewrite prompt for ${targetSegmentId}...\n`);
    const prompt = buildSegmentWriterPrompt(
      sessionConfig,
      contextSegments,
      targetSegmentId,
      rewriterInstructions,
      ctx.iteration
    );

    // Stream to LLM
    onReasoningChunk(`Sending ${targetSegmentId} to Segment Writer for targeted rewrite...\n\n`);

    let response = '';
    let reasoning = '';
    const apiConfig = await loadApiConfig();

    const { diagnostics } = await streamLLM(apiConfig, prompt, {
      onReasoningChunk: (chunk) => {
        reasoning += chunk;
        onReasoningChunk(chunk);
      },
      onContentChunk: (chunk) => {
        response += chunk;
        onReasoningChunk(chunk);
      },
      onError: (err) => {
        throw err;
      },
      onDone: () => {
        onReasoningChunk('\nSegment rewrite complete.\n');
      },
    });

    // Parse rewritten segments from response
    onReasoningChunk('Parsing rewritten segment...\n');
    const rewrittenSegments = parseFullScript(response);

    // Write only the rewritten segment back to files
    for (const seg of rewrittenSegments) {
      if (seg.id === targetSegmentId) {
        await writeSegment(seg.id, seg.content);
        onReasoningChunk(`Updated ${seg.id}.txt (${seg.content.length} chars)\n`);
      }
    }

    // Read all segments (including unchanged ones) and assemble full script
    const updatedSegments = await readAllSegments();
    const segments: Segment[] = [
      { id: 'intro', content: updatedSegments.intro },
      { id: 'topic1', topic: sessionConfig.content.topics[0], content: updatedSegments.topic1 },
      { id: 'topic2', topic: sessionConfig.content.topics[1], content: updatedSegments.topic2 },
      { id: 'topic3', topic: sessionConfig.content.topics[2], content: updatedSegments.topic3 },
      { id: 'topic4', topic: sessionConfig.content.topics[0], content: updatedSegments.topic4 },
      { id: 'topic5', topic: sessionConfig.content.topics[1], content: updatedSegments.topic5 },
      { id: 'topic6', topic: sessionConfig.content.topics[2], content: updatedSegments.topic6 },
    ];
    if (sessionConfig.editorial.includeSegment) {
      segments.push({ id: 'topic7', topic: 'Editorial', content: updatedSegments.topic7 });
    }
    segments.push({ id: 'outro', content: updatedSegments.outro });

    const fullScript = assembleFullScript(segments);
    await writeFullScript(fullScript);

    return {
      draft: fullScript,
      reasoning,
      prompt,
      metadata: {
        rewrittenSegmentId: targetSegmentId,
        streamDiagnostics: diagnostics,
      },
    };
  };
}
