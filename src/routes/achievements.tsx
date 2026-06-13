import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { Lock, Sparkles, Star, Trophy, Award, BookOpen, RefreshCw, StarOff } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/FirebaseProvider";
import { PointsRepository, UserAchievementsRepository } from "@/lib/db";
import { ACHIEVEMENT_DEFINITIONS } from "@/lib/api/exam.functions";
import { StudentPoints, UserAchievement } from "@/types";
import { motion, AnimatePresence } from "motion/react";

export const Route = createFileRoute("/achievements")({
  head: () => ({ meta: [{ title: "Achievements" }] }),
  component: Achievements,
});

// Colorful dynamic designs and high-fidelity educational GIFs for children's gamification
export function getCategoryDesign(category: string, unlocked: boolean) {
  if (!unlocked) {
    return {
      gradient: "from-slate-100 to-slate-200 dark:from-slate-850 dark:to-slate-900 border-dashed border-2 border-slate-200 dark:border-slate-800",
      badgeBg: "bg-slate-200/50 dark:bg-slate-800/80 text-slate-400 grayscale opacity-40",
      glowColor: "shadow-none",
      gifUrl: null,
      particleEmoji: "🔒",
      textColor: "text-muted-foreground",
      badgeClass: "border border-border",
      glowRing: "",
      btnColor: "bg-muted/30 text-muted-foreground"
    };
  }

  // Active colorful configs for achievements
  if (category === "exam") {
    return {
      gradient: "from-yellow-400/15 via-amber-400/10 to-orange-500/10 dark:from-yellow-950/20 dark:to-orange-950/15 border-amber-400/30",
      badgeBg: "bg-gradient-to-tr from-yellow-400 via-amber-500 to-orange-500 text-white shadow-lg",
      glowColor: "shadow-[0_0_15px_-2px_rgba(251,191,36,0.5)]",
      gifUrl: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnZ5MHlyOHJxdm12aGsyZHFjMTJkYXBoazY0NjF0cHhsZmxpc2FvbyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/9Y6n9TR7X09EOPX978/giphy.gif", // twinkling glowing golden star
      particleEmoji: "⭐",
      textColor: "text-amber-800 dark:text-amber-300",
      badgeClass: "border border-amber-300 ring-4 ring-yellow-400/20 animate-pulse",
      glowRing: "absolute -inset-0.5 rounded-3xl bg-amber-400/10 blur-md opacity-70 animate-pulse",
      btnColor: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-extrabold"
    };
  }
  if (category === "revision") {
    return {
      gradient: "from-emerald-400/15 via-teal-400/10 to-green-500/10 dark:from-emerald-950/20 dark:to-green-950/15 border-emerald-400/30",
      badgeBg: "bg-gradient-to-tr from-emerald-500 via-teal-500 to-green-600 text-white shadow-lg",
      glowColor: "shadow-[0_0_15px_-2px_rgba(16,185,129,0.5)]",
      gifUrl: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3g2bjBpZHVudTBpaXV0dWtwYms2M2gxbWNjbjRmMjdqOXhwdms5NCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/Zg7clvqHE3y64uxbAz/giphy.gif", // sparkling victory ribbon
      particleEmoji: "🎉",
      textColor: "text-emerald-800 dark:text-emerald-300",
      badgeClass: "border border-emerald-300 ring-4 ring-emerald-400/20",
      glowRing: "absolute -inset-0.5 rounded-3xl bg-emerald-400/10 blur-md opacity-70 animate-pulse",
      btnColor: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-extrabold"
    };
  }
  if (category === "mastery") {
    return {
      gradient: "from-purple-400/15 via-indigo-400/10 to-fuchsia-500/10 dark:from-purple-950/20 dark:to-fuchsia-950/15 border-purple-400/30",
      badgeBg: "bg-gradient-to-tr from-purple-600 via-indigo-500 to-fuchsia-500 text-white shadow-lg",
      glowColor: "shadow-[0_0_15px_-2px_rgba(168,85,247,0.5)]",
      gifUrl: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnFkMWxtOGsyMmx5bnBjcndid3cycGswMzg3YXRrMTdqcXVhZmlwaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/l41YvS7f6M098uYve/giphy.gif", // magic crystal/sparkles
      particleEmoji: "🔮",
      textColor: "text-purple-800 dark:text-purple-300",
      badgeClass: "border border-purple-300 ring-4 ring-purple-400/20",
      glowRing: "absolute -inset-0.5 rounded-3xl bg-purple-500/10 blur-md opacity-70 animate-pulse",
      btnColor: "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 font-extrabold"
    };
  }
  if (category === "streak") {
    return {
      gradient: "from-orange-400/15 via-rose-400/10 to-red-500/10 dark:from-orange-950/20 dark:to-red-950/15 border-orange-400/30",
      badgeBg: "bg-gradient-to-tr from-orange-500 via-rose-500 to-red-500 text-white shadow-lg",
      glowColor: "shadow-[0_0_15px_-2px_rgba(249,115,22,0.5)]",
      gifUrl: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWxhdmdvMXRqbGZreDdmMHUzY2MwaW02b3Z0bDNzOGgxc2kwd3loMCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/X8gDMs99P8wJk2L6M0/giphy.gif", // cartoon fire sparkler
      particleEmoji: "🔥",
      textColor: "text-orange-800 dark:text-orange-300",
      badgeClass: "border border-orange-300 ring-4 ring-orange-500/20",
      glowRing: "absolute -inset-0.5 rounded-3xl bg-orange-400/10 blur-md opacity-70 animate-pulse",
      btnColor: "bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 font-extrabold"
    };
  }

  // Subject and General category config
  return {
    gradient: "from-cyan-400/15 via-blue-400/10 to-indigo-500/10 dark:from-cyan-950/20 dark:to-indigo-950/15 border-cyan-400/30",
    badgeBg: "bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-500 text-white shadow-lg",
    glowColor: "shadow-[0_0_15px_-2px_rgba(6,182,212,0.5)]",
    gifUrl: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdnRsbGZqZG52dzI0N2dyYmptMTI1bmF6dnF0dzgyY3ozcTVpcHBpdSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/f09fHq6C8C70Cg85Gv/giphy.gif", // orbiting galaxy particles
    particleEmoji: "☄️",
    textColor: "text-cyan-800 dark:text-cyan-300",
    badgeClass: "border border-cyan-300 ring-4 ring-cyan-400/20",
    glowRing: "absolute -inset-0.5 rounded-3xl bg-cyan-400/10 blur-md opacity-70 animate-pulse",
    btnColor: "bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 font-extrabold"
  };
}

function Achievements() {
  const { user } = useAuth();
  const [points, setPoints] = useState<StudentPoints | null>(null);
  const [unlockedList, setUnlockedList] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadData() {
      if (!user?.uid) return;

      const timeoutId = setTimeout(() => {
        if (active && loading) {
          setLoading(false);
          console.warn("Achievements loading timed out after 8s");
        }
      }, 8000);

      try {
        setLoading(true);
        const pts = await PointsRepository.getStudentPoints(user.uid);
        if (!active) return;
        const uas = await UserAchievementsRepository.getUserAchievements(user.uid);
        if (!active) return;
        setPoints(pts);
        setUnlockedList(uas);
      } catch (e) {
        console.error("Failed to load achievement data:", e);
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
  }, [user?.uid]);

  const totalPoints = points?.totalPoints || 0;
  const examPoints = points?.examPoints || 0;
  const revisionPoints = points?.revisionPoints || 0;
  const masteryPoints = points?.masteryPoints || 0;
  const achievementPoints = points?.achievementPoints || 0;

  // Map achievement definitions with active unlock status
  const mappedAchievements = ACHIEVEMENT_DEFINITIONS.map((def) => {
    const isUnlocked = unlockedList.some((ua) => ua.achievementId === def.id);
    return {
      id: def.id,
      title: def.title,
      titleEn: def.titleEn,
      desc: def.descriptionGu || def.description,
      icon: def.emoji,
      unlocked: isUnlocked,
      points: def.points,
      category: def.category,
      badgeName: def.badgeName
    };
  });

  const [activeTab, setActiveTab] = useState<"all" | "exam" | "revision" | "mastery" | "streak" | "subject">("all");

  const categories = [
    { id: "all", labelGu: "બધા", labelEn: "All", emoji: "⚡" },
    { id: "exam", labelGu: "પરીક્ષા", labelEn: "Exams", emoji: "🤖" },
    { id: "revision", labelGu: "પુનરાવર્તન", labelEn: "Revisions", emoji: "🩹" },
    { id: "mastery", labelGu: "પ્રભુત્વ", labelEn: "Mastery", emoji: "🌀" },
    { id: "streak", labelGu: "સ્ટ્રીક્સ", labelEn: "Streaks", emoji: "🔥" },
    { id: "subject", labelGu: "વિષયો", labelEn: "Subjects", emoji: "🧬" },
  ] as const;

  const filteredAchievements = mappedAchievements.filter((a) => {
    if (activeTab === "all") return true;
    if (activeTab === "subject") return a.category.startsWith("subject_");
    return a.category === activeTab;
  });

  const unlockedCount = mappedAchievements.filter((a) => a.unlocked).length;
  const totalCount = mappedAchievements.length;
  const progress = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <AppShell title="Achievements" titleGu="સિદ્ધિઓ" back="/dashboard">
        <div className="flex items-center justify-center min-h-[50dvh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Achievements" titleGu="સિદ્ધિઓ" back="/dashboard">
      <div className="px-5 py-5 space-y-5">
        {/* Progress & Header */}
        <div className="rounded-3xl gradient-hero text-primary-foreground p-5 shadow-card relative overflow-hidden animate-[scale-in_0.4s_ease-out]">
          <div className="absolute -top-10 -right-10 size-32 rounded-full bg-white/15 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="size-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">
              🏆
            </div>
            <div className="flex-1">
              <p className="text-xs text-white/80 font-gu">તમારી સિદ્ધિઓ</p>
              <p className="text-2xl font-bold">{unlockedCount} / {totalCount}</p>
              <p className="text-xs text-white/85 font-gu">Badges unlocked</p>
            </div>
          </div>
          <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* High Density Performance Point Dashboard Summary */}
        <div className="bg-card border border-border rounded-3xl p-4 shadow-card grid grid-cols-2 gap-3.5 animate-[slide-up_0.3s_ease-out]">
          <div className="col-span-2 flex items-center gap-2 border-b border-border pb-2">
            <Trophy className="size-5 text-warning" />
            <span className="font-bold text-sm">પોઈન્ટ્સ ડેશબોર્ડ (Point Scoreboard)</span>
          </div>

          <div className="p-3 bg-primary-soft rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-primary">
              <Star className="size-4 fill-primary" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Total Points</span>
            </div>
            <p className="text-2xl font-black mt-2 text-primary">{totalPoints}</p>
          </div>

          <div className="p-3 bg-muted/40 rounded-2xl flex flex-col justify-between border border-border">
            <div className="flex items-center justify-between text-muted-foreground">
              <BookOpen className="size-4" />
              <span className="text-[10px] uppercase font-semibold tracking-wider">Exams</span>
            </div>
            <p className="text-lg font-bold mt-2">{examPoints} <span className="text-xs text-muted-foreground font-normal">pts</span></p>
          </div>

          <div className="p-3 bg-muted/40 rounded-2xl flex flex-col justify-between border border-border">
            <div className="flex items-center justify-between text-muted-foreground">
              <RefreshCw className="size-4" />
              <span className="text-[10px] uppercase font-semibold tracking-wider">Revisions</span>
            </div>
            <p className="text-lg font-bold mt-2">{revisionPoints} <span className="text-xs text-muted-foreground font-normal">pts</span></p>
          </div>

          <div className="p-3 bg-muted/40 rounded-2xl flex flex-col justify-between border border-border">
            <div className="flex items-center justify-between text-muted-foreground">
              <Award className="size-4" />
              <span className="text-[10px] uppercase font-semibold tracking-wider">Mastery</span>
            </div>
            <p className="text-lg font-bold mt-2">{masteryPoints} <span className="text-xs text-muted-foreground font-normal">pts</span></p>
          </div>

          <div className="col-span-2 p-2 px-3 bg-success-soft rounded-2xl flex items-center justify-between text-xs text-success-foreground">
            <div className="flex items-center gap-1.5 font-semibold">
              <Sparkles className="size-3.5 text-success" />
              <span>Badge Rewards Unleashed</span>
            </div>
            <span className="font-bold font-mono">+{achievementPoints} Pts</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground font-gu italic flex items-center gap-2">
          <Sparkles className="size-4 text-warning-foreground" />
          તમારી મહેનત જ તમારી સફળતા છે.
        </p>

        {/* Categories Tab Bar */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-5 px-5 select-none">
          {categories.map((cat) => {
            const isActive = activeTab === cat.id;
            const stats = (() => {
              const items = mappedAchievements.filter((a) => {
                if (cat.id === "all") return true;
                if (cat.id === "subject") return a.category.startsWith("subject_");
                return a.category === cat.id;
              });
              const uCount = items.filter((a) => a.unlocked).length;
              return `${uCount}/${items.length}`;
            })();

            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 shadow-sm ${
                  isActive
                    ? "bg-primary text-primary-foreground scale-95"
                    : "bg-card border border-border text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <span>{cat.emoji}</span>
                <div className="text-left">
                  <p className="leading-none text-[11px] font-gu">{cat.labelGu}</p>
                  <p className="text-[9px] opacity-80 leading-tight mt-0.5">{cat.labelEn} • {stats}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Badges Grid with Gamified Sparkles & Gifs */}
        <div className="grid grid-cols-2 gap-3.5 pb-8">
          {filteredAchievements.map((a, i) => {
            const d = getCategoryDesign(a.category, a.unlocked);
            return (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.45) }}
                whileHover={a.unlocked ? { scale: 1.03, y: -2 } : {}}
                key={a.id}
                className={`relative rounded-3xl border p-4 flex flex-col justify-between transition-all duration-300 overflow-hidden ${d.glowColor} bg-gradient-to-br ${d.gradient} ${
                  a.unlocked ? "border-primary/30" : "opacity-60"
                }`}
              >
                {/* Glowing ring under active elements */}
                {a.unlocked && <div className={d.glowRing} />}

                {/* Sparkling Background Gif effect */}
                {a.unlocked && d.gifUrl && (
                  <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-25 mix-blend-screen overflow-hidden rounded-3xl">
                    <img 
                      src={d.gifUrl} 
                      alt="sparkle" 
                      className="w-full h-full object-cover scale-110"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                <div className="relative z-10">
                  {/* Lock Indicator or Score badge */}
                  {!a.unlocked ? (
                    <div className="absolute top-0 right-0 size-7 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center border border-border">
                      <Lock className="size-3 text-slate-400 dark:text-slate-500" />
                    </div>
                  ) : (
                    <div className="absolute top-0 right-0 text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-yellow-400 text-amber-950 font-mono shadow-xs border border-yellow-300 animate-bounce">
                      +{a.points} Pts
                    </div>
                  )}

                  {/* Icon Container with animation */}
                  <div className="flex items-center gap-1.5">
                    <motion.div
                      animate={a.unlocked ? { rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] } : {}}
                      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                      className={`size-14 rounded-2xl flex items-center justify-center text-3.5xl ${d.badgeBg} ${d.badgeClass}`}
                    >
                      {a.icon}
                    </motion.div>
                  </div>

                  <p className={`mt-3 font-extrabold text-[13px] font-gu leading-tight tracking-tight ${a.unlocked ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
                    {a.title}
                  </p>
                  
                  <p className="text-[10px] text-muted-foreground/85 mt-1 leading-snug line-clamp-3" title={a.desc}>
                    {a.desc}
                  </p>
                </div>

                <div className="mt-4 relative z-10">
                  {a.unlocked ? (
                    <div className="flex items-center gap-1">
                      <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold font-mono border border-emerald-500/25">
                        ✓ UNLOCKED
                      </span>
                      <motion.span 
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="text-xs"
                      >
                        {d.particleEmoji}
                      </motion.span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-0.5 text-[9px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold border border-border">
                      🔒 LOCKED ({a.points} pts)
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
