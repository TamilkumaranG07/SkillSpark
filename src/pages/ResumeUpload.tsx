import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, FileText, Brain, Sparkles, CheckCircle2, AlertCircle,
  Loader2, ArrowRight, RefreshCw, LogOut, X
} from "lucide-react";
import { Link } from "react-router-dom";

type Step = "upload" | "parsing" | "parsed" | "scoring" | "scored" | "error";

export default function ResumeUpload() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("upload");
  const [progress, setProgress] = useState(0);
  const [parsedData, setParsedData] = useState<any>(null);
  const [scoringData, setScoringData] = useState<any>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) {
      setFile(accepted[0]);
      setStep("upload");
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
      "text/plain": [".txt"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
  });

  async function fileToBase64(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async function handleAnalyze() {
    if (!file || !user) return;
    setError(null);

    try {
      // Step 1: Upload file to storage
      setStep("parsing");
      setProgress(10);
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("resumes").upload(filePath, file);
      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

      setProgress(20);

      // Create resume record
      const { data: resume, error: dbErr } = await supabase
        .from("resumes")
        .insert({ user_id: user.id, file_name: file.name, file_path: filePath, status: "parsing" })
        .select()
        .single();
      if (dbErr) throw new Error(dbErr.message);
      setResumeId(resume.id);

      setProgress(30);

      // Step 2: Convert file to base64 for multimodal AI parsing
      const fileBase64 = file.type === "text/plain" ? null : await fileToBase64(file);
      const resumeText = file.type === "text/plain" ? await file.text() : null;
      setProgress(40);

      // Step 3: Parse with AI (multimodal for PDF/DOCX/images, text for .txt)
      const parseBody: any = { action: "parse" };
      if (fileBase64) {
        parseBody.fileBase64 = fileBase64;
        parseBody.fileMimeType = file.type;
      } else {
        parseBody.resumeText = resumeText;
      }
      const { data: parseResult, error: parseErr } = await supabase.functions.invoke("analyze-resume", {
        body: parseBody,
      });
      if (parseErr) throw new Error(parseErr.message);
      if (parseResult?.error) throw new Error(parseResult.error);

      const parsed = parseResult.result;
      setParsedData(parsed);
      setProgress(60);

      // Save parsed data
      await supabase
        .from("resumes")
        .update({ parsed_data: parsed, status: "parsed" })
        .eq("id", resume.id);

      setStep("parsed");
      setProgress(70);

      // Step 4: Score resume
      setStep("scoring");
      const { data: scoreResult, error: scoreErr } = await supabase.functions.invoke("analyze-resume", {
        body: { resumeText: parsed, action: "score" },
      });
      if (scoreErr) throw new Error(scoreErr.message);
      if (scoreResult?.error) throw new Error(scoreResult.error);

      const scoring = scoreResult.result;
      setScoringData(scoring);
      setProgress(100);

      // Save scoring data
      await supabase
        .from("resumes")
        .update({
          scoring_data: scoring,
          score: scoring.overall_score,
          career_level: scoring.career_level,
          status: "scored",
        })
        .eq("id", resume.id);

      setStep("scored");
      toast({ title: "Resume analyzed!", description: `Score: ${scoring.overall_score}/100 • ${scoring.career_level}` });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Analysis failed");
      setStep("error");
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    }
  }

  function handleProceedToTest() {
    navigate(`/test/${resumeId}`);
  }

  function handleSkipTest() {
    navigate(`/results/${resumeId}`);
  }

  function resetUpload() {
    setFile(null);
    setStep("upload");
    setProgress(0);
    setParsedData(null);
    setScoringData(null);
    setResumeId(null);
    setError(null);
  }

  const isProcessing = step === "parsing" || step === "scoring";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold gradient-text">SkillBridge</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {profile?.full_name || user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        <div className="animate-fade-up">
          <h1 className="text-3xl font-bold">
            Upload Your <span className="gradient-text">Resume</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Our AI will analyze your resume, score it, and create a personalized career plan.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 text-sm animate-fade-up" style={{ animationDelay: "0.1s" }}>
          {["Upload", "Parse", "Score", "Next Steps"].map((label, i) => {
            const stepIndex =
              step === "upload" ? 0 : step === "parsing" || step === "parsed" ? 1 : step === "scoring" ? 2 : step === "scored" ? 3 : 0;
            return (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    i <= stepIndex
                      ? "gradient-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < stepIndex ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className={i <= stepIndex ? "font-medium" : "text-muted-foreground"}>{label}</span>
                {i < 3 && <div className="w-8 h-px bg-border" />}
              </div>
            );
          })}
        </div>

        {/* Upload Zone */}
        {step === "upload" && (
          <Card className="card-shadow animate-fade-up" style={{ animationDelay: "0.15s" }}>
            <CardContent className="p-6">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
                  isDragActive
                    ? "border-primary bg-primary/5 scale-[1.02]"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 mx-auto mb-4 text-primary" />
                <p className="text-lg font-semibold mb-1">
                  {isDragActive ? "Drop your resume here" : "Drag & drop your resume"}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  PDF, DOCX, DOC, TXT, JPG, PNG — Max 5MB
                </p>
                <Button variant="hero-outline" size="sm">
                  Browse Files
                </Button>
              </div>

              {file && (
                <div className="mt-4 flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                    <Button variant="hero" size="sm" onClick={handleAnalyze}>
                      <Brain className="w-4 h-4" />
                      Analyze Resume
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Processing */}
        {isProcessing && (
          <Card className="card-shadow animate-fade-up">
            <CardContent className="p-8 text-center space-y-4">
              <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
              <div>
                <p className="text-lg font-semibold">
                  {step === "parsing" ? "Parsing your resume..." : "Scoring your resume..."}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {step === "parsing"
                    ? "AI is extracting skills, experience, and qualifications"
                    : "Evaluating against industry standards"}
                </p>
              </div>
              <Progress value={progress} className="max-w-sm mx-auto" />
              <p className="text-xs text-muted-foreground">{progress}% complete</p>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {step === "error" && (
          <Card className="card-shadow border-destructive/30 animate-fade-up">
            <CardContent className="p-6 text-center space-y-4">
              <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
              <div>
                <p className="text-lg font-semibold">Analysis Failed</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
              <Button variant="hero-outline" onClick={resetUpload}>
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {step === "scored" && scoringData && parsedData && (
          <div className="space-y-6 animate-fade-up">
            {/* Score Card */}
            <Card className="card-shadow overflow-hidden">
              <div className="gradient-primary p-6 text-primary-foreground">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-80">Resume Score</p>
                    <p className="text-5xl font-extrabold">{scoringData.overall_score}</p>
                    <p className="text-sm opacity-80 mt-1">out of 100</p>
                  </div>
                  <Badge className="bg-white/20 text-primary-foreground text-lg px-4 py-1">
                    {scoringData.career_level}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-6 space-y-4">
                {/* Category scores */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(scoringData.category_scores || {}).map(([key, val]) => (
                    <div key={key} className="p-3 bg-muted/50 rounded-xl">
                      <p className="text-xs text-muted-foreground capitalize">
                        {key.replace(/_/g, " ")}
                      </p>
                      <p className="text-xl font-bold">{val as number}%</p>
                    </div>
                  ))}
                </div>

                {/* Strengths & Weaknesses */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-success">✅ Strengths</h4>
                    <ul className="space-y-1">
                      {(scoringData.top_strengths || []).map((s: string, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-destructive">⚠️ Weaknesses</h4>
                    <ul className="space-y-1">
                      {(scoringData.top_weaknesses || []).map((s: string, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Extracted Skills */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Extracted Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      ...(parsedData.skills?.languages || []),
                      ...(parsedData.skills?.frameworks || []),
                      ...(parsedData.skills?.tools || []),
                    ].map((skill: string) => (
                      <Badge key={skill} variant="outline" className="border-primary/30 text-primary text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Decision Logic */}
            <Card className="card-shadow">
              <CardContent className="p-6">
                {scoringData.overall_score < 70 ? (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto">
                      <AlertCircle className="w-8 h-8 text-warning" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">Skill Test Required</p>
                      <p className="text-sm text-muted-foreground">
                        Your score is below 70. A skill test is required to generate accurate recommendations.
                      </p>
                    </div>
                    <Button variant="hero" size="lg" onClick={handleProceedToTest}>
                      Proceed to Test <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8 text-success" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">Great Resume!</p>
                      <p className="text-sm text-muted-foreground">
                        Your score is {scoringData.overall_score}/100. You can take an optional test or skip to recommendations.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <Button variant="hero" size="lg" onClick={handleProceedToTest}>
                        Take Test <ArrowRight className="w-4 h-4" />
                      </Button>
                      <Button variant="hero-outline" size="lg" onClick={handleSkipTest}>
                        Skip to Results <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
