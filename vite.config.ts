import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import assessmentsHandler from './api/assessments';
import locksHandler from './api/locks';

function apiDevPlugin(): Plugin {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        
        if (url.pathname === '/api/assessments') {
          // Parse query
          const query: Record<string, string> = {};
          url.searchParams.forEach((v, k) => { query[k] = v; });
          req.query = query;

          // Parse body if POST/PUT
          if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            let bodyStr = '';
            for await (const chunk of req) {
              bodyStr += chunk;
            }
            try {
              req.body = JSON.parse(bodyStr);
            } catch {
              req.body = bodyStr;
            }
          }

          // Mock helper methods for Express/Vercel compat
          res.status = (code: number) => {
            res.statusCode = code;
            return res;
          };
          res.json = (data: any) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
            return res;
          };

          try {
            await assessmentsHandler(req, res);
          } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }

        if (url.pathname === '/api/locks') {
          const query: Record<string, string> = {};
          url.searchParams.forEach((v, k) => { query[k] = v; });
          req.query = query;

          if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            let bodyStr = '';
            for await (const chunk of req) {
              bodyStr += chunk;
            }
            try {
              req.body = JSON.parse(bodyStr);
            } catch {
              req.body = bodyStr;
            }
          }

          res.status = (code: number) => {
            res.statusCode = code;
            return res;
          };
          res.json = (data: any) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
            return res;
          };

          try {
            await locksHandler(req, res);
          } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiDevPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
