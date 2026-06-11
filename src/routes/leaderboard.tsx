import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { 
  Crown, 
  Medal, 
  Trophy, 
  Filter, 
  X, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  HelpCircle,
  Sparkles,
  Calendar,
  Zap,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PointsRepository } from "@/lib/db";
import { useAuth } from "@/components/FirebaseProvider";
import { motion, AnimatePresence } from "motion/react";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard & Rankings" }] }),
  component: Leaderboard,
});

type SpanType = "daily" | "weekly" | "monthly" | "alltime";

interface CompiledLeaderboardItem {
  studentId: string;
  name: string;
  standard: string;
  school: string;
  village: string;
  points: number;
  rankingScore: number;
  masteredQuestions: number;
  revisionAccuracy: number;
  achievementsCount: number;
  rank: number;
  previousRank?: number;
  rankChange?: string;
  badges: string[];
}

function Leaderboard() {
  const { user } = useAuth();
  const [span, setSpan] = useState<SpanType>("alltime");
  const [fullList, setFullList] = useState<CompiledLeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filters State
  const [selectedStandard, setSelectedStandard] = useState<string>("");
  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [selectedVillage, setSelectedVillage] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");

  const handleManualRefresh = async () => {
    try {
      setRefreshing(true);
      await PointsRepository.syncAllLeaderboards();
      
      if (selectedSubject) {
        const data = await PointsRepository.getSubjectLeaderboard(selectedSubject);
        const baseData = await PointsRepository.getLeaderboardWithFilters(undefined, undefined, undefined, "alltime");
        
        const enriched = data.map(item => {
          const match = baseData.find(x => x.studentId === item.studentId);
          return {
            studentId: item.studentId,
            name: item.studentName,
            standard: match?.standard || "10",
            school: match?.school || "DL High School",
            village: match?.village || "Village",
            points: match?.points || 0,
            rankingScore: item.rankingScore,
            masteredQuestions: match?.masteredQuestions || 0,
            revisionAccuracy: match?.revisionAccuracy || 0,
            achievementsCount: match?.achievementsCount || 0,
            rank: item.rank,
            previousRank: match?.previousRank,
            rankChange: match?.rankChange || "flat",
            badges: match?.badges || []
          };
        });
        setFullList(enriched);
      } else {
        const data = await PointsRepository.getLeaderboardWithFilters(undefined, undefined, undefined, span, true);
        setFullList(data);
      }
      toast.success("મળેલ વિગતો સફળતાપૂર્વક અપડેટ કરવામાં આવી છે! (Scores successfully synchronized!)");
    } catch (err) {
      console.error("Leaderboard manual refresh failure:", err);
      toast.error("રેન્કિંગ વિગતો અપડેટ કરવામાં સમસ્યા આવી. (Failed to sync scores.)");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    async function loadBoard() {
      try {
        setLoading(true);
        if (selectedSubject) {
          // Subject Leaderboard matching FIX 2 (Real Subject calculations from server)
          const data = await PointsRepository.getSubjectLeaderboard(selectedSubject);
          // Load base list to enrich student profiles securely
          const baseData = await PointsRepository.getLeaderboardWithFilters(undefined, undefined, undefined, "alltime");
          
          const enriched = data.map(item => {
            const match = baseData.find(x => x.studentId === item.studentId);
            return {
              studentId: item.studentId,
              name: item.studentName,
              standard: match?.standard || "10",
              school: match?.school || "DL High School",
              village: match?.village || "Village",
              points: match?.points || 0,
              rankingScore: item.rankingScore,
              masteredQuestions: match?.masteredQuestions || 0,
              revisionAccuracy: match?.revisionAccuracy || 0,
              achievementsCount: match?.achievementsCount || 0,
              rank: item.rank,
              previousRank: match?.previousRank,
              rankChange: match?.rankChange || "flat",
              badges: match?.badges || []
            };
          });
          setFullList(enriched);
        } else {
          // Standard Leaderboard
          const data = await PointsRepository.getLeaderboardWithFilters(undefined, undefined, undefined, span);
          setFullList(data);
        }
      } catch (e) {
        console.error("Leaderboard query failure:", e);
      } finally {
        setLoading(false);
      }
    }
    loadBoard();
  }, [span, selectedSubject]);

  // Compute unique filter options dynamically
  const uniqueStandards = Array.from(
    new Set(fullList.map((item) => item.standard).filter(Boolean))
  ).sort();
  const uniqueSchools = Array.from(
    new Set(fullList.map((item) => item.school).filter(Boolean))
  ).sort();
  const uniqueVillages = Array.from(
    new Set(fullList.map((item) => item.village).filter(Boolean))
  ).sort();

  // Apply filters in memory
  const filteredList = fullList.filter((item) => {
    if (selectedStandard && item.standard !== selectedStandard) return false;
    if (selectedSchool && item.school !== selectedSchool) return false;
    if (selectedVillage && item.village !== selectedVillage) return false;
    return true;
  }).map((item, index) => ({
    ...item,
    rank: index + 1, // Recalculate rank for the filtered peer group context!
  }));

  const top3 = filteredList.slice(0, 3);
  const rest = filteredList.slice(3);

  const hasAnyFilter = !!(selectedStandard || selectedSchool || selectedVillage || selectedSubject);

  const resetFilters = () => {
    setSelectedStandard("");
    setSelectedSchool("");
    setSelectedVillage("");
    setSelectedSubject("");
  };

  const getRankChangeIcon = (change?: string) => {
    if (!change || change === "flat") {
      return (
        <span className="flex items-center text-muted-foreground" title="Rank unchanged">
          <Minus className="size-3 stroke-[3]" />
        </span>
      );
    }
    if (change.startsWith("+")) {
      return (
        <span className="flex items-center gap-0.5 text-emerald-500 font-extrabold text-xs" title={`Improved by ${change}`}>
          <TrendingUp className="size-3.5 stroke-[3]" />
          <span>{change}</span>
        </span>
      );
    }
    if (change.startsWith("-")) {
      return (
        <span className="flex items-center gap-0.5 text-rose-500 font-extrabold text-xs" title={`Dropped by ${change}`}>
          <TrendingDown className="size-3.5 stroke-[3]" />
          <span>{change}</span>
        </span>
      );
    }
    return (
      <span className="flex items-center text-muted-foreground" title="Rank unchanged">
        <Minus className="size-3 stroke-[3]" />
      </span>
    );
  };

  return (
    <AppShell title="Rankings" titleGu="લીડરબોર્ડ" back="/dashboard">
      {/* Dynamic timeframe navigation tabs */}
      <div className="px-5 pt-4">
        <div className="grid grid-cols-4 gap-1 p-1 bg-muted rounded-2xl">
          {(["daily", "weekly", "monthly", "alltime"] as const).map((s) => {
            const isActive = span === s;
            const labelsMap = {
              daily: { en: "Daily", gu: "દૈનિક" },
              weekly: { en: "Weekly", gu: "સાપ્તાહિક" },
              monthly: { en: "Monthly", gu: "માસિક" },
              alltime: { en: "All Time", gu: "કુલ" },
            };
            return (
              <button
                key={s}
                onClick={() => setSpan(s)}
                className={`py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center relative ${
                  isActive
                    ? "bg-background text-foreground shadow-sm text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{labelsMap[s].en}</span>
                <span className="text-[9px] font-medium opacity-80">{labelsMap[s].gu}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeSpanIndicator"
                    className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 py-4 space-y-5">
        {/* Info & Formula Calculator Card */}
        <div className="bg-gradient-to-r from-primary-soft to-indigo-50/10 border border-border rounded-3xl p-4 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 opacity-10">
            <Sparkles className="size-24 text-primary" />
          </div>
          <div className="flex items-start justify-between">
            <div className="space-y-1 pr-6">
              <h3 className="text-sm font-black flex items-center gap-1.5">
                <Sparkles className="size-4 text-warning fill-warning/30" />
                <span>વેઇટેડ રેન્કિંગ મોડલ (Ranking engine)</span>
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                તમારી પરીક્ષાઓ (50%), રિવિઝન (20%), માસ્ટરી (20%) અને સિદ્ધિઓ (10%) ના સંયોજનથી મળેલ વાજબી સ્કોર.
              </p>
            </div>
            <button
              onClick={() => setShowFormulaInfo(!showFormulaInfo)}
              className="p-1 rounded-full hover:bg-muted text-muted-foreground transition"
              title="Show formula details"
            >
              <HelpCircle className="size-5 text-primary" />
            </button>
          </div>

          <AnimatePresence>
            {showFormulaInfo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-3 pt-3 border-t border-border/80 space-y-2.5 text-xs text-muted-foreground"
              >
                <div className="grid grid-cols-2 gap-2 bg-background p-3 rounded-xl border border-border">
                  <div>
                    <span className="font-bold text-foreground">પરીક્ષા કામગીરી (50%)</span>
                    <p className="text-[10px]">સરેરાશ પરીક્ષા ગુણ ગુણ્યા 0.5</p>
                  </div>
                  <div>
                    <span className="font-bold text-foreground">પુનરાવર્તન પ્રવૃત્તિ (20%)</span>
                    <p className="text-[10px]">સાચું રિવિઝન ચોકસાઈ ગુણ્યા 0.2</p>
                  </div>
                  <div className="mt-1">
                    <span className="font-bold text-foreground">માસ્ટરી કરેલા પ્રશ્નો (20%)</span>
                    <p className="text-[10px]">સાચા માસ્ટર્ડ / 50 પ્રશ્નો કેમપેક</p>
                  </div>
                  <div className="mt-1">
                    <span className="font-bold text-foreground">સિદ્ધિઓ પ્રાપ્ત (10%)</span>
                    <p className="text-[10px]">અનલોક કરેલ બેજ / 10 કેમપેક</p>
                  </div>
                </div>
                <div className="text-[10px] text-center italic text-primary">
                  નોંધ: પરીક્ષા પૂર્ણ થવાના 10 Pts, રિવિઝનના 5 Pts, માસ્ટરીના 20 Pts સેટ કરેલ છે.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Real-time filtering controls */}
        <div className="bg-card border border-border rounded-3xl p-4 shadow-card space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            <div className="flex items-center gap-1.5 text-primary">
              <Filter className="size-3.5" />
              <span> ફિલ્ટર મેળવો (Leaderboard Filters) </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={refreshing || loading}
                className="flex items-center gap-1 text-primary hover:opacity-80 transition text-[11px] font-bold disabled:opacity-40"
                title="Force synchronize scores"
              >
                <RefreshCw className={`size-3 ${refreshing ? "animate-spin" : ""}`} />
                <span>તાજગી આપો (Refresh)</span>
              </button>
              {hasAnyFilter && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex items-center gap-1 text-destructive hover:opacity-80 transition text-[11px] font-bold"
                >
                  <X className="size-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {/* Standard Filter */}
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground font-medium uppercase block">Standard</label>
              <select
                value={selectedStandard}
                onChange={(e) => setSelectedStandard(e.target.value)}
                className="w-full bg-muted text-xs h-9.5 px-2 rounded-xl border border-border focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="">All Standards</option>
                {uniqueStandards.map((std) => (
                  <option key={std} value={std}>
                    Std {std}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Filter */}
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground font-medium uppercase block">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full bg-muted text-xs h-9.5 px-2 rounded-xl border border-border focus:ring-1 focus:ring-primary focus:outline-none truncate"
              >
                <option value="">All Subjects</option>
                <option value="Science">Science (વિજ્ઞાન)</option>
                <option value="Mathematics">Mathematics (ગણિત)</option>
                <option value="Gujarati">Gujarati (ગુજરાતી)</option>
                <option value="English">English (અંગ્રેજી)</option>
                <option value="Social Science">Social Science (સામાજિક વિજ્ઞાન)</option>
                <option value="Hindi">Hindi (હિન્દી)</option>
              </select>
            </div>

            {/* School Filter */}
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground font-medium uppercase block">School</label>
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="w-full bg-muted text-xs h-9.5 px-2 rounded-xl border border-border focus:ring-1 focus:ring-primary focus:outline-none truncate"
              >
                <option value="">All Schools</option>
                {uniqueSchools.map((sch) => (
                  <option key={sch} value={sch}>
                    {sch}
                  </option>
                ))}
              </select>
            </div>

            {/* Village Filter */}
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground font-medium uppercase block">Village</label>
              <select
                value={selectedVillage}
                onChange={(e) => setSelectedVillage(e.target.value)}
                className="w-full bg-muted text-xs h-9.5 px-2 rounded-xl border border-border focus:ring-1 focus:ring-primary focus:outline-none truncate"
              >
                <option value="">All Villages</option>
                {uniqueVillages.map((vil) => (
                  <option key={vil} value={vil}>
                    {vil}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Podium Display or Loading spin */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[30dvh] py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredList.length === 0 ? (
          <div className="bg-card border border-border rounded-3xl p-10 text-center text-muted-foreground shadow-card">
            કોઈપણ વિદ્યાર્થી આ ફિલ્ટર્સ હેઠળ મળ્યા નથી.
          </div>
        ) : (
          <>
            {/* Top 3 Podium Displays */}
            <div className="grid grid-cols-3 gap-3.5 items-end pt-5 relative">
              <Podium
                student={top3[1]}
                place={2}
                icon={<Medal className="size-5 text-slate-400 stroke-[2.5]" />}
                height="h-28"
                tone="bg-gradient-to-b from-slate-100 to-slate-200 border border-slate-200"
                badgeText="🥈 Silver Trophy"
                rankChange={top3[1]?.rankChange}
                getRankChangeIcon={getRankChangeIcon}
              />
              <Podium
                student={top3[0]}
                place={1}
                icon={<Crown className="size-7 text-warning fill-warning/30 animate-bounce" />}
                height="h-36"
                tone="gradient-primary text-primary-foreground"
                big
                badgeText="👑 Gold Trophy"
                rankChange={top3[0]?.rankChange}
                getRankChangeIcon={getRankChangeIcon}
              />
              <Podium
                student={top3[2]}
                place={3}
                icon={<Trophy className="size-5 text-amber-600" />}
                height="h-24"
                tone="bg-gradient-to-b from-amber-50 to-amber-100/60 border border-amber-200"
                badgeText="🥉 Bronze Trophy"
                rankChange={top3[2]?.rankChange}
                getRankChangeIcon={getRankChangeIcon}
              />
            </div>

            {/* Remaining Student rankings */}
            {rest.length > 0 && (
              <div className="bg-card border border-border rounded-3xl shadow-card overflow-hidden divide-y divide-border">
                <div className="bg-muted/30 px-4 py-2 flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <span>વિદ્યાર્થી (Student)</span>
                  <div className="flex items-center gap-8">
                    <span>સ્કોર (Score)</span>
                    <span className="w-16 text-right">પોઇન્ટ્સ (Pts)</span>
                  </div>
                </div>
                {rest.map((s, i) => {
                  const isCurrentUser = user && s.studentId === user.uid;
                  return (
                    <div
                      key={s.studentId}
                      className={`flex items-center gap-3.5 px-4 py-3.5 hover:bg-muted/20 transition ${
                        isCurrentUser ? "bg-primary-soft/40 border-l-4 border-l-primary" : ""
                      }`}
                    >
                      <span className="size-9 rounded-xl bg-muted flex items-center justify-center font-black text-sm text-foreground">
                        {s.rank}
                      </span>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm truncate text-foreground">{s.name}</p>
                          {getRankChangeIcon(s.rankChange)}
                          {s.badges && s.badges.length > 0 && (
                            <div className="flex items-center gap-0.5 text-xs">
                              {s.badges.slice(0, 3).map((badgeEmoji, bIdx) => (
                                <span key={bIdx} title="Unlocked Badge">{badgeEmoji}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {s.school} • Std {s.standard}
                        </p>
                      </div>

                      <div className="flex items-center gap-5">
                        {/* Weighted ranking score */}
                        <div className="text-right">
                          <span className="text-xs font-bold text-foreground">{s.rankingScore}%</span>
                          <span className="block text-[8px] text-muted-foreground leading-none">Rank score</span>
                        </div>
                        {/* Cumulative Points */}
                        <div className="w-16 text-right">
                          <span className="text-sm font-black text-primary">{s.points}</span>
                          <span className="block text-[8px] text-muted-foreground leading-none">Total Pts</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function Podium({
  student,
  place,
  icon,
  height,
  tone,
  big,
  badgeText,
  rankChange,
  getRankChangeIcon,
}: {
  student: CompiledLeaderboardItem | undefined;
  place: number;
  icon: React.ReactNode;
  height: string;
  tone: string;
  big?: boolean;
  badgeText: string;
  rankChange?: string;
  getRankChangeIcon: (change?: string) => React.ReactNode;
}) {
  if (!student) return <div className="flex-1 flex flex-col items-center opacity-0" />;
  return (
    <div className="flex flex-col items-center animate-[scale-in_0.4s_ease-out]">
      <div className={`relative size-15 rounded-full ${
        big 
          ? "gradient-primary text-primary-foreground shadow-lg shadow-primary/20 ring-4 ring-primary/20" 
          : "bg-card border-2 border-border shadow-card"
      } flex items-center justify-center font-black text-xl`}>
        {student.name.charAt(0)}
        {student.badges && student.badges.length > 0 && (
          <span className="absolute -bottom-1 -right-1 text-sm bg-background border border-border size-5 rounded-full flex items-center justify-center shadow-card">{student.badges[0]}</span>
        )}
      </div>
      
      <p className="mt-2 text-xs font-extrabold text-center leading-tight truncate w-24 text-foreground flex items-center justify-center gap-1">
        <span>{student.name.split(" ")[0]}</span>
        {getRankChangeIcon(rankChange)}
      </p>

      <div className="flex flex-col items-center mt-0.5">
        <span className="text-[10px] font-bold text-primary">{student.points} pts</span>
        <span className="text-[9px] font-medium text-muted-foreground leading-none">({student.rankingScore}%)</span>
      </div>

      <div className={`mt-3 w-full ${height} rounded-t-3xl ${tone} flex flex-col items-center justify-start pt-3 shadow-card relative overflow-hidden group`}>
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none" />
        {icon}
        <span className={`mt-1 font-black ${big ? "text-3xl" : "text-xl"} tracking-tight`}>#{place}</span>
        <span className="text-[8px] font-bold uppercase tracking-widest opacity-60 px-1 py-0.5 mt-0.5">{big ? "Champion" : "Runner Up"}</span>
      </div>
    </div>
  );
}
