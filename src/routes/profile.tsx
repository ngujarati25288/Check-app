import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { 
  LogOut, User, Phone, MapPin, School, BookOpen, Flame, 
  Settings, Volume2, VolumeX, Moon, Sun, Check, Sparkles, Award, AlertCircle,
  Share2, Lock, Trophy, Copy, Download, Eye, Star, X
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/FirebaseProvider";
import { useSettings, setSettings, sfx } from "@/lib/settings";
import { avatars } from "@/lib/mockData";
import { toast } from "sonner";
import { PointsRepository, UserAchievementsRepository } from "@/lib/db";
import { ACHIEVEMENT_DEFINITIONS } from "@/lib/api/exam.functions";
import { getCategoryDesign } from "./achievements";
import { motion, AnimatePresence } from "motion/react";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile / પ્રોફાઇલ" }] }),
  component: Profile,
});

function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const settings = useSettings();
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  // States for student points, unlocked achievements and modals
  const [points, setPoints] = useState<any>(null);
  const [unlockedList, setUnlockedList] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedMedal, setSelectedMedal] = useState<any | null>(null);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    const studentUid: string = uid;
    let active = true;
    async function fetchStats() {
      try {
        setLoadingStats(true);
        const pts = await PointsRepository.getStudentPoints(studentUid);
        if (!active) return;
        const list = await UserAchievementsRepository.getUserAchievements(studentUid);
        if (!active) return;
        setPoints(pts);
        setUnlockedList(list);
      } catch (e) {
        console.error("Failed to load profile points or medal list:", e);
      } finally {
        if (active) setLoadingStats(false);
      }
    }
    fetchStats();
    return () => { active = false; };
  }, [user?.uid]);

  const handleAvatarSelect = (emoji: string) => {
    setSettings({ avatar: emoji });
    sfx.tap();
    toast.success("તમારો અવતાર સફળતાપૂર્વક અપડેટ કરવામાં આવ્યો છે!");
  };

  const toggleSound = () => {
    const newVal = !settings.sound;
    setSettings({ sound: newVal });
    if (newVal) sfx.tap();
    toast.success(newVal ? "સાઉન્ડ ઇફેક્ટ્સ ચાલુ કરવામાં આવી!" : "સાઉન્ડ ઇફેક્ટ્સ બંધ કરવામાં આવી!");
  };

  const toggleTheme = () => {
    const newVal = settings.theme === "dark" ? "light" : "dark";
    setSettings({ theme: newVal });
    sfx.tap();
    toast.success(newVal === "dark" ? "ડાર્ક મોડ એક્ટિવેટ થયો!" : "લાઇટ મોડ એક્ટિવેટ થયો!");
  };

  const handleUserLogout = async () => {
    try {
      await signOut();
      sfx.wrong();
      toast.success("ਤમે સફળતાપૂર્વક લૉગઆઉટ થઈ ગયા છો.");
      navigate({ to: "/login" });
    } catch (_) {
      // Fallback navigation
      navigate({ to: "/login" });
    }
  };

  return (
    <AppShell title="Profile" titleGu="પ્રોફાઇલ" back="/dashboard">
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        
        {/* HERO AVATAR DISPLAY */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 rounded-3xl p-6 text-white shadow-lg text-center space-y-3">
          <div className="absolute -right-6 -bottom-6 size-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -left-6 -top-6 size-32 rounded-full bg-white/15 blur-xl pointer-events-none" />
          
          <div className="relative mx-auto size-24 bg-white/20 backdrop-blur-md rounded-full shadow-inner border border-white/35 flex items-center justify-center text-5xl">
            {settings.avatar || "📚"}
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-extrabold tracking-tight drop-shadow-xs">
              {user?.fullName || "વપરાશકર્તા"}
            </h2>
            <p className="text-xs text-white/80 font-semibold uppercase tracking-wider">
              {user?.role === "super_admin" 
                ? "👑 મુખ્ય સુપર સંચાલક" 
                : user?.role === "admin" 
                  ? "🛠️ સહાયક એડમિન" 
                  : `Standard ${user?.standard || "10"}-${user?.division || "A"} • વિદ્યાર્થી`}
            </p>
          </div>

          {/* Sparkly statistics indicators in card */}
          <div className="pt-2 flex justify-center gap-4 text-xs font-bold">
            <div className="px-3 py-1 bg-white/15 backdrop-blur-xs rounded-full flex items-center gap-1">
              <Flame className="size-3.5 fill-amber-400 text-amber-400 shrink-0" />
              <span>{user?.streak || 0} દિવસ સ્ટ્રીક</span>
            </div>
            <div className="px-3 py-1 bg-white/15 backdrop-blur-xs rounded-full flex items-center gap-1">
              <Award className="size-3.5 text-yellow-300 shrink-0" />
              <span>{user?.status === "Approved" ? "મંજૂર પ્રોફાઇલ" : "પેન્ડિંગ"}</span>
            </div>
          </div>
        </div>

        {/* STUDY MEDALS CABINET & SHOWCASE GRID */}
        {(() => {
          const totalPoints = points?.totalPoints || 0;
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
          const remainingCount = totalCount - unlockedCount;

          // Sharing features
          const handleShareToWhatsApp = () => {
            sfx.tap();
            const unlockedMedalsText = mappedAchievements
              .filter(a => a.unlocked)
              .map(a => `• ${a.icon} *${a.title}*`)
              .slice(0, 10)
              .join("\n");
              
            const medalsSummary = unlockedCount > 0 
              ? `🏆 મેં જીતેલા વિજય મેડલ (Unlocked Medals):\n${unlockedMedalsText}${remainingCount > 0 ? `\n• અને બીજા ${remainingCount} લૉક મેડલ જીતવા માટે હું મહેનત કરીશ!` : ""}`
              : "🚀 મેં હજુ નવો જ અભ્યાસ શરુ કર્યો છે. ટૂંક સમયમાં હું મારો પહેલો ઉત્કૃષ્ટ મેડલ મેળવીશ!";

            const textPayload = `🌟 *મારું સ્ટડી મેડલ કલેક્શન બોક્સ! - EXCELLENCE STUDY DIARY* 🌟\n\n` +
              `👤 *વિદ્યાર્થી*:  ${user?.fullName || "વપરાશકર્તા"}\n` +
              `🏫 *શાળા*:      ${user?.school || "સરકારી શાળા"}\n` +
              `📌 *ધોરણ*:       Standard ${user?.standard || "10"}-${user?.division || "A"}\n` +
              `🔥 *સ્ટ્રીક*:       ${user?.streak || 0} દિવસ સતત અભ્યાસ!\n` +
              `⚡ *કુલ કમાયેલા પોઇન્ટ્સ*: ${totalPoints} Pts\n\n` +
              `${medalsSummary}\n\n` +
              `તમે પણ પરીક્ષાની ખૂબ સરસ તૈયારી કરવા માટે આજે જ જોડાવ અને મેડલ જીતો! 🎯`;

            const encoded = encodeURIComponent(textPayload);
            window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
            toast.success("તમારા મેડલ બોક્સ શેર કરવા WhatsApp લોન્ચ થયું!");
          };

          const handleCopyClipboard = () => {
            sfx.tap();
            const unlockedMedalsText = mappedAchievements
              .filter(a => a.unlocked)
              .map(a => `• ${a.icon} ${a.title}`)
              .slice(0, 15)
              .join("\n");
              
            const textPayload = `🌟 મારું સ્ટડી મેડલ કલેક્શન બોક્સ - MY EXCELLENCE PROFILE 🌟\n\n` +
              `👤 વિદ્યાર્થી:  ${user?.fullName || "વપરાશકર્તા"}\n` +
              `🏫 શાળા:      ${user?.school || "સરકારી શાળા"}\n` +
              `📌 ધોરણ:       Standard ${user?.standard || "10"}-${user?.division || "A"}\n` +
              `🔥 સ્ટ્રીક:       ${user?.streak || 0} દિવસ સતત અભ્યાસ!\n` +
              `⚡ કુલ પોઇન્ટ્સ: ${totalPoints} Pts\n\n` +
              `🏆 મેં પ્રાપ્ત કરેલા પદકો (Medals unlocked):\n${unlockedMedalsText || "મેડલ મેળવવા માટે મહેનત ચાલુ છે..."}\n\n` +
              `તરી કરો અને શ્રેષ્ઠ પરિણામ લાવો! 🚀`;

            if (navigator.clipboard) {
              navigator.clipboard.writeText(textPayload);
              toast.success("કલેક્શન તથા માર્ક્સની લિંક કોપી કરી લેવામાં આવી!");
            } else {
              toast.error("ક્લિપબોર્ડ સપોર્ટ નથી.");
            }
          };

          // To showcase realistic physics shelves, group badges by row of 4
          const shelfItems = mappedAchievements.slice(0, 12); // Display top 12 badges as representation

          return (
            <div className="bg-card border border-border rounded-3xl p-5 shadow-card space-y-4 relative overflow-hidden animate-[fade-in_0.35s_ease-out]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-xl rounded-full pointer-events-none" />
              
              <div className="flex items-center justify-between border-b border-border/80 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-amber-500 font-extrabold text-sm uppercase tracking-wider">
                    <Trophy className="size-4 animate-bounce" />
                    <span>મેડલ કલેક્શન (Medals)</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">તમારા બધા અનલોક થયેલા શિલ્ડ અને પદકો</p>
                </div>
                
                {/* SHARE THE CARD TRIGGER */}
                <button
                  onClick={() => {
                    sfx.tap();
                    setShowShareModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/10 active:scale-95 hover:brightness-105 transition cursor-pointer"
                >
                  <Share2 className="size-3.5" />
                  <span>શેર લિંક (Share)</span>
                </button>
              </div>

              {/* STAT SUMMARY OF MEDALS */}
              <div className="flex justify-between items-center bg-muted/30 dark:bg-muted/10 border border-border/80 rounded-2xl p-3 text-xs">
                <div className="space-y-0.5">
                  <span className="text-muted-foreground block font-gu font-semibold">મેડલ પ્રગતિ</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                    {unlockedCount} unlocked <span className="text-xs text-muted-foreground font-normal">/ {totalCount} total</span>
                  </span>
                </div>
                <div className="bg-amber-400/15 dark:bg-amber-400/10 border border-amber-300/30 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-xl font-extrabold font-mono text-[13px] animate-pulse">
                  ⭐ {totalPoints} Pts
                </div>
              </div>

              {/* REWARD MEDAL SHELF */}
              <div className="bg-gradient-to-b from-[#402312] to-[#271206] px-4 py-5 rounded-3xl space-y-5 border-2 border-[#542d17] shadow-inner">
                {/* Shelf 1 */}
                <div className="space-y-5">
                  <div className="grid grid-cols-4 gap-3 relative z-10">
                    {shelfItems.slice(0, 4).map((a) => {
                      const design = getCategoryDesign(a.category, a.unlocked);
                      return (
                        <div key={a.id} className="flex flex-col items-center gap-1">
                          <button
                            onClick={() => {
                              sfx.tap();
                              setSelectedMedal(a);
                            }}
                            className={`size-13 rounded-2xl flex items-center justify-center text-2.5xl relative transition-all duration-300 active:scale-90 ${
                              a.unlocked 
                                ? "bg-gradient-to-tr from-amber-400 via-yellow-300 to-orange-400 border border-yellow-200 shadow-md shadow-yellow-500/20 active:rotate-6 animate-pulse" 
                                : "bg-[#1f0f07] border-2 border-[#3d1d0f]/60 opacity-40 grayscale"
                            }`}
                            title={a.title}
                          >
                            <span>{a.icon}</span>
                            {!a.unlocked && (
                              <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center">
                                <Lock className="size-3 text-[#dca385]" />
                              </div>
                            )}
                          </button>
                          <span className={`text-[8px] font-bold text-center truncate max-w-full font-sans ${a.unlocked ? "text-amber-200" : "text-[#7d5138]"}`}>
                            {a.badgeName || a.title.split(":")[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Shelving slab */}
                  <div className="h-2 bg-gradient-to-r from-[#864c23] via-[#b6733d] to-[#864c23] rounded-sm shadow-md" />
                </div>

                {/* Shelf 2 */}
                <div className="space-y-5">
                  <div className="grid grid-cols-4 gap-3 relative z-10">
                    {shelfItems.slice(4, 8).map((a) => {
                      return (
                        <div key={a.id} className="flex flex-col items-center gap-1">
                          <button
                            onClick={() => {
                              sfx.tap();
                              setSelectedMedal(a);
                            }}
                            className={`size-13 rounded-2xl flex items-center justify-center text-2.5xl relative transition-all duration-300 active:scale-90 ${
                              a.unlocked 
                                ? "bg-gradient-to-tr from-cyan-400 via-sky-300 to-blue-400 border border-sky-200 shadow-md shadow-sky-500/20 active:rotate-6" 
                                : "bg-[#1f0f07] border-2 border-[#3d1d0f]/60 opacity-40 grayscale"
                            }`}
                            title={a.title}
                          >
                            <span>{a.icon}</span>
                            {!a.unlocked && (
                              <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center">
                                <Lock className="size-3 text-[#dca385]" />
                              </div>
                            )}
                          </button>
                          <span className={`text-[8px] font-bold text-center truncate max-w-full font-sans ${a.unlocked ? "text-cyan-200" : "text-[#7d5138]"}`}>
                            {a.badgeName || a.title.split(":")[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Shelving slab */}
                  <div className="h-2 bg-gradient-to-r from-[#864c23] via-[#b6733d] to-[#864c23] rounded-sm shadow-md" />
                </div>

                {/* Shelf 3 */}
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-3 relative z-10">
                    {shelfItems.slice(8, 12).map((a) => {
                      return (
                        <div key={a.id} className="flex flex-col items-center gap-1">
                          <button
                            onClick={() => {
                              sfx.tap();
                              setSelectedMedal(a);
                            }}
                            className={`size-13 rounded-2xl flex items-center justify-center text-2.5xl relative transition-all duration-300 active:scale-90 ${
                              a.unlocked 
                                ? "bg-gradient-to-tr from-purple-400 via-fuchsia-300 to-pink-400 border border-fuchsia-200 shadow-md shadow-fuchsia-500/20 active:rotate-6" 
                                : "bg-[#1f0f07] border-2 border-[#3d1d0f]/60 opacity-40 grayscale"
                            }`}
                            title={a.title}
                          >
                            <span>{a.icon}</span>
                            {!a.unlocked && (
                              <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center">
                                <Lock className="size-3 text-[#dca385]" />
                              </div>
                            )}
                          </button>
                          <span className={`text-[8px] font-bold text-center truncate max-w-full font-sans ${a.unlocked ? "text-fuchsia-200" : "text-[#7d5138]"}`}>
                            {a.badgeName || a.title.split(":")[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Shelving slab */}
                  <div className="h-2 bg-gradient-to-r from-[#864c23] via-[#b6733d] to-[#864c23] rounded-sm shadow-md" />
                </div>
              </div>

              <p className="text-[10px] text-center text-muted-foreground/90 font-gu">
                💡 કોઈપણ મેડલ ઉપર ક્લિક કરવાથી તે કેવી રીતે મેળવવો તેની જરૂરી માહિતી દેખાશે.
              </p>

              {/* MEDAL SPECIFIC DETAIL POPUP DIALOG */}
              <AnimatePresence>
                {selectedMedal && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-5">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="bg-card border border-border max-w-sm w-full rounded-3xl p-5 shadow-2xl relative space-y-4"
                    >
                      <button
                        onClick={() => setSelectedMedal(null)}
                        className="absolute top-4 right-4 p-1.5 hover:bg-muted rounded-full transition"
                      >
                        <X className="size-4 text-muted-foreground" />
                      </button>

                      <div className="flex flex-col items-center text-center space-y-2">
                        <div className={`size-16 rounded-2xl flex items-center justify-center text-4xl shadow-md ${
                          selectedMedal.unlocked 
                            ? "bg-gradient-to-tr from-amber-400 to-yellow-300 border border-yellow-200 animate-pulse" 
                            : "bg-muted grayscale border border-border"
                        }`}>
                          {selectedMedal.icon}
                        </div>
                        
                        <div className="space-y-1">
                          <p className="font-extrabold text-[#7c2d12] dark:text-[#fdba74] text-[15px] font-gu">
                            {selectedMedal.title}
                          </p>
                          <p className="text-xs text-muted-foreground italic font-mono">
                            {selectedMedal.badgeName || selectedMedal.titleEn}
                          </p>
                        </div>
                      </div>

                      <div className="bg-muted p-4 rounded-2xl space-y-2 text-xs">
                        <div className="flex justify-between font-bold text-muted-foreground">
                          <span>મેડલ સ્થિતિ (Status):</span>
                          {selectedMedal.unlocked ? (
                            <span className="text-success font-extrabold">✓ અનલોક થયેલ</span>
                          ) : (
                            <span className="text-slate-500">🔒 લૉક</span>
                          )}
                        </div>
                        <div className="border-t border-border mt-2 pt-2 text-[#475569] dark:text-slate-300 leading-relaxed font-semibold">
                          <p className="font-gu text-slate-800 dark:text-slate-100">{selectedMedal.desc}</p>
                          <p className="text-[10px] text-muted-foreground mt-1.5">Category: {selectedMedal.category}</p>
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => setSelectedMedal(null)}
                          className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl uppercase tracking-wider transition active:scale-95"
                        >
                          આભાર (Close)
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* PREMIUM DIRECT SHARE CERTIFICATE MODAL */}
              <AnimatePresence>
                {showShareModal && (
                  <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <motion.div
                      initial={{ scale: 0.92, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.92, opacity: 0 }}
                      className="bg-[#0f172a] text-white border-2 border-yellow-400/40 max-w-sm w-full rounded-4xl p-5 shadow-2xl relative space-y-4"
                    >
                      <button
                        onClick={() => setShowShareModal(false)}
                        className="absolute top-4 right-4 p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition text-white"
                      >
                        <X className="size-4" />
                      </button>

                      {/* SHARE CARD CONTENT INSIDE MODAL */}
                      <div className="border border-yellow-400/20 bg-gradient-to-b from-[#1e293b] to-[#0f172a] rounded-3xl p-5 text-center relative overflow-hidden space-y-4 shadow-lg">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400" />
                        
                        {/* Elegant watermark stars */}
                        <div className="absolute -top-10 -right-10 text-yellow-400/10 text-9xl pointer-events-none select-none">★</div>
                        <div className="absolute -bottom-10 -left-10 text-yellow-400/10 text-9xl pointer-events-none select-none">★</div>

                        <div className="space-y-1">
                          <span className="text-[10px] inline-block font-extrabold uppercase tracking-widest text-yellow-400 bg-yellow-400/15 px-3 py-1 rounded-full border border-yellow-400/40 animate-pulse">
                            STUDENT ACHIEVEMENT CERTIFICATE
                          </span>
                          <h4 className="text-lg font-black text-white capitalize font-sans leading-tight pt-1">
                            {user?.fullName || "સ્ટુડન્ટ વિદ્યાર્થી"}
                          </h4>
                          <p className="text-[9px] text-slate-300/80 uppercase font-bold">
                            {user?.school || "સરકારી માધ્યમિક શાળા"} • standard {user?.standard || "10"}-{user?.division || "A"}
                          </p>
                        </div>

                        {/* Point Badge with Glowing animation */}
                        <div className="relative mx-auto size-24 flex items-center justify-center">
                          <div className="absolute inset-0 bg-yellow-400/15 rounded-full blur-md animate-ping" />
                          <div className="relative size-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 p-0.5 shadow-lg shadow-yellow-500/20">
                            <div className="w-full h-full bg-[#0f172a] rounded-full flex flex-col justify-center items-center">
                              <span className="text-[10px] font-bold text-yellow-300">TOTAL SCORE</span>
                              <span className="text-xl font-black text-yellow-400 font-mono">{totalPoints}</span>
                              <span className="text-[8px] text-muted-foreground uppercase">Points</span>
                            </div>
                          </div>
                        </div>

                        {/* Unlocked Medals lists */}
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] text-yellow-300 uppercase tracking-wider font-extrabold block">
                            જીતેલા સુવર્ણચંદ્રકો ({unlockedCount} Medals Won)
                          </span>
                          
                          <div className="flex flex-wrap gap-1.5 justify-center max-h-24 overflow-y-auto py-1 scrollbar-thin">
                            {mappedAchievements.filter(a => a.unlocked).map((m) => (
                              <div
                                key={m.id}
                                className="bg-[#1e293b]/80 border border-yellow-400/35 px-2 py-1 rounded-lg flex items-center gap-1 text-[11px] hover:scale-105 transition"
                                title={m.title}
                              >
                                <span className="text-sm shrink-0">{m.icon}</span>
                                <span className="text-[8px] font-extrabold text-slate-200 uppercase truncate max-w-[65px]">{m.title.split(":")[0]}</span>
                              </div>
                            ))}
                            {unlockedCount === 0 && (
                              <span className="text-[10px] text-slate-400 italic">શ્રેષ્ઠ મહેનત કરીને હજી પહેલો મેડલ મેળવવાની તૈયારી ચાલુ છે!</span>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-center gap-1.5 items-center text-[9px] text-slate-400">
                          <Flame className="size-3.5 fill-orange-500 text-orange-500" />
                          <span>અભ્યાસ પર્સનલ રેકોર્ડ સ્ટ્રીક્સ: <b>{user?.streak || 0} દિવસ સતત</b></span>
                        </div>
                      </div>

                      {/* DUAL SHARING ACTION BUTTONS */}
                      <div className="space-y-2.5">
                        <button
                          onClick={handleShareToWhatsApp}
                          className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98] cursor-pointer font-sans"
                        >
                          <path d="..." />
                          <span>WHATSAPP પર ડાયરેક્ટ શેર કરો (Share Box)</span>
                        </button>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={handleCopyClipboard}
                            className="h-10 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-black rounded-xl uppercase transition active:scale-[0.97] flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Copy className="size-3.5" /> કોપી કરો (Copy)
                          </button>
                          
                          <button
                            onClick={() => {
                              sfx.tap();
                              window.print();
                            }}
                            className="h-10 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-black rounded-xl uppercase transition active:scale-[0.97] flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Download className="size-3.5" /> પ્રિન્ટ / સેવ (Save)
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          );
        })()}

        {/* AVATAR SELECTOR GRID */}
        <div className="bg-card border border-border rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-1">
            <Sparkles className="size-4 text-indigo-500" />
            <h3 className="text-xs font-black uppercase text-foreground leading-none tracking-wider">
              તમારો અવતાર પસંદ કરો (Select Avatar)
            </h3>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {avatars.map((av) => (
              <button
                key={av.id}
                onClick={() => handleAvatarSelect(av.emoji)}
                className={`aspect-square rounded-2xl flex items-center justify-center text-2xl relative border-2 transition active:scale-95 ${
                  settings.avatar === av.emoji
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 shadow-xs"
                    : "border-border hover:bg-muted/40"
                }`}
                title={av.labelGu}
              >
                {av.emoji}
                {settings.avatar === av.emoji && (
                  <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-0.5 rounded-full">
                    <Check className="size-2.5" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* DETAILS LIST BOX */}
        <div className="bg-card border border-border rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/80">
            <User className="size-4 text-purple-600" />
            <h3 className="text-xs font-black uppercase text-foreground leading-none tracking-wider">
              વિદ્યાર્થી ઓળખ પત્રક (Personal Information)
            </h3>
          </div>

          <div className="space-y-3.5 text-xs text-foreground font-semibold">
            
            <div className="flex items-center justify-between pb-2 border-b border-dashed">
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <User className="size-4 shrink-0" />
                <span className="font-gu">પૂરું નામ (Full Name)</span>
              </div>
              <span className="text-right text-foreground font-bold">{user?.fullName || "નવા વપરાશકર્તા"}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-dashed">
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <Phone className="size-4 shrink-0" />
                <span className="font-gu">મોબાઈલ નંબર (Mobile No)</span>
              </div>
              <span className="text-right font-mono text-foreground font-bold">{user?.mobile || user?.studentId || "ઉપલબ્ધ નથી"}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-dashed">
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <BookOpen className="size-4 shrink-0" />
                <span className="font-gu">ધોરણ અને વર્ગ (Class / Std)</span>
              </div>
              <span className="text-right text-foreground font-bold">Standard {user?.standard || "10"}-{user?.division || "A"}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-dashed">
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <BookOpen className="size-4 shrink-0" />
                <span className="font-gu">માધ્યમ (Learning Medium)</span>
              </div>
              <span className="text-right text-foreground font-bold">
                {user?.medium === "English" ? "English Medium" : "Gujarati Medium"}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-dashed">
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <School className="size-4 shrink-0" />
                <span className="font-gu">શાળા નું નામ (School Name)</span>
              </div>
              <span className="text-right text-foreground font-bold truncate max-w-[180px]" title={user?.school}>
                {user?.school || "નિયુક્ત વહીવટી વિભાગ"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <MapPin className="size-4 shrink-0" />
                <span className="font-gu">ગામ / શહેર (Village Name)</span>
              </div>
              <span className="text-right text-foreground font-bold">{user?.village || "અમદાવાદ"}</span>
            </div>

          </div>
        </div>

        {/* SYSTEM PREFERENCES */}
        <div className="bg-card border border-border rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-1">
            <Settings className="size-4 text-teal-600" />
            <h3 className="text-xs font-black uppercase text-foreground leading-none tracking-wider">
              સિસ્ટમ સેટિંગ્સ (Preferences)
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            
            {/* Tone Toggle */}
            <button
              onClick={toggleSound}
              className="flex items-center justify-between p-3 border rounded-2xl bg-muted/20 hover:bg-muted/40 transition active:scale-98"
            >
              <div className="flex items-center gap-2.5">
                {settings.sound ? (
                  <Volume2 className="size-4.5 text-emerald-600 shrink-0" />
                ) : (
                  <VolumeX className="size-4.5 text-muted-foreground shrink-0" />
                )}
                <div className="text-left leading-none font-semibold">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-0.5">સાઉન્ડ પ્લેયર</span>
                  <span className="text-xs text-foreground font-bold">{settings.sound ? "ઓન" : "ઓફ"}</span>
                </div>
              </div>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-between p-3 border rounded-2xl bg-muted/20 hover:bg-muted/40 transition active:scale-98"
            >
              <div className="flex items-center gap-2.5">
                {settings.theme === "dark" ? (
                  <Moon className="size-4.5 text-indigo-500 shrink-0" />
                ) : (
                  <Sun className="size-4.5 text-amber-500 shrink-0" />
                )}
                <div className="text-left leading-none font-semibold">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-0.5">થીમ પસંદગી</span>
                  <span className="text-xs text-foreground font-bold">{settings.theme === "dark" ? "શ્યામ (Dark)" : "પ્રકાશિત (Light)"}</span>
                </div>
              </div>
            </button>

          </div>
        </div>

        {/* ACTION LOGOUT */}
        {!showConfirmLogout ? (
          <button
            onClick={() => {
              sfx.tap();
              setShowConfirmLogout(true);
            }}
            className="w-full h-12 rounded-2xl bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-extrabold flex items-center justify-center gap-2.5 active:scale-[0.98] transition shadow-xs border border-red-200 dark:border-red-900 text-sm font-sans"
          >
            <LogOut className="size-4 shrink-0" /> લૉગઆઉટ કરો (System Logout)
          </button>
        ) : (
          <div className="bg-red-50/60 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-900 rounded-3xl p-5 space-y-4 animate-[fade-in_0.2s_ease-out]">
            <div className="flex gap-3">
              <AlertCircle className="size-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-red-900 dark:text-red-200 font-sans">
                  શું તમે ખરેખર લૉગઆઉટ કરવા માંગો છો?
                </p>
                <p className="text-[10px] text-red-700/80 dark:text-red-400/80 font-semibold uppercase tracking-wider">
                  Are you sure you want to logout from your account?
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={() => {
                  sfx.tap();
                  setShowConfirmLogout(false);
                }}
                className="h-10 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black rounded-xl uppercase transition active:scale-[0.97]"
              >
                ના (Cancel)
              </button>
              <button
                onClick={handleUserLogout}
                className="h-10 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl uppercase tracking-wider transition active:scale-[0.97] flex items-center justify-center gap-1.5"
              >
                <LogOut className="size-3.5 shrink-0" /> હા (Log Out)
              </button>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
