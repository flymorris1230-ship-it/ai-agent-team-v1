/**
 * Authentication Middleware
 */

import { Context, Next } from 'hono';
import type { Env } from '../../types';

export interface JWTPayload {
  user_id: string;
  email: string;
  role: 'user' | 'admin';
  exp: number;
}

/**
 * Verify JWT token
 */
export async function verifyToken(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    // Simple JWT verification (in production, use a proper JWT library)
    const [header, payload, signature] = token.split('.');

    if (!header || !payload || !signature) {
      return null;
    }

    // Decode payload
    const decodedPayload = JSON.parse(atob(payload)) as JWTPayload;

    // Check expiration
    if (decodedPayload.exp * 1000 < Date.now()) {
      return null;
    }

    // Verify signature (simplified - use proper crypto in production)
    const encoder = new TextEncoder();
    const data = encoder.encode(`${header}.${payload}`);
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBuffer = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, signatureBuffer, data);

    if (!valid) {
      return null;
    }

    return decodedPayload;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

/**
 * Authentication middleware
 */
export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
        },
      },
      401
    );
  }

  const token = authHeader.substring(7);
  const payload = await verifyToken(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
        },
      },
      401
    );
  }

  // Attach user info to context
  c.set('user', payload);

  await next();
}

/**
 * Admin-only middleware
 */
export async function adminOnly(c: Context<{ Bindings: Env }>, next: Next) {
  const user = c.get('user') as JWTPayload;

  if (!user || user.role !== 'admin') {
    return c.json(
      {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required',
        },
      },
      403
    );
  }

  await next();
}
