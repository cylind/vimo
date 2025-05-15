import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';

type Bindings = {
  CONFIG_BUCKET: R2Bucket;
  CONFIG_KV: KVNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

app.post('/api/validate-token', async (c) => {
  const { token } = await c.req.json();
  const storedToken = await c.env.CONFIG_KV.get('API_TOKEN');
  return c.json({ valid: token === storedToken });
});

app.get('/api/files', async (c) => {
  const token = c.req.header('X-API-Token');
  const storedToken = await c.env.CONFIG_KV.get('API_TOKEN');
  if (token !== storedToken) return c.json({ error: 'Unauthorized' }, 401);
  const list = await c.env.CONFIG_BUCKET.list();
  const files = list.objects.map(obj => obj.key);
  return c.json({ files });
});

app.get('/api/file/:key', async (c) => {
  const token = c.req.header('X-API-Token');
  const storedToken = await c.env.CONFIG_KV.get('API_TOKEN');
  if (token !== storedToken) return c.json({ error: 'Unauthorized' }, 401);
  const key = c.req.param('key');
  const object = await c.env.CONFIG_BUCKET.get(key);
  if (!object) return c.json({ error: 'File not found' }, 404);
  const content = await object.text();
  return c.json({ content });
});

app.put('/api/file', async (c) => {
  const token = c.req.header('X-API-Token');
  const storedToken = await c.env.CONFIG_KV.get('API_TOKEN');
  if (token !== storedToken) return c.json({ error: 'Unauthorized' }, 401);
  const { file, content } = await c.req.json();
  await c.env.CONFIG_BUCKET.put(file, content);
  return c.json({ success: true });
});

app.delete('/api/file/:key', async (c) => {
  const token = c.req.header('X-API-Token');
  const storedToken = await c.env.CONFIG_KV.get('API_TOKEN');
  if (token !== storedToken) return c.json({ error: 'Unauthorized' }, 401);
  const key = c.req.param('key');
  await c.env.CONFIG_BUCKET.delete(key);
  return c.json({ success: true });
});

app.post('/api/rename', async (c) => {
  const token = c.req.header('X-API-Token');
  const storedToken = await c.env.CONFIG_KV.get('API_TOKEN');
  if (token !== storedToken) return c.json({ error: 'Unauthorized' }, 401);
  const { oldName, newName } = await c.req.json();
  const object = await c.env.CONFIG_BUCKET.get(oldName);
  if (!object) return c.json({ error: 'File not found' }, 404);
  await c.env.CONFIG_BUCKET.put(newName, await object.text());
  await c.env.CONFIG_BUCKET.delete(oldName);
  return c.json({ success: true });
});

app.get('/:token/:key', async (c) => {
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