/**
 * Authentication Routes
 */

import { Hono } from 'hono';
import type { Env } from '../../types';

export const authRoutes = new Hono<{ Bindings: Env }>();

/**
 * Generate JWT token
 */
async function generateToken(
  payload: { user_id: string; email: string; role: 'user' | 'admin' },
  secret: string,
  expiresIn = 86400
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);

  const jwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(jwtPayload));

  const encoder = new TextEncoder();
  const data = encoder.encode(`${encodedHeader}.${encodedPayload}`);
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, data);
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/**
 * POST /auth/register - Register new user
 */
authRoutes.post('/register', async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    if (!email || !password) {
      return c.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Email and password required' },
        },
        400
      );
    }

    // Check if user exists
    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first();

    if (existing) {
      return c.json(
        {
          success: false,
          error: { code: 'USER_EXISTS', message: 'User already exists' },
        },
        400
      );
    }

    // Hash password (simplified - use bcrypt in production)
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const passwordHash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));

    // Create user
    const userId = `user-${Date.now()}`;
    await c.env.DB.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(userId, email, passwordHash, name || null, 'user', Date.now(), Date.now())
      .run();

    // Generate token
    const token = await generateToken({ user_id: userId, email, role: 'user' }, c.env.JWT_SECRET);

    return c.json({
      success: true,
      data: {
        user: { id: userId, email, name, role: 'user' },
        token,
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'REGISTRATION_ERROR', message: (error as Error).message },
      },
      500
    );
  }
});

/**
 * POST /auth/login - User login
 */
authRoutes.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Email and password required' },
        },
        400
      );
    }

    // Find user
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

    if (!user) {
      return c.json(
        {
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        },
        401
      );
    }

    // Verify password
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const passwordHash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));

    if (passwordHash !== user.password_hash) {
      return c.json(
        {
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        },
        401
      );
    }

    // Update last login
    await c.env.DB.prepare('UPDATE users SET last_login_at = ? WHERE id = ?')
      .bind(Date.now(), user.id)
      .run();

    // Generate token
    const token = await generateToken(
      { user_id: user.id as string, email: user.email as string, role: user.role as 'user' | 'admin' },
      c.env.JWT_SECRET
    );

    return c.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'LOGIN_ERROR', message: (error as Error).message },
      },
      500
    );
  }
});

/**
 * POST /auth/refresh - Refresh token
 */
authRoutes.post('/refresh', async (c) => {
  try {
    const { refresh_token: _refresh_token } = await c.req.json();

    // Verify refresh token (simplified)
    // In production, store refresh tokens in database

    return c.json({
      success: true,
      data: {
        token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'REFRESH_ERROR', message: (error as Error).message },
      },
      500
    );
  }
});
