import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home, FileText, RotateCcw, Trophy, User, Bell, ArrowLeft, Construction, ShieldAlert, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { initSettings } from "@/lib/settings";
import { useAuth } from "./FirebaseProvider";
import { SuperAdminRepository } from "@/lib/db";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  titleGu?: string;
  back?: string;
  hideNav?: boolean;
  showBell?: boolean;
  className?: string;
}

export function AppShell({ children, title, titleGu, back, hideNav, showBell, className }: AppShellProps) {
  const location = useLocation();
  const { user } = useAuth();
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");

  const dynamicNavItems = [
    { to: "/dashboard", label: "મુખ્ય", icon: Home },
    ...(user?.role === "super_admin" ? [
      { to: "/super-admin", label: "નિયંત્રણ", icon: ShieldAlert },
      { to: "/admin", label: "સંચાલન", icon: FileText },
    ] : user?.role === "admin" ? [
      { to: "/admin", label: "સંચાલન", icon: FileText },
    ] : [
      { to: "/exam-today", label: "પરીક્ષા", icon: FileText },
      { to: "/revision", label: "પુનરાવર્તન", icon: RotateCcw },
      { to: "/leaderboard", label: "ક્રમ", icon: Trophy },
    ]),
    { to: "/profile", label: "પ્રોફાઇલ", icon: User },
  ];

  useEffect(() => {
    initSettings();
    // Check local maintenance status first
    const isMaintenance = localStorage.getItem('dle:maintenance_enabled') === 'true';
    const msg = localStorage.getItem('dle:maintenance_message') || "સિસ્ટમ સુધારણા ચાલુ છે. કૃપા કરીને થોડી વાર પછી ફરીથી પ્રયાસ કરો.";
    setMaintenanceActive(isMaintenance);
    setMaintenanceMessage(msg);

    // Fetch real-time settings from server
    SuperAdminRepository.getSettings().then((cfg) => {
      setMaintenanceActive(cfg.maintenanceMode);
      setMaintenanceMessage(cfg.maintenanceBanner || "સિસ્ટમ સુધારણા ચાલુ છે.");
      localStorage.setItem('dle:maintenance_enabled', cfg.maintenanceMode ? 'true' : 'false');
      localStorage.setItem('dle:maintenance_message', cfg.maintenanceBanner || "સિસ્ટમ સુધારણા ચાલુ છે.");
    }).catch((err) => {
      console.warn("Could not load setting dynamically:", err);
    });
  }, []);

  // Maintenance applies to students. Admins & Super Admins must bypass maintenance to configure system.
  const isStudent = !user || user.role === "student";
  const isProfilePage = location.pathname.startsWith("/profile");
  const shouldBlockForMaintenance = maintenanceActive && isStudent && !isProfilePage;

  if (shouldBlockForMaintenance) {
    return (
      <div className="min-h-dvh bg-background flex justify-center p-4">
        <div className="w-full max-w-md flex flex-col justify-center items-center text-center space-y-6">
          <div className="relative size-24 bg-warning/10 text-warning rounded-full flex items-center justify-center animate-bounce">
            <Construction className="size-12" />
            <div className="absolute -top-1 -right-1 size-6 rounded-full bg-destructive text-white flex items-center justify-center">
              <ShieldAlert className="size-3.5" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-foreground">UNDER MAINTENANCE</h1>
            <h2 className="text-lg font-bold font-gu text-warning">સિસ્ટમ જાળવણી હેઠળ છે 🛠️</h2>
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 shadow-card space-y-4">
            <div className="text-sm text-muted-foreground leading-relaxed font-gu space-y-2">
              <p className="font-semibold text-foreground">સુપર એડમિન સંદેશ (Super Admin Message):</p>
              <p className="p-3 bg-muted rounded-2xl italic font-normal text-xs text-left border border-border">
                {maintenanceMessage}
              </p>
              <p className="pt-2">
                અમે દૈનિક પરીક્ષા પ્રણાલીને વધુ ઝડપી પ્રભાવશાળી બનાવવા માટે કામ કરી રહ્યા છીએ. આ સમય દરમિયાન ટેસ્ટ અથવા રેન્કિંગ બોર્ડ ઉપલબ્ધ રહેશે નહીં.
              </p>
              <p className="text-xs">
                We are working to make the Daily Learning Exam system faster and more secure. Active exams and leaderboards are temporarily halted.
              </p>
            </div>
          </div>

          {/* Contact Support info */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/65 py-2 px-4 rounded-full border border-border">
            <Phone className="size-3.5 text-primary" />
            <span>મદદ ડેસ્ક: <b>+91 99042 12123</b></span>
          </div>

          <div className="w-full pt-4">
            <Link
              to="/profile"
              className="w-full h-11 rounded-2xl bg-muted text-muted-foreground border border-border font-semibold flex items-center justify-center gap-2 active:scale-95 transition"
            >
              <User className="size-4" />
              <span>Go to Profile & Session</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background flex justify-center">
      <div className="w-full max-w-md flex flex-col min-h-dvh relative bg-background">
        {(title || back || showBell) && (
          <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border">
            <div className="flex items-center justify-between px-4 h-14">
              <div className="flex items-center gap-2 min-w-0">
                {back && (
                  <Link
                    to={back}
                    aria-label="Back"
                    className="size-10 -ml-2 rounded-full flex items-center justify-center hover:bg-muted transition"
                  >
                    <ArrowLeft className="size-5" />
                  </Link>
                )}
                {title && (
                  <div className="min-w-0">
                    <h1 className="font-semibold truncate">{title}</h1>
                    {titleGu && <p className="text-xs text-muted-foreground font-gu truncate">{titleGu}</p>}
                  </div>
                )}
              </div>
              {showBell && (
                <Link
                  to="/notifications"
                  aria-label="Notifications"
                  className="size-10 rounded-full flex items-center justify-center hover:bg-muted transition relative"
                >
                  <Bell className="size-5" />
                  <span className="absolute top-2 right-2 size-2 rounded-full bg-destructive" />
                </Link>
              )}
            </div>
          </header>
        )}

        <main className={`flex-1 ${hideNav ? "" : "pb-24"} ${className ?? ""}`}>{children}</main>

        {!hideNav && (
          <nav className="fixed bottom-0 inset-x-0 z-40 flex justify-center pointer-events-none">
            <div className="w-full max-w-md px-3 pb-3 pointer-events-auto">
              <div className="bg-card/95 backdrop-blur border border-border rounded-3xl shadow-card flex items-center justify-around px-2 py-2">
                {dynamicNavItems.map((item) => {
                  const active = location.pathname.startsWith(item.to);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-2xl transition"
                      aria-label={item.label}
                    >
                      <div
                        className={`size-10 rounded-2xl flex items-center justify-center transition ${
                          active ? "gradient-primary text-primary-foreground shadow-float" : "text-muted-foreground"
                        }`}
                      >
                        <Icon className="size-5" />
                      </div>
                      <span className={`text-[10px] font-gu font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
