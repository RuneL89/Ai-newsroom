import { useState } from 'react';
import { cn } from '../../lib/utils';
import type { StageRecord } from '../../lib/pipelineTypes';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';

interface Agent1Metadata {
  firstDraft?: string;
  selectionReport?: string;
  localArticlesFound?: number;
  continentArticlesFound?: number;
  topicGroups?: Array<{
    topic: string;
    localCount: number;
    continentCount: number;
  }>;
  sourcesUsed?: string[];
  fallbackUsed?: boolean;
}

interface StageDetailProps {
  stage: StageRecord | null;
}

export default function StageDetail({ stage }: StageDetailProps) {
  const [showReasoning, setShowReasoning] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showFirstDraft, setShowFirstDraft] = useState(true);
  const [showOutput, setShowOutput] = useState(true);

  if (!stage) {
    return (
      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-center text-slate-500 text-sm">
        Select a stage above to view details
      </div>
    );
  }

  const statusLabels = {
    pending: 'Pending',
    running: 'Running',
    completed: 'Completed',
    rejected: 'Rejected',
    error: 'Error',
  };

  const statusBgColors = {
    pending: 'bg-slate-800 text-slate-400',
    running: 'bg-blue-900/50 text-blue-300',
    completed: 'bg-green-900/50 text-green-300',
    rejected: 'bg-amber-900/50 text-amber-300',
    error: 'bg-red-900/50 text-red-300',
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{stage.name}</span>
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              statusBgColors[stage.status]
            )}
          >
            {statusLabels[stage.status]}
          </span>
          {stage.iteration > 1 && (
            <span className="text-xs text-slate-400">Loop #{stage.iteration}</span>
          )}
        </div>
        {stage.startedAt && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Clock className="w-3 h-3" />
            {new Date(stage.startedAt).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Reasoning Panel */}
      {!!stage.reasoning && (
        <div className="border-b border-slate-700">
          <button
            onClick={() => setShowReasoning((p) => !p)}
            className="w-full flex items-center justify-between px-4 py-2 bg-slate-800/50 hover:bg-slate-800 transition-colors"
          >
            <span className="text-xs font-medium text-purple-300">Reasoning</span>
            {showReasoning ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>
          {showReasoning && (
            <pre className="p-4 text-xs text-purple-300/80 overflow-auto max-h-[200px] whitespace-pre-wrap bg-slate-950/30">
              {stage.reasoning}
            </pre>
          )}
        </div>
      )}

      {/* Prompt Panel */}
      {!!stage.prompt && (
        <div className="border-b border-slate-700">
          <button
            onClick={() => setShowPrompt((p) => !p)}
            className="w-full flex items-center justify-between px-4 py-2 bg-slate-800/50 hover:bg-slate-800 transition-colors"
          >
            <span className="text-xs font-medium text-blue-300">Prompt</span>
            {showPrompt ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>
          {showPrompt && (
            <pre className="p-4 text-xs text-blue-300/80 overflow-auto max-h-[300px] whitespace-pre-wrap bg-slate-950/30">
              {stage.prompt}
            </pre>
          )}
        </div>
      )}

      {/* First Draft Panel (Agent 1 only) */}
      {stage.id === 'agent1' && !!stage.metadata && typeof stage.metadata === 'object' && (stage.metadata as Agent1Metadata).firstDraft && (
        <div className="border-b border-slate-700">
          <button
            onClick={() => setShowFirstDraft((p) => !p)}
            className="w-full flex items-center justify-between px-4 py-2 bg-slate-800/50 hover:bg-slate-800 transition-colors"
          >
            <span className="text-xs font-medium text-emerald-300">First Draft</span>
            {showFirstDraft ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>
          {showFirstDraft && (
            <pre className="p-4 text-xs text-emerald-300/80 overflow-auto max-h-[400px] whitespace-pre-wrap font-sans bg-slate-950/30">
              {(stage.metadata as Agent1Metadata).firstDraft}
            </pre>
          )}
        </div>
      )}

      {/* Output Panel */}
      {!!stage.output && (
        <div>
          <button
            onClick={() => setShowOutput((p) => !p)}
            className="w-full flex items-center justify-between px-4 py-2 bg-slate-800/50 hover:bg-slate-800 transition-colors"
          >
            <span className="text-xs font-medium text-slate-300">Output</span>
            {showOutput ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>
          {showOutput && (
            <pre className="p-4 text-xs text-slate-300 overflow-auto max-h-[300px] whitespace-pre-wrap font-sans">
              {stage.output}
            </pre>
          )}
        </div>
      )}

      {/* Audit Results (for Editor gates) */}
      {!!stage.metadata && (
        <div className="px-4 py-3 border-t border-slate-700 space-y-3">
          <AuditMetadata metadata={stage.metadata} />
        </div>
      )}

      {/* Empty state */}
      {!stage.reasoning && !stage.output && stage.status === 'pending' && (
        <div className="p-4 text-sm text-slate-500 text-center">
          Waiting to start...
        </div>
      )}
    </div>
  );
}

interface RuleItem {
  rule_name: string;
  status: 'PASS' | 'FAIL';
  details?: string;
  rejection_reason?: string;
}

interface StoryItem {
  story_id?: number;
  theme_id?: number;
  rules: RuleItem[];
}

interface AuditMeta {
  approval_status?: string;
  rewriter_instructions?: string;
  stories?: StoryItem[];
  themes?: StoryItem[];
}

function AuditMetadata({ metadata }: { metadata: unknown }) {
  if (!metadata || typeof metadata !== 'object') return null;
  const m = metadata as AuditMeta;

  const approvalStatus = m.approval_status;
  const rewriterInstructions = m.rewriter_instructions;
  const stories = m.stories;

  return (
    <div className="space-y-3">
      {/* Approval status */}
      {approvalStatus && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">Approval:</span>
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              approvalStatus === 'APPROVED'
                ? 'bg-green-900/50 text-green-300'
                : 'bg-amber-900/50 text-amber-300'
            )}
          >
            {approvalStatus}
          </span>
        </div>
      )}

      {/* Rule breakdown per story/theme */}
      {(stories ?? []).length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-slate-400">Audit Breakdown</span>
          {stories!.map((story) => {
            const rules = story.rules || [];
            const id = story.theme_id ?? story.story_id ?? 0;
            return (
              <div key={id} className="space-y-1">
                {rules.map((rule, idx) => {
                  const isFail = rule.status === 'FAIL';
                  const rejectionReason = rule.rejection_reason;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        'rounded px-2 py-1.5 text-[11px]',
                        isFail
                          ? 'bg-amber-900/20 border border-amber-500/20'
                          : 'bg-green-900/10 border border-green-500/10'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'font-medium',
                            isFail ? 'text-amber-300' : 'text-green-300'
                          )}
                        >
                          {rule.status === 'PASS' ? '✓' : '✗'} {rule.rule_name}
                        </span>
                        {rule.details && (
                          <span className="text-slate-500">— {rule.details}</span>
                        )}
                      </div>
                      {isFail && rejectionReason && (
                        <p className="mt-1 text-amber-200/80 leading-relaxed pl-4 border-l-2 border-amber-500/30">
                          {rejectionReason}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Rewriter instructions */}
      {rewriterInstructions && (
        <div className="bg-slate-800/50 rounded p-3 border border-slate-700">
          <span className="text-xs font-medium text-slate-400">Rewriter Instructions</span>
          <pre className="mt-1 text-[11px] text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
            {rewriterInstructions}
          </pre>
        </div>
      )}
    </div>
  );
}
