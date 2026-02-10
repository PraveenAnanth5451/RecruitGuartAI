import type { Express } from "express";
import type { Server } from "node:http";
import multer from "multer";
import { storage } from "./storage";
import * as appStorage from "./applicationsStorage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import { env } from "./env";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

type Verdict = "FAKE" | "LEGIT" | "UNCERTAIN";
type RecruitmentAnalysis = {
  verdict: Verdict;
  confidence: number;
  positive_signals: string[];
  negative_signals: string[];
  job_role?: string;
  company?: string;
  interview_datetime_iso?: string;
};

// File uploads for offer-letter detection (PDF)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function fetchErrorToHttp(err: unknown): { status: number; message: string } | null {
  if (!err || typeof err !== "object") return null;
  const anyErr = err as any;
  const cause = anyErr.cause as any;
  const code: string | undefined =
    typeof anyErr.code === "string"
      ? anyErr.code
      : typeof cause?.code === "string"
        ? cause.code
        : undefined;
  const hostname: string | undefined =
    typeof cause?.hostname === "string" ? cause.hostname : typeof anyErr?.hostname === "string" ? anyErr.hostname : undefined;

  // DNS / connectivity failures should be a client-visible 400/504 (not a generic 500)
  if (code === "ENOTFOUND") {
    return {
      status: 400,
      message: hostname
        ? `Could not resolve the website domain (${hostname}). Check the URL and try again.`
        : "Could not resolve the website domain. Check the URL and try again.",
    };
  }
  if (code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "UND_ERR_CONNECT_TIMEOUT") {
    return {
      status: 504,
      message: "Could not reach the website (connection timed out/refused). Try again or use a different link.",
    };
  }
  if (code === "CERT_HAS_EXPIRED" || code === "DEPTH_ZERO_SELF_SIGNED_CERT") {
    return {
      status: 400,
      message: "Could not fetch the URL due to an SSL/TLS certificate error.",
    };
  }
  return null;
}

function getGrokClient() {
  if (!env.GROK_API_KEY) return null;
  return new OpenAI({
    apiKey: env.GROK_API_KEY,
    baseURL: env.GROK_BASE_URL,
  });
}

function getGroqClient() {
  if (!env.GROQ_API_KEY) return null;
  return new OpenAI({
    apiKey: env.GROQ_API_KEY,
    baseURL: env.GROQ_BASE_URL,
  });
}

function getPreferredOpenAIClient(): OpenAI | null {
  return getGroqClient() ?? getGrokClient();
}

function requireAiConfigured(res: any): boolean {
  if (!env.GROK_API_KEY && !env.GROQ_API_KEY && !env.GEMINI_API_KEY) {
    res.status(503).json({
      message:
        "AI scanning is not configured. Set GROK_API_KEY or GROQ_API_KEY/GEMINI_API_KEY in your .env file.",
    });
    return false;
  }
  return true;
}

function normalizeVerdict(value: unknown): "FAKE" | "LEGIT" | "UNCERTAIN" {
  if (value === "FAKE" || value === "LEGIT" || value === "UNCERTAIN") return value;
  return "UNCERTAIN";
}

function normalizeConfidence(value: unknown): number {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return 50;
  const scaled = raw <= 1 ? raw * 100 : raw;
  return Math.round(Math.max(0, Math.min(100, scaled)));
}

function normalizeIsoDate(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function extractReplyToEmail(inputText: string): string | undefined {
  const matches = inputText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  if (!matches.length) return undefined;
  const firstMatch = matches[0];
  if (!firstMatch) return undefined;
  // Prefer non-generic hiring/recruitment-looking addresses if present.
  const preferred = matches.find((m) => /(hr|hiring|recruit|talent|careers)/i.test(m));
  return (preferred ?? firstMatch).trim();
}

function isRateLimit(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const anyErr = err as any;
  return anyErr.status === 429 || anyErr.code === 429;
}

function buildInterviewPrepFallback(jobTitle: string, company: string) {
  const checklist = [
    "Review the job description and align your experience to key requirements",
    "Prepare 2-3 concise project or impact stories",
    "Research the company mission, products, and recent news",
    "Practice a 60-second self-introduction",
    "Prepare questions for the interviewer",
    "Check audio, video, and internet if interview is online",
    "Bring updated resume and portfolio links",
  ];

  const questions = [
    {
      category: "HR",
      question: "Walk me through your background and why this role interests you.",
      tip: "Keep it structured: past, present, and why this role now.",
    },
    {
      category: "HR",
      question: "Why do you want to work at this company?",
      tip: `Mention something specific about ${company || "the company"} and connect it to your goals.`,
    },
    {
      category: "Behavioral",
      question: "Tell me about a challenging problem you solved.",
      tip: "Use STAR: Situation, Task, Action, Result.",
    },
    {
      category: "Behavioral",
      question: "Describe a time you worked with a difficult teammate.",
      tip: "Show empathy, conflict resolution, and outcomes.",
    },
    {
      category: "Technical",
      question: `What are the core skills required for a ${jobTitle || "this role"}?`,
      tip: "Highlight tools, fundamentals, and how you’ve applied them.",
    },
    {
      category: "Technical",
      question: "Explain a recent project end-to-end.",
      tip: "Focus on your role, tradeoffs, and measurable impact.",
    },
    {
      category: "Technical",
      question: "How do you debug a production issue?",
      tip: "Talk about reproducing, isolating, monitoring, and rollback.",
    },
    {
      category: "HR",
      question: "What are your strengths and areas to improve?",
      tip: "Keep improvements real but show active progress.",
    },
  ];

  const tips = [
    "Answer clearly and briefly, then expand with evidence.",
    "Use numbers to show impact whenever possible.",
    "Clarify assumptions before jumping into solutions.",
    "Prepare 2-3 thoughtful questions for the interviewer.",
    "Be ready to discuss your resume line-by-line.",
  ];

  return { checklist, questions, tips };
}

// Helper to analyze text with Grok - returns structured positive/negative signals
async function analyzeWithGrok(openai: OpenAI, text: string) {
  const completion = await openai.chat.completions.create({
    model: "grok-2",
    messages: [
      {
        role: "system",
        content: `You are an expert recruitment fraud detection AI.
Analyze the following text (recruitment message, offer letter, or job posting) and determine if it is FAKE (scam) or LEGIT (genuine).

LEGIT - list only positive trust signals in positive_signals, leave negative_signals empty. Examples:
- Verified company domain or professional email
- No payment or sensitive data requested
- Clear job role and interview process
- Professional language and formatting
- Matches known hiring patterns

FAKE - list only red flags in negative_signals, leave positive_signals empty. Examples:
- Advance payment or registration fee requested
- Personal email (Gmail, Yahoo, etc.) for official communication
- Urgency pressure or "act now"
- Unrealistic salary for role
- Poor grammar or unprofessional formatting
- Telegram or WhatsApp for formal interview
- Immediate hiring without interview

Return STRICT JSON only (no markdown):
{
  "verdict": "FAKE" | "LEGIT" | "UNCERTAIN",
  "confidence": number,
  "positive_signals": ["signal1", "signal2", ...],
  "negative_signals": ["flag1", "flag2", ...],
  "job_role": "string",
  "company": "string",
  "interview_datetime_iso": "ISO datetime if mentioned, else empty"
}
Use empty array for the side that does not apply. For UNCERTAIN, you may put items in both.`,
      },
      { role: "user", content: text },
    ],
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0].message.content;
  if (!content) throw new Error("No response from AI");
  const parsed = JSON.parse(content);
  return {
    verdict: normalizeVerdict(parsed.verdict),
    confidence: normalizeConfidence(parsed.confidence),
    positive_signals: Array.isArray(parsed.positive_signals) ? parsed.positive_signals : [],
    negative_signals: Array.isArray(parsed.negative_signals) ? parsed.negative_signals : [],
    job_role: typeof parsed.job_role === "string" ? parsed.job_role : undefined,
    company: typeof parsed.company === "string" ? parsed.company : undefined,
    interview_datetime_iso: normalizeIsoDate(parsed.interview_datetime_iso),
  };
}

async function classifyWithGroq(openai: OpenAI, text: string) {
  const completion = await openai.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: `You are a fast recruitment fraud classifier.
Return STRICT JSON only:
{
  "verdict": "FAKE" | "LEGIT" | "UNCERTAIN",
  "confidence": number,
  "job_role": "string",
  "company": "string",
  "interview_datetime_iso": "ISO datetime if mentioned, else empty",
  "positive_signals": ["signal1", ...],
  "negative_signals": ["flag1", ...]
}
Keep signals short and concrete.`,
      },
      { role: "user", content: text },
    ],
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0].message.content;
  if (!content) throw new Error("No response from AI");
  const parsed = JSON.parse(content);
  return {
    verdict: normalizeVerdict(parsed.verdict),
    confidence: normalizeConfidence(parsed.confidence),
    positive_signals: Array.isArray(parsed.positive_signals) ? parsed.positive_signals : [],
    negative_signals: Array.isArray(parsed.negative_signals) ? parsed.negative_signals : [],
    job_role: typeof parsed.job_role === "string" ? parsed.job_role : undefined,
    company: typeof parsed.company === "string" ? parsed.company : undefined,
    interview_datetime_iso: normalizeIsoDate(parsed.interview_datetime_iso),
  };
}

async function analyzeWithGemini(text: string) {
  if (!env.GEMINI_API_KEY) throw new Error("Gemini is not configured");
  const prompt = `You are a recruitment fraud analyst.
Analyze the following text and return STRICT JSON only:
{
  "verdict": "FAKE" | "LEGIT" | "UNCERTAIN",
  "confidence": number,
  "positive_signals": ["signal1", ...],
  "negative_signals": ["flag1", ...],
  "job_role": "string",
  "company": "string",
  "interview_datetime_iso": "ISO datetime if mentioned, else empty"
}
Rules:
- If verdict is LEGIT, keep negative_signals empty.
- If verdict is FAKE, keep positive_signals empty.
- For UNCERTAIN, you may include both.
- Keep signals short and specific.
Text:
${text}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const err = new Error("Gemini request failed");
    (err as any).status = response.status;
    (err as any).error = { message: text };
    throw err;
  }

  const payload = await response.json();
  const content = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("No response from Gemini");
  const parsed = JSON.parse(content);
  return {
    verdict: normalizeVerdict(parsed.verdict),
    confidence: normalizeConfidence(parsed.confidence),
    positive_signals: Array.isArray(parsed.positive_signals) ? parsed.positive_signals : [],
    negative_signals: Array.isArray(parsed.negative_signals) ? parsed.negative_signals : [],
    job_role: typeof parsed.job_role === "string" ? parsed.job_role : undefined,
    company: typeof parsed.company === "string" ? parsed.company : undefined,
    interview_datetime_iso: normalizeIsoDate(parsed.interview_datetime_iso),
  };
}

async function analyzeRecruitment(text: string): Promise<RecruitmentAnalysis> {
  const groqClient = getGroqClient();
  const grokClient = getGrokClient();
  const geminiEnabled = Boolean(env.GEMINI_API_KEY);

  const heuristicFallback = () => {
    const lower = text.toLowerCase();
    const redFlags = [
      "payment",
      "fee",
      "deposit",
      "telegram",
      "whatsapp",
      "urgent",
      "act now",
      "wire",
      "gift card",
      "bank details",
      "gmail.com",
      "yahoo.com",
      "outlook.com",
    ];
    const negatives = redFlags.filter((flag) => lower.includes(flag));
    const positives =
      negatives.length === 0
        ? ["Professional tone", "Clear job role", "No payment requested"]
        : [];
    const verdict: Verdict = negatives.length > 0 ? "FAKE" : "UNCERTAIN";
    const confidence = negatives.length > 0 ? 60 : 45;
    return {
      verdict,
      confidence,
      positive_signals: positives,
      negative_signals: negatives,
      job_role: undefined,
      company: undefined,
      interview_datetime_iso: undefined,
    };
  };

  let groqResult = null;
  if (groqClient) {
    try {
      groqResult = await classifyWithGroq(groqClient, text);
    } catch (err) {
      if (!isRateLimit(err)) throw err;
    }
  }

  let geminiResult = null;
  if (geminiEnabled) {
    try {
      geminiResult = await analyzeWithGemini(text);
    } catch (err) {
      if (!isRateLimit(err)) throw err;
    }
  }

  if (groqResult || geminiResult) {
    const verdict = groqResult?.verdict ?? geminiResult?.verdict ?? "UNCERTAIN";
    const confidence = normalizeConfidence(groqResult?.confidence ?? geminiResult?.confidence);
    const job_role = groqResult?.job_role ?? geminiResult?.job_role;
    const company = groqResult?.company ?? geminiResult?.company;
    const interview_datetime_iso =
      groqResult?.interview_datetime_iso ?? geminiResult?.interview_datetime_iso;
    const positive_signals =
      (geminiResult?.positive_signals?.length ?? 0) > 0
        ? geminiResult!.positive_signals
        : groqResult?.positive_signals ?? [];
    const negative_signals =
      (geminiResult?.negative_signals?.length ?? 0) > 0
        ? geminiResult!.negative_signals
        : groqResult?.negative_signals ?? [];
    return {
      verdict,
      confidence,
      positive_signals,
      negative_signals,
      job_role,
      company,
      interview_datetime_iso,
    };
  }

  if (grokClient) {
    try {
      return await analyzeWithGrok(grokClient, text);
    } catch (err) {
      if (!isRateLimit(err)) throw err;
    }
  }

  return heuristicFallback();
}

async function generateLegitReplyEmail(inputText: string): Promise<string> {
  const openai = getPreferredOpenAIClient();
  const fallback = `Subject: Re: Interview / Application Update

Dear Hiring Team,

Thank you for your email and for considering my application.
I confirm that I am interested in proceeding with the next steps.
Please let me know the interview schedule and any documents you need from my side.

Best regards,
[Your Name]`;

  if (!openai) return fallback;

  try {
    const completion = await openai.chat.completions.create({
      model: env.GROQ_API_KEY ? "llama-3.1-8b-instant" : "grok-2",
      messages: [
        {
          role: "system",
          content:
            "Write a concise professional reply email for a legitimate recruitment email. Return plain text only.",
        },
        { role: "user", content: inputText.slice(0, 6000) },
      ],
      temperature: 0.3,
    });
    const content = completion.choices[0]?.message?.content?.trim();
    return content || fallback;
  } catch {
    return fallback;
  }
}

async function extractPdfTextWithPython(fileBuffer: Buffer): Promise<string> {
  return new Promise((resolvePromise, rejectPromise) => {
    const scriptPath = resolve(process.cwd(), "script", "extract_pdf_text.py");
    const child = spawn("python", [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", (err) => rejectPromise(err));
    child.on("close", (code) => {
      if (code !== 0) {
        rejectPromise(new Error(stderr || `Python extractor exited with code ${code}`));
        return;
      }
      resolvePromise(stdout.trim());
    });

    child.stdin.write(fileBuffer.toString("base64"));
    child.stdin.end();
  });
}

function aiErrorToHttp(err: unknown): { status: number; message: string } | null {
  if (!err || typeof err !== "object") return null;
  const anyErr = err as any;
  const status: number | undefined =
    typeof anyErr.status === "number"
      ? anyErr.status
      : typeof anyErr.code === "number"
        ? anyErr.code
        : undefined;
  const upstreamMessage: string | undefined =
    typeof anyErr?.error?.message === "string"
      ? anyErr.error.message
      : typeof anyErr?.message === "string"
        ? anyErr.message
        : undefined;

  if (status === 401 || status === 403) {
    return {
      status: 401,
      message: "AI authentication failed. Check your API keys in the .env file.",
    };
  }
  if (status === 429) {
    return { status: 429, message: "AI rate limit reached. Try again shortly." };
  }
  if (status && status >= 500) {
    return {
      status: 503,
      message: "AI service is temporarily unavailable. Please retry in a moment.",
    };
  }
  if (upstreamMessage && status) {
    return { status: 502, message: `AI request failed: ${upstreamMessage}` };
  }
  return null;
}

async function suggestJobsWithGemini(input: { profileText: string; location?: string }) {
  if (!env.GEMINI_API_KEY) throw new Error("Gemini is not configured");
  const prompt = `You are a senior career coach and ATS expert.
Given a candidate profile, suggest suitable job titles and keyword sets for searching.
Return STRICT JSON:
{
  "suggestions": [
    {
      "title": string,
      "keywords": string[],
      "why": string[],
      "searchUrls": string[]
    }
  ]
}
Rules:
- 5 suggestions.
- keywords: 6-10 items, include tools/skills and role synonyms.
- why: 2-4 bullets, concrete.
- searchUrls: include at least 2 links per suggestion using:
  - https://www.linkedin.com/jobs/search/?keywords=<ENC>&location=<ENC>
  - https://www.indeed.com/jobs?q=<ENC>&l=<ENC>
- If location missing, use "Remote".
Profile:
${JSON.stringify(input)}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const err = new Error("Gemini request failed");
    (err as any).status = response.status;
    (err as any).error = { message: text };
    throw err;
  }

  const payload = await response.json();
  const content = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("No response from Gemini");
  return JSON.parse(content);
}

async function interviewPrepWithGemini(jobTitle: string, company: string) {
  if (!env.GEMINI_API_KEY) throw new Error("Gemini is not configured");
  const prompt = `You are a career coach. For interview preparation, return STRICT JSON only:
{
  "checklist": ["item1", "item2", ...],
  "questions": [{"category": "HR"|"Technical"|"Behavioral", "question": "...", "tip": "..."}],
  "tips": ["tip1", "tip2", ...]
}
- checklist: 6-10 items (documents to prepare, resume review, company research, etc.)
- questions: 8-12 items across HR, Technical, Behavioral
- tips: 4-6 short tips (how to answer, common mistakes, what interviewers expect)
Base content on job role and company only; do not invent company-specific facts.
Job: ${jobTitle}. Company: ${company}.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const err = new Error("Gemini request failed");
    (err as any).status = response.status;
    (err as any).error = { message: text };
    throw err;
  }

  const payload = await response.json();
  const content = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("No response from Gemini");
  return JSON.parse(content);
}

function evaluateAnswerFallback(question: string, answer: string): { score: number; feedback: string; improvedAnswer: string } {
  const trimmed = answer.trim();
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  let score = 45;
  if (words >= 50) score += 20;
  if (words >= 100) score += 10;
  if (/(result|impact|improved|reduced|increased|percent|%)/i.test(trimmed)) score += 15;
  if (/(I|my|we)/.test(trimmed)) score += 5;
  score = Math.max(0, Math.min(100, score));

  const feedback =
    words < 40
      ? "Answer is too short. Add context, actions you took, and outcomes."
      : "Good structure. Improve with specific metrics and clearer impact.";
  const improvedAnswer = `For the question: "${question}", structure your answer as Situation, Task, Action, Result. Mention one concrete impact metric and what you learned.`;
  return { score, feedback, improvedAnswer };
}

async function evaluateAnswerWithAi(input: {
  question: string;
  answer: string;
  role?: string;
  company?: string;
}): Promise<{ score: number; feedback: string; improvedAnswer: string }> {
  const openai = getPreferredOpenAIClient();
  if (!openai) return evaluateAnswerFallback(input.question, input.answer);

  try {
    const completion = await openai.chat.completions.create({
      model: env.GROQ_API_KEY ? "llama-3.1-8b-instant" : "grok-2",
      messages: [
        {
          role: "system",
          content: `You are an interview coach. Evaluate candidate answer quality.
Return STRICT JSON only:
{
  "score": number,
  "feedback": string,
  "improvedAnswer": string
}
Scoring range 0-100. Feedback must be concise and actionable.`,
        },
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
      response_format: { type: "json_object" },
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) return evaluateAnswerFallback(input.question, input.answer);
    const parsed = JSON.parse(content);
    return {
      score: normalizeConfidence(parsed.score),
      feedback: typeof parsed.feedback === "string" ? parsed.feedback : "Add stronger examples and outcomes.",
      improvedAnswer:
        typeof parsed.improvedAnswer === "string"
          ? parsed.improvedAnswer
          : evaluateAnswerFallback(input.question, input.answer).improvedAnswer,
    };
  } catch {
    return evaluateAnswerFallback(input.question, input.answer);
  }
}

function buildUrlCandidates(rawUrl: string): string[] {
  const trimmed = rawUrl.trim();
  if (!trimmed) return [];
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    const host = parsed.hostname;
    const variants = [parsed.toString()];
    if (!host.startsWith("www.")) {
      variants.push(parsed.toString().replace(`://${host}`, `://www.${host}`));
    }
    if (parsed.protocol === "https:") {
      variants.push(parsed.toString().replace("https://", "http://"));
    }
    return Array.from(new Set(variants));
  } catch {
    return [withScheme];
  }
}

async function fetchUrlContent(url: string): Promise<{ finalUrl: string; text: string } | null> {
  const { load } = await import("cheerio");
  const candidates = buildUrlCandidates(url);
  let lastError: unknown = null;

  for (const candidate of candidates) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(candidate, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status}`);
        continue;
      }

      const html = await response.text();
      const $ = load(html);
      const title = $("title").first().text();
      const metaDescription = $('meta[name="description"]').attr("content") || "";
      const ogDescription = $('meta[property="og:description"]').attr("content") || "";
      $("script, style, nav, footer, noscript").remove();
      const bodyText = $("body").text().replace(/\s+/g, " ").trim();
      const merged = [title, metaDescription, ogDescription, bodyText].join(" ").trim();
      if (merged.length < 40) {
        lastError = new Error("Insufficient extracted content");
        continue;
      }
      return { finalUrl: response.url || candidate, text: merged.slice(0, 20000) };
    } catch (err) {
      lastError = err;
    }
  }

  return null;
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Seed database
  await storage.seedJobs();

  // Dashboard & applications (session-based user)
  function getUserId(req: Express.Request): number | null {
    const sid = (req as Express.Request & { sessionID?: string }).sessionID;
    if (!sid) return null;
    return appStorage.getSessionUserId(sid);
  }

  app.post(api.auth.register.path, (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const sid = (req as Express.Request & { sessionID?: string }).sessionID;
      if (!sid) return res.status(500).json({ message: "Session unavailable" });
      const user = appStorage.registerUser(sid, input.email, input.password);
      return res.json({ user });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      if (err instanceof Error && err.message.includes("already registered")) {
        return res.status(400).json({ message: err.message });
      }
      return res.status(500).json({ message: "Failed to register" });
    }
  });

  app.post(api.auth.login.path, (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      const sid = (req as Express.Request & { sessionID?: string }).sessionID;
      if (!sid) return res.status(500).json({ message: "Session unavailable" });
      const user = appStorage.loginUser(sid, input.email, input.password);
      if (!user) return res.status(401).json({ message: "Invalid email or password" });
      return res.json({ user });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      return res.status(500).json({ message: "Failed to login" });
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    const sid = (req as Express.Request & { sessionID?: string }).sessionID;
    if (sid) appStorage.logoutUser(sid);
    return res.json({ ok: true });
  });

  app.get(api.auth.me.path, (req, res) => {
    const sid = (req as Express.Request & { sessionID?: string }).sessionID;
    const user = sid ? appStorage.getSessionUser(sid) : null;
    return res.json({ user });
  });

  // API: Analyze Text
  app.post(api.analyze.text.path, async (req, res) => {
    if (!requireAiConfigured(res)) return;
    try {
      const input = api.analyze.text.input.parse(req.body);

      const analysis = await analyzeRecruitment(input.message);
      const userId = getUserId(req);
      if (userId != null) {
        appStorage.addAnalysis(userId, {
          inputType: "text",
          verdict: analysis.verdict,
          confidence: analysis.confidence,
        });
      }

      let jobMatches: any[] = [];
      let sample_reply_mail: string | undefined;
      const reply_to_email = extractReplyToEmail(input.message);
      if (analysis.verdict === "LEGIT") {
        jobMatches = await storage.getJobs();
        sample_reply_mail = await generateLegitReplyEmail(input.message);
      }
      res.json({
        verdict: analysis.verdict,
        confidence: analysis.confidence,
        positive_signals: analysis.positive_signals ?? [],
        negative_signals: analysis.negative_signals ?? [],
        job_role: analysis.job_role,
        company: analysis.company,
        interview_datetime_iso: analysis.interview_datetime_iso,
        sample_reply_mail,
        reply_to_email,
        jobMatches,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      const mapped = aiErrorToHttp(err);
      if (mapped) return res.status(mapped.status).json({ message: mapped.message });
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // API: Analyze Offer Letter PDF (Python text extraction -> AI analysis)
  app.post(api.analyze.document.path, upload.single("file"), async (req, res) => {
    if (!requireAiConfigured(res)) return;
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      if (req.file.mimetype !== "application/pdf") {
        return res.status(400).json({ message: "Please upload a PDF offer letter." });
      }

      const extractedText = await extractPdfTextWithPython(req.file.buffer);
      if (!extractedText || extractedText.trim().length < 20) {
        return res
          .status(400)
          .json({ message: "Could not extract enough text from the PDF. Use a text-based PDF." });
      }

      const analysis = await analyzeRecruitment(extractedText.slice(0, 20000));
      const userId = getUserId(req);
      if (userId != null) {
        appStorage.addAnalysis(userId, {
          inputType: "document",
          verdict: analysis.verdict,
          confidence: analysis.confidence,
        });
      }

      let jobMatches: any[] = [];
      if (analysis.verdict === "LEGIT") {
        jobMatches = await storage.getJobs();
      }

      return res.json({
        verdict: analysis.verdict,
        confidence: analysis.confidence,
        positive_signals: analysis.positive_signals ?? [],
        negative_signals: analysis.negative_signals ?? [],
        job_role: analysis.job_role,
        company: analysis.company,
        interview_datetime_iso: analysis.interview_datetime_iso,
        jobMatches,
      });
    } catch (err) {
      const mapped = aiErrorToHttp(err);
      if (mapped) return res.status(mapped.status).json({ message: mapped.message });
      console.error("Document analysis error:", err);
      return res.status(500).json({ message: "Failed to analyze document" });
    }
  });

  // API: Analyze URL (fetch page, extract text, analyze with AI)
  app.post(api.analyze.url.path, async (req, res) => {
    if (!requireAiConfigured(res)) return;
    try {
      const input = api.analyze.url.input.parse(req.body);
      let textToAnalyze = `Analyze this recruitment URL: ${input.url}`;
      const fetched = await fetchUrlContent(input.url);
      if (fetched?.text) {
        textToAnalyze = `${fetched.finalUrl}\n${fetched.text}`;
      }
      const analysis = await analyzeRecruitment(textToAnalyze);
      const userId = getUserId(req);
      if (userId != null) {
        appStorage.addAnalysis(userId, {
          inputType: "url",
          verdict: analysis.verdict,
          confidence: analysis.confidence,
        });
      }
      let jobMatches: any[] = [];
      if (analysis.verdict === "LEGIT") {
        jobMatches = await storage.getJobs();
      }
      res.json({
        verdict: analysis.verdict,
        confidence: analysis.confidence,
        positive_signals: analysis.positive_signals ?? [],
        negative_signals: analysis.negative_signals ?? [],
        job_role: analysis.job_role,
        company: analysis.company,
        interview_datetime_iso: analysis.interview_datetime_iso,
        jobMatches,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      const mapped = aiErrorToHttp(err);
      if (mapped) return res.status(mapped.status).json({ message: mapped.message });
      console.error("URL analysis error:", err);
      res.status(500).json({ message: "Failed to analyze URL" });
    }
  });

  // API: Get Jobs
  app.get(api.jobs.list.path, async (_req, res) => {
    const jobs = await storage.getJobs();
    res.json(jobs);
  });

  // API: Suggest Jobs (AI-powered)
  app.post(api.jobs.suggest.path, async (req, res) => {
    if (!requireAiConfigured(res)) return;
    try {
      const input = api.jobs.suggest.input.parse(req.body);
      const openai = getPreferredOpenAIClient();

      if (!openai && env.GEMINI_API_KEY) {
        const geminiSuggestion = await suggestJobsWithGemini(input);
        const validated = api.jobs.suggest.responses[200].parse(geminiSuggestion);
        return res.json(validated);
      }

      if (!openai) {
        return res.status(503).json({ message: "AI suggestions are not configured." });
      }

      const completion = await openai.chat.completions.create({
        model: env.GROQ_API_KEY ? "llama-3.1-8b-instant" : "grok-2",
        messages: [
          {
            role: "system",
            content: `You are a senior career coach and ATS expert.
Given a candidate profile, suggest suitable job titles and keyword sets for searching.
Return STRICT JSON:
{
  "suggestions": [
    {
      "title": string,
      "keywords": string[],
      "why": string[],
      "searchUrls": string[]
    }
  ]
}
Rules:
- 5 suggestions.
- keywords: 6-10 items, include tools/skills and role synonyms.
- why: 2-4 bullets, concrete.
- searchUrls: include at least 2 links per suggestion using:
  - https://www.linkedin.com/jobs/search/?keywords=<ENC>&location=<ENC>
  - https://www.indeed.com/jobs?q=<ENC>&l=<ENC>
- If location missing, use "Remote".
Do not include markdown.`,
          },
          {
            role: "user",
            content: JSON.stringify(input),
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error("No response from AI");

      const parsed = JSON.parse(content);
      const validated = api.jobs.suggest.responses[200].parse(parsed);
      return res.json(validated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      const mapped = aiErrorToHttp(err);
      if (mapped) return res.status(mapped.status).json({ message: mapped.message });
      console.error(err);
      return res.status(500).json({ message: "Failed to generate suggestions" });
    }
  });

  app.post(api.applications.add.path, (req, res) => {
    const userId = getUserId(req);
    if (userId == null) return res.status(401).json({ message: "Session required" });
    try {
      const input = api.applications.add.input.parse(req.body);
      const { application, stages } = appStorage.addApplication(userId, {
        jobTitle: input.jobTitle,
        company: input.company,
        sourceUrl: input.sourceUrl,
        status: input.interviewDateIso ? "Interview Scheduled" : input.status,
        verdictSnapshot: input.verdictSnapshot ?? undefined,
      });
      if (input.interviewDateIso) {
        const scheduledAt = new Date(input.interviewDateIso);
        if (!Number.isNaN(scheduledAt.getTime())) {
          const stage = appStorage.addInterviewStage({
            applicationId: application.id,
            roundType: "Interview",
            scheduledAt,
            mode: "Online",
            status: "Scheduled",
          });
          stages.push(stage);
        }
      }
      return res.json({ application, interviewStages: stages });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      return res.status(500).json({ message: "Failed to add application" });
    }
  });

  app.put(api.applications.update.path, (req, res) => {
    const userId = getUserId(req);
    if (userId == null) return res.status(401).json({ message: "Session required" });
    try {
      const input = api.applications.update.input.parse(req.body);
      const application = appStorage.updateApplication(userId, input.applicationId, {
        status: input.status,
        nextStep: input.nextStep,
      });
      if (!application) return res.status(404).json({ message: "Application not found" });
      return res.json({ application });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      return res.status(500).json({ message: "Failed to update application" });
    }
  });

  app.get(api.dashboard.path, (req, res) => {
    const userId = getUserId(req);
    if (userId == null) return res.status(401).json({ message: "Session required" });
    try {
      const data = appStorage.getDashboard(userId);
      const analysisStats = appStorage.getAnalysisStats(userId);
      return res.json({ ...data, analysisStats });
    } catch (err) {
      return res.status(500).json({ message: "Failed to load dashboard" });
    }
  });

  app.post("/api/applications/:applicationId/interview", (req, res) => {
    const userId = getUserId(req);
    if (userId == null) return res.status(401).json({ message: "Session required" });
    const applicationId = Number(req.params.applicationId);
    if (!Number.isInteger(applicationId)) return res.status(400).json({ message: "Invalid application ID" });
    const app = appStorage.getApplication(userId, applicationId);
    if (!app) return res.status(404).json({ message: "Application not found" });
    try {
      const body = req.body as { roundType?: string; scheduledAt?: string; mode?: string };
      const stage = appStorage.addInterviewStage({
        applicationId,
        roundType: body.roundType ?? "HR",
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        mode: body.mode ?? "Online",
      });
      return res.json({ stage });
    } catch {
      return res.status(500).json({ message: "Failed to add interview" });
    }
  });

  app.get("/api/interview-prep/:applicationId", async (req, res) => {
    const userId = getUserId(req);
    if (userId == null) return res.status(401).json({ message: "Session required" });
    const applicationId = Number(req.params.applicationId);
    if (!Number.isInteger(applicationId)) return res.status(400).json({ message: "Invalid application ID" });
    const application = appStorage.getApplication(userId, applicationId);
    if (!application) return res.status(404).json({ message: "Application not found" });
    const stages = appStorage.getInterviewStages(applicationId);
    if (!requireAiConfigured(res)) return;
    try {
      let payload: any;
      if (env.GEMINI_API_KEY) {
        try {
          payload = await interviewPrepWithGemini(application.jobTitle, application.company);
        } catch (err) {
          if (!isRateLimit(err)) throw err;
        }
      }

      if (!payload) {
        const openai = getPreferredOpenAIClient();
        if (openai) {
          try {
            const completion = await openai.chat.completions.create({
              model: env.GROQ_API_KEY ? "llama-3.1-8b-instant" : "grok-2",
              messages: [
                {
                  role: "system",
                  content: `You are a career coach. For interview preparation, return STRICT JSON only:
{
  "checklist": ["item1", "item2", ...],
  "questions": [{"category": "HR"|"Technical"|"Behavioral", "question": "...", "tip": "..."}],
  "tips": ["tip1", "tip2", ...]
}
- checklist: 6-10 items (documents to prepare, resume review, company research, etc.)
- questions: 8-12 items across HR, Technical, Behavioral
- tips: 4-6 short tips (how to answer, common mistakes, what interviewers expect)
Base content on job role and company only; do not invent company-specific facts.`,
                },
                {
                  role: "user",
                  content: `Job: ${application.jobTitle}. Company: ${application.company}.`,
                },
              ],
              response_format: { type: "json_object" },
            });
            const content = completion.choices[0].message.content;
            if (content) payload = JSON.parse(content);
          } catch (err) {
            if (!isRateLimit(err)) throw err;
          }
        }
      }

      if (!payload) {
        payload = buildInterviewPrepFallback(application.jobTitle, application.company);
      }

      const checklist = Array.isArray(payload.checklist) ? payload.checklist : [];
      const questions = Array.isArray(payload.questions)
        ? payload.questions.map((q: any) => ({
            category: q.category ?? "General",
            question: q.question ?? "",
            tip: q.tip ?? "",
          }))
        : [];
      const tips = Array.isArray(payload.tips) ? payload.tips : [];
      return res.json({
        application,
        stages,
        checklist,
        questions,
        tips,
      });
    } catch (err) {
      const mapped = aiErrorToHttp(err);
      if (mapped) return res.status(mapped.status).json({ message: mapped.message });
      return res.status(500).json({ message: "Failed to load interview prep" });
    }
  });

  app.post(api.interviewAnswer.evaluate.path, async (req, res) => {
    try {
      const input = api.interviewAnswer.evaluate.input.parse(req.body);
      const evaluated = await evaluateAnswerWithAi(input);
      return res.json(evaluated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      return res.status(500).json({ message: "Failed to evaluate answer" });
    }
  });

  return httpServer;
}
