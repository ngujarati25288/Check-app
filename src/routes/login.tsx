import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { 
  Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, HelpCircle,
  Phone, School, UserCheck, KeyRound, CheckCircle, RefreshCw, AlertCircle, ArrowLeft 
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/components/FirebaseProvider";
import { toast } from "sonner";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db, isFirebasePlaceholder } from "@/lib/firebase";
import { MasterDataRepository, getLocalStorageKey, setLocalStorageKey } from "@/lib/db";
import { DBUser } from "@/types";
import { hashSync } from "bcryptjs";
import { t } from "@/lib/translations";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign In — Daily Learning Exam" }] }),
  component: Login,
});

function Login() {
  const { user, loginWithStudentId } = useAuth();
  const navigate = useNavigate();
  
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [loginLang, setLoginLang] = useState<string>(() => {
    try {
      return localStorage.getItem("dle:login_lang") || "Gujarati";
    } catch (_) {
      return "Gujarati";
    }
  });

  // Forgot Password Flow States
  const [resetStep, setResetStep] = useState<"MOBILE" | "SELECT_STUDENT" | "VERIFY_SCHOOL" | "RESET_PASSWORD" | "SUCCESS">("MOBILE");
  const [mobileNum, setMobileNum] = useState("");
  const [matchingStudents, setMatchingStudents] = useState<DBUser[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<DBUser | null>(null);
  const [schools, setSchools] = useState<string[]>([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    const fetchSchoolsData = async () => {
      try {
        const schoolsList = await MasterDataRepository.getSchools();
        const schoolNames = Array.from(new Set(schoolsList.map(s => s.schoolName).filter(Boolean)));
        setSchools(schoolNames);
      } catch (err) {
        console.error("Failed to load schools:", err);
      }
    };
    if (showForgotModal) {
      fetchSchoolsData();
    }
  }, [showForgotModal]);

  const openResetModal = () => {
    setResetStep("MOBILE");
    setMobileNum("");
    setMatchingStudents([]);
    setSelectedStudent(null);
    setSelectedSchool("");
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setShowForgotModal(true);
  };

  const handleFetchStudents = async () => {
    if (!/^[0-9]{10}$/.test(mobileNum)) {
      toast.error("કૃપા કરીને સાચો ૧૦ આંકડાનો મોબાઈલ નંબર લખો. (Please enter a valid 10-digit mobile number.)");
      return;
    }
    
    setResetLoading(true);
    try {
      let results: DBUser[] = [];
      if (isFirebasePlaceholder) {
        const usersList = getLocalStorageKey<DBUser[]>('users', []);
        results = usersList.filter((u: DBUser) => u.mobile === mobileNum);
      } else {
        const q = query(collection(db, 'users'), where('mobile', '==', mobileNum));
        const snap = await getDocs(q);
        snap.forEach(d => {
          results.push(d.data() as DBUser);
        });
      }
      
      if (results.length === 0) {
        toast.error("આ મોબાઈલ નંબર સાથે કોઈ નોંધાયેલ વિદ્યાર્થી મળ્યો નથી.");
      } else {
        setMatchingStudents(results);
        setResetStep("SELECT_STUDENT");
        setSelectedStudent(results[0]);
      }
    } catch (err) {
      console.error("Failed to fetch students by mobile:", err);
      toast.error("માહિતી શોધવામાં કંઈક મુશ્કેલી પડી.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifySchool = () => {
    if (!selectedSchool) {
      toast.error("કૃપા કરીને શાળા પસંદ કરો.");
      return;
    }
    
    if (selectedStudent && selectedSchool.trim().toLowerCase() === selectedStudent.school?.trim().toLowerCase()) {
      toast.success("તમારી વિગતો સફળતાપૂર્વક ચકાસાયેલ છે!");
      setResetStep("RESET_PASSWORD");
    } else {
      toast.error("પસંદ કરાયેલ શાળા ખોટી છે! કૃપા કરીને સાચી શાળા પસંદ કરો.");
    }
  };

  const handlePasswordResetSubmit = async () => {
    if (!selectedStudent) return;
    if (newPassword.length < 4) {
      toast.error("પાસવર્ડ ઓછામાં ઓછો ૪ આંકડાનો હોવો જોઈએ. (Password must be at least 4 characters.)");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("બંને પાસવર્ડ એકસાથે મળતા નથી. (Passwords do not match.)");
      return;
    }
    
    setResetLoading(true);
    try {
      const hashed = hashSync(newPassword, 10);
      
      if (isFirebasePlaceholder) {
        const usersList = getLocalStorageKey<DBUser[]>('users', []);
        const idx = usersList.findIndex(u => u.uid === selectedStudent.uid);
        if (idx !== -1) {
          usersList[idx].passwordHash = hashed;
          setLocalStorageKey('users', usersList);
        }
        
        const active = getLocalStorageKey<DBUser | null>('user', null);
        if (active && active.uid === selectedStudent.uid) {
          active.passwordHash = hashed;
          setLocalStorageKey('user', active);
        }
      } else {
        await updateDoc(doc(db, 'users', selectedStudent.uid), {
          passwordHash: hashed,
          updatedAt: new Date().toISOString()
        });
      }
      
      toast.success("તમારો પાસવર્ડ સફળતાપૂર્વક બદલવામાં આવ્યો છે!");
      setResetStep("SUCCESS");
    } catch (err: any) {
      console.error("Error resetting password:", err);
      toast.error("પાસવર્ડ બદલવામાં સમસ્યા આવી.");
    } finally {
      setResetLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      if (user.role === 'admin' || user.role === 'super_admin') {
        navigate({ to: '/admin' });
      } else {
        navigate({ to: '/dashboard' });
      }
    }
  }, [user, navigate]);

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
            <div className="flex items-center justify-between relative">
              <div className="flex items-center gap-3">
                <Logo size={48} />
                <div>
                  <h1 className="text-lg font-bold">Daily Learning Exam</h1>
                  <p className="text-xs text-white/85 font-gu">
                    {loginLang === "English" 
                      ? "For Gujarat Board Std 1 to 10" 
                      : loginLang === "Hindi"
                      ? "गुजरात बोर्ड कक्षा १ से १० के लिए"
                      : "ગુજરાત બોર્ડના ધોરણ ૧ થી ૧૦ માટે"}
                  </p>
                </div>
              </div>

              {/* Elegant Language Switcher */}
              <div className="relative shrink-0 z-30">
                <select
                  value={loginLang}
                  onChange={(e) => {
                    const selected = e.target.value;
                    setLoginLang(selected);
                    try {
                      localStorage.setItem("dle:login_lang", selected);
                    } catch (_) {}
                  }}
                  className="bg-white/15 text-white border border-white/25 rounded-2xl px-3 py-1 text-xs font-bold outline-none cursor-pointer focus:bg-background focus:text-foreground transition max-w-[100px]"
                >
                  <option value="Gujarati" className="text-foreground">ગુજરાતી</option>
                  <option value="English" className="text-foreground">English</option>
                  <option value="Hindi" className="text-foreground">हिन्दी</option>
                </select>
              </div>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="px-6 -mt-10 flex flex-col justify-start space-y-4">
            <div className="bg-card border border-border rounded-3xl p-6 shadow-card space-y-4">
              <div className="space-y-1">
                <h2 className="font-semibold text-lg">{t("login_welcome", loginLang)}</h2>
                <p className="text-xs text-muted-foreground font-gu">
                  {loginLang === "English" 
                    ? "Enter your student ID and security password to login" 
                    : loginLang === "Hindi"
                    ? "लॉगिन करने के लिए अपनी विद्यार्थी आईडी और पासवर्ड भरें"
                    : "લૉગિન કરવા માટે સ્ટુડન્ટ આઈડી અને પાસવર્ડ ભરો"}
                </p>
              </div>

              <div className="space-y-4">
                {/* Student ID field */}
                <label className="block">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{t("login_student_id", loginLang)}</span>
                  <div className="mt-1 relative flex items-center gap-2 h-12 px-4 rounded-2xl bg-muted/60 border border-border focus-within:border-primary focus-within:bg-card transition">
                    <User className="size-4 text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      required
                      placeholder={loginLang === "English" ? "STDX-XXXXX" : loginLang === "Hindi" ? "विद्यार्थी आईडी दर्ज करें" : "સ્ટુડન્ટ આઈડી ભરો"}
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground font-medium"
                    />
                  </div>
                </label>

                {/* Password field */}
                <label className="block">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{t("login_password", loginLang)}</span>
                    <button
                      type="button"
                      onClick={openResetModal}
                      className="text-xs text-primary font-semibold hover:underline"
                    >
                      {t("forgot_id", loginLang)}
                    </button>
                  </div>
                  <div className="mt-1 relative flex items-center gap-2 h-12 px-4 rounded-2xl bg-muted/60 border border-border focus-within:border-primary focus-within:bg-card transition">
                    <Lock className="size-4 text-muted-foreground shrink-0" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="******"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground font-mono"
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

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground font-semibold shadow-float active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-75 cursor-pointer"
              >
                {loading ? t("btn_loading", loginLang) : t("btn_signin", loginLang)}
                <ArrowRight className="size-4" />
              </button>
            </div>

            <p className="text-center text-sm text-muted-foreground pt-2">
              <Link to="/register" className="text-primary font-bold hover:underline">
                {t("no_account_yet", loginLang)}
              </Link>
            </p>
          </form>
        </div>

        <p className="text-center text-[11px] text-muted-foreground pt-8 pb-6 font-gu">
          ગુજરાત બોર્ડના ધોરણ ૧ થી ૧૦ ના તમામ વિદ્યાર્થીઓ માટે
        </p>
      </div>

      {/* Interactive Forgot Password Multi-Step Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fade-in_0.2s_ease-out]">
          <div className="max-w-md w-full bg-card border border-border rounded-3xl p-6 space-y-4 shadow-xl animate-[scale-in_0.2s_ease-out] relative">
            
            {/* Header with Title and Step Icons */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                  {resetStep === "MOBILE" && <Phone className="size-4.5" />}
                  {resetStep === "SELECT_STUDENT" && <UserCheck className="size-4.5" />}
                  {resetStep === "VERIFY_SCHOOL" && <School className="size-4.5" />}
                  {resetStep === "RESET_PASSWORD" && <KeyRound className="size-4.5" />}
                  {resetStep === "SUCCESS" && <CheckCircle className="size-4.5 text-emerald-500" />}
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground">
                    {resetStep === "MOBILE" && "મોબાઈલ નંબર ચકાસણી"}
                    {resetStep === "SELECT_STUDENT" && "પાસવર્ડ પુનઃપ્રાપ્તિ"}
                    {resetStep === "VERIFY_SCHOOL" && "શાળાની ચકાસણી"}
                    {resetStep === "RESET_PASSWORD" && "નવો પાસવર્ડ સેટ કરો"}
                    {resetStep === "SUCCESS" && "અપડેટ સફળ રહ્યો!"}
                  </h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                    {resetStep === "MOBILE" && "Step 1/4: Verify Mobile"}
                    {resetStep === "SELECT_STUDENT" && "Step 2/4: Select Student"}
                    {resetStep === "VERIFY_SCHOOL" && "Step 3/4: Match School"}
                    {resetStep === "RESET_PASSWORD" && "Step 4/4: Reset Password"}
                    {resetStep === "SUCCESS" && "Password Reset Successful"}
                  </p>
                </div>
              </div>
              
              {resetStep !== "SUCCESS" && (
                <button
                  onClick={() => setShowForgotModal(false)}
                  className="rounded-full size-7 hover:bg-muted text-muted-foreground flex items-center justify-center transition"
                >
                  ✕
                </button>
              )}
            </div>

            {/* STEP 1: MOBILE ENTRY */}
            {resetStep === "MOBILE" && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed font-gu">
                  તમારા એકાઉન્ટ સાથે જોડાયેલ ૧૦ આંકડાનો મોબાઈલ નંબર લખો જેથી અમે તેમાં નોંધાયેલ વિદ્યાર્થીઓ શોધી શકીએ:
                </p>
                
                <div className="relative flex items-center h-12 px-4 rounded-xl bg-muted/60 border border-border focus-within:border-primary transition">
                  <span className="text-xs font-bold text-muted-foreground mr-2 shrink-0 border-r border-border pr-2">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="મોબાઈલ નંબર (e.g. 9876543210)"
                    value={mobileNum}
                    onChange={(e) => setMobileNum(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-transparent outline-none text-sm font-semibold tracking-wider placeholder:text-muted-foreground/60"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleFetchStudents}
                  disabled={resetLoading}
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {resetLoading ? (
                    <RefreshCw className="size-3.5 animate-spin shrink-0" />
                  ) : (
                    <User className="size-3.5 shrink-0" />
                  )}
                  {resetLoading ? "વિદ્યાર્થીઓ શોધાઈ રહ્યા છે..." : "વિદ્યાર્થીઓ મેળવો (Fetch Students)"}
                </button>
              </div>
            )}

            {/* STEP 2: SELECT STUDENT */}
            {resetStep === "SELECT_STUDENT" && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed font-gu">
                  મોબાઈલ નંબર <strong>+91 {mobileNum}</strong> પર નીચેના ખાતાં મળેલ છે. કૃપા કરીને તમારું એકાઉન્ટ પસંદ કરો:
                </p>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {matchingStudents.map((student) => (
                    <button
                      key={student.uid}
                      onClick={() => setSelectedStudent(student)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition relative flex items-center justify-between ${
                        selectedStudent?.uid === student.uid
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border hover:border-muted-foreground/30 bg-muted/30 text-muted-foreground"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-extrabold flex items-center gap-1.5 text-foreground">
                          <CheckCircle className={`size-3.5 shrink-0 ${selectedStudent?.uid === student.uid ? "text-primary fill-primary/10" : "text-muted-foreground/30"}`} />
                          {student.fullName}
                        </div>
                        <div className="text-[10px] text-muted-foreground pl-5">
                          ID: <span className="font-mono font-bold select-all">{student.studentId}</span> | ધોરણ: {student.standard}-{student.division || "A"}
                        </div>
                        {student.village && (
                          <div className="text-[9px] text-muted-foreground/80 pl-5">
                            ગામ/શહેર: {student.village}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setResetStep("MOBILE");
                    }}
                    className="h-10 border border-border bg-transparent hover:bg-muted text-foreground text-xs font-black rounded-xl uppercase transition active:scale-[0.97] flex items-center justify-center gap-1"
                  >
                    <ArrowLeft className="size-3.5" /> પાછા જાઓ
                  </button>
                  <button
                    onClick={() => {
                      setResetStep("VERIFY_SCHOOL");
                    }}
                    className="h-10 bg-primary text-primary-foreground text-xs font-black rounded-xl uppercase tracking-wider transition active:scale-[0.97]"
                  >
                    શાળા નક્કી કરો
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: VERIFY SCHOOL */}
            {resetStep === "VERIFY_SCHOOL" && (
              <div className="space-y-4">
                <div className="p-3 bg-muted/50 rounded-xl space-y-1 text-center">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">પસંદ કરેલ વિદ્યાર્થી</p>
                  <p className="text-xs font-extrabold text-foreground">{selectedStudent?.fullName}</p>
                  <p className="text-[9px] text-muted-foreground">ID: {selectedStudent?.studentId}</p>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed font-gu">
                  સુરક્ષા ચકાસણી માટે, કૃપા કરીને આ વિદ્યાર્થીની <strong>સાચી શાળાનું નામ</strong> નીચેથી પસંદ કરો:
                </p>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">તમારી શાળા પસંદ કરો *</span>
                  <select
                    value={selectedSchool}
                    onChange={(e) => setSelectedSchool(e.target.value)}
                    className="w-full h-11 px-3 text-xs font-bold rounded-xl bg-muted/60 border border-border focus:border-primary outline-none text-foreground"
                  >
                    <option value="">-- શાળાનું નામ પસંદ કરો --</option>
                    {schools.map((schName) => (
                      <option key={schName} value={schName}>
                        {schName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => setResetStep("SELECT_STUDENT")}
                    className="h-10 border border-border bg-transparent hover:bg-muted text-foreground text-xs font-black rounded-xl uppercase transition active:scale-[0.97] flex items-center justify-center gap-1"
                  >
                    <ArrowLeft className="size-3.5" /> પાછા જાઓ
                  </button>
                  <button
                    onClick={handleVerifySchool}
                    className="h-10 bg-primary text-primary-foreground text-xs font-black rounded-xl uppercase tracking-wider transition active:scale-[0.97]"
                  >
                    ચકાસો
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: RESET PASSWORD */}
            {resetStep === "RESET_PASSWORD" && (
              <div className="space-y-4">
                <div className="flex gap-2.5 items-start p-3 bg-emerald-50/75 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-xl">
                  <CheckCircle className="size-4.5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-emerald-800 dark:text-emerald-300">ચકાસણી સફળ રહી!</p>
                    <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400">મોબાઈલ અને શાળાનું નામ બરાબર મેચ થાય છે.</p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground font-gu">
                  હવે આ વિદ્યાર્થી માટે <strong>નવો પાસવર્ડ</strong> લખો:
                </p>

                <div className="space-y-3">
                  <label className="block space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">નવો પાસવર્ડ (New Password) *</span>
                    <div className="relative flex items-center h-11 px-3 rounded-xl bg-muted/60 border border-border focus-within:border-primary transition">
                      <Lock className="size-3.5 text-muted-foreground mr-2 shrink-0" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="ઓછામાં ઓછા ૪ આંકડા (e.g. 1234)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-transparent outline-none text-xs text-foreground placeholder:text-muted-foreground/60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="size-7 hover:bg-muted text-muted-foreground rounded-full flex items-center justify-center shrink-0"
                      >
                        {showNewPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                    </div>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">પાસવર્ડની પુષ્ટિ કરો (Confirm Password) *</span>
                    <div className="relative flex items-center h-11 px-3 rounded-xl bg-muted/60 border border-border focus-within:border-primary transition">
                      <Lock className="size-3.5 text-muted-foreground mr-2 shrink-0" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="પાસવર્ડ ફરીથી લખો"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-transparent outline-none text-xs text-foreground placeholder:text-muted-foreground/60"
                      />
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => setResetStep("VERIFY_SCHOOL")}
                    disabled={resetLoading}
                    className="h-10 border border-border bg-transparent hover:bg-muted text-foreground text-xs font-black rounded-xl uppercase transition active:scale-[0.97] flex items-center justify-center gap-1"
                  >
                    <ArrowLeft className="size-3.5" /> પાછા જાઓ
                  </button>
                  <button
                    onClick={handlePasswordResetSubmit}
                    disabled={resetLoading}
                    className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl uppercase tracking-wider transition active:scale-[0.97] flex items-center justify-center gap-1.5"
                  >
                    {resetLoading ? (
                      <RefreshCw className="size-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="size-3.5" />
                    )}
                    {resetLoading ? "સાચવી રહ્યા છીએ..." : "પાસવર્ડ બદલો"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: SUCCESS */}
            {resetStep === "SUCCESS" && (
              <div className="space-y-4 text-center">
                <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle className="size-8" />
                </div>
                
                <div className="space-y-1.5 text-center">
                  <h4 className="text-base font-black text-foreground">પાસવર્ડ સફળતાપૂર્વક અપડેટ થયો!</h4>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-gu">The student password has been reset successfully.</p>
                </div>

                <div className="p-3.5 bg-muted/50 rounded-2xl text-left text-xs space-y-1.5 leading-relaxed">
                  <div className="flex justify-between border-b border-border/80 pb-1.5"><span className="text-muted-foreground">વિદ્યાર્થી:</span> <span className="font-bold text-foreground">{selectedStudent?.fullName}</span></div>
                  <div className="flex justify-between border-b border-border/80 pb-1.5"><span className="text-muted-foreground">સ્ટુડન્ટ આઈડી:</span> <span className="font-mono font-bold text-foreground">{selectedStudent?.studentId}</span></div>
                  <div className="flex justify-between pt-0.5"><span className="text-muted-foreground">નવો પાસવર્ડ:</span> <span className="font-mono font-black text-primary select-all">{newPassword}</span></div>
                </div>

                <button
                  onClick={() => setShowForgotModal(false)}
                  className="w-full h-11 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-extrabold uppercase tracking-wider transition active:scale-95 shadow-md flex items-center justify-center gap-1.5"
                >
                  <ArrowRight className="size-3.5" /> લોગીન કરો (Login Now)
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
