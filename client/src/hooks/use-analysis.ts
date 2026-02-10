import { useMutation, useQuery } from "@tanstack/react-query";
import {
  api,
  type AnalysisResult,
  type AnalyzeTextInput,
  type JobSuggestInput,
  type JobSuggestResponse,
} from "@shared/routes";
import { useAnalysisStore } from "@/lib/store";

export function useAnalyzeText() {
  const setAnalysis = useAnalysisStore((state) => state.setResult);

  return useMutation({
    mutationFn: async (data: AnalyzeTextInput) => {
      // Validate input
      const validated = api.analyze.text.input.parse(data);
      
      const res = await fetch(api.analyze.text.path, {
        method: api.analyze.text.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Analysis failed");
      }

      const result = await res.json();
      return api.analyze.text.responses[200].parse(result);
    },
    onSuccess: (data) => {
      setAnalysis(data);
    }
  });
}

export function useAnalyzeDocument() {
  const setAnalysis = useAnalysisStore((state) => state.setResult);

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(api.analyze.document.path, {
        method: api.analyze.document.method,
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Document analysis failed");
      }

      const result = await res.json();
      return api.analyze.document.responses[200].parse(result);
    },
    onSuccess: (data) => {
      setAnalysis(data);
    },
  });
}

export function useJobs() {
  return useQuery({
    queryKey: [api.jobs.list.path],
    queryFn: async () => {
      const res = await fetch(api.jobs.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return api.jobs.list.responses[200].parse(await res.json());
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useJobSuggestions() {
  return useMutation({
    mutationFn: async (data: JobSuggestInput): Promise<JobSuggestResponse> => {
      const validated = api.jobs.suggest.input.parse(data);
      const res = await fetch(api.jobs.suggest.path, {
        method: api.jobs.suggest.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Failed to generate suggestions");
      }
      return api.jobs.suggest.responses[200].parse(await res.json());
    },
  });
}

export function useAnalyzeUrl() {
  const setAnalysis = useAnalysisStore((state) => state.setResult);
  return useMutation({
    mutationFn: async (data: { url: string }) => {
      const validated = api.analyze.url.input.parse(data);
      const res = await fetch(api.analyze.url.path, {
        method: api.analyze.url.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "URL analysis failed");
      }
      const result = await res.json();
      return api.analyze.url.responses[200].parse(result);
    },
    onSuccess: (data) => setAnalysis(data),
  });
}

export function useAddApplication() {
  return useMutation({
    mutationFn: async (data: {
      jobTitle: string;
      company: string;
      sourceUrl?: string;
      status?: string;
      interviewDateIso?: string;
      verdictSnapshot?: Record<string, unknown>;
    }) => {
      const res = await fetch(api.applications.add.path, {
        method: api.applications.add.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to add application");
      }
      return api.applications.add.responses[200].parse(await res.json());
    },
  });
}

export function useDashboard() {
  return useQuery({
    queryKey: [api.dashboard.path],
    queryFn: async () => {
      const res = await fetch(api.dashboard.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load dashboard");
      return api.dashboard.responses[200].parse(await res.json());
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useUpdateApplication() {
  return useMutation({
    mutationFn: async (data: { applicationId: number; status?: string; nextStep?: string }) => {
      const res = await fetch(api.applications.update.path, {
        method: api.applications.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update");
      }
      return api.applications.update.responses[200].parse(await res.json());
    },
  });
}

export function useInterviewPrep(applicationId: number | null) {
  return useQuery({
    queryKey: ["/api/interview-prep", applicationId],
    queryFn: async () => {
      if (applicationId == null) throw new Error("No application");
      const res = await fetch(`/api/interview-prep/${applicationId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load interview prep");
      return res.json();
    },
    enabled: applicationId != null,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useEvaluateInterviewAnswer() {
  return useMutation({
    mutationFn: async (data: { question: string; answer: string; role?: string; company?: string }) => {
      const validated = api.interviewAnswer.evaluate.input.parse(data);
      const res = await fetch(api.interviewAnswer.evaluate.path, {
        method: api.interviewAnswer.evaluate.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to evaluate answer");
      }
      return api.interviewAnswer.evaluate.responses[200].parse(await res.json());
    },
  });
}
