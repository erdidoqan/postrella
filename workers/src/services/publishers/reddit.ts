/**
 * Reddit Publisher
 * Uses Reddit API with OAuth 2.0
 */

export interface RedditPublishConfig {
  accessToken: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}

export interface RedditPostData {
  subreddit: string;
  title: string;
  text?: string;
  url?: string;
  kind: 'self' | 'link';
}

export interface RedditApiResponse {
  json?: {
    data?: {
      id: string;
      name: string;
      url: string;
    };
    errors?: string[][];
  };
  error?: string;
}

const REDDIT_API_BASE = 'https://oauth.reddit.com';
const REDDIT_AUTH_BASE = 'https://www.reddit.com/api/v1';

export async function publishToReddit(
  config: RedditPublishConfig,
  postData: RedditPostData
): Promise<{ id: string; url: string }> {
  const url = `${REDDIT_API_BASE}/api/submit`;

  const formData = new URLSearchParams({
    sr: postData.subreddit,
    title: postData.title,
    kind: postData.kind,
    api_type: 'json',
    ...(postData.kind === 'self' && postData.text && { text: postData.text }),
    ...(postData.kind === 'link' && postData.url && { url: postData.url }),
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${config.accessToken}`,
      'User-Agent': 'Postrella/1.0',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired, try to refresh
      const newToken = await refreshRedditToken(config);
      if (newToken) {
        // Retry with new token
        return publishToReddit({ ...config, accessToken: newToken }, postData);
      }
    }
    const error = await response.text();
    throw new Error(`Reddit API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as RedditApiResponse;

  if (data.json?.errors?.length) {
    throw new Error(data.json.errors[0].join(': '));
  }

  if (!data.json?.data) {
    throw new Error('Failed to post to Reddit');
  }

  return {
    id: data.json.data.id,
    url: data.json.data.url || `https://reddit.com${data.json.data.url}`,
  };
}

export async function refreshRedditToken(
  config: RedditPublishConfig
): Promise<string | null> {
  const url = `${REDDIT_AUTH_BASE}/access_token`;
  
  const auth = btoa(`${config.clientId}:${config.clientSecret}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
      'User-Agent': 'Postrella/1.0',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: config.refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    console.error('Failed to refresh Reddit token');
    return null;
  }

  const data = await response.json() as { access_token?: string };
  return data.access_token || null;
}

export function getRedditAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    state: state,
    redirect_uri: redirectUri,
    duration: 'permanent',
    scope: 'submit read identity',
  });

  return `${REDDIT_AUTH_BASE}/authorize?${params.toString()}`;
}

export async function exchangeRedditCode(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const url = `${REDDIT_AUTH_BASE}/access_token`;
  
  const auth = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
      'User-Agent': 'Postrella/1.0',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange Reddit code');
  }

  const data = await response.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function getRedditUser(accessToken: string): Promise<{ id: string; name: string }> {
  const response = await fetch(`${REDDIT_API_BASE}/api/v1/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'Postrella/1.0',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get Reddit user');
  }

  const data = await response.json() as { id: string; name: string };
  return { id: data.id, name: data.name };
}

