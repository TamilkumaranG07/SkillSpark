import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { resumeText, action, fileBase64, fileMimeType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let systemPrompt = "";
    let userPrompt = "";
    let multimodalContent: any[] | null = null;

    if (action === "parse") {
      systemPrompt = `You are an expert resume parser. Extract structured data from the resume and return ONLY valid JSON (no markdown, no code fences). Return this exact structure:
{
  "personal": { "name": "", "email": "", "phone": "", "location": "", "links": [] },
  "summary": { "objective": "", "experience_years": 0, "highlights": [] },
  "skills": { "languages": [], "frameworks": [], "tools": [], "databases": [], "cloud": [], "soft_skills": [] },
  "experience": [{ "company": "", "role": "", "duration": "", "responsibilities": [], "achievements": [], "tech_used": [] }],
  "education": [{ "degree": "", "institution": "", "year": "", "gpa": "", "coursework": [] }],
  "projects": [{ "name": "", "description": "", "tech": [], "role": "", "results": "" }],
  "certifications": [{ "name": "", "issuer": "", "date": "" }],
  "extras": { "awards": [], "publications": [], "volunteer": [], "languages": [] },
  "quality": { "structure": 0, "clarity": 0, "grammar": 0, "action_verbs": 0, "quantified_achievements": 0 }
}
Quality scores are 0-10. If a field is not found, use empty string/array/0.`;

      // Use multimodal if file is provided as base64
      if (fileBase64 && fileMimeType) {
        multimodalContent = [
          { type: "text", text: "Parse this resume document and extract all information:" },
          { type: "image_url", image_url: { url: `data:${fileMimeType};base64,${fileBase64}` } },
        ];
      } else {
        userPrompt = `Parse this resume:\n\n${resumeText}`;
      }
    } else if (action === "score") {
      systemPrompt = `You are an expert resume scorer. Score the resume based on these weights and return ONLY valid JSON (no markdown):
- Skill relevance: 25%
- Experience quality: 20%
- Projects: 20%
- Education & certs: 10%
- Formatting: 10%
- Achievements: 15%

Career levels: Fresher (0-1yr), Junior (1-3yrs), Mid (3-7yrs), Senior (7+yrs)

Return:
{
  "overall_score": 0,
  "career_level": "",
  "category_scores": { "skill_relevance": 0, "experience_quality": 0, "projects": 0, "education_certs": 0, "formatting": 0, "achievements": 0 },
  "top_strengths": [],
  "top_weaknesses": [],
  "missing_critical_skills": [],
  "suggested_roles": [{ "title": "", "match_percentage": 0 }],
  "test_required": true
}
Set test_required=true if overall_score < 70.`;
      userPrompt = `Score this resume data:\n\n${JSON.stringify(resumeText)}`;
    } else if (action === "generate_test") {
      systemPrompt = `You are an expert test generator. Generate 20 personalized questions based on the resume data. Return ONLY valid JSON (no markdown):
{
  "questions": [
    {
      "id": 1,
      "type": "mcq",
      "category": "",
      "skill": "",
      "difficulty": "beginner|intermediate|advanced",
      "question": "",
      "options": ["A", "B", "C", "D"],
      "correct_answer": 0,
      "explanation": "",
      "points": 5
    }
  ]
}
Generate 15 MCQs and 5 scenario-based questions. Questions MUST reference candidate's actual skills/projects. Distribute across top skills. Difficulty based on career level.`;
      userPrompt = `Generate test for this resume:\n\n${JSON.stringify(resumeText)}`;
    } else if (action === "recommendations") {
      systemPrompt = `You are a career advisor. Based on resume + test results, generate comprehensive recommendations. Return ONLY valid JSON (no markdown):
{
  "skills_to_learn": {
    "critical": [{ "skill": "", "reason": "" }],
    "important": [{ "skill": "", "reason": "" }],
    "good_to_have": [{ "skill": "", "reason": "" }]
  },
  "courses": [{ "name": "", "platform": "", "duration": "", "cost": "", "link": "", "target_skill": "", "reason": "" }],
  "job_roles": [{ "title": "", "company_type": "", "match_percentage": 0, "required_skills": [], "missing_skills": [], "salary_range": "", "growth_path": "", "next_steps": [] }],
  "resume_improvements": { "immediate": [], "weekly": [], "ats_tips": [] },
  "portfolio_projects": [{ "name": "", "description": "", "skills_covered": [], "estimated_time": "" }],
  "interview_prep": { "technical_topics": [], "behavioral_tips": [], "role_specific": [] },
  "roadmap": {
    "three_month": { "goals": [], "actions": [], "metrics": [] },
    "six_month": { "goals": [], "actions": [], "metrics": [] },
    "twelve_month": { "goals": [], "actions": [], "metrics": [] }
  }
}
Provide REAL course links from Coursera, Udemy, LinkedIn Learning etc. Job roles should include real companies and salary ranges for India market.`;
      userPrompt = `Generate recommendations:\n\nResume: ${JSON.stringify(resumeText.resume)}\n\nTest Results: ${JSON.stringify(resumeText.testResults || "No test taken")}`;
    }

    // Build messages
    const messages: any[] = [{ role: "system", content: systemPrompt }];
    if (multimodalContent) {
      messages.push({ role: "user", content: multimodalContent });
    } else {
      messages.push({ role: "user", content: userPrompt });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response, handling potential markdown fences
    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[1].trim() : content.trim());
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response as JSON");
    }

    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-resume error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
