import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  FileText,
  Trophy,
  AlertTriangle,
  RotateCcw,
  TrendingUp,
  Flame,
  ChevronRight,
  Clock,
  Calendar,
  ArrowRight,
  Award,
  Users,
  Target,
  CheckCircle2,
  Sparkles,
  Shield,
  User,
  BookOpen,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MotivationalQuote } from "@/components/MotivationalQuote";
import {
  student,
  todayExam as mockTodayExam,
  pendingRevision as mockPendingRevision,
  parentSummary as mockParentSummary,
  weeklyChallenge,
  dailyProgress as mockDailyProgress,
  avatars,
} from "@/lib/mockData";
import { useSettings } from "@/lib/settings";
import { useAuth } from "@/components/FirebaseProvider";
import { ExamRepository, ResultRepository, MistakeRepository, AnalyticsRepository, PointsRepository, SubjectRepository, ChapterRepository } from "@/lib/db";
import { DailyExam, ExamResult, StudentMistake, RevisionAnalytics, StudentPoints } from "@/types";
import { t } from "@/lib/translations";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Daily Learning Exam" }] }),
  component: Dashboard,
});

const cards = [
  { to: "/result", labelKey: "dash_nav_result", icon: Trophy, color: "success" },
  { to: "/mistakes", labelKey: "dash_nav_mistakes", icon: AlertTriangle, color: "destructive" },
  { to: "/achievements", labelKey: "dash_nav_achievements", icon: Award, color: "primary" },
  { to: "/progress", labelKey: "dash_nav_progress", icon: TrendingUp, color: "success" },
] as const;

const colorMap: Record<string, string> = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  destructive: "bg-destructive-soft text-destructive",
  warning: "bg-warning/15 text-warning-foreground",
};

function Dashboard() {
  const settings = useSettings();
  const { user } = useAuth();
  
  const displayName = user?.fullName || student.name;
  const displayStandard = user?.standard || student.standard;
  const displaySchool = user?.school || student.school;

  const avatar = avatars.find((a) => a.emoji === settings.avatar)?.emoji ?? settings.avatar;

  // Real-time states
  const [activeExam, setActiveExam] = useState<DailyExam | null>(null);
  const [activeExamSubjectName, setActiveExamSubjectName] = useState("");
  const [activeExamChapterName, setActiveExamChapterName] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [results, setResults] = useState<ExamResult[]>([]);
  const [mistakes, setMistakes] = useState<StudentMistake[]>([]);
  const [analytics, setAnalytics] = useState<RevisionAnalytics | null>(null);
  const [points, setPoints] = useState<StudentPoints | null>(null);
  const [leaderboardPos, setLeaderboardPos] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handle = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(handle);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadData() {
      if (!user?.uid) return;

      const timeoutId = setTimeout(() => {
        if (active && loading) {
          setLoading(false);
          console.warn("Dashboard details loading timed out after 8s");
        }
      }, 8000);

      try {
        setLoading(true);
        // Load active exam
        const activeExamsList = await ExamRepository.getActiveExams(user.standard || "10", user.medium);
        if (!active) return;
        if (activeExamsList.length > 0) {
          const firstExam = activeExamsList[0];
          setActiveExam(firstExam);
          try {
            const allSubs = await SubjectRepository.getSubjects(user.standard || "10");
            const mSub = allSubs.find(s => s.subjectId === firstExam.subjectId);
            setActiveExamSubjectName(mSub ? mSub.subjectName : firstExam.subjectId);

            const chaps = await ChapterRepository.getChapters(firstExam.subjectId);
            
            // Format chapter display name based on chapterNo if available
            let chDisplay = "";
            const examChapIds = firstExam.chapterIds || (firstExam.chapterId ? [firstExam.chapterId] : []);
            if (examChapIds.length > 0) {
              const matchedChaps = chaps.filter(c => examChapIds.includes(c.chapterId));
              const chapNos = matchedChaps
                .map(c => c.chapterNo)
                .filter(no => no !== undefined && no !== null) as number[];
              
              if (chapNos.length > 0) {
                const minNo = Math.min(...chapNos);
                const maxNo = Math.max(...chapNos);
                if (minNo === maxNo) {
                  chDisplay = `પ્રકરણ ${minNo}`; // "Chapter 1" style
                  const matchedName = matchedChaps.find(c => c.chapterNo === minNo)?.chapterName;
                  if (matchedName) {
                    chDisplay += ` — ${matchedName}`;
                  }
                } else {
                  chDisplay = `પ્રકરણ ${minNo} થી ${maxNo}`; // "Chapter 1 to 4" range style
                }
              }
            }

            if (!chDisplay) {
              const mChap = chaps.find(c => c.chapterId === firstExam.chapterId);
              chDisplay = mChap ? mChap.chapterName : firstExam.chapterId;
            }

            setActiveExamChapterName(chDisplay);
          } catch (_) {
            setActiveExamSubjectName(firstExam.subjectId === "sub1" ? "વિજ્ઞાન" : firstExam.subjectId === "sub2" ? "ગણિત" : "સામાજિક વિજ્ઞાન");
            setActiveExamChapterName(firstExam.chapterId === "ch1" ? "પ્રકરણ ૬ — જીવન પ્રક્રિયાઓ" : "પ્રકરણ ૧ — વાસ્તવિક સંખ્યાઓ");
          }
        } else {
          setActiveExam(null);
        }

        // Load exam results
        const resList = await ResultRepository.getUserResults(user.uid);
        if (!active) return;
        setResults(resList);

        // Load mistakes
        const mistList = await MistakeRepository.getUserMistakes(user.uid);
        if (!active) return;
        setMistakes(mistList);

        // Load analytics
        const analyticsData = await AnalyticsRepository.getUserAnalytics(user.uid);
        if (!active) return;
        setAnalytics(analyticsData);

        // Load points
        const pointsData = await PointsRepository.getStudentPoints(user.uid);
        if (!active) return;
        setPoints(pointsData);

        // Load leaderboard rank & movement details
        const pos = await PointsRepository.getStudentLeaderboardPosition(user.uid, "alltime");
        if (!active) return;
        setLeaderboardPos(pos);
      } catch (err) {
        console.error("Dashboard dynamic load failed:", err);
      } finally {
        clearTimeout(timeoutId);
        if (active) {
          setLoading(false);
        }
      }
    }
    loadData();

    return () => {
      active = false;
    };
  }, [user?.uid, user?.standard]);

  // Derived metrics
  const totalExamsVal = results.length;
  const avgPercentageVal = totalExamsVal > 0 
    ? Math.round(results.reduce((s, r) => s + (r.percentage || 0), 0) / totalExamsVal) 
    : 0;

  const masteredQuestionsVal = analytics 
    ? analytics.masteredQuestionsCount 
    : mistakes.filter((m) => m.mastered).length;

  const pendingQuestionsVal = analytics 
    ? analytics.pendingRevisionCount 
    : mistakes.filter((m) => !m.mastered).length;

  const streakVal = user?.streak !== undefined ? user.streak : 0;

  // Daily statistics computation
  const todayDateStr = new Date().toISOString().split('T')[0];
  const examsCompletedToday = results.filter((r) => {
    if (!r.submittedAt) return false;
    let dateStr = "";
    if (typeof r.submittedAt === "string") {
      dateStr = r.submittedAt;
    } else if (typeof r.submittedAt.toDate === "function") {
      dateStr = r.submittedAt.toDate().toISOString();
    } else if (typeof r.submittedAt.seconds === "number") {
      dateStr = new Date(r.submittedAt.seconds * 1000).toISOString();
    } else {
      dateStr = String(r.submittedAt);
    }
    return dateStr.startsWith(todayDateStr);
  }).length;
  const totalExamsToday = activeExam ? 1 : 0;

  // Revision progress calculations
  const totalQuestionsSum = masteredQuestionsVal + pendingQuestionsVal;
  const revisionProgressPercent = totalQuestionsSum > 0
    ? Math.round((masteredQuestionsVal / totalQuestionsSum) * 100)
    : 100;

  // Render dedicated workspace for Admin and Super Admin
  if (user?.role === 'admin' || user?.role === 'super_admin') {
    return (
      <AppShell showBell>
        <div className="px-5 pt-2 pb-6 space-y-5">
          {/* Greeting */}
          <div className="flex items-center justify-between animate-[fade-in_0.4s_ease-out]">
            <div className="min-w-0 flex-1 mr-2">
              <p className="text-sm text-muted-foreground font-gu">
                {user.role === 'super_admin' ? "👑 મુખ્ય સંચાલક" : "🛠️ પેટા સંચાલક"}
              </p>
              <h1 className="text-2xl font-bold truncate">
                {displayName}
              </h1>
              <p className="text-xs text-muted-foreground font-gu">
                Daily Learning Exam • મુખ્ય વહીવટી અને નિયંત્રણ વિભાગ
              </p>
            </div>
            <Link
              to="/profile"
              className="size-12 rounded-2xl bg-card border border-border flex items-center justify-center text-2xl shadow-card shrink-0"
              aria-label="Profile"
            >
              {avatar}
            </Link>
          </div>

          {/* Quick System Stats Cards */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-card border border-border rounded-3xl p-4 shadow-card">
              <div className="flex items-center gap-2 text-primary">
                <Shield className="size-4" />
                <span className="text-[10px] uppercase font-bold tracking-wider">સુધારા મોડ</span>
              </div>
              <p className="text-xl font-black mt-1 text-foreground font-gu">સક્રિય ✅</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">૨૪/૭ સુરક્ષિત સર્વર</p>
            </div>
            <div className="bg-card border border-border rounded-3xl p-4 shadow-card">
              <div className="flex items-center gap-2 text-success">
                <Users className="size-4" />
                <span className="text-[10px] uppercase font-bold tracking-wider">ધોરણ લક્ષ્યાંક</span>
              </div>
              <p className="text-xl font-black mt-1 text-foreground font-gu">૧ થી ૧૦</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">સમગ્ર ગુજરાત માટે</p>
            </div>
          </div>

          {/* Control Console Link */}
          {user.role === 'super_admin' ? (
            <div className="bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-pink-500/10 border border-purple-500/25 text-purple-900 dark:text-purple-100 rounded-3xl p-5 shadow-sm space-y-3.5 animate-[fade-in_0.4s_ease-out]">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white flex items-center justify-center shrink-0 shadow-float">
                  <Sparkles className="size-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm tracking-wide">મુખ્ય વહીવટી નિયંત્રણ કેન્દ્ર</h3>
                  <p className="text-xs text-purple-700 dark:text-purple-300 font-gu">Super Admin Control Hub</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed font-gu">
                અહીંથી તમે તમામ વિદ્યાર્થીઓને મંજૂર (Approve) કરી શકો છો, સક્રિય પરીક્ષાઓ બદલી શકો છો, જાહેરાતો પ્રકાશિત કરી શકો છો, અને ડેટાબેઝનું બૅકઅપ લઈ શકો છો.
              </p>
              <Link
                to="/super-admin"
                className="w-full h-11 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm active:scale-95"
              >
                <span>સુપર એડમિન પેનલ ખોલો</span>
                <ChevronRight className="size-4" />
              </Link>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-teal-500/15 to-emerald-500/10 border border-teal-500/25 text-teal-900 dark:text-teal-100 rounded-3xl p-5 shadow-sm space-y-3.5 animate-[fade-in_0.4s_ease-out]">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white flex items-center justify-center shrink-0 shadow-float">
                  <Shield className="size-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm tracking-wide">સંચાલક સંચાલન વિભાગ</h3>
                  <p className="text-xs text-teal-700 dark:text-teal-300 font-gu">Administrator Control Unit</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed font-gu">
                અહીંથી તમે લાઈવ પરીક્ષાઓ, વિદ્યાર્થીઓની લિસ્ટ, અને પ્રશ્ન બેંકની સ્થિતિ જોઈ શકો છો.
              </p>
              <Link
                to="/admin"
                className="w-full h-11 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm active:scale-95"
              >
                <span>એડમિનિસ્ટ્રેટર પેનલ ખોલો</span>
                <ChevronRight className="size-4" />
              </Link>
            </div>
          )}

          {/* Quick Shortcuts Grid */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-gu">
              મુખ્ય શોર્ટકટ લિંક્સ
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/profile"
                className="bg-card border border-border rounded-2xl p-4 shadow-card hover:-translate-y-0.5 transition flex flex-col justify-between h-24"
              >
                <div className="size-9 rounded-2xl flex items-center justify-center bg-primary-soft text-primary">
                  <User className="size-4" />
                </div>
                <div>
                  <p className="font-bold text-xs font-gu leading-tight">મારી પ્રોફાઇલ</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Profile Settings</p>
                </div>
              </Link>

              {user.role === 'super_admin' && (
                <Link
                  to="/admin"
                  className="bg-card border border-border rounded-2xl p-4 shadow-card hover:-translate-y-0.5 transition flex flex-col justify-between h-24"
                >
                  <div className="size-9 rounded-2xl flex items-center justify-center bg-teal-500/20 text-teal-600">
                    <Shield className="size-4" />
                  </div>
                  <div>
                    <p className="font-bold text-xs font-gu leading-tight">સ્ટાન્ડર્ડ એડમિન</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Standard Admin Console</p>
                  </div>
                </Link>
              )}
            </div>
          </div>

          {/* Guidelines info */}
          <div className="p-4 bg-muted/60 border border-border rounded-3xl text-xs leading-relaxed text-muted-foreground font-gu space-y-2">
            <p className="font-bold text-foreground">📌 સંચાલક માર્ગદર્શિકા:</p>
            <p>
              આ પ્લેટફોર્મ ગુજરાત બોર્ડના ધોરણ ૧ થી ૧૦ ના તમામ વિદ્યાર્થીઓ માટે ક્વિઝ અને દૈનિક પરીક્ષાઓના સુચારુ સંચાલન માટે બનાવવામાં આવેલું છે.
            </p>
            <p className="text-[10px]">
              As an Administrator, you bypass standard student constraints and hold high-level control over student registrations and testing assets.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell showBell>
      <div className="px-5 pt-2 pb-6 space-y-5">
        {/* Greeting */}
        <div className="flex items-center justify-between animate-[fade-in_0.4s_ease-out]">
          <div className="min-w-0 flex-1 mr-2">
            <p className="text-sm text-muted-foreground font-gu">
              {t("dash_greeting_student", user?.medium)}
            </p>
            <h1 className="text-2xl font-bold truncate flex items-center flex-wrap gap-2">
              <span>{displayName}</span>
              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-warning-soft text-warning-foreground font-black font-mono">
                ⭐ {points?.totalPoints || 0} Pts
              </span>
            </h1>
            <p className="text-xs text-muted-foreground font-gu">
              {user?.medium === "English" 
                ? `Standard ${displayStandard} • ${displaySchool}` 
                : `ધોરણ ${displayStandard} • ${displaySchool}`}
            </p>
          </div>
          <Link
            to="/profile"
            className="size-12 rounded-2xl bg-card border border-border flex items-center justify-center text-2xl shadow-card shrink-0"
            aria-label="Profile"
          >
            {avatar}
          </Link>
        </div>

        {/* PROGRESS HERO */}
        <div className="rounded-3xl gradient-hero text-primary-foreground p-6 shadow-float relative overflow-hidden animate-[scale-in_0.45s_ease-out]">
          <div className="absolute -top-16 -right-12 size-56 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 size-48 rounded-full bg-white/10 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider bg-white/15 rounded-full px-2.5 py-1 font-gu">
                  <Sparkles className="size-3" /> {t("dash_today_progress", user?.medium)}
                </div>
                <p className="mt-2 font-gu text-sm text-white/85">
                  {t("dash_learning_progress", user?.medium)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-5xl font-extrabold leading-none tracking-tight">
                  {revisionProgressPercent}
                  <span className="text-2xl align-top">%</span>
                </p>
              </div>
            </div>

            <div className="mt-4">
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-700"
                  style={{ width: `${revisionProgressPercent}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] text-white/75 font-gu">
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <HeroStat icon={<CheckCircle2 className="size-3.5" />} value={`${examsCompletedToday}/${Math.max(1, totalExamsToday)}`} labelGu={t("dash_exams", user?.medium)} />
              <HeroStat icon={<RotateCcw className="size-3.5" />} value={`${masteredQuestionsVal}/${mistakes.length}`} labelGu={t("dash_revision", user?.medium)} />
              <HeroStat icon={<Flame className="size-3.5" />} value={`${streakVal}`} labelGu={t("dash_streak", user?.medium)} />
            </div>
          </div>
        </div>

        {/* RANKINGS & MOVEMENT CARD */}
        {leaderboardPos && (
          <Link
            to="/leaderboard"
            className="block rounded-3xl bg-card border border-border p-5 shadow-card relative overflow-hidden active:scale-[0.99] transition animate-[scale-in_0.4s_ease-out]"
          >
            <div className="absolute -top-6 -right-6 size-24 rounded-full bg-primary/10 blur-xl" />
            <div className="flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-primary-soft text-primary flex items-center justify-center font-bold text-lg shadow-card">
                  🏆
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    {t("dash_leaderboard_title", user?.medium)}
                  </p>
                  <p className="font-extrabold text-base flex items-center gap-1.5 mt-0.5">
                    <span>{t("dash_rank_prefix", user?.medium)} #{leaderboardPos.rank}</span>
                    <span className="text-[10px] py-0.5 px-1.5 bg-muted rounded-md text-muted-foreground">{t("dash_all_time", user?.medium)}</span>
                  </p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end shrink-0">
                <div className="flex items-center gap-1">
                  {leaderboardPos.rankChange && leaderboardPos.rankChange.startsWith("+") && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {t("dash_rank_up", user?.medium)} ({leaderboardPos.rankChange})
                    </span>
                  )}
                  {leaderboardPos.rankChange && leaderboardPos.rankChange.startsWith("-") && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                      {t("dash_rank_down", user?.medium)} ({leaderboardPos.rankChange})
                    </span>
                  )}
                  {(!leaderboardPos.rankChange || leaderboardPos.rankChange === "flat") && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      {t("dash_rank_flat", user?.medium)}
                    </span>
                  )}
                </div>
                <span className="text-[9px] text-muted-foreground font-medium mt-1">
                  {t("dash_prev_rank", user?.medium)}: #{leaderboardPos.previousRank || leaderboardPos.rank}
                </span>
              </div>
            </div>
          </Link>
        )}

        {/* TODAY'S EXAM */}
        {activeExam ? (
          <Link
            to="/exam-today"
            className="block rounded-3xl bg-card border border-border p-5 shadow-card relative overflow-hidden active:scale-[0.99] transition animate-[slide-up_0.4s_ease-out]"
          >
            <div className="absolute top-0 right-0 size-28 bg-primary/10 rounded-full blur-2xl" />
            <div className="relative">
              {(() => {
                const examStartTime = activeExam.startAt ? new Date(activeExam.startAt) : null;
                const isUpcoming = examStartTime ? currentTime < examStartTime : false;
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-primary font-semibold font-gu">
                        <FileText className="size-3.5" /> {isUpcoming ? t("dash_scheduled_exam", user?.medium) : t("dash_today_exam_title", user?.medium)}
                      </div>
                      {isUpcoming && (
                        <span className="px-2 py-0.5 text-[8px] bg-amber-500 text-white rounded-full font-bold uppercase animate-pulse">
                          Upcoming
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 text-xl font-bold font-gu leading-tight">
                      {activeExamSubjectName || activeExam.subjectId}
                    </h2>
                    <p className="text-sm text-muted-foreground font-gu mt-0.5">
                      {activeExamChapterName || activeExam.chapterId}
                    </p>

                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 bg-muted rounded-full px-2.5 py-1 font-gu">
                        <Calendar className="size-3" /> {activeExam.examDate}
                      </span>
                      <span className="inline-flex items-center gap-1.5 bg-muted rounded-full px-2.5 py-1 font-gu">
                        <Clock className="size-3" /> {activeExam.duration} min
                      </span>
                    </div>

                    {isUpcoming ? (
                      <div className="mt-4 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold font-gu text-xs flex items-center justify-center gap-2 shadow-sm animate-pulse">
                        {t("dash_start_time_left", user?.medium)} {(() => {
                          const diff = examStartTime!.getTime() - currentTime.getTime();
                          if (diff <= 0) return t("exam_start", user?.medium);
                          const h = Math.floor(diff / (1000 * 60 * 60));
                          const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                          const s = Math.floor((diff % (1000 * 60)) / 1000);
                          const parts = [];
                          if (h > 0) parts.push(`${h} ${t("dash_hours", user?.medium)}`);
                          if (m > 0 || h > 0) parts.push(`${m} ${t("dash_minutes", user?.medium)}`);
                          parts.push(`${s} ${t("dash_seconds", user?.medium)}`);
                          return parts.join(" ");
                        })()}
                      </div>
                    ) : (
                      <div className="mt-4 h-11 rounded-2xl gradient-primary text-primary-foreground font-semibold font-gu text-sm flex items-center justify-center gap-2 shadow-float">
                        {t("dash_start_exam_now", user?.medium)} <ArrowRight className="size-4" />
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </Link>
        ) : (
          <div className="rounded-3xl bg-card border border-border p-6 shadow-card text-center relative overflow-hidden animate-[slide-up_0.4s_ease-out]">
            <p className="text-sm text-muted-foreground font-gu">
              {t("dash_no_exam_today", user?.medium)}
            </p>
          </div>
        )}

        {/* ABHYAS - SMART SELF LEARNING ENGINE */}
        <Link
          to="/abhyas"
          className="block rounded-3xl bg-gradient-to-br from-indigo-500 via-primary to-purple-600 p-5 text-white shadow-float relative overflow-hidden active:scale-[0.99] transition animate-[slide-up_0.4s_ease-out]"
        >
          <div className="absolute top-0 right-0 size-28 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-10 size-24 bg-white/5 rounded-full blur-xl" />
          <div className="relative flex items-start gap-4">
            <div className="size-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 border border-white/20">
              <BookOpen className="size-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[9px] uppercase tracking-wider bg-white/25 px-2.5 py-0.5 rounded-full font-bold text-white/95">
                અભ્યાસ • NEW STUDY MODULE
              </span>
              <h2 className="mt-1.5 text-lg font-black font-gu leading-tight text-white">
                અભ્યાસ મટીરીયલ (Abhyas Module)
              </h2>
              <p className="text-xs text-white/90 font-gu mt-1 leading-relaxed">
                અહીં બુકનો ટૂંકો સારાંશ (Summary) વાંચો, સૂરિલા અવાજમાં સાંભળો (TTS Engine) અને પ્રશ્નોની પ્રેક્ટિસ કરીને જ્ઞાન મેળવો!
              </p>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold bg-white text-primary px-3.5 py-1.5 rounded-xl shadow-sm active:scale-95 transition">
                🚀 ભણવાનું શરૂ કરો (Start Learn)
              </div>
            </div>
          </div>
        </Link>

        {/* WEEKLY CHALLENGE */}
        <div className="rounded-3xl bg-card border border-border p-5 shadow-card relative overflow-hidden animate-[slide-up_0.45s_ease-out]">
          <div className="absolute -top-10 -right-10 size-32 rounded-full bg-warning/20 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-xl bg-warning/20 text-warning-foreground flex items-center justify-center">
                  <Target className="size-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-warning-foreground font-semibold font-gu">
                    {t("dash_weekly_challenge", user?.medium)}
                  </p>
                  <p className="font-semibold font-gu text-sm leading-tight">
                    {user?.medium === "English" ? weeklyChallenge.title : weeklyChallenge.titleGu}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-gu bg-warning/15 text-warning-foreground px-2 py-1 rounded-full shrink-0">
                {weeklyChallenge.daysLeft} {t("dash_days_left", user?.medium)}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full gradient-primary rounded-full transition-all duration-700"
                  style={{ width: `${Math.round((examsCompletedToday / weeklyChallenge.total) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-semibold tabular-nums">
                {examsCompletedToday}/{weeklyChallenge.total}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground font-gu flex items-center gap-1">
              <Award className="size-3 text-success" /> {user?.medium === "English" ? weeklyChallenge.reward : weeklyChallenge.rewardGu}
            </p>
          </div>
        </div>

        {/* REVISION PRIORITY */}
        <Link
          to="/revision"
          className="block rounded-3xl bg-card border-2 border-warning/40 p-4 shadow-card relative overflow-hidden active:scale-[0.99] transition"
        >
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-warning/20 flex items-center justify-center animate-[pulse-soft_2s_ease-in-out_infinite]">
              <RotateCcw className="size-6 text-warning-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-warning-foreground font-semibold">Priority</p>
              <p className="font-semibold font-gu text-sm leading-tight">
                {t("rev_box_title", user?.medium)}
              </p>
              <p className="text-xs text-muted-foreground font-gu mt-0.5">
                <span className="font-bold text-foreground">
                  {pendingQuestionsVal} {user?.medium === "English" ? "Questions" : "પ્રશ્નો"}
                </span> {user?.medium === "English" ? "pending" : "બાકી"}
              </p>
            </div>
            <ChevronRight className="size-5 text-muted-foreground" />
          </div>
        </Link>

        {/* Motivational quote */}
        <MotivationalQuote />

        {/* Quick Actions */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider font-gu">
            {t("dash_quick_action_title", user?.medium)}
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {cards.map((c, i) => {
              const Icon = c.icon;
              return (
                <Link
                  key={c.to}
                  to={c.to}
                  className="bg-card border border-border rounded-3xl p-3 shadow-card hover:-translate-y-0.5 transition animate-[slide-up_0.4s_ease-out]"
                  style={{ animationDelay: `${i * 40}ms`, animationFillMode: "backwards" }}
                >
                  <div className={`size-9 rounded-2xl flex items-center justify-center ${colorMap[c.color]}`}>
                    <Icon className="size-4" />
                  </div>
                  <p className="mt-2 font-semibold text-[11px] font-gu leading-tight">
                    {t(c.labelKey, user?.medium)}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>

        {/* PARENT / MONTHLY SUMMARY */}
        <div className="rounded-3xl bg-card border border-border p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <div className="size-9 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
              <Users className="size-4" />
            </div>
            <div>
              <p className="font-semibold font-gu">
                {user?.medium === "English" ? "Monthly Progress" : "માસિક પ્રગતિ"}
              </p>
              <p className="text-[11px] text-muted-foreground">Monthly summary</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SummaryStat labelGu={t("dash_exams", user?.medium)} value={totalExamsVal} />
            <SummaryStat labelGu={t("result_percentage", user?.medium)} value={`${avgPercentageVal}%`} />
            <SummaryStat labelGu={t("dash_prev_rank", user?.medium)} value={leaderboardPos ? `#${leaderboardPos.rank}` : "#1"} />
            <SummaryStat labelGu={t("dash_revision", user?.medium)} value={masteredQuestionsVal} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function HeroStat({ icon, value, labelGu }: { icon: React.ReactNode; value: string; labelGu: string }) {
  return (
    <div className="rounded-2xl bg-white/10 backdrop-blur px-2 py-2.5 text-center">
      <div className="flex items-center justify-center gap-1 text-white/85">{icon}</div>
      <p className="mt-0.5 text-base font-bold leading-none">{value}</p>
      <p className="text-[10px] text-white/80 font-gu mt-1">{labelGu}</p>
    </div>
  );
}

function SummaryStat({ labelGu, value }: { labelGu: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-muted/50 p-3">
      <p className="text-xl font-bold leading-none">{value}</p>
      <p className="text-[11px] text-muted-foreground font-gu mt-1">{labelGu}</p>
    </div>
  );
}
