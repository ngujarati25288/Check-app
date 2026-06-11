import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, ChevronLeft, ChevronRight, X, LayoutGrid, AlertCircle } from "lucide-react";
import { useAuth } from "@/components/FirebaseProvider";
import { ExamRepository, ResultRepository, MistakeRepository } from "@/lib/db";
import { DailyExam, Question, ExamResult, StudentMistake } from "@/types";
import { toast } from "sonner";
import { sfx } from "@/lib/settings";
import { getExamQuestionsSecure, submitExamSecure } from "@/lib/api/exam.functions";
import { secureStorage } from "@/lib/secureStorage";

interface ExamSearchParams {
  examId?: string;
}

export const Route = createFileRoute("/exam")({
  validateSearch: (search: Record<string, unknown>): ExamSearchParams => {
    return {
      examId: search.examId as string | undefined,
    };
  },
  head: () => ({ meta: [{ title: "Exam in progress" }] }),
  component: Exam,
});

function Exam() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { examId } = Route.useSearch();

  // Route protection
  useEffect(() => {
    if (!user?.uid) {
      navigate({ to: "/login" });
    }
  }, [user?.uid, navigate]);

  const [activeExam, setActiveExam] = useState<DailyExam | null>(null);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [seconds, setSeconds] = useState(30 * 60);
  const [showPalette, setShowPalette] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 1. Load active exam and questions on mount safely
  useEffect(() => {
    let active = true;
    async function loadExam() {
      if (!user?.uid) return;

      const timeoutId = setTimeout(() => {
        if (active && loading) {
          setLoading(false);
          console.warn("Exam load timed out after 8s");
        }
      }, 8000);

      try {
        setLoading(true);
        const exams = await ExamRepository.getActiveExams(user.standard || "10");
        if (!active) return;
        if (exams.length === 0) {
          toast.error("આજે કોઈ પરીક્ષા ઉપલબ્ધ નથી.");
          navigate({ to: "/dashboard" });
          return;
        }

        let exam = exams[0];
        if (examId) {
          const matched = exams.find((e) => e.examId === examId);
          if (matched) {
            exam = matched;
          }
        }
        setActiveExam(exam);

        // Verify duplicate submissions (Fix 8)
        const prevResults = await ResultRepository.getUserResults(user.uid);
        if (!active) return;
        const alreadySubmitted = prevResults.some((r) => r.examId === exam.examId);
        if (alreadySubmitted) {
          toast.warning("તમે આ પરીક્ષા પહેલાથી જ સબમિટ કરી દીધી છે.");
          navigate({ to: "/dashboard" });
          return;
        }

        // Fetch questions securely (Fix 3)
        const resp = await getExamQuestionsSecure({
          data: {
            examId: exam.examId,
            studentId: user.uid,
            subjectId: exam.subjectId,
            chapterId: exam.chapterId,
            standard: user.standard || "10"
          }
        });
        if (!active) return;

        let qList: Question[] = (resp.questions || []) as Question[];
        
        // Dynamic Fallback to local DB seeds if offline/demo configuration and no questions found
        if (qList.length === 0) {
          const storedQuestions = localStorage.getItem("dle:questions");
          if (storedQuestions) {
            const parsed = JSON.parse(storedQuestions) as Question[];
            // Strip correctAnswer/explanation even on fallback so it can ever be extracted!
            qList = parsed.filter(
              (q) => q.subjectId === exam.subjectId && q.chapterId === exam.chapterId
            ).map((q) => ({
              ...q,
              correctAnswer: "",
              explanation: ""
            }));
          }
        }

        // Limit questions matching totalCount or fallback
        if (qList.length === 0) {
          toast.error("આ પરીક્ષાના પ્રશ્નો મળ્યા નથી.");
          navigate({ to: "/dashboard" });
          return;
        }

        // Keep matching questions
        const finalQuestions = qList.slice(0, exam.totalQuestions);
        setExamQuestions(finalQuestions);

        // Read or set startTime using secureStorage (Fix 6)
        const startKey = `exam_start_time_${exam.examId}`;
        let startTimeStr = secureStorage.getItem<string>(startKey);
        if (!startTimeStr) {
          startTimeStr = String(Date.now());
          secureStorage.setItem(startKey, startTimeStr);
        }

        const startTime = parseInt(startTimeStr, 10);
        const durationMs = exam.duration * 60 * 1000;
        const deadline = startTime + durationMs;
        const initialRemaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
        setSeconds(initialRemaining);

        // Load autosaved draft answers using secureStorage (Fix 6)
        const draftKey = `exam_draft_${exam.examId}`;
        const parsedDraft = secureStorage.getItem<(number | null)[]>(draftKey);
        if (parsedDraft && parsedDraft.length === finalQuestions.length) {
          setAnswers(parsedDraft);
        } else {
          setAnswers(finalQuestions.map(() => null));
        }

      } catch (err: any) {
        console.error("Exam load issue:", err);
        const errMsg = err?.message || "પરીક્ષા શરૂ કરવામાં મુશ્કેલી પડી.";
        toast.error(errMsg);
        navigate({ to: "/dashboard" });
      } finally {
        clearTimeout(timeoutId);
        if (active) {
          setLoading(false);
        }
      }
    }
    loadExam();

    return () => {
      active = false;
    };
  }, [user?.uid, user?.standard, navigate]);

  // 2. Draft autosaving effect utilizing secureStorage (Fix 6)
  useEffect(() => {
    if (activeExam && answers.length > 0) {
      secureStorage.setItem(
        `exam_draft_${activeExam.examId}`,
        answers
      );
    }
  }, [answers, activeExam]);

  // 3. Resilient timer countdown loop
  useEffect(() => {
    if (loading || submitting || !activeExam) return;

    const id = setInterval(() => {
      const startKey = `exam_start_time_${activeExam.examId}`;
      const startTimeStr = secureStorage.getItem<string>(startKey);
      if (startTimeStr) {
        const startTime = parseInt(startTimeStr, 10);
        const durationMs = activeExam.duration * 60 * 1000;
        const deadline = startTime + durationMs;
        const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
        
        setSeconds(remaining);

        if (remaining <= 0) {
          clearInterval(id);
          toast.warning("સમય પૂર્ણ થઈ ગયો છે! તમારી પરીક્ષા આપોઆપ સબમિટ થઈ રહી છે.");
          handleExamSubmit(true);
        }
      }
    }, 1000);

    return () => clearInterval(id);
  }, [loading, submitting, activeExam]);

  async function handleExamSubmit(auto = false) {
    if (submitting || !user || !activeExam || examQuestions.length === 0) return;
    try {
      setSubmitting(true);
      
      const startKey = `exam_start_time_${activeExam.examId}`;
      const startTimeStr = secureStorage.getItem<string>(startKey) || String(Date.now() - 5*60*1000);

      const deviceInfo = {
        deviceId: "WEB_VITE_SECURE_" + navigator.userAgent.slice(0, 50),
        appVersion: "1.0.4-prod",
        startTime: new Date(parseInt(startTimeStr, 10)).toISOString(),
        submitTime: new Date().toISOString(),
        attemptNumber: 1
      };

      // 1. Submit answers to the server for processing (Fix 4, 5, 7, 8)
      const resp = await submitExamSecure({
        data: {
          examId: activeExam.examId,
          studentId: user.uid,
          studentName: user.fullName,
          subjectId: activeExam.subjectId,
          chapterId: activeExam.chapterId,
          answers: answers,
          deviceInfo: deviceInfo
        }
      });

      const resultDocId = `res_${user.uid}_${activeExam.examId}`;

      if (resp.isPlaceholder) {
        // Fallback scoring logic only for local emulation placeholder mode
        let correct = 0;
        let wrong = 0;
        const mistakesToSave: StudentMistake[] = [];

        // Match answer key against local seeds if running mock
        const storedQuestions = localStorage.getItem("dle:questions");
        const allQuestions = storedQuestions ? (JSON.parse(storedQuestions) as Question[]) : [];

        examQuestions.forEach((q, idx) => {
          const matchingQ = allQuestions.find((mq) => mq.questionId === q.questionId);
          const correctKey = matchingQ ? matchingQ.correctAnswer : "A";
          const selectedIdx = answers[idx];
          const selectedLetter = selectedIdx !== null ? String.fromCharCode(65 + selectedIdx) : null;
          const isCorrect = selectedLetter === correctKey;

          if (isCorrect) {
            correct++;
          } else {
            wrong++;
            mistakesToSave.push({
              studentId: user.uid,
              examId: activeExam.examId,
              questionId: q.questionId,
              subjectId: activeExam.subjectId,
              subjectName: activeExam.subjectId === "sub1" ? "Science" : activeExam.subjectId === "sub2" ? "Mathematics" : "Social Science",
              chapterId: q.chapterId,
              chapterName: q.chapterId === "ch1" ? "Chapter 6 — Life Processes" : "Chapter 1 — Real Numbers",
              question: q.question,
              optionA: q.optionA,
              optionB: q.optionB,
              optionC: q.optionC,
              optionD: q.optionD,
              selectedAnswer: selectedLetter || "Skipped",
              correctAnswer: correctKey,
              explanation: matchingQ?.explanation || "No explanation document available.",
              examDate: activeExam.examDate,
              revisionCount: 0,
              correctRevisionCount: 0,
              mastered: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              subject: activeExam.subjectId === "sub1" ? "Science" : activeExam.subjectId === "sub2" ? "Mathematics" : "Social Science",
              chapter: q.chapterId === "ch1" ? "Chapter 6 — Life Processes" : "Chapter 1 — Real Numbers"
            });
          }
        });

        const percentage = Math.round((correct / examQuestions.length) * 100);

        const examResult: ExamResult = {
          resultId: resultDocId,
          studentId: user.uid,
          examId: activeExam.examId,
          subject: activeExam.subjectId === "sub1" ? "Science" : activeExam.subjectId === "sub2" ? "Mathematics" : "Social Science",
          chapter: activeExam.chapterId === "ch1" ? "Chapter 6 — Life Processes" : "Chapter 1 — Real Numbers",
          examDate: activeExam.examDate,
          totalQuestions: examQuestions.length,
          correctAnswers: correct,
          wrongAnswers: wrong,
          obtainedMarks: correct,
          percentage: percentage,
          submittedAt: new Date().toISOString(),
          ...deviceInfo
        };

        await ResultRepository.saveResult(examResult);
        await Promise.all(
          mistakesToSave.map((mistake) => MistakeRepository.saveMistake(mistake))
        );

        secureStorage.setItem("last_result_id", resultDocId);
      } else {
        secureStorage.setItem("last_result_id", resp.resultId);
      }

      // Cleanup caches on completed submission
      secureStorage.removeItem(`exam_start_time_${activeExam.examId}`);
      secureStorage.removeItem(`exam_draft_${activeExam.examId}`);

      // Play audio cue
      const finalPercent = resp.isPlaceholder 
        ? Math.round((answers.filter((a) => a !== null).length / examQuestions.length) * 100) 
        : (resp.percentage || 0);

      if (finalPercent >= 70) {
        sfx.correct();
      } else {
        sfx.tap();
      }

      toast.success("પરીક્ષા સફળતાપૂર્વક સબમિટ થઈ ગઈ છે!");
      navigate({ to: "/result" });

    } catch (err: any) {
      console.error("Submission failed:", err);
      toast.error(err.message || "પરીક્ષા સબમિટ કરવામાં મુશ્કેલી પડી.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex flex-col items-center justify-center font-gu">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-3" />
        <p className="text-sm text-muted-foreground">પરીક્ષા પત્ર તૈયાર થઈ રહ્યું છે...</p>
      </div>
    );
  }

  const q = examQuestions[index];
  const answered = answers.filter((a) => a !== null).length;
  const progress = examQuestions.length > 0 ? (answered / examQuestions.length) * 100 : 0;
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const timeLow = seconds < 5 * 60;

  function choose(i: number) {
    setAnswers((a) => a.map((v, idx) => (idx === index ? i : v)));
  }

  return (
    <div className="min-h-dvh bg-background flex justify-center">
      <div className="w-full max-w-md min-h-dvh flex flex-col justify-between">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between px-4 h-14 gap-2">
            <Link to="/exam-today" aria-label="Exit exam" className="size-10 rounded-full hover:bg-muted flex items-center justify-center">
              <X className="size-5" />
            </Link>
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-mono font-semibold text-sm transition ${
                timeLow ? "bg-destructive-soft text-destructive animate-[pulse-soft_1.5s_ease-in-out_infinite]" : "bg-primary-soft text-primary"
              }`}
            >
              <Clock className="size-4" />
              {mm}:{ss}
            </div>
            <button
              onClick={() => setShowPalette((s) => !s)}
              aria-label="Question palette"
              className={`size-10 rounded-full flex items-center justify-center transition ${
                showPalette ? "gradient-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <LayoutGrid className="size-5" />
            </button>
          </div>
          <div className="px-4 pb-2">
            <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              <span>Q {index + 1} / {examQuestions.length}</span>
              <span>{Math.round(progress)}% answered</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full gradient-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </header>

        {/* Question Palette */}
        {showPalette && (
          <div className="px-5 py-4 border-b border-border bg-muted/30 animate-[slide-up_0.25s_ease-out]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold font-gu">પ્રશ્ન પેલેટ</p>
              <div className="flex items-center gap-3 text-[10px]">
                <Legend color="bg-success" label="Answered" />
                <Legend color="bg-warning" label="Current" />
                <Legend color="bg-muted-foreground/30" label="Skipped" />
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {examQuestions.map((_, i) => {
                const isCurrent = i === index;
                const isAnswered = answers[i] !== null;
                let cls = "bg-muted text-foreground border-border";
                if (isCurrent) cls = "bg-warning text-warning-foreground border-warning shadow-card";
                else if (isAnswered) cls = "bg-success text-success-foreground border-success";
                return (
                  <button
                    key={i}
                    onClick={() => { setIndex(i); setShowPalette(false); }}
                    className={`h-11 rounded-xl border-2 font-semibold text-sm active:scale-95 transition ${cls}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex-1 px-5 py-5 flex flex-col justify-between">
          {q && (
            <div key={q.questionId} className="flex-1 animate-[fade-in_0.3s_ease-out]">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Question {index + 1}</p>
              <h2 className="mt-1 text-lg font-semibold leading-snug">{q.question}</h2>

              <div className="mt-6 space-y-3">
                {[q.optionA, q.optionB, q.optionC, q.optionD].map((opt, i) => {
                  const selected = answers[index] === i;
                  return (
                    <button
                      key={i}
                      onClick={() => choose(i)}
                      className={`w-full text-left flex items-center gap-3 p-4 rounded-2xl border-2 transition active:scale-[0.99] ${
                        selected ? "border-primary bg-primary-soft-forced" : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      <span
                        className={`size-8 rounded-xl flex items-center justify-center font-semibold text-sm ${
                          selected ? "gradient-primary text-primary-foreground" : "bg-muted text-foreground"
                        }`}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="flex-1 text-sm">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-6">
            <button
              disabled={index === 0}
              onClick={() => setIndex((i) => i - 1)}
              className="h-12 px-4 rounded-2xl border border-border bg-card font-medium text-sm flex items-center gap-1 disabled:opacity-40 active:scale-[0.98] transition"
            >
              <ChevronLeft className="size-4" /> Prev
            </button>
            {index < examQuestions.length - 1 ? (
              <button
                onClick={() => setIndex((i) => i + 1)}
                className="flex-1 h-12 rounded-2xl gradient-primary text-primary-foreground font-semibold flex items-center justify-center gap-1 shadow-float active:scale-[0.98] transition"
              >
                Next <ChevronRight className="size-4" />
              </button>
            ) : (
              <button
                disabled={submitting}
                onClick={() => handleExamSubmit()}
                className="flex-1 h-12 rounded-2xl bg-success text-success-foreground font-semibold shadow-float active:scale-[0.98] transition flex items-center justify-center gap-2"
              >
                {submitting ? "સબમિટ થઈ રહ્યું છે..." : "Submit Exam"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1 text-muted-foreground">
      <span className={`size-2.5 rounded-sm ${color}`} /> {label}
    </span>
  );
}
