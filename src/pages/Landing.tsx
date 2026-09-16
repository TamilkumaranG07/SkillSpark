import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Upload, Brain, BarChart3, Briefcase, GraduationCap, Shield, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const features = [
  {
    icon: Upload,
    title: "Smart Resume Upload",
    description: "Upload your resume in PDF or DOCX format. Our AI instantly parses and extracts your skills, experience, and qualifications.",
  },
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    description: "Advanced AI identifies your strengths, skill gaps, and generates a comprehensive profile matched to industry standards.",
  },
  {
    icon: Shield,
    title: "Personalized Skill Tests",
    description: "Take adaptive tests uniquely generated from your resume. Anti-cheat measures ensure fair assessment.",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    description: "Visualize your progress with interactive charts — radar plots, trend lines, and detailed category breakdowns.",
  },
  {
    icon: Briefcase,
    title: "Job Recommendations",
    description: "Get matched with relevant jobs from LinkedIn, Naukri, Indeed and more — with direct application links.",
  },
  {
    icon: GraduationCap,
    title: "Course Suggestions",
    description: "Personalized learning paths from Coursera, Udemy, and more to bridge your skill gaps efficiently.",
  },
];

const stats = [
  { value: "10K+", label: "Resumes Analyzed" },
  { value: "95%", label: "Match Accuracy" },
  { value: "500+", label: "Jobs Matched Daily" },
  { value: "50+", label: "Skill Categories" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold gradient-text">SkillBridge</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button variant="hero" size="sm" asChild>
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-16 overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: `url(${heroBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="relative container mx-auto px-4 py-24 md:py-36 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8 animate-fade-up">
            <Sparkles className="w-4 h-4" />
            AI-Powered Career Intelligence
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <span className="text-primary-foreground">Bridge Your</span>
            <br />
            <span className="gradient-text">Skill Gaps</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-10 animate-fade-up" style={{ animationDelay: "0.2s" }}>
            Upload your resume, get AI analysis, take personalized tests, and receive targeted job &amp; course recommendations — all in one platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: "0.3s" }}>
            <Button variant="hero" size="xl" asChild>
              <Link to="/register">
                <Upload className="w-5 h-5" />
                Upload Resume to Get Started
              </Link>
            </Button>
            <Button variant="hero-outline" size="xl" asChild>
              <Link to="/login">
                Sign In
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-3xl mx-auto animate-fade-up" style={{ animationDelay: "0.4s" }}>
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-extrabold gradient-text">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to <span className="gradient-text">Advance Your Career</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From resume analysis to job placement — our AI handles the heavy lifting so you can focus on growing.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="group relative p-6 rounded-2xl bg-card border border-border hover:border-primary/30 card-shadow hover:elevated-shadow transition-all duration-300 animate-fade-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It <span className="gradient-text">Works</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {[
              { step: "01", title: "Upload Resume", desc: "Drag & drop your resume file" },
              { step: "02", title: "AI Analysis", desc: "AI extracts and maps your skills" },
              { step: "03", title: "Take Test", desc: "Complete personalized assessments" },
              { step: "04", title: "Get Matched", desc: "Receive job & course recommendations" },
            ].map((item, i) => (
              <div key={item.step} className="text-center animate-fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary-foreground">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="relative rounded-3xl gradient-hero p-12 md:p-16 text-center overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `url(${heroBg})`, backgroundSize: "cover" }} />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                Ready to Discover Your Potential?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Join thousands of professionals who've bridged their skill gaps and landed their dream jobs.
              </p>
              <Button variant="hero" size="xl" asChild>
                <Link to="/register">
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded gradient-primary flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold gradient-text">SkillBridge</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 SkillBridge. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
