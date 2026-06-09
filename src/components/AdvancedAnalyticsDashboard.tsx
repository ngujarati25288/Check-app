import { useState, useMemo } from "react";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  TrendingUp, 
  AlertTriangle, 
  Activity, 
  School, 
  MapPin, 
  Award, 
  BookOpen, 
  HelpCircle, 
  Download, 
  ShieldAlert, 
  RefreshCw, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownRight,
  UserCheck,
  FileSpreadsheet,
  FileText
} from "lucide-react";
import { 
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

interface Props {
  studentAnalytics: StudentAnalytics[];
  subjectAnalytics: SubjectAnalytics[];
  chapterAnalytics: ChapterAnalytics[];
  questionAnalytics: QuestionAnalytics[];
  schoolAnalytics: SchoolAnalytics[];
  villageAnalytics: VillageAnalytics[];
  standardAnalytics: StandardAnalytics[];
  learningTrends: LearningTrends | null;
  analyticsReports: AnalyticsReport[];
  onRefresh: () => Promise<void>;
  userRole: "admin" | "super_admin";
}

type NestedTab = "overview" | "students" | "syllabus" | "schools" | "reports";

export function AdvancedAnalyticsDashboard({
  studentAnalytics,
  subjectAnalytics,
  chapterAnalytics,
  questionAnalytics,
  schoolAnalytics,
  villageAnalytics,
  standardAnalytics,
  learningTrends,
  analyticsReports,
  onRefresh,
  userRole
}: Props) {
  const [nestedTab, setNestedTab] = useState<NestedTab>("overview");
  const [trendDays, setTrendDays] = useState<7 | 30 | 90>(7);
  const [exportCat, setExportCat] = useState("students");
  const [exportFormat, setExportFormat] = useState("csv");
  const [refreshing, setRefreshing] = useState(false);

  // Filter searches
  const [stSearch, setStSearch] = useState("");
  const [chSearch, setChSearch] = useState("");

  const COLORS = ["#0d9488", "#0284c7", "#4f46e5", "#ca8a04", "#dc2626", "#16a34a"];

  const handleSyncClick = async () => {
    try {
      setRefreshing(true);
      await onRefresh();
      toast.success("શૈક્ષણિક વિશ્લેષણ ડેટાબેઝ સફળતાપૂર્વક અપડેટ કરવામાં આવ્યો!");
    } catch (_) {
      toast.error("વિશ્લેષણ રન નિષ્ફળ!");
    } finally {
      setRefreshing(false);
    }
  };

  // 1. Calculations & Summaries for Overview
  const stats = useMemo(() => {
    const totalStudents = studentAnalytics.length || 1;
    const avgScore = studentAnalytics.length > 0 
      ? Math.round(studentAnalytics.reduce((acc, st) => acc + st.averageScore, 0) / totalStudents)
      : 74;

    const highRiskStudents = studentAnalytics.filter(st => st.riskLevel === "high");
    const mediumRiskStudents = studentAnalytics.filter(st => st.riskLevel === "medium");

    const topSchool = schoolAnalytics.length > 0
      ? [...schoolAnalytics].sort((a, b) => b.averageScore - a.averageScore)[0]?.schoolName
      : "સરસ્વતી વિદ્યાલય";

    const topVillage = villageAnalytics.length > 0
      ? [...villageAnalytics].sort((a, b) => b.averagePerformance - a.averagePerformance)[0]?.villageName
      : "વડતાલ";

    const weakSubject = subjectAnalytics.length > 0
      ? [...subjectAnalytics].sort((a, b) => a.averageScore - b.averageScore)[0]?.subjectName
      : "Mathematics";

    return {
      totalStudents,
      avgScore,
      highRiskCount: highRiskStudents.length,
      mediumRiskCount: mediumRiskStudents.length,
      topSchool,
      topVillage,
      weakSubject
    };
  }, [studentAnalytics, schoolAnalytics, villageAnalytics, subjectAnalytics]);

  // Reactive trends chart data based on day toggle
  const trendsChartData = useMemo(() => {
    if (!learningTrends) return [];
    if (trendDays === 7) return learningTrends.trends7d || [];
    if (trendDays === 30) return learningTrends.trends30d || [];
    return learningTrends.trends9d || [];
  }, [learningTrends, trendDays]);

  // 2. Export Generator (CSV, Excel mockup, PDF mockup)
  const triggerExport = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = `dle_${exportCat}_report_${Date.now()}`;

    if (exportCat === "students") {
      headers = ["Student ID", "Name", "School", "Village", "Average Score", "Best Subject", "Revisions Pending", "Risk Status", "Performance Score"];
      rows = studentAnalytics.map(st => [
        st.studentId,
        st.studentName,
        st.school,
        st.village,
        st.averageScore,
        st.bestSubject,
        st.pendingRevisions,
        st.riskLevel,
        st.performanceScore
      ]);
    } else if (exportCat === "schools") {
      headers = ["School Name", "Total Students", "Average Score", "Participation %", "Revision Completion %", "Rank Pos"];
      rows = schoolAnalytics.map(sc => [
        sc.schoolName,
        sc.totalStudents,
        sc.averageScore,
        sc.participationPercent,
        sc.revisionCompletionPercent,
        sc.leaderboardPosition
      ]);
    } else if (exportCat === "villages") {
      headers = ["Village Name", "Total Students", "Average Performance %", "Participation Rate", "Mastery Rate", "Village Rank"];
      rows = villageAnalytics.map(vl => [
        vl.villageName,
        vl.totalStudents,
        vl.averagePerformance,
        vl.participationRate,
        vl.masteryRate,
        vl.villageRank
      ]);
    } else if (exportCat === "subjects") {
      headers = ["Subject Name", "Average Score", "Hardest Chapter", "Revision Success Rate", "Participation %"];
      rows = subjectAnalytics.map(su => [
        su.subjectName,
        su.averageScore,
        su.mostDifficultChapterName,
        su.revisionSuccessRate,
        su.studentParticipationPercent
      ]);
    } else {
      headers = ["Report ID", "Timestamp", "Report Type", "Total Students Active", "Global Avg Score", "Top School", "Weakest Subject"];
      rows = analyticsReports.map(rp => [
        rp.id,
        rp.createdAt,
        rp.reportType,
        rp.totalStudentsActive,
        rp.globalAvgScore,
        rp.topPerformingSchool,
        rp.weakestSubject
      ]);
    }

    if (exportFormat === "csv" || exportFormat === "excel") {
      // Create CSV string
      const csvStr = [
        headers.join(","),
        ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
      ].join("\n");

      const mime = exportFormat === "csv" ? "text/csv" : "application/vnd.ms-excel";
      const blob = new Blob(["\ufeff" + csvStr], { type: `${mime};charset=utf-8;` });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}.${exportFormat === "csv" ? "csv" : "xls"}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`${exportCat.toUpperCase()} dataset exported as downloadable file!`);
    } else {
      // PDF print or detailed mock
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Daily Learning Exam - Analytics Document</title>
              <style>
                body { font-family: sans-serif; padding: 40px; color: #333; }
                h1 { border-bottom: 2px solid #0d9488; padding-bottom: 15px; color: #0d9488; font-size: 24px; }
                table { width: 100%; border-collapse: collapse; margin-top: 25px; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
                th { background-color: #f4f4f7; color: #111; }
                .footer { margin-top: 50px; font-size: 11px; color: #666; text-align: center; border-t: 1px solid #ddd; padding-top: 15px; }
              </style>
            </head>
            <body>
              <h1>Daily Learning Exam - ${exportCat.toUpperCase()} REPORT</h1>
              <p>Generated At: ${new Date().toLocaleString()}</p>
              <p>Scope Access Permitted: ${userRole.toUpperCase()} ADMINISTRATIVE AUDIT</p>
              <table>
                <thead>
                  <tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>
                </thead>
                <tbody>
                  ${rows.map(r => `<tr>${r.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}
                </tbody>
              </table>
              <div class="footer">
                Daily Learning Exam Administrative Verification Audit Log. Strictly Confidential.
              </div>
              <script>window.print();</script>
            </body>
          </html>
        `);
        printWindow.document.close();
        toast.success("Print dynamic PDF template initiated!");
      } else {
        toast.error("Popup window blocked! Please permit screen dialogs.");
      }
    }
  };

  return (
    <div className="space-y-6" id="phase14-analytics-dashboard">
      
      {/* Title Panel Header controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border border-border rounded-3xl p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight">Advanced Educational Analytics</h2>
          <p className="text-xs text-muted-foreground mt-0.5 font-gu">શૈક્ષણિક પ્રગતિ ચાર્ટ અને સ્કૂલ-વિલેજ પરિણામોનું વિશ્લેષણ</p>
        </div>
        <div className="flex items-center gap-2 self-stretch sm:self-center">
          <button
            onClick={handleSyncClick}
            disabled={refreshing}
            className="flex-1 sm:flex-none px-4 py-2 border border-border hover:bg-muted font-semibold text-xs rounded-2xl flex items-center justify-center gap-1.5 transition disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Recalculating..." : "Sync Engine Now"}</span>
          </button>
        </div>
      </div>

      {/* Primary Analytics Navigation */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none border-b border-border">
        {(["overview", "students", "syllabus", "schools", "reports"] as NestedTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setNestedTab(tab)}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-2xl transition capitalize border-b-2 shrink-0 ${
              nestedTab === tab 
                ? "border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-500/5" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "overview" && "Dashboard Overview"}
            {tab === "students" && "Student Performance & Risk"}
            {tab === "syllabus" && "Subject & Chapter Mastery"}
            {tab === "schools" && "School & Village Rank"}
            {tab === "reports" && "Exports & Automated Reports"}
          </button>
        ))}
      </div>

      {/* NESTED CONTENT BAR */}

      {/* NESTED 1: OVERVIEW & SYSTEM TRENDS */}
      {nestedTab === "overview" && (
        <div className="space-y-6">
          {/* Key Metrics Bento Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
              <div className="size-10 rounded-2xl bg-teal-50 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <Activity className="size-5" />
              </div>
              <p className="text-2xl font-black mt-3">{stats.totalStudents}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Active Students</p>
            </div>

            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
              <div className="size-10 rounded-2xl bg-sky-50 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <TrendingUp className="size-5" />
              </div>
              <p className="text-2xl font-black mt-3">{stats.avgScore}%</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Global Average Score</p>
            </div>

            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
              <div className="size-10 rounded-2xl bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center">
                <ShieldAlert className="size-5" />
              </div>
              <p className="text-2xl font-black mt-3 text-red-600 dark:text-red-400">{stats.highRiskCount}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">High Risk Students</p>
            </div>

            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
              <div className="size-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                A
              </div>
              <p className="text-2xl font-black mt-3 text-teal-800 dark:text-teal-300 truncate text-sm">{stats.weakSubject}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Lowest Subject Avg</p>
            </div>
          </div>

          {/* Interactive Trends Chart */}
          <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wide">Daily Learning Exam: Trend Engine</h3>
                <span className="text-xs text-muted-foreground font-gu">સ્કોર અને સહભાગિતા સમય અંતરાલ</span>
              </div>
              <div className="flex bg-muted p-1 rounded-2xl border border-border self-stretch sm:self-center">
                {([7, 30, 90] as const).map(days => (
                  <button
                    key={days}
                    onClick={() => setTrendDays(days)}
                    className={`flex-1 sm:flex-none px-3.5 py-1.5 text-[10px] uppercase font-black rounded-xl transition ${
                      trendDays === days ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendsChartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="date" stroke="#888888" fontSize={11} />
                  <YAxis stroke="#888888" fontSize={11} domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #eee" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" name="Academic Score %" dataKey="scoreTrend" stroke="#0d9488" strokeWidth={2.5} activeDot={{ r: 6 }} />
                  <Line name="Daily Revisions" dataKey="revisionTrend" stroke="#4f46e5" strokeWidth={1.5} />
                  <Line name="Student Participation" dataKey="participationTrend" stroke="#ca8a04" strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Organizations Summary (Schools & Villages) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
              <h3 className="font-extrabold text-sm uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <School className="size-4 text-teal-600" />
                <span>School Performance Leaderboard</span>
              </h3>
              <div className="space-y-4">
                {schoolAnalytics.map((sch) => (
                  <div key={sch.id} className="flex items-center justify-between p-3.5 bg-muted/30 rounded-2xl hover:bg-muted/50 transition">
                    <div>
                      <p className="font-bold text-xs">{sch.schoolName}</p>
                      <span className="text-[10px] text-muted-foreground uppercase">{sch.totalStudents} Registered Students</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="font-extrabold text-xs text-teal-600 block">{sch.averageScore}%</span>
                        <span className="text-[9px] text-muted-foreground uppercase block">Avg Score</span>
                      </div>
                      <span className="text-xs bg-teal-500/10 text-teal-800 dark:text-teal-300 font-extrabold size-6 rounded-full flex items-center justify-center">
                        #{sch.leaderboardPosition}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
              <h3 className="font-extrabold text-sm uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <MapPin className="size-4 text-sky-600" />
                <span>Village Performance Summary</span>
              </h3>
              <div className="space-y-4">
                {villageAnalytics.map((vil) => (
                  <div key={vil.id} className="flex items-center justify-between p-3.5 bg-muted/30 rounded-2xl hover:bg-muted/50 transition">
                    <div>
                      <p className="font-bold text-xs">{vil.villageName}</p>
                      <span className="text-[10px] text-muted-foreground uppercase">{vil.totalStudents} Registered Students</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="font-extrabold text-xs text-sky-600 block">{vil.averagePerformance}%</span>
                        <span className="text-[9px] text-muted-foreground uppercase block">Avg Performance</span>
                      </div>
                      <span className="text-xs bg-sky-500/10 text-sky-800 dark:text-sky-300 font-extrabold size-6 rounded-full flex items-center justify-center">
                        #{vil.villageRank}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NESTED 2: STUDENT RISK ANALYSIS */}
      {nestedTab === "students" && (
        <div className="space-y-6">
          {/* Active Risk Banner */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2 w-10 h-10 shrink-0 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm tracking-wide">Automated Student Risk Detection System</h4>
                <p className="text-xs text-muted-foreground font-gu mt-1">
                  વિદ્યાર્થીઓના પર્ફોર્મન્સ સ્કોર અને રિવિઝન વિલંબના આધારે જોખમી સ્તરનું સ્વચાલિત આકલન.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="text-[10px] bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 px-3.5 py-1.5 rounded-full font-black uppercase">
                {stats.highRiskCount} High Risk
              </span>
              <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-3.5 py-1.5 rounded-full font-black uppercase">
                {stats.mediumRiskCount} Med Risk
              </span>
            </div>
          </div>

          {/* Student Search and Filters */}
          <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  placeholder="વિદ્યાર્થી શોધો (Search by student name...)"
                  value={stSearch}
                  onChange={e => setStSearch(e.target.value)}
                  className="w-full text-xs bg-muted border border-border rounded-2xl py-3 pl-10 pr-4 outline-none focus:ring-1 focus:ring-teal-500"
                />
                <HelpCircle className="size-4 text-muted-foreground absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* Students Risk Roster list */}
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/70 text-muted-foreground font-extrabold border-b border-border text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">School</th>
                    <th className="py-3 px-4">Village</th>
                    <th className="py-3 px-4 text-center">Avg Score %</th>
                    <th className="py-3 px-4 text-center">Revisions Pending</th>
                    <th className="py-3 px-4 text-center">Rank</th>
                    <th className="py-3 px-4 text-center">Index Score</th>
                    <th className="py-3 px-4 text-center">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {studentAnalytics
                    .filter(st => stSearch ? st.studentName.toLowerCase().includes(stSearch.toLowerCase()) : true)
                    .map((st) => (
                      <tr key={st.studentId} className="hover:bg-muted/30 transition">
                        <td className="py-3.5 px-4 font-bold">{st.studentName}</td>
                        <td className="py-3.5 px-4 text-muted-foreground">{st.school}</td>
                        <td className="py-3.5 px-4 text-muted-foreground">{st.village}</td>
                        <td className="py-3.5 px-4 text-center font-semibold">{st.averageScore}%</td>
                        <td className="py-3.5 px-4 text-center font-semibold text-amber-600">{st.pendingRevisions}</td>
                        <td className="py-3.5 px-4 text-center font-bold">
                          <span className="flex items-center justify-center gap-1">
                            {st.currentRank}
                            {st.rankTrend === "up" && <ArrowUpRight className="size-3 text-emerald-500" />}
                            {st.rankTrend === "down" && <ArrowDownRight className="size-3 text-red-500" />}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-teal-600 dark:text-teal-400">{st.performanceScore}/100</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase text-white ${
                            st.riskLevel === "high" ? "bg-red-600" :
                            st.riskLevel === "medium" ? "bg-amber-500" : "bg-emerald-600"
                          }`}>
                            {st.riskLevel}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* NESTED 3: SYLLABUS & MASTERY CHAPTERS */}
      {nestedTab === "syllabus" && (
        <div className="space-y-6">
          {/* Subject Performance Breakdown cards */}
          <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
            <h3 className="font-extrabold text-sm uppercase tracking-wider mb-5">Subject Performance Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjectAnalytics.map((sub, i) => (
                <div key={sub.id} className="p-4 border border-border/80 bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-xs uppercase">{sub.subjectName}</span>
                      <span className="text-[10px] bg-teal-500/10 text-teal-800 dark:text-teal-300 font-bold px-2.5 py-0.5 rounded-full">Std {sub.standard}</span>
                    </div>
                    <p className="text-3xl font-black text-slate-800 dark:text-slate-200 mt-2">{sub.averageScore}%</p>
                    <span className="text-[10px] text-muted-foreground uppercase">Average Obtained Percentage</span>
                  </div>

                  <div className="border-t border-border mt-4 pt-3.5 space-y-2 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Revision Success:</span>
                      <span className="font-bold text-emerald-600">{sub.revisionSuccessRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Concepts Mastered:</span>
                      <span className="font-bold text-teal-600">{sub.masteryRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Highest-Risk Chapter:</span>
                      <span className="font-bold truncate text-red-600">{sub.mostDifficultChapterName}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chapter Analysis Listing */}
          <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-extrabold text-sm uppercase tracking-wider">Chapter Risk and Difficulty Analytics</h3>
              <p className="text-xs text-muted-foreground mt-0.5 font-gu">પ્રકરણ મુજબ કસોટી સ્તર</p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead className="bg-muted">
                  <tr className="border-b border-border text-[10px] uppercase font-extrabold text-muted-foreground tracking-wider">
                    <th className="py-3 px-4">Chapter Name</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4 text-center">Total Attempts</th>
                    <th className="py-3 px-4 text-center">Average Marks</th>
                    <th className="py-3 px-4 text-center">Revision Success %</th>
                    <th className="py-3 px-4 text-center">Mastery %</th>
                    <th className="py-3 px-4 text-center">Chapter Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {chapterAnalytics.map((ch) => (
                    <tr key={ch.chapterId} className="hover:bg-muted/20 transition">
                      <td className="py-3.5 px-4 font-bold">{ch.chapterName}</td>
                      <td className="py-3.5 px-4 text-muted-foreground">{ch.subjectName}</td>
                      <td className="py-3.5 px-4 text-center font-semibold">{ch.totalAttempts}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800 dark:text-slate-200">{ch.averageMarks}%</td>
                      <td className="py-3.5 px-4 text-center text-emerald-600 font-semibold">{ch.revisionSuccessPercent}%</td>
                      <td className="py-3.5 px-4 text-center text-teal-600 font-semibold">{ch.masteryPercent}%</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase text-white ${
                          ch.riskLevel === "high" ? "bg-red-600 animate-pulse" :
                          ch.riskLevel === "medium" ? "bg-amber-500" : "bg-emerald-600"
                        }`}>
                          {ch.riskLevel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Question Level Analytics */}
          <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-extrabold text-sm uppercase tracking-wider">High Risk / Confusing Questions Bank</h3>
              <p className="text-xs text-muted-foreground mt-0.5 font-gu">ભૂલ સુધારણા અને રિવિઝન સફળતા દર</p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead className="bg-muted">
                  <tr className="border-b border-border text-[10px] uppercase font-extrabold text-muted-foreground tracking-wider">
                    <th className="py-3 px-4">Question Text</th>
                    <th className="py-3 px-4">Subject & Chapter</th>
                    <th className="py-3 px-4 text-center">Times Asked</th>
                    <th className="py-3 px-4 text-center">Correct Rate</th>
                    <th className="py-3 px-4 text-center">Fail Rate</th>
                    <th className="py-3 px-4 text-center">Question Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {questionAnalytics.map((q) => (
                    <tr key={q.id} className="hover:bg-muted/20 transition">
                      <td className="py-3.5 px-4 font-bold md:max-w-md truncate">{q.questionText}</td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        <span className="block font-bold">{q.subjectName}</span>
                        <span className="text-[10px]">{q.chapterName}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold">{q.timesAsked}</td>
                      <td className="py-3.5 px-4 text-center text-emerald-600 font-semibold">{q.correctPercent}%</td>
                      <td className="py-3.5 px-4 text-center text-red-600 font-semibold">{q.wrongPercent}%</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase text-white ${
                          q.category === "difficult" ? "bg-red-600" :
                          q.category === "confusing" ? "bg-indigo-600" :
                          q.category === "improved" ? "bg-emerald-600" : "bg-teal-600"
                        }`}>
                          {q.category}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* NESTED 4: SCHOOLS & ORGANIZATIONAL LEADERBOARD */}
      {nestedTab === "schools" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Detailed School Roster */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
              <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-3">
                <School className="size-4" />
                <span>Primary Schools Directory</span>
              </h3>
              <div className="divide-y divide-border">
                {schoolAnalytics.map((sch) => (
                  <div key={sch.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-extrabold text-xs text-teal-800 dark:text-teal-300">{sch.schoolName}</p>
                      <p className="text-[10px] text-muted-foreground font-gu mt-0.5 mt-0.5">કુલ વિદ્યાર્થીઓ: {sch.totalStudents}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-xs font-black block text-teal-600">{sch.averageScore}%</span>
                        <span className="text-[9px] text-muted-foreground uppercase">Average Score</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold block">{sch.participationPercent}%</span>
                        <span className="text-[9px] text-muted-foreground uppercase">Participation</span>
                      </div>
                      <span className="text-xs bg-muted border border-border text-foreground font-black size-8 rounded-full flex items-center justify-center">
                        #{sch.leaderboardPosition}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Village Roster */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
              <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-3">
                <MapPin className="size-4" />
                <span>Primary Villages Directory</span>
              </h3>
              <div className="divide-y divide-border">
                {villageAnalytics.map((vl) => (
                  <div key={vl.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-extrabold text-xs text-sky-800 dark:text-sky-300">{vl.villageName}</p>
                      <p className="text-[10px] text-muted-foreground font-gu mt-0.5 mt-0.5">કુલ સરકારી શાળાઓમાં અભ્યાસ કર્તા: {vl.totalStudents} બાળકો</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-xs font-black block text-sky-600">{vl.averagePerformance}%</span>
                        <span className="text-[9px] text-muted-foreground uppercase">Avg Performance</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold block">{vl.masteryRate}%</span>
                        <span className="text-[9px] text-muted-foreground uppercase">Mastery Rate</span>
                      </div>
                      <span className="text-xs bg-muted border border-border text-foreground font-black size-8 rounded-full flex items-center justify-center">
                        #{vl.villageRank}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NESTED 5: AUTOMATED REPORT ARCHIVES & EXPORTS */}
      {nestedTab === "reports" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Export Center Form Panel */}
          <div className="bg-card border border-border rounded-3xl p-5 shadow-sm lg:col-span-1 space-y-5">
            <h3 className="font-extrabold text-sm uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Download className="size-4 text-teal-600" />
              <span>Data Export Panel</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">Select Report Category</label>
                <select
                  value={exportCat}
                  onChange={e => setExportCat(e.target.value)}
                  className="w-full bg-muted border border-border p-2.5 rounded-xl font-bold"
                >
                  <option value="students">Student Performance & Risk Report</option>
                  <option value="schools">Secondary School Metrics Report</option>
                  <option value="villages">Gram Panchayat Village Report</option>
                  <option value="subjects">Core Subjects Performance Report</option>
                  <option value="reports">Historical Periodical Activity Report</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Export Target Format</label>
                <select
                  value={exportFormat}
                  onChange={e => setExportFormat(e.target.value)}
                  className="w-full bg-muted border border-border p-2.5 rounded-xl font-bold"
                >
                  <option value="csv">Standard CSV File Format (.csv)</option>
                  <option value="excel">Microsoft Excel Sheet (.xls)</option>
                  <option value="pdf">Printable PDF Layout Document (.pdf)</option>
                </select>
              </div>

              <button
                onClick={triggerExport}
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Download className="size-4" />
                <span>Download Document</span>
              </button>
            </div>
          </div>

          {/* Automated System Scheduled Reports Ledger */}
          <div className="bg-card border border-border rounded-3xl p-5 shadow-sm lg:col-span-2 space-y-4">
            <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet className="size-4 text-teal-600" />
              <span>Cloud Server Generated System Reports</span>
            </h3>
            <p className="text-xs text-muted-foreground font-gu">
              ક્લાઉડ ટાઈમર શેડ્યૂલર દ્વારા દરરોજ/દર મહિને સ્વયં સંકલિત થતાં અહેવાલોની બુકલેટ.
            </p>

            <div className="divide-y divide-border">
              {analyticsReports.map((report) => (
                <div key={report.id} className="py-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase text-white ${
                        report.reportType === "daily" ? "bg-teal-500" :
                        report.reportType === "weekly" ? "bg-indigo-500" : "bg-purple-600"
                      }`}>
                        {report.reportType}
                      </span>
                      <h4 className="font-extrabold text-xs">{report.title}</h4>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{new Date(report.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground italic font-gu">"{report.summary}"</p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] bg-muted/40 p-2.5 rounded-xl">
                    <div>
                      <span className="text-muted-foreground uppercase block">Active Kids:</span>
                      <strong className="font-bold text-slate-800 dark:text-slate-200">{report.totalStudentsActive} Students</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground uppercase block">Avg Score:</span>
                      <strong className="font-bold text-teal-600 block">{report.globalAvgScore}% Score</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground uppercase block">Top School:</span>
                      <strong className="font-bold block truncate">{report.topPerformingSchool}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground uppercase block">Critical Chapter:</span>
                      <strong className="font-bold block text-red-600 truncate">Math વાસ્તવિક સંખ્યાઓ</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
