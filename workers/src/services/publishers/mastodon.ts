/**
 * Mastodon Publisher
 * Uses Mastodon API with OAuth 2.0
 * Supports dynamic instance registration
 */

export interface MastodonPublishConfig {
  instanceUrl: string;
  accessToken: string;
  // Note: Mastodon doesn't use refresh tokens in the same way as Pinterest
  // Tokens are long-lived, but we store client credentials for re-authentication
  clientId: string;
  clientSecret: string;
}

export interface MastodonStatusData {
  status: string;
  visibility?: 'public' | 'unlisted' | 'private' | 'direct';
  media_ids?: string[];
  spoiler_text?: string;
  in_reply_to_id?: string;
}

export interface MastodonUser {
  id: string;
  username: string;
  acct: string;
  display_name?: string;
  avatar?: string;
}

export interface MastodonApp {
  id: string;
  name: string;
  website?: string;
  redirect_uri: string;
  client_id: string;
  client_secret: string;
  vapid_key?: string;
}

export interface MastodonMediaAttachment {
  id: string;
  type: 'image' | 'video' | 'gifv' | 'audio' | 'unknown';
  url: string;
  preview_url: string;
  remote_url?: string;
  text_url?: string;
  description?: string;
  blurhash?: string;
}

/**
 * Register a new application with a Mastodon instance
 */
export async function registerMastodonApp(
  instanceUrl: string,
  redirectUri: string,
  appName: string = 'Postrella'
): Promise<MastodonApp> {
  // Normalize instance URL (remove trailing slash)
  const baseUrl = instanceUrl.replace(/\/$/, '');
  const url = `${baseUrl}/api/v1/apps`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Postrella/1.0',
    },
    body: JSON.stringify({
      client_name: appName,
      redirect_uris: redirectUri,
      scopes: 'read:accounts write:statuses write:media',
      website: 'https://postrella.vercel.app',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to register Mastodon app: ${response.status} - ${error}`);
  }

  const data = await response.json() as MastodonApp;
  return data;
}

/**
 * Get OAuth authorization URL
 */
export function getMastodonAuthUrl(
  instanceUrl: string,
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const baseUrl = instanceUrl.replace(/\/$/, '');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'read:accounts write:statuses write:media',
    state: state,
  });

  return `${baseUrl}/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeMastodonCode(
  instanceUrl: string,
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; tokenType: string; scope: string; createdAt: number }> {
  const baseUrl = instanceUrl.replace(/\/$/, '');
  const url = `${baseUrl}/oauth/token`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Postrella/1.0',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange Mastodon code: ${error}`);
  }

  const data = await response.json() as {
    access_token: string;
    token_type: string;
    scope: string;
    created_at: number;
  };

  return {
    accessToken: data.access_token,
    tokenType: data.token_type,
    scope: data.scope,
    createdAt: data.created_at,
  };
}

/**
 * Get authenticated user information
 */
export async function getMastodonUser(
  instanceUrl: string,
  accessToken: string
): Promise<MastodonUser> {
  const baseUrl = instanceUrl.replace(/\/$/, '');
  const url = `${baseUrl}/api/v1/accounts/verify_credentials`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'Postrella/1.0',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Mastodon user: ${error}`);
  }

  const data = await response.json() as MastodonUser;
  return data;
}

/**
 * Upload media to Mastodon
 * Returns media_id to be used in status creation
 */
export async function uploadMastodonMedia(
  config: MastodonPublishConfig,
  imageUrl: string,
  description?: string
): Promise<string> {
  const baseUrl = config.instanceUrl.replace(/\/$/, '');
  const url = `${baseUrl}/api/v2/media`;

  // First, fetch the image
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image from URL: ${imageResponse.status}`);
  }

  const imageBlob = await imageResponse.blob();
  const formData = new FormData();
  formData.append('file', imageBlob, 'image.jpg');
  if (description) {
    formData.append('description', description);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'User-Agent': 'Postrella/1.0',
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload Mastodon media: ${response.status} - ${error}`);
  }

  const data = await response.json() as MastodonMediaAttachment;
  
  // If media is still processing, wait a bit and check status
  if (data.id && !data.url) {
    // Media is processing, wait and retry
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check media status
    const statusUrl = `${baseUrl}/api/v1/media/${data.id}`;
    const statusResponse = await fetch(statusUrl, {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'User-Agent': 'Postrella/1.0',
      },
    });

    if (statusResponse.ok) {
      const statusData = await statusResponse.json() as MastodonMediaAttachment;
      if (statusData.url) {
        return statusData.id;
      }
    }
  }

  return data.id;
}

/**
 * Publish a status (toot) to Mastodon
 */
export async function publishToMastodon(
  config: MastodonPublishConfig,
  statusData: MastodonStatusData,
  retried: boolean = false
): Promise<{ id: string; url: string }> {
  const baseUrl = config.instanceUrl.replace(/\/$/, '');
  const url = `${baseUrl}/api/v1/statuses`;

  const body: Record<string, unknown> = {
    status: statusData.status,
    visibility: statusData.visibility || 'public',
  };

  if (statusData.media_ids && statusData.media_ids.length > 0) {
    body.media_ids = statusData.media_ids;
  }

  if (statusData.spoiler_text) {
    body.spoiler_text = statusData.spoiler_text;
  }

  if (statusData.in_reply_to_id) {
    body.in_reply_to_id = statusData.in_reply_to_id;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.accessToken}`,
      'User-Agent': 'Postrella/1.0',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 401 && !retried) {
      // Token might be expired, but Mastodon tokens are long-lived
      // This is more likely an invalid token or revoked access
      const error = await response.text();
      throw new Error(`Mastodon API error: ${response.status} - ${error}`);
    }
    const error = await response.text();
    throw new Error(`Mastodon API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as {
    id: string;
    url: string;
    uri: string;
  };

  if (!data.id) {
    throw new Error('Failed to create Mastodon status');
  }

  return {
    id: data.id,
    url: data.url || data.uri || `${baseUrl}/@${config.instanceUrl.split('//')[1]?.split('/')[0]}/statuses/${data.id}`,
  };
}

