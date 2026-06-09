import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, HelpCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/components/FirebaseProvider";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign In — Daily Learning Exam" }] }),
  component: Login,
});

function Login() {
  const { loginWithStudentId } = useAuth();
  
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim()) {
      toast.error("કૃપા કરીને સ્ટુડન્ટ આઈડી લખો.");
      return;
    }
    if (!password) {
      toast.error("કૃપા કરીને પાસવર્ડ લખો.");
      return;
    }

    setLoading(true);
    const success = await loginWithStudentId(studentId, password);
    setLoading(false);

    if (success) {
      // successful login toast and redirect handled inside provider
    }
  };

  return (
    <div className="min-h-dvh bg-background flex justify-center animate-[fade-in_0.3s_ease-out]">
      <div className="w-full max-w-md min-h-dvh flex flex-col justify-between">
        <div className="flex flex-col">
          {/* Visual Hero Block */}
          <div className="gradient-hero text-primary-foreground px-6 pt-12 pb-16 rounded-b-[2.5rem] relative overflow-hidden">
            <div className="absolute -top-10 -right-10 size-48 rounded-full bg-white/10 blur-2xl" />
            <div className="flex items-center gap-3 relative">
              <Logo size={56} />
              <div>
                <h1 className="text-xl font-bold">Daily Learning Exam</h1>
                <p className="text-sm text-white/85 font-gu">ગુજરાત બોર્ડના ધોરણ ૭ થી ૧૨ માટે</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="px-6 -mt-10 flex flex-col justify-start space-y-4">
            <div className="bg-card border border-border rounded-3xl p-6 shadow-card space-y-4">
              <div className="space-y-1">
                <h2 className="font-semibold text-lg">Sign In</h2>
                <p className="text-xs text-muted-foreground font-gu">લૉગિન કરવા માટે સ્ટુડન્ટ આઈડી અને પાસવર્ડ ભરો</p>
              </div>

              <div className="space-y-4">
                {/* Student ID field */}
                <label className="block">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Student ID *</span>
                  <div className="mt-1 relative flex items-center gap-2 h-12 px-4 rounded-2xl bg-muted/60 border border-border focus-within:border-primary focus-within:bg-card transition">
                    <User className="size-4 text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      required
                      placeholder="સ્ટુડન્ટ આઈડી (e.g. 9876543210)"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground font-medium"
                    />
                  </div>
                </label>

                {/* Password field */}
                <label className="block">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Password *</span>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-xs text-primary font-semibold hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="mt-1 relative flex items-center gap-2 h-12 px-4 rounded-2xl bg-muted/60 border border-border focus-within:border-primary focus-within:bg-card transition">
                    <Lock className="size-4 text-muted-foreground shrink-0" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="તમારો ગુપ્ત પાસવર્ડ (e.g. 123456)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </label>
              </div>

              {/* Demo guidelines box */}
              <div className="p-3.5 bg-primary-soft text-primary rounded-2xl text-[11px] leading-relaxed flex items-start gap-2.5">
                <ShieldCheck className="size-4 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="font-bold uppercase tracking-wider text-[10px]">Demo credentials available:</p>
                  <ul className="list-disc pl-3.5 space-y-0.5">
                    <li>Student: ID <b className="font-mono">9876543210</b> / Password <b className="font-mono">123456</b></li>
                    <li>Teacher: ID <b className="font-mono">teacher123</b> / Password <b className="font-mono">teacher123</b></li>
                    <li>Super Admin: ID <b className="font-mono">8511125288</b> / Password <b className="font-mono">Nayan@25288</b></li>
                  </ul>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground font-semibold shadow-float active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-75"
              >
                {loading ? "ચકાસણી ચાલુ છે..." : "પ્રવેશ કરો (Login)"}
                <ArrowRight className="size-4" />
              </button>
            </div>

            <p className="text-center text-sm text-muted-foreground pt-2">
              New student?{" "}
              <Link to="/register" className="text-primary font-bold">
                નવી નોંધણી (Register)
              </Link>
            </p>
          </form>
        </div>

        <p className="text-center text-[11px] text-muted-foreground pt-8 pb-6 font-gu">
          ગુજરાત બોર્ડના વિદ્યાર્થીઓ માટે
        </p>
      </div>

      {/* Offline Password Reset Instruction Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fade-in_0.2s_ease-out]">
          <div className="max-w-sm w-full bg-card border border-border rounded-3xl p-6 space-y-4 shadow-xl animate-[scale-in_0.2s_ease-out]">
            <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <HelpCircle className="size-6" />
            </div>
            
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-foreground">પાસવર્ડ પુનઃપ્રાપ્તિ માર્ગદર્શિકા</h3>
              <p className="text-xs text-muted-foreground font-sans">Password Recovery Information</p>
            </div>

            <p className="text-xs font-gu text-muted-foreground text-center leading-relaxed">
              સુરક્ષાના નિયમો મુજબ તમારી પાસવર્ડ પુનઃપ્રાપ્તિ પ્રક્રિયા માત્ર તમારા પ્રશાસક (Super Admin) અથવા વર્ગશિક્ષક દ્વારા કરી શકાશે. કૃપા કરીને નવો પાસવર્ડ સેટ કરવા માટે શાળા કાર્યાલય અથવા શિક્ષકનો સંપર્ક કરો.
            </p>

            <button
              onClick={() => setShowForgotModal(false)}
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-wider transition hover:bg-primary/90"
            >
              સમજાઈ ગયું (Understood)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
