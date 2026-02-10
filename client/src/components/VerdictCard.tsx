import { type AnalysisResult } from "@shared/routes";
import { ShieldCheck, ShieldAlert, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface VerdictCardProps {
  result: AnalysisResult;
}

export function VerdictCard({ result }: VerdictCardProps) {
  const { verdict, confidence, positive_signals, negative_signals, job_role, company } = result;
  const explanations = [
    ...(positive_signals ?? []),
    ...(negative_signals ?? []),
  ].filter(Boolean);
  if (explanations.length === 0 && (result as any).explanations?.length) {
    explanations.push(...(result as any).explanations);
  }

  const isFake = verdict === "FAKE";
  const isLegit = verdict === "LEGIT";
  
  const styles = {
    FAKE: {
      color: "text-destructive",
      bg: "bg-destructive/10",
      border: "border-destructive/20",
      icon: ShieldAlert,
      title: "Suspicious Activity Detected",
      gradient: "from-red-500 to-orange-500",
    },
    LEGIT: {
      color: "text-green-600",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
      icon: ShieldCheck,
      title: "Likely Legitimate",
      gradient: "from-green-500 to-emerald-500",
    },
    UNCERTAIN: {
      color: "text-yellow-600",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20",
      icon: HelpCircle,
      title: "Requires Caution",
      gradient: "from-yellow-500 to-amber-500",
    },
  }[verdict];

  const Icon = styles.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-4xl mx-auto"
    >
      {/* Verdict Header */}
      <div className={cn(
        "relative overflow-hidden rounded-[2rem] border-0 p-12 mb-10 glass-panel transition-all duration-500",
        isFake ? "verdict-glow-fake" : isLegit ? "verdict-glow-legit" : ""
      )}>
        <div className={cn(
          "absolute top-0 right-0 w-96 h-96 bg-gradient-to-br opacity-20 rounded-full blur-[100px] -mr-32 -mt-32 animate-pulse-slow",
          styles.gradient
        )} />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10 text-center md:text-left">
          <motion.div 
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring" }}
            className={cn("p-6 rounded-3xl shadow-2xl", styles.bg)}
          >
            <Icon className={cn("w-20 h-20", styles.color)} />
          </motion.div>
          
          <div className="flex-1">
            <motion.h2 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className={cn("text-6xl font-display font-black mb-2 tracking-tighter", styles.color)}
            >
              {verdict}
            </motion.h2>
            <p className="text-indigo-100/60 text-2xl font-light">
              {styles.title}
            </p>
            {(job_role || company) && (
              <div className="mt-4 flex flex-wrap items-center gap-3 text-indigo-100/70 text-base">
                {job_role && (
                  <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10">
                    Role: {job_role}
                  </span>
                )}
                {company && (
                  <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10">
                    Company: {company}
                  </span>
                )}
              </div>
            )}
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center justify-center p-8 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-xl min-w-[180px] shadow-2xl"
          >
            <span className="text-5xl font-black font-display text-white mb-1">{Math.round(confidence)}%</span>
            <span className="text-sm text-indigo-200/40 font-bold uppercase tracking-[0.2em]">Confidence</span>
          </motion.div>
        </div>
      </div>

      {/* Analysis Details */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="glass-panel rounded-[2rem] border-white/5 p-10 md:p-12"
      >
        <h3 className="text-3xl font-bold font-display mb-10 text-white flex items-center gap-4">
          <span className="w-2 h-10 bg-primary rounded-full shadow-[0_0_15px_rgba(79,70,229,0.5)]" />
          Intelligence Report
        </h3>

        {(positive_signals?.length ?? 0) > 0 && (
          <div className="mb-8">
            <h4 className="text-lg font-semibold text-green-400/90 mb-4">Positive trust signals</h4>
            <ul className="grid md:grid-cols-2 gap-4">
              {positive_signals!.map((s, i) => (
                <motion.li
                  key={`p-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.05 * i }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20"
                >
                  <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="text-indigo-100/80 text-base font-light">{s}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        )}

        {(negative_signals?.length ?? 0) > 0 && (
          <div className="mb-8">
            <h4 className="text-lg font-semibold text-red-400/90 mb-4">Red flags</h4>
            <ul className="grid md:grid-cols-2 gap-4">
              {negative_signals!.map((s, i) => (
                <motion.li
                  key={`n-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.05 * i }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20"
                >
                  <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
                  <span className="text-indigo-100/80 text-base font-light">{s}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        )}

        {explanations.length > 0 && (positive_signals?.length ?? 0) === 0 && (negative_signals?.length ?? 0) === 0 && (
          <ul className="grid md:grid-cols-2 gap-6">
            {explanations.map((reason, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * index }}
                className="flex items-start gap-4 p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all duration-300 group"
              >
                <div className={cn(
                  "mt-2 w-3 h-3 rounded-full flex-shrink-0 shadow-lg group-hover:scale-125 transition-transform",
                  isFake ? "bg-red-500 shadow-red-500/50" : isLegit ? "bg-green-500 shadow-green-500/50" : "bg-yellow-500 shadow-yellow-500/50"
                )} />
                <span className="text-indigo-100/70 text-lg leading-relaxed font-light">{reason}</span>
              </motion.li>
            ))}
          </ul>
        )}
      </motion.div>
    </motion.div>
  );
}
