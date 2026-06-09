import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Calendar, User, Clock, ListChecks, BookOpen, Play, CheckCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/FirebaseProvider";
import { ExamRepository, ResultRepository } from "@/lib/db";
import { DailyExam } from "@/types";

export const Route = createFileRoute("/exam-today")({
  head: () => ({ meta: [{ title: "Today's Exam" }] }),
  component: ExamToday,
});

function ExamToday() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeExam, setActiveExam] = useState<DailyExam | null>(null);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function checkExamStatus() {
      if (!user?.uid) return;

      const timeoutId = setTimeout(() => {
        if (active && loading) {
          setLoading(false);
          console.warn("Exam-today status check timed out after 8s");
        }
      }, 8000);

      try {
        setLoading(true);
        const exams = await ExamRepository.getActiveExams(user.standard || "10");
        if (!active) return;
        if (exams.length > 0) {
          const exam = exams[0];
          setActiveExam(exam);

          // Check if already completed
          const results = await ResultRepository.getUserResults(user.uid);
          if (!active) return;
          const attempted = results.some((r) => r.examId === exam.examId);
          setHasAttempted(attempted);
        } else {
          setActiveExam(null);
        }
      } catch (err) {
        console.error("Exam validation error:", err);
      } finally {
        clearTimeout(timeoutId);
        if (active) {
          setLoading(false);
        }
      }
    }
    checkExamStatus();

    return () => {
      active = false;
    };
  }, [user?.uid, user?.standard]);

  if (loading) {
    return (
      <AppShell title="Today's Exam" titleGu="આજની પરીક્ષા" back="/dashboard">
        <div className="flex items-center justify-center min-h-[50dvh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppShell>
    );
  }

  if (!activeExam) {
    return (
      <AppShell title="Today's Exam" titleGu="આજની પરીક્ષા" back="/dashboard">
        <div className="px-5 py-8 text-center space-y-4">
          <div className="size-16 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground text-2xl font-bold">
            📭
          </div>
          <h2 className="text-lg font-bold font-gu">આજે કોઈ પરીક્ષા ઉપલબ્ધ નથી</h2>
          <p className="text-xs text-muted-foreground">તમારા ધોરણ માટે હાલ નવી પરીક્ષા સક્રિય નથી.</p>
          <Link
            to="/dashboard"
            className="inline-block px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-2xl text-xs shadow-float"
          >
            પાછા જાઓ
          </Link>
        </div>
      </AppShell>
    );
  }

  const examSubjectGu = activeExam.subjectId === "sub1" ? "વિજ્ઞાન" : activeExam.subjectId === "sub2" ? "ગણિત" : "સામાજિક વિજ્ઞાન";
  const examChapterGu = activeExam.chapterId === "ch1" ? "પ્રકરણ ૬ — જીવન પ્રક્રિયાઓ" : "પ્રકરણ ૧ — વાસ્તવિક સંખ્યાઓ";

  return (
    <AppShell title="Today's Exam" titleGu="આજની પરીક્ષા" back="/dashboard">
      <div className="px-5 py-5 space-y-5">
        <div className="rounded-3xl gradient-hero text-primary-foreground p-6 shadow-card relative overflow-hidden animate-[scale-in_0.4s_ease-out]">
          <div className="absolute -top-10 -right-10 size-44 rounded-full bg-white/10 blur-2xl" />
          <p className="text-[11px] uppercase tracking-wider text-white/80 font-semibold">Subject</p>
          <h2 className="text-2xl font-extrabold mt-1">{activeExam.subjectId === "sub1" ? "Science" : activeExam.subjectId === "sub2" ? "Mathematics" : "Social Science"}</h2>
          <p className="text-sm text-white/85 font-gu">{examSubjectGu}</p>
          <div className="mt-4 inline-flex items-center gap-2 bg-white/15 rounded-full px-3 py-1.5 text-xs">
            <BookOpen className="size-3.5" /> {activeExam.chapterId === "ch1" ? "Chapter 6 — Life Processes" : "Chapter 1 — Real Numbers"}
          </div>
        </div>

        <div className="bg-card border border-border rounded-3xl p-5 shadow-card space-y-3 animate-[slide-up_0.4s_ease-out]">
          <Info icon={<Calendar className="size-4" />} label="Exam Date" value={activeExam.examDate} />
          <Info icon={<User className="size-4" />} label="Examiner" value={activeExam.examinerId === "ex456" ? "Hitesh Patel (Admin)" : "School Board"} />
          <Info icon={<Clock className="size-4" />} label="Duration" value={`${activeExam.duration} Minutes`} />
          <Info icon={<ListChecks className="size-4" />} label="Total Questions" value={`${activeExam.totalQuestions} MCQs`} />
        </div>

        <div className="bg-success-soft border border-success/20 rounded-3xl p-4 text-sm">
          <p className="font-semibold text-success font-gu">પરીક્ષા માટેની માર્ગદર્શિકા (Instructions)</p>
          <ul className="mt-2 space-y-1 text-foreground/80 text-xs list-disc pl-4 font-gu">
            <li>આ પ્રશ્નપત્ર બોર્ડ પદ્ધતિ મુજબના MCQs ધરાવે છે.</li>
            <li>તમે આગળ અને પાછળના પ્રશ્નો જોઈ ચેક કરી શકો છો.</li>
            <li>સમય મર્યાદા પૂરી થતા પરીક્ષા આપોઆપ સબમિટ થઈ જશે.</li>
            <li>એક વાર સબમિટ કર્યા પછી ફરીથી પરીક્ષા આપી શકાશે નહીં.</li>
          </ul>
        </div>

        {hasAttempted ? (
          <div className="p-4 bg-muted border border-border rounded-3xl text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-success font-bold text-sm font-gu">
              <CheckCircle className="size-5" /> તમે આ પરીક્ષા પહેલેથી જ આપી દીધી છે
            </div>
            <p className="text-xs text-muted-foreground font-gu">You have already submitted this exam.</p>
            <Link
              to="/result"
              className="w-full h-12 rounded-2xl border border-primary text-primary font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition mt-2 text-sm"
            >
              પરિણામ જુઓ (View Results)
            </Link>
          </div>
        ) : (
          <Link
            to="/exam"
            className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-semibold shadow-float flex items-center justify-center gap-2 active:scale-[0.98] transition"
          >
            <Play className="size-5 fill-current" /> Start Exam
          </Link>
        )}
      </div>
    </AppShell>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="size-10 rounded-2xl bg-primary-soft text-primary flex items-center justify-center">{icon}</div>
      <div className="flex-1">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="font-medium text-sm">{value}</p>
      </div>
    </div>
  );
}
