import { loadNewsApiKey } from './apiConfig';

const NEWSDATA_BASE_URL = 'https://newsdata.io/api/1/latest';

export interface NewsArticle {
  title: string;
  description: string;
  content: string;
  source: string;
  sourceUrl: string;
  url: string;
  publishedAt: string;
  language: string;
  country: string;
}

interface NewsDataArticle {
  article_id: string;
  title: string;
  link: string;
  keywords?: string[];
  creator?: string[];
  video_url?: string | null;
  description: string;
  content: string;
  pubDate: string;
  pubDateTZ: string;
  image_url?: string | null;
  source_id: string;
  source_name: string;
  source_url: string;
  source_icon?: string | null;
  language: string;
  country?: string[];
  category?: string[];
}

interface NewsDataResponse {
  status: string;
  totalResults: number;
  results?: NewsDataArticle[];
  nextPage?: string;
}

function normalizeArticle(raw: NewsDataArticle): NewsArticle {
  return {
    title: raw.title || '',
    description: raw.description || '',
    content: raw.content || raw.description || '',
    source: raw.source_name || raw.source_id || 'Unknown',
    sourceUrl: raw.source_url || '',
    url: raw.link || '',
    publishedAt: raw.pubDate || '',
    language: raw.language || '',
    country: raw.country?.[0] || '',
  };
}

async function fetchNewsData(params: Record<string, string>): Promise<NewsArticle[]> {
  const apiKey = await loadNewsApiKey();
  if (!apiKey.trim()) {
    throw new Error('NewsData.io API key is missing. Go to Configure API to add one.');
  }

  const searchParams = new URLSearchParams({ ...params, apikey: apiKey.trim() });
  const response = await fetch(`${NEWSDATA_BASE_URL}?${searchParams.toString()}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.results?.message || errorData.message || `HTTP ${response.status}`;
    throw new Error(`NewsData.io error: ${message}`);
  }

  const data = (await response.json()) as NewsDataResponse;
  if (data.status !== 'success') {
    throw new Error(`NewsData.io error: ${data.status}`);
  }

  const results = data.results ?? [];
  return results.map(normalizeArticle);
}

export interface SearchNewsParams {
  countryCode: string;
  language: string;
  query: string;
  fromDate: string;
  toDate: string;
  pageSize?: number;
}

/**
 * Search news with automatic fallback chain:
 * 1. country + local language + query
 * 2. country + query (drop language)
 * 3. English keyword search with country name
 * 4. Return whatever exists
 */
export async function searchNews(params: SearchNewsParams): Promise<NewsArticle[]> {
  const { countryCode, language, query, fromDate, toDate, pageSize = 20 } = params;

  // Attempt 1: country + local language + query
  const attempt1 = await fetchNewsData({
    country: countryCode.toLowerCase(),
    language: language.toLowerCase().slice(0, 2),
    q: query,
    from_date: fromDate,
    to_date: toDate,
    size: String(Math.min(pageSize, 10)),
  });
  if (attempt1.length >= 3) return attempt1;

  // Attempt 2: country + query (drop language filter)
  const attempt2 = await fetchNewsData({
    country: countryCode.toLowerCase(),
    q: query,
    from_date: fromDate,
    to_date: toDate,
    size: String(Math.min(pageSize, 10)),
  });
  const combined = [...attempt1, ...attempt2.filter((a) => !attempt1.find((b) => b.url === a.url))];
  if (combined.length >= 3) return combined;

  return combined;
}

/**
 * Search continent-level news in English using continent news sources.
 */
export async function searchContinentNews(params: {
  query: string;
  fromDate: string;
  toDate: string;
  pageSize?: number;
}): Promise<NewsArticle[]> {
  const { query, fromDate, toDate, pageSize = 20 } = params;

  return fetchNewsData({
    q: query,
    language: 'en',
    from_date: fromDate,
    to_date: toDate,
    size: String(Math.min(pageSize, 10)),
  });
}
