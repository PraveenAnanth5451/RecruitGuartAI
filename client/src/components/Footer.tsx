import { ShieldCheck } from "lucide-react";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-background/40 border-t border-white/10 py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-primary/5 backdrop-blur-3xl" />
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex items-center space-x-4 group cursor-pointer">
            <div className="p-3 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform duration-300">
              <ShieldCheck className="h-8 w-8 text-primary shadow-2xl" />
            </div>
            <span className="text-2xl font-bold font-display text-white tracking-tighter">RecruitGuard AI</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-12 text-lg font-medium text-indigo-100/40">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
            <Link href="/analyze" className="hover:text-white transition-colors">Analyze</Link>
            <Link href="/jobs" className="hover:text-white transition-colors">Jobs</Link>
          </div>

          <p className="text-lg text-indigo-100/20 font-light">
            (c) {new Date().getFullYear()} Build with Precision & Privacy.
          </p>
        </div>
      </div>
    </footer>
  );
}
