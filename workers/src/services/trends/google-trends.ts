/**
 * Google Trends Service (via SerpAPI)
 */

import type { GoogleTrendsConfig, TopicMetadata } from '../../db/schema';

export interface GoogleTrendsResult {
  keyword: string;
  score: number;
  metadata: TopicMetadata;
}

export interface SerpApiRelatedQuery {
  query: string;
  value?: number;
  extracted_value?: number;
  link?: string;
}

export interface SerpApiResponse {
  search_metadata?: {
    status: string;
  };
  related_queries?: {
    rising?: SerpApiRelatedQuery[];
    top?: SerpApiRelatedQuery[];
  };
  error?: string;
}

const SERPAPI_BASE_URL = 'https://serpapi.com/search';

export async function fetchGoogleTrends(
  apiKey: string,
  config: GoogleTrendsConfig
): Promise<GoogleTrendsResult[]> {
  if (!config.q || !config.q.trim()) {
    console.log('Google Trends: No query provided, skipping');
    return [];
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    engine: 'google_trends',
    q: config.q,
    geo: config.geo || 'US',
    date: config.date || 'now 1-d',
    include_low_search_volume: 'true',
    tz: '420',
    hl: 'en',
    cat: config.cat || '0',
    data_type: 'RELATED_QUERIES',
    no_cache: 'true',
  });

  const url = `${SERPAPI_BASE_URL}?${params.toString()}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`SerpAPI error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json() as SerpApiResponse;

    if (data.error) {
      console.error('SerpAPI error:', data.error);
      return [];
    }

    const results: GoogleTrendsResult[] = [];

    // Only process rising queries (trending/growing searches)
    const risingQueries = data.related_queries?.rising || [];
    for (const query of risingQueries) {
      if (query.query) {
        results.push({
          keyword: query.query,
          score: query.extracted_value || query.value || 50,
          metadata: {
            volume: query.extracted_value || query.value,
            growth: query.extracted_value, // Rising queries show % growth (e.g., +3650%)
            category: 'rising',
          },
        });
      }
    }

    console.log(`Google Trends: Fetched ${results.length} rising keywords for "${config.q}" in ${config.geo}`);
    return results;
  } catch (error) {
    console.error('Google Trends fetch error:', error);
    return [];
  }
}

// Validate date value
export function isValidGoogleTrendsDate(date: string): boolean {
  const validDates = [
    'now 1-H',
    'now 4-H',
    'now 1-d',
    'now 7-d',
    'today 1-m',
    'today 3-m',
  ];
  return validDates.includes(date);
}

