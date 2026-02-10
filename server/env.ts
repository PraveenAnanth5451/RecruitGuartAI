import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
  PORT: z.coerce.number().int().positive().optional(),

  // Database
  DATABASE_URL: z.string().url().optional(),

  // Grok (xAI) direct API, OpenAI-compatible
  GROK_API_KEY: z.string().transform((s) => s?.trim()).optional(),
  // Groq (OpenAI-compatible)
  GROQ_API_KEY: z.string().transform((s) => s?.trim()).optional(),
  // Gemini (Google AI)
  GEMINI_API_KEY: z.string().transform((s) => s?.trim()).optional(),
  GEMINI_MODEL: z.string().transform((s) => s?.trim()).optional(),

  SESSION_SECRET: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // Don't dump env values; only schema issues.
  // eslint-disable-next-line no-console
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = {
  NODE_ENV: parsed.data.NODE_ENV ?? "development",
  PORT: parsed.data.PORT ?? 5000,

  DATABASE_URL: parsed.data.DATABASE_URL,

  GROK_API_KEY: (parsed.data.GROK_API_KEY?.trim() || undefined) as string | undefined,
  GROK_BASE_URL: "https://api.x.ai/v1",
  GROQ_API_KEY: (parsed.data.GROQ_API_KEY?.trim() || undefined) as string | undefined,
  GROQ_BASE_URL: "https://api.groq.com/openai/v1",
  GEMINI_API_KEY: (parsed.data.GEMINI_API_KEY?.trim() || undefined) as string | undefined,
  GEMINI_MODEL: parsed.data.GEMINI_MODEL ?? "gemini-2.0-flash",

  SESSION_SECRET: parsed.data.SESSION_SECRET ?? "recruit-guard-dev-secret",
} as const;
