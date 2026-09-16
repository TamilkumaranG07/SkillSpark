import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles, Clock, ChevronLeft, ChevronRight, Flag, Loader2,
  AlertTriangle, CheckCircle2, LogOut, Shield
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface Question {
  id: number;
  type: string;
  category: string;
  skill: string;
  difficulty: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  points: number;
}

export default function SkillTest() {
  const { resumeId } = useParams();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [testId, setTestId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 min
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Generate test questions
  useEffect(() => {
    async function generateTest() {
      if (!user || !resumeId) return;
      try {
        const { data: resume } = await supabase
          .from("resumes")
          .select("parsed_data, scoring_data")
          .eq("id", resumeId)
          .single();
        if (!resume) throw new Error("Resume not found");

        const { data: result, error } = await supabase.functions.invoke("analyze-resume", {
          body: {
            resumeText: { ...(resume.parsed_data as Record<string, unknown>), career_level: (resume.scoring_data as any)?.career_level },
            action: "generate_test",
          },
        });
        if (error || result?.error) throw new Error(result?.error || error?.message);

        const q = result.result.questions || [];
        setQuestions(q);

        // Create test record
        const { data: test, error: testErr } = await supabase
          .from("tests")
          .insert({
            user_id: user.id,
            resume_id: resumeId,
            questions: q,
            total_questions: q.length,
            status: "in_progress",
            started_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (testErr) throw new Error(testErr.message);
        setTestId(test.id);
      } catch (err: any) {
        toast({ title: "Failed to generate test", description: err.message, variant: "destructive" });
        navigate(`/upload`);
      } finally {
        setLoading(false);
      }
    }
    generateTest();
  }, [user, resumeId]);

  // Timer
  useEffect(() => {
    if (loading || submitted) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          submitTest("completed");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, submitted]);

  // Anti-cheat: Tab visibility
  useEffect(() => {
    if (loading || submitted) return;
    const handleVisibility = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => {
          const next = prev + 1;
          if (next >= 2) {
            submitTest("terminated");
            toast({ title: "Test Terminated", description: "Too many tab switches.", variant: "destructive" });
          } else {
            setShowWarning(true);
          }
          return next;
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [loading, submitted]);

  // Anti-cheat: Block copy/paste
  useEffect(() => {
    if (loading || submitted) return;
    const block = (e: Event) => {
      e.preventDefault();
      toast({ title: "Action blocked", description: "Copy/paste is not allowed during the test.", variant: "destructive" });
    };
    const blockKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["c", "v", "x"].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    document.addEventListener("copy", block);
    document.addEventListener("paste", block);
    document.addEventListener("cut", block);
    document.addEventListener("keydown", blockKeys);
    document.addEventListener("contextmenu", block);
    return () => {
      document.removeEventListener("copy", block);
      document.removeEventListener("paste", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("keydown", blockKeys);
      document.removeEventListener("contextmenu", block);
    };
  }, [loading, submitted]);

  const submitTest = useCallback(async (status: "completed" | "terminated") => {
    if (submitted || !testId) return;
    setSubmitted(true);

    // Calculate score
    let score = 0;
    let total = 0;
    questions.forEach((q) => {
      total += q.points;
      if (answers[q.id] === q.correct_answer) score += q.points;
    });
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

    await supabase
      .from("tests")
      .update({
        answers,
        score: percentage,
        tab_switch_count: tabSwitchCount,
        status,
        completed_at: new Date().toISOString(),
      })
      .eq("id", testId);

    toast({
      title: status === "completed" ? "Test Submitted!" : "Test Terminated",
      description: `Score: ${percentage}%`,
    });

    navigate(`/results/${resumeId}?testId=${testId}`);
  }, [submitted, testId, answers, questions, tabSwitchCount, resumeId, navigate]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
          <p className="text-lg font-semibold">Generating your personalized test...</p>
          <p className="text-sm text-muted-foreground">AI is creating questions based on your resume</p>
        </div>
      </div>
    );
  }

  if (submitted) return null;

  const current = questions[currentIndex];
  if (!current) return null;

  const answered = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-background select-none">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-bold gradient-text">Skill Test</span>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="font-mono text-base px-3 py-1">
              <Clock className="w-4 h-4 mr-1" />
              {formatTime(timeLeft)}
            </Badge>
            <Badge variant="secondary">
              {answered}/{questions.length} answered
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <Progress value={(currentIndex / questions.length) * 100} className="mb-6" />

        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{current.category}</Badge>
                <Badge variant="outline" className="capitalize">{current.difficulty}</Badge>
                <Badge variant="outline">{current.points} pts</Badge>
              </div>
              <CardTitle className="text-lg mt-2">
                Question {currentIndex + 1} of {questions.length}
              </CardTitle>
            </div>
            <Button
              variant={flagged.has(current.id) ? "destructive" : "ghost"}
              size="sm"
              onClick={() => {
                setFlagged((prev) => {
                  const next = new Set(prev);
                  next.has(current.id) ? next.delete(current.id) : next.add(current.id);
                  return next;
                });
              }}
            >
              <Flag className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-base leading-relaxed">{current.question}</p>

            <RadioGroup
              value={answers[current.id]?.toString() || ""}
              onValueChange={(val) => {
                setAnswers((prev) => ({ ...prev, [current.id]: parseInt(val) }));
              }}
            >
              {current.options.map((opt, i) => (
                <div
                  key={i}
                  className={`flex items-center space-x-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    answers[current.id] === i ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  }`}
                >
                  <RadioGroupItem value={i.toString()} id={`opt-${i}`} />
                  <Label htmlFor={`opt-${i}`} className="flex-1 cursor-pointer text-sm">
                    {opt}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>

              {currentIndex === questions.length - 1 ? (
                <Button variant="hero" onClick={() => setShowSubmitDialog(true)}>
                  <CheckCircle2 className="w-4 h-4" /> Submit Test
                </Button>
              ) : (
                <Button
                  variant="hero"
                  onClick={() => setCurrentIndex((p) => Math.min(questions.length - 1, p + 1))}
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Question navigator */}
        <div className="mt-4 flex flex-wrap gap-2">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
                i === currentIndex
                  ? "gradient-primary text-primary-foreground"
                  : answers[q.id] !== undefined
                  ? "bg-success/20 text-success border border-success/30"
                  : flagged.has(q.id)
                  ? "bg-warning/20 text-warning border border-warning/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </main>

      {/* Tab switch warning */}
      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="w-5 h-5" /> Warning!
            </DialogTitle>
            <DialogDescription>
              Switching tabs is not allowed during the test. Your next tab switch will terminate the test automatically.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="hero" onClick={() => setShowWarning(false)}>I Understand</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit confirmation */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Test?</DialogTitle>
            <DialogDescription>
              You've answered {answered} out of {questions.length} questions.
              {answered < questions.length && ` ${questions.length - answered} questions are unanswered.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>Continue Test</Button>
            <Button variant="hero" onClick={() => submitTest("completed")}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
