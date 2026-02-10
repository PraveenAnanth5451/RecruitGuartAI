import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location"),
  applyUrl: text("apply_url").notNull(),
  source: text("source").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Session-based user (no password; identity from session)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const applicationStatusEnum = ["Applied", "Shortlisted", "Interview Scheduled", "Rejected", "Offer Received"] as const;

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  jobTitle: text("job_title").notNull(),
  company: text("company").notNull(),
  appliedDate: timestamp("applied_date").defaultNow(),
  status: text("status").notNull().default("Applied"), // Applied | Shortlisted | Interview Scheduled | Rejected | Offer Received
  sourceUrl: text("source_url"),
  nextStep: text("next_step"),
  verdictSnapshot: jsonb("verdict_snapshot"), // { verdict, confidence, positive_signals, negative_signals }
  createdAt: timestamp("created_at").defaultNow(),
});

export const interviewStages = pgTable("interview_stages", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().references(() => applications.id),
  roundType: text("round_type").notNull(), // HR / Technical / Managerial
  scheduledAt: timestamp("scheduled_at"),
  mode: text("mode"), // Online / Offline
  status: text("status").default("Scheduled"), // Scheduled | Completed | Cancelled
  createdAt: timestamp("created_at").defaultNow(),
});

// === SCHEMAS ===
export const insertJobSchema = createInsertSchema(jobs).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertApplicationSchema = createInsertSchema(applications).omit({ id: true, createdAt: true });
export const insertInterviewStageSchema = createInsertSchema(interviewStages).omit({ id: true, createdAt: true });

// === TYPES ===
export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type InterviewStage = typeof interviewStages.$inferSelect;
export type InsertInterviewStage = z.infer<typeof insertInterviewStageSchema>;

// === API CONTRACT TYPES ===
export type AnalyzeRequest = { message: string };

export type AnalysisResponse = {
  verdict: "FAKE" | "LEGIT" | "UNCERTAIN";
  confidence: number;
  positive_signals: string[];
  negative_signals: string[];
  explanations?: string[]; // legacy
  job_role?: string;
  company?: string;
  sample_reply_mail?: string;
  reply_to_email?: string;
  interview_datetime_iso?: string;
  jobMatches: Job[];
};

export type JobMatchRequest = { keywords: string[] };
