import { createFileRoute, Link, useNavigate, Outlet, useLocation } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, User, Phone, Backpack, MapPin, Lock, Eye, EyeOff, Hash, X, AlertTriangle, Check } from "lucide-react";
import { useAuth } from "@/components/FirebaseProvider";
import { toast } from "sonner";
import { MasterDataRepository } from "@/lib/db";
import { School, Village } from "@/types";
import { t } from "@/lib/translations";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Student Registration — Daily Learning Exam" }] }),
  component: Register,
});

function convertGujaratiNumerals(str: string): string {
  const gujaratiToEnglishMap: { [key: string]: string } = {
    '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4',
    '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9'
  };
  return str.replace(/[૦-૯]/g, (match) => gujaratiToEnglishMap[match] || match);
}

function getPasswordStrength(password: string): { score: number; label: string; color: string; bg: string } {
  if (!password) return { score: 0, label: "પાસવર્ડ લખો", color: "text-muted-foreground", bg: "bg-muted" };
  const len = password.length;
  if (len < 6) return { score: 1, label: "ખૂબ જ ટૂંકો (Weak)", color: "text-red-500", bg: "bg-red-500" };
  
  const hasLetter = /[a-zA-Z\u0a80-\u0aff]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9\s\u0a80-\u0aff]/.test(password);
  
  let score = 0;
  if (len >= 6) score += 1;
  if (hasLetter && hasDigit) score += 1;
  if (hasSpecial || len >= 10) score += 11; // High score multiplier

  if (score < 2) {
    return { score: 1, label: "Weak (નબળો)", color: "text-red-500", bg: "bg-red-500" };
  } else if (score === 2 || len < 8) {
    return { score: 2, label: "Medium (મધ્યમ)", color: "text-yellow-500", bg: "bg-yellow-500" };
  } else {
    return { score: 3, label: "Strong (મજબૂત)", color: "text-green-500", bg: "bg-green-500" };
  }
}

function Register() {
  const { registerStudent, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mobile, setMobile] = useState("");
  const [school, setSchool] = useState("");
  const [standard, setStandard] = useState("10"); // Default 10
  const [division, setDivision] = useState("A"); // Default A
  const [village, setVillage] = useState("");
  const [medium, setMedium] = useState("Gujarati"); // Default to Gujarati

  // Master lists
  const [schoolsList, setSchoolsList] = useState<School[]>([]);
  const [villagesList, setVillagesList] = useState<Village[]>([]);
  const [isLoadingMaster, setIsLoadingMaster] = useState(true);

  // Search state for dropdowns
  const [schoolQuery, setSchoolQuery] = useState("");
  const [villageQuery, setVillageQuery] = useState("");
  const [isSchoolDropdownOpen, setIsSchoolDropdownOpen] = useState(false);
  const [isVillageDropdownOpen, setIsVillageDropdownOpen] = useState(false);

  // New Request modals state
  const [isSchoolRequestModalOpen, setIsSchoolRequestModalOpen] = useState(false);
  const [isVillageRequestModalOpen, setIsVillageRequestModalOpen] = useState(false);

  // Modal input values
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSchoolVillage, setNewSchoolVillage] = useState("");
  const [newVillageName, setNewVillageName] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [schools, villages] = await Promise.all([
          MasterDataRepository.getSchools(),
          MasterDataRepository.getVillages()
        ]);
        setSchoolsList(schools);
        setVillagesList(villages);
      } catch (e) {
        console.error("Failed to fetch schools/villages:", e);
      } finally {
        setIsLoadingMaster(false);
      }
    };
    fetchMasterData();
  }, []);

  const isSuccessPage = location.pathname === "/register/success";

  if (isSuccessPage) {
    return <Outlet />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-normalize Gujarati numerals for numeric fields
    const normalizedMobile = convertGujaratiNumerals(mobile).replace(/\D/g, "");
    setMobile(normalizedMobile);

    console.log("handleSubmit triggered!");
    
    // 1. Student Name Hard Validation
    const nameTrim = fullName.trim();
    if (!nameTrim) {
      toast.error(t("val_name_empty", medium));
      return;
    }
    if (nameTrim.length < 3) {
      toast.error(medium === "English" ? "Name must be at least 3 characters long." : "નામ ઓછામાં ઓછું ૩ અક્ષરનું હોવું જોઈએ.");
      return;
    }
    if (nameTrim.length > 50) {
      toast.error(medium === "English" ? "Name cannot exceed 50 characters." : "નામ ૫૦ અક્ષરથી વધુ ન હોવું જોઈએ.");
      return;
    }
    
    // English letters, Gujarati block, spaces allowed. No numbers or special characters.
    const validNameRegex = /^[a-zA-Z\s\u0a80-\u0aff]+$/;
    if (!validNameRegex.test(nameTrim)) {
      toast.error(t("val_name_letters", medium));
      return;
    }

    // 2. Password Strength Validation
    if (!password) {
      toast.error(medium === "English" ? "Please set a security password." : "કૃપા કરીને સેક્યુરિટી પાસવર્ડ સેટ કરો.");
      return;
    }
    if (password.length < 6 || password.length > 20) {
      toast.error(t("val_password_short", medium));
      return;
    }

    // 3. Mobile Number Validation
    if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
      toast.error(t("val_mobile_invalid", medium));
      return;
    }

    // 4. Dropdowns validation
    if (!school.trim()) {
      toast.error(t("val_school_empty", medium));
      return;
    }
    if (!village.trim()) {
      toast.error(t("val_village_empty", medium));
      return;
    }

    if (!medium) {
      toast.error(t("val_medium_empty", medium));
      return;
    }

    console.log("All client-side validations passed. Calling registerStudent with medium:", medium);
    try {
      const isSuccess = await registerStudent({
        fullName: nameTrim,
        passwordPlain: password,
        mobile: normalizedMobile,
        school: school.trim(),
        standard,
        division,
        village: village.trim(),
        medium
      });
      console.log("registerStudent completed execution without unhandled exception. success status:", isSuccess);
    } catch (err: any) {
      console.error("registerStudent thrown error caught in handleSubmit component wrapper:", err);
      toast.error(err.message || "Registration failed");
    }
  };

  const handleSchoolRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameValue = newSchoolName.trim();
    const vilValue = newSchoolVillage.trim();
    if (!nameValue) {
      toast.error("કૃપા કરીને શાળાનું નામ લખો.");
      return;
    }
    if (!vilValue) {
      toast.error("કૃપા કરીને ગામ/શહેરનું નામ લખો.");
      return;
    }

    setSubmittingRequest(true);
    try {
      await MasterDataRepository.submitSchoolRequest(nameValue, vilValue, fullName || "નવો વિદ્યાર્થી");
      toast.success("નવી શાળા ઉમેરવાની વિનંતી સબમિટ થઈ ગઈ છે! એડમિન મંજૂરી પછી લિસ્ટમાં દેખાશે.");
      setIsSchoolRequestModalOpen(false);
      setNewSchoolName("");
      setNewSchoolVillage("");
    } catch (err) {
      console.error("Failed to submit school request:", err);
      toast.error("વિનંતી સબમિટ કરવામાં ભૂલ થઈ હતી.");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleVillageRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const vilName = newVillageName.trim();
    if (!vilName) {
      toast.error("કૃપા કરીને ગામ/શહેરનું નામ લખો.");
      return;
    }

    setSubmittingRequest(true);
    try {
      await MasterDataRepository.submitVillageRequest(vilName, fullName || "નવો વિદ્યાર્થી");
      toast.success("નવું ગામ ઉમેરવાની વિનંતી સબમિટ થઈ ગઈ છે! એડમિન મંજૂરી પછી લિસ્ટમાં દેખાશે.");
      setIsVillageRequestModalOpen(false);
      setNewVillageName("");
    } catch (err) {
      console.error("Failed to submit village request:", err);
      toast.error("વિનંતી સબમિટ કરવામાં ભૂલ થઈ હતી.");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const strength = getPasswordStrength(password);

  return (
    <div className="min-h-dvh bg-background flex justify-center animate-[fade-in_0.3s_ease-out] pb-10">
      <div className="w-full max-w-md min-h-dvh flex flex-col relative">
        <header className="flex items-center gap-2 px-4 h-14 border-b border-border bg-card">
          <Link
            to="/login"
            aria-label="Back"
            className="size-10 -ml-2 rounded-full flex items-center justify-center hover:bg-muted transition"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="font-semibold text-sm">New Student Registration</h1>
            <p className="text-[10px] text-muted-foreground font-gu">વિદ્યાર્થી નવી નોંધણી</p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 px-5 py-6 space-y-4">
          <div className="bg-card border border-border rounded-3xl p-5 shadow-card space-y-4 animate-[slide-up_0.3s_ease-out]">
            
            {/* Student Full Name */}
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Student Full Name * (પૂરું નામ)</span>
              <div className="mt-1 relative flex items-center gap-2 h-11 px-4 rounded-2xl bg-muted/60 border border-border focus-within:border-primary focus-within:bg-card transition">
                <User className="size-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  required
                  placeholder="નામ પિતાનું નામ અટક (Aarav Patel)"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground font-medium text-foreground"
                />
              </div>
              <p className="text-[9px] text-muted-foreground mt-1 ml-1">
                ફક્ત અક્ષરો અને સ્પેસ જ માન્ય છે. ઉદા. આરવ કિરણભાઈ પટેલ
              </p>
            </label>

            {/* Password */}
            <div className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Security Password * (ગુપ્ત પાસવર્ડ)</span>
              <div className="mt-1 relative flex items-center gap-2 h-11 px-4 rounded-2xl bg-muted/60 border border-border focus-within:border-primary focus-within:bg-card transition">
                <Lock className="size-4 text-muted-foreground shrink-0" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  maxLength={20}
                  placeholder="૬ થી ૨૦ અક્ષરોનો પાસવર્ડ"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground text-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition shrink-0"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2 text-[10px] space-y-1 ml-1">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>પાસવર્ડની મજબૂતાઈ (Password Strength):</span>
                    <span className={`font-semibold ${strength.color}`}>{strength.label}</span>
                  </div>
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden flex">
                    <div 
                      className={`h-full transition-all duration-300 ${strength.bg}`}
                      style={{ width: `${(strength.score / 3) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Number */}
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Mobile Number * (મોબાઈલ નંબર)</span>
              <div className="mt-1 relative flex items-center gap-2 h-11 px-4 rounded-2xl bg-muted/60 border border-border focus-within:border-primary focus-within:bg-card transition">
                <Phone className="size-4 text-muted-foreground shrink-0" />
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="૧૦ આંકડાનો મોબાઈલ (6,7,8,9 થી શરૂ થતો)"
                  value={mobile}
                  onChange={(e) => {
                    const converted = convertGujaratiNumerals(e.target.value);
                    setMobile(converted.replace(/\D/g, ""));
                  }}
                  className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground text-foreground font-mono"
                />
              </div>
            </label>

            {/* School Searchable Dropdown */}
            <div className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">School Name * (શાળાનું નામ)</span>
              <div className="relative mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsSchoolDropdownOpen(!isSchoolDropdownOpen);
                    setIsVillageDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between h-11 px-4 rounded-2xl bg-muted/60 border border-border focus:border-primary focus:bg-card transition text-sm font-medium text-left"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Backpack className="size-4 text-muted-foreground shrink-0" />
                    <span className={school ? "text-foreground font-semibold" : "text-muted-foreground"}>
                      {school || "શાળા પસંદ કરો (Select Approved School)"}
                    </span>
                  </div>
                  <span className="text-muted-foreground text-xs shrink-0">▼</span>
                </button>

                {isSchoolDropdownOpen && (
                  <div className="absolute z-30 top-full left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-card border border-border rounded-2xl shadow-xl p-2.5 space-y-2">
                    <input
                      type="text"
                      placeholder="અહીં શાળા શોધો..."
                      value={schoolQuery}
                      onChange={(e) => setSchoolQuery(e.target.value)}
                      className="w-full h-10 px-3 text-xs bg-muted/60 rounded-xl border border-border outline-none focus:border-primary font-medium"
                    />
                    <div className="space-y-0.5 max-h-48 overflow-y-auto">
                      {schoolsList
                        .filter(s => s.schoolName.toLowerCase().includes(schoolQuery.toLowerCase()) || 
                                     s.schoolName.includes(schoolQuery))
                        .map((s) => (
                          <button
                            key={s.schoolId}
                            type="button"
                            onClick={() => {
                              setSchool(s.schoolName);
                              if (s.village) {
                                setVillage(s.village);
                              }
                              setIsSchoolDropdownOpen(false);
                              setSchoolQuery("");
                            }}
                            className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-muted transition font-medium text-foreground truncate block"
                          >
                            {s.schoolName} <span className="text-[10px] text-muted-foreground">({s.village})</span>
                          </button>
                        ))}
                      {schoolsList.filter(s => s.schoolName.toLowerCase().includes(schoolQuery.toLowerCase()) || 
                                               s.schoolName.includes(schoolQuery)).length === 0 && (
                        <div className="p-3 text-center text-xs text-muted-foreground font-medium">
                          કોઈ લિસ્ટ મળ્યું નથી
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSchoolRequestModalOpen(true);
                        setIsSchoolDropdownOpen(false);
                      }}
                      className="w-full py-2 bg-primary/10 hover:bg-primary/15 text-primary text-xs font-bold rounded-xl text-center block transition cursor-pointer"
                    >
                      + નવી શાળા ઉમેરવા વિનંતી કરો (Request New School)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Village Searchable Dropdown */}
            <div className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Village / City * (ગામ કે શહેર)</span>
              <div className="relative mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsVillageDropdownOpen(!isVillageDropdownOpen);
                    setIsSchoolDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between h-11 px-4 rounded-2xl bg-muted/60 border border-border focus:border-primary focus:bg-card transition text-sm font-medium text-left"
                >
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="size-4 text-muted-foreground shrink-0" />
                    <span className={village ? "text-foreground font-semibold" : "text-muted-foreground"}>
                      {village || "ગામ અથવા શહેર પસંદ કરો (Select City)"}
                    </span>
                  </div>
                  <span className="text-muted-foreground text-xs shrink-0">▼</span>
                </button>

                {isVillageDropdownOpen && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-card border border-border rounded-2xl shadow-xl p-2.5 space-y-2">
                    <input
                      type="text"
                      placeholder="અહીં ગામ કે શહેર શોધો..."
                      value={villageQuery}
                      onChange={(e) => setVillageQuery(e.target.value)}
                      className="w-full h-10 px-3 text-xs bg-muted/60 rounded-xl border border-border outline-none focus:border-primary font-medium"
                    />
                    <div className="space-y-0.5 max-h-48 overflow-y-auto">
                      {villagesList
                        .filter(v => v.villageName.toLowerCase().includes(villageQuery.toLowerCase()) || 
                                     v.villageName.includes(villageQuery))
                        .map((v) => (
                          <button
                            key={v.villageId}
                            type="button"
                            onClick={() => {
                              setVillage(v.villageName);
                              setIsVillageDropdownOpen(false);
                              setVillageQuery("");
                            }}
                            className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-muted transition font-medium text-foreground truncate block"
                          >
                            {v.villageName}
                          </button>
                        ))}
                      {villagesList.filter(v => v.villageName.toLowerCase().includes(villageQuery.toLowerCase()) || 
                                               v.villageName.includes(villageQuery)).length === 0 && (
                        <div className="p-3 text-center text-xs text-muted-foreground font-medium">
                          ગામ લિસ્ટ મળ્યું નથી
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsVillageRequestModalOpen(true);
                        setIsVillageDropdownOpen(false);
                      }}
                      className="w-full py-2 bg-primary/10 hover:bg-primary/15 text-primary text-xs font-bold rounded-xl text-center block transition cursor-pointer"
                    >
                      + નવું ગામ/શહેર ઉમેરવા વિનંતી કરો (Request New Village)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Standard and Division Row */}
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Standard * (ધોરણ)</span>
                <div className="mt-1 relative flex items-center gap-2 h-11 px-3 rounded-2xl bg-muted/60 border border-border focus-within:border-primary focus-within:bg-card transition">
                  <select 
                    value={standard} 
                    onChange={(e) => setStandard(e.target.value)}
                    className="w-full bg-transparent outline-none text-sm font-semibold text-foreground cursor-pointer"
                  >
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map((s) => (
                      <option key={s} value={s} className="text-foreground">
                        Standard {s}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <label className="block">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Division * (વર્ગ)</span>
                <div className="mt-1 relative flex items-center gap-2 h-11 px-3 rounded-2xl bg-muted/60 border border-border focus-within:border-primary focus-within:bg-card transition">
                  <select 
                    value={division} 
                    onChange={(e) => setDivision(e.target.value)}
                    className="w-full bg-transparent outline-none text-sm font-semibold text-foreground cursor-pointer"
                  >
                    {["A", "B", "C", "D", "E"].map((div) => (
                      <option key={div} value={div} className="text-foreground">
                        Division {div}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            </div>

            {/* Medium Selector */}
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                {t("label_medium", medium)}
              </span>
              <div className="mt-1 relative flex items-center gap-2 h-11 px-3 rounded-2xl bg-muted/60 border border-border focus-within:border-primary focus-within:bg-card transition">
                <select
                  value={medium}
                  onChange={(e) => setMedium(e.target.value)}
                  className="w-full bg-transparent outline-none text-sm font-semibold text-foreground cursor-pointer"
                >
                  <option value="Gujarati" className="text-foreground">
                    {t("medium_gujarati", medium)}
                  </option>
                  <option value="English" className="text-foreground">
                    {t("medium_english", medium)}
                  </option>
                </select>
              </div>
            </label>

          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground font-semibold shadow-float active:scale-[0.98] transition disabled:opacity-75 relative z-10 cursor-pointer"
          >
            {loading ? "નોંધણી થઈ રહી છે... (Registering...)" : "રજીસ્ટ્રેશન કરો (Save and Register)"}
          </button>

          <p className="text-center text-xs text-muted-foreground pt-2">
            Already have school credentials?{" "}
            <Link to="/login" className="text-primary font-bold">
              Sign in
            </Link>
          </p>
        </form>

        {/* ====================================================
            MODAL 1: Add School Request Modal
           ==================================================== */}
        {isSchoolRequestModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-[fade-in_0.2s_ease-out]">
            <div className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="font-bold text-sm text-foreground">નવી શાળા ઉમેરવાની વિનંતી</h3>
                  <p className="text-[10px] text-muted-foreground font-medium">Request to Add New School</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSchoolRequestModalOpen(false)}
                  className="size-8 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground transition cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleSchoolRequestSubmit} className="space-y-4">
                <label className="block">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">School Name (શાળાનું પૂરું નામ) *</span>
                  <input
                    type="text"
                    required
                    placeholder="દા.ત. સરસ્વતી હાઈસ્કૂલ"
                    value={newSchoolName}
                    onChange={(e) => setNewSchoolName(e.target.value)}
                    className="w-full h-10 px-4 mt-1 rounded-xl bg-muted/60 border border-border outline-none focus:border-primary text-sm font-medium text-foreground"
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Village / City Name (ગામ કે અહીનું શહેર) *</span>
                  <input
                    type="text"
                    required
                    placeholder="દા.ત. આણંદ"
                    value={newSchoolVillage}
                    onChange={(e) => setNewSchoolVillage(e.target.value)}
                    className="w-full h-10 px-4 mt-1 rounded-xl bg-muted/60 border border-border outline-none focus:border-primary text-sm font-medium text-foreground"
                  />
                </label>

                <p className="text-[10px] text-amber-500 font-medium">
                  * નોંધ: માહિતી સચોટ હોવી જોઈએ. એડમિન દ્વારા મંજૂરી મળ્યા બાદ જ શાળા લિસ્ટમાં દેખાશે.
                </p>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSchoolRequestModalOpen(false)}
                    className="flex-1 h-10 text-xs font-semibold rounded-xl border border-border hover:bg-muted text-foreground transition cursor-pointer"
                  >
                    રદ્દ કરો
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRequest}
                    className="flex-1 h-10 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 transition disabled:opacity-70 cursor-pointer"
                  >
                    {submittingRequest ? "પ્રોસેસિંગ..." : "વિનંતી મોકલો"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ====================================================
            MODAL 2: Add Village Request Modal
           ==================================================== */}
        {isVillageRequestModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-[fade-in_0.2s_ease-out]">
            <div className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="font-bold text-sm text-foreground">નવું ગામ ઉમેરવાની વિનંતી</h3>
                  <p className="text-[10px] text-muted-foreground font-medium">Request to Add New Village</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsVillageRequestModalOpen(false)}
                  className="size-8 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground transition cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleVillageRequestSubmit} className="space-y-4">
                <label className="block">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Village / City Name (ગામ કે શહેરનું નામ) *</span>
                  <input
                    type="text"
                    required
                    placeholder="દા.ત. બોરિયાવી"
                    value={newVillageName}
                    onChange={(e) => setNewVillageName(e.target.value)}
                    className="w-full h-10 px-4 mt-1 rounded-xl bg-muted/60 border border-border outline-none focus:border-primary text-sm font-medium text-foreground"
                  />
                </label>

                <p className="text-[10px] text-amber-500 font-medium">
                  * નવી ઉમેરાયેલી વિનંતી સુપર એડમિન/એડમિન જોઈને મંજૂર કરશે.
                </p>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsVillageRequestModalOpen(false)}
                    className="flex-1 h-10 text-xs font-semibold rounded-xl border border-border hover:bg-muted text-foreground transition cursor-pointer"
                  >
                    રદ્દ કરો
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRequest}
                    className="flex-1 h-10 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 transition disabled:opacity-70 cursor-pointer"
                  >
                    {submittingRequest ? "પ્રોસેસિંગ..." : "વિનંતી મોકલો"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
