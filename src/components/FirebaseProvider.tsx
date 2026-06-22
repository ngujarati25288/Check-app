import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  db,
  isFirebasePlaceholder 
} from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  type User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { DBUser } from '../types';
import { UserRepository, AdminRepository, getLocalStorageKey, setLocalStorageKey } from '../lib/db';
import { registerFcmToken } from '../lib/fcm';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { compareSync, hashSync } from 'bcryptjs';

interface AuthContextType {
  user: DBUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  loginWithStudentId: (studentId: string, passwordPlain: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  registerStudent: (fields: {
    fullName: string;
    passwordPlain: string;
    mobile: string;
    school: string;
    standard: string;
    division: string;
    village: string;
    medium: string;
  }) => Promise<boolean>;
  signOut: () => Promise<void>;
  isStudent: () => boolean;
  isTeacher: () => boolean;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserRaw] = useState<DBUser | null>(null);

  // Helper to get formatted date in Asia/Kolkata timezone on the client-side
  const getKolkataDateString = (date = new Date()): string => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const parts = formatter.formatToParts(date);
      const yVal = parts.find(p => p.type === 'year')?.value || "";
      const mVal = parts.find(p => p.type === 'month')?.value || "";
      const dVal = parts.find(p => p.type === 'day')?.value || "";
      return `${yVal}-${mVal}-${dVal}`;
    } catch (err) {
      return date.toISOString().split('T')[0];
    }
  };

  const getKolkataDaysDifference = (dateStr1: string, dateStr2: string): number => {
    if (!dateStr1 || !dateStr2) return Infinity;
    try {
      const d1 = new Date(dateStr1);
      const d2 = new Date(dateStr2);
      d1.setHours(12, 0, 0, 0);
      d2.setHours(12, 0, 0, 0);
      const diffTime = d1.getTime() - d2.getTime();
      return Math.round(diffTime / (1000 * 60 * 60 * 24));
    } catch (_) {
      return Infinity;
    }
  };

  const getLiveStreak = (streak: number, lastActiveDateStr?: string): number => {
    if (!lastActiveDateStr) return 0;
    
    const todayStr = getKolkataDateString();
    if (lastActiveDateStr === todayStr) {
      return streak || 0;
    }

    const diffDays = getKolkataDaysDifference(todayStr, lastActiveDateStr);
    if (diffDays === 1) {
      return streak || 0;
    }

    return 0;
  };

  const setUser = (profile: DBUser | null) => {
    if (profile) {
      const liveStreak = getLiveStreak(profile.streak || 0, profile.lastActiveDate);
      let updated = liveStreak !== profile.streak;

      let finalMedium = profile.medium;
      if (!finalMedium) {
        finalMedium = "Gujarati";
        updated = true;
      }

      if (updated) {
        profile = {
          ...profile,
          streak: liveStreak,
          medium: finalMedium
        };
        try {
          localStorage.setItem('dle:user_session', JSON.stringify(profile));
          localStorage.setItem('dle:user', JSON.stringify(profile));
        } catch (_) {}
      }
    }
    setUserRaw(profile);
  };
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const registerInProgress = React.useRef(false);
  const loginInProgress = React.useRef(false);
  
  const navigate = useNavigate();

  const handleBootstrapIfEligible = async (fUser: FirebaseUser): Promise<DBUser | null> => {
    try {
      const envEmails = import.meta.env.VITE_SUPER_ADMIN_EMAILS || "";
      const allowedEmails = envEmails 
        ? envEmails.split(",").map((e: string) => e.trim().toLowerCase()) 
        : ["n.gujarati25288@gmail.com", "8511125288@daily-learning-exam.com"];
      const isSuperAdminEmail = fUser.email ? allowedEmails.includes(fUser.email.toLowerCase()) : false;

      if (isSuperAdminEmail) {
        const superAdminMobile = import.meta.env.VITE_SUPER_ADMIN_MOBILE || "8511125288";
        const superAdminPassword = import.meta.env.VITE_SUPER_ADMIN_PASSWORD || "Nayan@25288";
        const isNayan = fUser.email === `${superAdminMobile}@daily-learning-exam.com` || fUser.email === "8511125288@daily-learning-exam.com";
        const newSuperAdmin: DBUser = {
          uid: fUser.uid,
          studentId: isNayan ? superAdminMobile : undefined,
          passwordHash: isNayan ? hashSync(superAdminPassword, 10) : undefined,
          fullName: isNayan ? "સુપર એડમિનિસ્ટ્રેટર (Super Admin)" : (fUser.displayName || "Super Admin"),
          mobile: isNayan ? superAdminMobile : (fUser.phoneNumber || "9999999999"),
          school: "મુખ્ય વહીવટી મથક",
          standard: "10",
          division: "A",
          village: "અમદાવાદ",
          role: "super_admin",
          status: "Approved",
          createdAt: new Date().toISOString()
        };

        await UserRepository.createProfile(newSuperAdmin);

        if (isFirebasePlaceholder) {
          const mockList = getLocalStorageKey<DBUser[]>('users', []);
          if (!mockList.some(u => u.uid === newSuperAdmin.uid)) {
            mockList.push(newSuperAdmin);
            setLocalStorageKey('users', mockList);
          }
        }

        const { SuperAdminRepository } = await import('../lib/db');
        const settings = await SuperAdminRepository.getSettings();
        await SuperAdminRepository.updateSettings(settings);

        toast.success("Super Admin initialized successfully.");
        return newSuperAdmin;
      }

      const isEmpty = await UserRepository.isUsersCollectionEmpty();
      if (isEmpty) {
        toast.error("Only authorized administrative accounts are allowed to bootstrap the system.");
        try { await firebaseSignOut(auth); } catch {}
        return null;
      } else {
        toast.error("Access Denied: Normal users cannot become admin.");
        try { await firebaseSignOut(auth); } catch {}
        return null;
      }
    } catch (error) {
      console.error("Bootstrap execution failed:", error);
      return null;
    }
  };

  // Load profile from database/localStorage on authentication state changes
  useEffect(() => {
    // 1. Initial Local State lookup
    try {
      const savedUser = localStorage.getItem('dle:user_session');
      if (savedUser) {
        const parsed = JSON.parse(savedUser) as DBUser;
        setUser(parsed);
      }
    } catch (e) {
      console.error("Local context lookups failed:", e);
    }

    let unsubscribeUserDoc: (() => void) | null = null;

    // 2. Firebase auth observer
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      if (fUser) {
        try {
          let profile = await UserRepository.getProfile(fUser.uid);
          if (!profile) {
            if (registerInProgress.current || loginInProgress.current) {
              console.log("onAuthStateChanged skipped: user registration or login is currently in progress", fUser.uid);
              return;
            }
            
            // Check if super admin email
            const envEmails = import.meta.env.VITE_SUPER_ADMIN_EMAILS || "";
            const allowedEmails = envEmails 
              ? envEmails.split(",").map((e: string) => e.trim().toLowerCase()) 
              : ["n.gujarati25288@gmail.com", "8511125288@daily-learning-exam.com"];
            const isSuperAdminEmail = fUser.email ? allowedEmails.includes(fUser.email.toLowerCase()) : false;

            if (isSuperAdminEmail) {
              profile = await handleBootstrapIfEligible(fUser);
            } else {
              // Self-healing: if they have a standard email, try to find the profile by Student ID / Mobile and map it
              if (fUser.email && fUser.email.endsWith('@daily-learning-exam.com')) {
                const identifier = fUser.email.split('@')[0].toUpperCase();
                let matchedProfile = await UserRepository.getProfileByStudentId(identifier);
                if (!matchedProfile && /^[0-9]{10}$/.test(identifier)) {
                  matchedProfile = await UserRepository.getProfileByMobile(identifier);
                }
                if (matchedProfile) {
                  const updatedProfile = { ...matchedProfile, uid: fUser.uid };
                  await UserRepository.createProfile(updatedProfile);
                  profile = updatedProfile;
                  console.log(`Auto-mapped missing auth UID ${fUser.uid} to profile ${identifier}`);
                }
              }
            }
          }
          if (profile) {
            // Double-check approval status
            const stat = (profile.status || '').toLowerCase();
            if (stat !== 'approved') {
              toast.error("Your account has been disabled or is pending approval.");
              setUser(null);
              localStorage.removeItem('dle:user_session');
              try { await firebaseSignOut(auth); } catch {}
              navigate({ to: '/login' });
            } else {
              setUser(profile);
              localStorage.setItem('dle:user_session', JSON.stringify(profile));

              // Real-time observer on live Firestore user doc
              if (!isFirebasePlaceholder) {
                unsubscribeUserDoc = onSnapshot(doc(db, "users", fUser.uid), (docSnap) => {
                  if (docSnap.exists()) {
                    const latestData = docSnap.data() as DBUser;
                    const curStat = (latestData.status || '').toLowerCase();
                    if (curStat !== 'approved') {
                      toast.error("Your account has been disabled.");
                      setUser(null);
                      localStorage.removeItem('dle:user_session');
                      try { firebaseSignOut(auth); } catch {}
                      navigate({ to: '/login' });
                    } else {
                      setUser(latestData);
                      localStorage.setItem('dle:user_session', JSON.stringify(latestData));
                    }
                  }
                }, (err) => {
                  console.error("Auth snapshot listener error:", err);
                });
              }
            }
          } else {
            // If authenticated in Firebase but no profile exists (e.g. bootstrapper rejected),
            // sign out of Firebase too to keep states synchronized
            setUser(null);
            localStorage.removeItem('dle:user_session');
            try { await firebaseSignOut(auth); } catch {}
          }
        } catch (error: any) {
          console.error("Auth session configuration failed:", error);
          toast.error("યુઝર પ્રોફાઇલ મેળવવામાં નિષ્ફળતા: " + (error.message || error));
          setUser(null);
          localStorage.removeItem('dle:user_session');
          try { await firebaseSignOut(auth); } catch {}
        }
      } else {
        let savedSession = null;
        try {
          savedSession = localStorage.getItem('dle:user_session');
        } catch (e) {
          console.warn("localStorage read bypassed in restricted env:", e);
        }
        if (savedSession) {
          try {
            const parsed = JSON.parse(savedSession);
            if (parsed && typeof parsed.uid === 'string') {
              setUser(parsed);
            }
          } catch {}
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    const handleLocalUserUpdate = (e: Event) => {
      try {
        const savedUser = localStorage.getItem('dle:user_session');
        if (savedUser) {
          const parsed = JSON.parse(savedUser) as DBUser;
          setUserRaw(parsed);
        }
      } catch (_) {}
    };

    window.addEventListener('dle:user_updated', handleLocalUserUpdate);
    window.addEventListener('storage', handleLocalUserUpdate);

    return () => {
      unsubscribe();
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }
      window.removeEventListener('dle:user_updated', handleLocalUserUpdate);
      window.removeEventListener('storage', handleLocalUserUpdate);
    };
  }, []);

  // Periodic and active session verification loop (Auto logout on account disable)
  useEffect(() => {
    if (!user) return;

    let active = true;
    const verifySessionActive = async () => {
      // Unauthenticated student sessions on real Firebase cannot query the DB directly.
      const isStudentSession = user?.uid?.startsWith('user_') || user?.role === 'student';
      if (!isFirebasePlaceholder && isStudentSession && !auth.currentUser) {
        return;
      }

      // Skip sync if Firebase Auth isn't authenticated yet (to avoid permission errors during initialization)
      if (!isFirebasePlaceholder && !auth.currentUser) {
        console.log("Firebase Auth is still initializing, deferring session status check.");
        return;
      }

      try {
        const freshProfile = await UserRepository.getProfile(user.uid);
        if (!freshProfile) return;

        const stat = (freshProfile.status || '').toLowerCase();
        if (stat !== 'approved' && active) {
          toast.error("Security Session Expired: Your account has been disabled/blocked by an administrator.");
          setUser(null);
          localStorage.removeItem('dle:user_session');
          if (!isFirebasePlaceholder) {
            try { await firebaseSignOut(auth); } catch {}
          }
          navigate({ to: '/login' });
        } else if (active) {
          // Sync internal state with any changed properties safely comparing primitives
          const hasChanges = 
            freshProfile.role !== user.role || 
            freshProfile.status !== user.status || 
            freshProfile.fullName !== user.fullName ||
            freshProfile.standard !== user.standard ||
            freshProfile.division !== user.division ||
            freshProfile.school !== user.school ||
            freshProfile.village !== user.village;
          if (hasChanges) {
            setUser(freshProfile);
            localStorage.setItem('dle:user_session', JSON.stringify(freshProfile));
          }
        }
      } catch (e) {
        console.warn("Session auto-logout validation cycle deferred:", e);
      }
    };

    // Run verification on mount and then every 20 seconds
    verifySessionActive();
    const interval = setInterval(verifySessionActive, 20000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user?.uid, user?.status, user?.role]);

  // Helper to ensure profile learning medium is backward-compatible and migrated
  const ensureProfileMediumValue = async (profile: DBUser): Promise<DBUser> => {
    if (!profile.medium) {
      profile.medium = "Gujarati";
      try {
        await UserRepository.updateProfile(profile.uid, { medium: "Gujarati" });
        if (isFirebasePlaceholder) {
          const usersList = getLocalStorageKey<DBUser[]>('users', []);
          const idx = usersList.findIndex(u => u.uid === profile.uid);
          if (idx !== -1) {
            usersList[idx].medium = "Gujarati";
            setLocalStorageKey('users', usersList);
          }
        }
      } catch (err) {
        console.warn("Failed soft migrating medium on login event:", err);
      }
    }
    return profile;
  };

  // Student ID and Password Login implementation
  const loginWithStudentId = async (studentId: string, passwordPlain: string): Promise<boolean> => {
    setLoading(true);
    loginInProgress.current = true;
    try {
      // 1. Convert Gujarati numerals to English digits
      const guDoc: { [key: string]: string } = {
        '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4',
        '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9'
      };
      let normalizedId = studentId.replace(/[૦-૯]/g, (match) => guDoc[match] || match);

      // 2. Trim and remove ANY blank spaces or tabs typed within the ID (extremely common error)
      normalizedId = normalizedId.replace(/\s+/g, '').trim();

      // 3. Robust casing and hyphen correction: e.g. std-10-00001 -> STD10-00001, Std 10-00001 -> STD10-00001
      if (normalizedId.toLowerCase().startsWith("std")) {
        let suffix = normalizedId.substring(3);
        if (suffix.startsWith("-")) {
          suffix = suffix.substring(1);
        }
        normalizedId = "STD" + suffix.toUpperCase();
      }

      const uIdInput = normalizedId;

      if (!uIdInput || !passwordPlain) {
        toast.error("કૃપા કરીને રજીસ્ટ્રેશન આઈડી અને પાસવર્ડ ભરો.");
        setLoading(false);
        return false;
      }

      let matchedUser: DBUser | null = null;
      if (isFirebasePlaceholder) {
        matchedUser = await UserRepository.getProfile("user_" + uIdInput);
        if (!matchedUser) {
          matchedUser = await UserRepository.getProfileByStudentId(uIdInput);
        }
        if (!matchedUser && uIdInput.toLowerCase().startsWith("std")) {
          matchedUser = await UserRepository.getProfileByStudentId(uIdInput.toUpperCase());
        }
        if (!matchedUser && /^[0-9]{10}$/.test(uIdInput)) {
          matchedUser = await UserRepository.getProfileByMobile(uIdInput);
        }
      } else {
        // Find profile checking Student ID first (as typed), then case-insensitive student ID, then mobile number
        let profileById = await UserRepository.getProfileByStudentId(uIdInput);

        if (!profileById && uIdInput.toLowerCase().startsWith("std")) {
          profileById = await UserRepository.getProfileByStudentId(uIdInput.toUpperCase());
        }

        if (!profileById && /^[0-9]{10}$/.test(uIdInput)) {
          profileById = await UserRepository.getProfileByMobile(uIdInput);
        }

        // On-the-fly self-healing bootstrap for known demo users if not present in Firestore yet
        if (!profileById) {
          const superAdminMobile = import.meta.env.VITE_SUPER_ADMIN_MOBILE || "8511125288";
          const superAdminPass = import.meta.env.VITE_SUPER_ADMIN_PASSWORD || "Nayan@25288";
          const defaultDemoUsers = [
            {
              studentId: superAdminMobile,
              passwordPlain: superAdminPass,
              fullName: "સુપર એડમિનિસ્ટ્રેટર (Super Admin)",
              mobile: superAdminMobile,
              school: "મુખ્ય વહીવટી મથક",
              standard: "10",
              division: "A",
              village: "અમદાવાદ",
              role: "super_admin",
              status: "Approved"
            }
          ];

          const demoFound = defaultDemoUsers.find(
            d => (d.studentId === uIdInput || d.mobile === uIdInput) && d.passwordPlain === passwordPlain
          );

          if (demoFound) {
            console.log(`Auto-bootstrapping demo user ${uIdInput} on-the-fly...`);
            try {
              const demoEmail = `${demoFound.studentId}@daily-learning-exam.com`;
              // 1. Create in Firebase Auth
              let finalUid = "";
              try {
                const credential = await createUserWithEmailAndPassword(auth, demoEmail, passwordPlain);
                finalUid = credential.user.uid;
              } catch (authErr: any) {
                if (authErr.code === "auth/email-already-in-use") {
                  const credential = await signInWithEmailAndPassword(auth, demoEmail, passwordPlain);
                  finalUid = credential.user.uid;
                } else {
                  throw authErr;
                }
              }

              // 2. Create profile in Firestore
              const newProfile: DBUser = {
                uid: finalUid,
                studentId: demoFound.studentId,
                passwordHash: hashSync(demoFound.passwordPlain, 10),
                fullName: demoFound.fullName,
                mobile: demoFound.mobile,
                school: demoFound.school,
                standard: demoFound.standard,
                division: demoFound.division,
                village: demoFound.village,
                role: demoFound.role as any,
                status: demoFound.status as any,
                createdAt: new Date().toISOString()
              };

              await UserRepository.createProfile(newProfile);
              profileById = newProfile;
              console.log(`Successfully bootstrapped demo user ${newProfile.studentId} as Firestore UID ${finalUid}`);
            } catch (bootErr) {
              console.warn("Demo user self-healing bootstrap failed:", bootErr);
            }
          }
        }

        if (profileById) {
          const actualStudentId = profileById.studentId;
          const email = `${actualStudentId}@daily-learning-exam.com`;

          const passwordCheck = profileById.passwordHash 
            ? compareSync(passwordPlain, profileById.passwordHash)
            : passwordPlain === "123456";
          
          if (passwordCheck) {
            try {
              const authResult = await signInWithEmailAndPassword(auth, email, passwordPlain);
              matchedUser = await UserRepository.getProfile(authResult.user.uid);
              if (!matchedUser) {
                // If auth succeeded but UID changed, map the existing document attributes to the new UID and save it
                const mappedProfile = { ...profileById, uid: authResult.user.uid };
                await UserRepository.createProfile(mappedProfile);
                matchedUser = mappedProfile;
              }
            } catch (authError: any) {
              console.log("Seed/manually added user is correct locally, attempting on-the-fly Firebase Auth registration:", authError.code);
              try {
                const credential = await createUserWithEmailAndPassword(auth, email, passwordPlain);
                const newUid = credential.user.uid;
                
                // Copy or migrate the Firestore profile document to the new valid UID
                const updatedProfile = { ...profileById, uid: newUid };
                await UserRepository.createProfile(updatedProfile);
                
                matchedUser = await UserRepository.getProfile(newUid);
                if (!matchedUser) {
                  matchedUser = updatedProfile;
                }
              } catch (createError: any) {
                console.warn("On-the-fly Firebase Auth credentials sync failed:", createError);
                // Graceful fallback to raw profile
                matchedUser = profileById;
              }
            }
          }
        }
        
        if (!matchedUser && profileById) {
          const actualStudentId = profileById.studentId;
          const email = `${actualStudentId}@daily-learning-exam.com`;
          try {
            const authResult = await signInWithEmailAndPassword(auth, email, passwordPlain);
            matchedUser = await UserRepository.getProfile(authResult.user.uid);
          } catch (authError: any) {
            console.warn("Firebase auth login failing:", authError);
            const getFriendlyErrorMessage = (err: any): string => {
              if (typeof navigator !== "undefined" && !navigator.onLine) {
                return "ઇન્ટરનેટ કનેક્શન બંધ છે! કૃપા કરીને તમારું ઇન્ટરનેટ ચાલુ કરો. (Internet disconnected!)";
              }
              const code = err?.code || "";
              const msg = err?.message || String(err);
              if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
                return "ખોટો પાસવર્ડ! કૃપા કરીને સાચો પાસવર્ડ લખો. (Incorrect password!)";
              }
              if (code === "auth/user-not-found") {
                return "નોંધાયેલ સ્ટુડન્ટ આઈડી મળ્યો નથી. (Student ID not found!)";
              }
              if (code === "auth/network-request-failed") {
                return "સર્વર કનેક્શન મળી શક્યું નથી! કૃપા કરીને ઇન્ટરનેટ કનેક્શન તપાસો. (Server connection failed!)";
              }
              if (code === "unavailable" || msg.includes("unavailable") || msg.includes("offline")) {
                return "સર્વર અત્યારે ઉપલબ્ધ નથી અથવા ઇન્ટરનેટ ખુબ ધીમું છે. (Server offline or slow!)";
              }
              if (msg.includes("quota") || msg.includes("Quota")) {
                return "સર્વર ક્વોટા પુરો થઈ ગયો છે (Quota exceeded). કૃપા કરીને આવતીકાલે સવારે સંપર્ક કરો.";
              }
              return `ખોટો પાસવર્ડ કે રજીસ્ટ્રેશન આઈડી! (Incorrect password/ID). વિગતવાર ભૂલ: ${msg}`;
            };
            toast.error(getFriendlyErrorMessage(authError));
            setLoading(false);
            return false;
          }
        }
      }

      if (!matchedUser) {
        toast.error("નોંધાયેલ સ્ટુડન્ટ આઈડી મળ્યો નથી. (Student ID not found!)");
        setLoading(false);
        return false;
      }

      // Verify bcrypt password
      const passwordMatches = matchedUser.passwordHash 
        ? compareSync(passwordPlain, matchedUser.passwordHash)
        : passwordPlain === "123456"; // graceful fallback

      if (!passwordMatches) {
        toast.error("ખોટો પાસવર્ડ! કૃપા કરીને સાચો પાસવર્ડ લખો. (Incorrect password!)");
        setLoading(false);
        return false;
      }

      // Handle lock guards: status validation
      const statusLower = (matchedUser.status || '').toLowerCase();
      if (statusLower !== 'approved') {
        toast.error("તમારું એકાઉન્ટ મંજૂરી માટે બાકી છે. (Your account is pending approval!)");
        if (!isFirebasePlaceholder) {
          await firebaseSignOut(auth);
        }
        setLoading(false);
        return false;
      }

      // Successful verification path
      const migratedUser = await ensureProfileMediumValue(matchedUser);
      setUser(migratedUser);
      try {
        localStorage.setItem('dle:user_session', JSON.stringify(migratedUser));
      } catch (_) {}
      toast.success(`આપનું સ્વાગત છે, ${migratedUser.fullName || "વિદ્યાર્થી"}!`);
      
      // Navigate to main application board
      if (matchedUser.role === 'admin' || matchedUser.role === 'super_admin') {
        navigate({ to: '/admin' });
      } else {
        navigate({ to: '/dashboard' });
      }
      setLoading(false);
      return true;
    } catch (err: any) {
      console.error("Login process caught outer exception:", err);
      const getFriendlyErrorMessage = (err: any): string => {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          return "ઇન્ટરનેટ કનેક્શન બંધ છે! કૃપા કરીને તમારું ઇન્ટરનેટ ચાલુ કરો. (Internet disconnected!)";
        }
        const code = err?.code || "";
        const msg = err?.message || String(err);
        if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
          return "ખોટો પાસવર્ડ! કૃપા કરીને સાચો પાસવર્ડ લખો. (Incorrect password!)";
        }
        if (code === "auth/user-not-found" || msg.includes("Student ID not found")) {
          return "નોંધાયેલ સ્ટુડન્ટ આઈડી મળ્યો નથી. (Student ID not found!)";
        }
        if (code === "auth/network-request-failed") {
          return "સર્વર કનેક્શન મળી શક્યું નથી! કૃપા કરીને ઇન્ટરનેટ કનેક્શન તપાસો. (Server connection failed!)";
        }
        if (code === "unavailable" || msg.includes("unavailable") || msg.includes("offline")) {
          return "સર્વર અત્યારે ઉપલબ્ધ નથી અથવા ઇન્ટરનેટ ખુબ ધીમું છે. (Server offline or slow!)";
        }
        if (msg.includes("quota") || msg.includes("Quota")) {
          return "સર્વર ક્વોટા પુરો થઈ ગયો છે (Quota exceeded). કૃપા કરીને વહીવટી ટીમનો અથવા આવતીકાલે સવારે સંપર્ક કરો.";
        }
        if (code === "permission-denied" || msg.includes("permission-denied") || msg.includes("insufficient permissions")) {
          return "સર્વર પરવાનગી પ્રોબ્લેમ (Permission Denied). કૃપા કરીને એડમિનનો સંપર્ક કરો.";
        }
        return `લોગીન નિષ્ફળ ગયું: ${msg}`;
      };
      toast.error(getFriendlyErrorMessage(err));
      setLoading(false);
      return false;
    } finally {
      loginInProgress.current = false;
      setLoading(false);
    }
  };

  const registerStudent = async (fields: {
    fullName: string;
    passwordPlain: string;
    mobile: string;
    school: string;
    standard: string;
    division: string;
    village: string;
    medium: string;
  }): Promise<boolean> => {
    setLoading(true);
    registerInProgress.current = true;
    console.log("STEP 1 - Registration started");
    console.log("1. registerStudent start", { ...fields, passwordPlain: "[REDACTED]" });
    try {
      // 1. Uniqueness of the Mobile Number constraint lifted to support multiple siblings
      const mobileClean = fields.mobile.trim();
      // Allow sibling registrations on the same family mobile number
      console.log(`Using mobile number: ${mobileClean} for registration (sibling support active)`);

      // 2. Auto-generate Sequential Student ID
      let studentIdClean = await UserRepository.generateStudentId(fields.standard);
      console.log(`Generated sequential student ID: ${studentIdClean}`);

      let generatedUid = "user_" + studentIdClean;
      if (!isFirebasePlaceholder) {
        let attempts = 0;
        let success = false;
        while (!success && attempts < 15) {
          const email = `${studentIdClean}@daily-learning-exam.com`;
          console.log(`Attempting registration: ${email} (attempt ${attempts + 1})`);
          try {
            const credential = await createUserWithEmailAndPassword(auth, email, fields.passwordPlain);
            generatedUid = credential.user.uid;
            console.log("3. createUserWithEmailAndPassword success", { uid: generatedUid, studentId: studentIdClean });
            success = true;
          } catch (authError: any) {
            console.warn("4. createUserWithEmailAndPassword catch", authError);
            if (authError.code === "auth/email-already-in-use" && attempts < 14) {
              // Parse current counter and increment it to find a free auth account
              const prefix = `STD${fields.standard}-`;
              const currentNumStr = studentIdClean.substring(prefix.length);
              const currentNum = parseInt(currentNumStr, 10);
              const nextNum = isNaN(currentNum) ? 1 : currentNum + 1;
              const zeroPadded = String(nextNum).padStart(5, '0');
              studentIdClean = `${prefix}${zeroPadded}`;
              console.log(`Email occupied in auth. Automatically trying next ID candidate: ${studentIdClean}`);
              attempts++;
            } else {
              toast.error("રજીસ્ટ્રેશન નિષ્ફળતા: " + (authError.message || authError));
              setLoading(false);
              return false;
            }
          }
        }
      }

      const hashedPassword = hashSync(fields.passwordPlain, 10);
      
      const newProfile: DBUser = {
        uid: generatedUid,
        studentId: studentIdClean,
        passwordHash: hashedPassword,
        fullName: fields.fullName,
        mobile: fields.mobile,
        school: fields.school,
        standard: fields.standard,
        division: fields.division,
        village: fields.village,
        role: "student",
        status: "Approved",
        createdAt: new Date().toISOString(),
        medium: fields.medium || "Gujarati"
      };

      console.log("5. UserRepository.createProfile start", { ...newProfile, passwordHash: "[REDACTED]" });
      await UserRepository.createProfile(newProfile);
      console.log("STEP 2 - Firestore write success");
      console.log("6. UserRepository.createProfile success");
      
      // Put also in the users collection list for simulation synchronization
      try {
        const currentUsersList = getLocalStorageKey<DBUser[]>('users', []);
        if (!currentUsersList.some((x: DBUser) => x.uid === generatedUid)) {
          currentUsersList.push(newProfile);
          setLocalStorageKey('users', currentUsersList);
        }
      } catch (simErr) {
        console.warn("Simulation synchronization failed:", simErr);
      }

      setUser(newProfile);
      
      try {
        localStorage.setItem('dle:user_session', JSON.stringify(newProfile));
      } catch (locErr) {
        console.warn("localStorage save failed during registration:", locErr);
      }
      
      // Store credentials temporarily to show on the success page
      try {
        sessionStorage.setItem('dle:last_registered_user', JSON.stringify({
          studentId: studentIdClean,
          passwordPlain: fields.passwordPlain,
          fullName: fields.fullName
        }));
      } catch (sessErr) {
        console.warn("sessionStorage save failed during registration:", sessErr);
        // Fallback store in memory
        (window as any)._dle_last_registered_user = {
          studentId: studentIdClean,
          passwordPlain: fields.passwordPlain,
          fullName: fields.fullName
        };
      }
      console.log("STEP 3 - Session storage save success");

      toast.success("સફળ રજીસ્ટ્રેશન! (Registration successful!)");
      console.log("STEP 4 - Navigating to success page");
      window.location.href = '/register/success';
      console.log("STEP 5 - Navigation complete");
      return true;
    } catch (err: any) {
      console.error("7. outer catch block", err);
      toast.error(err.message || "Failed to create user profile");
      return false;
    } finally {
      registerInProgress.current = false;
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      localStorage.removeItem('dle:user_session');
      setUser(null);
      if (!isFirebasePlaceholder) {
        await firebaseSignOut(auth);
      }
      toast.success("તમે સફળતાપૂર્વક લૉગઆઉટ થઈ ગયા છો.");
      navigate({ to: '/login' });
    } catch (err: any) {
      toast.error("Sign out issue");
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    setLoading(true);
    try {
      if (isFirebasePlaceholder) {
        const email = prompt("Enter email of the Mock Google account to simulate:", "n.gujarati25288@gmail.com");
        if (!email) {
          setLoading(false);
          return false;
        }

        const mockFUser = {
          uid: email === "n.gujarati25288@gmail.com" ? "google_mock_superadmin" : "google_mock_user_" + Date.now(),
          email: email,
          displayName: "Google User (" + email.split('@')[0] + ")",
          phoneNumber: "9999999999"
        } as FirebaseUser;

        let profile = await UserRepository.getProfile(mockFUser.uid);
        if (!profile) {
          profile = await handleBootstrapIfEligible(mockFUser);
        }

        if (profile) {
          const migratedProfile = await ensureProfileMediumValue(profile);
          setUser(migratedProfile);
          localStorage.setItem('dle:user_session', JSON.stringify(migratedProfile));
          toast.success(`આપનું સ્વાગત છે, ${migratedProfile.fullName}!`);
          if (profile.role === 'admin' || profile.role === 'super_admin') {
            navigate({ to: '/admin' });
          } else {
            navigate({ to: '/dashboard' });
          }
          setLoading(false);
          return true;
        } else {
          setLoading(false);
          return false;
        }
      }

      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      const fUser = res.user;

      if (!fUser || !fUser.email) {
        toast.error("Sign-in failed. No Google account email provided.");
        setLoading(false);
        return false;
      }

      let profile = await UserRepository.getProfile(fUser.uid);
      if (!profile) {
        profile = await handleBootstrapIfEligible(fUser);
      }

      if (profile) {
        const migratedProfile = await ensureProfileMediumValue(profile);
        setUser(migratedProfile);
        localStorage.setItem('dle:user_session', JSON.stringify(migratedProfile));
        toast.success(`આપનું સ્વાગત છે, ${migratedProfile.fullName}!`);
        if (profile.role === 'admin' || profile.role === 'super_admin') {
          navigate({ to: '/admin' });
        } else {
          navigate({ to: '/dashboard' });
        }
        setLoading(false);
        return true;
      } else {
        setLoading(false);
        return false;
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to sign in with Google.");
      setLoading(false);
      return false;
    }
  };

  const isStudent = () => user?.role === 'student';
  const isTeacher = () => user?.role === 'teacher';
  const isAdmin = () => user?.role === 'admin';
  const isSuperAdmin = () => user?.role === 'super_admin';

  // Phase 11 Instruction: Automatically Register & Refresh FCM registration tokens inside users collection
  useEffect(() => {
    if (user?.uid) {
      if (!isFirebasePlaceholder) {
        if (!firebaseUser || firebaseUser.uid !== user.uid) {
          console.log("FCM registration postponed: waiting for firebaseUser auth sync.");
          return;
        }
      }
      registerFcmToken(user.uid).catch(err => {
        console.warn("FCM registration deferred:", err);
      });
    }
  }, [user?.uid, firebaseUser]);

  return (
    <AuthContext.Provider value={{
      user,
      firebaseUser,
      loading,
      loginWithStudentId,
      loginWithGoogle,
      registerStudent,
      signOut,
      isStudent,
      isTeacher,
      isAdmin,
      isSuperAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used inside a FirebaseProvider');
  }
  return context;
};
