import type { AgentFn } from '../lib/pipelineTypes';
import { loadApiConfig, streamLLM } from '../lib/apiConfig';
import { searchNews, searchContinentNews } from '../lib/newsSearch';
import { buildAgent1Prompt } from '../prompts/agent1';
import { parseAgent1Output } from './agent1Parse';

export function createAgent1(): AgentFn {
  return async (ctx, onReasoningChunk) => {
    const { sessionConfig } = ctx;
    const country = sessionConfig.geography.country;
    const continent = sessionConfig.geography.continent;

    // STEP 1: Search local news
    onReasoningChunk(`Searching local news for ${country.name}...\n`);

    const primaryTopic = sessionConfig.content.topics[0] || 'General News';
    const localQueries = sessionConfig.content.topics.map((t) => t.toLowerCase());

    // Search each topic and merge results (deduplicated by URL)
    const seenUrls = new Set<string>();
    const localArticles: Awaited<ReturnType<typeof searchNews>> = [];

    for (const query of localQueries.slice(0, 2)) {
      const results = await searchNews({
        countryCode: country.code,
        language: country.language,
        query,
        fromDate: sessionConfig.dates.earliestDate,
        toDate: sessionConfig.dates.today,
        pageSize: 10,
      });
      for (const article of results) {
        if (!seenUrls.has(article.url)) {
          seenUrls.add(article.url);
          localArticles.push(article);
        }
      }
    }

    // If we still have very few results, try a broader "news" query
    if (localArticles.length < 3) {
      const broadResults = await searchNews({
        countryCode: country.code,
        language: country.language,
        query: 'news',
        fromDate: sessionConfig.dates.earliestDate,
        toDate: sessionConfig.dates.today,
        pageSize: 10,
      });
      for (const article of broadResults) {
        if (!seenUrls.has(article.url)) {
          seenUrls.add(article.url);
          localArticles.push(article);
        }
      }
    }

    // STEP 2: Search continent news
    onReasoningChunk(`Searching ${continent.name} news sources...\n`);

    const continentArticles = await searchContinentNews({
      query: primaryTopic.toLowerCase(),
      fromDate: sessionConfig.dates.earliestDate,
      toDate: sessionConfig.dates.today,
      pageSize: 10,
    });

    onReasoningChunk(
      `Found ${localArticles.length} local articles, ${continentArticles.length} continent articles.\n`
    );

    // STEP 3: Build prompt
    onReasoningChunk('Building prompt with session context and requirements...\n');
    const prompt = buildAgent1Prompt(sessionConfig, localArticles, continentArticles);

    // STEP 4: Stream to LLM
    onReasoningChunk('Sending to LLM for first draft generation...\n');

    let draft = '';
    let reasoning = '';
    const apiConfig = await loadApiConfig();

    await streamLLM(apiConfig, prompt, {
      onReasoningChunk: (chunk) => {
        reasoning += chunk;
        onReasoningChunk(chunk);
      },
      onContentChunk: (chunk) => {
        draft += chunk;
      },
      onError: (err) => {
        throw err;
      },
      onDone: () => {
        onReasoningChunk('\nDraft generation complete.\n');
      },
    });

    // STEP 5: Parse output
    onReasoningChunk('Parsing output...\n');
    const parsed = parseAgent1Output(draft);

    return {
      draft,
      reasoning,
      prompt,
      metadata: {
        firstDraft: parsed.draftScript,
        selectionReport: parsed.selectionReport,
        localArticlesFound: localArticles.length,
        continentArticlesFound: continentArticles.length,
        sourcesUsed: parsed.sources,
        fallbackUsed: parsed.fallbackUsed,
      },
    };
  };
}
