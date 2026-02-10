import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useDashboard, useUpdateApplication } from "@/hooks/use-analysis";
import { api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Calendar,
  Video,
  Loader2,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  Applied: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  Shortlisted: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "Interview Scheduled": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  Rejected: "bg-red-500/20 text-red-300 border-red-500/30",
  "Offer Received": "bg-green-500/20 text-green-300 border-green-500/30",
};

const STATUS_OPTIONS = ["Applied", "Shortlisted", "Interview Scheduled", "Rejected", "Offer Received"];

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useDashboard();
  const updateApp = useUpdateApplication();

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
          <p className="text-red-200 mb-4">Unable to load dashboard.</p>
          <Button onClick={() => setLocation("/")}>Go home</Button>
        </Card>
      </div>
    );
  }

  const { applications, upcomingInterviews, analysisStats } = data;
  const trend = analysisStats?.daily ?? [];
  const maxDaily = Math.max(1, ...trend.map((d) => d.total));

  return (
    <div className="min-h-screen bg-aurora pt-24 pb-32">
      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-5xl md:text-6xl font-display font-bold text-white tracking-tight mb-2">
            My Dashboard
          </h1>
          <p className="text-indigo-100/60 text-xl font-light">
            Track applications and upcoming interviews.
          </p>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-primary" />
            Scan Activity
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="glass-card p-6">
              <p className="text-indigo-100/60 text-sm">Total scans</p>
              <p className="text-3xl font-bold text-white mt-2">{analysisStats.total}</p>
            </Card>
            <Card className="glass-card p-6 border border-red-500/20">
              <p className="text-red-200/70 text-sm">Fake detected</p>
              <p className="text-3xl font-bold text-white mt-2">{analysisStats.fake}</p>
            </Card>
            <Card className="glass-card p-6 border border-green-500/20">
              <p className="text-green-200/70 text-sm">Legit verified</p>
              <p className="text-3xl font-bold text-white mt-2">{analysisStats.legit}</p>
            </Card>
            <Card className="glass-card p-6 border border-yellow-500/20">
              <p className="text-yellow-200/70 text-sm">Needs review</p>
              <p className="text-3xl font-bold text-white mt-2">{analysisStats.uncertain}</p>
            </Card>
          </div>

          <Card className="glass-panel p-6">
            <p className="text-indigo-100/70 text-sm mb-4">7-day scan trend</p>
            <div className="space-y-3">
              {trend.map((day) => (
                <div key={day.date} className="flex items-center gap-3">
                  <span className="text-indigo-100/50 text-xs w-24">{day.date}</span>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-cyan-400 rounded-full"
                      style={{ width: `${(day.total / maxDaily) * 100}%` }}
                    />
                  </div>
                  <span className="text-indigo-100/60 text-xs w-8 text-right">{day.total}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.section>

        {upcomingInterviews.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-12"
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Calendar className="w-7 h-7 text-primary" />
              Upcoming Interviews
            </h2>
            <div className="space-y-4">
              {upcomingInterviews.map(({ application, stage }) => (
                <Card
                  key={stage.id}
                  className="glass-card p-6 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <div className="flex-1">
                    <p className="text-white font-bold text-lg">{application.company}</p>
                    <p className="text-indigo-100/70">{application.jobTitle}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-indigo-200/60">
                      <span className="flex items-center gap-1">
                        <Video className="w-4 h-4" />
                        {stage.roundType} - {stage.mode ?? "n/a"}
                      </span>
                      {stage.scheduledAt && (
                        <span>
                          {format(new Date(stage.scheduledAt), "PPp")}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => setLocation(`/interview-prep/${application.id}`)}
                    className="bg-white text-primary hover:bg-white/90 shrink-0"
                  >
                    Prepare
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Card>
              ))}
            </div>
          </motion.section>
        )}

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-primary" />
            My Applications
          </h2>
          {applications.length === 0 ? (
            <Card className="glass-panel border border-dashed border-white/20 p-16 text-center">
              <p className="text-indigo-100/50 text-lg mb-6">
                No applications yet. Analyze a job and add it from the results page.
              </p>
              <Button
                onClick={() => setLocation("/analyze")}
                className="bg-white text-primary hover:bg-white/90"
              >
                Analyze a job
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {applications.map((app, i) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <Card className="glass-card p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">{app.jobTitle}</h3>
                        <Badge
                          className={cn(
                            "shrink-0",
                            statusColors[app.status] ?? "bg-white/10 text-white border-white/20"
                          )}
                        >
                          {app.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-indigo-100/70">
                        <Building2 className="w-4 h-4" />
                        {app.company}
                      </div>
                      {app.appliedDate && (
                        <p className="text-sm text-indigo-200/50 mt-1">
                          Applied {format(new Date(app.appliedDate), "PPP")}
                        </p>
                      )}
                      {app.nextStep && (
                        <p className="text-sm text-primary/90 mt-1">Next: {app.nextStep}</p>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 shrink-0 items-start sm:items-center">
                      <select
                        value={app.status}
                        onChange={(e) => {
                          updateApp.mutate(
                            { applicationId: app.id, status: e.target.value },
                            { onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.dashboard.path] }) }
                          );
                        }}
                        className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s} className="bg-card text-foreground">
                            {s}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/20 text-white hover:bg-white/10"
                        onClick={() => setLocation(`/interview-prep/${app.id}`)}
                      >
                        Interview prep
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
}
