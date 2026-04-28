import { useState } from 'react';
import { cn } from '../../lib/utils';
import type { StageRecord } from '../../lib/pipelineTypes';
import { FileText, Zap, ScrollText, Clock, ExternalLink, FileCheck } from 'lucide-react';

interface Agent1Metadata {
  firstDraft?: string;
  selectionReport?: string;
  localArticlesFound?: number;
  continentArticlesFound?: number;
  topicGroups?: Array<{
    topic: string;
    localCount: number;
    continentCount: number;
    localArticles: Array<{ title: string; source: string; url: string }>;
    continentArticles: Array<{ title: string; source: string; url: string }>;
  }>;
  sourcesUsed?: string[];
  fallbackUsed?: boolean;
}

interface StageDetailProps {
  stage: StageRecord | null;
}

type TabId = 'articles' | 'stream' | 'output' | 'prompt';

export default function StageDetail({ stage }: StageDetailProps) {
  const [activeTab, setActiveTab] = useState<TabId>('stream');

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

  const isAgent1 = stage.id === 'agent1';
  const metadata = stage.metadata as Agent1Metadata | undefined;

  const tabs: { id: TabId; label: string; icon: React.ElementType; show: boolean }[] = [
    { id: 'articles', label: 'Articles', icon: FileText, show: isAgent1 },
    { id: 'stream', label: 'Stream', icon: Zap, show: true },
    { id: 'output', label: 'Agent Output', icon: FileCheck, show: isAgent1 },
    { id: 'prompt', label: 'Prompt', icon: ScrollText, show: !!stage.prompt },
  ];

  const visibleTabs = tabs.filter((t) => t.show);

  // If current tab is hidden, switch to first visible
  const effectiveTab = visibleTabs.find((t) => t.id === activeTab) ? activeTab : visibleTabs[0]?.id ?? 'stream';

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

      {/* Tab Bar */}
      <div className="flex border-b border-slate-700">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = effectiveTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-slate-800 text-white border-b-2 border-blue-500'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="max-h-[500px] overflow-auto">
        {effectiveTab === 'articles' && <ArticlesTab metadata={metadata} />}
        {effectiveTab === 'stream' && <StreamTab stage={stage} />}
        {effectiveTab === 'output' && <OutputTab stage={stage} metadata={metadata} />}
        {effectiveTab === 'prompt' && <PromptTab prompt={stage.prompt ?? ''} />}
      </div>
    </div>
  );
}

function ArticlesTab({ metadata }: { metadata: Agent1Metadata | undefined }) {
  if (!metadata?.topicGroups || metadata.topicGroups.length === 0) {
    return (
      <div className="p-4 text-sm text-slate-500 text-center">
        No articles found yet.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {metadata.topicGroups.map((group, idx) => (
        <div key={idx} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-300 uppercase tracking-wide">
              Topic {idx + 1}: {group.topic}
            </span>
            <span className="text-[10px] text-slate-500">
              {group.localCount} local / {group.continentCount} continent
            </span>
          </div>

          {group.localArticles.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-medium text-slate-400 uppercase">Local Articles</span>
              {group.localArticles.map((article, i) => (
                <ArticleRow key={`l-${i}`} article={article} />
              ))}
            </div>
          )}

          {group.continentArticles.length > 0 && (
            <div className="space-y-1 pt-1">
              <span className="text-[10px] font-medium text-slate-400 uppercase">Continent Articles</span>
              {group.continentArticles.map((article, i) => (
                <ArticleRow key={`c-${i}`} article={article} />
              ))}
            </div>
          )}

          {idx < (metadata?.topicGroups?.length ?? 0) - 1 && <hr className="border-slate-700/50" />}
        </div>
      ))}
    </div>
  );
}

function ArticleRow({ article }: { article: { title: string; source: string; url: string } }) {
  return (
    <div className="flex items-start gap-2 px-2 py-1.5 rounded bg-slate-800/50 hover:bg-slate-800 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-200 truncate" title={article.title}>
          {article.title}
        </div>
        <div className="text-[10px] text-slate-500">{article.source}</div>
      </div>
      {article.url && (
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 text-slate-500 hover:text-blue-400 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

function StreamTab({ stage }: { stage: StageRecord }) {
  const hasReasoning = stage.reasoning && stage.reasoning.length > 0;
  const hasOutput = stage.output && stage.output.length > 0;

  return (
    <div className="p-4 space-y-4">
      {/* Real-time stream */}
      {hasReasoning && (
        <div className="space-y-1">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Live Stream</span>
          <pre className="text-xs text-purple-300/90 whitespace-pre-wrap font-sans bg-slate-950/30 rounded p-3 border border-slate-700/50 min-h-[80px]">
            {stage.reasoning}
            {stage.status === 'running' && (
              <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-0.5 align-middle" />
            )}
          </pre>
        </div>
      )}

      {/* Final output */}
      {hasOutput && stage.status !== 'running' && (
        <div className="space-y-1">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Final Output</span>
          <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans bg-slate-950/30 rounded p-3 border border-slate-700/50 max-h-[300px] overflow-auto">
            {stage.output}
          </pre>
        </div>
      )}

      {!hasReasoning && !hasOutput && (
        <div className="text-sm text-slate-500 text-center py-8">
          {stage.status === 'pending'
            ? 'Waiting to start...'
            : stage.status === 'running'
            ? 'Starting stream...'
            : 'No stream data available.'}
        </div>
      )}
    </div>
  );
}

function PromptTab({ prompt }: { prompt: string }) {
  return (
    <div className="p-4">
      <pre className="text-xs text-blue-300/90 whitespace-pre-wrap font-sans bg-slate-950/30 rounded p-3 border border-slate-700/50 max-h-[450px] overflow-auto">
        {prompt}
      </pre>
    </div>
  );
}

function OutputTab({ stage, metadata }: { stage: StageRecord; metadata: Agent1Metadata | undefined }) {
  if (stage.status === 'running') {
    return (
      <div className="p-4 text-sm text-slate-500 text-center">
        Draft generation in progress...
      </div>
    );
  }

  if (!metadata?.firstDraft) {
    return (
      <div className="p-4 text-sm text-slate-500 text-center">
        No draft output yet.
      </div>
    );
  }

  return (
    <div className="p-4">
      <pre className="text-xs text-slate-200 whitespace-pre-wrap font-sans bg-slate-950/30 rounded p-3 border border-slate-700/50 max-h-[450px] overflow-auto leading-relaxed">
        {metadata.firstDraft}
      </pre>
    </div>
  );
}
