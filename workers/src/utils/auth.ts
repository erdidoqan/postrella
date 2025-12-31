/**
 * Authentication utilities for Workers
 */

export interface Session {
  userId: string;
  email: string;
  createdAt: number;
  expiresAt: number;
}

// Simple session cookie parsing
export function parseSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const sessionCookie = cookies.find(c => c.startsWith('session='));
  
  if (!sessionCookie) return null;
  
  return sessionCookie.split('=')[1];
}

// Session validation (simplified for MVP)
export async function validateSession(
  sessionToken: string,
  secret: string
): Promise<Session | null> {
  try {
    // For MVP, we use a simple token format: base64(JSON)
    // In production, use proper JWT or signed cookies
    const decoded = atob(sessionToken);
    const session = JSON.parse(decoded) as Session;
    
    if (session.expiresAt < Date.now()) {
      return null;
    }
    
    return session;
  } catch {
    return null;
  }
}

// Create session token
export function createSessionToken(session: Omit<Session, 'createdAt' | 'expiresAt'>): string {
  const fullSession: Session = {
    ...session,
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  
  return btoa(JSON.stringify(fullSession));
}

// Set session cookie
export function setSessionCookie(token: string, response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set(
    'Set-Cookie',
    `session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
  );
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Clear session cookie
export function clearSessionCookie(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set(
    'Set-Cookie',
    'session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
  );
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://postrella.vercel.app',
  'https://postrella.com',
  'https://www.postrella.com',
  'https://postrella-digitexa.vercel.app',
];

// CORS headers for cross-origin requests
export function corsHeaders(requestOrigin?: string | null): Record<string, string> {
  // Check if request origin is allowed, default to first allowed origin
  const origin = requestOrigin && ALLOWED_ORIGINS.some(o => requestOrigin.startsWith(o.replace(/:\d+$/, ''))) 
    ? requestOrigin 
    : ALLOWED_ORIGINS[0];
  
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Handle CORS preflight
export function handleCors(request: Request): Response | null {
  const origin = request.headers.get('Origin');
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }
  return null;
}

// Get request origin for CORS
export function getRequestOrigin(request: Request): string | null {
  return request.headers.get('Origin');
}

