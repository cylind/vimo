import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';

type Bindings = {
  CONFIG_BUCKET: R2Bucket;
  CONFIG_KV: KVNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/', async (c) => {
  const token = c.req.param('token');
  const storedToken = await c.env.CONFIG_KV.get('API_TOKEN');
  if (token !== storedToken) return c.json({ error: 'Unauthorized' }, 401);
  const key = c.req.param('key');
  const object = await c.env.CONFIG_BUCKET.get(key);
  if (!object) return c.json({ error: 'File not found' }, 404);
  return c.body(await object.text(), 200, {
    'Content-Type': 'text/plain',
    'Content-Disposition': `attachment; filename="${key}"`,
  });
});

export const onRequest = handle(app);