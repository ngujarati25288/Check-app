import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { 
  LogOut, User, Phone, MapPin, School, BookOpen, Flame, 
  Settings, Volume2, VolumeX, Moon, Sun, Check, Sparkles, Award, AlertCircle
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/FirebaseProvider";
import { useSettings, setSettings, sfx } from "@/lib/settings";
import { avatars } from "@/lib/mockData";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile / પ્રોફાઇલ" }] }),
  component: Profile,
});

function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const settings = useSettings();
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

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
