import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Trophy, AlertTriangle, TrendingUp, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProgressRing } from "@/components/ProgressRing";
import { Confetti } from "@/components/Confetti";
import { todayExam, gradeFor } from "@/lib/mockData";
import { sfx } from "@/lib/settings";
import { useAuth } from "@/components/FirebaseProvider";
import { ResultRepository } from "@/lib/db";
import { ExamResult } from "@/types";
import { secureStorage } from "@/lib/secureStorage";

export const Route = createFileRoute("/result")({
  head: () => ({ meta: [{ title: "Exam Result" }] }),
  component: Result,
});

function Result() {
  const { user } = useAuth();
  const [lastResult, setLastResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadLastScore() {
      if (!user?.uid) return;

      const timeoutId = setTimeout(() => {
        if (active && loading) {
          setLoading(false);
          console.warn("Result loading timed out after 8s");
        }
      }, 8000);

      try {
        setLoading(true);
        const results = await ResultRepository.getUserResults(user.uid);
        if (!active) return;
        
        let found: ExamResult | null = null;
        const lastCachedId = secureStorage.getItem<string>("last_result_id");
        
        if (lastCachedId) {
          found = results.find((r) => r.resultId === lastCachedId) || null;
        }

        if (!found && results.length > 0) {
          // Sort descend by submittedAt and pick freshest
          const sorted = [...results].sort((a, b) => 
            new Date(b.submittedAt || "").getTime() - new Date(a.submittedAt || "").getTime()
          );
          found = sorted[0];
        }

        setLastResult(found);
      } catch (e) {
        console.error("Failed to load result document:", e);
      } finally {
        clearTimeout(timeoutId);
        if (active) {
          setLoading(false);
        }
      }
    }
    loadLastScore();

    return () => {
      active = false;
    };
  }, [user?.uid]);

  // Derived calculations with sensible fallback to preview mock values
  const total = lastResult?.totalQuestions ?? 20;
  const correct = lastResult?.correctAnswers ?? 19;
  const wrong = lastResult?.wrongAnswers ?? (total - correct);
  const percent = lastResult?.percentage ?? Math.round((correct / total) * 100);
  
  const lastWeekPercent = 72;
  const improvement = percent - lastWeekPercent;
  const { grade, message } = gradeFor(percent);
  const celebrate = percent >= 90;

  const [showConfetti, setShowConfetti] = useState(celebrate);
  
  useEffect(() => {
    if (!celebrate) return;
    sfx.achievement();
    const t = setTimeout(() => setShowConfetti(false), 4500);
    return () => clearTimeout(t);
  }, [celebrate]);

  if (loading) {
    return (
      <AppShell title="Result" titleGu="પરિણામ" back="/dashboard">
        <div className="flex items-center justify-center min-h-[50dvh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppShell>
    );
  }

  const isEnglish = user?.medium === "English";
  const getSuccessMessage = () => {
    if (isEnglish) {
      if (percent >= 90) return "Excellent! You performed outstandingly.";
      if (percent >= 80) return "Very nice! You are improving continuously.";
      if (percent >= 70) return "Good! A little more effort and you'll be at the top.";
      if (percent >= 60) return "Keep moving — revise and resolve.";
      if (percent >= 50) return "Analyze your mistakes and try again.";
      return "Don't give up — learn a little every day.";
    }
    return message;
  };

  return (
    <AppShell title="Result" titleGu="પરિણામ" back="/dashboard">
      {showConfetti && <Confetti />}
      <div className="px-5 py-5 space-y-5">
        <div className="rounded-3xl gradient-hero text-primary-foreground p-6 shadow-card text-center relative overflow-hidden animate-[scale-in_0.45s_ease-out]">
          <div className="absolute -top-12 -right-12 size-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-12 -left-12 size-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className={`mx-auto size-16 rounded-3xl bg-white/15 backdrop-blur flex items-center justify-center text-3xl ${celebrate ? "animate-[float_2.4s_ease-in-out_infinite]" : ""}`}>
              <Trophy className="size-8 text-warning" />
            </div>
            {celebrate ? (
              <>
                <h2 className="mt-3 text-2xl font-extrabold font-gu animate-[scale-in_0.5s_ease-out]">
                  {isEnglish ? "🎉 Outstanding!" : "🎉 અદ્ભુત!"}
                </h2>
                <p className="mt-1 text-sm font-gu text-white/90">
                  {isEnglish ? "🌟 You performed exceptionally well!" : "🌟 તમે ખૂબ સારું પ્રદર્શન કર્યું!"}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm font-gu text-white/85">
                {isEnglish ? "Well done! You performed well" : "શાબાશ! તમે સારું પ્રદર્શન કર્યું"}
              </p>
            )}
            <div className="mt-4 flex justify-center">
              <ProgressRing value={percent} size={150} stroke={12} sublabel="Score" />
            </div>
            <p className="mt-3 text-lg font-bold">
              {correct} / {total} marks
            </p>
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur">
              <span className="text-[11px] uppercase tracking-wider text-white/80">Grade</span>
              <span className="text-xl font-extrabold">{grade}</span>
            </div>
          </div>
        </div>

        {celebrate && (
          <div className="rounded-3xl bg-warning/15 border border-warning/30 p-4 flex items-center gap-3 animate-[slide-up_0.4s_ease-out]">
            <div className="size-10 rounded-2xl bg-warning/30 text-warning-foreground flex items-center justify-center">
              <Sparkles className="size-5" />
            </div>
            <p className="text-sm font-gu font-semibold leading-snug">
              {isEnglish ? "🏆 Outstanding result! You are a Top Performer." : "🏆 શાનદાર પરિણામ! તમે Top Performer છો."}
            </p>
          </div>
        )}

        <div className="rounded-3xl bg-success-soft border border-success/20 p-4 flex items-start gap-3 animate-[slide-up_0.4s_ease-out]">
          <div className="size-10 rounded-2xl bg-success/20 text-success flex items-center justify-center shrink-0">
            <TrendingUp className="size-5" />
          </div>
          <div>
            <p className="text-sm font-gu font-semibold leading-snug">{getSuccessMessage()}</p>
            {improvement > 0 && (
              <p className="text-xs text-muted-foreground font-gu mt-1">
                {isEnglish 
                  ? `You scored ${improvement}% higher than last week.` 
                  : `તમે ગયા અઠવાડિયા કરતાં ${improvement}% વધુ ગુણ મેળવ્યા.`}
              </p>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-3xl p-5 shadow-card space-y-2 text-sm">
          <Row label="Subject" value={lastResult?.subject || todayExam.subject} />
          <Row label="Chapter" value={lastResult?.chapter || todayExam.chapter} />
          <Row label="Date" value={lastResult?.examDate || todayExam.date} />
          <Row label="Examiner" value="Hitesh Patel (Admin)" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<CheckCircle2 className="size-5" />} label="Correct" value={correct} tone="success" />
          <StatCard icon={<XCircle className="size-5" />} label="Wrong" value={wrong} tone="destructive" />
        </div>

        <div className="bg-card border border-border rounded-3xl p-5 shadow-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Performance breakdown</p>
          <div className="flex h-3 rounded-full overflow-hidden bg-muted">
            <div className="bg-success transition-all" style={{ width: `${(correct / total) * 100}%` }} />
            <div className="bg-destructive transition-all" style={{ width: `${(wrong / total) * 100}%` }} />
          </div>
          <div className="mt-3 flex justify-between text-xs">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-success" /> Correct {Math.round((correct / total) * 100)}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-destructive" /> Wrong {Math.round((wrong / total) * 100)}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Link
            to="/mistakes"
            className="h-12 rounded-2xl border border-destructive/30 bg-destructive-soft text-destructive font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition"
          >
            <AlertTriangle className="size-4" /> View Mistakes
          </Link>
          <Link
            to="/dashboard"
            className="h-12 rounded-2xl gradient-primary text-primary-foreground font-semibold flex items-center justify-center shadow-float active:scale-[0.98] transition"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function StatCard({
  icon, label, value, tone,
}: { icon: React.ReactNode; label: string; value: number; tone: "success" | "destructive"; }) {
  const cls = tone === "success"
    ? "bg-success-soft text-success border-success/20"
    : "bg-destructive-soft text-destructive border-destructive/20";
  return (
    <div className={`rounded-3xl border p-4 ${cls}`}>
      <div className="flex items-center gap-2">{icon}<span className="text-xs uppercase tracking-wider">{label}</span></div>
      <p className="mt-2 text-3xl font-extrabold">{value}</p>
    </div>
  );
}
