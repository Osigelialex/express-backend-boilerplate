import helmet from "helmet";
import { Express } from "express";

/**
 * Security headers for a JSON API. Helmet's defaults already cover the
 * important ones (HSTS, nosniff, frameguard, no-referrer, CSP...). If you also
 * serve HTML from this app, customise `contentSecurityPolicy` here.
 */
export const setupSecurityHeaders = (app: Express) => {
  // Don't advertise the framework.
  app.disable("x-powered-by");

  app.use(
    helmet({
      // API consumed from another origin (your frontend): allow it to read
      // responses, CORS (see app.ts) decides which origins may.
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
};
