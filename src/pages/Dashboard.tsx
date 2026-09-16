import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText, Brain, BarChart3, Briefcase, GraduationCap, TrendingUp,
  Award, Target, Upload, ExternalLink, Sparkles, LogOut, ChevronRight,
  Clock, MapPin, DollarSign, BookOpen, Star, Loader2, Plus, ArrowRight
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";

export default function Dashboard() {
  const { user, profile, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [resumes, setResumes] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [latestRecs, setLatestRecs] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [{ data: r }, { data: t }, { data: recs }] = await Promise.all([
        supabase.from("resumes").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
        supabase.from("tests").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
        supabase.from("recommendations").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(1),
      ]);
      setResumes(r || []);
      setTests(t || []);
      if (recs && recs.length > 0) setLatestRecs(recs[0].data);
      setLoading(false);
    }
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  const latestResume = resumes[0];
  const parsedData = latestResume?.parsed_data as any;
  const scoringData = latestResume?.scoring_data as any;
  const completedTests = tests.filter((t) => t.status === "completed");
  const avgTestScore = completedTests.length > 0
    ? Math.round(completedTests.reduce((s: number, t: any) => s + (t.score || 0), 0) / completedTests.length)
    : 0;
  const bestTestScore = completedTests.length > 0
    ? Math.max(...completedTests.map((t: any) => t.score || 0))
    : 0;

  // Build skills radar from parsed data
  const allSkills = parsedData ? [
    ...(parsedData.skills?.languages || []).slice(0, 3),
    ...(parsedData.skills?.frameworks || []).slice(0, 3),
    ...(parsedData.skills?.tools || []).slice(0, 2),
  ] : [];
  const skillsData = allSkills.map((s: string, i: number) => ({
    skill: s,
    value: scoringData?.category_scores
      ? Math.round(Object.values(scoringData.category_scores as Record<string, number>).reduce((a, b) => a + b, 0) / Object.keys(scoringData.category_scores).length + (i % 3) * 5)
      : 50 + i * 5,
  }));

  const categoryScores = scoringData?.category_scores
    ? Object.entries(scoringData.category_scores as Record<string, number>).map(([k, v]) => ({
        category: k.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
        score: v,
      }))
    : [];

  const hasData = resumes.length > 0;

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
            <Button variant="hero" size="sm" asChild>
              <Link to="/upload"><Plus className="w-4 h-4" /> New Analysis</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="animate-fade-up">
          <h1 className="text-3xl font-bold">
            Welcome back, <span className="gradient-text">{profile?.full_name || user?.email?.split("@")[0]}</span> 👋
          </h1>
          <p className="text-muted-foreground mt-1">Here's your career progress at a glance.</p>
        </div>

        {!hasData ? (
          <Card className="card-shadow">
            <CardContent className="p-12 text-center space-y-4">
              <Upload className="w-16 h-16 mx-auto text-muted-foreground" />
              <h2 className="text-xl font-semibold">No resumes yet</h2>
              <p className="text-muted-foreground">Upload your first resume to get AI-powered analysis and recommendations.</p>
              <Button variant="hero" size="lg" asChild>
                <Link to="/upload">Upload Resume <ArrowRight className="w-4 h-4" /></Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-fade-up" style={{ animationDelay: "0.1s" }}>
              {[
                { icon: FileText, label: "Resumes", value: resumes.length.toString(), color: "text-primary" },
                { icon: TrendingUp, label: "Resume Score", value: latestResume?.score ? `${latestResume.score}%` : "—", color: "text-success" },
                { icon: Award, label: "Best Test", value: bestTestScore ? `${bestTestScore}%` : "—", color: "text-warning" },
                { icon: Target, label: "Tests Taken", value: completedTests.length.toString(), color: "text-secondary" },
                { icon: Brain, label: "Career Level", value: latestResume?.career_level || "—", color: "text-primary" },
              ].map((item) => (
                <Card key={item.label} className="card-shadow hover:elevated-shadow transition-shadow">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{item.label}</p>
                      <p className="text-lg font-bold">{item.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Resume Analysis Summary */}
            {parsedData && (
              <Card className="card-shadow animate-fade-up" style={{ animationDelay: "0.15s" }}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" /> Latest Resume Analysis
                  </CardTitle>
                  <Badge variant="secondary" className="gradient-primary text-primary-foreground">AI Analyzed</Badge>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">Top Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {allSkills.slice(0, 6).map((skill: string) => (
                          <Badge key={skill} variant="outline" className="border-primary/30 text-primary">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">Experience</h4>
                      <p className="text-sm">{parsedData.summary?.experience_years || 0}+ years</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {(parsedData.experience || []).length} companies • {(parsedData.projects || []).length} projects
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">Strengths</h4>
                      <div className="space-y-1">
                        {(scoringData?.top_strengths || []).slice(0, 3).map((s: string, i: number) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-success" />
                            <span className="text-sm truncate">{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Charts */}
            {skillsData.length > 2 && (
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="card-shadow animate-fade-up" style={{ animationDelay: "0.2s" }}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Target className="w-5 h-5 text-secondary" /> Skills Radar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <RadarChart data={skillsData}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="skill" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar dataKey="value" stroke="hsl(217, 91%, 60%)" fill="hsl(217, 91%, 60%)" fillOpacity={0.2} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {categoryScores.length > 0 && (
                  <Card className="card-shadow animate-fade-up" style={{ animationDelay: "0.25s" }}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <BarChart3 className="w-5 h-5 text-primary" /> Category Scores
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={categoryScores}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="category" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem" }} />
                          <Bar dataKey="score" fill="url(#dashGrad)" radius={[8, 8, 0, 0]} />
                          <defs>
                            <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
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

            {/* Job Recommendations from AI */}
            {latestRecs?.job_roles && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-primary" /> Top Job Matches
                  </h2>
                  {latestResume && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/results/${latestResume.id}`}>View Full Report <ChevronRight className="w-4 h-4" /></Link>
                    </Button>
                  )}
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {(latestRecs.job_roles as any[]).slice(0, 3).map((job: any, i: number) => (
                    <Card key={i} className="card-shadow hover:elevated-shadow transition-all animate-fade-up" style={{ animationDelay: `${0.3 + i * 0.05}s` }}>
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{job.title}</h3>
                            <p className="text-sm text-muted-foreground">{job.company_type}</p>
                          </div>
                          <Badge className="gradient-primary text-primary-foreground shrink-0">{job.match_percentage}% Match</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(job.required_skills || []).slice(0, 3).map((s: string) => (
                            <Badge key={s} variant="outline" className="text-xs border-success/30 text-success">{s}</Badge>
                          ))}
                          {(job.missing_skills || []).slice(0, 2).map((s: string) => (
                            <Badge key={s} variant="outline" className="text-xs border-destructive/30 text-destructive">{s}</Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{job.salary_range}</span>
                        </div>
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
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Course Recommendations from AI */}
            {latestRecs?.courses && (
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                  <GraduationCap className="w-5 h-5 text-secondary" /> Recommended Courses
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {(latestRecs.courses as any[]).slice(0, 4).map((course: any, i: number) => (
                    <Card key={i} className="card-shadow hover:elevated-shadow transition-all animate-fade-up" style={{ animationDelay: `${0.4 + i * 0.05}s` }}>
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-sm">{course.name}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">{course.platform}</p>
                          </div>
                          <Badge variant="outline" className="border-secondary/30 text-secondary shrink-0">{course.target_skill}</Badge>
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
            )}

            {/* Recent Resumes */}
            {resumes.length > 1 && (
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-primary" /> Previous Analyses
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {resumes.slice(1, 4).map((r: any, i: number) => (
                    <Card key={r.id} className="card-shadow hover:elevated-shadow transition-all">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">{r.file_name}</p>
                          <Badge variant="outline">{r.score || 0}%</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{r.career_level} • {new Date(r.created_at).toLocaleDateString()}</p>
                        <Button size="sm" variant="ghost" className="w-full text-xs" asChild>
                          <Link to={`/results/${r.id}`}>View Report <ChevronRight className="w-3 h-3" /></Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
