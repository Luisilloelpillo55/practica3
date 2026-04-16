import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import cors from 'cors';

// avoid import.meta which isn't allowed under our tsconfig module settings
const browserDistFolder = join(process.cwd(), 'browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Middleware
app.use(cors());
app.use(express.json());

// Proxy API routes to the API Gateway so SSR can fetch data server-side.
// Uses the environment GATEWAY_URL or defaults to http://localhost:3008
app.use('/api', async (req, res) => {
  const gatewayBase = process.env['GATEWAY_URL'] || `http://localhost:${process.env['GATEWAY_PORT'] || 3008}`;
  const target = `${gatewayBase}${req.originalUrl}`;
  console.log(`[SSR Proxy] Forwarding ${req.method} ${req.originalUrl} -> ${target}`);

  try {
    // Clone headers and remove host to avoid mismatches
    const forwardHeaders: any = { ...req.headers };
    delete forwardHeaders.host;

    const fetchOptions: any = {
      method: req.method,
      headers: forwardHeaders,
      // Allow credentials if present
      redirect: 'follow'
    };

    // Attach body for non-GET requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      // req.body is already parsed by express.json()
      if (req.body && Object.keys(req.body).length > 0) {
        fetchOptions.body = JSON.stringify(req.body);
        fetchOptions.headers = fetchOptions.headers || {};
        if (!fetchOptions.headers['content-type']) fetchOptions.headers['content-type'] = 'application/json';
      }
    }

    const backendRes = await fetch(target, fetchOptions as any);

    // Forward status
    res.statusCode = backendRes.status;

    // Forward headers
    backendRes.headers.forEach((value, key) => {
      // Some hop-by-hop headers should not be forwarded; keep it simple
      if (key.toLowerCase() === 'transfer-encoding') return;
      res.setHeader(key, value as string);
    });

    // Stream/forward body
    const arrayBuffer = await backendRes.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
    return;
  } catch (err: any) {
    console.error('[SSR Proxy Error]', err);
    res.status(503).json({ 
      error: 'API Gateway unavailable', 
      message: `Could not proxy to API Gateway at ${gatewayBase}`,
      details: err?.message || String(err)
    });
    return;
  }
});

// NOTE: API routes are handled by the microservices architecture (Gateway on port 3008)
// This SSR server only serves the Angular frontend

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
// server startup is intentionally separated from the module evaluation so
// the SSR build (and `ng serve`) can import this file without executing
// any runtime checks involving `module`/`require` (which are undefined
// during Vite's ESM evaluation).
//
// To start the server manually, call `startServer()` or set the
// START_SERVER environment variable when running node/ts-node.

export function startServer() {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

if (process.env['START_SERVER']) {
  startServer();
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
