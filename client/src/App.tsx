import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuthStore } from "@/lib/auth";
import Home from "@/pages/Home";
import Analyze from "@/pages/Analyze";
import Results from "@/pages/Results";
import Jobs from "@/pages/Jobs";
import About from "@/pages/About";
import Dashboard from "@/pages/Dashboard";
import InterviewPrep from "@/pages/InterviewPrep";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import { useLocation } from "wouter";
import { useEffect } from "react";

function RequireAuth({ component: Component }: { component: () => JSX.Element | null }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [, setLocation] = useLocation();
  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/analyze" component={() => <RequireAuth component={Analyze} />} />
      <Route path="/results" component={() => <RequireAuth component={Results} />} />
      <Route path="/jobs" component={() => <RequireAuth component={Jobs} />} />
      <Route path="/dashboard" component={() => <RequireAuth component={Dashboard} />} />
      <Route path="/interview-prep/:applicationId" component={() => <RequireAuth component={InterviewPrep} />} />
      <Route path="/about" component={About} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const hydrateFromSession = useAuthStore((s) => s.hydrateFromSession);
  useEffect(() => {
    void hydrateFromSession();
  }, [hydrateFromSession]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col font-body antialiased">
        <Navbar />
        <main className="flex-1">
          <Router />
        </main>
        <Footer />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
