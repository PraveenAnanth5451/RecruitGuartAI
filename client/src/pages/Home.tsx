import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Search, FileText, CheckCircle2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen bg-aurora flex flex-col">
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse-slow delay-1000" />
        </div>

        <div className="container relative z-10 mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white text-sm font-semibold mb-8 border border-white/20 backdrop-blur-md">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              AI-Powered Recruitment Protection
            </span>
            <h1 className="text-5xl md:text-8xl font-display font-bold text-white mb-6 leading-tight tracking-tight">
              Detect Fake Job Offers <br className="hidden md:block" />
              <span className="text-gradient">With Advanced AI</span>
            </h1>
            <p className="text-xl text-indigo-100/80 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
              RecruitGuard uses TrustGraph, an LLM + retrieval signal engine, to spot fraud patterns in seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link href="/analyze">
                <Button size="lg" className="h-16 px-10 rounded-full text-xl font-bold shadow-2xl shadow-primary/40 bg-white text-primary hover:bg-white/90 transition-all hover:scale-105 active:scale-95">
                  Start Analysis
                  <ArrowRight className="ml-2 w-6 h-6" />
                </Button>
              </Link>
              <Link href="/about">
                <Button variant="outline" size="lg" className="h-16 px-10 rounded-full text-xl border-white/20 text-white hover:bg-white/10 backdrop-blur-sm transition-all">
                  How it Works
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">Unrivaled Protection</h2>
            <p className="text-indigo-200/60 max-w-2xl mx-auto text-lg">
              Engineered for the modern job seeker, combining state-of-the-art AI with human-centric design.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            <FeatureCard
              icon={Search}
              title="TrustGraph Intelligence"
              description="LLM reasoning + retrieval signals detect risk fast by analyzing tone, domain, and metadata."
              delay={0.1}
            />
            <FeatureCard
              icon={FileText}
              title="Secure OCR Scan"
              description="Upload PDF offer letters. Our vision engine extracts text and checks for signature authenticity and company letterhead anomalies."
              delay={0.2}
            />
            <FeatureCard
              icon={CheckCircle2}
              title="Legit Job Feed"
              description="Found a fake? Don't stop there. We provide a curated stream of verified opportunities that match your specific profile."
              delay={0.3}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, delay }: { icon: any, title: string, description: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      className="glass-card p-10 rounded-3xl group"
    >
      <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary mb-8 group-hover:scale-110 group-hover:bg-primary/30 transition-all duration-500">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-2xl font-bold font-display mb-4 text-white">{title}</h3>
      <p className="text-indigo-100/60 leading-relaxed text-lg font-light">
        {description}
      </p>
    </motion.div>
  );
}
