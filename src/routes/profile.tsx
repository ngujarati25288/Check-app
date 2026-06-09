import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { School, MapPin, Hash, Phone, Pencil, LogOut, Award, Moon, Sun, Volume2, VolumeX, Check, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { student, avatars } from "@/lib/mockData";
import { useSettings, setSettings, toggleTheme, sfx } from "@/lib/settings";
import { useAuth } from "@/components/FirebaseProvider";
import { UserRepository } from "@/lib/db";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile" }] }),
  component: Profile,
});

function Profile() {
  const navigate = useNavigate();
  const settings = useSettings();
  const selectedAvatar = settings.avatar;
  const { user } = useAuth();

  const handleRoleChange = async (targetRole: "student" | "admin" | "super_admin") => {
    if (!user) {
      toast.error("Please sign in or register first.");
      return;
    }
    try {
      sfx.correct();
      // Update role
      await UserRepository.updateProfile(user.uid, { role: targetRole });
      
      const sessionUpdate = { ...user, role: targetRole };
      localStorage.setItem('dle:user_session', JSON.stringify(sessionUpdate));
      localStorage.setItem('dle:user', JSON.stringify(sessionUpdate));

      toast.success(`Role changed to ${targetRole.toUpperCase()}!`, {
        description: "Application context updated successfully."
      });

      // Simple brief wait and reload
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (e) {
      toast.error("Failed to swap system roles.");
    }
  };

  return (
    <AppShell title="Profile" titleGu="પ્રોફાઇલ" back="/dashboard">
      <div className="px-5 py-5 space-y-5">
        <div className="rounded-3xl gradient-hero text-primary-foreground p-6 shadow-card flex items-center gap-4 relative overflow-hidden">
          <div className="absolute -bottom-10 -right-10 size-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative size-20 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center text-4xl">
            {selectedAvatar}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold truncate">{user?.fullName || student.name}</h2>
            <p className="text-xs text-white/75 mt-1">Standard {user?.standard || student.standard}</p>
            <span className="inline-block mt-2 text-[10px] uppercase font-black tracking-wider bg-white/20 px-2 py-0.5 rounded-full font-mono">
              Role: {user?.role || "student"}
            </span>
          </div>
        </div>

        {/* DEVELOPER SYS CONTROL */}
        <div className="bg-card border-2 border-primary/20 rounded-3xl p-5 shadow-card space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <p className="text-xs uppercase tracking-wider text-primary font-bold font-gu">
              Developer System Control (સત્તા બદલો)
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground font-gu">
            બિગિનર્સ ડેવલપર રિવ્યુ અને ઓડિટ માટે કોઈપણ સત્તા પસંદ કરીને સિસ્ટમનો અનુભવ કરો:
          </p>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "student", label: "Student 🎓" },
              { id: "admin", label: "Admin 🛠️" },
              { id: "super_admin", label: "Super Admin 👑" }
            ].map((r) => {
              const active = (user?.role || "student") === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => handleRoleChange(r.id as any)}
                  className={`py-2 text-xs font-bold rounded-2xl border transition active:scale-95 ${
                    active
                      ? "gradient-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted border-border text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* AVATAR SELECTOR */}
        <div className="bg-card border border-border rounded-3xl p-4 shadow-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold font-gu mb-3">
            તમારો અવતાર પસંદ કરો
          </p>
          <div className="grid grid-cols-6 gap-2">
            {avatars.map((a) => {
              const active = selectedAvatar === a.emoji;
              return (
                <button
                  key={a.id}
                  onClick={() => { setSettings({ avatar: a.emoji }); sfx.tap(); }}
                  className={`aspect-square rounded-2xl text-2xl flex items-center justify-center transition active:scale-95 ${
                    active
                      ? "gradient-primary text-primary-foreground shadow-float ring-2 ring-primary"
                      : "bg-muted hover:bg-muted/70"
                  }`}
                  aria-label={a.labelGu}
                >
                  {a.emoji}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Stat label="Exams" value={student.totalExams} />
          <Stat label="Avg %" value={`${student.avgPercentage}%`} />
          <Stat label="Rank" value={`#${student.rank}`} />
        </div>

        {/* SETTINGS */}
        <div className="bg-card border border-border rounded-3xl shadow-card overflow-hidden">
          <SettingsRow
            icon={settings.theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
            label="Dark Mode"
            labelGu="ડાર્ક મોડ"
            active={settings.theme === "dark"}
            onClick={toggleTheme}
          />
          <SettingsRow
            icon={settings.sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            label="Sound Effects"
            labelGu="અવાજ"
            active={settings.sound}
            onClick={() => { setSettings({ sound: !settings.sound }); if (!settings.sound) sfx.correct(); }}
            last
          />
        </div>

        <div className="bg-card border border-border rounded-3xl shadow-card overflow-hidden">
          <Row icon={<School className="size-4" />} label="School" value={student.school} />
          <Row icon={<Hash className="size-4" />} label="Standard" value={student.standard} />
          <Row icon={<MapPin className="size-4" />} label="Village / City" value={student.village} />
          <Row icon={<Phone className="size-4" />} label="Mobile" value={student.mobile} last />
        </div>

        <div className="bg-success-soft border border-success/20 rounded-3xl p-4 flex items-center gap-3">
          <Award className="size-6 text-success" />
          <div className="text-sm">
            <p className="font-semibold text-success">Top Performer Badge</p>
            <p className="text-xs text-muted-foreground">Earned for 7-day learning streak</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button className="h-12 rounded-2xl gradient-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 shadow-float active:scale-[0.98] transition">
            <Pencil className="size-4" /> Edit Profile
          </button>
          <button
            onClick={() => navigate({ to: "/login" })}
            className="h-12 rounded-2xl border border-destructive/30 bg-destructive-soft text-destructive font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition"
          >
            <LogOut className="size-4" /> Logout
          </button>
        </div>

        <Link to="/notifications" className="block text-center text-xs text-muted-foreground py-2">
          View notifications
        </Link>
      </div>
    </AppShell>
  );
}

function SettingsRow({
  icon, label, labelGu, active, onClick, last,
}: {
  icon: React.ReactNode; label: string; labelGu: string; active: boolean; onClick: () => void; last?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition ${last ? "" : "border-b border-border"}`}
    >
      <div className={`size-9 rounded-xl flex items-center justify-center ${active ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
        {icon}
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[11px] text-muted-foreground font-gu">{labelGu}</p>
      </div>
      <span
        className={`w-11 h-6 rounded-full p-0.5 flex items-center transition ${active ? "bg-primary justify-end" : "bg-muted justify-start"}`}
        aria-hidden
      >
        <span className="size-5 rounded-full bg-card shadow flex items-center justify-center text-primary">
          {active ? <Check className="size-3" /> : null}
        </span>
      </span>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card border border-border rounded-2xl py-3 text-center shadow-card">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function Row({
  icon, label, value, last,
}: { icon: React.ReactNode; label: string; value: string; last?: boolean; }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 ${last ? "" : "border-b border-border"}`}>
      <div className="size-9 rounded-xl bg-primary-soft text-primary flex items-center justify-center">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
