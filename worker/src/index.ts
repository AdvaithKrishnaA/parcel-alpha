import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { generateId } from '@app/crypto';

type Bindings = {
  BUCKET: R2Bucket;
  DEFAULT_EXPIRY: number | string;
  MAX_BUNDLE_SIZE: number | string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

// POST /create - create a shared bundle
app.post('/create', async (c) => {
  try {
    const { payload, max_views, expires_in_ms } = await c.req.json();
    if (!payload) return c.json({ error: 'Payload missing' }, 400);

    const payloadStr = JSON.stringify(payload);
    const maxSize = Number(c.env.MAX_BUNDLE_SIZE) || 102400;

    // Check max size
    if (new Blob([payloadStr]).size > maxSize) {
      return c.json({ error: 'Payload too large' }, 413);
    }

    const id = generateId(10);
    const defaultExpiry = Number(c.env.DEFAULT_EXPIRY) || 604800000;

    // Enforce expiry constraint
    const expiryOffset = expires_in_ms ? Math.min(expires_in_ms, defaultExpiry) : defaultExpiry;
    const expiresAt = Date.now() + expiryOffset;

    const record = {
      id,
      expires_at: expiresAt,
      max_views: max_views || null,
      views: 0,
      payload: payload
    };

    // Store in a single object in R2 per strict rule
    await c.env.BUCKET.put(`share/${id}`, JSON.stringify(record));

    return c.json({ id });
  } catch (e) {
    return c.json({ error: 'Invalid request' }, 400);
  }
});

// GET /:id - get a shared bundle
app.get('/:id', async (c) => {
  const id = c.req.param('id');

  const obj = await c.env.BUCKET.get(`share/${id}`);
  if (!obj) return c.json({ error: 'Not found' }, 404);

  const text = await obj.text();
  const record = JSON.parse(text);

  // Expiry check
  if (record.expires_at && Date.now() > record.expires_at) {
    return c.json({ error: 'Expired' }, 410);
  }

  // Views check
  if (record.max_views !== null && record.views >= record.max_views) {
    return c.json({ error: 'View limit exceeded' }, 410);
  }

  // Increment views
  record.views += 1;
  await c.env.BUCKET.put(`share/${id}`, JSON.stringify(record));

  // Return just the payload portion, since that is what the client expects
  return c.json(record.payload, 200);
});

// PUT /sync - sync user state
app.put('/sync', async (c) => {
  try {
    const { user_id, payload } = await c.req.json();
    if (!user_id || !payload) return c.json({ error: 'Missing params' }, 400);

    const maxSize = Number(c.env.MAX_BUNDLE_SIZE) || 102400;

    // Check max size
    if (new Blob([payload]).size > maxSize) {
      return c.json({ error: 'Payload too large' }, 413);
    }

    // Conflict: last write wins, so we just overwrite the R2 object
    await c.env.BUCKET.put(`sync/${user_id}`, payload);
    return c.json({ ok: true });
  } catch(e) {
    return c.json({ error: 'Invalid request' }, 400);
  }
});

// GET /sync/:user_id - load user state
app.get('/sync/:user_id', async (c) => {
  const userId = c.req.param('user_id');

  const obj = await c.env.BUCKET.get(`sync/${userId}`);
  if (!obj) return c.json({ error: 'Not found' }, 404);

  const payload = await obj.text();
  return c.text(payload, 200, { 'Content-Type': 'application/json' });
});

export default app;
