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
import { ExamRepository, ResultRepository, MistakeRepository, AnalyticsRepository, PointsRepository } from "@/lib/db";
import { DailyExam, ExamResult, StudentMistake, RevisionAnalytics, StudentPoints } from "@/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Daily Learning Exam" }] }),
  component: Dashboard,
});

const cards = [
  { to: "/result", label: "પરિણામ", icon: Trophy, color: "success" },
  { to: "/mistakes", label: "મારી ભૂલો", icon: AlertTriangle, color: "destructive" },
  { to: "/achievements", label: "સિદ્ધિઓ", icon: Award, color: "primary" },
  { to: "/progress", label: "પ્રગતિ", icon: TrendingUp, color: "success" },
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
  const [results, setResults] = useState<ExamResult[]>([]);
  const [mistakes, setMistakes] = useState<StudentMistake[]>([]);
  const [analytics, setAnalytics] = useState<RevisionAnalytics | null>(null);
  const [points, setPoints] = useState<StudentPoints | null>(null);
  const [leaderboardPos, setLeaderboardPos] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

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
        const activeExamsList = await ExamRepository.getActiveExams(user.standard || "10");
        if (!active) return;
        if (activeExamsList.length > 0) {
          setActiveExam(activeExamsList[0]);
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

  const streakVal = user?.streak || student.streak || 12;

  // Daily statistics computation
  const todayDateStr = new Date().toISOString().split('T')[0];
  const examsCompletedToday = results.filter((r) => r.submittedAt && r.submittedAt.startsWith(todayDateStr)).length;
  const totalExamsToday = activeExam ? 1 : 0;

  // Revision progress calculations
  const totalQuestionsSum = masteredQuestionsVal + pendingQuestionsVal;
  const revisionProgressPercent = totalQuestionsSum > 0
    ? Math.round((masteredQuestionsVal / totalQuestionsSum) * 100)
    : 100;

  return (
    <AppShell showBell>
      <div className="px-5 pt-2 pb-6 space-y-5">
        {/* Greeting */}
        <div className="flex items-center justify-between animate-[fade-in_0.4s_ease-out]">
          <div className="min-w-0 flex-1 mr-2">
            <p className="text-sm text-muted-foreground font-gu">નમસ્તે, વિદ્યાર્થી 👋</p>
            <h1 className="text-2xl font-bold truncate flex items-center flex-wrap gap-2">
              <span>{displayName}</span>
              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-warning-soft text-warning-foreground font-black font-mono">
                ⭐ {points?.totalPoints || 0} Pts
              </span>
            </h1>
            <p className="text-xs text-muted-foreground font-gu">
              ધોરણ {displayStandard} • {displaySchool}
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

        {/* Admin control panel card */}
        {(user?.role === 'admin' || user?.role === 'super_admin') && (
          <div className="bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-500/20 text-teal-900 dark:text-teal-100 rounded-3xl p-4 shadow-sm flex items-center justify-between gap-3 animate-[fade-in_0.4s_ease-out]">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <Shield className="size-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm tracking-wide">ADMINISTRATOR PANEL</h3>
                <p className="text-[11px] text-muted-foreground font-gu">સંચાલક સંચાલન પેનલ ખોલો</p>
              </div>
            </div>
            <Link
              to="/admin"
              className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition shadow-sm active:scale-95"
            >
              <span>Manage</span>
              <ChevronRight className="size-4" />
            </Link>
          </div>
        )}

        {/* Super Admin control panel card */}
        {user?.role === 'super_admin' && (
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 text-purple-900 dark:text-purple-100 rounded-3xl p-4 shadow-sm flex items-center justify-between gap-3 animate-[fade-in_0.4s_ease-out]">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 animate-pulse">
                <Sparkles className="size-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm tracking-wide">SUPER ADMIN CONTROL</h3>
                <p className="text-[11px] text-muted-foreground font-gu">મુખ્ય વહીવટી નિયંત્રણ કેન્દ્ર ખોલો</p>
              </div>
            </div>
            <Link
              to="/super-admin"
              className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition shadow-sm active:scale-95"
            >
              <span>Control</span>
              <ChevronRight className="size-4" />
            </Link>
          </div>
        )}

        {/* PROGRESS HERO */}
        <div className="rounded-3xl gradient-hero text-primary-foreground p-6 shadow-float relative overflow-hidden animate-[scale-in_0.45s_ease-out]">
          <div className="absolute -top-16 -right-12 size-56 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 size-48 rounded-full bg-white/10 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider bg-white/15 rounded-full px-2.5 py-1 font-gu">
                  <Sparkles className="size-3" /> આજની પ્રગતિ
                </div>
                <p className="mt-2 font-gu text-sm text-white/85">Today's learning progress</p>
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
              <HeroStat icon={<CheckCircle2 className="size-3.5" />} value={`${examsCompletedToday}/${Math.max(1, totalExamsToday)}`} labelGu="પરીક્ષા" />
              <HeroStat icon={<RotateCcw className="size-3.5" />} value={`${masteredQuestionsVal}/${mistakes.length}`} labelGu="પુનરાવર્તન" />
              <HeroStat icon={<Flame className="size-3.5" />} value={`${streakVal}`} labelGu="સ્ટ્રીક" />
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
                    તમારો રેન્ક (Leaderboard Position)
                  </p>
                  <p className="font-extrabold text-base flex items-center gap-1.5 mt-0.5">
                    <span>ક્રમ #{leaderboardPos.rank}</span>
                    <span className="text-[10px] py-0.5 px-1.5 bg-muted rounded-md text-muted-foreground">All-Time</span>
                  </p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end shrink-0">
                <div className="flex items-center gap-1">
                  {leaderboardPos.rankChange && leaderboardPos.rankChange.startsWith("+") && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      ▲ સુધારો ({leaderboardPos.rankChange})
                    </span>
                  )}
                  {leaderboardPos.rankChange && leaderboardPos.rankChange.startsWith("-") && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                      ▼ ઘટાડો ({leaderboardPos.rankChange})
                    </span>
                  )}
                  {(!leaderboardPos.rankChange || leaderboardPos.rankChange === "flat") && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      ● સમકક્ષ
                    </span>
                  )}
                </div>
                <span className="text-[9px] text-muted-foreground font-medium mt-1">
                  અગાઉનો ક્રમ: #{leaderboardPos.previousRank || leaderboardPos.rank}
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
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-primary font-semibold font-gu">
                <FileText className="size-3.5" /> આજની પરીક્ષા
              </div>
              <h2 className="mt-2 text-xl font-bold font-gu leading-tight">
                {activeExam.subjectId === "sub1" ? "વિજ્ઞાન" : activeExam.subjectId === "sub2" ? "ગણિત" : "સામાજિક વિજ્ઞાન"}
              </h2>
              <p className="text-sm text-muted-foreground font-gu mt-0.5">
                {activeExam.chapterId === "ch1" ? "પ્રકરણ ૬ — જીવન પ્રક્રિયાઓ" : "પ્રકરણ ૧ — વાસ્તવિક સંખ્યાઓ"}
              </p>

              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 bg-muted rounded-full px-2.5 py-1 font-gu">
                  <Calendar className="size-3" /> {activeExam.examDate}
                </span>
                <span className="inline-flex items-center gap-1.5 bg-muted rounded-full px-2.5 py-1 font-gu">
                  <Clock className="size-3" /> {activeExam.duration} min
                </span>
              </div>

              <div className="mt-4 h-11 rounded-2xl gradient-primary text-primary-foreground font-semibold font-gu text-sm flex items-center justify-center gap-2 shadow-float">
                પરીક્ષા શરૂ કરો <ArrowRight className="size-4" />
              </div>
            </div>
          </Link>
        ) : (
          <div className="rounded-3xl bg-card border border-border p-6 shadow-card text-center relative overflow-hidden animate-[slide-up_0.4s_ease-out]">
            <p className="text-sm text-muted-foreground font-gu">આજે કોઈ પરીક્ષા ઉપલબ્ધ નથી</p>
          </div>
        )}

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
                    આ અઠવાડિયાનો ચેલેન્જ
                  </p>
                  <p className="font-semibold font-gu text-sm leading-tight">{weeklyChallenge.titleGu}</p>
                </div>
              </div>
              <span className="text-[10px] font-gu bg-warning/15 text-warning-foreground px-2 py-1 rounded-full shrink-0">
                {weeklyChallenge.daysLeft} દિવસ બાકી
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
              <Award className="size-3 text-success" /> {weeklyChallenge.rewardGu}
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
              <p className="font-semibold font-gu text-sm leading-tight">આજે પુનરાવર્તન બાકી</p>
              <p className="text-xs text-muted-foreground font-gu mt-0.5">
                <span className="font-bold text-foreground">{pendingQuestionsVal} પ્રશ્નો</span> બાકી
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
            ઝડપી મેનુ
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
                  <p className="mt-2 font-semibold text-[11px] font-gu leading-tight">{c.label}</p>
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
              <p className="font-semibold font-gu">માસિક પ્રગતિ</p>
              <p className="text-[11px] text-muted-foreground">Monthly summary</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SummaryStat labelGu="કુલ પરીક્ષા" value={totalExamsVal} />
            <SummaryStat labelGu="સરેરાશ %" value={`${avgPercentageVal}%`} />
            <SummaryStat labelGu="હાલનો ક્રમ" value={`#${student.rank}`} />
            <SummaryStat labelGu="પુનરાવર્તન" value={masteredQuestionsVal} />
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
