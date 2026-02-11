import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import dotenv from 'dotenv';

dotenv.config();
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { router as apiRouter } from './routes/index.js';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

app.get('/health', (c) => c.json({ status: 'ok' }));

app.route('/api', apiRouter);

const port = Number(process.env.PORT) || 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port
});
