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

// Block API routes - they should go to the Gateway (port 3008)
app.use('/api', (req, res) => {
  console.warn(`[SSR] API request blocked: ${req.method} ${req.path}`);
  res.status(503).json({ 
    error: 'API Gateway unavailable', 
    message: 'Please ensure the API Gateway is running on port 3008',
    hint: 'Run: npm run start:gateway'
  });
  return;
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
