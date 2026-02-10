import { Link, useLocation } from "wouter";
import { ShieldCheck, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/lib/auth";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  const links = [
    { href: "/", label: "Home" },
    { href: "/analyze", label: "Analyze" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/jobs", label: "Jobs" },
    { href: "/about", label: "About" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/60 backdrop-blur-xl">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <ShieldCheck className="h-10 w-10 text-primary shadow-2xl shadow-primary/50" />
              <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full animate-pulse" />
            </div>
            <span className="text-2xl font-bold font-display tracking-tighter text-white">
              RecruitGuard <span className="text-primary italic">AI</span>
            </span>
          </Link>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-10">
            {links.map((link) => (
              <Link key={link.href} href={link.href}>
                <span
                  className={cn(
                    "text-lg font-medium transition-all hover:text-white cursor-pointer relative py-2",
                    location === link.href ? "text-white after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary" : "text-indigo-200/60"
                  )}
                >
                  {link.label}
                </span>
              </Link>
            ))}
            <Link href="/analyze">
              <Button size="lg" className="h-12 px-6 rounded-xl font-bold bg-white text-primary hover:bg-white/90 shadow-xl shadow-primary/10 transition-all hover:scale-105 active:scale-95">
                Analyze Now
              </Button>
            </Link>
            {isAuthenticated ? (
              <Button
                variant="outline"
                className="h-12 px-6 rounded-xl border-white/20 text-white hover:bg-white/10"
                onClick={logout}
              >
                Logout
              </Button>
            ) : (
              <Link href="/login">
                <Button
                  variant="outline"
                  className="h-12 px-6 rounded-xl border-white/20 text-white hover:bg-white/10"
                >
                  Login
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-indigo-200/60 hover:text-white transition-colors"
            >
              {isOpen ? <X className="h-8 w-8" /> : <Menu className="h-8 w-8" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/10 bg-background/80 backdrop-blur-xl"
          >
            <div className="container py-8 space-y-6 px-4">
              {links.map((link) => (
                <Link key={link.href} href={link.href}>
                  <div
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "block py-3 text-xl font-medium transition-all hover:text-white cursor-pointer",
                      location === link.href ? "text-white" : "text-indigo-200/60"
                    )}
                  >
                    {link.label}
                  </div>
                </Link>
              ))}
              <div className="pt-4">
                <Link href="/analyze">
                  <Button size="lg" className="w-full h-14 font-bold rounded-xl" onClick={() => setIsOpen(false)}>
                    Analyze Now
                  </Button>
                </Link>
              </div>
              <div>
                {isAuthenticated ? (
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full h-14 font-bold rounded-xl border-white/20 text-white hover:bg-white/10"
                    onClick={async () => {
                      await logout();
                      setIsOpen(false);
                    }}
                  >
                    Logout
                  </Button>
                ) : (
                  <Link href="/login">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full h-14 font-bold rounded-xl border-white/20 text-white hover:bg-white/10"
                      onClick={() => setIsOpen(false)}
                    >
                      Login
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
