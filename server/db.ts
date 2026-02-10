import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { env } from "./env";

const { Pool } = pg;

if (!env.DATABASE_URL) {
  // In production we require DB; in dev the app can still boot with in-memory fallback.
  if (env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL must be set for production.");
  }
}

export const pool = env.DATABASE_URL
  ? new Pool({ connectionString: env.DATABASE_URL })
  : null;

export const db = pool ? drizzle(pool, { schema }) : null;
