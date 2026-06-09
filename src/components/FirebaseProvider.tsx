import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  isFirebasePlaceholder 
} from '../lib/firebase';
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  type User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { DBUser } from '../types';
import { UserRepository, AdminRepository, getLocalStorageKey, setLocalStorageKey } from '../lib/db';
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
  }) => Promise<boolean>;
  signOut: () => Promise<void>;
  isStudent: () => boolean;
  isTeacher: () => boolean;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<DBUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const registerInProgress = React.useRef(false);
  
  const navigate = useNavigate();

  const handleBootstrapIfEligible = async (fUser: FirebaseUser): Promise<DBUser | null> => {
    try {
      const isSuperAdminEmail = fUser.email === "n.gujarati25288@gmail.com";

      if (isSuperAdminEmail) {
        const newSuperAdmin: DBUser = {
          uid: fUser.uid,
          fullName: fUser.displayName || "Super Admin",
          mobile: fUser.phoneNumber || "9999999999",
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
        toast.error("Only n.gujarati25288@gmail.com is allowed to bootstrap the system.");
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

    // 2. Firebase auth observer
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      if (fUser) {
        try {
          let profile = await UserRepository.getProfile(fUser.uid);
          if (!profile) {
            if (registerInProgress.current) {
              console.log("onAuthStateChanged skipped: user registration is currently in progress", fUser.uid);
              return;
            }
            profile = await handleBootstrapIfEligible(fUser);
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
        const savedSession = localStorage.getItem('dle:user_session');
        let isStudentSession = false;
        if (savedSession) {
          try {
            const parsed = JSON.parse(savedSession);
            if (parsed && typeof parsed.uid === 'string' && (parsed.uid.startsWith('user_') || parsed.role === 'student')) {
              isStudentSession = true;
            }
          } catch {}
        }

        if (!isStudentSession && !isFirebasePlaceholder) {
          setUser(null);
          localStorage.removeItem('dle:user_session');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
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

  // Student ID and Password Login implementation
  const loginWithStudentId = async (studentId: string, passwordPlain: string): Promise<boolean> => {
    setLoading(true);
    try {
      const uIdInput = studentId.trim();
      if (!uIdInput || !passwordPlain) {
        toast.error("કૃપા કરીને રજીસ્ટ્રેશન આઈડી અને પાસવર્ડ ભરો.");
        setLoading(false);
        return false;
      }

      let matchedUser: DBUser | null = null;
      if (isFirebasePlaceholder) {
        matchedUser = await UserRepository.getProfile("user_" + uIdInput);
      } else {
        const email = `${uIdInput}@daily-learning-exam.com`;
        let profileById = await UserRepository.getProfileByStudentId(uIdInput);

        // On-the-fly self-healing bootstrap for known demo users if not present in Firestore yet
        if (!profileById) {
          const defaultDemoUsers = [
            {
              studentId: "9876543210",
              passwordPlain: "123456",
              fullName: "આરવ મહેતા (Aarav Mehta)",
              mobile: "9876543210",
              school: "સરસ્વતી વિદ્યાલય",
              standard: "10",
              division: "A",
              village: "વડતાલ",
              role: "student",
              status: "Approved"
            },
            {
              studentId: "9825098250",
              passwordPlain: "123456",
              fullName: "પ્રીતિ શર્મા",
              mobile: "9825098250",
              school: "સરસ્વતી વિદ્યાલય, વડોદરા",
              standard: "11",
              division: "A",
              village: "વડોદરા",
              role: "student",
              status: "Approved"
            },
            {
              studentId: "teacher123",
              passwordPlain: "teacher123",
              fullName: "ગુરુજી શ્રી (Guru Teacher)",
              mobile: "8888888888",
              school: "સરસ્વતી વિદ્યાલય",
              standard: "10",
              division: "A",
              village: "અમદાવાદ",
              role: "teacher",
              status: "Approved"
            },
            {
              studentId: "8511125288",
              passwordPlain: "Nayan@25288",
              fullName: "સુપર એડમિનિસ્ટ્રેટર (Super Admin)",
              mobile: "8511125288",
              school: "મુખ્ય વહીવટી મથક",
              standard: "10",
              division: "A",
              village: "અમદાવાદ",
              role: "super_admin",
              status: "Approved"
            }
          ];

          const demoFound = defaultDemoUsers.find(
            d => d.studentId === uIdInput && d.passwordPlain === passwordPlain
          );

          if (demoFound) {
            console.log(`Auto-bootstrapping demo user ${uIdInput} on-the-fly...`);
            try {
              // 1. Create in Firebase Auth
              let finalUid = "";
              try {
                const credential = await createUserWithEmailAndPassword(auth, email, passwordPlain);
                finalUid = credential.user.uid;
              } catch (authErr: any) {
                if (authErr.code === "auth/email-already-in-use") {
                  const credential = await signInWithEmailAndPassword(auth, email, passwordPlain);
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
              console.log(`Successfully bootstrapped demo user ${uIdInput} as Firestore UID ${finalUid}`);
            } catch (bootErr) {
              console.warn("Demo user self-healing bootstrap failed:", bootErr);
            }
          }
        }

        if (profileById) {
          const passwordCheck = profileById.passwordHash 
            ? compareSync(passwordPlain, profileById.passwordHash)
            : passwordPlain === "123456";
          
          if (passwordCheck) {
            try {
              const authResult = await signInWithEmailAndPassword(auth, email, passwordPlain);
              matchedUser = await UserRepository.getProfile(authResult.user.uid);
              if (!matchedUser) {
                // If auth succeeded but UID changed, map the existing document attributes to the new UID
                matchedUser = { ...profileById, uid: authResult.user.uid };
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
        
        if (!matchedUser) {
          try {
            const authResult = await signInWithEmailAndPassword(auth, email, passwordPlain);
            matchedUser = await UserRepository.getProfile(authResult.user.uid);
          } catch (authError: any) {
            console.warn("Firebase auth login failing:", authError);
            toast.error("ખોટો પાસવર્ડ કે રજીસ્ટ્રેશન આઈડી! (Incorrect ID or password)");
            setLoading(false);
            return false;
          }
        }
      }

      if (!matchedUser) {
        toast.error("નોંધાયેલ સ્ટુડન્ટ આઈડી મળ્યો નથી. (Student ID not found)");
        setLoading(false);
        return false;
      }

      // Verify bcrypt password
      const passwordMatches = matchedUser.passwordHash 
        ? compareSync(passwordPlain, matchedUser.passwordHash)
        : passwordPlain === "123456"; // graceful fallback

      if (!passwordMatches) {
        toast.error("ખોટો પાસવર્ડ! કૃપા કરીને સાચો પાસવર્ડ લખો.");
        setLoading(false);
        return false;
      }

      // Handle lock guards: status validation
      const statusLower = (matchedUser.status || '').toLowerCase();
      if (statusLower !== 'approved') {
        toast.error("Your account is pending approval.");
        if (!isFirebasePlaceholder) {
          await firebaseSignOut(auth);
        }
        setLoading(false);
        return false;
      }

      // Successful verification path
      setUser(matchedUser);
      localStorage.setItem('dle:user_session', JSON.stringify(matchedUser));
      toast.success(`આપનું સ્વાગત છે, ${matchedUser.fullName}!`);
      
      // Navigate to main application board
      navigate({ to: '/dashboard' });
      setLoading(false);
      return true;
    } catch (err: any) {
      toast.error(err.message || "Login failed");
      setLoading(false);
      return false;
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
  }): Promise<boolean> => {
    setLoading(true);
    registerInProgress.current = true;
    console.log("STEP 1 - Registration started");
    console.log("1. registerStudent start", { ...fields, passwordPlain: "[REDACTED]" });
    try {
      // 1. Verify Uniqueness of the Mobile Number
      const mobileClean = fields.mobile.trim();
      const mobileDuplicate = await UserRepository.checkMobileExists(mobileClean);
      if (mobileDuplicate) {
        toast.error("આ મોબાઇલ નંબર પહેલેથી નોંધાયેલ છે.");
        setLoading(false);
        return false;
      }

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
        createdAt: new Date().toISOString()
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
      if (!isFirebasePlaceholder) {
        await firebaseSignOut(auth);
      }
      setUser(null);
      localStorage.removeItem('dle:user_session');
      toast.success("Logged out successfully");
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
          setUser(profile);
          localStorage.setItem('dle:user_session', JSON.stringify(profile));
          toast.success(`આપનું સ્વાગત છે, ${profile.fullName}!`);
          navigate({ to: '/dashboard' });
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
        setUser(profile);
        localStorage.setItem('dle:user_session', JSON.stringify(profile));
        toast.success(`આપનું સ્વાગત છે, ${profile.fullName}!`);
        navigate({ to: '/dashboard' });
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
      import('../lib/fcm').then(({ registerFcmToken }) => {
        registerFcmToken(user.uid).catch(err => {
          console.warn("FCM registration deferred:", err);
        });
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
