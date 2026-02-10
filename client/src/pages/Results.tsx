import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAnalysisStore } from "@/lib/store";
import { VerdictCard } from "@/components/VerdictCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, ArrowRight, Briefcase, PlusCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useAddApplication } from "@/hooks/use-analysis";
import { useToast } from "@/hooks/use-toast";

export default function Results() {
  const [, setLocation] = useLocation();
  const result = useAnalysisStore((state) => state.result);
  const { toast } = useToast();
  const addApp = useAddApplication();
  const [addOpen, setAddOpen] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const jobMatches = result?.jobMatches ?? [];
  const sampleReply = result?.sample_reply_mail;
  const replyToEmail = result?.reply_to_email;
  const interviewDateIso = result?.interview_datetime_iso;

  useEffect(() => {
    if (!result) {
      setLocation("/analyze");
    }
  }, [result, setLocation]);

  useEffect(() => {
    if (!result) return;
    setJobTitle(result.job_role ?? "");
    setCompany(result.company ?? "");
  }, [result]);

  if (!result) return null;

  const openGoogleCalendarEvent = () => {
    if (!interviewDateIso) return;
    const interviewDate = new Date(interviewDateIso);
    if (Number.isNaN(interviewDate.getTime())) return;
    const endDate = new Date(interviewDate.getTime() + 60 * 60 * 1000);
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const title = `${jobTitle || result.job_role || "Interview"} - ${company || result.company || "Company"}`;
    const details = "Interview reminder. Set notifications for 1 day and 1 hour before.";
    const url =
      "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      `&text=${encodeURIComponent(title)}` +
      `&dates=${encodeURIComponent(`${fmt(interviewDate)}/${fmt(endDate)}`)}` +
      `&details=${encodeURIComponent(details)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openMailClient = () => {
    if (!sampleReply) return;
    const to = replyToEmail ?? "";
    let subject = "Re: Interview / Application Update";
    let body = sampleReply;
    const subjectMatch = sampleReply.match(/^Subject:\s*(.+)$/im);
    if (subjectMatch?.[1]) {
      subject = subjectMatch[1].trim();
      body = sampleReply.replace(/^Subject:\s*.+$/im, "").trim();
    }
    const gmailComposeUrl =
      "https://mail.google.com/mail/?view=cm&fs=1" +
      `&to=${encodeURIComponent(to)}` +
      `&su=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;
    window.open(gmailComposeUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-aurora pt-16 pb-32">
      <div className="container mx-auto px-4">
        {/* Navigation / Header */}
        <div className="max-w-4xl mx-auto mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/analyze")}
              className="group mb-8 text-indigo-100/60 hover:text-white hover:bg-white/5 p-0 transition-all flex items-center"
            >
              <ArrowLeft className="mr-3 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
              <span className="text-lg">Return to Scanner</span>
            </Button>
            <h1 className="text-5xl md:text-6xl font-display font-bold text-white tracking-tight">Security Verdict</h1>
          </motion.div>
        </div>

        {/* Verdict Component */}
        <VerdictCard result={result} />

        {/* Action Buttons based on Verdict */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="max-w-4xl mx-auto mt-20"
        >
          {result.verdict === "LEGIT" ? (
            <div className="glass-panel border-green-500/20 p-10 rounded-3xl text-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
              <div className="relative z-10">
                <h3 className="text-3xl font-bold text-white mb-4">Candidate Safety Verified</h3>
                <p className="text-indigo-100/60 text-xl font-light mb-6 max-w-2xl mx-auto">
                  This engagement shows no signs of malicious patterns. We recommend cross-referencing this with our database of verified active listings.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                  <Button 
                    onClick={() => setLocation("/jobs")}
                    className="h-14 px-10 text-lg font-bold rounded-2xl bg-green-500 text-white hover:bg-green-600 shadow-2xl shadow-green-500/30 transition-all hover:scale-105 active:scale-95"
                  >
                    Browse Verified Jobs
                    <ArrowRight className="ml-3 w-5 h-5" />
                  </Button>
                  <Dialog open={addOpen} onOpenChange={setAddOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-14 px-10 text-lg rounded-2xl border-white/20 text-white hover:bg-white/10"
                      >
                        <PlusCircle className="mr-2 w-5 h-5" />
                        I applied - Add to dashboard
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-white/10 text-white">
                      <DialogHeader>
                        <DialogTitle>Add to my applications</DialogTitle>
                        <DialogDescription className="text-indigo-200/70">
                          Save this job so you can track status and prepare for interviews.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div>
                          <Label className="text-indigo-100">Job title</Label>
                          <Input
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            placeholder="e.g. Software Engineer"
                            className="mt-2 bg-white/5 border-white/10 text-white"
                          />
                        </div>
                        <div>
                          <Label className="text-indigo-100">Company</Label>
                          <Input
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            placeholder="e.g. Acme Inc."
                            className="mt-2 bg-white/5 border-white/10 text-white"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setAddOpen(false)}
                          className="border-white/20 text-white"
                        >
                          Cancel
                        </Button>
                        <Button
                          disabled={!jobTitle.trim() || !company.trim() || addApp.isPending}
                          onClick={async () => {
                            try {
                              await addApp.mutateAsync({
                                jobTitle: jobTitle.trim(),
                                company: company.trim(),
                                status: "Applied",
                                interviewDateIso: interviewDateIso || undefined,
                                verdictSnapshot: {
                                  verdict: result.verdict,
                                  confidence: result.confidence,
                                  positive_signals: result.positive_signals,
                                  negative_signals: result.negative_signals,
                                },
                              });
                              toast({ title: "Added to dashboard" });
                              setAddOpen(false);
                              setJobTitle("");
                              setCompany("");
                              setLocation("/dashboard");
                            } catch (e) {
                              toast({
                                title: "Failed to add",
                                description: e instanceof Error ? e.message : "Try again",
                                variant: "destructive",
                              });
                            }
                          }}
                          className="bg-white text-primary hover:bg-white/90"
                        >
                          {addApp.isPending ? "Adding..." : "Add"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                {jobMatches.length > 0 && (
                  <div className="mt-10 text-left">
                    <h4 className="text-xl font-bold text-white mb-4">Verified matches</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      {jobMatches.slice(0, 4).map((job) => (
                        <Card key={job.id} className="glass-card p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-white font-semibold">{job.title}</p>
                              <p className="text-indigo-100/60 text-sm">{job.company}</p>
                            </div>
                            <Button
                              size="sm"
                              className="bg-white text-primary hover:bg-white/90"
                              onClick={() => window.open(job.applyUrl, "_blank")}
                            >
                              Apply
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
                {sampleReply && (
                  <div className="mt-10 text-left">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <h4 className="text-xl font-bold text-white">Sample Reply Email</h4>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/20 text-white hover:bg-white/10"
                          onClick={openMailClient}
                        >
                          Send email
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/20 text-white hover:bg-white/10"
                          onClick={async () => {
                            await navigator.clipboard.writeText(sampleReply);
                            toast({ title: "Reply copied" });
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                    {replyToEmail && <p className="text-xs text-indigo-200/60 mb-2">To: {replyToEmail}</p>}
                    <Card className="glass-card p-5">
                      <pre className="text-sm text-indigo-100/80 whitespace-pre-wrap font-body">
                        {sampleReply}
                      </pre>
                    </Card>
                  </div>
                )}
                {interviewDateIso && (
                  <div className="mt-6 text-left">
                    <h4 className="text-xl font-bold text-white mb-3">Interview reminder detected</h4>
                    <Card className="glass-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <p className="text-indigo-100/80 text-sm">
                        Interview time: {new Date(interviewDateIso).toLocaleString()}
                      </p>
                      <Button
                        onClick={openGoogleCalendarEvent}
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        Add to Google Calendar
                      </Button>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="glass-panel border-red-500/20 p-10 rounded-3xl text-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
              <div className="relative z-10">
                <h3 className="text-3xl font-bold text-white mb-4">Critical Fraud Detected</h3>
                <p className="text-red-200/60 text-xl font-light mb-10 max-w-2xl mx-auto">
                  Our TrustGraph engine flagged this recruitment as high-risk. Terminate communication and do not share sensitive data.
                </p>
                <div className="flex flex-col sm:flex-row gap-6 justify-center">
                  <Button 
                    variant="outline"
                    onClick={() => setLocation("/analyze")}
                    className="h-16 px-10 text-lg border-white/10 text-white hover:bg-white/10 rounded-2xl transition-all"
                  >
                    Scan New Item
                  </Button>
                  <Button 
                    onClick={() => setLocation("/jobs")}
                    className="h-16 px-10 text-lg font-bold rounded-2xl bg-white text-primary hover:bg-white/90 shadow-2xl transition-all hover:scale-105"
                  >
                    Find Verified Jobs
                    <Briefcase className="ml-3 w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
