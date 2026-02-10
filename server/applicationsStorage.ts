import type { Application, InterviewStage } from "@shared/schema";

export interface ApplicationInsert {
  jobTitle: string;
  company: string;
  sourceUrl?: string;
  status?: string;
  nextStep?: string;
  verdictSnapshot?: Record<string, unknown>;
}

export interface InterviewStageInsert {
  applicationId: number;
  roundType: string;
  scheduledAt?: Date;
  mode?: string;
  status?: string;
}

interface AuthUser {
  id: number;
  email: string;
  password: string;
  createdAt: Date;
}

export type AnalysisInputType = "text" | "document" | "url";

export interface AnalysisRecord {
  id: number;
  userId: number;
  inputType: AnalysisInputType;
  verdict: "FAKE" | "LEGIT" | "UNCERTAIN";
  confidence: number;
  createdAt: Date;
}

// In-memory store for auth + dashboard (works without DB)
const authUsersStore: AuthUser[] = [];
const sessionUserMap = new Map<string, number>(); // sessionId -> userId
let nextUserId = 1;
const applicationsStore: Application[] = [];
const interviewStagesStore: InterviewStage[] = [];
const analysisStore: AnalysisRecord[] = [];
let nextAppId = 1;
let nextStageId = 1;
let nextAnalysisId = 1;

function toApplication(row: {
  id: number;
  userId: number;
  jobTitle: string;
  company: string;
  appliedDate: Date | null;
  status: string;
  sourceUrl: string | null;
  nextStep: string | null;
  verdictSnapshot: unknown;
  createdAt: Date | null;
}): Application {
  return {
    id: row.id,
    userId: row.userId,
    jobTitle: row.jobTitle,
    company: row.company,
    appliedDate: row.appliedDate,
    status: row.status,
    sourceUrl: row.sourceUrl,
    nextStep: row.nextStep,
    verdictSnapshot: row.verdictSnapshot,
    createdAt: row.createdAt ?? new Date(),
  };
}

function toStage(row: {
  id: number;
  applicationId: number;
  roundType: string;
  scheduledAt: Date | null;
  mode: string | null;
  status: string | null;
  createdAt: Date | null;
}): InterviewStage {
  return {
    id: row.id,
    applicationId: row.applicationId,
    roundType: row.roundType,
    scheduledAt: row.scheduledAt,
    mode: row.mode,
    status: row.status,
    createdAt: row.createdAt ?? new Date(),
  };
}

export function registerUser(sessionId: string, email: string, password: string): { id: number; email: string } {
  const normalizedEmail = email.trim().toLowerCase();
  if (authUsersStore.some((u) => u.email === normalizedEmail)) {
    throw new Error("Email already registered");
  }
  const user: AuthUser = {
    id: nextUserId++,
    email: normalizedEmail,
    password,
    createdAt: new Date(),
  };
  authUsersStore.push(user);
  sessionUserMap.set(sessionId, user.id);
  return { id: user.id, email: user.email };
}

export function loginUser(sessionId: string, email: string, password: string): { id: number; email: string } | null {
  const normalizedEmail = email.trim().toLowerCase();
  const user = authUsersStore.find((u) => u.email === normalizedEmail);
  if (!user) return null;
  if (user.password !== password) return null;
  sessionUserMap.set(sessionId, user.id);
  return { id: user.id, email: user.email };
}

export function logoutUser(sessionId: string): void {
  sessionUserMap.delete(sessionId);
}

export function getSessionUserId(sessionId: string): number | null {
  return sessionUserMap.get(sessionId) ?? null;
}

export function getSessionUser(sessionId: string): { id: number; email: string } | null {
  const uid = getSessionUserId(sessionId);
  if (uid == null) return null;
  const user = authUsersStore.find((u) => u.id === uid);
  if (!user) return null;
  return { id: user.id, email: user.email };
}

export function addApplication(userId: number, data: ApplicationInsert): { application: Application; stages: InterviewStage[] } {
  const appliedDate = new Date();
  const app: Application = toApplication({
    id: nextAppId++,
    userId,
    jobTitle: data.jobTitle,
    company: data.company,
    appliedDate,
    status: data.status ?? "Applied",
    sourceUrl: data.sourceUrl ?? null,
    nextStep: data.nextStep ?? null,
    verdictSnapshot: data.verdictSnapshot ?? null,
    createdAt: appliedDate,
  });
  applicationsStore.push(app);
  const stages: InterviewStage[] = [];
  return { application: app, stages };
}

export function updateApplication(
  userId: number,
  applicationId: number,
  updates: { status?: string; nextStep?: string }
): Application | null {
  const app = applicationsStore.find((a) => a.id === applicationId && a.userId === userId);
  if (!app) return null;
  if (updates.status !== undefined) app.status = updates.status;
  if (updates.nextStep !== undefined) app.nextStep = updates.nextStep;
  return app;
}

export function addInterviewStage(data: InterviewStageInsert): InterviewStage {
  const stage: InterviewStage = toStage({
    id: nextStageId++,
    applicationId: data.applicationId,
    roundType: data.roundType,
    scheduledAt: data.scheduledAt ?? null,
    mode: data.mode ?? null,
    status: data.status ?? "Scheduled",
    createdAt: new Date(),
  });
  interviewStagesStore.push(stage);
  return stage;
}

export function getDashboard(userId: number): {
  applications: Application[];
  upcomingInterviews: { application: Application; stage: InterviewStage }[];
} {
  const applications = applicationsStore.filter((a) => a.userId === userId);
  const now = new Date();
  const upcoming: { application: Application; stage: InterviewStage }[] = [];
  for (const stage of interviewStagesStore) {
    if (stage.scheduledAt && stage.scheduledAt >= now && stage.status !== "Cancelled") {
      const app = applicationsStore.find((a) => a.id === stage.applicationId && a.userId === userId);
      if (app) upcoming.push({ application: app, stage });
    }
  }
  upcoming.sort((a, b) => (a.stage.scheduledAt!.getTime() - b.stage.scheduledAt!.getTime()));
  return { applications, upcomingInterviews: upcoming };
}

export function getApplication(userId: number, applicationId: number): Application | null {
  return applicationsStore.find((a) => a.id === applicationId && a.userId === userId) ?? null;
}

export function getInterviewStages(applicationId: number): InterviewStage[] {
  return interviewStagesStore.filter((s) => s.applicationId === applicationId);
}

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addAnalysis(
  userId: number,
  data: { inputType: AnalysisInputType; verdict: "FAKE" | "LEGIT" | "UNCERTAIN"; confidence: number }
): AnalysisRecord {
  const record: AnalysisRecord = {
    id: nextAnalysisId++,
    userId,
    inputType: data.inputType,
    verdict: data.verdict,
    confidence: data.confidence,
    createdAt: new Date(),
  };
  analysisStore.push(record);
  return record;
}

export function getAnalysisStats(userId: number): {
  total: number;
  fake: number;
  legit: number;
  uncertain: number;
  daily: { date: string; total: number; fake: number; legit: number; uncertain: number }[];
} {
  const userAnalyses = analysisStore.filter((a) => a.userId === userId);
  const total = userAnalyses.length;
  const fake = userAnalyses.filter((a) => a.verdict === "FAKE").length;
  const legit = userAnalyses.filter((a) => a.verdict === "LEGIT").length;
  const uncertain = userAnalyses.filter((a) => a.verdict === "UNCERTAIN").length;

  const today = new Date();
  const dailyMap = new Map<string, { total: number; fake: number; legit: number; uncertain: number }>();
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dailyMap.set(toDayKey(d), { total: 0, fake: 0, legit: 0, uncertain: 0 });
  }

  for (const analysis of userAnalyses) {
    const key = toDayKey(analysis.createdAt);
    if (!dailyMap.has(key)) continue;
    const entry = dailyMap.get(key)!;
    entry.total += 1;
    if (analysis.verdict === "FAKE") entry.fake += 1;
    if (analysis.verdict === "LEGIT") entry.legit += 1;
    if (analysis.verdict === "UNCERTAIN") entry.uncertain += 1;
  }

  const daily = Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    total: data.total,
    fake: data.fake,
    legit: data.legit,
    uncertain: data.uncertain,
  }));

  return { total, fake, legit, uncertain, daily };
}
