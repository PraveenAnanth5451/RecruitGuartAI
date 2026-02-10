import { env } from "./server/env";
import { defineConfig } from "drizzle-kit";

// Use placeholder when DATABASE_URL is missing so `drizzle-kit generate` works without a running DB
const databaseUrl = env.DATABASE_URL ?? "postgresql://localhost:5432/recruitguard";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
