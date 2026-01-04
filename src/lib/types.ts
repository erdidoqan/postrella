/**
 * Shared Type Definitions
 * Postrella MVP-1
 */

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta?: PaginationMeta;
}

// Entity types
export interface Source {
  id: number;
  name: string;
  config: string | null;
  is_active: number;
  created_at: number;
  updated_at: number;
}

export interface Topic {
  id: number;
  keyword: string;
  source_id: number;
  source_name?: string;
  locale: string;
  score: number;
  metadata: TopicMetadata | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fetched_at: number;
  created_at: number;
  updated_at: number;
}

export interface Account {
  id: number;
  platform: 'x' | 'reddit' | 'site' | 'pinterest' | 'mastodon';
  user_id: string | null;
  username: string | null;
  is_active: number;
  created_at: number;
  updated_at: number;
  // OAuth fields are not exposed to UI
}

export interface ContentJob {
  id: number;
  topic_id: number;
  topic?: Topic;
  targets: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  attempts: number;
  max_attempts: number;
  error: string | null;
  next_run_at: number | null;
  started_at: number | null;
  completed_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface ContentOutput {
  id: number;
  job_id: number;
  topic_id: number;
  topic?: Topic;
  target: 'site' | 'x' | 'reddit';
  title: string | null;
  body: string;
  metadata: ContentMetadata | null;
  version: number;
  edited_by: string | null;
  edited_at: number | null;
  status: 'draft' | 'ready' | 'published';
  created_at: number;
  updated_at: number;
}

export interface Publish {
  id: number;
  output_id: number;
  output?: ContentOutput;
  platform: 'site' | 'x' | 'reddit' | 'pinterest' | 'mastodon';
  account_id: number | null;
  status: 'pending' | 'published' | 'failed';
  remote_id: string | null;
  url: string | null;
  scheduled_at: number | null;
  published_at: number | null;
  error: string | null;
  retry_count: number;
  created_at: number;
  updated_at: number;
}

// Metadata types
export interface TopicMetadata {
  volume?: number;
  growth?: number;
  category?: string;
  related_queries?: string[];
}

export interface ContentMetadata {
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  hashtags?: string[];
  subreddit?: string;
  category_ids?: number[];
  tag_ids?: number[];
  suggested_category?: string;
  suggested_tags?: string[];
  featured_image?: string;
  featured_image_url?: string;
  excerpt?: string;
}

export interface GoogleTrendsConfig {
  q: string;
  geo: string;
  date: GoogleTrendsDateValue;
  cat?: string;
  excluded_keywords?: string[];
}

// Google Trends date values
export type GoogleTrendsDateValue = 
  | 'now 1-H' 
  | 'now 4-H' 
  | 'now 1-d' 
  | 'now 7-d' 
  | 'today 1-m' 
  | 'today 3-m';

export const GOOGLE_TRENDS_DATE_OPTIONS: { value: GoogleTrendsDateValue; label: string }[] = [
  { value: 'now 1-H', label: 'Past hour' },
  { value: 'now 4-H', label: 'Past 4 hours' },
  { value: 'now 1-d', label: 'Past day' },
  { value: 'now 7-d', label: 'Past 7 days' },
  { value: 'today 1-m', label: 'Past 30 days' },
  { value: 'today 3-m', label: 'Past 90 days' },
];

// Common geo codes
export const GEO_OPTIONS = [
  { value: 'US', label: 'United States' },
  { value: 'TR', label: 'Turkey' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'ES', label: 'Spain' },
  { value: 'IT', label: 'Italy' },
  { value: 'BR', label: 'Brazil' },
  { value: 'IN', label: 'India' },
  { value: 'JP', label: 'Japan' },
  { value: 'AU', label: 'Australia' },
  { value: 'CA', label: 'Canada' },
];

// Dashboard stats
export interface DashboardStats {
  totalTopics: number;
  totalJobs: number;
  totalOutputs: number;
  totalPublishes: number;
  pendingJobs: number;
  publishedToday: number;
}

// Request types
export interface GenerateContentRequest {
  targets: ('site' | 'x' | 'reddit')[];
}

export interface PublishRequest {
  output_id: number;
  platform: 'site' | 'x' | 'reddit';
  scheduled_at?: number;
}

export interface UpdateOutputRequest {
  title?: string;
  body?: string;
  metadata?: ContentMetadata;
  status?: 'draft' | 'ready';
}

export interface UpdateGoogleTrendsConfigRequest {
  q: string;
  geo: string;
  date: GoogleTrendsDateValue;
  cat?: string;
  excluded_keywords?: string[];
}

// Filter types
export interface TopicFilters {
  source?: string;
  status?: string;
  minScore?: number;
  keyword?: string;
  page?: number;
  limit?: number;
}

export interface OutputFilters {
  topicId?: number;
  target?: 'site' | 'x' | 'reddit';
  status?: 'draft' | 'ready' | 'published';
  page?: number;
  limit?: number;
}

export interface PublishFilters {
  status?: 'pending' | 'published' | 'failed';
  platform?: 'site' | 'x' | 'reddit' | 'pinterest' | 'mastodon';
  page?: number;
  limit?: number;
}

