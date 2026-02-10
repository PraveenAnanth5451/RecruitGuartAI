import { z } from 'zod';
import { jobs, applications, interviewStages } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
const analysisResponseSchema = z.object({
  verdict: z.enum(["FAKE", "LEGIT", "UNCERTAIN"]),
  confidence: z.number(),
  positive_signals: z.array(z.string()),
  negative_signals: z.array(z.string()),
  explanations: z.array(z.string()).optional(),
  job_role: z.string().optional(),
  company: z.string().optional(),
  sample_reply_mail: z.string().optional(),
  reply_to_email: z.string().optional(),
  interview_datetime_iso: z.string().optional(),
  jobMatches: z.array(z.custom<typeof jobs.$inferSelect>()),
});

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/auth/register',
      input: z.object({
        email: z.string().email(),
        password: z.string().min(4),
      }),
      responses: {
        200: z.object({
          user: z.object({
            id: z.number(),
            email: z.string(),
          }),
        }),
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      input: z.object({
        email: z.string().email(),
        password: z.string().min(4),
      }),
      responses: {
        200: z.object({
          user: z.object({
            id: z.number(),
            email: z.string(),
          }),
        }),
        400: errorSchemas.validation,
        401: errorSchemas.internal,
        500: errorSchemas.internal,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout',
      responses: {
        200: z.object({ ok: z.boolean() }),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me',
      responses: {
        200: z.object({
          user: z.object({
            id: z.number(),
            email: z.string(),
          }).nullable(),
        }),
      },
    },
  },
  analyze: {
    text: {
      method: 'POST' as const,
      path: '/api/analyze/text',
      input: z.object({
        message: z.string().min(1, "Message is required"),
      }),
      responses: {
        200: analysisResponseSchema,
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    },
    document: {
      method: 'POST' as const,
      path: '/api/analyze/document',
      input: z.object({}),
      responses: {
        200: analysisResponseSchema,
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    },
    url: {
      method: 'POST' as const,
      path: '/api/analyze/url',
      input: z.object({
        url: z.string().url("Valid job posting URL is required"),
      }),
      responses: {
        200: analysisResponseSchema,
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    },
  },
  applications: {
    add: {
      method: 'POST' as const,
      path: '/api/applications/add',
      input: z.object({
        jobTitle: z.string().min(1),
        company: z.string().min(1),
        sourceUrl: z.string().url().optional(),
        status: z.string().default("Applied"),
        verdictSnapshot: z.record(z.unknown()).optional(),
        interviewDateIso: z.string().datetime().optional(),
      }),
      responses: {
        200: z.object({
          application: z.custom<typeof applications.$inferSelect>(),
          interviewStages: z.array(z.custom<typeof interviewStages.$inferSelect>()),
        }),
        400: errorSchemas.validation,
        401: errorSchemas.internal,
        500: errorSchemas.internal,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/applications/update',
      input: z.object({
        applicationId: z.number(),
        status: z.string().optional(),
        nextStep: z.string().optional(),
      }),
      responses: {
        200: z.object({ application: z.custom<typeof applications.$inferSelect>() }),
        400: errorSchemas.validation,
        401: errorSchemas.internal,
        500: errorSchemas.internal,
      },
    },
  },
  dashboard: {
    method: 'GET' as const,
    path: '/api/dashboard',
    responses: {
      200: z.object({
        applications: z.array(z.custom<typeof applications.$inferSelect>()),
        upcomingInterviews: z.array(z.object({
          application: z.custom<typeof applications.$inferSelect>(),
          stage: z.custom<typeof interviewStages.$inferSelect>(),
        })),
        analysisStats: z.object({
          total: z.number(),
          fake: z.number(),
          legit: z.number(),
          uncertain: z.number(),
          daily: z.array(z.object({
            date: z.string(),
            total: z.number(),
            fake: z.number(),
            legit: z.number(),
            uncertain: z.number(),
          })),
        }),
      }),
      401: errorSchemas.internal,
      500: errorSchemas.internal,
    },
  },
  interviewPrep: {
    method: 'GET' as const,
    path: '/api/interview-prep/:applicationId',
    responses: {
      200: z.object({
        application: z.custom<typeof applications.$inferSelect>(),
        stages: z.array(z.custom<typeof interviewStages.$inferSelect>()),
        checklist: z.array(z.string()),
        questions: z.array(z.object({
          category: z.string(),
          question: z.string(),
          tip: z.string(),
        })),
        tips: z.array(z.string()),
      }),
      401: errorSchemas.internal,
      404: errorSchemas.internal,
      500: errorSchemas.internal,
    },
  },
  interviewAnswer: {
    evaluate: {
      method: 'POST' as const,
      path: '/api/interview-prep/evaluate-answer',
      input: z.object({
        question: z.string().min(1),
        answer: z.string().min(1),
        role: z.string().optional(),
        company: z.string().optional(),
      }),
      responses: {
        200: z.object({
          score: z.number(),
          feedback: z.string(),
          improvedAnswer: z.string(),
        }),
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    },
  },
  jobs: {
    list: {
      method: 'GET' as const,
      path: '/api/jobs',
      responses: {
        200: z.array(z.custom<typeof jobs.$inferSelect>()),
      },
    },
    suggest: {
      method: 'POST' as const,
      path: '/api/jobs/suggest',
      input: z.object({
        profileText: z.string().min(10, "Profile text is required"),
        location: z.string().optional(),
        seniority: z.enum(["intern", "junior", "mid", "senior"]).optional(),
      }),
      responses: {
        200: z.object({
          suggestions: z.array(
            z.object({
              title: z.string(),
              keywords: z.array(z.string()).min(3),
              why: z.array(z.string()).min(2),
              searchUrls: z.array(z.string().url()).min(1),
            }),
          ),
        }),
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type AnalyzeTextInput = z.infer<typeof api.analyze.text.input>;
export type AnalysisResult = z.infer<typeof api.analyze.text.responses[200]>;
export type JobSuggestInput = z.infer<typeof api.jobs.suggest.input>;
export type JobSuggestResponse = z.infer<typeof api.jobs.suggest.responses[200]>;
