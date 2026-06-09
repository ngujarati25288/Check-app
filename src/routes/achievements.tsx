import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Lock, Sparkles, Star, Trophy, Award, BookOpen, RefreshCw, StarOff } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/FirebaseProvider";
import { PointsRepository, UserAchievementsRepository } from "@/lib/db";
import { ACHIEVEMENT_DEFINITIONS } from "@/lib/api/exam.functions";
import { StudentPoints, UserAchievement } from "@/types";

export const Route = createFileRoute("/achievements")({
  head: () => ({ meta: [{ title: "Achievements" }] }),
  component: Achievements,
});

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

        {/* Badges Grid */}
        <div className="grid grid-cols-2 gap-3">
          {mappedAchievements.map((a, i) => (
            <div
              key={a.id}
              className={`relative rounded-3xl border p-4 shadow-card animate-[slide-up_0.35s_ease-out] ${
                a.unlocked
                  ? "bg-card border-primary/20"
                  : "bg-muted/40 border-border opacity-70"
              }`}
              style={{ animationDelay: `${i * 30}ms`, animationFillMode: "backwards" }}
            >
              {!a.unlocked && (
                <div className="absolute top-3 right-3 size-7 rounded-full bg-muted flex items-center justify-center">
                  <Lock className="size-3.5 text-muted-foreground" />
                </div>
              )}
              {a.unlocked && (
                <div className="absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 rounded-full bg-warning-soft text-warning-foreground font-mono">
                  +{a.points}p
                </div>
              )}
              <div
                className={`size-14 rounded-2xl flex items-center justify-center text-3xl ${
                  a.unlocked ? "bg-primary-soft" : "bg-muted grayscale opacity-60"
                }`}
              >
                {a.icon}
              </div>
              <p className="mt-3 font-semibold text-sm font-gu leading-tight">{a.title}</p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{a.desc}</p>
              {a.unlocked ? (
                <div className="mt-2.5 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-success-soft text-success font-semibold">
                  ✓ Unlocked
                </div>
              ) : (
                <div className="mt-2.5 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                  Locked ({a.points} pts)
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
