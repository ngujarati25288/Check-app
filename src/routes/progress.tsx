import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, Target, AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { student, subjectPerformance } from "@/lib/mockData";

export const Route = createFileRoute("/progress")({
  head: () => ({ meta: [{ title: "Progress Report" }] }),
  component: Progress,
});

function Progress() {
  const stats = [
    { label: "Total Exams", value: student.totalExams, icon: Target, tone: "primary" },
    { label: "Avg %", value: `${student.avgPercentage}%`, icon: TrendingUp, tone: "success" },
    { label: "Mistakes", value: 23, icon: AlertTriangle, tone: "destructive" },
    { label: "Mastered", value: 156, icon: CheckCircle2, tone: "success" },
    { label: "Revision Pending", value: 12, icon: RotateCcw, tone: "warning" },
  ];

  // mock 7-day trend
  const trend = [62, 70, 65, 78, 82, 76, 88];
  const max = Math.max(...trend);

  return (
    <AppShell title="Progress Report" titleGu="પ્રગતિ અહેવાલ" back="/dashboard">
      <div className="px-5 py-4 space-y-5">
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

        {/* Trend */}
        <div className="bg-card border border-border rounded-3xl p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Last 7 days</p>
              <p className="font-semibold">Score Trend</p>
            </div>
            <span className="text-xs text-success font-semibold">▲ +12%</span>
          </div>
          <div className="mt-4 flex items-end justify-between gap-2 h-32">
            {trend.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-xl gradient-primary transition-all"
                  style={{ height: `${(v / max) * 100}%`, minHeight: 8 }}
                />
                <span className="text-[10px] text-muted-foreground">D{i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Subject wise */}
        <div className="bg-card border border-border rounded-3xl p-5 shadow-card">
          <p className="font-semibold mb-1">Subject Wise Performance</p>
          <p className="text-xs text-muted-foreground font-gu mb-4">વિષય મુજબ પ્રદર્શન</p>
          <div className="space-y-3.5">
            {subjectPerformance.map((s) => (
              <div key={s.subject}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{s.subject}</span>
                  <span className="text-muted-foreground">{s.percent}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
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
    </AppShell>
  );
}
