import { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles, Brain, Briefcase, GraduationCap, Target, TrendingUp,
  ExternalLink, Loader2, LogOut, Download, BookOpen, Clock,
  Star, MapPin, DollarSign, ChevronRight, Code, FileText, Award,
  Calendar, CheckCircle2, AlertCircle
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";
import { generateCareerReport } from "@/lib/generatePdf";

export default function Results() {
  const { resumeId } = useParams();
  const [searchParams] = useSearchParams();
  const testId = searchParams.get("testId");
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [resume, setResume] = useState<any>(null);
  const [testData, setTestData] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [generatingRecs, setGeneratingRecs] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user || !resumeId) return;

      const { data: r } = await supabase.from("resumes").select("*").eq("id", resumeId).single();
      setResume(r);

      if (testId) {
        const { data: t } = await supabase.from("tests").select("*").eq("id", testId).single();
        setTestData(t);
      }

      // Check existing recommendations
      const { data: recs } = await supabase
        .from("recommendations")
        .select("*")
        .eq("resume_id", resumeId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (recs && recs.length > 0) {
        setRecommendations(recs[0].data);
      }
      setLoading(false);
    }
    load();
  }, [user, resumeId, testId]);

  // Auto-generate recommendations
  useEffect(() => {
    if (!loading && resume && !recommendations && !generatingRecs) {
      generateRecommendations();
    }
  }, [loading, resume, recommendations]);

  async function generateRecommendations() {
    if (!user || !resumeId || !resume) return;
    setGeneratingRecs(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("analyze-resume", {
        body: {
          resumeText: {
            resume: resume.parsed_data,
            testResults: testData
              ? { score: testData.score, answers: testData.answers, questions: testData.questions }
              : null,
          },
          action: "recommendations",
        },
      });
      if (error || result?.error) throw new Error(result?.error || error?.message);

      const recs = result.result;
      setRecommendations(recs);

      await supabase.from("recommendations").insert({
        user_id: user.id,
        resume_id: resumeId,
        test_id: testId || null,
        data: recs,
      });
    } catch (err: any) {
      toast({ title: "Failed to generate recommendations", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingRecs(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  const parsedData = resume?.parsed_data;
  const scoringData = resume?.scoring_data;
  const skillsForRadar = [
    ...(parsedData?.skills?.languages || []).slice(0, 3),
    ...(parsedData?.skills?.frameworks || []).slice(0, 3),
    ...(parsedData?.skills?.tools || []).slice(0, 2),
  ].map((s: string) => ({ skill: s, value: Math.floor(Math.random() * 40) + 60 }));

  const categoryScores = scoringData?.category_scores
    ? Object.entries(scoringData.category_scores).map(([k, v]) => ({
        category: k.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
        score: v as number,
      }))
    : [];

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
            <Button variant="ghost" size="sm" asChild>
              <Link to="/upload">New Analysis</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="animate-fade-up">
          <h1 className="text-3xl font-bold">
            Your <span className="gradient-text">Career Report</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered analysis of {parsedData?.personal?.name || profile?.full_name || "your resume"}
          </p>
        </div>

        {/* Score Overview */}
        <div className="grid md:grid-cols-4 gap-4 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <Card className="card-shadow">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Resume Score</p>
              <p className="text-4xl font-extrabold gradient-text">{resume?.score || 0}</p>
              <p className="text-xs text-muted-foreground">/ 100</p>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Career Level</p>
              <p className="text-xl font-bold">{resume?.career_level || "—"}</p>
            </CardContent>
          </Card>
          {testData && (
            <>
              <Card className="card-shadow">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">Test Score</p>
                  <p className="text-4xl font-extrabold gradient-text">{testData.score}%</p>
                </CardContent>
              </Card>
              <Card className="card-shadow">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">Test Status</p>
                  <Badge className={testData.status === "completed" ? "bg-success" : "bg-destructive"}>
                    {testData.status}
                  </Badge>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Charts */}
        {skillsForRadar.length > 0 && (
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="card-shadow animate-fade-up" style={{ animationDelay: "0.15s" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="w-5 h-5 text-primary" /> Skills Radar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={skillsForRadar}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="skill" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar dataKey="value" stroke="hsl(217, 91%, 60%)" fill="hsl(217, 91%, 60%)" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {categoryScores.length > 0 && (
              <Card className="card-shadow animate-fade-up" style={{ animationDelay: "0.2s" }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="w-5 h-5 text-primary" /> Category Scores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={categoryScores}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="category" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem" }} />
                      <Bar dataKey="score" fill="url(#barGrad)" radius={[8, 8, 0, 0]} />
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(217, 91%, 60%)" />
                          <stop offset="100%" stopColor="hsl(263, 70%, 50%)" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Recommendations Loading */}
        {generatingRecs && (
          <Card className="card-shadow">
            <CardContent className="p-8 text-center space-y-4">
              <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
              <p className="text-lg font-semibold">Generating personalized recommendations...</p>
              <p className="text-sm text-muted-foreground">AI is creating your career roadmap</p>
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        {recommendations && (
          <>
            {/* Skills to Learn */}
            <Card className="card-shadow animate-fade-up" style={{ animationDelay: "0.25s" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" /> Skills to Learn
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { key: "critical", label: "Critical (Now)", color: "destructive" },
                    { key: "important", label: "Important (3 months)", color: "warning" },
                    { key: "good_to_have", label: "Good to Have (6 months)", color: "success" },
                  ].map(({ key, label, color }) => (
                    <div key={key} className="space-y-2">
                      <h4 className={`text-sm font-semibold text-${color}`}>{label}</h4>
                      {(recommendations.skills_to_learn?.[key] || []).map((s: any, i: number) => (
                        <div key={i} className="p-2 bg-muted/50 rounded-lg">
                          <p className="text-sm font-medium">{s.skill}</p>
                          <p className="text-xs text-muted-foreground">{s.reason}</p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Job Roles */}
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                <Briefcase className="w-5 h-5 text-primary" /> Recommended Job Roles
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(recommendations.job_roles || []).map((job: any, i: number) => (
                  <Card key={i} className="card-shadow hover:elevated-shadow transition-all animate-fade-up" style={{ animationDelay: `${0.3 + i * 0.05}s` }}>
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{job.title}</h3>
                          <p className="text-sm text-muted-foreground">{job.company_type}</p>
                        </div>
                        <Badge className="gradient-primary text-primary-foreground shrink-0">
                          {job.match_percentage}% Match
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(job.required_skills || []).slice(0, 4).map((s: string) => (
                          <Badge key={s} variant="outline" className="text-xs border-success/30 text-success">{s}</Badge>
                        ))}
                        {(job.missing_skills || []).slice(0, 2).map((s: string) => (
                          <Badge key={s} variant="outline" className="text-xs border-destructive/30 text-destructive">{s}</Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{job.salary_range}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{job.growth_path}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="hero" className="flex-1 text-xs h-8" asChild>
                          <a href={`https://linkedin.com/jobs/search/?keywords=${encodeURIComponent(job.title)}`} target="_blank" rel="noopener noreferrer">
                            LinkedIn <ExternalLink className="w-3 h-3" />
                          </a>
                        </Button>
                        <Button size="sm" variant="hero-outline" className="flex-1 text-xs h-8" asChild>
                          <a href={`https://www.naukri.com/${encodeURIComponent(job.title.replace(/\s+/g, "-").toLowerCase())}-jobs`} target="_blank" rel="noopener noreferrer">
                            Naukri <ExternalLink className="w-3 h-3" />
                          </a>
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 text-xs h-8" asChild>
                          <a href={`https://indeed.com/jobs?q=${encodeURIComponent(job.title)}`} target="_blank" rel="noopener noreferrer">
                            Indeed <ExternalLink className="w-3 h-3" />
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Course Recommendations */}
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                <GraduationCap className="w-5 h-5 text-secondary" /> Recommended Courses
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {(recommendations.courses || []).map((course: any, i: number) => (
                  <Card key={i} className="card-shadow hover:elevated-shadow transition-all animate-fade-up" style={{ animationDelay: `${0.4 + i * 0.05}s` }}>
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-sm">{course.name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{course.platform}</p>
                        </div>
                        <Badge variant="outline" className="border-secondary/30 text-secondary shrink-0">
                          {course.target_skill}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{course.duration}</span>
                        <span className="font-medium text-success">{course.cost}</span>
                      </div>
                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                        <BookOpen className="w-3 h-3 inline mr-1" />{course.reason}
                      </p>
                      <Button size="sm" variant="hero-outline" className="w-full text-xs h-8" asChild>
                        <a href={course.link || "#"} target="_blank" rel="noopener noreferrer">
                          Enroll Now <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Resume Improvements */}
            {recommendations.resume_improvements && (
              <Card className="card-shadow animate-fade-up" style={{ animationDelay: "0.5s" }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" /> Resume Improvements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-destructive mb-2">🔴 Immediate Fixes</h4>
                      <ul className="space-y-1">
                        {(recommendations.resume_improvements.immediate || []).map((s: string, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-warning mb-2">🟡 Weekly Improvements</h4>
                      <ul className="space-y-1">
                        {(recommendations.resume_improvements.weekly || []).map((s: string, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-success mb-2">🟢 ATS Tips</h4>
                      <ul className="space-y-1">
                        {(recommendations.resume_improvements.ats_tips || []).map((s: string, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Roadmap */}
            {recommendations.roadmap && (
              <Card className="card-shadow animate-fade-up" style={{ animationDelay: "0.55s" }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" /> Career Roadmap
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    {[
                      { key: "three_month", label: "3 Months", icon: "🎯" },
                      { key: "six_month", label: "6 Months", icon: "🚀" },
                      { key: "twelve_month", label: "12 Months", icon: "🏆" },
                    ].map(({ key, label, icon }) => {
                      const period = recommendations.roadmap[key];
                      if (!period) return null;
                      return (
                        <div key={key} className="space-y-3">
                          <h4 className="font-semibold">{icon} {label}</h4>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Goals</p>
                            <ul className="space-y-1">
                              {(period.goals || []).map((g: string, i: number) => (
                                <li key={i} className="text-sm">• {g}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Actions</p>
                            <ul className="space-y-1">
                              {(period.actions || []).map((a: string, i: number) => (
                                <li key={i} className="text-xs text-muted-foreground">• {a}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Portfolio Projects */}
            {recommendations.portfolio_projects && (
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                  <Code className="w-5 h-5 text-primary" /> Suggested Portfolio Projects
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(recommendations.portfolio_projects || []).map((p: any, i: number) => (
                    <Card key={i} className="card-shadow animate-fade-up" style={{ animationDelay: `${0.6 + i * 0.05}s` }}>
                      <CardContent className="p-5 space-y-2">
                        <h3 className="font-semibold">{p.name}</h3>
                        <p className="text-sm text-muted-foreground">{p.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {(p.skills_covered || []).map((s: string) => (
                            <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {p.estimated_time}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-center gap-4 py-8">
              <Button variant="hero-outline" size="lg" onClick={() => {
                generateCareerReport({
                  name: parsedData?.personal?.name || profile?.full_name || "Candidate",
                  email: parsedData?.personal?.email || profile?.email || "",
                  resumeScore: resume?.score || 0,
                  careerLevel: resume?.career_level || "",
                  categoryScores: scoringData?.category_scores || {},
                  topStrengths: scoringData?.top_strengths || [],
                  topWeaknesses: scoringData?.top_weaknesses || [],
                  missingSkills: scoringData?.missing_critical_skills || [],
                  skills: [
                    ...(parsedData?.skills?.languages || []),
                    ...(parsedData?.skills?.frameworks || []),
                    ...(parsedData?.skills?.tools || []),
                    ...(parsedData?.skills?.databases || []),
                  ],
                  testScore: testData?.score,
                  testStatus: testData?.status,
                  recommendations,
                });
              }}>
                <Download className="w-4 h-4" /> Download PDF Report
              </Button>
              <Button variant="hero" size="lg" asChild>
                <Link to="/dashboard">
                  Go to Dashboard <ChevronRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
