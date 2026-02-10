import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useEvaluateInterviewAnswer, useInterviewPrep } from "@/hooks/use-analysis";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, Loader2, CheckSquare, HelpCircle, Lightbulb } from "lucide-react";
import { motion } from "framer-motion";

export default function InterviewPrep() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const applicationId = params.applicationId ? Number(params.applicationId) : null;
  const { data, isLoading, error } = useInterviewPrep(applicationId);
  const evaluateAnswer = useEvaluateInterviewAnswer();
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [reviews, setReviews] = useState<Record<number, { score: number; feedback: string; improvedAnswer: string }>>({});
  const storageKey = applicationId != null ? `prep_answers_${applicationId}` : null;
  const checklist = data?.checklist ?? [];
  const completedCount = useMemo(
    () => checklist.filter((_: string, i: number) => Boolean(checked[i])).length,
    [checklist, checked]
  );

  useEffect(() => {
    if (!storageKey) return;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Record<number, string>;
      setAnswers(parsed);
    } catch {
      // ignore
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(answers));
  }, [answers, storageKey]);

  if (applicationId == null) {
    setLocation("/dashboard");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-aurora pt-24 pb-32 flex items-center justify-center">
        <Loader2 className="h-16 w-16 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-aurora pt-24 pb-32 flex items-center justify-center">
        <Card className="glass-panel p-10 max-w-md text-center">
          <p className="text-red-200 mb-4">Could not load interview prep.</p>
          <Button onClick={() => setLocation("/dashboard")}>Back to dashboard</Button>
        </Card>
      </div>
    );
  }

  const { application, stages, questions, tips } = data;

  return (
    <div className="min-h-screen bg-aurora pt-24 pb-32">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-10"
        >
          <Button
            variant="ghost"
            onClick={() => setLocation("/dashboard")}
            className="text-indigo-100/60 hover:text-white mb-6 p-0"
          >
            <ArrowLeft className="mr-2 w-5 h-5" />
            Back to dashboard
          </Button>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tight">
            Interview preparation
          </h1>
          <p className="text-xl text-indigo-100/60 mt-2">
            {application.jobTitle} at {application.company}
          </p>
        </motion.div>

        {stages?.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-10"
          >
            <h2 className="text-2xl font-bold text-white mb-4">Interview rounds</h2>
            <div className="flex flex-wrap gap-3">
              {stages.map((s: { id: number; roundType: string; mode: string | null }) => (
                <Card key={s.id} className="glass-card px-4 py-3">
                  <span className="text-white font-medium">{s.roundType}</span>
                  {s.mode && <span className="text-indigo-200/60 ml-2">- {s.mode}</span>}
                </Card>
              ))}
            </div>
          </motion.section>
        )}

        {checklist?.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-10"
          >
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <CheckSquare className="w-7 h-7 text-primary" />
              Checklist
            </h2>
            <Card className="glass-card p-6">
              <div className="flex items-center justify-between mb-4 text-sm text-indigo-200/60">
                <span>
                  {completedCount} of {checklist.length} completed
                </span>
                <button
                  type="button"
                  className="text-indigo-200/70 hover:text-white transition-colors"
                  onClick={() => setChecked({})}
                >
                  Reset
                </button>
              </div>
              <ul className="space-y-3">
                {checklist.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-indigo-100/80">
                    <button
                      type="button"
                      aria-pressed={Boolean(checked[i])}
                      onClick={() => setChecked((prev) => ({ ...prev, [i]: !prev[i] }))}
                      className="w-5 h-5 rounded border border-white/30 flex items-center justify-center text-sm shrink-0 mt-0.5 transition-colors"
                    >
                      {checked[i] ? "x" : ""}
                    </button>
                    <span className={checked[i] ? "text-indigo-100/50 line-through" : ""}>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </motion.section>
        )}

        {questions?.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-10"
          >
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <HelpCircle className="w-7 h-7 text-primary" />
              Practice questions
            </h2>
            <Accordion type="multiple" className="space-y-2">
              {questions.map((q: { category: string; question: string }, i: number) => (
                <AccordionItem
                  key={i}
                  value={`q-${i}`}
                  className="glass-card rounded-2xl border-white/10 px-4"
                >
                  <AccordionTrigger className="text-left text-white font-medium hover:no-underline hover:text-primary/90 py-4">
                    <span className="text-indigo-200/60 text-sm font-normal mr-2">{q.category}:</span>
                    {q.question}
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pl-0">
                    <label className="text-xs uppercase tracking-wide text-indigo-200/60">
                      Your answer
                    </label>
                    <textarea
                      value={answers[i] ?? ""}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                      placeholder="Write your answer here..."
                      className="mt-2 w-full min-h-[110px] bg-white/5 border border-white/10 text-white placeholder:text-indigo-200/30 px-4 py-3 rounded-xl focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                    <div className="mt-3 flex items-center gap-3">
                      <Button
                        size="sm"
                        className="bg-white text-primary hover:bg-white/90"
                        disabled={!answers[i]?.trim() || evaluateAnswer.isPending}
                        onClick={async () => {
                          const answer = answers[i]?.trim();
                          if (!answer) return;
                          const review = await evaluateAnswer.mutateAsync({
                            question: q.question,
                            answer,
                            role: application.jobTitle,
                            company: application.company,
                          });
                          setReviews((prev) => ({ ...prev, [i]: review }));
                        }}
                      >
                        {evaluateAnswer.isPending ? "Checking..." : "Check answer"}
                      </Button>
                    </div>
                    {reviews[i] && (
                      <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="text-sm text-indigo-200/80">Score: {reviews[i].score}/100</p>
                        <p className="text-sm text-indigo-100/80 mt-1">{reviews[i].feedback}</p>
                        <p className="text-sm text-indigo-100/70 mt-2">
                          <span className="text-indigo-200/80">Improved answer:</span> {reviews[i].improvedAnswer}
                        </p>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.section>
        )}

        {tips?.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Lightbulb className="w-7 h-7 text-primary" />
              AI tips
            </h2>
            <Card className="glass-card p-6">
              <ul className="space-y-2">
                {tips.map((tip: string, i: number) => (
                  <li key={i} className="text-indigo-100/80 leading-relaxed">
                    - {tip}
                  </li>
                ))}
              </ul>
            </Card>
          </motion.section>
        )}
      </div>
    </div>
  );
}
