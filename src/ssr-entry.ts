// Minimal SSR entry used by the Angular/Vite dev SSR middleware.
// It re-exports the `reqHandler` from `server.ts` without starting the server.
import { reqHandler } from './server';
export { reqHandler };
