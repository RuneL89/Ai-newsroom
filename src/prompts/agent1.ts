import type { SessionConfig } from '../lib/sessionConfig';
import { formatSessionContextForLLM } from '../lib/sessionConfig';
import {
  STORY_COMPLETENESS_REQUIREMENTS,
  EDITOR_COMPLETENESS_AUDIT,
} from './shared/completenessRequirements';
import { biasAgent1Instructions, biasEditorialGuidelines } from '../data/bias';
import type { NewsArticle } from '../lib/newsSearch';

function replacePlaceholders(template: string, config: SessionConfig): string {
  return template
    .replace(/\[COUNTRY_NAME\]/g, config.geography.country.name)
    .replace(/\[CONTINENT_NAME\]/g, config.geography.continent.name)
    .replace(/\[COUNTRY_LANGUAGE\]/g, config.geography.country.language)
    .replace(/\[BIAS_LABEL\]/g, config.editorial.biasLabel);
}

function buildArticleContext(articles: NewsArticle[], label: string): string {
  if (articles.length === 0) {
    return `**${label}**: No articles found.`;
  }
  const lines = articles.map((a, i) => {
    const date = a.publishedAt ? ` (${a.publishedAt.split(' ')[0]})` : '';
    return `${i + 1}. **${a.title}**${date}\n   Source: ${a.source}\n   ${a.description}`;
  });
  return `**${label}** (${articles.length} articles):\n\n${lines.join('\n\n')}`;
}

export function buildAgent1Prompt(
  config: SessionConfig,
  localArticles: NewsArticle[],
  continentArticles: NewsArticle[]
): string {
  const completenessReqs = replacePlaceholders(STORY_COMPLETENESS_REQUIREMENTS, config);
  const editorAudit = replacePlaceholders(EDITOR_COMPLETENESS_AUDIT, config);
  const biasInstructions = biasAgent1Instructions[config.editorial.biasId];
  const biasGuidelines = biasEditorialGuidelines[config.editorial.biasId];

  const localContext = buildArticleContext(localArticles, `Local News: ${config.geography.country.name}`);
  const continentContext = buildArticleContext(
    continentArticles,
    `Continent News: ${config.geography.continent.name}`
  );

  const musicSuite = config.content.musicSuite;
  const musicInstructions = musicSuite
    ? `**MUSIC CUES** (insert exactly as shown):\n- Opening: [INTRO: ${musicSuite.intro}]\n- Between each story: [STORY STING: ${musicSuite.storySting}]\n- Between country and continent blocks: [BLOCK TRANSITION: ${musicSuite.blockSting}]\n- Closing: [OUTRO: ${musicSuite.outro}]`
    : '';

  const editorialSegment = config.editorial.includeSegment
    ? `**EDITORIAL SEGMENT** (MANDATORY — included because user selected it):\n- Place AFTER the ${config.geography.continent.name} News block, BEFORE the sign-off\n- Minimum 2500 characters\n- Apply **${config.editorial.biasLabel}** perspective MOST prominently (higher intensity than news segments)\n- Analyze themes from both ${config.geography.country.name} and ${config.geography.continent.name} blocks\n- Provide closure and wrap up the podcast\n\n${biasGuidelines}`
    : '';

  const topicList = config.content.topics.join(', ');

  return `## ROLE
You are a professional news researcher and podcast scriptwriter for a "Professional newscast"-style international news podcast.

${formatSessionContextForLLM(config)}

## DATE RANGE (STRICT)
Only use stories published between **${config.dates.earliestDate}** and **${config.dates.today}**.
Stories outside this window are INVALID and must be excluded.

## API SEARCH RESULTS
The following articles were returned by the news API. Use ONLY these articles — do not invent stories.
If insufficient articles exist, note this in the selection report and work with what you have.

${localContext}

${continentContext}

**Note on sources**: The typical media landscape in ${config.geography.country.name} includes outlets such as ${config.geography.country.newsSources.join(', ')}, but the actual articles above are what the API returned. Use whatever sources are available.

## TOPIC TRANSLATION
The selected topics are: **${topicList}**. The local language is **${config.geography.country.language}**.
When evaluating local articles, consider how these topics translate conceptually into ${config.geography.country.language}-language news coverage.

## STORY SCORING
Score each article 1-10 using Professional newscast news values:
- **Immediacy**: How recent/timely?
- **Proximity**: Relevance to ${config.geography.country.name} and ${config.geography.continent.name}?
- **Consequence**: Impact on listeners' lives?
- **Prominence**: Importance of people/places involved?
- **Human Interest**: Emotional connection, relatability?

## SELECTION RULES
- Select the **top 5 highest-scored** ${config.geography.country.name} stories from the local articles
- Select the **top 3 highest-scored** ${config.geography.continent.name} stories from the continent articles
- Topic priority: ${topicList} first, General News as fallback
- If fewer than 5 local stories exist, use all available and note the shortfall
- If fewer than 3 continent stories exist, use all available and note the shortfall

${completenessReqs}

${editorAudit}

## EDITORIAL PERSPECTIVE
When writing the first draft, frame all facts through **${config.editorial.biasLabel}** perspective.

${biasInstructions}

${musicInstructions}

${editorialSegment}

## SCRIPT STRUCTURE
1. **Opening** — introduce the podcast with music cue
2. **Headlines** — brief teaser of top stories
3. **${config.geography.country.name} News Block** (5 stories max) — each with music cues
4. **${config.geography.continent.name} News Block** (3 stories max) — each with music cues
${config.editorial.includeSegment ? `5. **Editorial Segment** — thematic analysis with ${config.editorial.biasLabel} perspective` : ''}
${config.editorial.includeSegment ? '6. **Sign-off** — closing with music cue' : '5. **Sign-off** — closing with music cue'}

## OUTPUT FORMAT
You MUST produce exactly two sections:

\`\`\`
## FIRST DRAFT SCRIPT
[Full script with music cues — ALL IN ENGLISH]

## STORY SELECTION REPORT
- Topic Focus: ${topicList}
- Fallback to General News: [Yes/No]
- ${config.geography.country.name} Stories Selected: [N stories with scores and sources]
  * From primary topics: [count]
  * From fallback: [count]
  * Source: [news source name]
  * Original language: [language]
  * Date: YYYY-MM-DD
- ${config.geography.continent.name} Stories Selected: [N stories with scores and sources]
  * Source: [news source name]
  * Original language: English
  * Date: YYYY-MM-DD
- Selection Method: Auto-selected highest scores
- API Articles Available: ${localArticles.length} local, ${continentArticles.length} continent
- Fallback Used: [Yes/No]
\`\`\`
`;
}
