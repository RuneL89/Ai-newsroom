import type { AgentFn } from '../lib/pipelineTypes';
import { loadApiConfig, streamLLM } from '../lib/apiConfig';
import { buildSegmentEditorPrompt } from '../prompts/segmentEditor';
import { parseFullScriptEditorOutput } from './fullScriptEditorParse';
import { readSegment, type SegmentId } from '../lib/fileManager';

const INDEX_TO_SEGMENT: SegmentId[] = [
  'topic1', 'topic2', 'topic3',
  'topic4', 'topic5', 'topic6', 'topic7',
];

export function createSegmentEditor(): AgentFn {
  return async (ctx, onReasoningChunk) => {
    const { sessionConfig, segmentLoopIndex, currentDraft } = ctx;

    if (segmentLoopIndex < 0 || segmentLoopIndex >= INDEX_TO_SEGMENT.length) {
      throw new Error(`Segment Editor received invalid segmentLoopIndex: ${segmentLoopIndex}`);
    }

    const targetSegmentId = INDEX_TO_SEGMENT[segmentLoopIndex];
    const targetStoryId = segmentLoopIndex + 1;
    const topicName = targetSegmentId === 'topic7'
      ? 'Editorial'
      : sessionConfig.content.topics[segmentLoopIndex % 3] ?? 'Unknown';

    // Read the target segment from disk
    onReasoningChunk(`Reading segment ${targetSegmentId} for focused audit...\n`);
    const segmentContent = await readSegment(targetSegmentId);

    if (!segmentContent || segmentContent.trim().length === 0) {
      throw new Error(`Segment Editor found empty segment: ${targetSegmentId}`);
    }

    // Build prompt focused on single topic
    onReasoningChunk('Building segment audit prompt...\n');
    const prompt = buildSegmentEditorPrompt(
      sessionConfig,
      segmentContent,
      targetSegmentId,
      targetStoryId,
      topicName,
      ctx.iteration
    );

    // Stream to LLM
    onReasoningChunk(`Sending segment ${targetSegmentId} to Segment Editor for audit...\n\n`);

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
        onReasoningChunk('\nSegment audit complete. Parsing results...\n');
      },
    });

    // Parse audit result
    const auditResult = parseFullScriptEditorOutput(response);

    // Stream summary
    const statusLine = auditResult.approval_status === 'APPROVED'
      ? `✓ ${targetSegmentId} APPROVED${auditResult.has_feedback ? ' (with feedback)' : ' (clean pass)'}`
      : `✗ ${targetSegmentId} REJECTED`;
    onReasoningChunk(`\n${statusLine}\n`);

    if (auditResult.has_feedback && auditResult.rewriter_instructions) {
      onReasoningChunk(`\nFeedback:\n${auditResult.rewriter_instructions}\n`);
    }

    return {
      draft: currentDraft, // Editor does not rewrite — passes through unchanged
      reasoning,
      prompt,
      metadata: { ...auditResult, streamDiagnostics: diagnostics },
    };
  };
}
