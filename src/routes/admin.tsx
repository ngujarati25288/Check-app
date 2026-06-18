import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useRef } from "react";
import { 
  ShieldAlert, 
  Loader2, 
  LayoutDashboard, 
  BookOpen, 
  FolderLock, 
  HelpCircle, 
  FileSpreadsheet, 
  CalendarClock, 
  UsersRound, 
  FileCheck, 
  BellRing, 
  History, 
  Database, 
  Plus, 
  Edit3, 
  Trash2, 
  Sparkles, 
  Upload, 
  Download, 
  Search, 
  Filter, 
  Ban, 
  CheckCircle2, 
  AlertTriangle, 
  Share2, 
  UserX, 
  TrendingUp, 
  Layers,
  ChevronRight,
  Info,
  LineChart as LineChartIcon,
  HelpCircle as HelpIcon,
  Calendar,
  Send,
  Sliders,
  UserCheck,
  ChevronDown,
  Copy,
  Check
} from "lucide-react";
import { useAuth } from "@/components/FirebaseProvider";
import { isFirebasePlaceholder } from "@/lib/firebase";
import { AdminRepository, AnalyticsRepository } from "@/lib/db";
import { 
  DBUser, 
  Subject, 
  Chapter, 
  Question, 
  DailyExam, 
  ExamResult, 
  AdminAuditLog, 
  NotificationHistoryItem,
  StudentAnalytics,
  SubjectAnalytics,
  ChapterAnalytics,
  QuestionAnalytics,
  SchoolAnalytics,
  VillageAnalytics,
  StandardAnalytics,
  LearningTrends,
  AnalyticsReport
} from "@/types";
import { toast } from "sonner";
import { AdvancedAnalyticsDashboard } from "@/components/AdvancedAnalyticsDashboard";
import { QuestionBankManager } from "@/components/QuestionBankManager";
import { ExamSchedulerManager } from "@/components/ExamSchedulerManager";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  LineChart, 
  Line, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Administrator Panel - Daily Exam" }] }),
  component: AdminPanel,
});

type AdminTab = 
  | "questions" 
  | "exams";

function AdminPanel() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Navigation / Tabs State
  const [activeTab, setActiveTab] = useState<AdminTab>("questions");

  // Core Data States
  const [students, setStudents] = useState<DBUser[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [exams, setExams] = useState<DailyExam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [notifHistory, setNotifHistory] = useState<NotificationHistoryItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Advanced Analytics States
  const [studentAnalytics, setStudentAnalytics] = useState<StudentAnalytics[]>([]);
  const [subjectAnalytics, setSubjectAnalytics] = useState<SubjectAnalytics[]>([]);
  const [chapterAnalytics, setChapterAnalytics] = useState<ChapterAnalytics[]>([]);
  const [questionAnalytics, setQuestionAnalytics] = useState<QuestionAnalytics[]>([]);
  const [schoolAnalytics, setSchoolAnalytics] = useState<SchoolAnalytics[]>([]);
  const [villageAnalytics, setVillageAnalytics] = useState<VillageAnalytics[]>([]);
  const [standardAnalytics, setStandardAnalytics] = useState<StandardAnalytics[]>([]);
  const [learningTrends, setLearningTrends] = useState<LearningTrends | null>(null);
  const [analyticsReports, setAnalyticsReports] = useState<AnalyticsReport[]>([]);

  // Form states
  const [questionMenuOpen, setQuestionMenuOpen] = useState(true);

  const [subName, setSubName] = useState("");
  const [subDesc, setSubDesc] = useState("");
  const [subActive, setSubActive] = useState<boolean>(true);
  const [subStd, setSubStd] = useState("10");
  const [editingSub, setEditingSub] = useState<Subject | null>(null);

  const [chapName, setChapName] = useState("");
  const [chapSubId, setChapSubId] = useState("");
  const [chapNo, setChapNo] = useState<number>(1);
  const [chapDesc, setChapDesc] = useState("");
  const [chapActive, setChapActive] = useState<boolean>(true);
  const [chapStd, setChapStd] = useState("10");
  const [editingChap, setEditingChap] = useState<Chapter | null>(null);

  const [questText, setQuestText] = useState("");
  const [questTopic, setQuestTopic] = useState("");
  const [questA, setQuestA] = useState("");
  const [questB, setQuestB] = useState("");
  const [questC, setQuestC] = useState("");
  const [questD, setQuestD] = useState("");
  const [questCorrect, setQuestCorrect] = useState("A");
  const [questExplanation, setQuestExplanation] = useState("");
  const [questDifficulty, setQuestDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [questSubId, setQuestSubId] = useState("");
  const [questChapId, setQuestChapId] = useState("");
  const [editingQuest, setEditingQuest] = useState<Question | null>(null);

  const [examSubId, setExamSubId] = useState("");
  const [examChapId, setExamChapId] = useState("");
  const [examDate, setExamDate] = useState("");
  const [examDuration, setExamDuration] = useState(15);
  const [examQuestionsCount, setExamQuestionsCount] = useState(10);
  const [examinerName, setExaminerName] = useState("");
  const [examStatus, setExamStatus] = useState<"scheduled" | "active" | "closed" | "published" | "archived" | "cancelled">("scheduled");
  const [editingExam, setEditingExam] = useState<DailyExam | null>(null);

  const [notifTargetStd, setNotifTargetStd] = useState("all");
  const [notifType, setNotifType] = useState("exam");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");

  // Filters and Searches
  const [questSearch, setQuestSearch] = useState("");
  const [questFilterStd, setQuestFilterStd] = useState("all");
  const [questFilterSub, setQuestFilterSub] = useState("all");
  const [questFilterChap, setQuestFilterChap] = useState("all");
  const [questFilterDiff, setQuestFilterDiff] = useState("all");
  const [questFilterType, setQuestFilterType] = useState("all");

  const [subSearch, setSubSearch] = useState("");
  const [subFilterStd, setSubFilterStd] = useState("all");

  const [chapSearch, setChapSearch] = useState("");
  const [chapFilterSub, setChapFilterSub] = useState("all");
  const [chapFilterStd, setChapFilterStd] = useState("all");

  // Pagination for Questions
  const [questPage, setQuestPage] = useState(1);
  const [questPerPage, setQuestPerPage] = useState(10);

  // New Question Creation Fields
  const [questType, setQuestType] = useState<"MCQ" | "TrueFalse" | "FillBlank" | "MatchFollowing" | "ShortAnswer" | "LongAnswer">("MCQ");
  const [questMarks, setQuestMarks] = useState<number>(1);
  const [questActive, setQuestActive] = useState<boolean>(true);

  const [studentSearch, setStudentSearch] = useState("");
  const [studentFilterStd, setStudentFilterStd] = useState("all");

  const [resultSearch, setResultSearch] = useState("");
  const [resultFilterSub, setResultFilterSub] = useState("all");

  // CSV bulk report state
  const [importReport, setImportReport] = useState<{
    totalRead: number;
    importedCount: number;
    errors: string[];
    duplicates: string[];
  } | null>(null);
  const [showCSVHelp, setShowCSVHelp] = useState(false);

  const isAuthorized = user?.role === "admin" || user?.role === "super_admin" || user?.role === "teacher";

  const loadAllData = async () => {
    if (!isAuthorized) return;
    try {
      setDataLoading(true);
      // Trigger Educational Analytics Cloud Sync Simulation to recalculate aggregated metrics
      await AnalyticsRepository.runAnalyticsEngineCloudSync();

      const [
        stdList,
        subList,
        chapList,
        questList,
        examList,
        resList,
        logsList,
        notifList,
        // New analytics lists
        studAnList,
        subjAnList,
        chapAnList,
        questAnList,
        schAnList,
        vilAnList,
        stdAnList,
        trendAn,
        rptsAn
      ] = await Promise.all([
        AdminRepository.getAllStudents(),
        AdminRepository.getAllSubjects(),
        AdminRepository.getAllChapters(),
        AdminRepository.getAllQuestions(user?.role, user?.uid),
        AdminRepository.getAllExams(user?.role, user?.uid),
        AdminRepository.getAllResults(),
        AdminRepository.getAuditLogs(),
        AdminRepository.getAllNotificationsHistory(),
        // Get analytics
        AnalyticsRepository.getAllStudentAnalytics(),
        AnalyticsRepository.getAllSubjectAnalytics(),
        AnalyticsRepository.getAllChapterAnalytics(),
        AnalyticsRepository.getAllQuestionAnalytics(),
        AnalyticsRepository.getSchoolAnalytics(),
        AnalyticsRepository.getVillageAnalytics(),
        AnalyticsRepository.getAllStandardAnalytics(),
        AnalyticsRepository.getLearningTrends(),
        AnalyticsRepository.getAnalyticsReports()
      ]);

      // Automatically derive unique subjects and chapters from our single source of truth: Questions!
      const derivedSubsMap: Record<string, Subject> = {};
      const derivedChapsMap: Record<string, Chapter> = {};

      const existingSubsMap: Record<string, Subject> = {};
      (subList || []).forEach(s => {
        existingSubsMap[s.subjectId] = s;
      });

      const existingChapsMap: Record<string, Chapter> = {};
      (chapList || []).forEach(c => {
        existingChapsMap[c.chapterId] = c;
      });

      // Dynamic lookup fallback helpers for old data compatibility
      const subjectFallbackName = (id: string) => {
        if (id === "sub1") return "Science";
        if (id === "sub2") return "Mathematics";
        if (id === "sub3") return "Social Science";
        return id;
      };

      const chapterFallbackName = (id: string) => {
        if (id === "ch1") return "Chemical Reactions";
        if (id === "ch2") return "Life Processes";
        if (id === "ch3") return "Quadratic Equations";
        return id;
      };

      questList.forEach(q => {
        const rawSubId = q.subjectId || "sub1";
        const rawChapId = q.chapterId || "ch1";

        // Keep database stored IDs exactly as they are to prevent coordination mismatches
        const subId = rawSubId;
        const chapId = rawChapId;

        let subName = existingSubsMap[subId]?.subjectName;
        if (!subName) {
          subName = subjectFallbackName(rawSubId);
        }

        let chapName = existingChapsMap[chapId]?.chapterName;
        if (!chapName) {
          chapName = chapterFallbackName(rawChapId);
        }

        const stdRaw = q.standard || existingSubsMap[subId]?.standard || "10";
        // Clean standard
        let std = "10";
        if (stdRaw) {
          const numMatches = stdRaw.match(/\d+/);
          std = numMatches ? numMatches[0] : stdRaw.trim();
        }

        // Keep questions perfectly mapped to exact database IDs
        q.standard = std;
        q.subjectId = subId;
        q.chapterId = chapId;

        if (!derivedSubsMap[subId]) {
          derivedSubsMap[subId] = {
            subjectId: subId,
            subjectName: subName,
            standard: std,
            status: "active" as const,
            createdAt: q.createdAt || new Date().toISOString()
          };
        }

        if (!derivedChapsMap[chapId]) {
          derivedChapsMap[chapId] = {
            chapterId: chapId,
            subjectId: subId,
            chapterName: chapName,
            standard: std,
            status: "active" as const
          };
        }
      });

      // Include academic subjects/chapters from the database even if they have 0 questions currently
      (subList || []).forEach(s => {
        if (!derivedSubsMap[s.subjectId]) {
          derivedSubsMap[s.subjectId] = s;
        }
      });
      (chapList || []).forEach(c => {
        if (!derivedChapsMap[c.chapterId]) {
          derivedChapsMap[c.chapterId] = c;
        }
      });

      // Keep static defaults for empty database situation so experience isn't blank
      if (isFirebasePlaceholder && Object.keys(derivedSubsMap).length === 0) {
        const defaultSubs = [
          { subjectId: "sub1", subjectName: "Science", standard: "10", status: "active" as const, createdAt: new Date().toISOString() },
          { subjectId: "sub2", subjectName: "Mathematics", standard: "10", status: "active" as const, createdAt: new Date().toISOString() },
          { subjectId: "sub3", subjectName: "Social Science", standard: "10", status: "active" as const, createdAt: new Date().toISOString() }
        ];
        defaultSubs.forEach(s => { derivedSubsMap[s.subjectId] = s; });

        const defaultChaps = [
          { chapterId: "ch1", subjectId: "sub1", chapterName: "Chemical Reactions", standard: "10", status: "active" as const },
          { chapterId: "ch2", subjectId: "sub1", chapterName: "Life Processes", standard: "10", status: "active" as const },
          { chapterId: "ch3", subjectId: "sub2", chapterName: "Quadratic Equations", standard: "10", status: "active" as const }
        ];
        defaultChaps.forEach(c => { derivedChapsMap[c.chapterId] = c; });
      }

      const finalSubjects = Object.values(derivedSubsMap);
      const finalChapters = Object.values(derivedChapsMap);

      setStudents(stdList);
      setSubjects(finalSubjects);
      setChapters(finalChapters);
      setQuestions(questList);
      setExams(examList);
      setResults(resList);
      setAuditLogs(logsList);
      setNotifHistory(notifList);

      // Save analytics states
      setStudentAnalytics(studAnList);
      setSubjectAnalytics(subjAnList);
      setChapterAnalytics(chapAnList);
      setQuestionAnalytics(questAnList);
      setSchoolAnalytics(schAnList);
      setVillageAnalytics(vilAnList);
      setStandardAnalytics(stdAnList);
      setLearningTrends(trendAn);
      setAnalyticsReports(rptsAn);

      // Auto-set initial select ids
      if (finalSubjects.length > 0) {
        setChapSubId(finalSubjects[0].subjectId);
        setQuestSubId(finalSubjects[0].subjectId);
        setExamSubId(finalSubjects[0].subjectId);
      }
      if (finalChapters.length > 0) {
        setQuestChapId(finalChapters[0].chapterId);
        setExamChapId(finalChapters[0].chapterId);
      }
    } catch (e) {
      console.error(e);
      toast.error("Error uploading latest files. Some records might be unavailable.");
    } finally {
      setDataLoading(false);
    }
  };

  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    if (!authLoading) {
      if (!user?.uid) {
        navigate({ to: "/login" });
      } else if (!isAuthorized) {
        toast.error("અવરોધિત એક્સેસ: તમારી પાસે એડમિન સત્તા નથી. Redirecting to dashboard...");
        navigate({ to: "/dashboard" });
      } else {
        if (!dataLoaded) {
          const timeoutId = setTimeout(() => {
            if (active && dataLoading) {
              setDataLoading(false);
              console.warn("Admin panel loading timed out after 8s");
            }
          }, 8000);

          const runLoad = async () => {
            try {
              await loadAllData();
              if (active) setDataLoaded(true);
            } catch (err) {
              console.error("Admin loadAllData failed:", err);
            } finally {
              clearTimeout(timeoutId);
            }
          };
          runLoad();
        }
      }
    }
    return () => {
      active = false;
    };
  }, [user?.uid, user?.role, authLoading, isAuthorized, dataLoaded]);

  // Dynamic filter lists
  const filteredChaptersForSelectedSubject = useMemo(() => {
    return chapters.filter(c => c.subjectId === questSubId);
  }, [chapters, questSubId]);

  const filteredChaptersForExamSubject = useMemo(() => {
    return chapters.filter(c => c.subjectId === examSubId);
  }, [chapters, examSubId]);

  // Synchronize chapter updates when form subject changes
  useEffect(() => {
    if (filteredChaptersForSelectedSubject.length > 0) {
      setQuestChapId(filteredChaptersForSelectedSubject[0].chapterId);
    }
  }, [filteredChaptersForSelectedSubject]);

  useEffect(() => {
    if (filteredChaptersForExamSubject.length > 0) {
      setExamChapId(filteredChaptersForExamSubject[0].chapterId);
    }
  }, [filteredChaptersForExamSubject]);

  useEffect(() => {
    setQuestPage(1);
  }, [questSearch, questFilterStd, questFilterSub, questFilterChap, questFilterDiff]);

  // Compute stats metrics
  const stats = useMemo(() => {
    const totalStudents = students.length;
    const activeExamsToday = exams.filter(e => e.status === "active").length;
    const pendingRevs = results.reduce((acc, r) => acc + (r.totalQuestions - r.correctAnswers), 0);
    const avgPerf = results.length > 0 
      ? Math.round(results.reduce((acc, r) => acc + r.percentage, 0) / results.length) 
      : 0;

    // Determine difficult subjects
    const subjectWrongMap: Record<string, number> = {};
    results.forEach(r => {
      subjectWrongMap[r.subject] = (subjectWrongMap[r.subject] || 0) + r.wrongAnswers;
    });
    let mostDifficultSubject = "N/A";
    let maxWr = -1;
    Object.entries(subjectWrongMap).forEach(([sub, wr]) => {
      if (wr > maxWr) {
        maxWr = wr;
        mostDifficultSubject = sub;
      }
    });

    const activeUserCount = students.filter(s => s.status === "approved").length;

    return {
      totalStudents,
      activeExamsToday,
      pendingRevs,
      totalExamsConducted: exams.length,
      avgPerf,
      notificationsSent: notifHistory.length,
      activeUserCount,
      mostDifficultSubject
    };
  }, [students, exams, results, notifHistory]);

  const chartData = useMemo(() => {
    // Generate recent 7 days stats
    const map: Record<string, { Date: string, Average: number, Completed: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dStr = date.toISOString().split('T')[0];
      map[dStr] = { Date: dStr.substring(5), Average: 0, Completed: 0 };
    }

    results.forEach(r => {
      const d = r.examDate || (r.submittedAt ? r.submittedAt.split('T')[0] : "");
      if (map[d]) {
        map[d].Completed += 1;
        map[d].Average = Math.round((map[d].Average + r.percentage) / (map[d].Completed === 1 ? 1 : 2));
      }
    });

    return Object.values(map);
  }, [results]);

  // Questions filtered list
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const subjectObj = subjects.find(s => s.subjectId === q.subjectId);
      const matchesSearch = questSearch ? q.question.toLowerCase().includes(questSearch.toLowerCase()) : true;
      const matchesStd = questFilterStd === "all" ? true : (q.standard === questFilterStd || (subjectObj && subjectObj.standard === questFilterStd));
      const matchesSub = questFilterSub === "all" ? true : q.subjectId === questFilterSub;
      const matchesChap = questFilterChap === "all" ? true : q.chapterId === questFilterChap;
      const matchesDiff = questFilterDiff === "all" ? true : q.difficulty === questFilterDiff;
      const matchesType = questFilterType === "all" ? true : q.questionType === questFilterType;
      return matchesSearch && matchesStd && matchesSub && matchesChap && matchesDiff && matchesType;
    });
  }, [questions, subjects, questSearch, questFilterStd, questFilterSub, questFilterChap, questFilterDiff, questFilterType]);

  // Subjects filter for inline display
  const filteredSubjectsForView = useMemo(() => {
    return subjects.filter(s => {
      const matchesStd = subFilterStd === "all" ? true : s.standard === subFilterStd;
      const matchesSearch = subSearch.trim() 
        ? s.subjectName.toLowerCase().includes(subSearch.toLowerCase()) || (s.description || "").toLowerCase().includes(subSearch.toLowerCase())
        : true;
      return matchesStd && matchesSearch;
    });
  }, [subjects, subFilterStd, subSearch]);

  // Chapters filter for inline display
  const filteredChaptersForView = useMemo(() => {
    return chapters.filter(c => {
      const matchesSub = chapFilterSub === "all" ? true : c.subjectId === chapFilterSub;
      const matchesStd = chapFilterStd === "all" ? true : c.standard === chapFilterStd;
      const matchesSearch = chapSearch.trim()
        ? c.chapterName.toLowerCase().includes(chapSearch.toLowerCase()) || (c.description || "").toLowerCase().includes(chapSearch.toLowerCase())
        : true;
      return matchesSub && matchesStd && matchesSearch;
    });
  }, [chapters, chapFilterSub, chapFilterStd, chapSearch]);

  // Paginated questions list block
  const paginatedQuestions = useMemo(() => {
    const startIndex = (questPage - 1) * questPerPage;
    return filteredQuestions.slice(startIndex, startIndex + questPerPage);
  }, [filteredQuestions, questPage, questPerPage]);

  // Students filter
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = studentSearch 
        ? s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) || s.mobile.includes(studentSearch)
        : true;
      const matchesStd = studentFilterStd === "all" ? true : s.standard === studentFilterStd;
      return matchesSearch && matchesStd;
    });
  }, [students, studentSearch, studentFilterStd]);

  // Render Access Denied
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="size-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-gu">ચકાસણી ચાલુ છે...</p>
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full bg-card border border-destructive/20 rounded-3xl p-6 text-center space-y-4 shadow-lg animate-[fade-in_0.4s_ease-out]">
          <div className="size-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto ring-8 ring-destructive/5">
            <ShieldAlert className="size-8" />
          </div>
          <h1 className="text-xl font-bold font-sans">SECURITY RESTRICTION ALERT!</h1>
          <p className="text-sm font-gu text-muted-foreground leading-relaxed">
            દૈનિક પરીક્ષા સિક્યુરિટી નિયમો હેઠળ તમારા ખાતાને સંચાલન સત્તાઓ મળેલી નથી. વિદ્યાર્થી ખાતા ફક્ત ડેશબોર્ડ જોઈ શકે છે.
          </p>
          <div className="pt-4 flex flex-col gap-2">
            <Link
              to="/dashboard"
              className="h-11 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center transition hover:bg-primary/90"
            >
              Back to Dashboard
            </Link>
            <Link
              to="/login"
              className="text-xs text-muted-foreground hover:underline"
            >
              Sign In with different account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Handle CRUD submissions
  // 1. Subject Submit
  const handleSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim()) {
      toast.warning("કૃપા કરીને સાચું નામ દાખલ કરો.");
      return;
    }

    try {
      const isAct = subActive;
      const subId = editingSub ? editingSub.subjectId : "sub_" + Date.now();
      const subjectObj: Subject = {
        subjectId: subId,
        subjectName: subName,
        standard: subStd,
        description: subDesc,
        active: isAct,
        status: isAct ? "active" : "disabled",
        createdAt: editingSub?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingSub) {
        await AdminRepository.updateSubject(
          user.uid,
          user.fullName || "Admin",
          editingSub.subjectId,
          subjectObj
        );
        toast.success("Subject details updated successfully!");
        setEditingSub(null);
      } else {
        await AdminRepository.createSubject(
          user.uid,
          user.fullName || "Admin",
          subjectObj
        );
        toast.success("New Subject created successfully!");
      }
      setSubName("");
      setSubDesc("");
      setSubActive(true);
      setSubStd("10");
      loadAllData();
    } catch (_) {
      toast.error("Subject save failed.");
    }
  };

  // 2. Chapter Submit
  const handleChapterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapName.trim() || !chapSubId) {
      toast.warning("Missing Fields");
      return;
    }

    try {
      const selectedSubject = subjects.find(s => s.subjectId === chapSubId);
      const targetStandard = selectedSubject ? selectedSubject.standard : chapStd;
      const chNo = Number(chapNo) || 1;
      const isAct = chapActive;
      const chapterId = editingChap ? editingChap.chapterId : "ch_" + Date.now();

      const chapterObj: Chapter = {
        chapterId,
        subjectId: chapSubId,
        chapterNo: chNo,
        chapterName: chapName,
        description: chapDesc,
        standard: targetStandard,
        active: isAct,
        status: isAct ? "active" : "archived",
        createdAt: editingChap?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingChap) {
        await AdminRepository.updateChapter(
          user.uid,
          user.fullName || "Admin",
          editingChap.chapterId,
          chapterObj
        );
        toast.success("Chapter updated successfully!");
        setEditingChap(null);
      } else {
        await AdminRepository.createChapter(
          user.uid,
          user.fullName || "Admin",
          chapterObj
        );
        toast.success("New Chapter created successfully!");
      }
      setChapName("");
      setChapNo(chNo + 1);
      setChapDesc("");
      setChapActive(true);
      setEditingChap(null);
      loadAllData();
    } catch (_) {
      toast.error("Chapter details save failed.");
    }
  };

  // 3. Question Submit
  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questText.trim() || !questSubId || !questChapId) {
      toast.warning("Question text, subject, and chapter are required!");
      return;
    }

    if (questType === "MCQ" && (!questA.trim() || !questB.trim() || !questC.trim() || !questD.trim())) {
      toast.warning("MCQ questions require all options A, B, C, and D.");
      return;
    }

    try {
      let finalOptions: string[] = [];
      let finalOptA = "";
      let finalOptB = "";
      let finalOptC = "";
      let finalOptD = "";

      if (questType === "MCQ") {
        finalOptions = [questA, questB, questC, questD];
        finalOptA = questA;
        finalOptB = questB;
        finalOptC = questC;
        finalOptD = questD;
      } else if (questType === "TrueFalse") {
        finalOptions = ["True", "False"];
        finalOptA = "True";
        finalOptB = "False";
      } else if (questType === "FillBlank") {
        finalOptions = [];
      } else if (questType === "MatchFollowing") {
        finalOptions = [questA, questB, questC, questD];
        finalOptA = questA;
        finalOptB = questB;
        finalOptC = questC;
        finalOptD = questD;
      }

      const relatedSub = subjects.find(s => s.subjectId === questSubId);
      const standardStr = relatedSub ? relatedSub.standard : "10";
      const qId = editingQuest ? editingQuest.questionId : "q_" + Date.now();

      const qObj: any = {
        questionId: qId,
        id: qId, // dual compliance for both 'id' and 'questionId' schemas
        subjectId: questSubId,
        chapterId: questChapId,
        question: questText,
        topic: questTopic,
        optionA: finalOptA,
        optionB: finalOptB,
        optionC: finalOptC,
        optionD: finalOptD,
        correctAnswer: questCorrect,
        explanation: questExplanation,
        difficulty: questDifficulty,
        status: questActive ? "active" : "archived",

        // Phase 17 compliance fields
        standard: standardStr,
        questionType: questType,
        options: finalOptions,
        marks: Number(questMarks) || 1,
        active: questActive,
        createdAt: editingQuest?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingQuest) {
        await AdminRepository.updateQuestion(
          user.uid,
          user.fullName || "Admin",
          editingQuest.questionId,
          qObj
        );
        toast.success("Question updated successfully!");
        setEditingQuest(null);
      } else {
        await AdminRepository.createQuestion(
          user.uid,
          user.fullName || "Admin",
          qObj
        );
        toast.success("New Question created successfully!");
      }

      setQuestText("");
      setQuestTopic("");
      setQuestA("");
      setQuestB("");
      setQuestC("");
      setQuestD("");
      setQuestExplanation("");
      setQuestCorrect(questType === "TrueFalse" ? "True" : "A");
      setQuestMarks(1);
      setQuestActive(true);
      loadAllData();
    } catch (_) {
      toast.error("Failed to commit Question to database.");
    }
  };

  // 4. Daily Exam Submit with duplicate control check block
  const handleExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examSubId || !examChapId || !examDate || !examinerName.trim()) {
      toast.warning("Incomplete Exam details!");
      return;
    }

    try {
      const examObj: DailyExam = {
        examId: editingExam ? editingExam.examId : "ex_" + Date.now(),
        subjectId: examSubId,
        chapterId: examChapId,
        examinerId: examinerName, // Use as Examiner Name in UI
        examDate,
        duration: examDuration,
        totalQuestions: examQuestionsCount,
        status: examStatus,
        createdAt: new Date().toISOString()
      };

      let statusOk = true;
      if (editingExam) {
        statusOk = await AdminRepository.updateExam(
          user.uid,
          user.fullName || "Admin",
          editingExam.examId,
          examObj
        );
      } else {
        statusOk = await AdminRepository.createExam(
          user.uid,
          user.fullName || "Admin",
          examObj
        );
      }

      if (!statusOk) {
        toast.error("ACTIVE EXAM CAP RULE FAILED! Only one active exam is permitted per date to ensure student focus.");
        return;
      }

      toast.success(editingExam ? "Exam settings updated!" : "Exam dispatched successfully!");
      setEditingExam(null);
      setExamDate("");
      setExaminerName("");
      loadAllData();
    } catch (_) {
      toast.error("Process execution error.");
    }
  };

  // 5. Broadcast alerts transmission
  const handleBroadcastNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      toast.warning("Title or Message can't be empty.");
      return;
    }

    try {
      toast.loading("Broadcasting notification alert cloud system...", { id: "nt" });
      const deliveredCount = await AdminRepository.sendSystemNotification(
        user.uid,
        user.fullName || "Admin",
        notifTargetStd,
        notifType,
        notifTitle,
        notifMessage
      );
      toast.success(`Success! Personal alerts dispatched to ${deliveredCount} subscriber records.`, { id: "nt" });
      setNotifTitle("");
      setNotifMessage("");
      loadAllData();
    } catch (_) {
      toast.error("Alert dispatch failure.", { id: "nt" });
    }
  };

  // Bulk uploading CSV file FileReader validator
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          toast.error("File is completely empty.");
          return;
        }

        const lines = text.split(/\r?\n/);
        if (lines.length < 2) {
          toast.error("CSV requires a header row and at least one question row.");
          return;
        }

        // CSV columns parse
        const header = lines[0].toLowerCase().split(",");
        const minRequiredHeaders = ["question", "correctanswer", "difficulty", "subjectid", "chapterid"];
        
        const missing = minRequiredHeaders.filter(h => !header.includes(h));
        if (missing.length > 0) {
          toast.error(`Invalid structure. Columns missing: ${missing.join(", ")}`);
          return;
        }

        const qIdx = header.indexOf("question");
        const aIdx = header.indexOf("optiona");
        const bIdx = header.indexOf("optionb");
        const cIdx = header.indexOf("optionc");
        const dIdx = header.indexOf("optiond");
        const catIdx = header.indexOf("correctanswer");
        const expIdx = header.indexOf("explanation");
        const difIdx = header.indexOf("difficulty");
        const subIdx = header.indexOf("subjectid");
        const chIdx = header.indexOf("chapterid");
        const medIdx = header.indexOf("medium");
        const typeIdx = header.includes("questiontype") ? header.indexOf("questiontype") : header.indexOf("type");

        const parsed: Question[] = [];
        const duplicates: string[] = [];
        const errors: string[] = [];

        for (let i = 1; i < lines.length; i++) {
          const l = lines[i].trim();
          if (!l) continue;

          // Simple quotation logic splitting
          const cells: string[] = [];
          let currentCell = "";
          let quoteActive = false;
          for (let c = 0; c < l.length; c++) {
            const char = l[c];
            if (char === '"') {
              quoteActive = !quoteActive;
            } else if (char === ',' && !quoteActive) {
              cells.push(currentCell.trim());
              currentCell = "";
            } else {
              currentCell += char;
            }
          }
          cells.push(currentCell.trim());

          if (cells.length < minRequiredHeaders.length) {
            errors.push(`Row ${i + 1}: Expected columns count. Col length is ${cells.length}`);
            continue;
          }

          const questionText = cells[qIdx];
          const aText = aIdx !== -1 && cells[aIdx] ? cells[aIdx] : "";
          const bText = bIdx !== -1 && cells[bIdx] ? cells[bIdx] : "";
          const cText = cIdx !== -1 && cells[cIdx] ? cells[cIdx] : "";
          const dText = dIdx !== -1 && cells[dIdx] ? cells[dIdx] : "";
          let rawCorrect = cells[catIdx] || "";
          const rawDifficulty = cells[difIdx]?.toLowerCase() as "easy" | "medium" | "hard";
          const explanationText = expIdx !== -1 ? cells[expIdx] : "";
          const subjIdValue = cells[subIdx];
          const chIdValue = cells[chIdx];
          const qTypeValueRaw = typeIdx !== -1 && cells[typeIdx] ? cells[typeIdx] : "";

          // Validations
          if (!questionText || !rawCorrect || !rawDifficulty || !subjIdValue || !chIdValue) {
            errors.push(`Row ${i + 1}: Required values are empty (Question, CorrectAnswer, Difficulty, SubjectID, ChapterID)`);
            continue;
          }

          if (!["easy", "medium", "hard"].includes(rawDifficulty)) {
            errors.push(`Row ${i + 1}: Difficulty must be easy, medium, or hard. Got "${rawDifficulty}"`);
            continue;
          }

          let resolvedType: "MCQ" | "TrueFalse" | "FillBlank" | "MatchFollowing" | "ShortAnswer" | "LongAnswer" = "MCQ";
          if (qTypeValueRaw) {
            const norm = qTypeValueRaw.trim().toLowerCase().replace(/[\s_/]/g, "");
            if (norm === "truefalse" || norm === "tf" || norm === "true/false") {
              resolvedType = "TrueFalse";
            } else if (norm === "fillblank" || norm === "blank" || norm === "fill" || norm === "fillinblank") {
              resolvedType = "FillBlank";
            } else if (norm === "shortanswer" || norm === "short" || norm === "sa") {
              resolvedType = "ShortAnswer";
            } else if (norm === "longanswer" || norm === "long" || norm === "la") {
              resolvedType = "LongAnswer";
            } else if (norm === "match" || norm === "matchfollowing") {
              resolvedType = "MatchFollowing";
            }
          } else {
            // Intelligent fallback detection if questionType is omitted
            const isTF = (aText.toLowerCase() === "true" || aText.startsWith("સાચ") || aText.startsWith("ખાસ")) && (bText.toLowerCase() === "false" || bText.startsWith("ખોટ"));
            if (isTF) {
              resolvedType = "TrueFalse";
            } else if (questionText.includes("_____")) {
              resolvedType = "FillBlank";
            } else if (!aText && !bText && !cText && !dText) {
              resolvedType = "ShortAnswer";
            }
          }

          // Validation of answer key based on resolved type
          if (resolvedType === "MCQ") {
            if (!aText || !bText) {
              errors.push(`Row ${i + 1}: MCQ questions must specify at least Option A and Option B.`);
              continue;
            }
            if (!["A", "B", "C", "D"].includes(rawCorrect.toUpperCase().trim())) {
              errors.push(`Row ${i + 1}: MCQ correct answer must be A, B, C, or D. Got "${rawCorrect}"`);
              continue;
            }
            rawCorrect = rawCorrect.toUpperCase().trim();
          } else if (resolvedType === "TrueFalse") {
            const val = rawCorrect.toUpperCase().trim();
            if (val === "A" || val === "T" || val === "TRUE" || val.startsWith("સાચ") || val === "1") {
              rawCorrect = "A";
            } else if (val === "B" || val === "F" || val === "FALSE" || val.startsWith("ખોટ") || val === "0") {
              rawCorrect = "B";
            } else {
              rawCorrect = val;
            }
          }

          // Duplicates validator check
          const doubleCheck = parsed.some(p => p.question === questionText) || questions.some(q => q.question === questionText);
          if (doubleCheck) {
            duplicates.push(`Row ${i + 1}: Question: "${questionText.substring(0, 30)}..." duplicates verified item list.`);
            continue;
          }

          let rawMedium = "Gujarati";
          if (medIdx !== -1 && cells[medIdx]) {
            const mVal = cells[medIdx].trim().toLowerCase();
            if (mVal.startsWith("eng") || mVal === "e") {
              rawMedium = "English";
            } else if (mVal.startsWith("guj") || mVal === "g") {
              rawMedium = "Gujarati";
            } else if (mVal.startsWith("hin") || mVal === "h") {
              rawMedium = "Hindi";
            } else {
              rawMedium = cells[medIdx].trim();
            }
          } else {
            // Intelligent fallback detection
            const hasGujarati = /[\u0a80-\u0aff]/.test(questionText);
            if (!hasGujarati && /[a-zA-Z]{5,}/.test(questionText)) {
              rawMedium = "English";
            }
          }

          parsed.push({
            questionId: "q_bulk_" + Date.now() + "_" + i + "_" + Math.floor(Math.random() * 100),
            subjectId: subjIdValue,
            chapterId: chIdValue,
            question: questionText,
            optionA: aText,
            optionB: bText,
            optionC: cText,
            optionD: dText,
            correctAnswer: rawCorrect,
            explanation: explanationText,
            difficulty: rawDifficulty,
            medium: rawMedium,
            questionType: resolvedType,
            status: "active"
          });
        }

        setImportReport({
          totalRead: lines.length - 1,
          importedCount: parsed.length,
          errors,
          duplicates
        });

        if (parsed.length > 0) {
          await AdminRepository.bulkUploadQuestions(user.uid, user.fullName || "Admin", parsed);
          toast.success(`Broadcasting upload: ${parsed.length} questions merged into Firestore bank!`);
          loadAllData();
        } else {
          toast.error("Question parsing failed. Inspect report for details.");
        }
      } catch (err) {
        console.error(err);
        toast.error("Error loading CSV values.");
      }
    };
    reader.readAsText(file);
  };

  // EXPORTS EXCEL / CSV tabular generators
  const exportToCSV = (type: "results" | "students" | "leaderboard" | "audit_logs") => {
    let content = "";
    let filename = `export_${type}_${new Date().toISOString().split('T')[0]}.csv`;

    if (type === "results") {
      content = "Result ID,Student ID,Subject Name,Chapter Name,Obtained Marks,Total Questions,Percentage %,Submitted Date\n";
      results.forEach(r => {
        content += `"${r.resultId}","${r.studentId}","${r.subject}","${r.chapter}",${r.obtainedMarks},${r.totalQuestions},${r.percentage}%,"${r.submittedAt}"\n`;
      });
    } else if (type === "students") {
      content = "User ID,Full Name,Mobile Nbr,Village,School Name,Standard,Status,Last Connected\n";
      students.forEach(s => {
        content += `"${s.uid}","${s.fullName}","${s.mobile}","${s.village ?? ""}","${s.school ?? ""}",${s.standard ?? ""},"${s.status}","${s.lastTokenUpdate ?? ""}"\n`;
      });
    } else if (type === "leaderboard") {
      // Assemble aggregated scores for leaderboard export
      content = "Rank,Student ID,Student Name,Total Verified Points,Updated At\n";
      const aggregate = students
        .map((s, idx) => ({
          studentId: s.uid,
          studentName: s.fullName,
          score: results.filter(r => r.studentId === s.uid).reduce((acc, r) => acc + (r.obtainedMarks || 0), 0)
        }))
        .sort((a,b) => b.score - a.score);

      aggregate.forEach((item, index) => {
        content += `${index + 1},"${item.studentId}","${item.studentName}",${item.score},"${new Date().toISOString()}"\n`;
      });
    } else {
      content = "Audit ID,Admin Name,Action Executed,Affected Record ID,Date Time\n";
      auditLogs.forEach(log => {
        content += `"${log.id}","${log.adminName}","${log.action}","${log.affectedRecord}","${log.timestamp}"\n`;
      });
    }

    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    link.click();
    toast.success(`Exported ${type} dataset as printable CSV!`);
  };

  // Toggle user statuses (Blocked versus Active)
  const toggleStudentStatus = async (studentId: string, currentStatus: any) => {
    try {
      const next: any = (currentStatus || "").toLowerCase() === "blocked" ? "Approved" : "Blocked";
      await AdminRepository.setUserStatus(user.uid, user.fullName || "Admin", studentId, next);
      toast.success(`Access permissions updated successfully!`);
      loadAllData();
    } catch (_) {
      toast.error("Firestore security update blocked.");
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] dark:bg-slate-950 text-slate-900 dark:text-slate-50 flex">
      
      {/* Desktop Spacious Sidebar */}
      <aside className="w-64 bg-card border-r border-border hidden lg:flex flex-col shrink-0 sticky top-0 h-screen">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-teal-500 text-white flex items-center justify-center font-bold">
            DE
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-widest leading-none">DAILY EXAM</h1>
            <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase tracking-wider">ADMIN PORTAL</span>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {/* Question Bank tab is available to all educators & admins */}
          <SidebarBtn 
            active={activeTab === "questions"} 
            onClick={() => setActiveTab("questions")} 
            icon={<HelpCircle className="size-4" />} 
            label="Question Bank" 
            sub="પ્રશ્ન બેંક ભંડાર"
          />
          {/* Daily Exam Scheduler tab is hidden from regular teachers */}
          {(user?.role || "").toLowerCase().trim() !== "teacher" && (
            <SidebarBtn 
              active={activeTab === "exams"} 
              onClick={() => setActiveTab("exams")} 
              icon={<CalendarClock className="size-4" />} 
              label="Daily Exam Scheduler" 
              sub="પરીક્ષા નિયંત્રણો"
            />
          )}
        </nav>

        {/* User Account Bar */}
        <div className="p-4 border-t border-border bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <span className="size-8 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 flex items-center justify-center font-bold text-xs capitalize">
              {user.fullName ? user.fullName[0] : "A"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate leading-tight">{user.fullName || "Administrator"}</p>
              <p className="text-[10px] text-muted-foreground uppercase leading-none mt-0.5">{user.role}</p>
            </div>
            <Link
              to="/dashboard"
              className="text-[10px] font-bold text-teal-600 hover:underline shrink-0"
            >
              Exit
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Spacious Workspace Container */}
      <main className="flex-1 min-w-0 flex flex-col min-h-screen">
        
        {/* Mobile Header Bar */}
        <header className="bg-card border-b border-border sticky top-0 z-30 lg:hidden px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => navigate({ to: "/dashboard" })} 
              className="px-2 py-1 text-xs bg-muted rounded-lg font-bold"
            >
              Dashboard
            </button>
            <span className="text-sm font-bold tracking-tight">Admin System</span>
          </div>

          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as AdminTab)}
            className="text-xs bg-muted px-2 py-1.5 rounded-xl border border-border font-semibold outline-none"
          >
            <option value="questions">Question Bank (પ્રશ્ન બેંક)</option>
            {(user?.role || "").toLowerCase().trim() !== "teacher" && (
              <option value="exams">Daily Exams (દૈનિક પરીક્ષા)</option>
            )}
          </select>
        </header>

        {/* Top Header Section (For Desktop, containing Sync/Update controls) */}
        <div className="bg-card border-b border-border px-6 py-4 hidden lg:flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight capitalize">
              {activeTab.replace("_", " ")}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage database, monitor live student progress, and schedule daily papers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAllData}
              disabled={dataLoading}
              className="px-3.5 py-1.5 border border-border rounded-xl text-xs font-bold hover:bg-muted transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Database className="size-3.5" />
              <span>{dataLoading ? "Syncing..." : "Sync Database"}</span>
            </button>
            <Link
              to="/dashboard"
              className="px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl shadow-sm hover:bg-primary/95 transition"
            >
              Student Portal
            </Link>
          </div>
        </div>

        {/* Fluid Workspace Body */}
        <div className="flex-1 p-4 lg:p-6 space-y-6 overflow-y-auto">
          {dataLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <Loader2 className="size-10 animate-spin text-teal-600" />
              <p className="text-sm text-muted-foreground font-gu">ડેટાબેઝમાંથી ફાઇલો લોડ થઈ રહી છે...</p>
            </div>
          ) : (
            <>
              {(activeTab as any) === "analytics" && (
                <AdvancedAnalyticsDashboard
                  studentAnalytics={studentAnalytics}
                  subjectAnalytics={subjectAnalytics}
                  chapterAnalytics={chapterAnalytics}
                  questionAnalytics={questionAnalytics}
                  schoolAnalytics={schoolAnalytics}
                  villageAnalytics={villageAnalytics}
                  standardAnalytics={standardAnalytics}
                  learningTrends={learningTrends}
                  analyticsReports={analyticsReports}
                  onRefresh={loadAllData}
                  userRole={user?.role === "super_admin" ? "super_admin" : "admin"}
                />
              )}

              {/* TAB 1: OVERVIEW DASHBOARD */}
              {(activeTab as any) === "dashboard" && (
                <div className="space-y-6">
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <DashboardCard 
                      icon={<UsersRound className="text-blue-500" />} 
                      title="Total Students" 
                      titleGu="કુલ વિદ્યાર્થીઓ" 
                      value={stats.totalStudents} 
                      sub="subscriber database" 
                    />
                    <DashboardCard 
                      icon={<CalendarClock className="text-teal-500" />} 
                      title="Exams Published" 
                      titleGu="પરીક્ષાઓ આયોજિત" 
                      value={stats.totalExamsConducted} 
                      sub="scheduled paper counts" 
                    />
                    <DashboardCard 
                      icon={<FileCheck className="text-emerald-500" />} 
                      title="Average Performance" 
                      titleGu="સરેરાશ પરિણામ" 
                      value={`${stats.avgPerf}%`} 
                      sub="obtained student marks" 
                    />
                    <DashboardCard 
                      icon={<BellRing className="text-amber-500" />} 
                      title="Broadcast Alerts" 
                      titleGu="સંદેશાઓ મોકલેલા" 
                      value={stats.notificationsSent} 
                      sub="pushed messaging records" 
                    />
                  </div>

                  {/* Active control center reminder banner */}
                  <div className="bg-gradient-to-r from-teal-500/10 to-teal-800/10 border border-teal-500/20 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="size-4 text-teal-600 dark:text-teal-400" />
                        <span className="text-xs font-extrabold text-teal-800 dark:text-teal-300 uppercase tracking-wider">Active Exam Guard Rail Enabled</span>
                      </div>
                      <p className="text-sm font-semibold mt-1 font-gu">
                        ફક્ત એક જ સક્રિય પરીક્ષા પદ્ધતિ ચાલુ રાખવા માટે કલાઉડ કાર્યક્ષમતા શિડ્યુલર સક્રિય રહેલ છે.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-teal-500/20 text-teal-800 dark:text-teal-200 px-3 py-1 rounded-full font-extrabold uppercase outline-none">
                        1 Active Exam Today
                      </span>
                    </div>
                  </div>

                  {/* Analytics charts modules */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Performance Trends Linechart */}
                    <div className="bg-card border border-border rounded-3xl p-5 shadow-sm lg:col-span-2">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-sm tracking-wide">STUDENT ATTENDANCE & PERCENTAGE TRENDS</h3>
                          <span className="text-xs text-muted-foreground font-gu">છેલ્લા 7 દિવસની વિગતો</span>
                        </div>
                        <TrendingUp className="size-5 text-teal-600" />
                      </div>

                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                            <XAxis dataKey="Date" style={{ fontSize: 10 }} />
                            <YAxis style={{ fontSize: 10 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="Average" stroke="#0d9488" strokeWidth={3} dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="Completed" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 4" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Quick Distribution Summary */}
                    <div className="bg-card border border-border rounded-3xl p-5 shadow-sm flex flex-col justify-between">
                      <div>
                        <h3 className="font-semibold text-sm tracking-wide mb-3">RETENTION AUDIT INDEX</h3>
                        <p className="text-xs text-muted-foreground font-gu mb-4">
                          વિદ્યાર્થી પ્રતિક્રમ રેટિંગ અને પરફોર્મન્સ એનાલિસિસ:
                        </p>

                        <div className="space-y-4">
                          <div className="flex justify-between items-center bg-muted/40 p-2.5 rounded-2xl">
                            <div>
                              <span className="text-[10px] uppercase text-muted-foreground block font-sans">Active Approved accounts</span>
                              <span className="text-xs font-bold font-gu">{stats.activeUserCount} Approved</span>
                            </div>
                            <UserCheck className="size-4 text-emerald-500" />
                          </div>

                          <div className="flex justify-between items-center bg-muted/40 p-2.5 rounded-2xl">
                            <div>
                              <span className="text-[10px] uppercase text-muted-foreground block font-sans">Most Challenging Science Module</span>
                              <span className="text-xs font-bold truncate block max-w-[150px]">{stats.mostDifficultSubject}</span>
                            </div>
                            <AlertTriangle className="size-4 text-amber-500" />
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border mt-4">
                        <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1.5">
                          <Info className="size-3.5 shrink-0" />
                          <span>All modules synchronized using Real-Time Firestore Rules.</span>
                        </span>
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* Tab 2: SUBJECTS MANAGEMENT */}
              {false && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-teal-500/10 dark:bg-teal-500/5 p-4 rounded-3xl border border-teal-500/20">
                    <div>
                      <h3 className="font-extrabold text-sm text-teal-800 dark:text-teal-400">Board Subjects Configuration (ગુજરાત બોર્ડ વિષયો)</h3>
                      <p className="text-xs text-teal-600 dark:text-teal-500/80 mt-0.5">Manage academic standards, subject details, and accessibility streams.</p>
                    </div>
                    <span className="text-xs font-mono font-bold bg-teal-500 text-white px-3 py-1 rounded-full">{subjects.length} Total Subjects</span>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* Subject Form (4 cols on wide, 1 col otherwise) */}
                    <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4 xl:col-span-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm tracking-wide text-slate-800 dark:text-slate-100 flex items-center gap-2">
                          <span className="size-2 rounded-full bg-teal-500" />
                          {editingSub ? "Edit Subject" : "Create New Subject"}
                        </h4>
                      </div>

                      <form onSubmit={handleSubjectSubmit} className="space-y-4 text-xs font-semibold">
                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Subject Name</label>
                          <input
                            type="text"
                            required
                            value={subName}
                            onChange={(e) => setSubName(e.target.value)}
                            placeholder="e.g. Science (વિજ્ઞાન) or Math"
                            className="w-full h-11 px-4 mt-1 bg-muted/40 rounded-xl border border-border outline-none focus:border-teal-500 text-xs font-bold transition"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">School Standard</label>
                          <select
                            value={subStd}
                            onChange={(e) => setSubStd(e.target.value)}
                            className="w-full h-11 px-4 mt-1 bg-muted/45 rounded-xl border border-border outline-none focus:border-teal-500 text-xs font-bold transition"
                          >
                            <option value="1">ધોરણ 1 (Std 1)</option>
                            <option value="2">ધોરણ 2 (Std 2)</option>
                            <option value="3">ધોરણ 3 (Std 3)</option>
                            <option value="4">ધોરણ 4 (Std 4)</option>
                            <option value="5">ધોરણ 5 (Std 5)</option>
                            <option value="6">ધોરણ 6 (Std 6)</option>
                            <option value="7">ધોરણ 7 (Std 7)</option>
                            <option value="8">ધોરણ 8 (Std 8)</option>
                            <option value="9">ધોરણ 9 (Std 9)</option>
                            <option value="10">ધોરણ 10 (Std 10)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Description (વિષય વિગત)</label>
                          <textarea
                            value={subDesc}
                            onChange={(e) => setSubDesc(e.target.value)}
                            placeholder="Provide a description of the subject..."
                            className="w-full h-24 p-3 mt-1 bg-muted/40 rounded-xl border border-border outline-none focus:border-teal-500 text-xs font-medium transition resize-none"
                          />
                        </div>

                        <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-2xl border border-border">
                          <input
                            type="checkbox"
                            pattern="[0-9]*"
                            id="subActiveCheck"
                            checked={subActive}
                            onChange={(e) => setSubActive(e.target.checked)}
                            className="size-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                          />
                          <label htmlFor="subActiveCheck" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                            Active Stream (ચાલુ/સક્રિય કરો)
                          </label>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          <button
                            type="submit"
                            className="flex-1 h-11 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Plus className="size-4" />
                            <span>{editingSub ? "Update Details" : "Create Subject"}</span>
                          </button>
                          {editingSub && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSub(null);
                                setSubName("");
                                setSubDesc("");
                                setSubActive(true);
                                setSubStd("10");
                              }}
                              className="px-4 h-11 border border-border rounded-xl text-xs font-semibold hover:bg-muted"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </form>
                    </div>

                    {/* Subject Table List (8 cols on wide, 1 col otherwise) */}
                    <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4 xl:col-span-8">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <h4 className="font-bold text-sm tracking-wide text-slate-800 dark:text-slate-100 uppercase text-muted-foreground">
                          Subject Registry ({filteredSubjectsForView.length})
                        </h4>
                        
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Search Subjects */}
                          <div className="relative">
                            <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={subSearch}
                              onChange={(e) => setSubSearch(e.target.value)}
                              placeholder="છો બોર્ડ વિષય શોધો..."
                              className="w-48 h-9 pl-9 pr-4 bg-muted/50 rounded-xl border border-border outline-none focus:border-teal-500 text-xs font-semibold"
                            />
                          </div>

                          {/* Standard Filter */}
                          <select
                            value={subFilterStd}
                            onChange={(e) => setSubFilterStd(e.target.value)}
                            className="h-9 px-2 bg-muted/50 rounded-xl border border-border outline-none text-xs font-semibold"
                          >
                            <option value="all">All Standards</option>
                            <option value="1">Standard 1</option>
                            <option value="2">Standard 2</option>
                            <option value="3">Standard 3</option>
                            <option value="4">Standard 4</option>
                            <option value="5">Standard 5</option>
                            <option value="6">Standard 6</option>
                            <option value="7">Standard 7</option>
                            <option value="8">Standard 8</option>
                            <option value="9">Standard 9</option>
                            <option value="10">Standard 10</option>
                          </select>
                        </div>
                      </div>

                      <div className="overflow-x-auto border border-border rounded-2xl">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                              <th className="p-4">Subject Name</th>
                              <th className="p-4">Standard</th>
                              <th className="p-4">Description</th>
                              <th className="p-4">Status</th>
                              <th className="p-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border text-xs font-medium">
                            {filteredSubjectsForView.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="p-8 text-center text-muted-foreground font-semibold">
                                  કોઈ વિષય મળ્યા નથી (No subjects matched search filters)
                                </td>
                              </tr>
                            ) : (
                              filteredSubjectsForView.map(s => (
                                <tr key={s.subjectId} className="hover:bg-muted/10 transition">
                                  <td className="p-4">
                                    <div className="font-bold text-slate-800 dark:text-slate-100">{s.subjectName}</div>
                                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">ID: {s.subjectId}</div>
                                  </td>
                                  <td className="p-4">
                                    <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full text-[10px] font-bold">
                                      Std {s.standard}
                                    </span>
                                  </td>
                                  <td className="p-4 max-w-xs">
                                    <p className="truncate text-muted-foreground" title={s.description || "No description provided."}>
                                      {s.description || "—"}
                                    </p>
                                  </td>
                                  <td className="p-4">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                      s.active 
                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" 
                                        : "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                                    }`}>
                                      <span className={`size-1.5 rounded-full ${s.active ? "bg-emerald-500" : "bg-rose-500"}`} />
                                      {s.active ? "Active" : "Disabled"}
                                    </span>
                                  </td>
                                  <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => {
                                          setEditingSub(s);
                                          setSubName(s.subjectName);
                                          setSubDesc(s.description || "");
                                          setSubActive(s.active ?? (s.status !== "disabled"));
                                          setSubStd(s.standard);
                                        }}
                                        title="ویرایش"
                                        className="p-1.5 border border-border rounded-xl text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/20 transition-all"
                                      >
                                        <Edit3 className="size-3.5" />
                                      </button>
                                      <button
                                        onClick={async () => {
                                          const nextActiveStatus = !s.active;
                                          const nextStatusString = nextActiveStatus ? "active" : "disabled";
                                          await AdminRepository.updateSubject(
                                            user?.uid || "admin", 
                                            user?.fullName || "Admin", 
                                            s.subjectId, 
                                            { 
                                              active: nextActiveStatus,
                                              status: nextStatusString 
                                            }
                                          );
                                          toast.success(`Subject status synced to ${nextStatusString}!`);
                                          loadAllData();
                                        }}
                                        className={`p-1.5 border border-border rounded-xl transition ${
                                          s.active 
                                            ? "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10" 
                                            : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/10"
                                        }`}
                                        title={s.active ? "Deactivate" : "Activate"}
                                      >
                                        {s.active ? <Ban className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
                                      </button>
                                      <button
                                        onClick={async () => {
                                          if (confirm(`આ વિષય "${s.subjectName}" કાઢી નાખવાથી તેની સાથે જોડાયેલા પ્રકરણો અને પરીક્ષાઓને અસર થશે. શું આપ ખરેખર આગળ વધવા માંગો છો?`)) {
                                            await AdminRepository.deleteSubject(user?.uid || "admin", user?.fullName || "Admin", s.subjectId);
                                            toast.success("Subject permanently deleted!");
                                            loadAllData();
                                          }
                                        }}
                                        className="p-1.5 border border-border rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                        title="Delete"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2.5: CHAPTERS MANAGEMENT */}
              {false && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-teal-500/10 dark:bg-teal-500/5 p-4 rounded-3xl border border-teal-500/20">
                    <div>
                      <h3 className="font-extrabold text-sm text-teal-800 dark:text-teal-400">Board Chapters Structure (ગુજરાત બોર્ડ ચેપ્ટરો)</h3>
                      <p className="text-xs text-teal-600 dark:text-teal-500/80 mt-0.5">Map subject curriculums into numbered textbook chapters and topics.</p>
                    </div>
                    <span className="text-xs font-mono font-bold bg-teal-500 text-white px-3 py-1 rounded-full">{chapters.length} Total Chapters</span>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* Chapter Form Creator (4 cols) */}
                    <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4 xl:col-span-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm tracking-wide text-slate-800 dark:text-slate-100 flex items-center gap-2">
                          <span className="size-2 rounded-full bg-teal-500" />
                          {editingChap ? "Edit Chapter Module" : "Create New Chapter"}
                        </h4>
                      </div>

                      <form onSubmit={handleChapterSubmit} className="space-y-4 text-xs font-semibold">
                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Subject Relation</label>
                          <select
                            value={chapSubId}
                            onChange={(e) => {
                              setChapSubId(e.target.value);
                              const selectedSubject = subjects.find(s => s.subjectId === e.target.value);
                              if (selectedSubject) {
                                setChapStd(selectedSubject.standard);
                              }
                            }}
                            className="w-full h-11 px-4 mt-1 bg-muted/45 rounded-xl border border-border outline-none focus:border-teal-500 text-xs font-bold transition"
                          >
                            <option value="">-- પસંદ કરો (Select Subject) --</option>
                            {subjects.map(subItem => (
                              <option key={subItem.subjectId} value={subItem.subjectId}>
                                {subItem.subjectName} (Std {subItem.standard})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-12 gap-3">
                          <div className="col-span-4">
                            <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Chapter No</label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={chapNo}
                              onChange={(e) => setChapNo(parseInt(e.target.value) || 1)}
                              className="w-full h-11 px-4 mt-1 bg-muted/40 rounded-xl border border-border outline-none focus:border-teal-500 text-xs font-bold transition text-center"
                            />
                          </div>

                          <div className="col-span-8">
                            <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Target Standard</label>
                            <select
                              value={chapStd}
                              onChange={(e) => setChapStd(e.target.value)}
                              className="w-full h-11 px-4 mt-1 bg-muted/45 rounded-xl border border-border outline-none focus:border-teal-500 text-xs font-bold transition"
                            >
                              <option value="1">ધોરણ 1</option>
                              <option value="2">ધોરણ 2</option>
                              <option value="3">ધોરણ 3</option>
                              <option value="4">ધોરણ 4</option>
                              <option value="5">ધોરણ 5</option>
                              <option value="6">ધોરણ 6</option>
                              <option value="7">ધોરણ 7</option>
                              <option value="8">ધોરણ 8</option>
                              <option value="9">ધોરણ 9</option>
                              <option value="10">ધોરણ 10</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Chapter Title</label>
                          <input
                            type="text"
                            required
                            value={chapName}
                            onChange={(e) => setChapName(e.target.value)}
                            placeholder="e.g. ઘર્ષણ અથવા પ્રકાશનું પરાવર્તન"
                            className="w-full h-11 px-4 mt-1 bg-muted/40 rounded-xl border border-border outline-none focus:border-teal-500 text-xs font-bold transition"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Topic Summary / Description</label>
                          <textarea
                            value={chapDesc}
                            onChange={(e) => setChapDesc(e.target.value)}
                            placeholder="Detailed chapter topics, syllabus highlights..."
                            className="w-full h-24 p-3 mt-1 bg-muted/40 rounded-xl border border-border outline-none focus:border-teal-500 text-xs font-medium transition resize-none"
                          />
                        </div>

                        <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-2xl border border-border">
                          <input
                            type="checkbox"
                            pattern="[0-9]*"
                            id="chapActiveCheck"
                            checked={chapActive}
                            onChange={(e) => setChapActive(e.target.checked)}
                            className="size-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                          />
                          <label htmlFor="chapActiveCheck" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                            Active Stream (ચાલુ/સક્રિય કરો)
                          </label>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          <button
                            type="submit"
                            className="flex-1 h-11 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Plus className="size-4" />
                            <span>{editingChap ? "Edit Core Chapter" : "Create Chapter"}</span>
                          </button>
                          {editingChap && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingChap(null);
                                setChapName("");
                                setChapSubId("");
                                setChapNo(1);
                                setChapDesc("");
                                setChapActive(true);
                              }}
                              className="px-4 h-11 border border-border rounded-xl text-xs font-semibold hover:bg-muted"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </form>
                    </div>

                    {/* Chapter Table List View (8 cols) */}
                    <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4 xl:col-span-8">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <h4 className="font-bold text-sm tracking-wide text-slate-800 dark:text-slate-100 uppercase text-muted-foreground">
                          Chapter Registry ({filteredChaptersForView.length})
                        </h4>
                        
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Search Chapters */}
                          <div className="relative">
                            <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={chapSearch}
                              onChange={(e) => setChapSearch(e.target.value)}
                              placeholder="ચેપ્ટર શોધો..."
                              className="w-48 h-9 pl-9 pr-4 bg-muted/50 rounded-xl border border-border outline-none focus:border-teal-500 text-xs font-semibold"
                            />
                          </div>

                          {/* Standard Filter */}
                          <select
                            value={chapFilterStd}
                            onChange={(e) => setChapFilterStd(e.target.value)}
                            className="h-9 px-2 bg-muted/50 rounded-xl border border-border outline-none text-xs font-semibold"
                          >
                            <option value="all font-semibold">Standard: All</option>
                            <option value="1">ધોરણ 1</option>
                            <option value="2">ધોરણ 2</option>
                            <option value="3">ધોરણ 3</option>
                            <option value="4">ધોરણ 4</option>
                            <option value="5">ધોરણ 5</option>
                            <option value="6">ધોરણ 6</option>
                            <option value="7">ધોરણ 7</option>
                            <option value="8">ધોરણ 8</option>
                            <option value="9">ધોરણ 9</option>
                            <option value="10">ધોરણ 10</option>
                          </select>

                          {/* Subject Filter */}
                          <select
                            value={chapFilterSub}
                            onChange={(e) => setChapFilterSub(e.target.value)}
                            className="h-9 px-2 bg-muted/50 rounded-xl border border-border outline-none text-xs font-semibold max-w-[150px] truncate"
                          >
                            <option value="all">Subject: All</option>
                            {subjects.map(s => (
                              <option key={s.subjectId} value={s.subjectId}>{s.subjectName} (Std {s.standard})</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="overflow-x-auto border border-border rounded-2xl">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                              <th className="p-4 w-16 text-center">No</th>
                              <th className="p-4">Chapter Title</th>
                              <th className="p-4">Subject Stream & school standard</th>
                              <th className="p-4">Summary</th>
                              <th className="p-4">Status</th>
                              <th className="p-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border text-xs font-medium">
                            {filteredChaptersForView.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="p-8 text-center text-muted-foreground font-semibold">
                                  કોઈ પ્રકરણ મળ્યા નથી (No chapters matched filters)
                                </td>
                              </tr>
                            ) : (
                              filteredChaptersForView.map(c => {
                                const subObj = subjects.find(s => s.subjectId === c.subjectId);
                                return (
                                  <tr key={c.chapterId} className="hover:bg-muted/10 transition">
                                    <td className="p-4 text-center font-bold text-teal-600">
                                      {c.chapterNo ?? "0"}
                                    </td>
                                    <td className="p-4">
                                      <div className="font-bold text-slate-800 dark:text-slate-100">{c.chapterName}</div>
                                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">ID: {c.chapterId}</div>
                                    </td>
                                    <td className="p-4">
                                      <div className="font-bold text-slate-700 dark:text-slate-300">
                                        {subObj?.subjectName || "—"}
                                      </div>
                                      <span className="px-2 py-0.2 px-2 py-0.5 mt-0.5 inline-block bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[9px] font-bold">
                                        Std {c.standard ?? subObj?.standard ?? "—"}
                                      </span>
                                    </td>
                                    <td className="p-4 max-w-[150px]">
                                      <p className="truncate text-muted-foreground" title={c.description || "No summary of topics."}>
                                        {c.description || "—"}
                                      </p>
                                    </td>
                                    <td className="p-4">
                                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                        c.active 
                                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" 
                                          : "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                                      }`}>
                                        <span className={`size-1.5 rounded-full ${c.active ? "bg-emerald-500" : "bg-rose-500"}`} />
                                        {c.active ? "Active" : "Archived"}
                                      </span>
                                    </td>
                                    <td className="p-4 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          onClick={() => {
                                            setEditingChap(c);
                                            setChapName(c.chapterName);
                                            setChapSubId(c.subjectId);
                                            setChapNo(c.chapterNo || 1);
                                            setChapDesc(c.description || "");
                                            setChapActive(c.active ?? (c.status !== "archived"));
                                            setChapStd(c.standard || "10");
                                          }}
                                          className="p-1.5 border border-border rounded-xl text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/20 transition-all font-semibold"
                                          title="Edit"
                                        >
                                          <Edit3 className="size-3.5" />
                                        </button>
                                        <button
                                          onClick={async () => {
                                            const nextActiveStatus = !c.active;
                                            const nextStatusString = nextActiveStatus ? "active" : "archived";
                                            await AdminRepository.updateChapter(
                                              user?.uid || "admin", 
                                              user?.fullName || "Admin", 
                                              c.chapterId, 
                                              { 
                                                active: nextActiveStatus,
                                                status: nextStatusString 
                                              }
                                            );
                                            toast.success(`Chapter status synced to ${nextStatusString}!`);
                                            loadAllData();
                                          }}
                                          className={`p-1.5 border border-border rounded-xl transition ${
                                            c.active 
                                              ? "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10" 
                                              : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/10"
                                          }`}
                                          title={c.active ? "Archive" : "Activate"}
                                        >
                                          {c.active ? <Ban className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
                                        </button>
                                        <button
                                          onClick={async () => {
                                            if (confirm(`શું આપ ખરેખર પ્રકરણ "${c.chapterName}" કાઢી નાખવા માંગો છો?`)) {
                                              await AdminRepository.deleteChapter(user?.uid || "admin", user?.fullName || "Admin", c.chapterId);
                                              toast.success("Chapter permanently deleted!");
                                              loadAllData();
                                            }
                                          }}
                                          className="p-1.5 border border-border rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                          title="Delete"
                                        >
                                          <Trash2 className="size-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: QUESTION BANK MANAGEMENT */}
              {activeTab === "questions" && (
                <QuestionBankManager
                  subjects={subjects}
                  chapters={chapters}
                  questions={questions}
                  exams={exams}
                  onRefresh={loadAllData}
                  currentUser={user}
                  onScheduleSuccess={() => setActiveTab("exams")}
                />
              )}
              {/* REMOVED INLINE QUESTIONS */}
              {false && activeTab === "questions" && (
                <div className="space-y-6">
                  
                  {/* Creator Form / Bulk upload widgets layout split */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Add Single Question Panel */}
                    <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4 lg:col-span-1">
                      <h3 className="font-bold text-sm tracking-wider uppercase text-teal-600">
                        {editingQuest ? "Modify Question details" : "Add Single Question"}
                      </h3>

                      <form onSubmit={handleQuestionSubmit} className="space-y-4 text-xs font-semibold">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-muted-foreground block">Question Subject</label>
                          <select
                            value={questSubId}
                            onChange={(e) => setQuestSubId(e.target.value)}
                            className="w-full h-10 px-3 mt-1 bg-muted/40 rounded-xl border outline-none text-xs"
                          >
                            {subjects.map(s => (
                              <option key={s.subjectId} value={s.subjectId}>{s.subjectName} (Std {s.standard})</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold text-muted-foreground block">Chapter Module</label>
                          <select
                            value={questChapId}
                            onChange={(e) => setQuestChapId(e.target.value)}
                            className="w-full h-10 px-3 mt-1 bg-muted/40 rounded-xl border outline-none text-xs"
                          >
                            {filteredChaptersForSelectedSubject.map(c => (
                              <option key={c.chapterId} value={c.chapterId}>{c.chapterName}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold text-muted-foreground block">Question Type</label>
                          <select
                            value={questType}
                            onChange={(e) => {
                              const t = e.target.value as any;
                              setQuestType(t);
                              if (t === "TrueFalse") {
                                setQuestCorrect("True");
                              } else if (t === "MCQ" || t === "MatchFollowing") {
                                setQuestCorrect("A");
                              } else {
                                setQuestCorrect("");
                              }
                            }}
                            className="w-full h-10 px-3 mt-1 bg-muted/40 rounded-xl border outline-none text-xs font-semibold"
                          >
                            <option value="MCQ">Multiple Choice (MCQ)</option>
                            <option value="TrueFalse">True or False</option>
                            <option value="FillBlank">Fill in the Blanks</option>
                            <option value="MatchFollowing">Match the Following</option>
                            <option value="ShortAnswer">ટૂંકા પ્રશ્નો (Short Answer)</option>
                            <option value="LongAnswer">લાંબા પ્રશ્નો (Long Answer)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold text-muted-foreground block">Question content (ગુજરાતી / English)</label>
                          <textarea
                            required
                            value={questText}
                            onChange={(e) => setQuestText(e.target.value)}
                            placeholder="લોખંડના કટાવવાની ક્રિયા કેવી પ્રક્રિયા છે?"
                            className="w-full p-3 mt-1 bg-muted/40 rounded-xl border outline-none h-20 text-xs text-foreground resize-none"
                          />
                        </div>

                        {/* Dynamic Options depending on type */}
                        {questType === "MCQ" && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] block text-muted-foreground uppercase font-bold">Option A</label>
                              <input type="text" required value={questA} onChange={(e) => setQuestA(e.target.value)} className="w-full h-10 px-3 mt-1 bg-muted/40 rounded-xl border outline-none text-xs" />
                            </div>
                            <div>
                              <label className="text-[10px] block text-muted-foreground uppercase font-bold">Option B</label>
                              <input type="text" required value={questB} onChange={(e) => setQuestB(e.target.value)} className="w-full h-10 px-3 mt-1 bg-muted/40 rounded-xl border outline-none text-xs" />
                            </div>
                            <div>
                              <label className="text-[10px] block text-muted-foreground uppercase font-bold">Option C</label>
                              <input type="text" required value={questC} onChange={(e) => setQuestC(e.target.value)} className="w-full h-10 px-3 mt-1 bg-muted/40 rounded-xl border outline-none text-xs" />
                            </div>
                            <div>
                              <label className="text-[10px] block text-muted-foreground uppercase font-bold">Option D</label>
                              <input type="text" required value={questD} onChange={(e) => setQuestD(e.target.value)} className="w-full h-10 px-3 mt-1 bg-muted/40 rounded-xl border outline-none text-xs" />
                            </div>
                          </div>
                        )}

                        {questType === "MatchFollowing" && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-teal-600 uppercase">Match Pairs Configuration</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] block text-muted-foreground font-bold">Left Side A</label>
                                <input type="text" required placeholder="e.g. Acid" value={questA} onChange={(e) => setQuestA(e.target.value)} className="w-full h-10 px-3 mt-1 bg-muted/40 rounded-xl border outline-none text-xs" />
                              </div>
                              <div>
                                <label className="text-[10px] block text-muted-foreground font-bold">Right Side Match A</label>
                                <input type="text" required placeholder="e.g. Sour taste" value={questB} onChange={(e) => setQuestB(e.target.value)} className="w-full h-10 px-3 mt-1 bg-muted/40 rounded-xl border outline-none text-xs" />
                              </div>
                              <div>
                                <label className="text-[10px] block text-muted-foreground font-bold">Left Side B</label>
                                <input type="text" required placeholder="e.g. Base" value={questC} onChange={(e) => setQuestC(e.target.value)} className="w-full h-10 px-3 mt-1 bg-muted/40 rounded-xl border outline-none text-xs" />
                              </div>
                              <div>
                                <label className="text-[10px] block text-muted-foreground font-bold">Right Side Match B</label>
                                <input type="text" required placeholder="e.g. Bitter taste" value={questD} onChange={(e) => setQuestD(e.target.value)} className="w-full h-10 px-3 mt-1 bg-muted/40 rounded-xl border outline-none text-xs" />
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] block text-muted-foreground uppercase font-bold">Correct Answer</label>
                            {questType === "MCQ" && (
                              <select value={questCorrect} onChange={(e) => setQuestCorrect(e.target.value)} className="w-full h-10 px-3 mt-1 bg-muted/40 rounded-xl border outline-none text-xs">
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="D">D</option>
                              </select>
                            )}
                            {questType === "TrueFalse" && (
                              <select value={questCorrect} onChange={(e) => setQuestCorrect(e.target.value)} className="w-full h-10 px-3 mt-1 bg-muted/40 rounded-xl border outline-none text-xs">
                                <option value="True">True (સાચું)</option>
                                <option value="False">False (ખોટું)</option>
                              </select>
                            )}
                            {questType === "FillBlank" && (
                              <input
                                type="text"
                                required
                                placeholder="e.g. ઓક્સિડેશન"
                                value={questCorrect}
                                onChange={(e) => setQuestCorrect(e.target.value)}
                                className="w-full h-10 px-3 mt-1 bg-muted/40 rounded-xl border outline-none text-xs"
                              />
                            )}
                            {questType === "MatchFollowing" && (
                              <input
                                type="text"
                                required
                                placeholder="e.g. A with Bitter, B with Sour"
                                value={questCorrect}
                                onChange={(e) => setQuestCorrect(e.target.value)}
                                className="w-full h-10 px-3 mt-1 bg-muted/40 rounded-xl border outline-none text-xs"
                              />
                            )}
                            {(questType === "ShortAnswer" || questType === "LongAnswer") && (
                              <textarea
                                required
                                value={questCorrect}
                                onChange={(e) => setQuestCorrect(e.target.value)}
                                placeholder="વિદ્યાર્થીના ઉત્તર સરખામણી માટે આદર્શ જવાબ (Model Answer) લખો..."
                                className="w-full p-2.5 mt-1 bg-muted/40 rounded-xl border outline-none h-20 text-xs text-foreground resize-none"
                              />
                            )}
                          </div>
                          <div>
                            <label className="text-[10px] block text-muted-foreground uppercase font-bold">Difficulty</label>
                            <select value={questDifficulty} onChange={(e) => setQuestDifficulty(e.target.value as any)} className="w-full h-10 px-3 mt-1 bg-muted/40 rounded-xl border outline-none text-xs">
                              <option value="easy">Easy</option>
                              <option value="medium">Medium</option>
                              <option value="hard">Hard</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] block text-muted-foreground uppercase font-bold">Marks</label>
                            <input
                              type="number"
                              required
                              min="1"
                              value={questMarks}
                              onChange={(e) => setQuestMarks(Math.max(1, Number(e.target.value)))}
                              className="w-full h-10 px-3 mt-1 bg-muted/40 rounded-xl border outline-none text-xs font-semibold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] block text-muted-foreground uppercase font-bold">Active Status</label>
                            <select
                              value={questActive ? "active" : "inactive"}
                              onChange={(e) => setQuestActive(e.target.value === "active")}
                              className="w-full h-10 px-3 mt-1 bg-muted/40 rounded-xl border outline-none text-xs font-semibold"
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold text-muted-foreground block">Explanation / Solution details</label>
                          <input
                            type="text"
                            value={questExplanation}
                            onChange={(e) => setQuestExplanation(e.target.value)}
                            placeholder="આ ઓક્સિડેશન પ્રક્રિયા છે."
                            className="w-full h-10 px-3 mt-1 bg-muted/40 rounded-xl border outline-none text-xs"
                          />
                        </div>

                        <div className="flex items-center gap-1.5 pt-2">
                          <button type="submit" className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold flex items-center gap-1">
                            <Plus className="size-4" />
                            <span>{editingQuest ? "Update question" : "Save question"}</span>
                          </button>
                          {editingQuest && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingQuest(null);
                                setQuestText("");
                                setQuestA("");
                                setQuestB("");
                                setQuestC("");
                                setQuestD("");
                                setQuestExplanation("");
                              }}
                              className="px-4 py-2 border rounded-xl"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </form>
                    </div>

                    {/* Question Bank Visual Table, Excel Upload, Filter Header lists */}
                    <div className="bg-card border border-border rounded-3xl p-5 shadow-sm lg:col-span-2 space-y-5">
                      
                      {/* Bulk upload CSV and validation logs */}
                      <div className="bg-slate-50 dark:bg-slate-900 border border-dashed border-border rounded-2xl p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <h4 className="font-bold text-xs uppercase tracking-wider text-teal-600">CSV Bulk Upload and Validator</h4>
                            <p className="text-[10px] text-muted-foreground font-gu mt-0.5">
                              પહેલાથી બનાવેલ પ્રશ્નો વારંવાર કોપી-પેસ્ટ ટાળવા માટે સીધા CSV ફાઈલ દ્વારા અપલોડ કરો:
                            </p>
                          </div>
                          
                          <label className="cursor-pointer px-4.5 py-1.5 bg-card hover:bg-muted border border-border rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5 active:scale-95 transition">
                            <Upload className="size-3.5 text-teal-600" />
                            <span>Select CSV File</span>
                            <input
                              type="file"
                              accept=".csv"
                              onChange={handleCSVUpload}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Interactive toggle block for CSV formats */}
                        <div className="mt-2 text-right">
                          <button
                            type="button"
                            onClick={() => setShowCSVHelp(!showCSVHelp)}
                            className="text-[10px] font-bold text-teal-600 hover:underline inline-flex items-center gap-1 focus:outline-none"
                          >
                            {showCSVHelp ? "Hide CSV Template Guide ✕" : "Show CSV Template Guide & Format Instructions ✎"}
                          </button>
                        </div>

                        {showCSVHelp && (
                          <div className="mt-3 bg-card border rounded-xl p-3.5 text-[11px] text-foreground space-y-3 font-sans transition-all duration-300">
                            <div className="border-b pb-1.5">
                              <h5 className="font-bold text-teal-600">CSV Bulk Upload Import Format Rules (પ્રશ્નો અપલોડ કરવાના નિયમો)</h5>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Your CSV file must look like the following structure. Please read the format specifications for each type:
                              </p>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse min-w-[500px]">
                                <thead>
                                  <tr className="border-b bg-muted/40 text-[10px] uppercase font-bold text-muted-foreground">
                                    <th className="p-1 px-2 border">Column Name</th>
                                    <th className="p-1 px-2 border">MCQ Questions</th>
                                    <th className="p-1 px-2 border">Subjective Questions (Short/Long Answer)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="border-b">
                                    <td className="p-1.5 px-2 border font-mono font-bold text-rose-600">question</td>
                                    <td className="p-1.5 px-2 border">The full question text (e.g. "What is photosynthesis?")</td>
                                    <td className="p-1.5 px-2 border">The full subjective question text (e.g. "Explain working of solar panel")</td>
                                  </tr>
                                  <tr className="border-b">
                                    <td className="p-1.5 px-2 border font-mono font-semibold">questiontype</td>
                                    <td className="p-1.5 px-2 border">MCQ</td>
                                    <td className="p-1.5 px-2 border"><b>ShortAnswer</b> (ટૂંકા પ્રશ્નો) or <b>LongAnswer</b> (લાંબા પ્રશ્નો)</td>
                                  </tr>
                                  <tr className="border-b col-span-2">
                                    <td className="p-1.5 px-2 border font-mono text-muted-foreground">optiona, optionb, optionc, optiond</td>
                                    <td className="p-1.5 px-2 border">Provide corresponding choices. (At least Option A & B are required)</td>
                                    <td className="p-1.5 px-2 border text-muted-foreground italic">Keep empty (ખાલી રાખવું)</td>
                                  </tr>
                                  <tr className="border-b">
                                    <td className="p-1.5 px-2 border font-mono font-bold text-rose-600">correctanswer</td>
                                    <td className="p-1.5 px-2 border">Must be exactly A, B, C, or D</td>
                                    <td className="p-1.5 px-2 border text-emerald-600 font-medium">The ideal direct textual model/correct answer (e.g. "ગ્રીનહાઉસ કોન્સેપ્ટ...")</td>
                                  </tr>
                                  <tr className="border-b">
                                    <td className="p-1.5 px-2 border font-mono font-bold text-rose-600">difficulty</td>
                                    <td className="p-1.5 px-2 border" colSpan={2}>easy, medium, or hard</td>
                                  </tr>
                                  <tr className="border-b">
                                    <td className="p-1.5 px-2 border font-mono font-bold text-rose-600">subjectid</td>
                                    <td className="p-1.5 px-2 border" colSpan={2}>Correct Subject code matches from database (e.g. "sci-10")</td>
                                  </tr>
                                  <tr className="border-b">
                                    <td className="p-1.5 px-2 border font-mono font-bold text-rose-600">chapterid</td>
                                    <td className="p-1.5 px-2 border" colSpan={2}>Chapter designation code (e.g. "Ch-1")</td>
                                  </tr>
                                  <tr>
                                    <td className="p-1.5 px-2 border font-mono">medium</td>
                                    <td className="p-1.5 px-2 border" colSpan={2}>Gujarati or English (optional)</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            <div className="bg-teal-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-teal-100 text-[10px] space-y-1">
                              <p className="font-bold text-teal-700">💡 Quick Gujarati Guide (ટૂંકો માર્ગદર્શિકા):</p>
                              <p>• <b>ShortAnswer & LongAnswer (ટૂંકા અને લાંબા પ્રશ્નો)</b> માટે: <span className="font-mono">optionA</span>, <span className="font-mono">optionB</span>, <span className="font-mono">optionC</span>, <span className="font-mono">optionD</span> કોલમ ખાલી રાખવી અથવા કોલમ જ ના બનાવવી.</p>
                              <p>• <b>correctanswer</b> કોલમમાં કોઈ A/B/C/D નહીં, પણ સીધો જ સાચો જવાબ લખવો!</p>
                              <p>• <b>questiontype</b> કોલમમાં અનુક્રમે <code className="font-semibold text-rose-600 dark:text-rose-400">ShortAnswer</code> અથવા <code className="font-semibold text-rose-600 dark:text-rose-400">LongAnswer</code> લખવું.</p>
                            </div>
                          </div>
                        )}

                        {/* Inline report output logs */}
                        {importReport && (
                          <div className="mt-3 bg-card border rounded-xl p-3 text-[10px] space-y-1 mr-2">
                            <p className="font-extrabold text-teal-600">UPLOAD REPORT CARD SUMMARY:</p>
                            <p>Lines processed: {importReport?.totalRead}</p>
                            <p className="text-emerald-600 font-bold">Successfully imported: {importReport?.importedCount} questions.</p>
                            
                            {(importReport?.errors?.length ?? 0) > 0 && (
                              <div className="text-rose-500 font-semibold max-h-20 overflow-y-auto">
                                <b>Errors found ({importReport?.errors?.length}):</b>
                                {importReport?.errors?.map((err, idx) => <p key={idx}>{err}</p>)}
                              </div>
                            )}

                            {(importReport?.duplicates?.length ?? 0) > 0 && (
                              <div className="text-amber-600 font-semibold max-h-20 overflow-y-auto">
                                <b>Duplicate skipped questions ({importReport?.duplicates?.length}):</b>
                                {importReport?.duplicates?.map((dup, idx) => <p key={idx}>{dup}</p>)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Filter Search block */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 bg-muted/45 p-3 rounded-2xl text-xs font-semibold">
                        <div className="relative flex items-center h-10 bg-card border rounded-xl px-3 gap-2">
                          <Search className="size-4 text-muted-foreground shrink-0" />
                          <input
                            type="text"
                            value={questSearch}
                            onChange={(e) => setQuestSearch(e.target.value)}
                            placeholder="પ્રશ્ન લખાણ શોધો (Search)..."
                            className="bg-transparent outline-none text-xs w-full font-semibold"
                          />
                        </div>

                        <select
                          value={questFilterStd}
                          onChange={(e) => {
                            setQuestFilterStd(e.target.value);
                            setQuestFilterSub("all");
                            setQuestFilterChap("all");
                          }}
                          className="h-10 px-3 bg-card border rounded-xl outline-none focus:border-teal-500 text-xs font-semibold"
                        >
                          <option value="all">All Standards</option>
                          <option value="1">Std 1</option>
                          <option value="2">Std 2</option>
                          <option value="3">Std 3</option>
                          <option value="4">Std 4</option>
                          <option value="5">Std 5</option>
                          <option value="6">Std 6</option>
                          <option value="7">Std 7</option>
                          <option value="8">Std 8</option>
                          <option value="9">Std 9</option>
                          <option value="10">Std 10</option>
                        </select>

                        <select
                          value={questFilterSub}
                          onChange={(e) => {
                            setQuestFilterSub(e.target.value);
                            setQuestFilterChap("all");
                          }}
                          className="h-10 px-3 bg-card border rounded-xl outline-none focus:border-teal-500 text-xs font-semibold"
                        >
                          <option value="all">All Subjects</option>
                          {subjects
                            .filter(s => questFilterStd === "all" ? true : s.standard === questFilterStd)
                            .map(s => <option key={s.subjectId} value={s.subjectId}>{s.subjectName} (Std {s.standard})</option>)
                          }
                        </select>

                        <select
                          value={questFilterChap}
                          onChange={(e) => setQuestFilterChap(e.target.value)}
                          className="h-10 px-3 bg-card border rounded-xl outline-none focus:border-teal-500 text-xs font-semibold"
                        >
                          <option value="all">All Chapters</option>
                          {chapters
                            .filter(c => questFilterSub === "all" ? true : c.subjectId === questFilterSub)
                            .map(c => <option key={c.chapterId} value={c.chapterId}>{c.chapterName}</option>)
                          }
                        </select>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <label className="text-muted-foreground uppercase text-[10px]">Difficulty:</label>
                          <select
                            value={questFilterDiff}
                            onChange={(e) => setQuestFilterDiff(e.target.value)}
                            className="h-8 px-2 bg-card border rounded-lg text-xs"
                          >
                            <option value="all">All Difficulties</option>
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        </div>

                        {/* Items count indicator */}
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Showing {filteredQuestions.length} matching questions
                        </div>
                      </div>

                      {/* Real Questions Output Grid lists */}
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                        {paginatedQuestions.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground font-gu text-xs">
                            કોઈ પ્રશ્નો મળ્યા નથી. નવો પ્રશ્ન ઉમેરો અથવા CSV અપલોડ કરો!
                          </div>
                        ) : (
                          paginatedQuestions.map(q => {
                            const subObj = subjects.find(s => s.subjectId === q.subjectId);
                            const chapObj = chapters.find(c => c.chapterId === q.chapterId);
                            const finalType = q.questionType || "MCQ";
                            const qMarks = q.marks !== undefined ? q.marks : 1;
                            const isAct = q.active !== undefined ? q.active : true;
                            
                            return (
                              <div key={q.questionId} className={`p-3 border rounded-2xl space-y-2 ${isAct ? "bg-muted/20 border-border" : "bg-zinc-100/50 border-zinc-200 opacity-70"}`}>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex flex-wrap gap-1 items-center">
                                    <span className="text-[9px] uppercase font-bold tracking-wider rounded-md bg-teal-100 text-teal-800 dark:bg-teal-900 px-2 py-0.5 inline-block">
                                      {q.difficulty}
                                    </span>
                                    <span className="text-[9px] uppercase font-bold tracking-wider rounded-md bg-purple-100 text-purple-800 dark:bg-purple-900 px-2 py-0.5 inline-block">
                                      {finalType}
                                    </span>
                                    <span className="text-[9px] font-bold rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 inline-block">
                                      {qMarks} Mark{qMarks > 1 ? "s" : ""}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground ml-2">
                                      {subObj?.subjectName} • {chapObj?.chapterName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => {
                                        setEditingQuest(q);
                                        setQuestText(q.question);
                                        setQuestA(q.optionA || "");
                                        setQuestB(q.optionB || "");
                                        setQuestC(q.optionC || "");
                                        setQuestD(q.optionD || "");
                                        setQuestCorrect(q.correctAnswer);
                                        setQuestExplanation(q.explanation || "");
                                        setQuestDifficulty(q.difficulty);
                                        setQuestSubId(q.subjectId);
                                        setQuestChapId(q.chapterId);
                                        
                                        // new fields
                                        setQuestType(finalType as any);
                                        setQuestMarks(qMarks);
                                        setQuestActive(isAct);
                                      }}
                                      className="p-1 px-2 border rounded-lg text-[9px] font-bold text-teal-600 hover:bg-teal-50"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={async () => {
                                        const nextAct = !isAct;
                                        await AdminRepository.updateQuestion(user?.uid || "admin", user?.fullName || "Admin", q.questionId, { active: nextAct, status: nextAct ? "active" : "archived" });
                                        toast.success(nextAct ? "Question restored!" : "Question set inactive");
                                        loadAllData();
                                      }}
                                      className="p-1 px-2 border rounded-lg text-[9px] font-bold text-amber-600 hover:bg-amber-50"
                                    >
                                      {isAct ? "Set Inactive" : "Set Active"}
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (confirm("Are you sure you want to hard Delete this question from the database?")) {
                                          await AdminRepository.deleteQuestion(user?.uid || "admin", user?.fullName || "Admin", q.questionId);
                                          toast.success("Question deleted permanently.");
                                          loadAllData();
                                        }
                                      }}
                                      className="p-1 px-2 border rounded-lg text-[9px] font-bold text-rose-600 hover:bg-rose-50"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                                
                                <p className="text-xs font-bold leading-relaxed">{q.question}</p>
                                
                                {(finalType === "MCQ" || finalType === "TrueFalse" || finalType === "FillBlank") && (
                                  <div className="grid grid-cols-2 gap-1.5 text-[10px] text-muted-foreground pl-2 border-l-2 border-border">
                                    <p>A. {q.optionA}</p>
                                    <p>B. {q.optionB}</p>
                                    {(q.optionC && q.optionC !== "" && finalType !== "TrueFalse") && <p>C. {q.optionC}</p>}
                                    {(q.optionD && q.optionD !== "" && finalType !== "TrueFalse") && <p>D. {q.optionD}</p>}
                                  </div>
                                )}

                                {finalType === "MatchFollowing" && (
                                  <div className="grid grid-cols-2 gap-1.5 text-[10px] text-muted-foreground pl-2 border-l-2 border-border">
                                    <p>Left A. {q.optionA} ↔ Right: {q.optionB}</p>
                                    <p>Left B. {q.optionC} ↔ Right: {q.optionD}</p>
                                  </div>
                                )}

                                <p className="text-[10px] font-bold text-emerald-600">Correct Answer: {q.correctAnswer} {q.explanation && `• Reason: ${q.explanation}`}</p>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Pagination Controls Footer */}
                      {(() => {
                        const totalQuestPages = Math.max(1, Math.ceil(filteredQuestions.length / questPerPage));
                        if (filteredQuestions.length > questPerPage) {
                          return (
                            <div className="flex items-center justify-between border-t border-border pt-3 mt-3 text-xs font-semibold text-muted-foreground bg-muted/20 p-2.5 rounded-xl">
                              <button
                                type="button"
                                disabled={questPage === 1}
                                onClick={() => setQuestPage(prev => Math.max(1, prev - 1))}
                                className="px-3 py-1.5 border rounded-lg bg-card hover:bg-muted font-bold text-[10px] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                              >
                                Previous
                              </button>
                              <span>Page {questPage} of {totalQuestPages}</span>
                              <button
                                type="button"
                                disabled={questPage === totalQuestPages}
                                onClick={() => setQuestPage(prev => Math.min(totalQuestPages, prev + 1))}
                                className="px-3 py-1.5 border rounded-lg bg-card hover:bg-muted font-bold text-[10px] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                              >
                                Next
                              </button>
                            </div>
                          );
                        }
                        return null;
                      })()}

                    </div>
                  </div>

                </div>
              )}

              {/* TAB 4: DAILY EXAM SCHEDULER */}
              {activeTab === "exams" && (
                <ExamSchedulerManager
                  subjects={subjects}
                  chapters={chapters}
                  questions={questions}
                  exams={exams}
                  results={results}
                  students={students}
                  onRefresh={loadAllData}
                  currentUser={user}
                />
              )}
              {/* REMOVED INLINE EXAMS */}
              {false && activeTab === "exams" && (
                <div className="space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Exam creator scheduler form with unique active cap logic */}
                    <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
                      <div>
                        <h3 className="font-bold text-sm tracking-wider uppercase text-teal-600">
                          {editingExam ? "Edit Scheduled Exam settings" : "Scheduler New Daily Exam"}
                        </h3>
                        <p className="text-xs text-muted-foreground font-gu mt-0.5">
                          વિદ્યાર્થીઓ માટે દૈનિક પરીક્ષાઓનું શીડ્યુલ બજારમાં મૂકો.
                        </p>
                      </div>

                      <form onSubmit={handleExamSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-extrabold uppercase text-muted-foreground">Subject ID</label>
                            <select
                              value={examSubId}
                              onChange={(e) => setExamSubId(e.target.value)}
                              className="w-full h-11 px-3 mt-1 bg-muted/40 rounded-xl border outline-none text-xs font-semibold"
                            >
                              {subjects.map(s => (
                                <option key={s.subjectId} value={s.subjectId}>{s.subjectName} (Std {s.standard})</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-extrabold uppercase text-muted-foreground">chapter ID</label>
                            <select
                              value={examChapId}
                              onChange={(e) => setExamChapId(e.target.value)}
                              className="w-full h-11 px-3 mt-1 bg-muted/40 rounded-xl border outline-none text-xs font-semibold"
                            >
                              {filteredChaptersForExamSubject.map(c => (
                                <option key={c.chapterId} value={c.chapterId}>{c.chapterName}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-extrabold uppercase text-muted-foreground">Calendar Date</label>
                            <input
                              type="date"
                              required
                              value={examDate}
                              onChange={(e) => setExamDate(e.target.value)}
                              className="w-full h-11 px-3 mt-1 bg-muted/40 rounded-xl border outline-none text-xs font-semibold text-foreground"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-extrabold uppercase text-muted-foreground">Examiner's Full Name</label>
                            <input
                              type="text"
                              required
                              value={examinerName}
                              onChange={(e) => setExaminerName(e.target.value)}
                              placeholder="e.g. ડૉ. સતિષ આચાર્ય"
                              className="w-full h-11 px-3 mt-1 bg-muted/40 rounded-xl border outline-none text-xs font-semibold"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-extrabold uppercase text-muted-foreground">Duration (Minutes)</label>
                            <input
                              type="number"
                              required
                              min={5}
                              max={180}
                              value={examDuration}
                              onChange={(e) => setExamDuration(Number(e.target.value))}
                              className="w-full h-11 px-3 mt-1 bg-muted/40 rounded-xl border outline-none text-xs font-semibold"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-extrabold uppercase text-muted-foreground">Total Questions length</label>
                            <input
                              type="number"
                              required
                              min={1}
                              max={100}
                              value={examQuestionsCount}
                              onChange={(e) => setExamQuestionsCount(Number(e.target.value))}
                              className="w-full h-11 px-3 mt-1 bg-muted/40 rounded-xl border outline-none text-xs font-semibold"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-extrabold uppercase text-muted-foreground block">Exam Status</label>
                          <select
                            value={examStatus}
                            onChange={(e) => setExamStatus(e.target.value as any)}
                            className="w-full h-11 px-3 mt-1 bg-muted/45 rounded-xl border outline-none text-xs font-semibold"
                          >
                            <option value="scheduled">Scheduled (પત્ર આયોજન)</option>
                            <option value="active">Active (પરીક્ષા ચાલુ - One per date allowed)</option>
                            <option value="closed">Closed (પૂરી થયેલ)</option>
                            <option value="cancelled">Cancelled (રદ કરેલ)</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          <button
                            type="submit"
                            className="px-4.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1"
                          >
                            <Plus className="size-4" />
                            <span>{editingExam ? "Save Changes" : "Broadcast Exam Paper"}</span>
                          </button>
                          {editingExam && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingExam(null);
                                setExamDate("");
                                setExaminerName("");
                              }}
                              className="px-4 py-2 border border-border rounded-xl text-xs font-semibold hover:bg-muted"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </form>
                    </div>

                    {/* Live Exams Dashboard lists */}
                    <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
                      <h3 className="font-bold text-sm tracking-wider uppercase text-teal-600 block">Exams History database ({exams.length})</h3>
                      <div className="space-y-3 max-h-[460px] overflow-y-auto">
                        {exams.length === 0 ? (
                          <p className="text-center py-20 text-xs text-muted-foreground font-gu">કોઈ પરીક્ષાઓ આયોજિત નથી.</p>
                        ) : (
                          exams.map(e => {
                            const subObj = subjects.find(s => s.subjectId === e.subjectId);
                            const statusColor = e.status === "active" ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-slate-100 text-slate-700 border-slate-200";
                            return (
                              <div key={e.examId} className="p-3 bg-muted/20 border border-border rounded-2xl relative flex flex-col gap-1 text-xs">
                                <div className="flex justify-between items-center gap-2 mb-1">
                                  <span className={`text-[9px] uppercase font-bold border rounded-md px-2 py-0.5 ${statusColor}`}>
                                    {e.status}
                                  </span>
                                  <p className="text-[10px] text-muted-foreground font-mono">Date: {e.examDate}</p>
                                </div>
                                <h4 className="font-bold text-sm">{subObj?.subjectName || "Subject: " + e.subjectId}</h4>
                                <p className="text-xs text-muted-foreground font-gu">પરીક્ષક: {e.examinerId ?? "મુખ્ય સંચાલક"}</p>
                                <p className="text-[11px] text-muted-foreground">Duration: {e.duration} mins • Qs length: {e.totalQuestions} Qs</p>
                                
                                <div className="flex items-center gap-1.5 pt-2 border-t border-border mt-2.5">
                                  <button
                                    onClick={() => {
                                      setEditingExam(e);
                                      setExamSubId(e.subjectId);
                                      setExamChapId(e.chapterId);
                                      setExamDate(e.examDate);
                                      setExamDuration(e.duration);
                                      setExamQuestionsCount(e.totalQuestions);
                                      setExaminerName(e.examinerId || "");
                                      setExamStatus(e.status);
                                    }}
                                    className="p-1 px-3 border rounded-lg text-[10px] font-semibold text-teal-600 hover:bg-teal-50"
                                  >
                                    Edit Settings
                                  </button>
                                  {e.status === "active" ? (
                                    <button
                                      onClick={async () => {
                                        await AdminRepository.updateExam(user?.uid || "admin", user?.fullName || "Admin", e.examId, { status: "closed" });
                                        toast.success("Exam closed successfully!");
                                        loadAllData();
                                      }}
                                      className="p-1 px-3 border rounded-lg text-[10px] font-semibold text-rose-600 hover:bg-rose-50"
                                    >
                                      Force Close
                                    </button>
                                  ) : (
                                    <button
                                      onClick={async () => {
                                        const ok = await AdminRepository.updateExam(user?.uid || "admin", user?.fullName || "Admin", e.examId, { status: "active" });
                                        if (ok) {
                                          toast.success("Exam set to active successfully!");
                                          loadAllData();
                                        } else {
                                          toast.error("DUPLICATE ACTIVE EXAM PREVENTED! You already have an active exam scheduled for this date.");
                                        }
                                      }}
                                      className="p-1 px-3 border rounded-lg text-[10px] font-semibold text-emerald-600 hover:bg-emerald-50"
                                    >
                                      Make Active
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* TAB 5: STUDENTS AND RESULTS */}
              {(activeTab as any) === "students" && (
                <div className="space-y-6">
                  
                  {/* Grid control panels widgets list */}
                  <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border">
                      <div>
                        <h3 className="font-extrabold text-sm uppercase text-teal-600 tracking-wider">Registered Student Accounts & Exam Metrics</h3>
                        <p className="text-xs text-muted-foreground font-gu mt-0.5">
                          દાખલ થયેલ તમામ વિદ્યાર્થી પ્રોફાઇલ, વિગતવાર ક્રમાંક, સિદ્ધિ અને બ્લોગ સેવાઓ:
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => exportToCSV("students")}
                          className="px-3.5 py-1.5 bg-muted hover:bg-muted/80 text-xs font-bold rounded-xl inline-flex items-center gap-1"
                        >
                          <Download className="size-3.5 text-teal-600" />
                          <span>Export Students CSV</span>
                        </button>
                        <button
                          onClick={() => exportToCSV("results")}
                          className="px-3.5 py-1.5 bg-muted hover:bg-muted/80 text-xs font-bold rounded-xl inline-flex items-center gap-1"
                        >
                          <Download className="size-3.5 text-blue-600" />
                          <span>Export Results CSV</span>
                        </button>
                        <button
                          onClick={() => exportToCSV("leaderboard")}
                          className="px-3.5 py-1.5 bg-muted hover:bg-muted/80 text-xs font-bold rounded-xl inline-flex items-center gap-1"
                        >
                          <Download className="size-3.5 text-emerald-600" />
                          <span>Export Leaderboard CSV</span>
                        </button>
                      </div>
                    </div>

                    {/* Filter searching student bar */}
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <div className="relative flex-1 w-full flex items-center h-10 bg-muted/40 rounded-xl px-3 border gap-2">
                        <Search className="size-4 text-muted-foreground shrink-0" />
                        <input
                          type="text"
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          placeholder="વિદ્યાર્થી નામ અથવા મોબાઈલ... (Search name or mobile)"
                          className="bg-transparent outline-none text-xs font-semibold w-full"
                        />
                      </div>

                      <select
                        value={studentFilterStd}
                        onChange={(e) => setStudentFilterStd(e.target.value)}
                        className="w-full sm:w-auto h-10 px-3 bg-muted/40 border rounded-xl text-xs font-semibold outline-none"
                      >
                        <option value="all">All Standards</option>
                        <option value="1">ધોરણ 1</option>
                        <option value="2">ધોરણ 2</option>
                        <option value="3">ધોરણ 3</option>
                        <option value="4">ધોરણ 4</option>
                        <option value="5">ધોરણ 5</option>
                        <option value="6">ધોરણ 6</option>
                        <option value="7">ધોરણ 7</option>
                        <option value="8">ધોરણ 8</option>
                        <option value="9">ધોરણ 9</option>
                        <option value="10">ધોરણ 10</option>
                      </select>
                    </div>

                    {/* Main Users Account database sheet list output */}
                    <div className="overflow-x-auto rounded-2xl border border-border">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-muted-soft dark:bg-slate-900 border-b border-border font-bold text-muted-foreground uppercase text-[10px]">
                            <th className="p-4.5">Full Name</th>
                            <th className="p-4.5">Mobile Number</th>
                            <th className="p-4.5">Village / School</th>
                            <th className="p-4.5">Standard</th>
                            <th className="p-4.5">Current Status</th>
                            <th className="p-4.5">Quiz Attendance Count</th>
                            <th className="p-4.5">System Access Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredStudents.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-muted-foreground font-gu">કોઈ વિદ્યાર્થીઓ ડેટાબેઝ રેકોર્ડ સાથે સરખામણી થતા નથી.</td>
                            </tr>
                          ) : (
                            filteredStudents.map(s => {
                              const stdResultsList = results.filter(r => r.studentId === s.uid);
                              const subCount = stdResultsList.length;
                              const statusPill = s.status === "blocked" 
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200" 
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200";

                              return (
                                <tr key={s.uid} className="hover:bg-muted/15 transition font-semibold text-slate-700 dark:text-slate-200">
                                  <td className="p-4.5">
                                    <p className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">{s.fullName}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono">UID: {s.uid}</p>
                                  </td>
                                  <td className="p-4.5 text-medium">{s.mobile}</td>
                                  <td className="p-4.5 text-muted-foreground">
                                    <p className="truncate max-w-[150px]">{s.village}</p>
                                    <p className="truncate max-w-[200px] text-[10px]">{s.school}</p>
                                  </td>
                                  <td className="p-4.5">Std {s.standard}</td>
                                  <td className="p-4.5">
                                    <span className={`text-[10px] uppercase font-bold border px-2 py-0.5 rounded-full ${statusPill}`}>
                                      {s.status}
                                    </span>
                                  </td>
                                  <td className="p-4.5 font-bold font-mono text-center sm:text-left">{subCount} Quiz papers</td>
                                  <td className="p-4.5">
                                    <button
                                      onClick={() => toggleStudentStatus(s.uid, s.status)}
                                      className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold active:scale-95 transition ${
                                        s.status === "blocked" ? "text-emerald-700 hover:bg-emerald-50" : "text-rose-700 hover:bg-rose-50 border-rose-200"
                                      }`}
                                    >
                                      {s.status === "blocked" ? "Approve Access" : "Block Access"}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Historical Results Subsystem Audit Logs list */}
                    <div className="pt-4 border-t border-border mt-4">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-teal-600 block mb-3.5">Recent Student Submissions history</h4>
                      <div className="space-y-2.5 max-h-60 overflow-y-auto">
                        {results.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-6 text-center">કોઈ ટેસ્ટ સબમિશન ઇતિહાસ મળ્યો નથી.</p>
                        ) : (
                          results.map(r => {
                            const std = students.find(s => s.uid === r.studentId);
                            return (
                              <div key={r.resultId} className="p-3 bg-muted/20 border rounded-2xl flex items-center justify-between text-xs font-semibold gap-3">
                                <div>
                                  <p className="font-bold text-sm text-foreground">{std?.fullName || "Student: " + r.studentId}</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">Subject: {r.subject} • Chapter: {r.chapter} • Date: {r.examDate}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-extrabold text-teal-600">{r.obtainedMarks} / {r.totalQuestions} Marks</p>
                                  <span className="text-[10px] text-muted-foreground font-mono">Percentage: {r.percentage}%</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* TAB 6: PUSH NOTIFICATION CENTRE */}
              {(activeTab as any) === "notifications" && (
                <div className="space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Send / Broadcast Panel */}
                    <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
                      <div>
                        <h3 className="font-bold text-sm tracking-wider uppercase text-teal-600">Broadcast Personalized Notification</h3>
                        <p className="text-xs text-muted-foreground font-gu mt-0.5">
                          તમામ અથવા મર્યાદિત ધોરણના સબ્સ્ક્રાઇબર વિદ્યાર્થીઓને ત્વરિત સમાચાર સંદેશાઓ મોકલો:
                        </p>
                      </div>

                      <form onSubmit={handleBroadcastNotification} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] uppercase font-bold text-muted-foreground block">Target Standard Audience</label>
                            <select
                              value={notifTargetStd}
                              onChange={(e) => setNotifTargetStd(e.target.value)}
                              className="w-full h-11 px-3 mt-1 bg-muted/45 rounded-xl border outline-none text-xs font-semibold"
                            >
                              <option value="all">આખા ગુજરાતના વિદ્યાર્થીઓ (All Standards)</option>
                              <option value="1">ધોરણ 1 ના વિદ્યાર્થીઓ</option>
                              <option value="2">ધોરણ 2 ના વિદ્યાર્થીઓ</option>
                              <option value="3">ધોરણ 3 ના વિદ્યાર્થીઓ</option>
                              <option value="4">ધોરણ 4 ના વિદ્યાર્થીઓ</option>
                              <option value="5">ધોરણ 5 ના વિદ્યાર્થીઓ</option>
                              <option value="6">ધોરણ 6 ના વિદ્યાર્થીઓ</option>
                              <option value="7">ધોરણ 7 ના વિદ્યાર્થીઓ</option>
                              <option value="8">ધોરણ 8 ના વિદ્યાર્થીઓ</option>
                              <option value="9">ધોરણ 9 ના વિદ્યાર્થીઓ</option>
                              <option value="10">ધોરણ 10 ના વિદ્યાર્થીઓ</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] uppercase font-bold text-muted-foreground block">Notification Type</label>
                            <select
                              value={notifType}
                              onChange={(e) => setNotifType(e.target.value)}
                              className="w-full h-11 px-3 mt-1 bg-muted/45 rounded-xl border outline-none text-xs font-semibold"
                            >
                              <option value="exam">Morning Exam Alert (પરીક્ષા સમાચાર)</option>
                              <option value="revision">Evening Revision Remind (પુનરાવર્તન ટકોર)</option>
                              <option value="achievement">New Achievement Announcement (સિદ્ધિઓ વાતો)</option>
                              <option value="announcement">General News Post (સામાન્ય જાહેરાત)</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold text-muted-foreground block">Personalized Alert Title</label>
                          <input
                            type="text"
                            required
                            value={notifTitle}
                            onChange={(e) => setNotifTitle(e.target.value)}
                            placeholder="e.g. 📚 આજનો ટેસ્ટ તૈયાર છે!"
                            className="w-full h-11 px-4 mt-1 bg-muted/40 rounded-xl border outline-none text-xs font-semibold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold text-muted-foreground block">Message Body Content</label>
                          <textarea
                            required
                            value={notifMessage}
                            onChange={(e) => setNotifMessage(e.target.value)}
                            placeholder="નમસ્તે સરકારી શાળાઓના હોશિયાર વિદ્યાર્થીઓ... આજનો વિજ્ઞાનનો ટેસ્ટ લાઈવ થઇ ગયો છે."
                            className="w-full p-4 mt-1 bg-muted/40 rounded-xl border outline-none h-24 text-xs font-semibold resize-none"
                          />
                        </div>

                        <div className="pt-2">
                          <button
                            type="submit"
                            className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-extrabold shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition"
                          >
                            <Send className="size-4" />
                            <span>Broadcast Alert now!</span>
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Historical Sent Push Messages lists */}
                    <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
                      <div>
                        <h3 className="font-bold text-sm tracking-wider uppercase text-teal-600">Push Messages Sent History Log ({notifHistory.length})</h3>
                        <p className="text-xs text-muted-foreground font-gu mt-0.5">
                          છેલ્લા બ્રોડકાસ્ટ પુશ એલર્ટ લિગ્સ અને ક્લિક ખોલવાનો ટ્રાફિક રેટિંગ્સ:
                        </p>
                      </div>

                      <div className="space-y-2.5 max-h-[380px] overflow-y-auto">
                        {notifHistory.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-16 text-center">કોઈ સંદેશા સેશન લૉગ ઉપલબ્ધ નથી.</p>
                        ) : (
                          notifHistory.map(h => {
                            const std = students.find(s => s.uid === h.studentId);
                            const openedPill = h.opened 
                              ? "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400 border-green-200" 
                              : "bg-slate-100 text-slate-700 dark:bg-slate-900 border-slate-200";
                            return (
                              <div key={h.id} className="p-3 bg-muted/20 border rounded-2xl flex flex-col gap-1 text-xs">
                                <div className="flex justify-between items-center gap-2">
                                  <span className={`text-[8px] uppercase font-bold border rounded px-1.5 py-0.5 ${openedPill}`}>
                                    {h.opened ? "OPENED (CLICKED)" : "SENT (UNREAD)"}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">Date: {new Date(h.sentAt).toLocaleDateString()}</span>
                                </div>
                                <h4 className="font-bold text-sm">{h.title}</h4>
                                <p className="text-muted-foreground text-xs font-gu">{h.message}</p>
                                <p className="text-[9px] text-muted-foreground font-mono mt-1">Recipient: {std?.fullName || h.studentId} ({h.type})</p>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* TAB 7: ADMINISTRATIVE AUDIT LOGS */}
              {(activeTab as any) === "audit_logs" && (
                <div className="space-y-6">
                  
                  <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border">
                      <div>
                        <h3 className="font-extrabold text-teal-600 uppercase text-sm tracking-widest leading-none">Security Audit Logs</h3>
                        <p className="text-xs text-muted-foreground font-gu mt-1">
                          સંચાલકો દ્વારા તમામ એક્શનો (પરીક્ષા ઉમેરવી, વિદ્યાર્થી બ્લોક કરવો વગેરે) નુ લેઝર લોગ:
                        </p>
                      </div>

                      <button
                        onClick={() => exportToCSV("audit_logs")}
                        className="px-3.5 py-1.5 bg-muted hover:bg-muted/80 text-xs font-bold rounded-xl inline-flex items-center gap-1 shrink-0"
                      >
                        <Download className="size-3.5 text-teal-600" />
                        <span>Export Audit Logs CSV</span>
                      </button>
                    </div>

                    {/* Historical Ledger Table lists */}
                    <div className="space-y-2 max-h-[480px] overflow-y-auto">
                      {auditLogs.length === 0 ? (
                        <p className="text-center py-20 text-muted-foreground text-xs">કોઈ ઓડિટ રેકોર્ડ ઉપલબ્ધ નથી.</p>
                      ) : (
                        auditLogs.map(log => (
                          <div key={log.id} className="p-3 bg-muted/20 border rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                            <div className="space-y-0.5">
                              <p className="font-bold text-sm text-foreground">{log.action}</p>
                              <p className="text-[10px] text-muted-foreground">Admin: {log.adminName} • Affected Record ID: {log.affectedRecord}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[10px] text-muted-foreground font-mono bg-card px-2 py-1 border rounded-lg inline-block">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              )}
            </>
          )}
        </div>

      </main>
    </div>
  );
}

// Sidebar Button component item
interface SidebarBtnProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  subText?: string; // Legacy
  sub?: string;
}
function SidebarBtn({ active, onClick, icon, label, sub }: SidebarBtnProps) {
  const activeStyles = "bg-teal-500/10 text-teal-600 dark:bg-teal-600/20 dark:text-teal-400 ring-1 ring-teal-500/20";
  const hoverStyles = "hover:bg-muted text-muted-foreground hover:text-foreground";
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition ${active ? activeStyles : hoverStyles}`}
    >
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-bold leading-tight truncate">{label}</p>
        {sub && <p className="text-[9px] text-muted-foreground font-gu block truncate leading-none mt-0.5">{sub}</p>}
      </div>
    </button>
  );
}

// Summary Metrics Dynamic Card Widget helper
interface DashboardCardProps {
  icon: React.ReactNode;
  title: string;
  titleGu: string;
  value: string | number;
  subText?: string; // Legacy
  sub?: string;
}
function DashboardCard({ icon, title, titleGu, value, sub }: DashboardCardProps) {
  return (
    <div className="bg-card border border-border rounded-3xl p-4 shadow-sm flex flex-col justify-between gap-3 min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground uppercase truncate max-w-[120px]" title={title}>{title}</span>
        <div className="size-8 rounded-xl bg-muted/40 flex items-center justify-center shrink-0">
          {icon}
        </div>
      </div>

      <div className="space-y-0.5">
        <p className="text-2xl font-extrabold tracking-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground font-gu truncate" title={titleGu}>{titleGu}</p>
        {sub && <span className="text-[9px] text-muted-foreground block truncate">{sub}</span>}
      </div>
    </div>
  );
}

// Left side layout helper widget items
interface HeroStatProps {
  icon: React.ReactNode;
  value: string | number;
  labelGu: string;
}
function HeroStat({ icon, value, labelGu }: HeroStatProps) {
  return (
    <div className="bg-white/10 rounded-2xl p-2.5 text-center flex flex-col justify-center items-center gap-0.5">
      <div className="text-white/75">{icon}</div>
      <p className="text-base font-extrabold leading-none mt-0.5">{value}</p>
      <p className="text-[9px] text-white/80 font-gu leading-none mt-0.5">{labelGu}</p>
    </div>
  );
}
