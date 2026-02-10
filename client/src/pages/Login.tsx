import { FormEvent, useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { useAuthStore } from "@/lib/auth";

export default function Login() {
  const [, setLocation] = useLocation();
  const loginWithPassword = useAuthStore((s) => s.loginWithPassword);
  const register = useAuthStore((s) => s.register);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    setLocation("/dashboard");
    return null;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes("@")) {
      setError("Enter a valid email.");
      return;
    }
    if (password.trim().length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    try {
      setIsSubmitting(true);
      if (isRegisterMode) {
        await register(normalized, password.trim());
      } else {
        await loginWithPassword(normalized, password.trim());
      }
      setLocation("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-aurora pt-24 pb-20">
      <div className="container mx-auto px-4 max-w-md">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass-panel p-8">
            <h1 className="text-3xl font-display font-bold text-white mb-2">Sign in</h1>
            <p className="text-indigo-100/60 mb-6">
              {isRegisterMode
                ? "Create your account to keep your applications and prep data private."
                : "Access your analysis history and interview prep."}
            </p>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div>
                <Label className="text-indigo-100">Email</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 bg-white/5 border-white/10 text-white"
                  placeholder="you@example.com"
                  type="email"
                />
              </div>
              <div>
                <Label className="text-indigo-100">Password</Label>
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 bg-white/5 border-white/10 text-white"
                  placeholder="Enter password"
                  type="password"
                />
              </div>
              {error && <p className="text-sm text-red-300">{error}</p>}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-white text-primary hover:bg-white/90"
              >
                {isSubmitting ? "Please wait..." : isRegisterMode ? "Register" : "Login"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10"
                onClick={() => setIsRegisterMode((v) => !v)}
              >
                {isRegisterMode ? "Already have an account? Login" : "New user? Register"}
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
