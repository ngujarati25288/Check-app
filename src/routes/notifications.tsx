import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { 
  FileText, 
  RotateCcw, 
  Trophy, 
  TrendingUp, 
  AlertTriangle, 
  UserMinus, 
  Check, 
  CheckCheck, 
  Loader2, 
  BarChart3, 
  Terminal, 
  Eye, 
  ShieldAlert, 
  Zap, 
  Calendar,
  Send,
  Bell
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/FirebaseProvider";
import { NotificationsRepository } from "@/lib/db";
import { NotificationHistoryItem } from "@/types";
import { toast } from "sonner";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications - Daily Exam" }] }),
  component: NotificationsComponent,
});

const iconMap = {
  exam: { Icon: FileText, tone: "bg-primary/20 text-primary border-primary/30" },
  revision: { Icon: RotateCcw, tone: "bg-amber-100 text-amber-700 border-amber-200" },
  achievement: { Icon: Trophy, tone: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  rank: { Icon: TrendingUp, tone: "bg-purple-100 text-purple-800 border-purple-200" },
  streak: { Icon: AlertTriangle, tone: "bg-rose-100 text-rose-800 border-rose-200" },
  inactive_3: { Icon: UserMinus, tone: "bg-slate-100 text-slate-700 border-slate-200" },
  inactive_7: { Icon: UserMinus, tone: "bg-slate-100 text-slate-700 border-slate-200" },
  inactive_15: { Icon: UserMinus, tone: "bg-slate-100 text-slate-700 border-slate-200" },
} as const;

function NotificationsComponent() {
  const { user } = useAuth();
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "read">("all");
  const [analytics, setAnalytics] = useState({
    sent: 0,
    opened: 0,
    clickRate: 0,
    inactiveRecoveryRate: 45
  });

  const studentId = user?.uid || "demo-user-123";

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await NotificationsRepository.getNotificationHistory(studentId);
      setHistory(data);
      const stats = await NotificationsRepository.getAnalytics(studentId);
      setAnalytics(stats);
    } catch (e) {
      console.error(e);
      toast.error("Failed to fetch notification history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [studentId]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await NotificationsRepository.markAsOpened(id);
      toast.success("Notification marked as read");
      
      // Update local state smoothly
      setHistory(prev => prev.map(item => item.id === id ? { ...item, opened: true } : item));
      const stats = await NotificationsRepository.getAnalytics(studentId);
      setAnalytics(stats);
    } catch (_) {
      toast.error("Process failed.");
    }
  };

  const handleMarkAllRead = async () => {
    if (history.filter(h => !h.opened).length === 0) {
      toast.info("All notifications are already read!");
      return;
    }
    try {
      await NotificationsRepository.markAllAsOpened(studentId);
      toast.success("All notifications marked as read!");
      setHistory(prev => prev.map(item => ({ ...item, opened: true })));
      const stats = await NotificationsRepository.getAnalytics(studentId);
      setAnalytics(stats);
    } catch (_) {
      toast.error("Mark all as read failed.");
    }
  };

  const handleSimulate = async (type: string) => {
    try {
      const activeCountToday = history.filter(n => {
        const todayStr = new Date().toISOString().split('T')[0];
        return n.sentAt.split('T')[0] === todayStr;
      }).length;

      if (activeCountToday >= 3) {
        toast.error("Daily smart cap reached! (Max 3 notifications/day allowed to avoid spamming students)");
        return;
      }

      toast.loading(`Drafting & dispatching personalized ${type} alert...`, { id: "sim" });
      const extra: any = {};
      
      if (type === "achievement") {
        extra.badge = "ઝડપી વાચક (Speed Reader)";
      } else if (type === "rank") {
        extra.rank = "૩જો (Rank 3)";
      }

      const success = await NotificationsRepository.triggerMessageSimulation(studentId, type, extra);
      if (success) {
        toast.success(`Personalized ${type} alert sent!`, { id: "sim" });
        await loadNotifications();
      } else {
        toast.error("Daily alert cap reached (Max 3/day). Skip due to anti-spam controls.", { id: "sim" });
      }
    } catch (err) {
      console.error(err);
      toast.error("Notification dispatch failed.", { id: "sim" });
    }
  };

  const filteredHistory = history.filter(item => {
    if (activeTab === "unread") return !item.opened;
    if (activeTab === "read") return item.opened;
    return true;
  });

  return (
    <AppShell title="Notifications Center" titleGu="સૂચના કેન્દ્ર" back="/dashboard">
      <div className="px-4 py-4 space-y-5 pb-28">
        
        {/* Retention Analytics Dashboard Card */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-5 shadow-lg border border-indigo-500/20 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 font-black text-6xl select-none uppercase tracking-widest leading-none translate-x-5 translate-y-5 text-indigo-100">
            FCM
          </div>
          
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="size-5 text-indigo-400" />
            <h2 className="font-bold text-sm tracking-wide text-indigo-200">ENGAGEMENT & RETENTION PORTAL</h2>
          </div>

          <p className="text-xs text-indigo-200/80 mb-4 font-gu">
            દૈનિક કાર્યક્રમ સૂચના પ્રણાલી - વિદ્યાર્થી ભાગીદારી અહેવાલ
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
              <span className="text-[10px] text-indigo-300 block">sent notifications</span>
              <span className="text-xl font-bold">{analytics.sent}</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
              <span className="text-[10px] text-green-300 block">opened rate (clicks)</span>
              <span className="text-xl font-bold text-green-300">{analytics.clickRate}%</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
              <span className="text-[10px] text-amber-300 block">recovery rate (idle)</span>
              <span className="text-xl font-bold text-amber-300">{analytics.inactiveRecoveryRate}%</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
              <span className="text-[10px] text-indigo-300 block">daily throttle status</span>
              <span className="text-xs font-semibold text-emerald-400">
                {history.filter(n => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  return n.sentAt.split('T')[0] === todayStr;
                }).length} / 3 SENT
              </span>
            </div>
          </div>
        </div>

        {/* Developer simulation hub */}
        <div className="bg-card border border-border rounded-3xl p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Terminal className="size-4 text-primary" />
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">ADMIN SCHEDULER & FCM TRIGGERS</span>
          </div>
          
          <p className="text-xs text-muted-foreground mb-3 font-gu">
            નીચેના બટનો દ્વારા શેડ્યૂલ કરેલ ક્લાઉડ ફંક્શન્સ અને વિવિધ રીટેન્શન નોટિફિકેશન ઉત્તેજિત કરો:
          </p>

          <div className="grid grid-cols-2 gap-2 text-left">
            <button
              onClick={() => handleSimulate("exam")}
              className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition text-left justify-start"
            >
              <Zap className="size-3.5 text-primary shrink-0" />
              <span>1. Morning Exam Alert</span>
            </button>
            <button
              onClick={() => handleSimulate("revision")}
              className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-xl border border-amber-200 bg-amber-500/5 hover:bg-amber-500/10 text-amber-800 transition text-left justify-start"
            >
              <RotateCcw className="size-3.5 text-amber-600 shrink-0" />
              <span>2. Evening Revision (5 Qs)</span>
            </button>
            <button
              onClick={() => handleSimulate("achievement")}
              className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-xl border border-emerald-200 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-800 transition text-left justify-start"
            >
              <Trophy className="size-3.5 text-emerald-600 shrink-0" />
              <span>3. New Achievement</span>
            </button>
            <button
              onClick={() => handleSimulate("rank")}
              className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-xl border border-purple-200 bg-purple-500/5 hover:bg-purple-500/10 text-purple-800 transition text-left justify-start"
            >
              <TrendingUp className="size-3.5 text-purple-600 shrink-0" />
              <span>4. Rank Improvement</span>
            </button>
            <button
              onClick={() => handleSimulate("streak")}
              className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-xl border border-rose-200 bg-rose-500/5 hover:bg-rose-500/10 text-rose-800 transition text-left justify-start"
            >
              <AlertTriangle className="size-3.5 text-rose-600 shrink-0" />
              <span>5. Streak Risk Remind</span>
            </button>
            <button
              onClick={() => handleSimulate("inactive_3")}
              className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-500/5 hover:bg-slate-500/10 text-slate-800 transition text-left justify-start"
            >
              <UserMinus className="size-3.5 text-slate-600 shrink-0" />
              <span>6. Idle Student Reconnect</span>
            </button>
          </div>
          
          <div className="mt-2.5 flex items-center gap-1 bg-amber-50 border border-amber-100 rounded-xl p-2 text-[10px] text-amber-800">
            <ShieldAlert className="size-3.5 shrink-0" />
            <span>Anti-spam rule enforced: Web console blocks more than 3 triggers per day.</span>
          </div>
        </div>

        {/* Tabs Control and Actions Header */}
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex gap-1.5 p-1 bg-muted rounded-2xl text-xs">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-xl font-medium transition ${activeTab === "all" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              All ({history.length})
            </button>
            <button
              onClick={() => setActiveTab("unread")}
              className={`px-3 py-1.5 rounded-xl font-medium transition ${activeTab === "unread" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Unread ({history.filter(h=>!h.opened).length})
            </button>
            <button
              onClick={() => setActiveTab("read")}
              className={`px-3 py-1.5 rounded-xl font-medium transition ${activeTab === "read" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Read
            </button>
          </div>

          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <CheckCheck className="size-4" />
            <span>Mark All Read</span>
          </button>
        </div>

        {/* Live Notification List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-primary" />
            <span className="text-xs">પત્રો લોડ થઈ રહ્યા છે...</span>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-14 bg-muted/30 border border-dashed rounded-3xl p-5">
            <Bell className="size-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="font-semibold text-sm">કોઈ સૂચનાઓ મળી નથી</p>
            <p className="text-xs text-muted-foreground mt-1 font-gu">
              તમારા ખાતામાં હજુ સુધી કોઈ રીટેન્શન નોટિફિકેશન રેકોર્ડ કરવામાં આવ્યું નથી. ઉપરના એડમિન સીમ્યુલેટરથી મોકલો!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((item, index) => {
              const baseType = item.type.startsWith("inactive") ? "inactive_3" : item.type;
              const mapped = iconMap[baseType as keyof typeof iconMap] || { Icon: Bell, tone: "bg-primary/10 text-primary border-primary/20" };
              const Icon = mapped.Icon;
              
              return (
                <div
                  key={item.id}
                  className={`bg-card border rounded-3xl p-4 shadow-sm relative flex gap-3 transition-all duration-300 animate-[slide-up_0.3s_ease-out] ${
                    item.opened ? "opacity-75 border-border" : "border-indigo-500/30 bg-indigo-50/10 ring-1 ring-indigo-500/5 shadow-md"
                  }`}
                  style={{ animationDelay: `${index * 50}ms`, animationFillMode: "backwards" }}
                >
                  {/* Read/Unread Indicator Pill */}
                  {!item.opened && (
                    <span className="absolute top-4 right-4 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                    </span>
                  )}

                  <div className={`size-11 rounded-2xl flex items-center justify-center shrink-0 border ${mapped.tone}`}>
                    <Icon className="size-5" />
                  </div>

                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-start justify-between gap-1">
                      <p className="font-semibold text-sm leading-tight text-foreground">{item.title}</p>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Calendar className="size-3" />
                      <span>
                        {new Date(item.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>•</span>
                      <span className="capitalize">{item.type.replace('_', ' ')}</span>
                    </p>

                    <p className="text-sm mt-2 text-foreground font-gu leading-relaxed">{item.message}</p>
                    
                    {!item.opened && (
                      <button
                        onClick={() => handleMarkAsRead(item.id)}
                        className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-primary border border-primary/20 hover:bg-primary/5 px-2.5 py-1 rounded-xl transition"
                      >
                        <Check className="size-3" />
                        <span>વાંચેલું માર્ક કરો (Mark Read)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </AppShell>
  );
}
