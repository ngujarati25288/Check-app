import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Copy, Check, Key, Hash, LayoutDashboard, User } from "lucide-react";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/register/success")({
  head: () => ({ meta: [{ title: "Registration Successful" }] }),
  component: Success,
});

function Success() {
  const [regData, setRegData] = useState<{ studentId: string; passwordPlain: string; fullName: string } | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPwd, setCopiedPwd] = useState(false);

  useEffect(() => {
    let data = null;
    try {
      const dataStr = sessionStorage.getItem("dle:last_registered_user");
      if (dataStr) {
        data = JSON.parse(dataStr);
      }
    } catch (e) {
      console.error("Failed to parse registration success data:", e);
    }

    if (!data && (window as any)._dle_last_registered_user) {
      data = (window as any)._dle_last_registered_user;
    }

    if (data) {
      setRegData(data);
    }
  }, []);

  const handleCopy = async (text: string, type: "id" | "pwd") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "id") {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      } else {
        setCopiedPwd(true);
        setTimeout(() => setCopiedPwd(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy text", err);
    }
  };

  return (
    <div className="min-h-dvh bg-background flex justify-center py-8 px-4 animate-[fade-in_0.3s_ease-out]">
      <div className="w-full max-w-md flex flex-col items-center justify-center text-center">
        <div className="size-20 rounded-full bg-success-soft flex items-center justify-center mb-5 animate-[scale-in_0.5s_ease-out]">
          <CheckCircle2 className="size-12 text-success" strokeWidth={2.2} />
        </div>
        
        <h1 className="text-2xl font-extrabold mb-1 tracking-tight text-foreground">
          નોંધણી સફળ! 🎉
        </h1>
        <p className="text-sm text-muted-foreground font-semibold mb-6">
          Registration Completed Successfully!
        </p>

        {regData ? (
          <div className="w-full bg-card border border-border rounded-3xl p-5 shadow-card text-left space-y-4 mb-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
              તમારી લોગીન વિગતો (Your Login Details)
            </h2>
            
            <p className="text-[11px] text-amber-500 font-medium bg-amber-500/10 rounded-xl p-3 border border-amber-500/20 leading-relaxed">
              ⚠️ મહેરબાની કરીને આ આઈડી અને પાસવર્ડ ક્યાંક સેવ કરી લો અથવા સ્ક્રીનશોટ પાડી લો જેથી તમે પછીથી લોગીન કરી શકો.
              <span className="text-[10px] text-muted-foreground block mt-1">
                Please note down or save this Student ID and Password for future login.
              </span>
            </p>

            {regData.fullName && (
              <div>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Student Name:</span>
                <div className="flex items-center gap-2 mt-1 h-10 px-3 rounded-xl bg-muted/40 border border-border">
                  <User className="size-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">{regData.fullName}</span>
                </div>
              </div>
            )}

            <div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Student ID (સ્ટુડન્ટ આઈડી):</span>
              <div className="flex items-center justify-between gap-2 mt-1 h-11 px-3 rounded-xl bg-muted border border-border focus-within:border-primary">
                <div className="flex items-center gap-2 min-w-0">
                  <Hash className="size-4 text-primary shrink-0" />
                  <span className="text-base font-mono font-bold text-primary select-all truncate">{regData.studentId}</span>
                </div>
                <button
                  onClick={() => handleCopy(regData.studentId, "id")}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:bg-primary/10 px-2 py-1.5 rounded-lg transition shrink-0"
                >
                  {copiedId ? (
                    <>
                      <Check className="size-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5 text-primary" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Password (પાસવર્ડ):</span>
              <div className="flex items-center justify-between gap-2 mt-1 h-11 px-3 rounded-xl bg-muted border border-border focus-within:border-primary">
                <div className="flex items-center gap-2 min-w-0">
                  <Key className="size-4 text-primary shrink-0" />
                  <span className="text-base font-mono font-bold text-primary select-all truncate">{regData.passwordPlain}</span>
                </div>
                <button
                  onClick={() => handleCopy(regData.passwordPlain, "pwd")}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:bg-primary/10 px-2 py-1.5 rounded-lg transition shrink-0"
                >
                  {copiedPwd ? (
                    <>
                      <Check className="size-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5 text-primary" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full bg-card border border-border rounded-3xl p-6 shadow-card mb-6">
            <p className="text-sm text-muted-foreground">
              તમારું એકાઉન્ટ તૈયાર છે. શાળા અને અભ્યાસ શરૂ કરો!
            </p>
          </div>
        )}

        <Link
          to="/dashboard"
          className="w-full max-w-sm h-12 flex gap-2 justify-center items-center rounded-2xl gradient-primary text-primary-foreground font-semibold shadow-float active:scale-[0.98] transition"
        >
          <LayoutDashboard className="size-5" />
          <span>સ્ટડી ડેશબોર્ડ પર જાઓ (Go to Dashboard)</span>
        </Link>
      </div>
    </div>
  );
}
