import { useState } from "react";
import { useLocation } from "wouter";
import { useAnalyzeDocument, useAnalyzeText, useAnalyzeUrl } from "@/hooks/use-analysis";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Type, Loader2, AlertCircle, Link2, Upload, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function Analyze() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const textMutation = useAnalyzeText();
  const docMutation = useAnalyzeDocument();
  const urlMutation = useAnalyzeUrl();

  const isPending = textMutation.isPending || docMutation.isPending || urlMutation.isPending;

  const handleTextAnalyze = async () => {
    if (!message.trim()) {
      toast({
        title: "Input required",
        description: "Please paste a job description or email content.",
        variant: "destructive",
      });
      return;
    }

    try {
      await textMutation.mutateAsync({ message });
      setLocation("/results");
    } catch (error) {
      toast({
        title: "Analysis Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const normalizeUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return trimmed;
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
    return `https://${trimmed}`;
  };

  const handleUrlAnalyze = async () => {
    if (!url.trim()) {
      toast({
        title: "URL required",
        description: "Paste a job posting URL to analyze.",
        variant: "destructive",
      });
      return;
    }
    try {
      await urlMutation.mutateAsync({ url: normalizeUrl(url) });
      setLocation("/results");
    } catch (error) {
      toast({
        title: "Analysis Error",
        description: error instanceof Error ? error.message : "Could not analyze URL",
        variant: "destructive",
      });
    }
  };

  const handleDocAnalyze = async () => {
    if (!file) {
      toast({
        title: "File required",
        description: "Please upload an offer letter PDF.",
        variant: "destructive",
      });
      return;
    }

    try {
      await docMutation.mutateAsync(file);
      setLocation("/results");
    } catch (error) {
      toast({
        title: "Analysis Error",
        description: error instanceof Error ? error.message : "Could not analyze document",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-aurora pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-6xl font-display font-bold mb-6 text-white tracking-tight">Protect Your Future</h1>
          <p className="text-indigo-100/60 text-xl font-light">
            Securely upload or paste recruitment materials for instant TrustGraph analysis powered by LLM + retrieval signals.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="glass-panel border-white/10 overflow-hidden relative">
            {isPending && (
              <div className="absolute inset-0 z-50 overflow-hidden pointer-events-none">
                <div className="scan-line animate-scan" />
                <div className="absolute inset-0 bg-primary/5 backdrop-blur-[2px]" />
              </div>
            )}
            <CardContent className="p-8 sm:p-12">
              <Tabs defaultValue="text" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-10 h-14 p-2 bg-white/5 rounded-2xl border border-white/10">
                  <TabsTrigger value="text" className="rounded-xl text-base font-medium data-[state=active]:bg-white data-[state=active]:text-primary transition-all">
                    <Type className="w-4 h-4 mr-1 sm:mr-2" />
                    Paste
                  </TabsTrigger>
                  <TabsTrigger value="url" className="rounded-xl text-base font-medium data-[state=active]:bg-white data-[state=active]:text-primary transition-all">
                    <Link2 className="w-4 h-4 mr-1 sm:mr-2" />
                    URL
                  </TabsTrigger>
                  <TabsTrigger value="file" className="rounded-xl text-base font-medium data-[state=active]:bg-white data-[state=active]:text-primary transition-all">
                    <Upload className="w-4 h-4 mr-1 sm:mr-2" />
                    Offer Letter
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="space-y-8">
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Paste the suspicious job description or email here..."
                      className="min-h-[400px] bg-white/5 border-white/10 text-white placeholder:text-indigo-200/30 resize-none p-6 text-xl rounded-2xl focus:ring-2 focus:ring-primary/50 transition-all font-light leading-relaxed"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleTextAnalyze}
                    disabled={isPending}
                    className="w-full h-16 text-xl font-bold rounded-2xl bg-white text-primary hover:bg-white/90 shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                        Running TrustGraph scan...
                      </>
                    ) : (
                      "Run Deep Scan"
                    )}
                  </Button>
                </TabsContent>

                <TabsContent value="url" className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-indigo-100/70 text-sm font-medium">Job posting URL</label>
                    <input
                      type="url"
                      placeholder="https://example.com/jobs/..."
                      className="w-full min-h-[56px] bg-white/5 border border-white/10 text-white placeholder:text-indigo-200/30 px-6 rounded-2xl focus:ring-2 focus:ring-primary/50 transition-all font-light text-lg"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleUrlAnalyze}
                    disabled={!url.trim() || isPending}
                    className="w-full h-16 text-xl font-bold rounded-2xl bg-white text-primary hover:bg-white/90 shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                        Analyzing URL...
                      </>
                    ) : (
                      "Analyze job page"
                    )}
                  </Button>
                </TabsContent>

                <TabsContent value="file" className="space-y-8">
                  <div className="border-2 border-dashed border-white/10 rounded-2xl p-12 text-center hover:bg-white/5 transition-all">
                    <input
                      type="file"
                      id="offer-letter-upload"
                      className="hidden"
                      accept=".pdf,application/pdf"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <label
                      htmlFor="offer-letter-upload"
                      className="cursor-pointer flex flex-col items-center justify-center space-y-4"
                    >
                      <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
                        <FileText className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-xl font-semibold block text-white">
                          {file ? file.name : "Upload offer letter PDF"}
                        </span>
                        <span className="text-indigo-100/40 text-sm">
                          {file ? `${(file.size / 1024).toFixed(1)} KB` : "Only PDF supported"}
                        </span>
                      </div>
                    </label>
                  </div>

                  <Button
                    onClick={handleDocAnalyze}
                    disabled={!file || isPending}
                    className="w-full h-16 text-xl font-bold rounded-2xl bg-white text-primary hover:bg-white/90 shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                        Analyzing Offer Letter...
                      </>
                    ) : (
                      "Analyze Offer Letter"
                    )}
                  </Button>
                </TabsContent>

              </Tabs>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 flex items-start gap-4 p-6 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl text-yellow-200/80"
        >
          <AlertCircle className="w-6 h-6 flex-shrink-0 mt-1" />
          <p className="text-lg leading-relaxed font-light">
            <strong className="text-yellow-400">Zero-Trust Privacy:</strong> Analysis is performed on-the-fly. We do not store original documents or raw message content after the session ends.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
