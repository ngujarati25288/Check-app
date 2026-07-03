import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  Shield,
  ShieldAlert,
  Users,
  CheckCircle2,
  Settings,
  Activity,
  HardDrive,
  Send,
  Download,
  AlertTriangle,
  RefreshCw,
  Lock,
  Unlock,
  Search,
  Trash,
  Plus,
  Phone,
  MapPin,
  School,
  Globe,
  X,
  Check,
  ChevronRight,
  Database,
  Award,
  Trophy,
  Loader2
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AdvancedAnalyticsDashboard } from "@/components/AdvancedAnalyticsDashboard";
import { useAuth } from "@/components/FirebaseProvider";
import { SuperAdminRepository, AdminRepository, AnalyticsRepository, PointsRepository, MasterDataRepository } from "@/lib/db";
import { 
  SuperAdminSettings, 
  Announcement, 
  SystemBackup, 
  SecurityLog, 
  DBUser, 
  StudentPoints,
  StudentAnalytics,
  SubjectAnalytics,
  ChapterAnalytics,
  QuestionAnalytics,
  SchoolAnalytics,
  VillageAnalytics,
  StandardAnalytics,
  LearningTrends,
  AnalyticsReport,
  SchoolRequest,
  VillageRequest
} from "@/types";
import { sfx } from "@/lib/settings";
import { toast } from "sonner";
import { hashSync } from "bcryptjs";

export const Route = createFileRoute("/super-admin")({
  head: () => ({ meta: [{ title: "Super Admin Control Center" }] }),
  component: SuperAdminLayout,
});

function SuperAdminLayout() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [activeTab, setActiveTab] = useState<
    "overview" | "analytics" | "admins" | "students" | "announcements" | "settings" | "backups" | "export" | "leaderboard" | "requests"
  >("overview");

  // System States
  const [settings, setSettings] = useState<SuperAdminSettings | null>(null);
  const [admins, setAdmins] = useState<DBUser[]>([]);
  const [students, setStudents] = useState<DBUser[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [backups, setBackups] = useState<SystemBackup[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [schoolRequests, setSchoolRequests] = useState<SchoolRequest[]>([]);
  const [villageRequests, setVillageRequests] = useState<VillageRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  // Advanced Analytics States
  const [studentAnalytics, setStudentAnalytics] = useState<StudentAnalytics[]>([]);
  const [subjectAnalytics, setSubjectAnalytics] = useState<SubjectAnalytics[]>([]);
  const [chapterAnalytics, setChapterAnalytics] = useState<ChapterAnalytics[]>([]);
  const [questionAnalytics, setQuestionAnalytics] = useState<QuestionAnalytics[]>([]);
  const [schoolAnalytics, setSchoolAnalytics] = useState<SchoolAnalytics[]>([]);
  const [villageAnalytics, setVillageAnalytics] = useState<VillageAnalytics[]>([]);
  const [standardAnalytics, setStandardAnalytics] = useState<StandardAnalytics[]>([]);
  const [learningTrends, setLearningTrends] = useState<LearningTrends | null>(null);
  const [analyticsReports, setAnalyticsReports] = useState<AnalyticsReport[]>([]);

  // Form states
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminMobile, setNewAdminMobile] = useState("");
  const [newAdminSchool, setNewAdminSchool] = useState("");
  const [newAdminStd, setNewAdminStd] = useState("10");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);

  // User Management state hooks
  const [showAddUserSection, setShowAddUserSection] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserMobile, setNewUserMobile] = useState("");
  const [newUserSchool, setNewUserSchool] = useState("");
  const [newUserStd, setNewUserStd] = useState("10");
  const [newUserDiv, setNewUserDiv] = useState("A");
  const [newUserVillage, setNewUserVillage] = useState("");
  const [newUserRoleState, setNewUserRoleState] = useState("student");

  const uniqueSchools = useMemo(() => {
    const list = students.map((s) => s.school).filter(Boolean);
    const unique = Array.from(new Set(list));
    return unique.length > 0 ? unique : ["જી.એલ. હાઈસ્કૂલ, અમદાવાદ", "સરસ્વતી વિદ્યા મંદિર, આણંદ", "ગર્લ્સ હાઈસ્કૂલ, વડોદરા"];
  }, [students]);

  const uniqueVillages = useMemo(() => {
    const list = students.map((s) => s.village).filter(Boolean);
    const unique = Array.from(new Set(list));
    return unique.length > 0 ? unique : ["અમદાવાદ", "આણંદ", "વડોદરા", "કોસંબા"];
  }, [students]);

  // Announcement inputs
  const [annTitle, setAnnTitle] = useState("");
  const [annMessage, setAnnMessage] = useState("");
  const [annStd, setAnnStd] = useState("all");
  const [annSchool, setAnnSchool] = useState("all");
  const [annVillage, setAnnVillage] = useState("all");

  // Filter/Search inputs
  const [adminSearch, setAdminSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentFilterStd, setStudentFilterStd] = useState("all");
  const [selectedAdminLogs, setSelectedAdminLogs] = useState<DBUser | null>(null);

  // Settings inputs
  const [cfgAppName, setCfgAppName] = useState("");
  const [cfgAppVersion, setCfgAppVersion] = useState("");
  const [cfgSupport, setCfgSupport] = useState("");
  const [cfgMaintenance, setCfgMaintenance] = useState(false);
  const [cfgBanner, setCfgBanner] = useState("");
  const [cfgPush, setCfgPush] = useState(true);
  const [thresholdGold, setThresholdGold] = useState(90);
  const [thresholdSilver, setThresholdSilver] = useState(80);
  const [thresholdBronze, setThresholdBronze] = useState(70);

  // App Update states
  const [updLatestVersion, setUpdLatestVersion] = useState("1.0.0");
  const [updMandatory, setUpdMandatory] = useState(false);
  const [updApkUrl, setUpdApkUrl] = useState("");
  const [updReleaseNotes, setUpdReleaseNotes] = useState("");
  const [isSavingUpdateSettings, setIsSavingUpdateSettings] = useState(false);

  // System Reset (Wipe) States
  const [wipeSyllabus, setWipeSyllabus] = useState(false);
  const [wipeUsers, setWipeUsers] = useState(false);
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeConfirmationText, setWipeConfirmationText] = useState("");
  const [isWiping, setIsWiping] = useState(false);
  const [wipeReport, setWipeReport] = useState<{
    isPlaceholder: boolean;
    results: { name: string; count: number; deleted: number; error?: string }[];
  } | null>(null);
  const [showWipeReportModal, setShowWipeReportModal] = useState(false);

  // Leaderboard Custom States
  const [leaderboardLogs, setLeaderboardLogs] = useState<any[]>([]);
  const [isLeaderboardSyncing, setIsLeaderboardSyncing] = useState(false);
  const [latency, setLatency] = useState<number>(24);

  const loadData = async () => {
    const startTime = performance.now();
    try {
      setLoading(true);

      // Recalculate and synchronize educational analytics data
      await AnalyticsRepository.runAnalyticsEngineCloudSync();

      const [
        cfg,
        admList,
        stdList,
        annList,
        bakList,
        secList,
        audList,
        studAnList,
        subjAnList,
        chapAnList,
        questAnList,
        schAnList,
        vilAnList,
        stdAnList,
        trendAn,
        rptsAn
      ] = await Promise.all([
        SuperAdminRepository.getSettings(),
        SuperAdminRepository.getAllAdmins(),
        AdminRepository.getAllStudents(),
        SuperAdminRepository.getAllAnnouncements(),
        SuperAdminRepository.getBackups(),
        SuperAdminRepository.getSecurityLogs(),
        AdminRepository.getAuditLogs(),
        AnalyticsRepository.getAllStudentAnalytics(),
        AnalyticsRepository.getAllSubjectAnalytics(),
        AnalyticsRepository.getAllChapterAnalytics(),
        AnalyticsRepository.getAllQuestionAnalytics(),
        AnalyticsRepository.getSchoolAnalytics(),
        AnalyticsRepository.getVillageAnalytics(),
        AnalyticsRepository.getAllStandardAnalytics(),
        AnalyticsRepository.getLearningTrends(),
        AnalyticsRepository.getAnalyticsReports()
      ]);

      setSettings(cfg);
      setCfgAppName(cfg.appName);
      setCfgAppVersion(cfg.appVersion);
      setCfgSupport(cfg.supportContact);
      setCfgMaintenance(cfg.maintenanceMode);
      setCfgBanner(cfg.maintenanceBanner);
      setCfgPush(cfg.instantPushToggled);
      setThresholdGold(cfg.badgeThresholdGold || 90);
      setThresholdSilver(cfg.badgeThresholdSilver || 80);
      setThresholdBronze(cfg.badgeThresholdBronze || 70);

      try {
        const upSettings = await SuperAdminRepository.getAppUpdateSettings();
        setUpdLatestVersion(upSettings.latestVersion || "1.0.0");
        setUpdMandatory(upSettings.mandatory || false);
        setUpdApkUrl(upSettings.apkUrl || "");
        setUpdReleaseNotes(upSettings.releaseNotes || "");
      } catch (err) {
        console.warn("Failed fetching app update settings:", err);
      }

      setAdmins(admList);
      setStudents(stdList);
      setAnnouncements(annList);
      setBackups(bakList);
      setSecurityLogs(secList);
      setAuditLogs(audList);

      // Save analytics states
      setStudentAnalytics(studAnList);
      setSubjectAnalytics(subjAnList);
      setChapterAnalytics(chapAnList);
      setQuestionAnalytics(questAnList);
      setSchoolAnalytics(schAnList);
      setVillageAnalytics(vilAnList);
      setStandardAnalytics(stdAnList);
      setLearningTrends(trendAn);
      setAnalyticsReports(rptsAn);

      try {
        const [schReqs, vilReqs] = await Promise.all([
          MasterDataRepository.getSchoolRequests(),
          MasterDataRepository.getVillageRequests()
        ]);
        setSchoolRequests(schReqs);
        setVillageRequests(vilReqs);
      } catch (err) {
        console.warn("Failed fetching master requests:", err);
      }

      try {
        const boardLogs = await PointsRepository.getLeaderboardAuditLogs();
        setLeaderboardLogs(boardLogs);
      } catch (err) {
        console.warn("Failed fetching leaderboard logs:", err);
      }
    } catch (e) {
      console.error(e);
      toast.error("Error loading Super Admin systems.");
    } finally {
      setLoading(false);
      const endTime = performance.now();
      setLatency(Math.max(1, Math.round(endTime - startTime)));
    }
  };

  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    if (!authLoading) {
      if (!user?.uid) {
        navigate({ to: "/login" });
      } else if (isSuperAdmin) {
        if (!dataLoaded) {
          const timeoutId = setTimeout(() => {
            if (active && loading) {
              setLoading(false);
              console.warn("Super-admin loading timed out after 8s");
            }
          }, 8000);

          const runLoad = async () => {
            try {
              await loadData();
              if (active) setDataLoaded(true);
            } catch (err) {
              console.error("Super Admin load failed:", err);
            } finally {
              clearTimeout(timeoutId);
            }
          };
          runLoad();
        }
      } else {
        toast.error("અવરોધિત એક્સેસ: તમારી પાસે સુપર એડમિન સત્તા નથી. Redirecting to dashboard...");
        navigate({ to: "/dashboard" });
      }
    }
    return () => {
      active = false;
    };
  }, [user?.uid, user?.role, authLoading, isSuperAdmin, dataLoaded]);

  // Route security guard rendering
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="size-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-gu">સત્તાધિકારી તપાસ ચાલુ છે...</p>
      </div>
    );
  }

  if (!user || !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full bg-card border border-destructive/25 rounded-3xl p-6 text-center space-y-4 shadow-xl animate-[fade-in_0.4s_ease-out]">
          <div className="size-16 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mx-auto ring-8 ring-destructive/5 animate-pulse">
            <ShieldAlert className="size-8" />
          </div>
          <h1 className="text-xl font-black text-foreground uppercase tracking-wider">SUPER ADMIN ACCESS DENIED</h1>
          <p className="text-xs font-gu text-muted-foreground leading-relaxed">
            આ પૃષ્ઠ માત્ર મુખ્ય વહીવટી અધિકારી (Super Admin) માટે અનામત છે. તમારી ઓળખ વિદ્યાર્થી અથવા સામાન્ય એડમિન હોવાથી આ કનેક્શન સિક્યોરિટી નિયમો હેઠળ નકારી કાઢવામાં આવ્યું છે.
          </p>
          <div className="pt-4 flex flex-col gap-2">
            <Link
              to="/dashboard"
              className="h-11 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center transition shadow-md active:scale-95 text-xs uppercase"
            >
              Back to Dashboard
            </Link>
            <Link
              to="/profile"
              className="text-xs text-muted-foreground hover:underline font-gu"
            >
              પ્રોફાઇલમાંથી સત્તા બદલો (Swap Role in Profile)
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Action methods
  const handleCreateAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName.trim() || !newAdminMobile.trim() || !newAdminPassword.trim()) {
      toast.warning("રજીસ્ટ્રેશન માટે વિગતો અધૂરી છે! (All fields including password are required!)");
      return;
    }

    if (newAdminPassword.length < 4) {
      toast.warning("પાસવર્ડ ઓછામાં ઓછો ૪ આંકડાનો હોવો જોઈએ. (Password must be at least 4 characters.)");
      return;
    }

    try {
      const templateAdmin: DBUser = {
        uid: "adm_" + newAdminMobile.trim(),
        studentId: newAdminMobile.trim(), // Enable login by entering the mobile number as Student ID
        fullName: newAdminName.trim(),
        mobile: newAdminMobile.trim(),
        passwordHash: hashSync(newAdminPassword, 10),
        school: newAdminSchool || "સરકારી શાળા",
        standard: newAdminStd,
        role: "admin",
        status: "approved",
        createdAt: new Date().toISOString()
      };

      await SuperAdminRepository.createAdmin(templateAdmin);
      await SuperAdminRepository.addSecurityLog({
        eventType: "config_change",
        userId: user.uid,
        userName: user.fullName || "Super Admin",
        userRole: "super_admin",
        details: `બનાવવામાં આવ્યું નવું સત્તાધિકારી ખાતું: ${newAdminName} (${newAdminMobile})`
      });

      toast.success("નવા સંચાલક ખાતાની રચના સફળતાપૂર્વક થઈ ગઈ છે!");
      setShowAddAdminModal(false);
      setNewAdminName("");
      setNewAdminMobile("");
      setNewAdminSchool("");
      setNewAdminPassword("");
      loadData();
    } catch (e) {
      toast.error("ખાતું સેટ કરવામાં ભૂલ આવી.");
    }
  };

  const handleUpdateAdminStatus = async (uid: string, status: "approved" | "blocked" | "pending") => {
    try {
      await SuperAdminRepository.updateAdminStatus(uid, status);
      await SuperAdminRepository.addSecurityLog({
        eventType: "config_change",
        userId: user.uid,
        userName: user.fullName || "Super Admin",
        userRole: "super_admin",
        details: `બદલાયેલ સંચાલક ઓળખ ગુણધર્મ: UID: ${uid} -> status: ${status}`
      });

      toast.success(`સંચાલક ખાતાની સત્તા બદલીને ${status} કરી દેવામાં આવી છે.`);
      loadData();
    } catch (e) {
      toast.error("સ્થિતિ બદલવામાં ખામી સર્જાઈ.");
    }
  };

  const handleDeleteAdmin = async (uid: string) => {
    if (!confirm("Are you sure you want to permanently delete this Admin?")) return;
    try {
      await SuperAdminRepository.deleteAdmin(uid);
      await SuperAdminRepository.addSecurityLog({
        eventType: "config_change",
        userId: user.uid,
        userName: user.fullName || "Super Admin",
        userRole: "super_admin",
        details: `permanent deletion of admin UID: ${uid}`
      });
      toast.success("સંચાલક ખાતું કાયમી ધોરણે રદ કરવામાં આવ્યું!");
      loadData();
    } catch (e) {
      toast.error("રદ કરવામાં ભૂલ.");
    }
  };

  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserId.trim() || !newUserPassword.trim() || !newUserName.trim()) {
      toast.warning("Please fill all required student/user fields!");
      return;
    }

    const studentIdClean = newUserId.trim();
    const generatedUid = "user_" + studentIdClean;
    const hashedPassword = hashSync(newUserPassword, 10);

    const newUserProfile: DBUser = {
      uid: generatedUid,
      studentId: studentIdClean,
      passwordHash: hashedPassword,
      fullName: newUserName.trim(),
      mobile: newUserMobile.trim(),
      school: newUserSchool.trim(),
      standard: newUserStd,
      division: newUserDiv,
      village: newUserVillage.trim(),
      role: newUserRoleState as any,
      status: "Approved",
      createdAt: new Date().toISOString()
    };

    try {
      await AdminRepository.createUserByAdmin(user.uid, user.fullName || "Super Admin", newUserProfile);
      toast.success(`User ${newUserName} (${newUserRoleState}) successfully registered!`);
      
      // Reset form fields
      setNewUserId("");
      setNewUserPassword("");
      setNewUserName("");
      setNewUserMobile("");
      setNewUserSchool("");
      setNewUserVillage("");
      setShowAddUserSection(false);

      // Reload
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to register new user.");
    }
  };

  const handleSaveSettings = async () => {
    try {
      await SuperAdminRepository.updateSettings({
        appName: cfgAppName,
        appVersion: cfgAppVersion,
        supportContact: cfgSupport,
        maintenanceMode: cfgMaintenance,
        maintenanceBanner: cfgBanner,
        instantPushToggled: cfgPush,
        badgeThresholdGold: thresholdGold,
        badgeThresholdSilver: thresholdSilver,
        badgeThresholdBronze: thresholdBronze
      });

      await SuperAdminRepository.addSecurityLog({
        eventType: "config_change",
        userId: user.uid,
        userName: user.fullName || "Super Admin",
        userRole: "super_admin",
        details: `વૈશ્વિક સિસ્ટમ સુયોજન અપડેટ (વિદ્યાર્થી મર્યાદા સેટિંગ્સ સુધારો, મેન્ટેનન્સ: ${cfgMaintenance})`
      });

      toast.success("વૈશ્વિક નિયંત્રણો અને સેટિંગ્સ સુરક્ષિત રીતે સાચવવામાં આવી છે!");
      loadData();
    } catch (e) {
      toast.error("નિયંત્રણો અપડેટ કરવામાં નિષ્ફળતા.");
    }
  };

  const handleSaveUpdateSettings = async () => {
    try {
      setIsSavingUpdateSettings(true);
      await SuperAdminRepository.updateAppUpdateSettings({
        latestVersion: updLatestVersion,
        mandatory: updMandatory,
        apkUrl: updApkUrl,
        releaseNotes: updReleaseNotes
      });

      await SuperAdminRepository.addSecurityLog({
        eventType: "config_change",
        userId: user.uid,
        userName: user.fullName || "Super Admin",
        userRole: "super_admin",
        details: `એપ અપડેટ સુયોજન બદલાવ (વર્ઝન: ${updLatestVersion}, ફરજિયાત: ${updMandatory})`
      });

      toast.success("App update configuration successfully saved!");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save app update configuration.");
    } finally {
      setIsSavingUpdateSettings(false);
    }
  };

  const handleWipeSystem = async () => {
    if (!user) return;
    if (wipeConfirmationText.trim().toUpperCase() !== "WIPE") {
      toast.error("પુષ્ટિ કરવા માટે કૃપા કરીને સાચો કીવર્ડ 'WIPE' ટાઈપ કરો.");
      return;
    }

    try {
      setIsWiping(true);
      const report = await SuperAdminRepository.wipeSystemData(user.uid, {
        wipeSyllabus,
        wipeUsers
      });
      
      await SuperAdminRepository.addSecurityLog({
        eventType: "config_change",
        userId: user.uid,
        userName: user.fullName || "Super Admin",
        userRole: "super_admin",
        details: `સંપૂર્ણ સિસ્ટમ રીસેટ પ્રક્રિયા સફળતાપૂર્વક પૂર્ણ થઈ. (Syllabus: ${wipeSyllabus}, Users: ${wipeUsers})`
      });

      setWipeReport(report);
      setShowWipeModal(false);
      setWipeConfirmationText("");
      setShowWipeReportModal(true);
      toast.success("સિસ્ટમ સાફ કરવાની પ્રક્રિયા પૂર્ણ થઈ છે!");
      loadData();
    } catch (err: any) {
      console.error("System wipe error:", err);
      toast.error(`સિસ્ટમ સાફ કરવામાં ભૂલ આવી: ${err.message || String(err)}`);
    } finally {
      setIsWiping(false);
    }
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMessage.trim()) {
      toast.warning("કૃપા કરીને શીર્ષક અને સંદેશ પૂર્ણ કરો!");
      return;
    }

    try {
      const activeTargets = students.filter((s) => {
        if (annStd !== "all" && s.standard !== annStd) return false;
        if (annSchool !== "all" && s.school !== annSchool) return false;
        if (annVillage !== "all" && s.village !== annVillage) return false;
        return true;
      });

      const newAnn: Announcement = {
        id: "ann_" + Date.now(),
        title: annTitle,
        message: annMessage,
        targetStandard: annStd,
        targetSchool: annSchool,
        targetVillage: annVillage,
        senderName: user.fullName || "સુપર એડમિન",
        sentAt: new Date().toISOString(),
        readRate: 100,
        readCount: activeTargets.length,
        totalCount: activeTargets.length
      };

      await SuperAdminRepository.sendAnnouncement(newAnn);

      // Save announcements to matching targeted students' notify in Firestore/LocalStorage
      for (const std of activeTargets) {
        await AdminRepository.sendSystemNotification(
          user.uid,
          user.fullName || "Super Admin",
          std.standard || "all",
          "exam",
          annTitle,
          annMessage
        );
      }

      await SuperAdminRepository.addSecurityLog({
        eventType: "config_change",
        userId: user.uid,
        userName: user.fullName || "Super Admin",
        userRole: "super_admin",
        details: `બ્રોડકાસ્ટ જાહેરાત મોકલવામાં આવી: "${annTitle}" - Standard: ${annStd}`
      });

      toast.success(`📢 જાહેરાત સફળતાપૂર્વક ${activeTargets.length} વિદ્યાર્થીઓને મોકલાઈ!`);
      setAnnTitle("");
      setAnnMessage("");
      loadData();
    } catch (e) {
      toast.error("જાહેરાત પ્રસારણમાં ત્રુટિ.");
    }
  };

  const handleTriggerBackup = async () => {
    try {
      sfx.tap();
      const backupResult = await SuperAdminRepository.triggerBackup(user.fullName || "Super Admin");
      await SuperAdminRepository.addSecurityLog({
        eventType: "config_change",
        userId: user.uid,
        userName: user.fullName || "Super Admin",
        userRole: "super_admin",
        details: `મેન્યુઅલ હોટ-બેકઅપ સુરક્ષિત રીતે ડાઉનલોડ પ્રક્રિયા: ${backupResult.backupName}`
      });
      toast.success(`બેકઅપ સફળતાપૂર્વક લેવાયો: ${backupResult.backupName}`);
      loadData();
    } catch (e) {
      toast.error("બેકઅપ નિષ્ફળ.");
    }
  };

  const handleRunMigration = async () => {
    if (!user) return;
    try {
      sfx.tap();
      setIsMigrating(true);
      const toastId = toast.loading("માધ્યમ સ્થળાંતર પ્રક્રિયા ચાલી રહી છે... (Migrating learning mediums...)");
      const result = await AdminRepository.migrateMissingMediumToGujarati(user.uid, user.fullName || "Super Admin");
      toast.dismiss(toastId);
      toast.success(`માધ્યમ સ્થળાંતર સફળ! સ્કેન કરેલ: ${result.totalScanned}, અપડેટ કરેલ: ${result.migratedCount}`);
      loadData();
    } catch (e: any) {
      toast.error("સ્થળાંતર નિષ્ફળ: " + (e.message || String(e)));
    } finally {
      setIsMigrating(false);
    }
  };

  const handleTriggerLeaderboardSync = async () => {
    try {
      setIsLeaderboardSyncing(true);
      sfx.tap();
      const toastId = toast.loading("લીડરબોર્ડ અને મોક ટેસ્ટ પોઈન્ટ સંકલન ચાલી રહ્યું છે...");

      await PointsRepository.syncAllLeaderboards();

      try {
        const boardLogs = await PointsRepository.getLeaderboardAuditLogs();
        setLeaderboardLogs(boardLogs);
      } catch (logErr) {
        console.warn("Failed loading logs post sync:", logErr);
      }

      await SuperAdminRepository.addSecurityLog({
        eventType: "config_change",
        userId: user.uid,
        userName: user.fullName || "Super Admin",
        userRole: "super_admin",
        details: "લીડરબોર્ડ ડેટાબેઝ અપડેટ અને રીકોમ્પ્યુટેશન પ્રક્રિયા સફળતાપૂર્વક સંપન્ન થઈ."
      });

      toast.success("તમામ લીડરબોર્ડ પ્લેસમેન્ટ અને માર્કસ ગણતરી સંપન્ન!", { id: toastId });
      loadData();
    } catch (e: any) {
      console.warn("Leaderboard manual sync error:", e);
      toast.error("લીડરબોર્ડ સંકલન પ્રક્રિયા ચલાવવામાં ક્ષતિ આવી છે.");
    } finally {
      setIsLeaderboardSyncing(false);
    }
  };

  // Export CSV generator
  const handleExportDataCsv = (dataType: "students" | "admins" | "questions" | "security") => {
    let csvContent = "data:text/csv;charset=utf-8,";
    let filename = `${dataType}_export_${new Date().toISOString().split("T")[0]}.csv`;

    if (dataType === "students") {
      csvContent += "UID,FullName,Mobile,School,Standard,Village,Points,Role,Status,CreatedAt\n";
      students.forEach((s) => {
        csvContent += `"${s.uid}","${s.fullName}","${s.mobile}","${s.school}","${s.standard}","${s.village}",500,"${s.role}","${s.status || "approved"}","${s.createdAt || ""}"\n`;
      });
    } else if (dataType === "admins") {
      csvContent += "UID,FullName,Mobile,School,Standard,Role,Status,CreatedAt\n";
      admins.forEach((a) => {
        csvContent += `"${a.uid}","${a.fullName}","${a.mobile}","${a.school}","${a.standard}","${a.role}","${a.status}","${a.createdAt || ""}"\n`;
      });
    } else if (dataType === "security") {
      csvContent += "ID,EventType,UserId,UserName,UserRole,Details,Timestamp\n";
      securityLogs.forEach((l) => {
        csvContent += `"${l.id}","${l.eventType}","${l.userId}","${l.userName}","${l.userRole}","${l.details}","${l.timestamp}"\n`;
      });
    } else {
      csvContent += "ID,Type,Title,SentAt,ReadCount,TotalCount\n";
      announcements.forEach((an) => {
        csvContent += `"${an.id}","announcement","${an.title}","${an.sentAt}",${an.readCount},${an.totalCount}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`${dataType.toUpperCase()} સત્ર ડેટા રિકોર્ડ્સ નિકાસ સંપન્ન!`);
  };

  // List dynamic parameters
  const filteredAdmins = admins.filter(
    (a) =>
      a.fullName.toLowerCase().includes(adminSearch.toLowerCase()) ||
      a.mobile.includes(adminSearch)
  );

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.mobile && s.mobile.includes(studentSearch));
    const matchesStd = studentFilterStd === "all" || s.standard === studentFilterStd;
    return matchesSearch && matchesStd;
  });

  return (
    <AppShell title="Super Control" titleGu="મુખ્ય સત્તાધિકારી કેન્દ્ર" back="/dashboard">
      {loading ? (
        <div className="min-h-[60vh] flex flex-col items-center justify-center bg-background gap-3">
          <Loader2 className="size-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-gu">સમગ્ર વહીવટી ડેટાબેઝ મેળવી રહ્યા છીએ...</p>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-5 pb-11">
          {/* HEADER HERO ACCENT */}
          <div className="rounded-3xl bg-gradient-to-br from-purple-800 to-indigo-950 p-6 text-white shadow-float relative overflow-hidden">
            <div className="absolute -bottom-10 -right-10 size-40 rounded-full bg-white/5 blur-2xl font-sans" />
            <div className="relative">
              <span className="inline-flex items-center gap-1 bg-white/10 text-xs text-indigo-200 px-3 py-1 rounded-full font-black font-mono">
                👑 SYSTEM OWNER COMMAND
              </span>
              <h2 className="text-xl font-bold mt-3 font-sans">SUPER CONTROL PANEL</h2>
              <p className="text-xs text-indigo-200/90 font-gu">
                મોનિટરિંગ, વૈશ્વિક એડમિન સત્તાઓ, બેકઅપ્સ, સિક્યોરિટી એલર્ટ્સ અને કસ્ટમ જાહેરાતોનું નિયંત્રણ અત્રેથી થશે.
              </p>
            </div>
          </div>

          {/* TAB BAR NAVIGATION */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 mx-[-16px] px-4 scrollbar-none sticky top-14 bg-background z-20 py-2 border-b border-border">
            {[
              { id: "overview", label: "Overview", icon: Activity },
              { id: "analytics", label: "Advanced Analytics", icon: Activity },
              { id: "admins", label: "Admins", icon: Shield },
              { id: "students", label: "Students", icon: Users },
              { id: "requests", label: "➕ Requests", icon: Plus },
              { id: "leaderboard", label: "🏆 Leaderboard", icon: Trophy },
              { id: "announcements", label: "📢 Custom", icon: Send },
              { id: "settings", label: "Config", icon: Settings },
              { id: "backups", label: "Backups", icon: HardDrive },
              { id: "export", label: "Export", icon: Download }
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    sfx.tap();
                  }}
                  className={`px-4 py-2 text-xs font-semibold rounded-2xl shrink-0 flex items-center gap-1.5 transition active:scale-95 ${
                    active
                      ? "gradient-primary text-primary-foreground shadow-float"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  <Icon className="size-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TABS CONTENT */}

          {activeTab === "analytics" && (
            <div className="animate-[fade-in_0.35s_ease-out]">
              <AdvancedAnalyticsDashboard
                studentAnalytics={studentAnalytics}
                subjectAnalytics={subjectAnalytics}
                chapterAnalytics={chapterAnalytics}
                questionAnalytics={questionAnalytics}
                schoolAnalytics={schoolAnalytics}
                villageAnalytics={villageAnalytics}
                standardAnalytics={standardAnalytics}
                learningTrends={learningTrends}
                analyticsReports={analyticsReports}
                onRefresh={loadData}
                userRole="super_admin"
              />
            </div>
          )}

          {/* TAB 1: OVERVIEW & SYSTEM HEALTH */}
          {activeTab === "overview" && (
            <div className="space-y-4 animate-[fade-in_0.35s_ease-out]">
              {/* SYSTEM HEALTH STATUS BADGE */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-300 rounded-3xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 size-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 size-3 bg-emerald-500" />
                  </span>
                  <div>
                    <p className="text-xs uppercase font-bold tracking-wider">SYSTEM HEALTH: ONLINE</p>
                    <p className="text-[10px] text-muted-foreground">All cloud servers and connection arrays operational</p>
                  </div>
                </div>
                <div className="text-right text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg">
                  LATENCY: ~{latency}ms
                </div>
              </div>

              {/* OVERVIEW STATS BENTO */}
              <div className="grid grid-cols-2 gap-3">
                <BentoCard icon={<Users className="text-primary" />} label="Students" value={students.length} />
                <BentoCard icon={<Shield className="text-violet-500" />} label="Active Admins" value={admins.filter(a => a.status === "approved").length} />
                <BentoCard icon={<Database className="text-indigo-500" />} label="Security Audits" value={securityLogs.length} />
                <BentoCard icon={<Send className="text-amber-500" />} label="Announcements" value={announcements.length} />
              </div>

              {/* LIVE SECURITY LOG MONITOR */}
              <div className="bg-card border border-border rounded-3xl p-5 shadow-card space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm">SECURITY MONITOR LOGS</h3>
                    <p className="text-[10px] text-muted-foreground">Real-time authentication audits / system state changes</p>
                  </div>
                  <span className="text-[10px] bg-destructive/10 text-destructive border border-destructive/10 px-2.5 py-0.5 rounded-full font-black uppercase font-mono">
                    SECURE SHIELD
                  </span>
                </div>

                <div className="divide-y divide-border max-h-72 overflow-y-auto pr-1 space-y-2.5">
                  {securityLogs.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No security events triggered.</p>
                  ) : (
                    securityLogs.slice(0, 8).map((log) => (
                      <div key={log.id} className="pt-2 flex gap-3 text-xs">
                        <div className="shrink-0 mt-0.5">
                          {log.eventType === "login_success" ? (
                            <span className="size-2 rounded-full block bg-success" />
                          ) : log.eventType === "login_failed" || log.eventType === "privilege_escalation" ? (
                            <span className="size-2 rounded-full block bg-destructive animate-pulse" />
                          ) : (
                            <span className="size-2 rounded-full block bg-warning" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                            <span className="font-bold uppercase tracking-wider text-muted-foreground font-mono">
                              {log.eventType}
                            </span>
                            <span className="font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-foreground text-xs leading-relaxed mt-0.5 font-gu">{log.details}</p>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            BY: {log.userName} (role: {log.userRole})
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ADMINS MANAGEMENT */}
          {activeTab === "admins" && (
            <div className="space-y-4 animate-[fade-in_0.35s_ease-out]">
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground font-gu">
                  મંજૂર સંચાલકોની યાદી નીચે મુજબ છે. તેઓ વિષયો, પ્રશ્નો અને વિદ્યાર્થી પરીક્ષાઓ સંભાળે છે.
                </p>
                <button
                  onClick={() => {
                    setShowAddAdminModal(true);
                    sfx.tap();
                  }}
                  className="gradient-primary text-primary-foreground font-bold text-xs h-9 px-3.5 rounded-xl flex items-center gap-1.5 shadow-sm shrink-0"
                >
                  <Plus className="size-4" /> Add Admin
                </button>
              </div>

              {/* SEARCH FIELD */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="નામ અથવા ફોન નંબરથી એડમિન શોધો..."
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  className="w-full h-11 bg-card border border-border rounded-2xl pl-10 pr-4 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              {/* ADMINS CARD DIRECTORY */}
              <div className="space-y-3">
                {filteredAdmins.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">કોઈ મેળ ખાતા વહીવટી ખાતા મળ્યા નથી.</p>
                ) : (
                  filteredAdmins.map((adm) => (
                    <div key={adm.uid} className="bg-card border border-border rounded-3xl p-4 shadow-sm space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm truncate">{adm.fullName}</h4>
                          <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-muted-foreground font-gu">
                            <span className="flex items-center gap-0.5 bg-muted px-2 py-0.5 rounded-md">
                              <Phone className="size-3" /> {adm.mobile}
                            </span>
                            <span className="flex items-center gap-0.5 bg-muted px-2 py-0.5 rounded-md">
                              <School className="size-3" /> {adm.school}
                            </span>
                          </div>
                        </div>

                        {/* Status Badges */}
                        <div className="shrink-0 flex gap-1">
                          {adm.status === "approved" && (
                            <span className="text-[10px] bg-success-soft text-success border border-success/10 font-bold px-2.5 py-0.5 rounded-full font-sans uppercase">
                              Active
                            </span>
                          )}
                          {adm.status === "blocked" && (
                            <span className="text-[10px] bg-destructive-soft text-destructive border border-destructive/10 font-bold px-2.5 py-0.5 rounded-full font-sans uppercase">
                              Blocked
                            </span>
                          )}
                          {adm.status === "pending" && (
                            <span className="text-[10px] bg-warning-soft text-warning border border-warning/10 font-bold px-2.5 py-0.5 rounded-full font-sans uppercase">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons inside admin card */}
                      <div className="flex items-center justify-between border-t border-border pt-3 gap-2">
                        <button
                          onClick={() => {
                            setSelectedAdminLogs(adm);
                            sfx.tap();
                          }}
                          className="text-[11px] font-bold text-primary hover:underline font-gu flex items-center gap-1"
                        >
                          પ્રક્રિયા લોગ જુઓ (View Log)
                        </button>

                        <div className="flex gap-2">
                          {adm.status !== "approved" && (
                            <button
                              onClick={() => handleUpdateAdminStatus(adm.uid, "approved")}
                              className="text-[10px] font-bold bg-success-soft text-success px-2.5 py-1 rounded-xl border border-success/10 active:scale-95 transition"
                            >
                              Approve
                            </button>
                          )}
                          {adm.status !== "blocked" && (
                            <button
                              onClick={() => handleUpdateAdminStatus(adm.uid, "blocked")}
                              className="text-[10px] font-bold bg-destructive-soft text-destructive px-2.5 py-1 rounded-xl border border-destructive/10 active:scale-95 transition"
                            >
                              Block
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteAdmin(adm.uid)}
                            className="size-7 rounded-xl bg-muted text-muted-foreground hover:text-destructive flex items-center justify-center transition active:scale-95 border border-border"
                            title="Delete permanently"
                          >
                            <Trash className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* SPECIFIC ADMIN ACTIVITY PREVIEW */}
              {selectedAdminLogs && (
                <div className="bg-card border-2 border-primary/20 rounded-3xl p-5 shadow-card space-y-4 animate-[scale-in_0.3s_ease-out]">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-primary">
                      ACTIVITY LOG: {selectedAdminLogs.fullName}
                    </h3>
                    <button
                      onClick={() => setSelectedAdminLogs(null)}
                      className="size-6 bg-muted rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/70"
                    >
                      <X className="size-3.5" strokeWidth={3} />
                    </button>
                  </div>

                  <div className="max-h-52 overflow-y-auto divide-y divide-border space-y-2">
                    {auditLogs.filter((log) => log.adminId === selectedAdminLogs.uid).length === 0 ? (
                      <p className="text-xs text-muted-foreground p-3 text-center">No action logs found for this admin.</p>
                    ) : (
                      auditLogs
                        .filter((log) => log.adminId === selectedAdminLogs.uid)
                        .map((log, i) => (
                          <div key={i} className="pt-2 text-xs">
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span className="font-bold underline">{log.actionType}</span>
                              <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                            </div>
                            <p className="mt-1 text-foreground leading-relaxed font-gu">{log.details}</p>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}

              {/* SYSTEM RESET CONFIRMATION MODAL */}
              {showWipeModal && (
                <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
                  <div className="bg-card border-2 border-destructive/30 rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl animate-[scale-in_0.3s_ease-out] text-left">
                    <div className="flex justify-between items-center pb-2 border-b border-border">
                      <div className="flex items-center gap-2 text-destructive font-gu">
                        <AlertTriangle className="size-5 animate-pulse" />
                        <h4 className="font-extrabold text-sm uppercase">અતિ મહત્વપૂર્ણ ચેતવણી</h4>
                      </div>
                      <button
                        onClick={() => {
                          setShowWipeModal(false);
                          setWipeConfirmationText("");
                        }}
                        className="size-8 bg-muted rounded-full flex items-center justify-center text-muted-foreground"
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs text-foreground/90 font-bold leading-relaxed font-gu">
                        આ પ્રક્રિયા સમગ્ર એપ્લિકેશનમાંથી વિદ્યાર્થીઓનો તમામ રેકોર્ડ, પરિણામો, પુનરાવર્તન અને સ્ટ્રીક ડેટા કાયમી ધોરણે <b>ડીલીટ (DELETE)</b> કરી નાખશે.
                      </p>
                      
                      {wipeSyllabus && (
                        <p className="p-2.5 bg-destructive/10 text-destructive text-[11px] font-bold rounded-xl font-gu">
                          ⚠️ આપે <b>'અભ્યાસક્રમ અને પ્રશ્ન સંગ્રહ'</b> વાઇપ કરવાનું પસંદ કર્યું છે, તેથી બધા જ વિષયો, ચેપ્ટરો અને પ્રશ્નો ભૂંસાઈ જશે!
                        </p>
                      )}

                      {wipeUsers && (
                        <p className="p-2.5 bg-destructive/10 text-destructive text-[11px] font-bold rounded-xl font-gu">
                          ⚠️ આપે <b>'તમામ યુઝર્સ અને પ્રોફાઇલ્સ'</b> વાઇપ કરવાનું પસંદ કર્યું છે, તેથી આપના સિવાય તમામ વિદ્યાર્થીઓ અને શિક્ષકો લોગઆઉટ થઈ જશે!
                        </p>
                      )}

                      <div className="bg-muted/50 p-3 rounded-2xl border border-border text-[11px] font-medium leading-relaxed text-muted-foreground font-gu">
                        તમે લોગ ઈન કરેલ સુપર એડમિન હોવાથી તમારો પોતાનો એક્સેસ સુરક્ષિત રહેશે જેથી આપ સિસ્ટમ નવેસરથી લોન્ચ કરી શકો.
                      </div>

                      <div className="space-y-2 pt-1">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider block">
                          પુષ્ટિ કરવા માટે નીચે <b>WIPE</b> લખો (Type WIPE to confirm):
                        </label>
                        <input
                          type="text"
                          placeholder="WIPE"
                          value={wipeConfirmationText}
                          onChange={(e) => setWipeConfirmationText(e.target.value)}
                          className="w-full h-11 bg-muted border-2 border-destructive/20 focus:border-destructive rounded-2xl px-3 text-sm font-bold text-center tracking-widest uppercase focus:outline-none focus:ring-0"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowWipeModal(false);
                          setWipeConfirmationText("");
                        }}
                        className="h-11 rounded-2xl bg-muted hover:bg-muted/70 text-xs font-bold text-center font-gu transition active:scale-95"
                      >
                        રદ કરો (Cancel)
                      </button>
                      <button
                        type="button"
                        onClick={handleWipeSystem}
                        disabled={isWiping || wipeConfirmationText.trim().toUpperCase() !== "WIPE"}
                        className="h-11 rounded-2xl bg-destructive hover:bg-destructive/90 text-white text-xs font-extrabold text-center font-gu flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-40 cursor-pointer"
                      >
                        {isWiping ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" />
                            વાઇપિંગ...
                          </>
                        ) : (
                          "વાઇપ ડેટા (Wipe)"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SYSTEM WIPE DETAILED REPORT MODAL */}
              {showWipeReportModal && wipeReport && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-md">
                  <div className="bg-card border border-border rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-[scale-in_0.3s_ease-out]">
                    <div className="flex justify-between items-center pb-2 border-b border-border">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-5 text-emerald-500" />
                        <h4 className="font-extrabold text-sm uppercase font-gu text-emerald-500">વાઇપ ડેટા પરિણામ રિપોર્ટ (Wipe Report)</h4>
                      </div>
                      <button
                        onClick={() => {
                          setShowWipeReportModal(false);
                          setWipeReport(null);
                        }}
                        className="size-8 bg-muted rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition"
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center bg-muted/40 p-3 rounded-xl border border-border">
                        <span className="text-xs font-bold text-muted-foreground font-gu">ડેટાબેઝ મોડ (Database Mode):</span>
                        {wipeReport.isPlaceholder ? (
                          <span className="px-2.5 py-1 text-[10px] font-black bg-amber-500/10 text-amber-500 rounded-full uppercase tracking-wider">
                            MOCK / LOCAL STORAGE
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-[10px] font-black bg-emerald-500/10 text-emerald-500 rounded-full uppercase tracking-wider">
                            LIVE CLOUD FIRESTORE
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground font-gu">
                        નીચે તમામ કલેક્શનની સાફ-સફાઈ અને રદ કરાયેલ ડેટાની વિગતો દર્શાવેલ છે:
                      </div>

                      <div className="max-h-60 overflow-y-auto border border-border rounded-2xl bg-muted/20 divide-y divide-border">
                        {wipeReport.results.map((res, idx) => {
                          const isSuccess = !res.error;
                          return (
                            <div key={idx} className="p-3 flex justify-between items-center text-xs">
                              <div className="space-y-0.5">
                                <span className="font-mono font-semibold text-foreground/90">{res.name}</span>
                                {res.error && (
                                  <div className="text-[10px] text-destructive font-semibold font-mono leading-tight">
                                    Error: {res.error}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground font-medium">
                                  {res.count === -1 ? "Error" : `${res.count} items found`}
                                </span>
                                {isSuccess ? (
                                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-emerald-500/10 text-emerald-500">
                                    -{res.deleted} deleted
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-destructive/10 text-destructive">
                                    Failed
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowWipeReportModal(false);
                          setWipeReport(null);
                        }}
                        className="w-full h-11 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold text-center font-gu transition active:scale-95"
                      >
                        રિપોર્ટ બંધ કરો (Close)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* CREATE ADMIN MODAL DIALOG */}
              {showAddAdminModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
                  <div className="bg-card border border-border rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-[scale-in_0.3s_ease-out]">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-sm">Create Admin Access Account</h4>
                      <button
                        onClick={() => setShowAddAdminModal(false)}
                        className="size-8 bg-muted rounded-full flex items-center justify-center text-muted-foreground"
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    <form onSubmit={handleCreateAdminSubmit} className="space-y-3 text-left">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase">Адмін full name</label>
                        <input
                          type="text"
                          required
                          placeholder="દા.ત. હરેશ પંડ્યા"
                          value={newAdminName}
                          onChange={(e) => setNewAdminName(e.target.value)}
                          className="w-full h-11 bg-muted border border-border rounded-2xl px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase">Mobile Number (10 digit)</label>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          placeholder="દા.ત. 9426094260"
                          value={newAdminMobile}
                          onChange={(e) => setNewAdminMobile(e.target.value)}
                          className="w-full h-11 bg-muted border border-border rounded-2xl px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase">Login Password (લૉગિન પાસવર્ડ)</label>
                        <input
                          type="text"
                          required
                          placeholder="દા.ત. Admin@123"
                          value={newAdminPassword}
                          onChange={(e) => setNewAdminPassword(e.target.value)}
                          className="w-full h-11 bg-muted border border-border rounded-2xl px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                        <p className="text-[10px] text-muted-foreground">આ પાસવર્ડ અને મોબાઈલ નંબરથી આ એડમિન લોગિન કરી શકશે.</p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase">Managing School / City</label>
                        <input
                          type="text"
                          placeholder="દા.ત. શારદા મંદિર અમદાવાદ"
                          value={newAdminSchool}
                          onChange={(e) => setNewAdminSchool(e.target.value)}
                          className="w-full h-11 bg-muted border border-border rounded-2xl px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase">Standard Code (1-10)</label>
                        <select
                          value={newAdminStd}
                          onChange={(e) => setNewAdminStd(e.target.value)}
                          className="w-full h-11 bg-muted border border-border rounded-2xl px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                        >
                          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map((st) => (
                            <option key={st} value={st}>Standard {st}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="w-full h-11 rounded-2xl gradient-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 shadow-float text-xs uppercase"
                      >
                        Create Authorized admin
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: USER MANAGEMENT */}
          {activeTab === "students" && (
            <div className="space-y-4 animate-[fade-in_0.35s_ease-out]">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-card border border-border rounded-2xl px-4 py-3 text-xs">
                <div>
                  <span className="text-muted-foreground font-gu">કુલ વિદ્યાર્થી નોંધણી:</span>
                  <span className="font-bold text-primary font-mono ml-1">{students.length} registers</span>
                </div>
                <button
                  onClick={() => setShowAddUserSection(!showAddUserSection)}
                  className="px-3 py-1.5 rounded-xl gradient-primary text-primary-foreground text-[11px] font-bold flex items-center gap-1 active:scale-95 transition"
                >
                  {showAddUserSection ? "✕ Close Form" : "➕ Add Student / User"}
                </button>
              </div>

              {/* EXPANDABLE ADD NEW USER SECTION */}
              {showAddUserSection && (
                <div className="bg-card border border-border rounded-3xl p-5 shadow-md space-y-4 animate-[slide-up_0.3s_ease-out]">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-xl bg-teal-500/10 text-teal-600">
                      <Users className="size-4" />
                    </span>
                    <div>
                      <h3 className="font-bold text-sm">REGISTER NEW SYSTEM ACCOUNT</h3>
                      <p className="text-[10px] text-muted-foreground">કોઈપણ રોલ ધરાવતું અકાઉન્ટ સીધું ઉમેરો (Direct creation)</p>
                    </div>
                  </div>

                  <form onSubmit={handleCreateNewUser} className="space-y-3 text-left">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Student / User ID *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 10052"
                          value={newUserId}
                          onChange={(e) => setNewUserId(e.target.value)}
                          className="w-full h-11 bg-muted border border-border rounded-2xl px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Plain password *</label>
                        <input
                          type="password"
                          required
                          placeholder="e.g. password"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          className="w-full h-11 bg-muted border border-border rounded-2xl px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rameshbhai Patel"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        className="w-full h-11 bg-muted border border-border rounded-2xl px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Mobile Number</label>
                        <input
                          type="text"
                          placeholder="e.g. 9876543210"
                          value={newUserMobile}
                          onChange={(e) => setNewUserMobile(e.target.value)}
                          className="w-full h-11 bg-muted border border-border rounded-2xl px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">School / Institution</label>
                        <input
                          type="text"
                          placeholder="e.g. Model High School"
                          value={newUserSchool}
                          onChange={(e) => setNewUserSchool(e.target.value)}
                          className="w-full h-11 bg-muted border border-border rounded-2xl px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Village / City</label>
                        <input
                          type="text"
                          placeholder="e.g. Palanpur"
                          value={newUserVillage}
                          onChange={(e) => setNewUserVillage(e.target.value)}
                          className="w-full h-11 bg-muted border border-border rounded-2xl px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">System Account Role</label>
                        <select
                          value={newUserRoleState}
                          onChange={(e) => setNewUserRoleState(e.target.value)}
                          className="w-full h-11 bg-muted border border-border rounded-2xl px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                        >
                          <option value="student">Student</option>
                          <option value="teacher">Teacher</option>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Standard</label>
                        <select
                          value={newUserStd}
                          onChange={(e) => setNewUserStd(e.target.value)}
                          className="w-full h-11 bg-muted border border-border rounded-2xl px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                        >
                          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map((st) => (
                            <option key={st} value={st}>Standard {st}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Division / Section</label>
                        <input
                          type="text"
                          placeholder="e.g. A"
                          value={newUserDiv}
                          onChange={(e) => setNewUserDiv(e.target.value)}
                          className="w-full h-11 bg-muted border border-border rounded-2xl px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full h-11 rounded-2xl gradient-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 shadow-float text-xs uppercase"
                    >
                      Create Registered Account
                    </button>
                  </form>
                </div>
              )}

              {/* FILTER CONTROLS */}
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search standard/name..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full h-10 bg-card border border-border rounded-2xl pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <select
                  value={studentFilterStd}
                  onChange={(e) => setStudentFilterStd(e.target.value)}
                  className="h-10 bg-card border border-border rounded-2xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">તમામ ધોરણ (All Std)</option>
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map((st) => (
                    <option key={st} value={st}>Standard {st}</option>
                  ))}
                </select>
              </div>

              {/* STUDENTS DIRECTORY CARDS */}
              <div className="space-y-3">
                {filteredStudents.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">કોઈ મેળ ખાતા વિદ્યાર્થી રેકોર્ડ્સ મળ્યા નથી.</p>
                ) : (
                  filteredStudents.slice(0, 15).map((std) => (
                    <div key={std.uid} className="bg-card border border-border rounded-3xl p-4 shadow-sm space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm truncate">{std.fullName}</h4>
                          <p className="text-[11px] text-muted-foreground font-gu leading-normal mt-0.5">
                            Standard {std.standard} • {std.school || "નોંધણી વિગત રહિત"} • {std.village || "નિયત સ્થાનક"}
                          </p>
                        </div>
                        <span className="text-[10px] bg-primary-soft text-primary font-black px-2.5 py-0.5 rounded-full font-mono shrink-0">
                          STD {std.standard}
                        </span>
                      </div>

                      {/* STATS PREVIEW SUMMARY */}
                      {(() => {
                        const analytics = studentAnalytics.find(sa => sa.studentId === std.studentId || sa.studentId === std.uid || sa.id === std.uid || sa.id === std.studentId);
                        const totalExams = analytics?.totalExams ?? 0;
                        const accuracy = analytics?.averageScore ? `${Math.round(analytics.averageScore)}%` : "0%";
                        const streak = analytics?.learningStreak ?? 0;
                        return (
                          <div className="grid grid-cols-3 gap-2 bg-muted/60 p-2.5 rounded-2xl text-center text-xs">
                            <div>
                              <p className="font-black text-foreground font-mono">{totalExams}</p>
                              <p className="text-[9px] text-muted-foreground uppercase font-semibold">Exams Taken</p>
                            </div>
                            <div>
                              <p className="font-black text-success font-mono">{accuracy}</p>
                              <p className="text-[9px] text-muted-foreground uppercase font-semibold">Accuracy</p>
                            </div>
                            <div>
                              <p className="font-black text-warning font-mono">{streak}</p>
                              <p className="text-[9px] text-muted-foreground uppercase font-semibold">Streak Days</p>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Operational Controls for Super Admin */}
                      <div className="pt-3 border-t border-border/60 mt-3 space-y-2 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 font-bold">
                            Status: 
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-normal border uppercase ${
                              (std.status || "Approved").toLowerCase() === "approved" 
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200" 
                                : "bg-rose-100 text-rose-800 border-rose-200"
                            }`}>
                              {std.status || "Approved"}
                            </span>
                          </span>
                          
                          <span className="inline-flex items-center gap-1.5 font-bold">
                            Role:
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-800 border border-slate-200 uppercase font-mono font-bold">
                              {std.role || "student"}
                            </span>
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={async () => {
                              try {
                                const nextStatus = (std.status || "Approved").toLowerCase() === "approved" ? "Blocked" : "Approved";
                                await AdminRepository.setUserStatus(user.uid, user.fullName || "Super Admin", std.uid, nextStatus);
                                toast.success(`${std.fullName} status updated to ${nextStatus}!`);
                                loadData();
                              } catch (e: any) {
                                toast.error(e.message || "Failed to edit user status");
                              }
                            }}
                            className={`h-9 rounded-xl border text-[10px] font-bold active:scale-95 transition ${
                              (std.status || "Approved").toLowerCase() === "approved"
                                ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            }`}
                          >
                            {(std.status || "Approved").toLowerCase() === "approved" ? "🚫 Disable Access" : "✅ Approve Access"}
                          </button>

                          <button
                            onClick={async () => {
                              const newPass = prompt(`Enter a new password for ${std.fullName}:`);
                              if (newPass === null) return;
                              if (newPass.trim().length < 4) {
                                toast.error("Password must be at least 4 characters long.");
                                return;
                              }
                              try {
                                await AdminRepository.resetUserPassword(user.uid, user.fullName || "Super Admin", std.uid, newPass.trim());
                                toast.success(`Password for ${std.fullName} has been reset successfully!`);
                                loadData();
                              } catch (e: any) {
                                toast.error(e.message || "Failed to reset password");
                              }
                            }}
                            className="h-9 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-[10px] font-bold active:scale-95 transition border border-border"
                          >
                            🔑 Reset Password
                          </button>
                        </div>

                        <div className="pt-1 flex items-center justify-between gap-2 bg-muted/30 p-2 rounded-xl">
                          <span className="font-semibold text-[10px] text-muted-foreground shrink-0">Change Role:</span>
                          <select
                            value={std.role || "student"}
                            onChange={async (e) => {
                              const newRole = e.target.value;
                              try {
                                await AdminRepository.changeUserRole(user.uid, user.fullName || "Super Admin", std.uid, newRole);
                                toast.success(`${std.fullName} role changed to ${newRole}!`);
                                loadData();
                              } catch (e: any) {
                                toast.error(e.message || "Failed to change role");
                              }
                            }}
                            className="text-[10px] bg-card border border-border rounded-lg px-2 py-1 outline-none font-bold"
                          >
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {filteredStudents.length > 15 && (
                  <p className="text-[10px] text-center text-muted-foreground py-2 font-gu">
                    અને વધુ {filteredStudents.length - 15} સ્માર્ટ વિદ્યાર્થીઓ...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: CUSTOM ANNOUNCEMENTS CENTER */}
          {activeTab === "announcements" && (
            <div className="space-y-4 animate-[fade-in_0.35s_ease-out]">
              <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-primary-soft text-primary">
                    <Send className="size-4" />
                  </span>
                  <div>
                    <h3 className="font-bold text-sm">BROADCAST NEW ANNOUNCEMENT</h3>
                    <p className="text-[10px] text-muted-foreground">બુલેટિન બોર્ડ પર સ્માર્ટ જાહેરાતો મોકલો</p>
                  </div>
                </div>

                <form onSubmit={handleSendAnnouncement} className="space-y-3.5 text-left">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">ક્રિએટિવ શીર્ષક (Title)</label>
                    <input
                      type="text"
                      required
                      placeholder="દા.ત. પ્રથમ સત્ર પરીક્ષા પુનરાવર્તન ટેસ્ટ"
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                      className="w-full h-11 bg-muted border border-border rounded-2xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">સંદેશો (Announcement Message)</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="તમામ રસ ધરાવતા વિદ્યાર્થીઓને સમયપત્રક મુજબ હાજર રહેવા જણાવવાનું..."
                      value={annMessage}
                      onChange={(e) => setAnnMessage(e.target.value)}
                      className="w-full bg-muted border border-border rounded-2xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary font-gu resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1 text-left">
                      <label className="text-[9px] font-black text-muted-foreground uppercase">Target Standard</label>
                      <select
                        value={annStd}
                        onChange={(e) => setAnnStd(e.target.value)}
                        className="w-full h-10 bg-muted border border-border rounded-xl px-2 text-xs"
                      >
                        <option value="all">All Standards</option>
                        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map((st) => (
                          <option key={st} value={st}>Standard {st}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1 text-left">
                      <label className="text-[9px] font-black text-muted-foreground uppercase">Target School</label>
                      <select
                        value={annSchool}
                        onChange={(e) => setAnnSchool(e.target.value)}
                        className="w-full h-10 bg-muted border border-border rounded-xl px-2 text-xs"
                      >
                        <option value="all">All Schools</option>
                        {uniqueSchools.map((sch) => (
                          <option key={sch} value={sch}>{sch}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1 text-left">
                      <label className="text-[9px] font-black text-muted-foreground uppercase">Target Village</label>
                      <select
                        value={annVillage}
                        onChange={(e) => setAnnVillage(e.target.value)}
                        className="w-full h-10 bg-muted border border-border rounded-xl px-2 text-xs"
                      >
                        <option value="all">All Villages</option>
                        {uniqueVillages.map((vil) => (
                          <option key={vil} value={vil}>{vil}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full h-11 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 shadow-float text-xs uppercase"
                  >
                    <Send className="size-4" /> Send targeted news
                  </button>
                </form>
              </div>

              {/* RECENT BULLETINS DISPLAY */}
              <div className="space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">PREVIOUS BROADCAST HISTORY</h3>
                {announcements.map((ann) => (
                  <div key={ann.id} className="bg-card border border-border rounded-3xl p-4 shadow-sm space-y-2">
                    <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                      <span>BY: {ann.senderName}</span>
                      <span>{new Date(ann.sentAt).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-bold text-sm text-foreground">{ann.title}</h4>
                    <p className="text-xs text-muted-foreground font-gu leading-relaxed">{ann.message}</p>
                    <div className="flex gap-2 text-[9px] text-muted-foreground font-mono pt-1">
                      <span>Target Std: {ann.targetStandard}</span>
                      <span>•</span>
                      <span>School: {ann.targetSchool}</span>
                      <span>•</span>
                      <span>Vill: {ann.targetVillage}</span>
                      <span>•</span>
                      <span className="text-primary font-black">Success Ratio: {ann.readRate}% ({ann.readCount} push alerts)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: GLOBAL CONFIGURATION & SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-4 animate-[fade-in_0.35s_ease-out]">
              <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-5">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-primary-soft text-primary">
                    <Settings className="size-4" />
                  </span>
                  <div>
                    <h3 className="font-bold text-sm">GLOBAL APP PARAMETERS</h3>
                    <p className="text-[10px] text-muted-foreground">દૈનિક પરીક્ષા સિસ્ટમ સેટિંગ્સ સંચાલન</p>
                  </div>
                </div>

                <div className="space-y-4 text-left">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Application brand Name</label>
                    <input
                      type="text"
                      value={cfgAppName}
                      onChange={(e) => setCfgAppName(e.target.value)}
                      className="w-full h-11 bg-muted border border-border rounded-2xl px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">Software Version</label>
                      <input
                        type="text"
                        value={cfgAppVersion}
                        onChange={(e) => setCfgAppVersion(e.target.value)}
                        className="w-full h-11 bg-muted border border-border rounded-2xl px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">Help Desk Call/Contact</label>
                      <input
                        type="text"
                        value={cfgSupport}
                        onChange={(e) => setCfgSupport(e.target.value)}
                        className="w-full h-11 bg-muted border border-border rounded-2xl px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* MAINTENANCE MODE ZONE BLOCKING */}
                  <div className="p-4 bg-warning-soft border-2 border-warning/30 rounded-3xl space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="size-5 text-warning" />
                        <div>
                          <p className="text-xs uppercase font-black tracking-wide text-warning-foreground">
                            MAINTENANCE MODE SYSTEM
                          </p>
                          <p className="text-[9px] text-muted-foreground uppercase font-semibold">Toggles global student lock</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setCfgMaintenance((prev) => !prev);
                          sfx.tap();
                        }}
                        className={`w-11 h-6 rounded-full p-0.5 flex items-center transition duration-300 focus:outline-none ${
                          cfgMaintenance ? "bg-warning justify-end" : "bg-muted justify-start"
                        }`}
                      >
                        <span className="size-5 rounded-full bg-card shadow-md flex items-center justify-center text-warning" />
                      </button>
                    </div>

                    {cfgMaintenance && (
                      <div className="space-y-1.5 animate-[slide-down_0.2s_ease-out]">
                        <label className="text-[10px] font-bold text-warning-foreground uppercase font-gu">
                          સિસ્ટમ મેન્ટેનન્સ બેનર સંદેશ (Configured Gujarati lock screen banner)
                        </label>
                        <textarea
                          rows={2}
                          value={cfgBanner}
                          onChange={(e) => setCfgBanner(e.target.value)}
                          placeholder="દા.ત. દૈનિક ટેસ્ટ સર્વર અપગ્રેડેશન ચાલુ છે..."
                          className="w-full bg-card border border-warning/20 rounded-2xl p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-warning"
                        />
                        <p className="text-[9px] text-warning-foreground/80 leading-relaxed italic font-gu">
                          💡 આ મોડ સક્રિય હોવાથી તમામ <b>વિદ્યાર્થી (Student)</b> લોગિન મોડુલ અને એક્ટિવ પરીક્ષા સ્ક્રીનો કાયમી ધોરણે બ્લોક રહેશે. એડમિન અને સુપર એડમિન મુક્તપણે લૉગિન કરી આ મોડ બંધ કરી શકશે.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* NOTIFICATION LOGIC */}
                  <div className="flex items-center justify-between p-4 bg-muted/60 rounded-3xl">
                    <div>
                      <p className="text-xs font-bold text-foreground">INSTANT PUSH NOTIFICATIONS</p>
                      <p className="text-[9px] text-muted-foreground uppercase font-semibold">Trigger FCM dynamic dispatchers automatically</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCfgPush((prev) => !prev);
                        sfx.tap();
                      }}
                      className={`w-11 h-6 rounded-full p-0.5 flex items-center transition duration-300 focus:outline-none ${
                        cfgPush ? "bg-primary justify-end" : "bg-muted justify-start"
                      }`}
                    >
                      <span className="size-5 rounded-full bg-card shadow-md" />
                    </button>
                  </div>

                  {/* ACCURACY BADGE THRESHOLDS */}
                  <div className="bg-muted/40 p-4 border border-border rounded-3xl space-y-3">
                    <div className="flex items-center gap-1 text-xs font-bold uppercase text-primary">
                      <Award className="size-4" />
                      <span>Smart Badge unlocking Thresholds %</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-gu">
                      સિસ્ટમમાં વિદ્યાર્થી મોક ટેસ્ટમાં લાવેલા સરેરાશ ટકા ના આધારે ઓટો-બેજ અપાય છે:
                    </p>

                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-[9px] text-muted-foreground uppercase font-bold">🥇 Gold Score</label>
                        <input
                          type="number"
                          value={thresholdGold}
                          onChange={(e) => setThresholdGold(parseInt(e.target.value))}
                          className="w-full h-9 bg-card border border-border rounded-xl text-center text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted-foreground uppercase font-bold">🥈 Silver Score</label>
                        <input
                          type="number"
                          value={thresholdSilver}
                          onChange={(e) => setThresholdSilver(parseInt(e.target.value))}
                          className="w-full h-9 bg-card border border-border rounded-xl text-center text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted-foreground uppercase font-bold">🥉 Bronze Score</label>
                        <input
                          type="number"
                          value={thresholdBronze}
                          onChange={(e) => setThresholdBronze(parseInt(e.target.value))}
                          className="w-full h-9 bg-card border border-border rounded-xl text-center text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    className="w-full h-11 rounded-2xl gradient-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 shadow-float text-xs uppercase font-gu"
                  >
                    Save configuration changes
                  </button>
                </div>
              </div>

              {/* APP VERSION / UPDATE SYSTEM MANAGEMENT */}
              <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-5">
                <div className="flex items-center gap-2 text-left">
                  <span className="p-1.5 rounded-xl bg-primary-soft text-primary">
                    <RefreshCw className="size-4" />
                  </span>
                  <div>
                    <h3 className="font-bold text-sm uppercase">APP VERSION & UPDATE MANAGEMENT</h3>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">એપ અપડેટ અને એપીકે રીલીઝ સંચાલન</p>
                  </div>
                </div>

                <div className="space-y-4 text-left">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Latest Version</label>
                      <input
                        type="text"
                        placeholder="e.g. 1.0.0"
                        value={updLatestVersion}
                        onChange={(e) => setUpdLatestVersion(e.target.value)}
                        className="w-full h-11 bg-muted border border-border rounded-2xl px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Mandatory Update</label>
                      <div className="flex items-center h-11 bg-muted border border-border rounded-2xl px-3">
                        <button
                          type="button"
                          onClick={() => {
                            setUpdMandatory((prev) => !prev);
                            sfx.tap();
                          }}
                          className={`w-11 h-6 rounded-full p-0.5 flex items-center transition duration-300 focus:outline-none ${
                            updMandatory ? "bg-primary justify-end" : "bg-muted-foreground/30 justify-start"
                          }`}
                        >
                          <span className="size-5 rounded-full bg-card shadow-md" />
                        </button>
                        <span className="text-xs font-semibold ml-2 text-foreground/80 font-gu">
                          {updMandatory ? "ફરજિયાત" : "મરજીયાત"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">APK Download URL</label>
                    <input
                      type="url"
                      placeholder="https://example.com/builds/app-latest.apk"
                      value={updApkUrl}
                      onChange={(e) => setUpdApkUrl(e.target.value)}
                      className="w-full h-11 bg-muted border border-border rounded-2xl px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase text-left">Release Notes (Gujarati / English)</label>
                    <textarea
                      rows={3}
                      placeholder="નવી સુવિધાઓ વિગતો અહીં લખો... e.g. - Added Daily revision logs&#10;- Fixed layout overlap"
                      value={updReleaseNotes}
                      onChange={(e) => setUpdReleaseNotes(e.target.value)}
                      className="w-full bg-muted border border-border rounded-2xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveUpdateSettings}
                    disabled={isSavingUpdateSettings}
                    className="w-full h-11 rounded-2xl gradient-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 shadow-float text-xs uppercase disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingUpdateSettings ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin text-white" />
                        Saving Updates...
                      </>
                    ) : (
                      "Save App Update Settings"
                    )}
                  </button>
                </div>
              </div>

              {/* SYSTEM RESET / NEW APP LAUNCH CARD */}
              <div className="bg-card border border-destructive/20 rounded-3xl p-5 shadow-sm space-y-5">
                <div className="flex items-center gap-2 text-left">
                  <span className="p-1.5 rounded-xl bg-destructive/10 text-destructive">
                    <Trash className="size-4" />
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-destructive uppercase">SYSTEM RESET & NEW LAUNCH</h3>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">સિસ્ટમ ક્લીન અપ અને નવી સજ્જતા</p>
                  </div>
                </div>

                <div className="space-y-4 text-left font-gu">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    નવી શૈક્ષણિક ટર્મ શરૂ કરવા માટે અથવા નવી એપ્લિકેશન લોન્ચ કરવા માટે જૂનો તમામ વિદ્યાર્થીઓનો ડેટા સાફ કરો. નીચે આપેલ ઓપ્શન્સ કાળજીપૂર્વક પસંદ કરો:
                  </p>

                  <div className="space-y-3 bg-muted/40 p-4 rounded-3xl border border-border text-xs">
                    {/* Syllabus Wipe Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="pr-3">
                        <p className="font-black text-foreground">વિષય અને પ્રશ્ન બેંક વાઇપ કરો (Wipe Syllabus)</p>
                        <p className="text-[10px] text-muted-foreground">તમામ સબ્જેક્ટ, ચેપ્ટર અને ક્વેશ્ચન સંગ્રહ કાયમી ડીલીટ થશે.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setWipeSyllabus((prev) => !prev);
                          sfx.tap();
                        }}
                        className={`w-11 h-6 rounded-full p-0.5 flex items-center shrink-0 transition duration-300 focus:outline-none ${
                          wipeSyllabus ? "bg-destructive justify-end" : "bg-muted-foreground/30 justify-start"
                        }`}
                      >
                        <span className="size-5 rounded-full bg-card shadow-md" />
                      </button>
                    </div>

                    <hr className="border-border/60" />

                    {/* Users Wipe Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="pr-3">
                        <p className="font-black text-foreground">તમામ વિદ્યાર્થી અને સ્ટાફ એકાઉન્ટ વાઇપ કરો (Wipe Accounts)</p>
                        <p className="text-[10px] text-muted-foreground">આપના પોતાના સુપર એડમિન સિવાયના તમામ એકાઉન્ટ ડીલીટ કરો.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setWipeUsers((prev) => !prev);
                          sfx.tap();
                        }}
                        className={`w-11 h-6 rounded-full p-0.5 flex items-center shrink-0 transition duration-300 focus:outline-none ${
                          wipeUsers ? "bg-destructive justify-end" : "bg-muted-foreground/30 justify-start"
                        }`}
                      >
                        <span className="size-5 rounded-full bg-card shadow-md" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-warning-soft border border-warning/20 rounded-2xl text-[10px] text-warning-foreground leading-relaxed">
                    💡 <b>નોંધ:</b> વિદ્યાર્થીઓની પ્રગતિ, એક્ઝામ રિઝલ્ટ્સ, ભૂલો અને નોટિફિકેશન ઇતિહાસ <b>હમેશા સંપૂર્ણ ક્લીન થશે</b>. માત્ર ક્વેશ્ચન બેંક અને પ્રોફાઇલ્સ રાખવી કે નહીં તે ઉપરથી નક્કી કરી શકાશે.
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      sfx.tap();
                      setShowWipeModal(true);
                    }}
                    className="w-full h-11 rounded-2xl bg-destructive text-white font-extrabold flex items-center justify-center gap-2 shadow-sm text-xs uppercase hover:bg-destructive/95 transition active:scale-98 cursor-pointer"
                  >
                    <AlertTriangle className="size-4" />
                    સિસ્ટમ સંપૂર્ણ ક્લીન કરો (Wipe System Data)
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 6: SYSTEM BACKUP MANAGEMENT */}
          {activeTab === "backups" && (
            <div className="space-y-4 animate-[fade-in_0.35s_ease-out]">
              <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                      <HardDrive className="size-4" />
                    </span>
                    <div>
                      <h3 className="font-bold text-sm">FIRESTORE HOT-BACKUP</h3>
                      <p className="text-[10px] text-muted-foreground">સંપૂર્ણ ડેટાબેઝ સુરક્ષિત સ્નેપશોટ મોડ્યુલ</p>
                    </div>
                  </div>

                  <button
                    onClick={handleTriggerBackup}
                    className="gradient-primary text-primary-foreground text-xs font-bold h-9 px-3.5 rounded-xl flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 hover:text-white"
                  >
                    <RefreshCw className="size-3 text-white spin-slow" /> Hot-Backup
                  </button>
                </div>

                <p className="text-xs text-muted-foreground font-gu leading-relaxed">
                  સોફ્ટવેર ક્રેસ અથવા સર્વર ભંગાણ સામે વૈશ્વિક બચાવ માટે અત્રેથી લિખિત મોડ્યુલ દ્વારા મેન્યુઅલ રિકોર્ડ કોપી બનાવી શકાય છે. સંચાલકો તેનું સંકલન કરી શકે છે.
                </p>
              </div>

              {/* ONE-TIME MEDIUM MIGRATION UTILITY */}
              <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                      <Globe className="size-4" />
                    </span>
                    <div>
                      <h3 className="font-bold text-sm">ONE-TIME MEDIUM MIGRATION</h3>
                      <p className="text-[10px] text-muted-foreground">વિદ્યાર્થી ભાષા માધ્યમ સ્થળાંતર સેટઅપ (Default: Gujarati)</p>
                    </div>
                  </div>

                  <button
                    onClick={handleRunMigration}
                    disabled={isMigrating}
                    className="gradient-primary text-primary-foreground text-xs font-bold h-9 px-3.5 rounded-xl flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 hover:text-white disabled:opacity-50"
                  >
                    {isMigrating ? <Loader2 className="size-3 animate-spin text-white" /> : <RefreshCw className="size-3 text-white" />} Migration
                  </button>
                </div>

                <p className="text-xs text-muted-foreground font-gu leading-relaxed">
                  અગાઉના જૂના વિદ્યાર્થી રેકોર્ડ્સમાં ધોરણ માધ્યમ (Gujarati / English Medium) ની પસંદગી ગુમ હોઈ શકે છે. આ યુટિલિટી દ્વારા તે તમામ વિગત વગરના રેકોર્ડ્સને આપમેળે 'Gujarati Medium' માં સ્થાનાંતરિત કરવામાં આવશે.
                </p>
              </div>

              {/* BACKUP LOG LISTINGS */}
              <div className="space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">HOT-BACKUP STORAGE REGISTRY</h3>
                {backups.map((bk) => (
                  <div key={bk.id} className="bg-card border border-border rounded-3xl p-4 shadow-sm flex justify-between items-center gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-success" />
                        <h4 className="font-bold text-xs font-mono truncate text-foreground">{bk.backupName}</h4>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Triggered on {new Date(bk.timestamp).toLocaleString()} • Size: {bk.sizeMB}MB
                      </p>
                      <p className="text-[10px] text-muted-foreground font-gu">ઓપરેટર: {bk.triggeredBy}</p>
                    </div>

                    <button
                      onClick={() => {
                        toast.success(`બેકઅપ પુનર્જીવિત થઈ ગયું છે (Restored backup: ${bk.backupName})`);
                        sfx.tap();
                      }}
                      className="h-8 rounded-lg border border-border bg-muted px-3 text-[10px] font-bold text-foreground shrink-0 hover:bg-muted/70 active:scale-95 transition uppercase"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: LEADERBOARD MANAGEMENT PANEL */}
          {activeTab === "leaderboard" && (
            <div className="space-y-4 animate-[fade-in_0.35s_ease-out]">
              {/* MAIN METRICS & STATS CARD */}
              <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-500">
                      <Trophy className="size-4 text-amber-500 animate-bounce" />
                    </span>
                    <div>
                      <h3 className="font-bold text-sm">LEADERBOARD ENGINE CONTROL</h3>
                      <p className="text-[10px] text-muted-foreground">લીડરબોર્ડ સિંક્રનાઇઝેશન અને મોનિટરિંગ કંટ્રોલ</p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] px-2.5 py-1 rounded-full font-bold">
                    ● ACTIVE ENGINE
                  </span>
                </div>

                <p className="text-xs text-muted-foreground font-gu leading-relaxed">
                  વિદ્યાર્થીઓ માટે દૈનિક, સાપ્તાહિક, માસિક અને ઓલ-ટાઇમ માર્ક્સ સંકલિત કરી ક્રમાંક (Ranks) અને બેજ નક્કી કરવા માટેનું હેડક્વાર્ટર. નીચે આપેલા ઓટો-સિંક બટન પર ક્લિક કરીને તમે સમગ્ર ગણતરી રન કરી શકો છો.
                </p>

                {/* THE TRIGGER BUTTON BOX */}
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-left w-full sm:w-auto">
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-300">લીડરબોર્ડ ગણતરી ફરી શરૂ કરો</p>
                    <p className="text-[10px] text-muted-foreground">આ પ્રોસેસ ક્લાઉડ ફંક્શન્સ રન કરી તમામ સ્કેલ રૈંક ઓટો અપડેટ કરશે.</p>
                  </div>

                  <button
                    onClick={handleTriggerLeaderboardSync}
                    disabled={isLeaderboardSyncing}
                    className="w-full sm:w-auto px-5 h-11 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 shadow-md whitespace-nowrap"
                  >
                    {isLeaderboardSyncing ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>પ્રોસેસિંગ...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="size-3.5" />
                        <span>Force Sync Leaderboard</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* TIMESPANS PREVIEWS REGISTRY */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { name: "Daily Span", code: "daily", color: "from-blue-500/10 to-indigo-500/10 border-blue-500/20 text-blue-500", desc: "દરરોજ રાત્રે અપડેટ થાય" },
                  { name: "Weekly Span", code: "weekly", color: "from-purple-500/10 to-pink-500/10 border-purple-500/20 text-purple-500", desc: "દર સોમવારે સવારનો સ્કેલ" },
                  { name: "Monthly Span", code: "monthly", color: "from-green-500/10 to-teal-500/10 border-green-500/20 text-green-500", desc: "દર મહિનાની પહેલી તારીખે" },
                  { name: "Alltime Span", code: "alltime", color: "from-amber-500/10 to-orange-500/10 border-amber-500/20 text-amber-500", desc: "કુલ વિદ્યાર્થી સ્કોર્સ પ્લેસમેન્ટ" }
                ].map((sp) => (
                  <div key={sp.code} className={`bg-gradient-to-br ${sp.color} border p-4 rounded-3xl text-left`}>
                    <p className="text-xs font-bold font-sans">{sp.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{sp.desc}</p>
                    <span className="inline-flex items-center gap-1 mt-2 bg-background border border-border text-[8px] px-2 py-0.5 rounded-full font-bold font-mono">
                      SYNC READY
                    </span>
                  </div>
                ))}
              </div>

              {/* AUDIT LOG LISTINGS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">LEADERBOARD AUDIT LOGS (સિંક રિપોર્ટ્સ)</h3>
                  <button
                    onClick={async () => {
                      try {
                        const boardLogs = await PointsRepository.getLeaderboardAuditLogs();
                        setLeaderboardLogs(boardLogs);
                        toast.success("લોગ્સ અપડેટ કરવામાં આવ્યા!");
                      } catch (err) {
                        toast.error("લોગ લોડિંગ નિષ્ફળ.");
                      }
                    }}
                    className="text-[10px] font-bold text-primary hover:underline"
                  >
                    Refresh Logs
                  </button>
                </div>

                {leaderboardLogs.length === 0 ? (
                  <div className="border border-border border-dashed rounded-3xl p-6 text-center text-muted-foreground bg-muted/20">
                    <Trophy className="size-6 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-xs font-medium font-gu">હજી સુધી કોઈ લીડરબોર્ડ ઓડિટ નથી મળી શક્યા.</p>
                    <p className="text-[10px] text-muted-foreground/75 mt-0.5">પ્રથમ પ્રક્રિયા શરૂ કરવા ઉપર આપેલા "Force Sync" બટનનો ઉપયોગ કરો.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {leaderboardLogs.map((log) => {
                      const hasErrors = log.errors && log.errors.length > 0;
                      return (
                        <div key={log.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col gap-2 text-left">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`size-2 rounded-full ${hasErrors ? "bg-destructive animate-pulse" : "bg-success"}`} />
                                <h4 className="font-bold text-xs font-mono text-foreground">{log.id}</h4>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Synced on: {new Date(log.generationTime).toLocaleString()}
                              </p>
                            </div>

                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${hasErrors ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
                              {hasErrors ? "Failed / Linked" : "Success"}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-1 border-t border-border pt-2 text-[10px] text-muted-foreground font-semibold">
                            <div>
                              <span className="block text-[8px] uppercase tracking-wider text-muted-foreground">RECORDS PROCESSED</span>
                              <span className="text-foreground font-bold">{log.recordsProcessed ?? 0} students</span>
                            </div>
                            <div>
                              <span className="block text-[8px] uppercase tracking-wider text-muted-foreground">DURATION</span>
                              <span className="text-foreground font-bold">{log.functionDuration ?? 0} ms</span>
                            </div>
                          </div>

                          {hasErrors && (
                            <div className="mt-1 bg-destructive/5 border border-destructive/25 rounded-xl p-2.5 text-[10px] text-destructive leading-relaxed font-gu">
                              <strong>खोटी प्रक्रीयाओ (Errors):</strong> {log.errors.join(", ")}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: COMPLETE DATA EXPORT GRID */}
          {activeTab === "export" && (
            <div className="space-y-4 animate-[fade-in_0.35s_ease-out]">
              <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 animate-pulse">
                  <span className="p-1.5 rounded-xl bg-success-soft text-success">
                    <Download className="size-4" />
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">SYSTEM EXPORT SUITE</h3>
                    <p className="text-[10px] text-muted-foreground">બોર્ડ વિગતો નિકાસ કરવા માટે ડેટા ડાઉનલોડ સેક્શન</p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground font-gu leading-relaxed">
                  બધા શૈક્ષણિક વિષય સંબંધી અહેવાલો, સંચાલન પ્રવૃત્તિ લોગ અને વિદ્યાર્થીઓની સ્કોર વિગતો ડાઉનલોડ કરવા માટે સીધા બટન નીચે આપેલા છે.
                </p>

                <div className="grid grid-cols-1 gap-2.5 pt-2 text-left">
                  <div className="bg-muted/65 p-4 rounded-3xl flex justify-between items-center gap-3 border border-border">
                    <div>
                      <p className="text-xs font-bold text-foreground">STUDENT DIRECTORY REGISTRY</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Contains uid, mobile, school, standard</p>
                    </div>
                    <button
                      onClick={() => handleExportDataCsv("students")}
                      className="size-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition active:scale-95 shadow-sm"
                    >
                      <Download className="size-4 text-white" />
                    </button>
                  </div>

                  <div className="bg-muted/65 p-4 rounded-3xl flex justify-between items-center gap-3 border border-border">
                    <div>
                      <p className="text-xs font-bold text-foreground">ADMIN STAFF ROSTER</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Provides full personnel records</p>
                    </div>
                    <button
                      onClick={() => handleExportDataCsv("admins")}
                      className="size-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition active:scale-95 shadow-sm"
                    >
                      <Download className="size-4 text-white" />
                    </button>
                  </div>

                  <div className="bg-muted/65 p-4 rounded-3xl flex justify-between items-center gap-3 border border-border">
                    <div>
                      <p className="text-xs font-bold text-foreground">BULLETINS & ANNOUNCEMENTS</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Sent notices, target parameters</p>
                    </div>
                    <button
                      onClick={() => handleExportDataCsv("questions")}
                      className="size-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition active:scale-95 shadow-sm"
                    >
                      <Download className="size-4 text-white" />
                    </button>
                  </div>

                  <div className="bg-muted/65 p-4 rounded-3xl flex justify-between items-center gap-3 border border-border">
                    <div>
                      <p className="text-xs font-bold text-foreground">FAILED ATTEMPTS & SECURITY EVENT LOGS</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Failed otps, privilege warnings</p>
                    </div>
                    <button
                      onClick={() => handleExportDataCsv("security")}
                      className="size-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition active:scale-95 shadow-sm"
                    >
                      <Download className="size-4 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "requests" && (
            <div className="space-y-6 animate-[fade-in_0.35s_ease-out]">
              {/* Core descriptive card */}
              <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-primary-soft text-primary">
                    <Plus className="size-4" />
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">NEW INTEGRATION REQUESTS</h3>
                    <p className="text-[10px] text-muted-foreground font-gu">નવી શાળાઓ અને ગામ અપ્રુવલ વિનંતીઓ</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground font-gu leading-relaxed">
                  વિદ્યાર્થીઓ જ્યારે નવા રજીસ્ટ્રેશન ફોર્મમાં પોતાની શાળા કે ગામ ન મેળવી શકે ત્યારે તેઓ આગ્રહ પત્ર / વિનંતી (Request) મૂકે છે. અહીથી સંચાલક તેને ચકાસીને મંજૂર કરી શકે છે જેથી તે મુખ્ય ડેટાબેઝમાં ઉમેરાઈ જાય.
                </p>
              </div>

              {/* SECTION 1: SCHOOL REQUESTS */}
              <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4 text-left">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">SCHOOL REQUESTS ({schoolRequests.length})</h4>
                  <span className="text-[10px] text-teal-600 font-bold bg-teal-500/10 px-2.5 py-0.5 rounded-full">
                    {schoolRequests.filter(r => r.status === "pending").length} PENDING
                  </span>
                </div>

                {schoolRequests.length === 0 ? (
                  <div className="border border-border border-dashed rounded-2xl p-6 text-center text-muted-foreground bg-muted/10 font-gu text-xs">
                    હજી સુધી કોઈ શાળાની વિનંતીઓ નોંધાયેલ નથી.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {schoolRequests.map((req) => (
                      <div key={req.requestId} className="bg-muted/30 border border-border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:bg-muted/40">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">{req.schoolName}</span>
                            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              req.status === "pending" ? "bg-amber-500/10 text-amber-600" :
                              req.status === "approved" ? "bg-success/10 text-success" :
                              "bg-destructive/10 text-destructive"
                            }`}>
                              {req.status}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground font-gu flex flex-wrap gap-x-4 gap-y-1">
                            <span>📍 ગામ/શહેર: <strong className="text-foreground">{req.village}</strong></span>
                            <span>👤 વિનંતીકર્તા: <strong className="text-foreground">{req.requestedBy}</strong></span>
                            {req.createdAt && <span>🗓️ તારીખ: {new Date(req.createdAt).toLocaleDateString()}</span>}
                          </div>
                        </div>

                        {req.status === "pending" && (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={async () => {
                                sfx.tap();
                                try {
                                  await MasterDataRepository.approveSchoolRequest(req.requestId);
                                  toast.success("શાળા મંજૂર કરવામાં આવી અને ડેટાબેઝ પ્રક્રિયા સફળ થઈ!");
                                  await loadData();
                                } catch (e) {
                                  toast.error("મંજૂરી પ્રક્રિયા મોકલવામાં સમસ્યા આવી.");
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl bg-success text-success-foreground text-[11px] font-bold transition active:scale-95 cursor-pointer flex items-center gap-1"
                            >
                              <Check className="size-3" /> Approve
                            </button>
                            <button
                              onClick={async () => {
                                sfx.tap();
                                try {
                                  await MasterDataRepository.rejectSchoolRequest(req.requestId);
                                  toast.success("વિનંતી ના-મંજૂર કરવામાં આવી.");
                                  await loadData();
                                } catch (e) {
                                  toast.error("પ્રક્રિયા અસફળ રહી.");
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl bg-destructive text-destructive-foreground text-[11px] font-bold transition active:scale-95 cursor-pointer flex items-center gap-1"
                            >
                              <X className="size-3" /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 2: VILLAGE REQUESTS */}
              <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4 text-left">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">VILLAGE REQUESTS ({villageRequests.length})</h4>
                  <span className="text-[10px] text-violet-600 font-bold bg-violet-500/10 px-2.5 py-0.5 rounded-full">
                    {villageRequests.filter(r => r.status === "pending").length} PENDING
                  </span>
                </div>

                {villageRequests.length === 0 ? (
                  <div className="border border-border border-dashed rounded-2xl p-6 text-center text-muted-foreground bg-muted/10 font-gu text-xs">
                    હજી સુધી કોઈ ગામની વિનંતીઓ નોંધાયેલ નથી.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {villageRequests.map((req) => (
                      <div key={req.requestId} className="bg-muted/30 border border-border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:bg-muted/40">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">{req.villageName}</span>
                            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              req.status === "pending" ? "bg-amber-500/10 text-amber-600" :
                              req.status === "approved" ? "bg-success/10 text-success" :
                              "bg-destructive/10 text-destructive"
                            }`}>
                              {req.status}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground font-gu flex flex-wrap gap-x-4 gap-y-1">
                            <span>👤 વિનંતીકર્તા: <strong className="text-foreground">{req.requestedBy}</strong></span>
                            {req.createdAt && <span>🗓️ તારીખ: {new Date(req.createdAt).toLocaleDateString()}</span>}
                          </div>
                        </div>

                        {req.status === "pending" && (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={async () => {
                                sfx.tap();
                                try {
                                  await MasterDataRepository.approveVillageRequest(req.requestId);
                                  toast.success("ગામ મંજૂર કરવામાં આવ્યું અને ડેટાબેઝ પ્રક્રિયા સફળ થઈ!");
                                  await loadData();
                                } catch (e) {
                                  toast.error("મંજૂરી પ્રક્રિયા મોકલવામાં સમસ્યા આવી.");
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl bg-success text-success-foreground text-[11px] font-bold transition active:scale-95 cursor-pointer flex items-center gap-1"
                            >
                              <Check className="size-3" /> Approve
                            </button>
                            <button
                              onClick={async () => {
                                sfx.tap();
                                try {
                                  await MasterDataRepository.rejectVillageRequest(req.requestId);
                                  toast.success("વિનંતી ના-મંજૂર કરવામાં આવી.");
                                  await loadData();
                                } catch (e) {
                                  toast.error("પ્રક્રિયા અસફળ રહી.");
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl bg-destructive text-destructive-foreground text-[11px] font-bold transition active:scale-95 cursor-pointer flex items-center gap-1"
                            >
                              <X className="size-3" /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}

// BENTO STAT CARD
function BentoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="bg-card border border-border rounded-3xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between h-28 text-left">
      <div className="size-8 rounded-xl bg-muted flex items-center justify-center border border-border">
        {icon}
      </div>
      <div>
        <p className="text-xl font-black font-sans leading-none text-foreground mt-2">{value}</p>
        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-1.5">{label}</p>
      </div>
    </div>
  );
}
