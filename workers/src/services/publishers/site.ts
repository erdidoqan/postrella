/**
 * Site API Publisher
 * Publishes content to the CMS API (cms.digitexa.com)
 */

export interface SitePublishConfig {
  siteId: string;
  apiKey: string;
}

export interface SitePostData {
  title: string;
  slug?: string;
  content: string;
  status?: 'draft' | 'published';
  published_at?: number;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  featured_image_url?: string;
  author_id: number;
  category_ids?: number[];
  tag_ids?: number[];
}

export interface SiteApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface Category {
  id: number;
  site_id: number;
  name: string;
  slug: string;
  description?: string | null;
  created_at: number;
  updated_at: number;
}

export interface Tag {
  id: number;
  site_id: number;
  name: string;
  slug: string;
  created_at: number;
  updated_at: number;
}

export interface CreateCategoryData {
  name: string;
  slug?: string;
  description?: string;
}

export interface CreateTagData {
  name: string;
  slug?: string;
}

export interface Author {
  id: number;
  site_id: number;
  name: string;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  slug: string;
  created_at: number;
  updated_at: number;
}

export interface AuthorPersona {
  persona: string;
  expertise?: string[];
  tone: string;
  style?: string;
}

const SITE_API_BASE = 'https://cms.digitexa.com/api/v1';

export async function publishToSite(
  config: SitePublishConfig,
  postData: SitePostData
): Promise<{ id: string; url: string }> {
  const url = `${SITE_API_BASE}/posts?site_id=${config.siteId}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.apiKey,
    },
    body: JSON.stringify({
      title: postData.title,
      slug: postData.slug,
      content: postData.content,
      status: postData.status || 'published',
      published_at: postData.published_at || Math.floor(Date.now() / 1000),
      seo_title: postData.seo_title,
      seo_description: postData.seo_description,
      seo_keywords: postData.seo_keywords,
      featured_image_url: postData.featured_image_url,
      author_id: postData.author_id,
      category_ids: postData.category_ids,
      tag_ids: postData.tag_ids,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Site API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as SiteApiResponse<{ id: number; slug: string; title: string }>;

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to publish to site');
  }

  // Construct URL based on site domain or slug
  const postUrl = `https://www.wishesbirds.com/${data.data.slug}`; // TODO: Get domain from site config

  return {
    id: String(data.data.id),
    url: postUrl,
  };
}

export async function updateSitePost(
  config: SitePublishConfig,
  postId: string,
  postData: Partial<SitePostData>
): Promise<void> {
  const url = `${SITE_API_BASE}/posts/${postId}?site_id=${config.siteId}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.apiKey,
    },
    body: JSON.stringify(postData),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Site API error: ${response.status} - ${error}`);
  }
}

export async function testSiteConnection(config: SitePublishConfig): Promise<boolean> {
  const url = `${SITE_API_BASE}/sites/${config.siteId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': config.apiKey,
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch all categories for a site
 */
export async function fetchCategories(config: SitePublishConfig): Promise<Category[]> {
  const url = `${SITE_API_BASE}/categories?site_id=${config.siteId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-API-Key': config.apiKey,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Site API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as SiteApiResponse<Category[]>;

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to fetch categories');
  }

  return data.data;
}

/**
 * Create a new category
 */
export async function createCategory(
  config: SitePublishConfig,
  categoryData: CreateCategoryData
): Promise<Category> {
  const url = `${SITE_API_BASE}/categories?site_id=${config.siteId}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.apiKey,
    },
    body: JSON.stringify(categoryData),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Site API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as SiteApiResponse<Category>;

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to create category');
  }

  return data.data;
}

/**
 * Fetch all tags for a site
 */
export async function fetchTags(config: SitePublishConfig): Promise<Tag[]> {
  const url = `${SITE_API_BASE}/tags?site_id=${config.siteId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-API-Key': config.apiKey,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Site API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as SiteApiResponse<Tag[]>;

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to fetch tags');
  }

  return data.data;
}

/**
 * Create a new tag
 */
export async function createTag(
  config: SitePublishConfig,
  tagData: CreateTagData
): Promise<Tag> {
  const url = `${SITE_API_BASE}/tags?site_id=${config.siteId}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.apiKey,
    },
    body: JSON.stringify(tagData),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Site API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as SiteApiResponse<Tag>;

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to create tag');
  }

  return data.data;
}

/**
 * Fetch all authors for a site
 */
export async function fetchAuthors(config: SitePublishConfig): Promise<Author[]> {
  const url = `${SITE_API_BASE}/authors?site_id=${config.siteId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-API-Key': config.apiKey,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Site API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as SiteApiResponse<Author[]>;

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to fetch authors');
  }

  return data.data;
}

/**
 * Parse persona from author bio field
 */
export function parseAuthorPersona(author: Author): AuthorPersona | null {
  if (!author.bio) {
    return null;
  }

  try {
    const parsed = JSON.parse(author.bio) as AuthorPersona;
    return parsed;
  } catch {
    // If bio is not JSON, return null
    return null;
  }
}

