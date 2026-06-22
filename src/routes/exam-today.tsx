import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Calendar, User, Clock, ListChecks, BookOpen, Play, CheckCircle, AlertCircle, FileText, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/FirebaseProvider";
import { ExamRepository, ResultRepository, SubjectRepository, ChapterRepository } from "@/lib/db";
import { DailyExam } from "@/types";

export const Route = createFileRoute("/exam-today")({
  head: () => ({ meta: [{ title: "Today's Exam" }] }),
  component: ExamToday,
});

function ExamToday() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [allExams, setAllExams] = useState<DailyExam[]>([]);
  const [selectedExamIndex, setSelectedExamIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  
  // Dynamic names
  const [subjectName, setSubjectName] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [hasAttempted, setHasAttempted] = useState(false);
  const [abhyasCompleted, setAbhyasCompleted] = useState<boolean>(true);
  const [checkingAbhyas, setCheckingAbhyas] = useState<boolean>(false);
  
  // Current time state for countdowns
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeExam = allExams[selectedExamIndex] || null;

  // 1. Fetch all active exams matched
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
        const exams = await ExamRepository.getActiveExams(user.standard || "10", user.medium);
        if (!active) return;
        
        const allSubs = await SubjectRepository.getSubjects(user.standard || "10");
        if (!active) return;

        // Filter matched standard exams
        const matched = exams.filter(e => {
          return allSubs.some(s => s.subjectId === e.subjectId) || exams.length <= 2;
        });

        if (matched.length > 0) {
          setAllExams(matched);
          setSelectedExamIndex(0);
        } else if (exams.length > 0) {
          setAllExams(exams);
          setSelectedExamIndex(0);
        } else {
          setAllExams([]);
        }
      } catch (err) {
        console.error("Exam validation error on page loading:", err);
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

  // 2. Resolve parameters whenever selectedExamIndex or activeExam changes
  useEffect(() => {
    let active = true;
    async function resolveExamMeta() {
      if (!activeExam || !user) return;
      
      try {
        const allSubs = await SubjectRepository.getSubjects(user.standard || "10");
        if (!active) return;

        // Resolve Subject Name
        const mSub = allSubs.find(s => s.subjectId === activeExam.subjectId);
        setSubjectName(mSub ? mSub.subjectName : activeExam.subjectId);

        // Resolve Chapter Name
        const chaps = await ChapterRepository.getChapters(activeExam.subjectId);
        if (!active) return;

        let chDisplay = "";
        const examChapIds = activeExam.chapterIds || (activeExam.chapterId ? [activeExam.chapterId] : []);
        if (examChapIds.length > 0) {
          const matchedChaps = chaps.filter(c => examChapIds.includes(c.chapterId));
          const chapNos = matchedChaps
            .map(c => c.chapterNo)
            .filter(no => no !== undefined && no !== null) as number[];
          
          if (chapNos.length > 0) {
            const minNo = Math.min(...chapNos);
            const maxNo = Math.max(...chapNos);
            if (minNo === maxNo) {
              chDisplay = `પ્રકરણ ${minNo}`;
              const matchedName = matchedChaps.find(c => c.chapterNo === minNo)?.chapterName;
              if (matchedName) {
                chDisplay += ` — ${matchedName}`;
              }
            } else {
              chDisplay = `પ્રકરણ ${minNo} થી ${maxNo}`;
            }
          }
        }

        if (!chDisplay) {
          const mChap = chaps.find(c => c.chapterId === activeExam.chapterId);
          chDisplay = mChap ? mChap.chapterName : activeExam.chapterId;
        }
        setChapterName(chDisplay);

        // Check attempt status
        const results = await ResultRepository.getUserResults(user.uid);
        if (!active) return;
        const attempted = results.some((r) => r.examId === activeExam.examId);
        setHasAttempted(attempted);

        // Check if Abhyas completed
        if (activeExam.requireAbhyasCompleted) {
          setCheckingAbhyas(true);
          const completed = await ChapterRepository.checkAbhyasCompleted(user.uid, activeExam.chapterId);
          setAbhyasCompleted(completed);
          setCheckingAbhyas(false);
        } else {
          setAbhyasCompleted(true);
        }
      } catch (err) {
        console.error("Error resolving exam details:", err);
      }
    }
    resolveExamMeta();

    return () => {
      active = false;
    };
  }, [activeExam, user?.uid]);

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
          <div className="size-16 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground text-2xl font-bold font-sans">
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

  // Calculate local timing statuses
  const startTime = activeExam.startAt ? new Date(activeExam.startAt) : null;
  const endTime = activeExam.endAt ? new Date(activeExam.endAt) : null;

  const isUpcoming = startTime ? currentTime < startTime : false;
  const isExpired = endTime ? currentTime > endTime : false;

  // Render countdown string
  let statusBadgeColor = "bg-primary text-white";

  if (isUpcoming) {
    statusBadgeColor = "bg-amber-500 text-white";
  } else if (isExpired) {
    statusBadgeColor = "bg-slate-500 text-white";
  }

  // Formatting helper for launch datetime
  const formatDateTime = (isoStr: string) => {
    try {
      const dt = new Date(isoStr);
      return dt.toLocaleString("gu-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (e) {
      return isoStr;
    }
  };

  return (
    <AppShell title="Today's Exam" titleGu="આજની પરીક્ષા" back="/dashboard">
      <div className="px-5 py-5 space-y-5">
        
        {/* MULTIPLE EXAMS OPTION SELECTION PILLS */}
        {allExams.length > 1 && (
          <div className="space-y-2 bg-muted/40 p-3 rounded-2xl border border-border/60">
            <label className="text-[11px] font-bold text-muted-foreground block font-gu">
              પરીક્ષા પસંદ કરો (Choose Exam — {allExams.length} ઉપલબ્ધ):
            </label>
            <div className="grid grid-cols-2 gap-2">
              {allExams.map((ex, idx) => {
                const isSelected = selectedExamIndex === idx;
                return (
                  <button
                    key={ex.examId}
                    type="button"
                    onClick={() => setSelectedExamIndex(idx)}
                    className={`px-3 py-2 text-xs rounded-xl border font-bold text-left truncate transition ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card text-foreground border-border hover:bg-muted/60"
                    }`}
                  >
                    📝 Exam {idx + 1}: {ex.subjectId}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Exam Card Detail Header */}
        <div className="rounded-3xl gradient-hero text-primary-foreground p-6 shadow-card relative overflow-hidden animate-[scale-in_0.4s_ease-out]">
          <div className="absolute -top-10 -right-10 size-44 rounded-full bg-white/10 blur-2xl" />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/80 font-bold">વિષય / Subject</p>
              <h2 className="text-2xl font-extrabold mt-1">{subjectName || "Subject"}</h2>
            </div>
            
            <span className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-extrabold rounded-full ${statusBadgeColor} animate-pulse shadow-md`}>
              {isUpcoming ? "Upcoming" : isExpired ? "Completed" : "LIVE"}
            </span>
          </div>
          
          <div className="mt-4 inline-flex items-center gap-2 bg-white/15 rounded-full px-3 py-1.5 text-xs">
            <BookOpen className="size-3.5" /> {chapterName || "Chapter"}
          </div>
        </div>

        {/* Timers & Configuration Details */}
        <div className="bg-card border border-border rounded-3xl p-5 shadow-card space-y-3 animate-[slide-up_0.4s_ease-out]">
          <Info icon={<Calendar className="size-4" />} label="Exam Date" value={activeExam.examDate} />
          <Info icon={<User className="size-4" />} label="Examiner" value={activeExam.examinerName || "School Board"} />
          <Info icon={<Clock className="size-4" />} label="Duration" value={`${activeExam.duration} Minutes`} />
          <Info icon={<ListChecks className="size-4" />} label="Total Questions" value={`${activeExam.totalQuestions} Questions`} />
          
          {activeExam.startAt && (
            <div className="mt-2 border-t pt-3 border-border/60 text-xs">
              <span className="text-muted-foreground block font-semibold mb-1">Launch Date Time:</span>
              <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                {formatDateTime(activeExam.startAt)}
              </span>
            </div>
          )}
        </div>

        {/* Instruction Alert Panel */}
        <div className="bg-success-soft border border-success/20 rounded-3xl p-4 text-sm font-sans">
          <p className="font-semibold text-success font-gu">પરીક્ષા માટેની માર્ગદર્શિકા (Instructions)</p>
          <ul className="mt-2 space-y-1 text-foreground/80 text-xs list-disc pl-4 font-gu">
            <li>આ પ્રશ્નપત્ર બોર્ડ પદ્ધતિ મુજબના વિવિધ પ્રશ્નો ધરાવે છે.</li>
            <li>લાસ્ટ સબમિશન પછી ફાઈનલ માર્કસ અને રીપોર્ટ જનરેટ થશે.</li>
            <li>સમય મર્યાદા પૂરી થતા પરીક્ષા આપોઆપ સબમિટ થઈ જશે.</li>
            <li>તમે આ પરીક્ષાને ફરીથી આપીને પ્રેક્ટિસ પણ કરી શકો છો.</li>
          </ul>
        </div>

        {/* Button Actions Handler */}
        {isUpcoming ? (
          <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-3xl text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 font-extrabold text-sm font-gu">
              <AlertCircle className="size-5 animate-bounce" /> આ પરીક્ષા શરૂ થવા માટે બાકી છે (Scheduled)
            </div>
            <p className="text-xs text-muted-foreground font-gu">
              પરીક્ષા લોન્ચ સમય: <strong className="font-sans font-bold">{formatDateTime(activeExam.startAt)}</strong> પર આપોઆપ શરૂ થશે.
            </p>
            <div className="bg-amber-500/5 rounded-2xl py-2 px-4 inline-block text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
              ⏳ શરૂ થવા આડેનો સમય: {(() => {
                const diff = new Date(activeExam.startAt).getTime() - currentTime.getTime();
                if (diff <= 0) return "શરૂ કરો";
                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);
                const parts = [];
                if (h > 0) parts.push(`${h} કલાક`);
                if (m > 0 || h > 0) parts.push(`${m} મિનિટ`);
                parts.push(`${s} સેકન્ડ`);
                return parts.join(" ");
              })()}
            </div>
          </div>
        ) : isExpired ? (
          <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-3xl text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm font-gu">
              <AlertCircle className="size-5" /> પરીક્ષા પૂર્ણ થઈ ગઈ છે (Time Expired)
            </div>
            <p className="text-xs text-muted-foreground">આ પરીક્ષા આપવાની નિર્ધારિત સમય મર્યાદા પૂરી થયેલ છે.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* If the student completed it previous time, we show results link AND retake button */}
            {hasAttempted && (
              <div className="p-4 bg-muted border border-border rounded-3xl text-center space-y-2 font-sans">
                <div className="flex items-center justify-center gap-2 text-success font-bold text-xs font-gu">
                  <CheckCircle className="size-4" /> તમે આ પરીક્ષા પહેલેથી જ આપી દીધી છે
                </div>
                <p className="text-[11px] text-muted-foreground font-gu">પરંતુ તમે તેને ફરીથી આપીને વધુ પ્રેક્ટિસ કરી શકો છો.</p>
                <Link
                  to="/result"
                  className="w-full h-11 rounded-2xl bg-card border border-border hover:bg-muted/40 font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition text-xs text-foreground font-gu"
                >
                  પરિણામ અને રીપોર્ટ જુઓ (View Previous Result)
                </Link>
              </div>
            )}
            
            {!abhyasCompleted ? (
              <div className="bg-amber-500/10 border border-amber-500/25 p-5 rounded-3xl space-y-4 text-center">
                <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-400 font-extrabold text-sm font-gu">
                  <AlertCircle className="size-5 animate-pulse shrink-0" /> અભ્યાસ પૂર્ણ કરવો જરૂરી છે 🔐
                </div>
                <p className="text-xs text-muted-foreground font-gu leading-relaxed">
                  શાળા મંડળના નિયમ મુજબ, આ અતિ મહત્વની કસોટી શરૂ કરવા માટે તમારે પ્રથમ આ પ્રકરણનો સારાંશ અને પ્રેક્ટિસ સ્કોર બોર્ડ પૂર્ણ કરવો પડશે.
                </p>
                <Link
                  to="/abhyas"
                  className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold transition flex items-center justify-center gap-2 shadow-md text-xs font-gu"
                >
                  📖 પ્રકરણ અભ્યાસ શરૂ કરો (Go to Study Room)
                </Link>
              </div>
            ) : (
              <Link
                to="/exam"
                search={{ examId: activeExam.examId }}
                className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-semibold shadow-float flex items-center justify-center gap-2 active:scale-[0.98] transition text-sm font-gu"
              >
                <Play className="size-5 fill-current animate-pulse font-sans" /> 
                {hasAttempted ? "ફરીથી પરીક્ષા શરૂ કરો (Retake Exam)" : "પરીક્ષા શરૂ કરો (Start Exam)"}
              </Link>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 font-sans">
      <div className="size-10 rounded-2xl bg-primary-soft text-primary flex items-center justify-center shrink-0">{icon}</div>
      <div className="flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="font-medium text-xs text-foreground/90">{value}</p>
      </div>
    </div>
  );
}
