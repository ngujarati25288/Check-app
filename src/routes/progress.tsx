import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, Target, AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/FirebaseProvider";

export const Route = createFileRoute("/progress")({
  head: () => ({ meta: [{ title: "Progress Report" }] }),
  component: Progress,
});

function Progress() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [totalExams, setTotalExams] = useState<number>(0);
  const [avgPercentage, setAvgPercentage] = useState<number>(0);
  const [mistakesCount, setMistakesCount] = useState<number>(0);
  const [masteredCount, setMasteredCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Dynamic datasets computed from real Firestore data
  const [trendData, setTrendData] = useState<{ date: string; percentage: number }[]>([]);
  const [subjectPerformanceData, setSubjectPerformanceData] = useState<{ subject: string; percent: number }[]>([]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let active = true;
    const loadDynamicProgress = async () => {
      try {
        const { ResultRepository, MistakeRepository } = await import("@/lib/db");
        
        // 1. Fetch real student results
        const results = await ResultRepository.getUserResults(user.uid);
        if (!active) return;
        
        const count = results.length;
        setTotalExams(count);
        
        if (count > 0) {
          const avg = Math.round(results.reduce((s: number, r: any) => s + (r.percentage || 0), 0) / count);
          setAvgPercentage(avg);

          // Compute Trend Data from exam results
          // Group by exam date and calculate daily average score
          const dateGroup: Record<string, { total: number; count: number }> = {};
          results.forEach(r => {
            let dateKey = r.examDate || "";
            // If examDate is empty, try extracting split date from submittedAt OR default to today
            if (!dateKey && r.submittedAt) {
              dateKey = typeof r.submittedAt === "string" ? r.submittedAt.split("T")[0] : "";
            }
            if (!dateKey) {
              dateKey = new Date().toISOString().split("T")[0];
            }
            
            if (!dateGroup[dateKey]) {
              dateGroup[dateKey] = { total: 0, count: 0 };
            }
            dateGroup[dateKey].total += (r.percentage || 0);
            dateGroup[dateKey].count += 1;
          });

          const sortedTrend = Object.entries(dateGroup)
            .map(([date, data]) => ({
              date,
              percentage: Math.round(data.total / data.count),
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          setTrendData(sortedTrend);

          // Compute Subject Performance Data
          // Show only subjects actually attempted by the student
          const subjectMap: Record<string, { totalPercent: number; count: number }> = {};
          results.forEach(r => {
            const sName = r.subject || "Unknown Subject";
            if (!subjectMap[sName]) {
              subjectMap[sName] = { totalPercent: 0, count: 0 };
            }
            subjectMap[sName].totalPercent += (r.percentage || 0);
            subjectMap[sName].count += 1;
          });

          const computedSubjects = Object.entries(subjectMap).map(([subject, data]) => ({
            subject,
            percent: Math.round(data.totalPercent / data.count),
          }));

          setSubjectPerformanceData(computedSubjects);
        } else {
          setAvgPercentage(0);
          setTrendData([]);
          setSubjectPerformanceData([]);
        }

        // 2. Fetch real student mistakes
        const mistakesList = await MistakeRepository.getUserMistakes(user.uid);
        if (!active) return;
        setMistakesCount(mistakesList.length);
        setMasteredCount(mistakesList.filter((m: any) => m.mastered).length);
        setPendingCount(mistakesList.filter((m: any) => !m.mastered).length);
        
        setLoading(false);
      } catch (err) {
        console.error("Progress report dynamic metrics load error:", err);
        if (active) {
          setLoading(false);
        }
      }
    };
    
    loadDynamicProgress();
    return () => {
      active = false;
    };
  }, [user?.uid]);

  const stats = [
    { label: "Total Exams", value: totalExams, icon: Target, tone: "primary" },
    { label: "Avg %", value: `${avgPercentage}%`, icon: TrendingUp, tone: "success" },
    { label: "Mistakes", value: mistakesCount, icon: AlertTriangle, tone: "destructive" },
    { label: "Mastered", value: masteredCount, icon: CheckCircle2, tone: "success" },
    { label: "Revision Pending", value: pendingCount, icon: RotateCcw, tone: "warning" },
  ];

  // Helper to format date cleanly like "12 Jun" or "10-Jun"
  const getDisplayDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
      }
    } catch (e) {}
    return dateStr;
  };

  // Limit recent trend history size up to last 10 distinct dates to prevent squishing on mobile views
  const slicedTrendData = useMemo(() => {
    return trendData.slice(-10);
  }, [trendData]);

  // Max value calculation for trend chart rendering
  const trendMax = useMemo(() => {
    return slicedTrendData.length > 0 
      ? Math.max(...slicedTrendData.map(t => t.percentage), 10) 
      : 100;
  }, [slicedTrendData]);

  // Average score change comparison if there are 2 or more dates
  const trendDiff = useMemo(() => {
    if (slicedTrendData.length >= 2) {
      return slicedTrendData[slicedTrendData.length - 1].percentage - slicedTrendData[0].percentage;
    }
    return 0;
  }, [slicedTrendData]);

  if (loading) {
    return (
      <AppShell title="Progress Report" titleGu="પ્રગતિ અહેવાલ" back="/dashboard">
        <div className="px-5 py-8 flex flex-col items-center justify-center h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-xs text-muted-foreground mt-3 font-semibold font-gu">માહિતી લોડ થઈ રહી છે...</p>
          <p className="text-[10px] text-muted-foreground">Loading progress reports...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Progress Report" titleGu="પ્રગતિ અહેવાલ" back="/dashboard">
      <div className="px-5 py-4 space-y-5">
        
        {/* Stats Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s, i) => {
            const Icon = s.icon;
            const tones: Record<string, string> = {
              primary: "bg-primary-soft text-primary",
              success: "bg-success-soft text-success",
              destructive: "bg-destructive-soft text-destructive",
              warning: "bg-warning/15 text-warning-foreground",
            };
            return (
              <div
                key={s.label}
                className="bg-card border border-border rounded-3xl p-4 shadow-card animate-[slide-up_0.35s_ease-out]"
                style={{ animationDelay: `${i * 40}ms`, animationFillMode: "backwards" }}
              >
                <div className={`size-10 rounded-2xl flex items-center justify-center ${tones[s.tone]}`}>
                  <Icon className="size-5" />
                </div>
                <p className="mt-3 text-2xl font-bold">{s.value}</p>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Dynamic Analytics & Charts Sections */}
        {totalExams === 0 ? (
          <div className="bg-card border border-border rounded-3xl p-8 shadow-card flex flex-col items-center justify-center text-center py-12 animate-[fade-in_0.3s_ease-out]">
            <div className="size-16 rounded-3xl bg-muted flex items-center justify-center mb-4">
              <TrendingUp className="size-8 text-muted-foreground/60" />
            </div>
            <h3 className="text-base font-extrabold text-foreground">No progress data available yet</h3>
            <p className="text-xs text-muted-foreground font-gu mt-1.5 max-w-xs leading-relaxed">
              હજુ સુધી કોઈ પ્રગતિ ડેટા ઉપલબ્ધ નથી. તમારી પ્રગતિ અને વિષયવર પ્રદર્શન જોવા માટે કૃપા કરીને પહેલા કોઈ પરીક્ષા પૂર્ણ કરો.
            </p>
            <p className="text-xs text-muted-foreground mt-2 max-w-xs leading-relaxed">
              Please complete an exam first to see your learning progress and subject-wise performance here.
            </p>
          </div>
        ) : (
          <div className="space-y-5 animate-[fade-in_0.35s_ease-out]">
            {/* Real Score Trend Graph */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Exams Timeline</p>
                  <p className="font-semibold text-sm">Score Trend (વિકાસ ક્રમ)</p>
                </div>
                {trendDiff > 0 && <span className="text-xs text-success font-semibold">▲ +{trendDiff}%</span>}
                {trendDiff < 0 && <span className="text-xs text-destructive font-semibold">▼ {trendDiff}%</span>}
                {trendDiff === 0 && slicedTrendData.length >= 2 && <span className="text-xs text-muted-foreground font-semibold">0% change</span>}
              </div>
              
              <div className="mt-6 flex items-end justify-between gap-2.5 h-36">
                {slicedTrendData.map((item, i) => (
                  <div key={item.date} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[10px] font-extrabold text-primary font-mono">{item.percentage}%</span>
                    <div
                      className="w-full rounded-t-xl gradient-primary transition-all duration-500"
                      style={{ height: `${(item.percentage / trendMax) * 80}%`, minHeight: 8 }}
                      title={`Date: ${item.date}, Avg: ${item.percentage}%`}
                    />
                    <span className="text-[9px] font-medium text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-full" title={item.date}>
                      {getDisplayDate(item.date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Real Subject Wise Performance Progress Bars */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-card">
              <p className="font-semibold text-sm">Subject Wise Performance</p>
              <p className="text-xs text-muted-foreground font-gu mb-4">વિષય મુજબ પ્રદર્શન (પરીક્ષા ગુણ આધારિત)</p>
              
              <div className="space-y-4">
                {subjectPerformanceData.map((s) => (
                  <div key={s.subject} className="group">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-bold text-slate-700 dark:text-slate-300 group-hover:text-primary transition">{s.subject}</span>
                      <span className="font-extrabold text-primary">{s.percent}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full gradient-primary transition-all duration-700"
                        style={{ width: `${s.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
