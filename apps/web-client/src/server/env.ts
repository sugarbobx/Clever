/**
 * Environment for the full-stack Next.js app. Next loads `.env` / `.env.local`
 * automatically, so no dotenv here. All values have safe local defaults, so the
 * app boots out of the box; override via env vars for the server-backed phase.
 */
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().default("file:./dev.db"),
  JWT_SECRET: z.string().min(16).default("dev_access_secret_change_me_please_64_chars_minimum_aaaaaaaaaaaa"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16)
    .default("dev_refresh_secret_change_me_please_different_64_chars_bbbbbbbb"),
  UPLOAD_DIR: z.string().default("./data/uploads"),
  MAX_FILE_SIZE_MB: z.coerce.number().default(10),

  // ── Phase 2 (server-backed) — all optional; absence keeps local mock mode ──
  REDIS_URL: z.string().optional(), // present → Bull queue; absent → inline processing
  ANTHROPIC_API_KEY: z.string().optional(), // present → real Claude Haiku OCR
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_APP_SECRET: z.string().optional(), // present → validate X-Hub-Signature-256
  GRAPH_API_VERSION: z.string().default("v18.0"),

  // QuickBooks OAuth (Phase 4) — all optional; absence keeps the mock connection.
  QBO_CLIENT_ID: z.string().optional(),
  QBO_CLIENT_SECRET: z.string().optional(),
  QBO_REDIRECT_URI: z.string().optional(),
  QBO_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),
  ENCRYPTION_KEY: z.string().optional(), // AES key for token-at-rest (real QBO)
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.warn("⚠️  Invalid environment, falling back to defaults:", parsed.error.flatten().fieldErrors);
}

export const env = parsed.success ? parsed.data : schema.parse({});
export const isDev = env.NODE_ENV !== "production";

/** Phase-2 capability flags — drive the real-vs-mock branches of the pipeline. */
export const queueEnabled = Boolean(env.REDIS_URL);
export const anthropicConfigured = Boolean(env.ANTHROPIC_API_KEY);
export const whatsappConfigured = Boolean(env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);
export const qboConfigured = Boolean(env.QBO_CLIENT_ID && env.QBO_CLIENT_SECRET && env.QBO_REDIRECT_URI);
