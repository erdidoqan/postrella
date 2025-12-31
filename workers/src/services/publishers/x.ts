/**
 * X (Twitter) Publisher
 * Uses Twitter API v2 with OAuth 1.0a
 */

export interface XPublishConfig {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

export interface XPostData {
  text: string;
  reply_to?: string;
}

export interface XApiResponse {
  data?: {
    id: string;
    text: string;
  };
  errors?: { message: string; code: number }[];
}

const X_API_BASE = 'https://api.twitter.com/2';

// Simple OAuth 1.0a signature generation
// In production, use a proper OAuth library
function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  // Simplified - in production use proper HMAC-SHA1
  const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(
    Object.entries(params)
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join('&')
  )}`;
  
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  
  // This is a placeholder - use proper crypto in production
  return btoa(baseString + signingKey).slice(0, 43) + '=';
}

function generateOAuthHeader(
  method: string,
  url: string,
  config: XPublishConfig
): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Math.random().toString(36).substring(2) + timestamp;

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: config.consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: config.accessToken,
    oauth_version: '1.0',
  };

  const signature = generateOAuthSignature(
    method,
    url,
    oauthParams,
    config.consumerSecret,
    config.accessTokenSecret
  );

  oauthParams.oauth_signature = signature;

  const header = Object.entries(oauthParams)
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(', ');

  return `OAuth ${header}`;
}

export async function publishToX(
  config: XPublishConfig,
  postData: XPostData
): Promise<{ id: string; url: string }> {
  const url = `${X_API_BASE}/tweets`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: generateOAuthHeader('POST', url, config),
    },
    body: JSON.stringify({
      text: postData.text,
      ...(postData.reply_to && {
        reply: { in_reply_to_tweet_id: postData.reply_to },
      }),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`X API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as XApiResponse;

  if (data.errors?.length) {
    throw new Error(data.errors[0].message);
  }

  if (!data.data) {
    throw new Error('Failed to post to X');
  }

  return {
    id: data.data.id,
    url: `https://twitter.com/i/status/${data.data.id}`,
  };
}

// OAuth 1.0a flow helpers
export function getXAuthUrl(
  consumerKey: string,
  callbackUrl: string
): string {
  // Step 1: Get request token
  // This is simplified - use proper OAuth flow in production
  const params = new URLSearchParams({
    oauth_callback: callbackUrl,
  });
  
  return `https://api.twitter.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeXToken(
  consumerKey: string,
  consumerSecret: string,
  oauthToken: string,
  oauthVerifier: string
): Promise<{ accessToken: string; accessTokenSecret: string; userId: string; screenName: string }> {
  const url = 'https://api.twitter.com/oauth/access_token';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      oauth_token: oauthToken,
      oauth_verifier: oauthVerifier,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange X token');
  }

  const text = await response.text();
  const params = new URLSearchParams(text);

  return {
    accessToken: params.get('oauth_token') || '',
    accessTokenSecret: params.get('oauth_token_secret') || '',
    userId: params.get('user_id') || '',
    screenName: params.get('screen_name') || '',
  };
}

