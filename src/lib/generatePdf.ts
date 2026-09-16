import jsPDF from "jspdf";

interface ReportData {
  name: string;
  email: string;
  resumeScore: number;
  careerLevel: string;
  categoryScores: Record<string, number>;
  topStrengths: string[];
  topWeaknesses: string[];
  missingSkills: string[];
  skills: string[];
  testScore?: number;
  testStatus?: string;
  recommendations?: {
    skills_to_learn?: {
      critical?: { skill: string; reason: string }[];
      important?: { skill: string; reason: string }[];
      good_to_have?: { skill: string; reason: string }[];
    };
    job_roles?: { title: string; match_percentage: number; salary_range: string }[];
    courses?: { name: string; platform: string; duration: string }[];
    resume_improvements?: { immediate?: string[]; weekly?: string[]; ats_tips?: string[] };
    roadmap?: {
      three_month?: { goals: string[]; actions: string[] };
      six_month?: { goals: string[]; actions: string[] };
      twelve_month?: { goals: string[]; actions: string[] };
    };
    portfolio_projects?: { name: string; description: string; estimated_time: string }[];
    interview_prep?: { technical_topics?: string[]; behavioral_tips?: string[] };
  };
}

export function generateCareerReport(data: ReportData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 15;

  type RGB = [number, number, number];
  const primary: RGB = [59, 130, 246];
  const secondary: RGB = [124, 58, 237];
  const dark: RGB = [15, 23, 42];
  const gray: RGB = [100, 116, 139];
  const success: RGB = [34, 197, 94];
  const danger: RGB = [239, 68, 68];
  const amber: RGB = [234, 179, 8];

  function checkPage(needed: number) {
    if (y + needed > 275) {
      doc.addPage();
      y = 15;
    }
  }

  function drawSection(title: string) {
    checkPage(15);
    y += 4;
    doc.setFillColor(...primary);
    doc.rect(margin, y, contentWidth, 0.5, "F");
    y += 6;
    doc.setFontSize(13);
    doc.setTextColor(...dark);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...gray);
  }

  function drawBullet(text: string, indent = 0) {
    checkPage(6);
    const lines = doc.splitTextToSize(text, contentWidth - 8 - indent);
    doc.text("•", margin + indent, y);
    doc.text(lines, margin + 4 + indent, y);
    y += lines.length * 4.5;
  }

  // ===== HEADER =====
  // Gradient header bar
  doc.setFillColor(...primary);
  doc.rect(0, 0, pageWidth, 35, "F");
  doc.setFillColor(...secondary);
  doc.rect(pageWidth * 0.6, 0, pageWidth * 0.4, 35, "F");

  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("SkillBridge", margin, 16);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("AI Career Intelligence Report", margin, 24);

  // Date
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`, pageWidth - margin - 50, 16);

  y = 42;

  // ===== EXECUTIVE SUMMARY =====
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentWidth, 38, 3, 3, "F");

  doc.setFontSize(11);
  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.text(data.name || "Candidate", margin + 5, y + 8);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  doc.text(data.email || "", margin + 5, y + 14);

  // Score circle
  const cx = pageWidth - margin - 20;
  const cy = y + 19;
  doc.setFillColor(...primary);
  doc.circle(cx, cy, 14, "F");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(data.resumeScore.toString(), cx, cy + 1, { align: "center" });
  doc.setFontSize(6);
  doc.text("/ 100", cx, cy + 6, { align: "center" });

  // Career level badge
  doc.setFillColor(...secondary);
  doc.roundedRect(margin + 5, y + 20, 30, 8, 2, 2, "F");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(data.careerLevel || "—", margin + 20, y + 25.5, { align: "center" });

  // Test score if available
  if (data.testScore !== undefined) {
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(margin + 40, y + 20, 28, 8, 2, 2, "F");
    doc.text(`Test: ${data.testScore}%`, margin + 54, y + 25.5, { align: "center" });
  }

  y += 45;

  // ===== CATEGORY SCORES =====
  drawSection("📊 Category Scores");
  const cats = Object.entries(data.categoryScores || {});
  if (cats.length > 0) {
    cats.forEach(([key, val]) => {
      checkPage(8);
      const label = key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      doc.setTextColor(...dark);
      doc.setFontSize(8);
      doc.text(label, margin, y);
      doc.text(`${val}%`, margin + contentWidth - 10, y, { align: "right" });
      // Progress bar
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(margin + 50, y - 3, contentWidth - 65, 4, 1, 1, "F");
      const barColor: RGB = val >= 70 ? success : val >= 40 ? amber : danger;
      doc.setFillColor(...barColor);
      doc.roundedRect(margin + 50, y - 3, Math.max(2, ((contentWidth - 65) * val) / 100), 4, 1, 1, "F");
      y += 7;
    });
  }

  // ===== STRENGTHS & WEAKNESSES =====
  drawSection("✅ Top Strengths");
  (data.topStrengths || []).forEach((s) => {
    doc.setTextColor(...(success as [number, number, number]));
    drawBullet(s);
  });

  drawSection("⚠️ Areas for Improvement");
  (data.topWeaknesses || []).forEach((s) => {
    doc.setTextColor(...(danger as [number, number, number]));
    drawBullet(s);
  });

  // ===== SKILLS =====
  drawSection("🛠 Extracted Skills");
  if (data.skills.length > 0) {
    checkPage(10);
    doc.setTextColor(...gray);
    const skillText = data.skills.join("  |  ");
    const lines = doc.splitTextToSize(skillText, contentWidth);
    doc.text(lines, margin, y);
    y += lines.length * 4.5 + 2;
  }

  // ===== RECOMMENDATIONS =====
  if (data.recommendations) {
    const recs = data.recommendations;

    // Skills to learn
    if (recs.skills_to_learn) {
      drawSection("📚 Skills to Learn");
      [
        { items: recs.skills_to_learn.critical, label: "Critical (Now)", color: danger as RGB },
        { items: recs.skills_to_learn.important, label: "Important (3 months)", color: amber as RGB },
        { items: recs.skills_to_learn.good_to_have, label: "Good to Have (6 months)", color: success as RGB },
      ].forEach(({ items, label, color }) => {
        if (!items?.length) return;
        checkPage(8);
        doc.setTextColor(...color);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(label, margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...gray);
        items.forEach((s) => drawBullet(`${s.skill}: ${s.reason}`));
      });
    }

    // Job roles
    if (recs.job_roles?.length) {
      drawSection("💼 Recommended Job Roles");
      recs.job_roles.forEach((job) => {
        checkPage(8);
        doc.setTextColor(...dark);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(`${job.title} — ${job.match_percentage}% Match`, margin, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...gray);
        doc.setFontSize(8);
        y += 4;
        doc.text(`Salary: ${job.salary_range}`, margin + 4, y);
        y += 5;
      });
    }

    // Courses
    if (recs.courses?.length) {
      drawSection("🎓 Recommended Courses");
      recs.courses.forEach((c) => {
        drawBullet(`${c.name} (${c.platform}) — ${c.duration}`);
      });
    }

    // Resume improvements
    if (recs.resume_improvements) {
      drawSection("📝 Resume Improvements");
      if (recs.resume_improvements.immediate?.length) {
        checkPage(6);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...danger as [number, number, number]);
        doc.text("Immediate:", margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...gray);
        recs.resume_improvements.immediate.forEach((s) => drawBullet(s, 2));
      }
      if (recs.resume_improvements.ats_tips?.length) {
        checkPage(6);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...success as [number, number, number]);
        doc.text("ATS Tips:", margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...gray);
        recs.resume_improvements.ats_tips.forEach((s) => drawBullet(s, 2));
      }
    }

    // Portfolio projects
    if (recs.portfolio_projects?.length) {
      drawSection("🚀 Suggested Portfolio Projects");
      recs.portfolio_projects.forEach((p) => {
        drawBullet(`${p.name}: ${p.description} (${p.estimated_time})`);
      });
    }

    // Roadmap
    if (recs.roadmap) {
      drawSection("🗺 Career Roadmap");
      [
        { key: "three_month" as const, label: "3-Month Plan 🎯" },
        { key: "six_month" as const, label: "6-Month Plan 🚀" },
        { key: "twelve_month" as const, label: "12-Month Plan 🏆" },
      ].forEach(({ key, label }) => {
        const period = recs.roadmap?.[key];
        if (!period) return;
        checkPage(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...dark);
        doc.setFontSize(9);
        doc.text(label, margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...gray);
        doc.setFontSize(8);
        (period.goals || []).forEach((g: string) => drawBullet(g, 2));
        (period.actions || []).forEach((a: string) => drawBullet(a, 4));
      });
    }
  }

  // ===== FOOTER =====
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(241, 245, 249);
    doc.rect(0, 287, pageWidth, 10, "F");
    doc.setFontSize(7);
    doc.setTextColor(...gray);
    doc.text("SkillBridge AI Career Report • Confidential", margin, 293);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, 293, { align: "right" });
  }

  doc.save(`SkillBridge_Report_${(data.name || "Career").replace(/\s+/g, "_")}.pdf`);
}
