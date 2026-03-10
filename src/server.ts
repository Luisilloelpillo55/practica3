import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import cors from 'cors';
import usersRouter from './api/users.js';
import groupsRouter from './api/groups.js';
import ticketsRouter from './api/tickets.js';

// avoid import.meta which isn't allowed under our tsconfig module settings
const browserDistFolder = join(process.cwd(), 'browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Middleware for API
app.use(cors());
app.use(express.json());

// Mount API routes before the Angular renderer
app.use('/api/users', usersRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/tickets', ticketsRouter);

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
