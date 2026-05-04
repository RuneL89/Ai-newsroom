import type { AgentFn } from '../lib/pipelineTypes';
import { loadApiConfig, callLLM } from '../lib/apiConfig';
import { searchTopicLocal, searchTopicContinent, type NewsArticle } from '../lib/newsSearch';
import { buildScoringPrompt, type ScoredArticle } from '../prompts/articleResearcher';
import { getTopicSearchTerm } from '../data/topics';
import { clearAllSegments, writeSelectedArticles, type SelectedArticlesMap } from '../lib/fileManager';
import { fetchArticle, truncateToWords } from '../lib/articleFetcher';
import type { Topic } from '../types';

const MAX_BACKUPS = 2;
const MAIN_TRUNCATE_WORDS = 2000;
const BACKUP_TRUNCATE_WORDS = 500;
const JINA_DELAY_MS = 500;

function getFreshness(timeframeId: string): string {
  switch (timeframeId) {
    case 'daily': return 'day';
    case 'weekly': return 'week';
    case 'monthly': return 'month';
    default: return 'week';
  }
}

interface BucketResult {
  name: string;
  scope: 'local' | 'continent';
  topic: Topic;
  articles: NewsArticle[];
  scores: ScoredArticle[];
  selectedMain: NewsArticle | null;
}

export function createArticleResearcher(): AgentFn {
  return async (ctx, onReasoningChunk, _onUpdate) => {
    const { sessionConfig } = ctx;
    const country = sessionConfig.geography.country;
    const continent = sessionConfig.geography.continent;
    const topics = sessionConfig.content.topics;
    const freshness = getFreshness(sessionConfig.dates.timeframeId);

    if (topics.length !== 3) {
      throw new Error(`Exactly 3 topics required. Got: ${topics.length}`);
    }

    const apiConfig = await loadApiConfig();

    // ========================================================================
    // PHASE 1: Search
    // ========================================================================
    const searchResults: { local: NewsArticle[]; continent: NewsArticle[]; topic: Topic }[] = [];

    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      const topicTerm = getTopicSearchTerm(topic, country.language);

      onReasoningChunk(`Searching local news for Topic ${i + 1}: ${topic} (${topicTerm})...\n`);
      const localArticles = await searchTopicLocal({
        countryCode: country.code,
        countryName: country.name,
        topicQuery: topicTerm,
        freshness,
        pageSize: 10,
      });
      onReasoningChunk(`  Found ${localArticles.length} local articles.\n`);

      onReasoningChunk(`Searching continent news for Topic ${i + 1}: ${topic}...\n`);
      const continentArticles = await searchTopicContinent({
        continentName: continent.name,
        topicQuery: topicTerm,
        freshness,
        pageSize: 10,
      });
      onReasoningChunk(`  Found ${continentArticles.length} continent articles.\n`);

      searchResults.push({ local: localArticles, continent: continentArticles, topic });
    }

    const totalLocal = searchResults.reduce((s, r) => s + r.local.length, 0);
    const totalContinent = searchResults.reduce((s, r) => s + r.continent.length, 0);
    onReasoningChunk(`Total: ${totalLocal} local, ${totalContinent} continent articles.\n`);

    // ========================================================================
    // PHASE 2: Score all articles, pick highest per bucket
    // ========================================================================
    const bucketResults: BucketResult[] = [];

    for (let i = 0; i < searchResults.length; i++) {
      const sr = searchResults[i];
      for (const scope of ['local', 'continent'] as const) {
        const bucketName = `${sr.topic} ${scope === 'local' ? 'Local' : 'Continent'}`;
        const currentArticles = scope === 'local' ? sr.local : sr.continent;

        onReasoningChunk(`\nScoring bucket: ${bucketName} (${currentArticles.length} articles)...\n`);

        if (currentArticles.length === 0) {
          onReasoningChunk(`  No articles in bucket.\n`);
          bucketResults.push({
            name: bucketName,
            scope,
            topic: sr.topic,
            articles: currentArticles,
            scores: [],
            selectedMain: null,
          });
          continue;
        }

        const prompt = buildScoringPrompt(bucketName, currentArticles.map(a => ({
          title: a.title,
          description: a.description,
          source: a.source,
          url: a.url,
        })));

        const { content } = await callLLM(apiConfig.lightweight, prompt);

        let scores: ScoredArticle[] = [];
        try {
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          scores = JSON.parse(jsonMatch ? jsonMatch[0] : content);
        } catch {
          onReasoningChunk(`  Failed to parse scores — using fallback ranking.\n`);
          // Fallback: score by title+description length as a proxy
          scores = currentArticles.map((_, idx) => ({
            index: idx,
            impact: 5,
            prominence: 5,
            rarity: 5,
            conflict: 5,
            average: 5,
          }));
        }

        const ranked = scores
          .map((s, idx) => ({ score: s, article: currentArticles[idx] }))
          .filter(x => x.article !== undefined)
          .sort((a, b) => b.score.average - a.score.average);

        const mainArticle = ranked.length > 0 ? ranked[0].article : null;
        if (mainArticle) {
          onReasoningChunk(`  Selected: "${mainArticle.title}" (${ranked[0].score.average.toFixed(1)} avg)\n`);
        }

        bucketResults.push({
          name: bucketName,
          scope,
          topic: sr.topic,
          articles: currentArticles,
          scores,
          selectedMain: mainArticle,
        });
      }
    }

    // ========================================================================
    // PHASE 3: Build 8 slots from best articles
    // ========================================================================
    const localBuckets = bucketResults.filter(b => b.scope === 'local');
    const continentBuckets = bucketResults.filter(b => b.scope === 'continent');

    // Wildcard locals from runner-ups across all local buckets
    const localRunnerUps: { article: NewsArticle; score: number; bucket: BucketResult }[] = [];
    localBuckets.forEach(b => {
      const ranked = b.scores
        .map((s, i) => ({ score: s, article: b.articles[i] }))
        .filter(x => x.article && x.article.url !== b.selectedMain?.url)
        .sort((a, b) => b.score.average - a.score.average);
      if (ranked.length > 0) {
        localRunnerUps.push({ article: ranked[0].article, score: ranked[0].score.average, bucket: b });
      }
    });
    localRunnerUps.sort((a, b) => b.score - a.score);
    const wildcardMains = localRunnerUps.slice(0, 2).map(r => r.article);

    // Assemble 8 slots — always pick best available, never fail
    const allMains: { article: NewsArticle; scope: 'local' | 'continent'; topic: Topic; bucket: BucketResult }[] = [];

    // Slots 1-3: topic locals
    for (let i = 0; i < 3; i++) {
      const bucket = localBuckets[i];
      if (bucket?.selectedMain) {
        allMains.push({ article: bucket.selectedMain, scope: 'local', topic: topics[i], bucket });
      }
    }

    // Slots 4-5: wildcard locals
    for (const article of wildcardMains) {
      const runnerUp = localRunnerUps.find(r => r.article.url === article.url);
      allMains.push({ article, scope: 'local', topic: runnerUp?.bucket?.topic ?? topics[0], bucket: runnerUp?.bucket ?? localBuckets[0] });
    }

    // Slots 6-8: topic continents
    for (let i = 0; i < 3; i++) {
      const bucket = continentBuckets[i];
      if (bucket?.selectedMain) {
        allMains.push({ article: bucket.selectedMain, scope: 'continent', topic: topics[i], bucket });
      }
    }

    if (allMains.length < 8) {
      onReasoningChunk(`\nWarning: Only ${allMains.length}/8 slots filled. Some buckets had no articles.\n`);
    } else {
      onReasoningChunk(`\nFilled ${allMains.length}/8 article slots.\n`);
    }

    // ========================================================================
    // PHASE 4: Full-text fetch
    // ========================================================================
    const selectedMap: SelectedArticlesMap = {};

    for (let i = 0; i < allMains.length; i++) {
      const slot = allMains[i];
      const key = `article${i + 1}`;
      onReasoningChunk(`\nFetching ${key}: ${slot.article.title}\n`);

      // Fetch main
      const mainFetched = await fetchArticle(slot.article.url, slot.article.title, slot.article.description);
      const mainText = truncateToWords(mainFetched.text, MAIN_TRUNCATE_WORDS);

      // Select backups from same bucket
      const rankedBackups = slot.bucket.scores
        .map((s, idx) => ({ score: s, article: slot.bucket.articles[idx] }))
        .filter(x => x.article && x.article.url !== slot.article.url)
        .sort((a, b) => b.score.average - a.score.average)
        .slice(0, MAX_BACKUPS);

      // Fetch backups
      const backupFetched = [];
      for (const backup of rankedBackups) {
        await new Promise(r => setTimeout(r, JINA_DELAY_MS));
        const fetched = await fetchArticle(backup.article.url, backup.article.title, backup.article.description);
        const text = truncateToWords(fetched.text, BACKUP_TRUNCATE_WORDS);
        backupFetched.push({
          url: fetched.url,
          title: fetched.title,
          source: fetched.source,
          description: backup.article.description,
          text,
          wordCount: countWords(text),
          tier: fetched.tier,
        });
      }

      selectedMap[key] = {
        main: {
          url: mainFetched.url,
          title: mainFetched.title,
          source: mainFetched.source,
          description: slot.article.description,
          text: mainText,
          wordCount: countWords(mainText),
          tier: mainFetched.tier,
        },
        backups: backupFetched,
        scope: slot.scope,
        topic: slot.topic,
      };

      onReasoningChunk(`  Main: ${mainFetched.tier === 1 ? 'Jina' : mainFetched.tier === 2 ? 'Direct' : 'Description'} (${countWords(mainText)} words)\n`);
      for (const b of backupFetched) {
        onReasoningChunk(`  Backup: ${b.source} — ${b.tier === 1 ? 'Jina' : b.tier === 2 ? 'Direct' : 'Description'} (${b.wordCount} words)\n`);
      }
    }

    // ========================================================================
    // PHASE 5: Write to disk
    // ========================================================================
    await clearAllSegments();
    await writeSelectedArticles(selectedMap);

    onReasoningChunk(`\nWrote selected_articles.json with ${Object.keys(selectedMap).length} article slots.\n`);

    return {
      draft: '',
      reasoning: '',
      prompt: '',
      metadata: {
        articleCount: Object.keys(selectedMap).length,
        selectedArticles: Object.entries(selectedMap).map(([k, v]) => ({
          key: k,
          title: v.main.title,
          source: v.main.source,
          scope: v.scope,
          topic: v.topic,
          tier: v.main.tier,
          wordCount: v.main.wordCount,
          backupCount: v.backups.length,
        })),
      },
    };
  };
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}
