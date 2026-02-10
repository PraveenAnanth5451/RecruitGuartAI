import { motion } from "framer-motion";
import { ShieldCheck, Lock, Eye, HeartHandshake } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-aurora pt-32 pb-24">
      <div className="container mx-auto px-4 max-w-4xl text-white">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-20"
        >
          <h1 className="text-6xl md:text-8xl font-display font-black mb-6 tracking-tighter">Our Mission</h1>
          <p className="text-2xl text-indigo-100/60 leading-relaxed font-light">
            Empowering the global workforce with high-fidelity <br className="hidden md:block" />
            AI detection tools to eliminate recruitment fraud.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-24">
          <AboutCard 
            icon={ShieldCheck}
            title="Elite Protection"
            description="We leverage TrustGraph (LLM + retrieval signals) to identify deceptive language patterns and infrastructure anomalies in real-time."
            delay={0.1}
          />
          <AboutCard 
            icon={Eye}
            title="Neural Transparency"
            description="We provide human-readable explainability for every AI verdict, teaching you to see the red flags the model sees."
            delay={0.2}
          />
          <AboutCard 
            icon={Lock}
            title="Privacy First"
            description="All analysis is handled in-memory. We do not persist sensitive documents or PII beyond the session context."
            delay={0.3}
          />
          <AboutCard 
            icon={HeartHandshake}
            title="Candidate Alliance"
            description="Our mission is purely defensive - we exist to ensure your professional journey isn't derailed by malicious actors."
            delay={0.4}
          />
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="glass-panel border-white/10 rounded-[2.5rem] p-12 md:p-20 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-30" />
          <h2 className="text-4xl font-black font-display mb-8">Official Disclaimer</h2>
          <p className="text-xl text-indigo-100/60 leading-relaxed max-w-3xl mx-auto font-light">
            RecruitGuard AI utilizes advanced probabilistic modeling to evaluate recruitment authenticity. 
            While our engine is state-of-the-art, it should complement and not replace your own professional due diligence. 
            Never transfer funds or sensitive banking details for any employment opportunity.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function AboutCard({ icon: Icon, title, description, delay }: { icon: any, title: string, description: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      className="glass-card p-10 rounded-3xl group border-white/5"
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
