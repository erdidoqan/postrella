/**
 * Pinterest Publisher
 * Uses Pinterest API v5 with OAuth 2.0
 */

export interface PinterestPublishConfig {
  accessToken: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}

export interface PinterestPinData {
  board_id: string;
  title: string;
  description?: string;
  link: string;
  media_source: {
    source_type: 'image_url';
    url: string;
  };
}

export interface PinterestBoard {
  id: string;
  name: string;
  description?: string;
  privacy: 'PUBLIC' | 'PROTECTED' | 'SECRET';
}

export interface PinterestUser {
  id: string;
  username: string;
}

const PINTEREST_API_BASE = 'https://api.pinterest.com/v5';
const PINTEREST_AUTH_BASE = 'https://www.pinterest.com/oauth';

export async function publishToPinterest(
  config: PinterestPublishConfig,
  pinData: PinterestPinData,
  retried: boolean = false
): Promise<{ id: string; url: string }> {
  const url = `${PINTEREST_API_BASE}/pins`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.accessToken}`,
      'User-Agent': 'Postrella/1.0',
    },
    body: JSON.stringify({
      board_id: pinData.board_id,
      title: pinData.title,
      description: pinData.description,
      link: pinData.link,
      media_source: pinData.media_source,
    }),
  });

  if (!response.ok) {
    if (response.status === 401 && !retried) {
      // Token expired, try to refresh (only once)
      const newToken = await refreshPinterestToken(config);
      if (newToken) {
        // Retry with new token, mark as retried
        return publishToPinterest({ ...config, accessToken: newToken }, pinData, true);
      }
    }
    const error = await response.text();
    throw new Error(`Pinterest API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as { id: string; link: string };

  if (!data.id) {
    throw new Error('Failed to create Pinterest pin');
  }

  return {
    id: data.id,
    url: data.link || `https://pinterest.com/pin/${data.id}`,
  };
}

export async function refreshPinterestToken(
  config: PinterestPublishConfig
): Promise<string | null> {
  const url = `${PINTEREST_API_BASE}/oauth/token`;

  // Pinterest requires Basic Auth with client_id:client_secret
  const auth = btoa(`${config.clientId}:${config.clientSecret}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${auth}`,
      'User-Agent': 'Postrella/1.0',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: config.refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    console.error('Failed to refresh Pinterest token');
    return null;
  }

  const data = await response.json() as { access_token?: string };
  return data.access_token || null;
}

export function getPinterestAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'user_accounts:read,boards:read,boards:write,pins:read,pins:write',
    state: state,
  });

  return `${PINTEREST_AUTH_BASE}?${params.toString()}`;
}

export async function exchangePinterestCode(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const url = `${PINTEREST_API_BASE}/oauth/token`;

  // Pinterest requires Basic Auth with client_id:client_secret
  const auth = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${auth}`,
      'User-Agent': 'Postrella/1.0',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange Pinterest code: ${error}`);
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

export async function getPinterestUser(accessToken: string): Promise<PinterestUser> {
  const response = await fetch(`${PINTEREST_API_BASE}/user_account`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'Postrella/1.0',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Pinterest user: ${error}`);
  }

  const data = await response.json() as { id: string; username: string };
  return { id: data.id, username: data.username };
}

export async function fetchPinterestBoards(
  config: PinterestPublishConfig,
  retried: boolean = false
): Promise<PinterestBoard[]> {
  const url = `${PINTEREST_API_BASE}/boards`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'User-Agent': 'Postrella/1.0',
    },
  });

  if (!response.ok) {
    if (response.status === 401 && !retried) {
      // Token expired, try to refresh (only once)
      const newToken = await refreshPinterestToken(config);
      if (newToken) {
        // Retry with new token, mark as retried
        return fetchPinterestBoards({ ...config, accessToken: newToken }, true);
      }
    }
    const error = await response.text();
    throw new Error(`Pinterest API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as { items: PinterestBoard[] };
  return data.items || [];
}

export interface CreateBoardData {
  name: string;
  description?: string;
  privacy?: 'PUBLIC' | 'PROTECTED' | 'SECRET';
}

export async function createPinterestBoard(
  config: PinterestPublishConfig,
  boardData: CreateBoardData,
  retried: boolean = false
): Promise<PinterestBoard> {
  const url = `${PINTEREST_API_BASE}/boards`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.accessToken}`,
      'User-Agent': 'Postrella/1.0',
    },
    body: JSON.stringify({
      name: boardData.name,
      description: boardData.description || '',
      privacy: boardData.privacy || 'PUBLIC',
    }),
  });

  if (!response.ok) {
    if (response.status === 401 && !retried) {
      // Token expired, try to refresh (only once)
      const newToken = await refreshPinterestToken(config);
      if (newToken) {
        // Retry with new token, mark as retried
        return createPinterestBoard({ ...config, accessToken: newToken }, boardData, true);
      }
    }
    const error = await response.text();
    throw new Error(`Pinterest API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as PinterestBoard;
  return data;
}
