import { useJobSuggestions, useJobs } from "@/hooks/use-analysis";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin, Building2, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Jobs() {
  const { data: jobs, isLoading, error } = useJobs();
  const { toast } = useToast();
  const suggestMutation = useJobSuggestions();
  const [profileText, setProfileText] = useState("");
  const [suggestions, setSuggestions] = useState<
    { title: string; keywords: string[]; why: string[]; searchUrls: string[] }[]
  >([]);
  const isGenerating = suggestMutation.isPending;
  let jobsState: "loading" | "error" | "empty" | "ready" = "ready";
  if (isLoading) jobsState = "loading";
  else if (error) jobsState = "error";
  else if ((jobs?.length ?? 0) === 0) jobsState = "empty";

  return (
    <div className="min-h-screen bg-aurora pt-24 pb-32">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-16 text-center md:text-left"
          >
            <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-6 tracking-tight">Verified Opportunities</h1>
            <p className="text-indigo-100/60 text-xl max-w-2xl font-light">
              Don't let scammers stall your career. Apply to these vetted, high-quality roles from our trusted network.
            </p>
          </motion.div>

          {/* AI Suggestions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-12"
          >
            <Card className="glass-panel border-white/10 p-8 sm:p-10 rounded-[2.5rem]">
              <div className="flex items-start justify-between gap-6 flex-col lg:flex-row">
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-white tracking-tight mb-2">
                    Smart Job Suggestions
                  </h2>
                  <p className="text-indigo-100/60 text-lg font-light">
                    Paste your skills/resume summary. Our LLM engine will generate job titles, keyword packs, and direct search links.
                  </p>
                </div>
                <Button
                  disabled={isGenerating}
                  className="h-14 px-8 rounded-2xl bg-white text-primary hover:bg-white/90 font-bold text-lg shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                  onClick={async () => {
                    if (profileText.trim().length < 10) {
                      toast({
                        title: "Add more detail",
                        description: "Please paste at least a few lines about your skills and experience.",
                        variant: "destructive",
                      });
                      return;
                    }
                    try {
                      const res = await suggestMutation.mutateAsync({ profileText });
                      setSuggestions(res.suggestions);
                    } catch (e) {
                      toast({
                        title: "Suggestion failed",
                        description: e instanceof Error ? e.message : "Something went wrong",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-3 h-5 w-5" />
                      Generate
                    </>
                  )}
                </Button>
              </div>

              <div className="mt-8 space-y-3">
                <Label className="text-indigo-100/70">Your profile</Label>
                <Textarea
                  value={profileText}
                  onChange={(e) => setProfileText(e.target.value)}
                  placeholder="Example: Final-year CSE student. Built React apps, Node APIs. Skills: TypeScript, React, Tailwind, Express, PostgreSQL, Git. Interested in frontend/backend roles..."
                  className="min-h-[160px] bg-white/5 border-white/10 text-white placeholder:text-indigo-200/30 resize-none p-5 text-lg rounded-2xl focus:ring-2 focus:ring-primary/50 transition-all font-light leading-relaxed"
                />
              </div>

              {suggestions.length > 0 && (
                <div className="mt-10 grid gap-6">
                  {suggestions.map((s, i) => (
                    <motion.div
                      key={`${s.title}-${s.keywords.join("|")}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                    >
                      <Card className="glass-card p-8 rounded-[2rem]">
                        <div className="flex flex-col lg:flex-row gap-6 justify-between">
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold text-white tracking-tight">{s.title}</h3>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {s.keywords.slice(0, 10).map((k) => (
                                <Badge
                                  key={k}
                                  className="bg-white/10 text-indigo-200 border-white/10 hover:bg-white/15"
                                >
                                  {k}
                                </Badge>
                              ))}
                            </div>
                            <ul className="mt-5 space-y-2 text-indigo-100/60 font-light">
                              {s.why.slice(0, 4).map((w) => (
                                <li key={w} className="leading-relaxed">
                                  - {w}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="flex flex-col gap-3 min-w-[220px]">
                            {s.searchUrls.slice(0, 3).map((u) => (
                              <Button
                                key={u}
                                variant="outline"
                                className="h-12 rounded-2xl border-white/10 text-white hover:bg-white/10"
                                onClick={() => window.open(u, "_blank")}
                              >
                                Open search
                                <ExternalLink className="ml-3 w-4 h-4" />
                              </Button>
                            ))}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

          {jobsState === "loading" && (
            <div className="flex flex-col items-center justify-center py-32 bg-white/5 rounded-[2.5rem] border border-white/10 backdrop-blur-xl">
              <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
              <p className="text-indigo-100/60 text-xl font-light">Syncing with verified job boards...</p>
            </div>
          )}

          {jobsState === "error" && (
            <div className="glass-panel border-red-500/20 p-12 rounded-[2.5rem] text-center">
              <p className="text-xl text-red-200/80">Unable to retrieve job feed. Please check your connection.</p>
            </div>
          )}

          {jobsState === "empty" && (
            <div className="glass-panel border-white/10 border-dashed border-2 rounded-[2.5rem] p-24 text-center">
              <p className="text-2xl font-light text-indigo-100/40">No active matches found for your criteria.</p>
            </div>
          )}

          {jobsState === "ready" && (
            <div className="grid gap-8">
              {jobs?.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                >
                  <Card className="glass-card p-10 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
                    <div className="flex flex-col lg:flex-row justify-between gap-10 relative z-10">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                          <h3 className="text-3xl font-bold font-display text-white group-hover:text-primary transition-colors tracking-tight">
                            {job.title}
                          </h3>
                          <Badge className="w-fit h-8 px-4 text-sm font-bold bg-white/10 text-indigo-200 border-white/10 group-hover:bg-primary group-hover:text-white transition-all">
                            {job.source}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-6 text-lg text-indigo-100/60 mb-8 font-light">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-indigo-400" />
                            {job.company}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-indigo-400" />
                            {job.location || "Global Remote"}
                          </div>
                        </div>

                        <p className="text-indigo-100/40 text-lg line-clamp-2 leading-relaxed font-light">
                          {job.description}
                        </p>
                      </div>

                      <div className="flex items-center">
                        <Button
                          size="lg"
                          className="h-16 px-10 text-xl font-bold rounded-2xl bg-white text-primary hover:bg-white/90 shadow-2xl transition-all hover:scale-105 active:scale-95 group-hover:shadow-primary/20 w-full lg:w-auto"
                          onClick={() => window.open(job.applyUrl, "_blank")}
                        >
                          Express Apply
                          <ExternalLink className="ml-3 w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
