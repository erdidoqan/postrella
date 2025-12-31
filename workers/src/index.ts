/**
 * Postrella Worker - Main Entry Point
 * Cloudflare Workers + D1
 */

import { handleCors, corsHeaders, getRequestOrigin } from './utils/auth';
import { errorResponse, successResponse, paginatedResponse, NotFoundError, BadRequestError } from './utils/errors';
import { SCHEMA_SQL } from './db/schema';
import type { Source, Topic, ContentJob, ContentOutput, Publish, Setting, GoogleTrendsConfig } from './db/schema';
import { fetchGoogleTrends, isValidGoogleTrendsDate } from './services/trends/google-trends';
import { fetchPinterestTrends } from './services/trends/pinterest';
import { GeminiService, ContentStrategy } from './services/ai/gemini';
import { publishToSite, testSiteConnection, fetchCategories, fetchTags, createCategory, createTag } from './services/publishers/site';
import { publishToX } from './services/publishers/x';
import { publishToReddit } from './services/publishers/reddit';
import { publishToPinterest, getPinterestAuthUrl, exchangePinterestCode, getPinterestUser, fetchPinterestBoards } from './services/publishers/pinterest';
import { CloudinaryService } from './services/image/cloudinary';
import { MediaService } from './services/publishers/media';

export interface Env {
  DB: D1Database;
  GEMINI_API_KEY: string;
  SESSION_SECRET: string;
  SERPAPI_API_KEY?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  X_CLIENT_ID?: string;
  X_CLIENT_SECRET?: string;
  REDDIT_CLIENT_ID?: string;
  REDDIT_CLIENT_SECRET?: string;
  PINTEREST_CLIENT_ID?: string;
  PINTEREST_CLIENT_SECRET?: string;
}

// Initialize database schema
async function initDb(db: D1Database): Promise<void> {
  const statements = SCHEMA_SQL.split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    try {
      await db.prepare(statement).run();
    } catch (error) {
      // Ignore "already exists" errors
      if (!(error instanceof Error) || !error.message.includes('already exists')) {
        console.error('Schema error:', error);
      }
    }
  }
}

// Get setting from database
async function getSetting(db: D1Database, key: string): Promise<string | null> {
  const result = await db.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first<Setting>();
  return result?.value || null;
}

// Set setting in database
async function setSetting(db: D1Database, key: string, value: string): Promise<void> {
  await db.prepare(`
    INSERT INTO settings (key, value, updated_at) 
    VALUES (?, ?, strftime('%s', 'now'))
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = strftime('%s', 'now')
  `).bind(key, value, value).run();
}

// Router
async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const origin = getRequestOrigin(request);

  // Initialize DB on first request
  await initDb(env.DB);

  // CORS preflight
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  // Helper to add CORS headers with correct origin
  const addCorsHeaders = (response: Response) => addCors(response, origin);

  try {
    // API Routes
    if (path.startsWith('/api/')) {
      // Sources
      if (path === '/api/sources' && method === 'GET') {
        const sources = await env.DB.prepare('SELECT * FROM sources WHERE is_active = 1').all<Source>();
        return addCorsHeaders(successResponse(sources.results));
      }

      // Settings - specific routes first, then generic
      if (path === '/api/settings/google-trends-config' && method === 'PUT') {
        const body = await request.json() as GoogleTrendsConfig;
        if (!isValidGoogleTrendsDate(body.date)) {
          throw new BadRequestError('Invalid date value');
        }
        await setSetting(env.DB, 'google_trends_config', JSON.stringify(body));
        return addCorsHeaders(successResponse({ message: 'Google Trends config updated' }));
      }

      if (path.match(/^\/api\/settings\/[\w-]+$/) && method === 'GET') {
        const key = path.split('/').pop()!;
        const value = await getSetting(env.DB, key);
        if (!value) throw new NotFoundError('Setting');
        return addCorsHeaders(successResponse({ value }));
      }

      if (path.match(/^\/api\/settings\/[\w-]+$/) && method === 'PUT') {
        const key = path.split('/').pop()!;
        const body = await request.json() as { value: string };
        await setSetting(env.DB, key, body.value);
        return addCorsHeaders(successResponse({ message: 'Setting updated' }));
      }

      // Topics
      if (path === '/api/topics' && method === 'GET') {
        const source = url.searchParams.get('source');
        const status = url.searchParams.get('status');
        const minScore = url.searchParams.get('minScore');
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        let query = `
          SELECT t.*, s.name as source_name 
          FROM topics t 
          LEFT JOIN sources s ON t.source_id = s.id 
          WHERE 1=1
        `;
        const params: (string | number)[] = [];

        if (source) {
          query += ` AND s.name = ?`;
          params.push(source);
        }
        if (status) {
          query += ` AND t.status = ?`;
          params.push(status);
        }
        if (minScore) {
          query += ` AND t.score >= ?`;
          params.push(parseFloat(minScore));
        }

        // Count total
        const countQuery = query.replace('SELECT t.*, s.name as source_name', 'SELECT COUNT(*) as count');
        const countResult = await env.DB.prepare(countQuery).bind(...params).first<{ count: number }>();
        const total = countResult?.count || 0;

        // Get paginated results
        query += ` ORDER BY t.score DESC, t.fetched_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const topics = await env.DB.prepare(query).bind(...params).all<Topic & { source_name: string }>();

        return addCorsHeaders(paginatedResponse(topics.results || [], { page, limit, total }));
      }

      if (path.match(/^\/api\/topics\/\d+$/) && method === 'GET') {
        const id = parseInt(path.split('/').pop()!);
        const topic = await env.DB.prepare(`
          SELECT t.*, s.name as source_name 
          FROM topics t 
          LEFT JOIN sources s ON t.source_id = s.id 
          WHERE t.id = ?
        `).bind(id).first<Topic>();

        if (!topic) throw new NotFoundError('Topic');
        return addCorsHeaders(successResponse(topic));
      }

      if (path.match(/^\/api\/topics\/\d+\/generate$/) && method === 'POST') {
        const id = parseInt(path.split('/')[3]);
        const body = await request.json() as { targets: string[] };

        // Create job
        const result = await env.DB.prepare(`
          INSERT INTO content_jobs (topic_id, targets, status, created_at, updated_at)
          VALUES (?, ?, 'pending', strftime('%s', 'now'), strftime('%s', 'now'))
        `).bind(id, JSON.stringify(body.targets)).run();

        return addCorsHeaders(successResponse({ job_id: result.meta.last_row_id }));
      }

      // Jobs
      if (path.match(/^\/api\/jobs\/\d+$/) && method === 'GET') {
        const id = parseInt(path.split('/').pop()!);
        const job = await env.DB.prepare('SELECT * FROM content_jobs WHERE id = ?').bind(id).first<ContentJob>();

        if (!job) throw new NotFoundError('Job');
        return addCorsHeaders(successResponse({
          ...job,
          targets: JSON.parse(job.targets),
        }));
      }

      // Run pending jobs (manual trigger)
      if (path === '/api/jobs/run' && method === 'POST') {
        const geminiApiKey = env.GEMINI_API_KEY || await getSetting(env.DB, 'gemini_api_key');
        if (!geminiApiKey) {
          throw new BadRequestError('Gemini API key not configured');
        }

        const gemini = new GeminiService({ apiKey: geminiApiKey });
        let processed = 0;
        let failed = 0;

        // Get pending jobs
        const jobs = await env.DB.prepare(`
          SELECT cj.*, t.keyword, t.locale 
          FROM content_jobs cj 
          JOIN topics t ON cj.topic_id = t.id 
          WHERE cj.status = 'pending' 
          ORDER BY cj.created_at ASC 
          LIMIT 5
        `).all<ContentJob & { keyword: string; locale: string }>();

        // Helper function to generate slug from name
        const generateSlug = (name: string): string => {
          return name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        };

        // Helper function to match category/tag name (case-insensitive, flexible matching)
        const findMatchingCategory = (suggestedName: string, categories: Array<{ name: string; slug: string; id: number }>): number | null => {
          const suggestedLower = suggestedName.toLowerCase().trim();
          for (const cat of categories) {
            if (cat.name.toLowerCase() === suggestedLower || cat.slug.toLowerCase() === suggestedLower) {
              return cat.id;
            }
          }
          return null;
        };

        const findMatchingTags = (suggestedTags: string[], tags: Array<{ name: string; slug: string; id: number }>): number[] => {
          const matchedIds: number[] = [];
          for (const suggestedTag of suggestedTags) {
            const suggestedLower = suggestedTag.toLowerCase().trim();
            for (const tag of tags) {
              if ((tag.name.toLowerCase() === suggestedLower || tag.slug.toLowerCase() === suggestedLower) && !matchedIds.includes(tag.id)) {
                matchedIds.push(tag.id);
                break;
              }
            }
          }
          return matchedIds;
        };

        for (const job of jobs.results || []) {
          try {
            // Update job status
            await env.DB.prepare(`
              UPDATE content_jobs 
              SET status = 'running', started_at = strftime('%s', 'now'), attempts = attempts + 1
              WHERE id = ?
            `).bind(job.id).run();

            const targets = JSON.parse(job.targets) as string[];

            // For site target, fetch categories and tags from CMS
            let existingCategories: Array<{ id: number; name: string; slug: string }> = [];
            let existingTags: Array<{ id: number; name: string; slug: string }> = [];
            let siteConfig: { siteId: string; apiKey: string } | null = null;

            if (targets.includes('site')) {
              const siteApiKey = await getSetting(env.DB, 'site_api_key');
              const siteId = await getSetting(env.DB, 'site_id');
              
              if (siteApiKey && siteId) {
                siteConfig = { siteId, apiKey: siteApiKey };
                try {
                  existingCategories = await fetchCategories(siteConfig);
                  existingTags = await fetchTags(siteConfig);
                } catch (error) {
                  console.error('Failed to fetch categories/tags from CMS:', error);
                  // Continue without categories/tags if fetch fails
                }
              }
            }

            for (const target of targets) {
              let result;
              switch (target) {
                case 'site':
                  result = await gemini.generateSiteArticle(
                    job.keyword,
                    job.locale,
                    undefined,
                    existingCategories,
                    existingTags
                  );
                  break;
                case 'x':
                  result = await gemini.generateXPost(job.keyword);
                  break;
                case 'reddit':
                  result = await gemini.generateRedditPost(job.keyword);
                  break;
                default:
                  continue;
              }

              // Process categories and tags for site target
              let categoryIds: number[] = [];
              let tagIds: number[] = [];

              if (target === 'site' && siteConfig && result.suggested_category) {
                // Try to match existing category
                const matchedCategoryId = findMatchingCategory(result.suggested_category, existingCategories);
                
                if (matchedCategoryId) {
                  categoryIds = [matchedCategoryId];
                } else {
                  // Create new category
                  try {
                    const newCategory = await createCategory(siteConfig, {
                      name: result.suggested_category,
                      slug: generateSlug(result.suggested_category),
                    });
                    categoryIds = [newCategory.id];
                    // Update local list for potential tag matching
                    existingCategories.push({ id: newCategory.id, name: newCategory.name, slug: newCategory.slug });
                  } catch (error) {
                    console.error('Failed to create category:', error);
                  }
                }
              }

              if (target === 'site' && siteConfig && result.suggested_tags && result.suggested_tags.length > 0) {
                // Try to match existing tags
                const matchedTagIds = findMatchingTags(result.suggested_tags, existingTags);
                
                // Create new tags for unmatched suggestions
                for (const suggestedTag of result.suggested_tags) {
                  const tagLower = suggestedTag.toLowerCase().trim();
                  const isMatched = existingTags.some(t => 
                    t.name.toLowerCase() === tagLower || t.slug.toLowerCase() === tagLower
                  );
                  
                  if (!isMatched) {
                    try {
                      const newTag = await createTag(siteConfig, {
                        name: suggestedTag,
                        slug: generateSlug(suggestedTag),
                      });
                      tagIds.push(newTag.id);
                      // Update local list
                      existingTags.push({ id: newTag.id, name: newTag.name, slug: newTag.slug });
                    } catch (error) {
                      console.error('Failed to create tag:', error);
                    }
                  }
                }
                
                // Add matched tag IDs
                tagIds = [...tagIds, ...matchedTagIds];
              }

              // Build metadata with category and tag IDs
              const metadata: Record<string, unknown> = {
                ...result.metadata,
                suggested_category: result.suggested_category,
                suggested_tags: result.suggested_tags,
              };

              if (categoryIds.length > 0) {
                metadata.category_ids = categoryIds;
              }
              if (tagIds.length > 0) {
                metadata.tag_ids = tagIds;
              }

              // Save output
              await env.DB.prepare(`
                INSERT INTO content_outputs (job_id, topic_id, target, title, body, metadata, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 'draft', strftime('%s', 'now'), strftime('%s', 'now'))
              `).bind(
                job.id,
                job.topic_id,
                target,
                result.title,
                result.body,
                JSON.stringify(metadata)
              ).run();
            }

            // Mark job completed
            await env.DB.prepare(`
              UPDATE content_jobs 
              SET status = 'completed', completed_at = strftime('%s', 'now')
              WHERE id = ?
            `).bind(job.id).run();

            // Update topic status
            await env.DB.prepare(`
              UPDATE topics SET status = 'completed' WHERE id = ?
            `).bind(job.topic_id).run();

            processed++;
          } catch (error) {
            console.error(`Job ${job.id} failed:`, error);
            await env.DB.prepare(`
              UPDATE content_jobs 
              SET status = 'failed', error = ?
              WHERE id = ?
            `).bind(String(error), job.id).run();
            failed++;
          }
        }

        return addCorsHeaders(successResponse({ processed, failed }));
      }

      // Outputs
      if (path === '/api/outputs' && method === 'GET') {
        const topicId = url.searchParams.get('topicId');
        const target = url.searchParams.get('target');
        const status = url.searchParams.get('status');
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        let query = `
          SELECT co.*, t.keyword as topic_keyword 
          FROM content_outputs co 
          JOIN topics t ON co.topic_id = t.id 
          WHERE 1=1
        `;
        const params: (string | number)[] = [];

        if (topicId) {
          query += ` AND co.topic_id = ?`;
          params.push(parseInt(topicId));
        }
        if (target) {
          query += ` AND co.target = ?`;
          params.push(target);
        }
        if (status) {
          query += ` AND co.status = ?`;
          params.push(status);
        }

        const countQuery = query.replace('SELECT co.*, t.keyword as topic_keyword', 'SELECT COUNT(*) as count');
        const countResult = await env.DB.prepare(countQuery).bind(...params).first<{ count: number }>();
        const total = countResult?.count || 0;

        query += ` ORDER BY co.created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const outputs = await env.DB.prepare(query).bind(...params).all<ContentOutput>();

        return addCorsHeaders(paginatedResponse(outputs.results || [], { page, limit, total }));
      }

      if (path.match(/^\/api\/outputs\/\d+$/) && method === 'GET') {
        const id = parseInt(path.split('/').pop()!);
        const output = await env.DB.prepare(`
          SELECT co.*, t.keyword as topic_keyword 
          FROM content_outputs co 
          JOIN topics t ON co.topic_id = t.id 
          WHERE co.id = ?
        `).bind(id).first<ContentOutput>();

        if (!output) throw new NotFoundError('Output');
        return addCorsHeaders(successResponse(output));
      }

      if (path.match(/^\/api\/outputs\/\d+$/) && method === 'PUT') {
        const id = parseInt(path.split('/').pop()!);
        const body = await request.json() as { title?: string; body?: string; metadata?: Record<string, unknown>; status?: string };

        const updates: string[] = ['updated_at = strftime(\'%s\', \'now\')'];
        const params: (string | number)[] = [];

        if (body.title !== undefined) {
          updates.push('title = ?');
          params.push(body.title);
        }
        if (body.body !== undefined) {
          updates.push('body = ?');
          params.push(body.body);
        }
        if (body.metadata !== undefined) {
          updates.push('metadata = ?');
          params.push(JSON.stringify(body.metadata));
        }
        if (body.status !== undefined) {
          updates.push('status = ?');
          params.push(body.status);
        }

        params.push(id);

        await env.DB.prepare(`
          UPDATE content_outputs SET ${updates.join(', ')} WHERE id = ?
        `).bind(...params).run();

        const updated = await env.DB.prepare('SELECT * FROM content_outputs WHERE id = ?').bind(id).first<ContentOutput>();
        return addCorsHeaders(successResponse(updated));
      }

      // Publish
      if (path === '/api/publish' && method === 'POST') {
        const body = await request.json() as { output_id: number; platform: string; scheduled_at?: number };

        // Get output
        const output = await env.DB.prepare(`
          SELECT co.*, t.keyword 
          FROM content_outputs co 
          JOIN topics t ON co.topic_id = t.id 
          WHERE co.id = ?
        `).bind(body.output_id).first<ContentOutput & { keyword: string }>();

        if (!output) throw new NotFoundError('Output');

        // Get account for platform
        const account = await env.DB.prepare(`
          SELECT * FROM accounts WHERE platform = ? AND is_active = 1 LIMIT 1
        `).bind(body.platform).first();

        // Create publish record
        const result = await env.DB.prepare(`
          INSERT INTO publishes (output_id, platform, account_id, status, scheduled_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'), strftime('%s', 'now'))
        `).bind(
          body.output_id,
          body.platform,
          account?.id || null,
          body.scheduled_at ? 'pending' : 'pending',
          body.scheduled_at || null
        ).run();

        const publishId = result.meta.last_row_id;

        // If no scheduled_at, publish immediately
        if (!body.scheduled_at) {
          try {
            let publishResult: { id: string; url: string } | undefined;

            if (body.platform === 'site') {
              const siteApiKey = await getSetting(env.DB, 'site_api_key');
              const siteId = await getSetting(env.DB, 'site_id');
              if (siteApiKey && siteId) {
                const metadata = output.metadata ? JSON.parse(output.metadata) : {};
                publishResult = await publishToSite(
                  { siteId, apiKey: siteApiKey },
                  {
                    title: output.title || output.keyword,
                    slug: metadata.slug,
                    content: output.body,
                    status: 'published',
                    seo_title: metadata.seo_title,
                    seo_description: metadata.seo_description,
                    seo_keywords: metadata.seo_keywords,
                    author_id: 1, // Default author
                    category_ids: Array.isArray(metadata.category_ids) ? metadata.category_ids : undefined,
                    tag_ids: Array.isArray(metadata.tag_ids) ? metadata.tag_ids : undefined,
                  }
                );
              }
            }
            // X and Reddit publishing would go here with proper OAuth tokens

            if (publishResult) {
              await env.DB.prepare(`
                UPDATE publishes 
                SET status = 'published', remote_id = ?, url = ?, published_at = strftime('%s', 'now')
                WHERE id = ?
              `).bind(publishResult.id, publishResult.url, publishId).run();

              await env.DB.prepare(`
                UPDATE content_outputs SET status = 'published' WHERE id = ?
              `).bind(body.output_id).run();
            }
          } catch (error) {
            await env.DB.prepare(`
              UPDATE publishes SET status = 'failed', error = ? WHERE id = ?
            `).bind(String(error), publishId).run();
          }
        }

        const publish = await env.DB.prepare('SELECT * FROM publishes WHERE id = ?').bind(publishId).first<Publish>();
        return addCorsHeaders(successResponse(publish));
      }

      // Publishes list
      if (path === '/api/publishes' && method === 'GET') {
        const status = url.searchParams.get('status');
        const platform = url.searchParams.get('platform');
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        let query = `
          SELECT p.*, co.title as output_title, co.target as output_target
          FROM publishes p 
          JOIN content_outputs co ON p.output_id = co.id
          WHERE 1=1
        `;
        const params: (string | number)[] = [];

        if (status) {
          query += ` AND p.status = ?`;
          params.push(status);
        }
        if (platform) {
          query += ` AND p.platform = ?`;
          params.push(platform);
        }

        const countQuery = query.replace('SELECT p.*, co.title as output_title, co.target as output_target', 'SELECT COUNT(*) as count');
        const countResult = await env.DB.prepare(countQuery).bind(...params).first<{ count: number }>();
        const total = countResult?.count || 0;

        query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const publishes = await env.DB.prepare(query).bind(...params).all<Publish>();

        return addCorsHeaders(paginatedResponse(publishes.results || [], { page, limit, total }));
      }

      // Accounts
      if (path === '/api/accounts' && method === 'GET') {
        const accounts = await env.DB.prepare(`
          SELECT id, platform, user_id, username, is_active, created_at, updated_at
          FROM accounts WHERE is_active = 1
        `).all();
        return addCorsHeaders(successResponse(accounts.results));
      }

      // Pinterest OAuth - Start
      if (path === '/api/auth/pinterest/start' && method === 'POST') {
        if (!env.PINTEREST_CLIENT_ID) {
          throw new BadRequestError('Pinterest client ID not configured');
        }

        const origin = getRequestOrigin(request);
        const redirectUri = `${new URL(request.url).origin}/api/auth/pinterest/callback`;
        const state = crypto.randomUUID();

        // Store state in settings for validation
        await setSetting(env.DB, `pinterest_oauth_state_${state}`, Date.now().toString());

        const authUrl = getPinterestAuthUrl(
          env.PINTEREST_CLIENT_ID,
          redirectUri,
          state
        );

        return addCorsHeaders(successResponse({ auth_url: authUrl }));
      }

      // Pinterest OAuth - Callback
      if (path === '/api/auth/pinterest/callback' && method === 'GET') {
        const url = new URL(request.url);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');

        if (!code || !state) {
          throw new BadRequestError('Missing code or state');
        }

        if (!env.PINTEREST_CLIENT_ID || !env.PINTEREST_CLIENT_SECRET) {
          throw new BadRequestError('Pinterest credentials not configured');
        }

        // Validate state
        const storedState = await getSetting(env.DB, `pinterest_oauth_state_${state}`);
        if (!storedState) {
          throw new BadRequestError('Invalid state parameter');
        }

        // Delete used state
        await env.DB.prepare('DELETE FROM settings WHERE key = ?').bind(`pinterest_oauth_state_${state}`).run();

        const redirectUri = `${new URL(request.url).origin}/api/auth/pinterest/callback`;

        // Exchange code for tokens
        const tokens = await exchangePinterestCode(
          env.PINTEREST_CLIENT_ID,
          env.PINTEREST_CLIENT_SECRET,
          code,
          redirectUri
        );

        // Get user info
        const user = await getPinterestUser(tokens.accessToken);

        // Save account to database
        const expiresAt = Math.floor(Date.now() / 1000) + tokens.expiresIn;

        // Check if account exists
        const existingAccount = await env.DB.prepare(
          'SELECT id FROM accounts WHERE platform = ?'
        ).bind('pinterest').first();

        if (existingAccount) {
          // Update existing account
          await env.DB.prepare(`
            UPDATE accounts
            SET user_id = ?, username = ?, access_token = ?, refresh_token = ?,
                token_expires_at = ?, is_active = 1, updated_at = strftime('%s', 'now')
            WHERE platform = ?
          `).bind(
            user.id,
            user.username,
            tokens.accessToken,
            tokens.refreshToken,
            expiresAt,
            'pinterest'
          ).run();
        } else {
          // Insert new account
          await env.DB.prepare(`
            INSERT INTO accounts (platform, user_id, username, access_token, refresh_token, token_expires_at, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, strftime('%s', 'now'), strftime('%s', 'now'))
          `).bind(
            'pinterest',
            user.id,
            user.username,
            tokens.accessToken,
            tokens.refreshToken,
            expiresAt
          ).run();
        }

        // Redirect to settings page
        const frontendUrl = 'https://postrella.vercel.app';
        return Response.redirect(`${frontendUrl}/settings?pinterest=connected`, 302);
      }

      // Pinterest Boards - Fetch user's boards
      if (path === '/api/pinterest/boards' && method === 'GET') {
        const account = await env.DB.prepare(
          'SELECT * FROM accounts WHERE platform = ? AND is_active = 1 LIMIT 1'
        ).bind('pinterest').first();

        if (!account) {
          throw new BadRequestError('Pinterest account not connected');
        }

        if (!env.PINTEREST_CLIENT_ID || !env.PINTEREST_CLIENT_SECRET) {
          throw new BadRequestError('Pinterest credentials not configured');
        }

        const boards = await fetchPinterestBoards({
          accessToken: account.access_token as string,
          refreshToken: account.refresh_token as string,
          clientId: env.PINTEREST_CLIENT_ID,
          clientSecret: env.PINTEREST_CLIENT_SECRET,
        });

        return addCorsHeaders(successResponse(boards));
      }

      // Pinterest Board Mappings - Get
      if (path === '/api/settings/pinterest-board-mappings' && method === 'GET') {
        const mappingsStr = await getSetting(env.DB, 'pinterest_board_mappings');
        const mappings = mappingsStr ? JSON.parse(mappingsStr) : {};
        return addCorsHeaders(successResponse(mappings));
      }

      // Pinterest Board Mappings - Update
      if (path === '/api/settings/pinterest-board-mappings' && method === 'PUT') {
        const body = await request.json() as Record<string, string>;
        // Filter out undefined/null values
        const cleanedMappings: Record<string, string> = {};
        for (const [key, value] of Object.entries(body)) {
          if (value !== undefined && value !== null && value !== '') {
            cleanedMappings[key] = value;
          }
        }
        await setSetting(env.DB, 'pinterest_board_mappings', JSON.stringify(cleanedMappings));
        return addCorsHeaders(successResponse({ message: 'Board mappings saved' }));
      }

      // Pinterest Manual Publish
      if (path === '/api/pinterest/publish' && method === 'POST') {
        const body = await request.json() as { output_id: number; board_id?: string };

        if (!body.output_id) {
          throw new BadRequestError('output_id is required');
        }

        // Get output
        const output = await env.DB.prepare(
          'SELECT * FROM content_outputs WHERE id = ?'
        ).bind(body.output_id).first();

        if (!output) {
          throw new NotFoundError('Output not found');
        }

        // Get Pinterest account
        const account = await env.DB.prepare(
          'SELECT * FROM accounts WHERE platform = ? AND is_active = 1 LIMIT 1'
        ).bind('pinterest').first();

        if (!account) {
          throw new BadRequestError('Pinterest account not connected');
        }

        if (!env.PINTEREST_CLIENT_ID || !env.PINTEREST_CLIENT_SECRET) {
          throw new BadRequestError('Pinterest credentials not configured');
        }

        // Get board_id from parameter or mapping
        let boardId = body.board_id;
        if (!boardId) {
          const metadata = JSON.parse(output.metadata as string);
          const categoryId = metadata.category_ids?.[0];
          const mappingsStr = await getSetting(env.DB, 'pinterest_board_mappings');
          const mappings = mappingsStr ? JSON.parse(mappingsStr) : {};
          boardId = mappings[categoryId] || mappings['default'];
        }

        if (!boardId) {
          throw new BadRequestError('No board configured for this content');
        }

        const metadata = JSON.parse(output.metadata as string);
        const featuredImageUrl = metadata.featured_image_url;

        if (!featuredImageUrl) {
          throw new BadRequestError('Featured image is required for Pinterest');
        }

        // Get published URL from publishes table
        const publishRecord = await env.DB.prepare(
          'SELECT * FROM publishes WHERE output_id = ? AND platform = ? LIMIT 1'
        ).bind(body.output_id, 'site').first();

        if (!publishRecord || !publishRecord.url) {
          throw new BadRequestError('Content must be published to site first');
        }

        // Publish to Pinterest
        const pinResult = await publishToPinterest({
          accessToken: account.access_token as string,
          refreshToken: account.refresh_token as string,
          clientId: env.PINTEREST_CLIENT_ID,
          clientSecret: env.PINTEREST_CLIENT_SECRET,
        }, {
          board_id: boardId,
          title: output.title as string,
          description: metadata.seo_description || '',
          link: publishRecord.url as string,
          media_source: {
            source_type: 'image_url',
            url: featuredImageUrl,
          },
        });

        // Save publish record
        const publishResult = await env.DB.prepare(`
          INSERT INTO publishes (output_id, platform, account_id, status, remote_id, url, published_at, created_at, updated_at)
          VALUES (?, 'pinterest', ?, 'published', ?, ?, strftime('%s', 'now'), strftime('%s', 'now'), strftime('%s', 'now'))
        `).bind(
          body.output_id,
          account.id,
          pinResult.id,
          pinResult.url
        ).run();

        return addCorsHeaders(successResponse({
          id: publishResult.meta.last_row_id,
          pin_id: pinResult.id,
          url: pinResult.url,
        }));
      }


      // Dashboard stats
      if (path === '/api/dashboard/stats' && method === 'GET') {
        const totalTopics = await env.DB.prepare('SELECT COUNT(*) as count FROM topics').first<{ count: number }>();
        const totalJobs = await env.DB.prepare('SELECT COUNT(*) as count FROM content_jobs').first<{ count: number }>();
        const totalOutputs = await env.DB.prepare('SELECT COUNT(*) as count FROM content_outputs').first<{ count: number }>();
        const totalPublishes = await env.DB.prepare('SELECT COUNT(*) as count FROM publishes').first<{ count: number }>();
        const pendingJobs = await env.DB.prepare('SELECT COUNT(*) as count FROM content_jobs WHERE status = ?').bind('pending').first<{ count: number }>();
        
        const today = Math.floor(Date.now() / 1000) - 86400;
        const publishedToday = await env.DB.prepare(
          'SELECT COUNT(*) as count FROM publishes WHERE status = ? AND published_at > ?'
        ).bind('published', today).first<{ count: number }>();

        return addCorsHeaders(successResponse({
          totalTopics: totalTopics?.count || 0,
          totalJobs: totalJobs?.count || 0,
          totalOutputs: totalOutputs?.count || 0,
          totalPublishes: totalPublishes?.count || 0,
          pendingJobs: pendingJobs?.count || 0,
          publishedToday: publishedToday?.count || 0,
        }));
      }

      // Fetch trends from Google Trends with keywords parameter
      if (path === '/api/trends/fetch' && method === 'POST') {
        const serpApiKey = env.SERPAPI_API_KEY || await getSetting(env.DB, 'serpapi_api_key');
        if (!serpApiKey) {
          throw new BadRequestError('SerpAPI key not configured');
        }

        // Get keywords from request body
        const body = await request.json() as { keywords: string[] };
        if (!body.keywords || !Array.isArray(body.keywords) || body.keywords.length === 0) {
          throw new BadRequestError('keywords array is required');
        }

        const googleTrendsConfigStr = await getSetting(env.DB, 'google_trends_config');
        const baseConfig = googleTrendsConfigStr 
          ? JSON.parse(googleTrendsConfigStr) as GoogleTrendsConfig
          : { geo: 'US', date: 'now 1-d' };

        const googleSource = await env.DB.prepare(
          'SELECT id FROM sources WHERE name = ?'
        ).bind('google_trends').first<{ id: number }>();

        if (!googleSource) {
          throw new BadRequestError('Google Trends source not found');
        }

        let totalFetched = 0;
        let newKeywords = 0;
        let duplicates = 0;
        const results: Array<{ keyword: string; fetched: number; new: number }> = [];

        // Fetch trends for each keyword
        for (const keyword of body.keywords) {
          const config: GoogleTrendsConfig = {
            q: keyword.trim(),
            geo: baseConfig.geo,
            date: baseConfig.date,
          };

          try {
            const googleResults = await fetchGoogleTrends(serpApiKey, config);
            let keywordNew = 0;

            for (const result of googleResults) {
              const existing = await env.DB.prepare(
                'SELECT id FROM topics WHERE keyword = ? AND source_id = ?'
              ).bind(result.keyword, googleSource.id).first();

              if (!existing) {
                await env.DB.prepare(`
                  INSERT INTO topics (keyword, source_id, score, metadata, status, fetched_at, created_at, updated_at)
                  VALUES (?, ?, ?, ?, 'pending', strftime('%s', 'now'), strftime('%s', 'now'), strftime('%s', 'now'))
                `).bind(
                  result.keyword,
                  googleSource.id,
                  result.score,
                  JSON.stringify({ ...result.metadata, parent_keyword: keyword })
                ).run();
                newKeywords++;
                keywordNew++;
              } else {
                duplicates++;
              }
            }

            totalFetched += googleResults.length;
            results.push({ keyword, fetched: googleResults.length, new: keywordNew });
          } catch (error) {
            console.error(`Error fetching trends for "${keyword}":`, error);
            results.push({ keyword, fetched: 0, new: 0 });
          }
        }

        return addCorsHeaders(successResponse({
          total_fetched: totalFetched,
          new_keywords: newKeywords,
          duplicates: duplicates,
          keywords_processed: results,
          config: { geo: baseConfig.geo, date: baseConfig.date },
        }));
      }

      // Generate content for pending topics (limit only, no keywords)
      if (path === '/api/content/generate' && method === 'POST') {
        const geminiApiKey = env.GEMINI_API_KEY || await getSetting(env.DB, 'gemini_api_key');
        const siteApiKey = await getSetting(env.DB, 'site_api_key');
        const siteId = await getSetting(env.DB, 'site_id');

        if (!geminiApiKey) {
          throw new BadRequestError('Gemini API key not configured');
        }
        if (!siteApiKey || !siteId) {
          throw new BadRequestError('Site API not configured');
        }

        // Get limit from request body (default: 5, max: 20)
        let topicLimit = 5;
        try {
          const body = await request.json() as { limit?: number };
          if (body.limit && body.limit > 0) {
            topicLimit = Math.min(body.limit, 20);
          }
        } catch {
          // No body or invalid JSON, use default
        }

        const gemini = new GeminiService({ apiKey: geminiApiKey });
        const siteConfig = { apiKey: siteApiKey, siteId: siteId };
        
        // Fetch existing categories and tags from CMS
        let existingCategories: Array<{ id: number; name: string; slug: string }> = [];
        let existingTags: Array<{ id: number; name: string; slug: string }> = [];
        
        try {
          existingCategories = await fetchCategories(siteConfig);
          existingTags = await fetchTags(siteConfig);
        } catch (error) {
          console.error('Failed to fetch categories/tags from CMS:', error);
        }

        // Helper function to generate slug from name
        const generateSlugFromName = (name: string): string => {
          return name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        };

        // Helper function to match category name
        const matchCategory = (suggestedName: string, categories: Array<{ name: string; slug: string; id: number }>): number | null => {
          const suggestedLower = suggestedName.toLowerCase().trim();
          for (const cat of categories) {
            if (cat.name.toLowerCase() === suggestedLower || cat.slug.toLowerCase() === suggestedLower) {
              return cat.id;
            }
          }
          return null;
        };

        const matchTags = (suggestedTags: string[], tags: Array<{ name: string; slug: string; id: number }>): number[] => {
          const matchedIds: number[] = [];
          for (const suggestedTag of suggestedTags) {
            const suggestedLower = suggestedTag.toLowerCase().trim();
            for (const tag of tags) {
              if ((tag.name.toLowerCase() === suggestedLower || tag.slug.toLowerCase() === suggestedLower) && !matchedIds.includes(tag.id)) {
                matchedIds.push(tag.id);
                break;
              }
            }
          }
          return matchedIds;
        };
        
        // Initialize image services (optional - only if Cloudinary is configured)
        const cloudinaryCloudName = env.CLOUDINARY_CLOUD_NAME || await getSetting(env.DB, 'cloudinary_cloud_name');
        console.log(`Cloudinary cloud name: ${cloudinaryCloudName ? 'configured' : 'NOT configured'}`);
        const cloudinaryService = cloudinaryCloudName ? new CloudinaryService({ cloudName: cloudinaryCloudName }) : null;
        const mediaService = cloudinaryService ? new MediaService({ apiKey: siteApiKey, siteId: siteId }) : null;

        // Get pending topics
        const pendingTopics = await env.DB.prepare(`
          SELECT t.*, s.name as source_name 
          FROM topics t 
          JOIN sources s ON t.source_id = s.id 
          WHERE t.status = 'pending'
          ORDER BY t.score DESC, t.fetched_at DESC
          LIMIT ?
        `).bind(topicLimit).all<Topic & { source_name: string }>();

        if (!pendingTopics.results || pendingTopics.results.length === 0) {
          return addCorsHeaders(successResponse({
            message: 'No pending topics found',
            processed: 0,
          }));
        }

        const summary = {
          total_topics: pendingTopics.results.length,
          articles_generated: 0,
          articles_published: 0,
          errors: [] as string[],
        };

        for (const topic of pendingTopics.results) {
          try {
            // Check if output already exists
            const existingOutput = await env.DB.prepare(
              'SELECT id FROM content_outputs WHERE topic_id = ? AND target = ?'
            ).bind(topic.id, 'site').first();

            if (existingOutput) {
              console.log(`Skipping "${topic.keyword}" - output already exists`);
              summary.articles_generated++;
              summary.articles_published++;
              continue;
            }

            // Update topic status to processing
            await env.DB.prepare(`
              UPDATE topics SET status = 'processing', updated_at = strftime('%s', 'now') WHERE id = ?
            `).bind(topic.id).run();

            // Get content strategy
            const strategy = await gemini.getContentStrategy(topic.keyword);

            // Generate article with strategy (pass existing categories and tags)
            const article = await gemini.generateSiteArticle(
              topic.keyword,
              'en',
              strategy,
              existingCategories,
              existingTags
            );

            // Process categories and tags
            let categoryIds: number[] = [];
            let tagIds: number[] = [];

            if (article.suggested_category) {
              const matchedCategoryId = matchCategory(article.suggested_category, existingCategories);
              
              if (matchedCategoryId) {
                categoryIds = [matchedCategoryId];
              } else {
                try {
                  const newCategory = await createCategory(siteConfig, {
                    name: article.suggested_category,
                    slug: generateSlugFromName(article.suggested_category),
                  });
                  categoryIds = [newCategory.id];
                  existingCategories.push({ id: newCategory.id, name: newCategory.name, slug: newCategory.slug });
                  console.log(`Created new category: ${newCategory.name}`);
                } catch (catError) {
                  console.error('Failed to create category:', catError);
                }
              }
            }

            if (article.suggested_tags && article.suggested_tags.length > 0) {
              const matchedTagIds = matchTags(article.suggested_tags, existingTags);
              
              for (const suggestedTag of article.suggested_tags) {
                const tagLower = suggestedTag.toLowerCase().trim();
                const isMatched = existingTags.some(t => 
                  t.name.toLowerCase() === tagLower || t.slug.toLowerCase() === tagLower
                );
                
                if (!isMatched) {
                  try {
                    const newTag = await createTag(siteConfig, {
                      name: suggestedTag,
                      slug: generateSlugFromName(suggestedTag),
                    });
                    tagIds.push(newTag.id);
                    existingTags.push({ id: newTag.id, name: newTag.name, slug: newTag.slug });
                    console.log(`Created new tag: ${newTag.name}`);
                  } catch (tagError) {
                    console.error('Failed to create tag:', tagError);
                  }
                }
              }
              
              tagIds = [...tagIds, ...matchedTagIds];
            }

            // Build complete metadata
            const completeMetadata: Record<string, unknown> = {
              ...article.metadata,
              seo_title: strategy.seo_title,
              seo_description: strategy.seo_description,
              seo_keywords: strategy.seo_keywords,
              strategy: {
                intent: strategy.intent,
                angle: strategy.angle,
                audience: strategy.audience,
                tone: strategy.tone,
                content_outline: strategy.content_outline,
              },
              suggested_category: article.suggested_category,
              suggested_tags: article.suggested_tags,
            };
            
            if (categoryIds.length > 0) {
              completeMetadata.category_ids = categoryIds;
            }
            if (tagIds.length > 0) {
              completeMetadata.tag_ids = tagIds;
            }

            // Save content output
            const outputResult = await env.DB.prepare(`
              INSERT INTO content_outputs (topic_id, target, title, body, metadata, status, created_at, updated_at)
              VALUES (?, 'site', ?, ?, ?, 'ready', strftime('%s', 'now'), strftime('%s', 'now'))
            `).bind(
              topic.id,
              article.title,
              article.body,
              JSON.stringify(completeMetadata)
            ).run();

            summary.articles_generated++;

            // Generate featured image (if Cloudinary is configured)
            let featuredImageUrl: string | undefined;
            console.log(`Image pipeline check - cloudinaryService: ${!!cloudinaryService}, mediaService: ${!!mediaService}`);
            if (cloudinaryService && mediaService) {
              try {
                // Generate a quote for the image
                console.log(`Generating quote for "${topic.keyword}"...`);
                const quote = await gemini.generateQuote(topic.keyword, {
                  intent: strategy.intent,
                  tone: strategy.tone,
                });
                console.log(`Quote generated: "${quote}"`);

                // Build Cloudinary image URL
                const imageUrl = cloudinaryService.generateFeaturedImage(topic.keyword, quote);
                console.log(`Cloudinary URL: ${imageUrl.substring(0, 100)}...`);

                // Upload to CMS Media
                console.log(`Uploading to CMS Media...`);
                const mediaResult = await mediaService.uploadFeaturedImage(
                  imageUrl,
                  article.title,
                  topic.keyword
                );
                console.log(`Media upload result: ${JSON.stringify(mediaResult)}`);

                if (mediaResult.success && mediaResult.url) {
                  featuredImageUrl = mediaResult.url;
                  console.log(`Featured image created for "${topic.keyword}": ${featuredImageUrl}`);
                } else {
                  console.warn(`Failed to upload featured image for "${topic.keyword}": ${mediaResult.error}`);
                }
              } catch (imageError) {
                console.error(`Image generation error for "${topic.keyword}":`, imageError);
                // Continue without featured image
              }
            } else {
              console.log(`Skipping image generation - services not configured`);
            }

            // Publish to site
            try {
              const publishResult = await publishToSite(siteConfig, {
                title: article.title,
                slug: (completeMetadata.slug as string) || strategy.slug,
                content: article.body,
                seo_title: strategy.seo_title,
                seo_description: strategy.seo_description,
                seo_keywords: strategy.seo_keywords.join(', '),
                author_id: 1,
                featured_image_url: featuredImageUrl,
                category_ids: categoryIds.length > 0 ? categoryIds : undefined,
                tag_ids: tagIds.length > 0 ? tagIds : undefined,
              });

              // Save publish record
              await env.DB.prepare(`
                INSERT INTO publishes (output_id, platform, status, remote_id, url, created_at, updated_at)
                VALUES (?, 'site', 'published', ?, ?, strftime('%s', 'now'), strftime('%s', 'now'))
              `).bind(
                outputResult.meta.last_row_id,
                publishResult.id || '',
                publishResult.url || ''
              ).run();

              // Update topic status
              await env.DB.prepare(`
                UPDATE topics SET status = 'published', updated_at = strftime('%s', 'now') WHERE id = ?
              `).bind(topic.id).run();

              summary.articles_published++;

              // Pinterest auto-pin (non-blocking)
              try {
                const pinterestAccount = await env.DB.prepare(
                  'SELECT * FROM accounts WHERE platform = ? AND is_active = 1 LIMIT 1'
                ).bind('pinterest').first();

                if (pinterestAccount && env.PINTEREST_CLIENT_ID && env.PINTEREST_CLIENT_SECRET) {
                  // Get board mapping
                  const boardMappingsStr = await getSetting(env.DB, 'pinterest_board_mappings');
                  const boardMappings = boardMappingsStr ? JSON.parse(boardMappingsStr) : {};

                  // Use first category for board selection
                  const categoryId = categoryIds[0];
                  const boardId = boardMappings[categoryId] || boardMappings['default'];

                  if (boardId && featuredImageUrl) {
                    console.log(`[Pinterest] Auto-pinning article: ${article.title}`);
                    console.log(`[Pinterest] Category ${categoryId} → Board ${boardId}`);

                    const pinResult = await publishToPinterest({
                      accessToken: pinterestAccount.access_token as string,
                      refreshToken: pinterestAccount.refresh_token as string,
                      clientId: env.PINTEREST_CLIENT_ID,
                      clientSecret: env.PINTEREST_CLIENT_SECRET,
                    }, {
                      board_id: boardId,
                      title: article.title,
                      description: strategy.seo_description,
                      link: publishResult.url,
                      media_source: {
                        source_type: 'image_url',
                        url: featuredImageUrl,
                      },
                    });

                    // Save Pinterest publish record
                    await env.DB.prepare(`
                      INSERT INTO publishes (output_id, platform, account_id, status, remote_id, url, published_at, created_at, updated_at)
                      VALUES (?, 'pinterest', ?, 'published', ?, ?, strftime('%s', 'now'), strftime('%s', 'now'), strftime('%s', 'now'))
                    `).bind(
                      outputResult.meta.last_row_id,
                      pinterestAccount.id,
                      pinResult.id,
                      pinResult.url
                    ).run();

                    console.log(`[Pinterest] Pin created: ${pinResult.url}`);
                  } else {
                    if (!boardId) {
                      console.log(`[Pinterest] No board mapping for category ${categoryId}, skipping auto-pin`);
                    }
                    if (!featuredImageUrl) {
                      console.log(`[Pinterest] No featured image, skipping auto-pin`);
                    }
                  }
                }
              } catch (pinterestError) {
                // Pinterest error should not block site publish
                console.error('[Pinterest] Auto-pin failed:', pinterestError);
              }
            } catch (publishError) {
              console.error(`Publish error for "${topic.keyword}":`, publishError);
              await env.DB.prepare(`
                UPDATE topics SET status = 'failed', updated_at = strftime('%s', 'now') WHERE id = ?
              `).bind(topic.id).run();
              summary.errors.push(`Publish failed for "${topic.keyword}": ${publishError instanceof Error ? publishError.message : 'Unknown error'}`);
            }

          } catch (error) {
            console.error(`Error processing "${topic.keyword}":`, error);
            await env.DB.prepare(`
              UPDATE topics SET status = 'failed', updated_at = strftime('%s', 'now') WHERE id = ?
            `).bind(topic.id).run();
            summary.errors.push(`${topic.keyword}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        return addCorsHeaders(successResponse(summary));
      }

      // Test content strategy only (no publish)
      if (path === '/api/strategy/test' && method === 'POST') {
        const geminiApiKey = env.GEMINI_API_KEY || await getSetting(env.DB, 'gemini_api_key');
        if (!geminiApiKey) {
          throw new BadRequestError('Gemini API key not configured');
        }

        const body = await request.json() as { keyword?: string };
        const keyword = body.keyword || 'happy new year wishes';

        const gemini = new GeminiService({ apiKey: geminiApiKey });
        const strategy = await gemini.getContentStrategy(keyword);

        return addCorsHeaders(successResponse({
          keyword,
          strategy,
        }));
      }

      // Full auto pipeline - fetch trends, create strategy, generate content, publish
      if (path === '/api/pipeline/run' && method === 'POST') {
        const geminiApiKey = env.GEMINI_API_KEY || await getSetting(env.DB, 'gemini_api_key');
        const siteApiKey = await getSetting(env.DB, 'site_api_key');
        const siteId = await getSetting(env.DB, 'site_id');
        const serpApiKey = env.SERPAPI_API_KEY || await getSetting(env.DB, 'serpapi_api_key');

        if (!geminiApiKey) {
          throw new BadRequestError('Gemini API key not configured');
        }
        if (!siteApiKey || !siteId) {
          throw new BadRequestError('Site API not configured');
        }

        // Get limit from request body (default: 10, max: 50)
        let topicLimit = 10;
        try {
          const body = await request.json() as { limit?: number };
          if (body.limit && body.limit > 0) {
            topicLimit = Math.min(body.limit, 50); // Cap at 50 to avoid timeouts
          }
        } catch {
          // No body or invalid JSON, use default
        }

        const gemini = new GeminiService({ apiKey: geminiApiKey });
        const siteConfig = { siteId, apiKey: siteApiKey };
        
        // Fetch existing categories and tags from CMS
        let existingCategories: Array<{ id: number; name: string; slug: string }> = [];
        let existingTags: Array<{ id: number; name: string; slug: string }> = [];
        
        try {
          existingCategories = await fetchCategories(siteConfig);
          existingTags = await fetchTags(siteConfig);
        } catch (error) {
          console.error('Failed to fetch categories/tags from CMS:', error);
        }

        // Helper function to generate slug from name
        const generateSlug = (name: string): string => {
          return name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        };

        // Helper function to match category name
        const findMatchingCategory = (suggestedName: string, categories: Array<{ name: string; slug: string; id: number }>): number | null => {
          const suggestedLower = suggestedName.toLowerCase().trim();
          for (const cat of categories) {
            if (cat.name.toLowerCase() === suggestedLower || cat.slug.toLowerCase() === suggestedLower) {
              return cat.id;
            }
          }
          return null;
        };

        const findMatchingTags = (suggestedTags: string[], tags: Array<{ name: string; slug: string; id: number }>): number[] => {
          const matchedIds: number[] = [];
          for (const suggestedTag of suggestedTags) {
            const suggestedLower = suggestedTag.toLowerCase().trim();
            for (const tag of tags) {
              if ((tag.name.toLowerCase() === suggestedLower || tag.slug.toLowerCase() === suggestedLower) && !matchedIds.includes(tag.id)) {
                matchedIds.push(tag.id);
                break;
              }
            }
          }
          return matchedIds;
        };
        
        const summary = {
          trends_fetched: 0,
          strategies_created: 0,
          articles_generated: 0,
          articles_published: 0,
          errors: 0,
          error_details: [] as string[],
          limit_used: topicLimit,
        };

        // Step 1: Fetch Google Trends
        const googleTrendsConfigStr = await getSetting(env.DB, 'google_trends_config');
        if (serpApiKey && googleTrendsConfigStr) {
          const googleTrendsConfig = JSON.parse(googleTrendsConfigStr) as GoogleTrendsConfig;
          const googleSource = await env.DB.prepare(
            'SELECT id FROM sources WHERE name = ?'
          ).bind('google_trends').first<{ id: number }>();

          if (googleSource) {
            const googleResults = await fetchGoogleTrends(serpApiKey, googleTrendsConfig);
            for (const result of googleResults) {
              // Check for duplicates
              const existing = await env.DB.prepare(
                'SELECT id FROM topics WHERE keyword = ? AND source_id = ?'
              ).bind(result.keyword, googleSource.id).first();

              if (!existing) {
                await env.DB.prepare(`
                  INSERT INTO topics (keyword, source_id, score, metadata, status, fetched_at, created_at, updated_at)
                  VALUES (?, ?, ?, ?, 'pending', strftime('%s', 'now'), strftime('%s', 'now'), strftime('%s', 'now'))
                `).bind(
                  result.keyword,
                  googleSource.id,
                  result.score,
                  JSON.stringify(result.metadata)
                ).run();
                summary.trends_fetched++;
              }
            }
          }
        }

        // Step 2: Process pending topics (use limit from request)
        const pendingTopics = await env.DB.prepare(`
          SELECT * FROM topics WHERE status = 'pending' ORDER BY score DESC LIMIT ?
        `).bind(topicLimit).all<Topic>();

        for (const topic of pendingTopics.results || []) {
          try {
            // Check if output already exists for this topic (avoid duplicates)
            const existingOutput = await env.DB.prepare(
              'SELECT id FROM content_outputs WHERE topic_id = ? AND target = ?'
            ).bind(topic.id, 'site').first<{ id: number }>();

            if (existingOutput) {
              console.log(`Skipping topic ${topic.keyword} - output already exists`);
              // Mark as published if output exists
              await env.DB.prepare(`
                UPDATE topics SET status = 'published', updated_at = strftime('%s', 'now') WHERE id = ?
              `).bind(topic.id).run();
              continue;
            }

            // Step 2a: Get content strategy from AI
            console.log(`Processing topic: ${topic.keyword}`);
            const strategy = await gemini.getContentStrategy(topic.keyword);
            summary.strategies_created++;

            // Save strategy to topic metadata
            const existingMetadata = topic.metadata ? JSON.parse(topic.metadata) : {};
            const updatedMetadata = {
              ...existingMetadata,
              strategy: strategy,
            };
            await env.DB.prepare(`
              UPDATE topics SET metadata = ?, status = 'processing', updated_at = strftime('%s', 'now')
              WHERE id = ?
            `).bind(JSON.stringify(updatedMetadata), topic.id).run();

            // Step 2b: Generate article with strategy (pass existing categories and tags)
            const article = await gemini.generateSiteArticle(
              topic.keyword,
              topic.locale || 'en',
              strategy,
              existingCategories,
              existingTags
            );
            summary.articles_generated++;

            // Process categories and tags
            let categoryIds: number[] = [];
            let tagIds: number[] = [];

            if (article.suggested_category) {
              const matchedCategoryId = findMatchingCategory(article.suggested_category, existingCategories);
              
              if (matchedCategoryId) {
                categoryIds = [matchedCategoryId];
              } else {
                // Create new category
                try {
                  const newCategory = await createCategory(siteConfig, {
                    name: article.suggested_category,
                    slug: generateSlug(article.suggested_category),
                  });
                  categoryIds = [newCategory.id];
                  existingCategories.push({ id: newCategory.id, name: newCategory.name, slug: newCategory.slug });
                  console.log(`Created new category: ${newCategory.name}`);
                } catch (catError) {
                  console.error('Failed to create category:', catError);
                }
              }
            }

            if (article.suggested_tags && article.suggested_tags.length > 0) {
              const matchedTagIds = findMatchingTags(article.suggested_tags, existingTags);
              
              for (const suggestedTag of article.suggested_tags) {
                const tagLower = suggestedTag.toLowerCase().trim();
                const isMatched = existingTags.some(t => 
                  t.name.toLowerCase() === tagLower || t.slug.toLowerCase() === tagLower
                );
                
                if (!isMatched) {
                  try {
                    const newTag = await createTag(siteConfig, {
                      name: suggestedTag,
                      slug: generateSlug(suggestedTag),
                    });
                    tagIds.push(newTag.id);
                    existingTags.push({ id: newTag.id, name: newTag.name, slug: newTag.slug });
                    console.log(`Created new tag: ${newTag.name}`);
                  } catch (tagError) {
                    console.error('Failed to create tag:', tagError);
                  }
                }
              }
              
              tagIds = [...tagIds, ...matchedTagIds];
            }

            // Combine SEO metadata with strategy and category/tag IDs for complete output metadata
            const outputMetadata: Record<string, unknown> = {
              ...article.metadata,
              strategy: strategy,
              suggested_category: article.suggested_category,
              suggested_tags: article.suggested_tags,
            };
            
            if (categoryIds.length > 0) {
              outputMetadata.category_ids = categoryIds;
            }
            if (tagIds.length > 0) {
              outputMetadata.tag_ids = tagIds;
            }

            // Save content output (job_id is NULL for pipeline-created outputs)
            const outputResult = await env.DB.prepare(`
              INSERT INTO content_outputs (job_id, topic_id, target, title, body, metadata, status, created_at, updated_at)
              VALUES (NULL, ?, 'site', ?, ?, ?, 'ready', strftime('%s', 'now'), strftime('%s', 'now'))
            `).bind(
              topic.id,
              article.title,
              article.body,
              JSON.stringify(outputMetadata)
            ).run();
            const outputId = outputResult.meta.last_row_id;

            // Step 2c: Publish to Site API
            try {
              const publishResult = await publishToSite(
                { siteId, apiKey: siteApiKey },
                {
                  title: article.title,
                  slug: outputMetadata.slug as string,
                  content: article.body,
                  status: 'published',
                  seo_title: outputMetadata.seo_title as string,
                  seo_description: outputMetadata.seo_description as string,
                  seo_keywords: outputMetadata.seo_keywords as string,
                  author_id: 1,
                  category_ids: categoryIds.length > 0 ? categoryIds : undefined,
                  tag_ids: tagIds.length > 0 ? tagIds : undefined,
                }
              );

              // Save publish record
              await env.DB.prepare(`
                INSERT INTO publishes (output_id, platform, status, remote_id, url, published_at, created_at, updated_at)
                VALUES (?, 'site', 'published', ?, ?, strftime('%s', 'now'), strftime('%s', 'now'), strftime('%s', 'now'))
              `).bind(outputId, publishResult.id, publishResult.url).run();

              // Update content output status
              await env.DB.prepare(`
                UPDATE content_outputs SET status = 'published' WHERE id = ?
              `).bind(outputId).run();

              // Update topic status
              await env.DB.prepare(`
                UPDATE topics SET status = 'published', updated_at = strftime('%s', 'now') WHERE id = ?
              `).bind(topic.id).run();

              summary.articles_published++;
              console.log(`Published: ${topic.keyword} -> ${publishResult.url}`);
            } catch (publishError) {
              console.error(`Publish error for ${topic.keyword}:`, publishError);
              summary.errors++;
              summary.error_details.push(`Publish failed for "${topic.keyword}": ${String(publishError)}`);
              
              // Mark topic as failed
              await env.DB.prepare(`
                UPDATE topics SET status = 'failed', updated_at = strftime('%s', 'now') WHERE id = ?
              `).bind(topic.id).run();
            }
          } catch (topicError) {
            console.error(`Topic error for ${topic.keyword}:`, topicError);
            summary.errors++;
            summary.error_details.push(`Failed processing "${topic.keyword}": ${String(topicError)}`);
            
            // Mark topic as failed
            await env.DB.prepare(`
              UPDATE topics SET status = 'failed', updated_at = strftime('%s', 'now') WHERE id = ?
            `).bind(topic.id).run();
          }
        }

        return addCorsHeaders(successResponse(summary));
      }

      // Test site connection
      if (path === '/api/settings/test-site-connection' && method === 'POST') {
        const siteApiKey = await getSetting(env.DB, 'site_api_key');
        const siteId = await getSetting(env.DB, 'site_id');

        if (!siteApiKey || !siteId) {
          return addCorsHeaders(successResponse({ connected: false, error: 'Site API key or ID not configured' }));
        }

        const connected = await testSiteConnection({ siteId, apiKey: siteApiKey });
        return addCorsHeaders(successResponse({ connected }));
      }
    }

    throw new NotFoundError('Route');
  } catch (error) {
    return addCorsHeaders(errorResponse(error));
  }
}

// Add CORS headers to response
function addCors(response: Response, origin?: string | null): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(origin))) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
};

