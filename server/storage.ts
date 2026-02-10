import { db } from "./db";
import { jobs, type Job, type InsertJob } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Jobs
  getJobs(): Promise<Job[]>;
  createJob(job: InsertJob): Promise<Job>;
  seedJobs(): Promise<void>;
}

function createSeedData(): InsertJob[] {
  return [
    {
      title: "Software Engineer Intern (Fresher)",
      company: "India Openings",
      location: "Chennai, Tamil Nadu",
      applyUrl: "https://www.linkedin.com/jobs/search/?keywords=software%20engineer%20intern%20fresher&location=Chennai%2C%20Tamil%20Nadu%2C%20India",
      source: "LinkedIn Search",
      description: "Current fresher software internships in Chennai.",
      isActive: true,
    },
    {
      title: "Junior Software Developer (Fresher)",
      company: "India Openings",
      location: "Coimbatore, Tamil Nadu",
      applyUrl: "https://www.linkedin.com/jobs/search/?keywords=junior%20software%20developer%20fresher&location=Coimbatore%2C%20Tamil%20Nadu%2C%20India",
      source: "LinkedIn Search",
      description: "Junior developer openings for 0-1 year experience.",
      isActive: true,
    },
    {
      title: "Graduate Engineer Trainee - Software",
      company: "India Openings",
      location: "Bengaluru, India",
      applyUrl: "https://www.linkedin.com/jobs/search/?keywords=graduate%20engineer%20trainee%20software&location=Bengaluru%2C%20Karnataka%2C%20India",
      source: "LinkedIn Search",
      description: "GET openings for recent engineering graduates.",
      isActive: true,
    },
    {
      title: "QA Engineer Fresher",
      company: "India Openings",
      location: "Chennai, Tamil Nadu",
      applyUrl: "https://www.linkedin.com/jobs/search/?keywords=qa%20engineer%20fresher&location=Chennai%2C%20Tamil%20Nadu%2C%20India",
      source: "LinkedIn Search",
      description: "Entry-level QA/testing roles in Chennai.",
      isActive: true,
    },
    {
      title: "Data Analyst Fresher",
      company: "India Openings",
      location: "Chennai, Tamil Nadu",
      applyUrl: "https://www.linkedin.com/jobs/search/?keywords=data%20analyst%20fresher&location=Chennai%2C%20Tamil%20Nadu%2C%20India",
      source: "LinkedIn Search",
      description: "Fresher data analyst roles in Tamil Nadu and nearby hubs.",
      isActive: true,
    },
    {
      title: "Frontend Developer Intern",
      company: "India Openings",
      location: "Tamil Nadu, India",
      applyUrl: "https://www.linkedin.com/jobs/search/?keywords=frontend%20developer%20intern&location=Tamil%20Nadu%2C%20India",
      source: "LinkedIn Search",
      description: "Frontend internships with React/TypeScript for students and freshers.",
      isActive: true,
    },
    {
      title: "Backend Developer Intern",
      company: "India Openings",
      location: "India",
      applyUrl: "https://www.linkedin.com/jobs/search/?keywords=backend%20developer%20intern%20fresher&location=India",
      source: "LinkedIn Search",
      description: "Backend internships and fresher openings across India.",
      isActive: true,
    },
    {
      title: "Support Engineer / IT Fresher",
      company: "India Openings",
      location: "Tamil Nadu, India",
      applyUrl: "https://www.linkedin.com/jobs/search/?keywords=support%20engineer%20fresher&location=Tamil%20Nadu%2C%20India",
      source: "LinkedIn Search",
      description: "Entry-level support and IT roles for fresh graduates.",
      isActive: true,
    },
  ];
}

class MemoryStorage implements IStorage {
  private jobs: Job[] = [];
  private nextId = 1;

  async getJobs(): Promise<Job[]> {
    return this.jobs.filter((j) => j.isActive);
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const job: Job = {
      id: this.nextId++,
      title: insertJob.title,
      company: insertJob.company,
      location: insertJob.location ?? null,
      applyUrl: insertJob.applyUrl,
      source: insertJob.source,
      description: insertJob.description ?? null,
      isActive: insertJob.isActive ?? true,
      createdAt: new Date(),
    };
    this.jobs.push(job);
    return job;
  }

  async seedJobs(): Promise<void> {
    if (this.jobs.length > 0) return;
    for (const job of createSeedData()) {
      await this.createJob(job);
    }
  }
}

export class DatabaseStorage implements IStorage {
  private memoryFallback = new MemoryStorage();
  private dbHealthy: boolean | null = null;

  async getJobs(): Promise<Job[]> {
    if (this.dbHealthy === false) return await this.memoryFallback.getJobs();
    try {
      if (!db) throw new Error("DB not configured");
      const result = await db.select().from(jobs).where(eq(jobs.isActive, true));
      this.dbHealthy = true;
      return result;
    } catch (err) {
      this.dbHealthy = false;
      console.warn("Database unavailable; using in-memory jobs list.");
      return await this.memoryFallback.getJobs();
    }
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    if (this.dbHealthy === false)
      return await this.memoryFallback.createJob(insertJob);
    try {
      if (!db) throw new Error("DB not configured");
      const [job] = await db.insert(jobs).values(insertJob).returning();
      this.dbHealthy = true;
      return job;
    } catch (err) {
      this.dbHealthy = false;
      console.warn("Database unavailable; using in-memory job creation.");
      return await this.memoryFallback.createJob(insertJob);
    }
  }

  async seedJobs(): Promise<void> {
    if (this.dbHealthy === false) return await this.memoryFallback.seedJobs();
    try {
      const existing = await this.getJobs();
      if (existing.length > 0) return;
      for (const job of createSeedData()) {
        await this.createJob(job);
      }
    } catch (err) {
      this.dbHealthy = false;
      console.warn("Database unavailable; using in-memory seed data.");
      await this.memoryFallback.seedJobs();
    }
  }
}

export const storage = new DatabaseStorage();
