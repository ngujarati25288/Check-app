import { db, isFirebasePlaceholder, auth } from "./firebase";
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  getDoc,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";
import { DBUser, ExamResult, StudentMistake, StudentPoints, UserAchievement } from "../types";

export interface LeaderboardRecord {
  studentId: string;
  studentName: string;
  standard: string;
  school: string;
  village: string;
  points: number;
  rankingScore: number;
  masteredQuestions: number;
  revisionAccuracy: number;
  achievementsCount: number;
  rank: number;
  currentRank: number;
  previousRank?: number;
  rankChange?: string;
  updatedAt: string;
}

export interface SubjectLeaderboardRecord {
  subjectId: string; // "Science" | "Mathematics" | "Gujarati" | "English" | "Social Science" | "Hindi"
  studentId: string;
  studentName: string;
  rankingScore: number;
  rank: number;
  updatedAt: string;
}

export interface TopPerformer {
  medal: "gold" | "silver" | "bronze";
  studentId: string;
  studentName: string;
  points: number;
  rankingScore: number;
  standard: string;
  school: string;
  village: string;
  updatedAt: string;
}

/**
 * Audit Logger for monitoring leaderboard runs
 */
export async function writeAuditLog(recordsProcessed: number, functionDuration: number, errors: string[]) {
  const isPlaceholder = isFirebasePlaceholder;
  const now = new Date();
  const logId = `log_${now.getTime()}`;
  
  const payload = {
    id: logId,
    generationTime: now.toISOString(),
    recordsProcessed,
    functionDuration,
    errors
  };

  if (isPlaceholder) {
    try {
      const existingLogs = JSON.parse(localStorage.getItem("dle:leaderboard_audit_logs") || "[]");
      existingLogs.push(payload);
      localStorage.setItem("dle:leaderboard_audit_logs", JSON.stringify(existingLogs));
    } catch (_) {}
  } else {
    try {
      await setDoc(doc(db, "leaderboard_audit_logs", logId), {
        ...payload,
        generationTime: serverTimestamp()
      });
    } catch (e) {
      console.error("Failed to write to leaderboard_audit_logs:", e);
    }
  }
}

/**
 * PRODUCTION-GRADE LEADERBOARD & RANKING ENGINE (Simulated Scheduled Cloud Functions)
 */
export async function calculateLeaderboardForSpan(span: "daily" | "weekly" | "monthly" | "alltime"): Promise<LeaderboardRecord[]> {
  const durationStart = Date.now();
  const isPlaceholder = isFirebasePlaceholder;
  const now = new Date();
  const errorsList: string[] = [];

  // Security role guard to prevent permission denied wipes from students
  if (!isPlaceholder) {
    let userIsAdmin = false;
    if (auth.currentUser) {
      try {
        const uSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (uSnap.exists()) {
          const r = uSnap.data()?.role;
          if (r === "admin" || r === "super_admin") {
            userIsAdmin = true;
          }
        }
      } catch (err) {
        console.warn("Failed checking admin status during span calculation:", err);
      }
    }
    if (!userIsAdmin) {
      console.warn("Unauthorized attempt to recalculate leaderboard database. Aborting.");
      const currentList: LeaderboardRecord[] = [];
      try {
        const snap = await getDocs(collection(db, `leaderboard_${span}`));
        snap.forEach(d => {
          currentList.push(d.data() as LeaderboardRecord);
        });
      } catch (_) {}
      return currentList;
    }
  }
  
  // Calculate cut-off ranges for spans
  let cutOffDate = new Date(0); // All time default
  if (span === "daily") {
    cutOffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  } else if (span === "weekly") {
    cutOffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (span === "monthly") {
    cutOffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // 1. Fetch Students
  let students: DBUser[] = [];
  if (isPlaceholder) {
    try {
      students = JSON.parse(localStorage.getItem("dle:users") || "[]");
      const currentUserStr = localStorage.getItem("dle:user");
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        if (!students.some(u => u.uid === currentUser.uid)) {
          students.push(currentUser);
        }
      }
    } catch (e: any) {
      errorsList.push(`Error loading users: ${e.message}`);
    }
  } else {
    try {
      const snap = await getDocs(collection(db, "users"));
      snap.forEach(d => {
        const u = d.data() as DBUser;
        if (u.role === "student") {
          students.push({
            ...u,
            uid: u.uid || d.id
          });
        }
      });
    } catch (e: any) {
      errorsList.push(`Firestore users query failed: ${e.message}`);
    }
  }

  // If list is empty, default seed
  if (students.length === 0) {
    students = [{
      uid: "demo-user-123",
      fullName: "વિદ્યાર્થી",
      mobile: "9876543210",
      role: "student",
      status: "approved",
      school: "DL High School",
      standard: "10",
      village: "Village",
      createdAt: now.toISOString()
    }];
  }

  // 2. Fetch Helper Collections
  let allExamResults: ExamResult[] = [];
  let allMistakes: StudentMistake[] = [];
  let allPoints: StudentPoints[] = [];
  let allAchievements: UserAchievement[] = [];

  if (isPlaceholder) {
    try {
      allExamResults = JSON.parse(localStorage.getItem("dle:exam_results") || "[]");
      allMistakes = JSON.parse(localStorage.getItem("dle:student_mistakes") || "[]");
      allAchievements = JSON.parse(localStorage.getItem("dle:user_achievements") || "[]");
      
      students.forEach(s => {
        const pStr = localStorage.getItem(`dle:student_points:${s.uid}`);
        if (pStr) {
          allPoints.push(JSON.parse(pStr));
        } else {
          allPoints.push({
            studentId: s.uid,
            totalPoints: s.uid === "demo-user-123" ? 220 : 0,
            examPoints: 0,
            revisionPoints: 0,
            masteryPoints: 0,
            achievementPoints: 0,
            updatedAt: new Date().toISOString()
          });
        }
      });
    } catch (e: any) {
      errorsList.push(`Error parsing local storage helper datasets: ${e.message}`);
    }
  } else {
    try {
      const [resSnap, misSnap, ptsSnap, achSnap] = await Promise.all([
        getDocs(collection(db, "exam_results")),
        getDocs(collection(db, "student_mistakes")),
        getDocs(collection(db, "student_points")),
        getDocs(collection(db, "user_achievements"))
      ]);

      resSnap.forEach(d => {
        const item = d.data() as ExamResult;
        allExamResults.push({
          ...item,
          studentId: item.studentId || d.id
        });
      });
      misSnap.forEach(d => {
        const item = d.data() as StudentMistake;
        allMistakes.push({
          ...item,
          studentId: item.studentId || d.id
        });
      });
      ptsSnap.forEach(d => {
        const item = d.data() as StudentPoints;
        allPoints.push({
          ...item,
          studentId: item.studentId || d.id
        });
      });
      achSnap.forEach(d => {
        const item = d.data() as UserAchievement;
        allAchievements.push({
          ...item,
          studentId: item.studentId || d.id
        });
      });
    } catch (e: any) {
      errorsList.push(`Firestore subcollection loading queries failed: ${e.message}`);
    }
  }

  // 3. Process records per student
  const records: LeaderboardRecord[] = [];

  for (const s of students) {
    const studentId = s.uid;
    const studentName = s.fullName || "વિદ્યાર્થી";
    const standard = s.standard || "10";
    const school = s.school || "DL High School";
    const village = s.village || "Village";

    // A. Exam Performance (50% weight)
    const studentExams = allExamResults.filter(
      r => r.studentId === studentId && new Date(r.submittedAt || Date.now()) >= cutOffDate
    );
    const avgExamPct = studentExams.length > 0 
      ? studentExams.reduce((sum, r) => sum + (r.percentage || 0), 0) / studentExams.length 
      : 0;

    // B. Revision Activity (20% weight)
    const studentMistakes = allMistakes.filter(m => m.studentId === studentId);
    let totalRevisions = 0;
    let totalCorrectRevisions = 0;
    let masteredCount = 0;

    studentMistakes.forEach(m => {
      totalRevisions += m.revisionCount || 0;
      totalCorrectRevisions += m.correctRevisionCount || 0;
      if (m.mastered) {
        masteredCount += 1;
      }
    });

    const revisionAccuracy = totalRevisions > 0 
      ? Math.round((totalCorrectRevisions / totalRevisions) * 100) 
      : 0;

    // C. Achievements Count (10% weight)
    const studentAchievements = allAchievements.filter(
      a => a.studentId === studentId && new Date(a.unlockedAt || Date.now()) >= cutOffDate
    );
    const achievementsCount = studentAchievements.length;

    // D. Fetch Point Accumulations
    const ptsRecord = allPoints.find(p => p.studentId === studentId) || {
      studentId,
      totalPoints: 0,
      examPoints: 0,
      revisionPoints: 0,
      masteryPoints: 0,
      achievementPoints: 0
    };

    // Calculate Formula:
    const examScore = avgExamPct * 0.5;
    const revisionScore = revisionAccuracy * 0.2;
    const masteryScore = Math.min((masteredCount / 50) * 100, 100) * 0.2;
    const achievementScore = Math.min((achievementsCount / 10) * 100, 100) * 0.1;

    const rankingScore = parseFloat((examScore + revisionScore + masteryScore + achievementScore).toFixed(2));

    records.push({
      studentId,
      studentName,
      standard,
      school,
      village,
      points: ptsRecord.totalPoints,
      rankingScore,
      masteredQuestions: masteredCount,
      revisionAccuracy,
      achievementsCount,
      rank: 1,
      currentRank: 1,
      updatedAt: now.toISOString()
    });
  }

  // 4. Sort and Rank Calculation
  records.sort((a, b) => {
    if (b.rankingScore !== a.rankingScore) {
      return b.rankingScore - a.rankingScore;
    }
    return b.points - a.points; 
  });

  const collName = `leaderboard_${span}`;
  let oldLeaderboard: Record<string, LeaderboardRecord> = {};

  if (isPlaceholder) {
    try {
      const stored = localStorage.getItem(`dle:${collName}`) || "[]";
      JSON.parse(stored).forEach((item: LeaderboardRecord) => {
        oldLeaderboard[item.studentId] = item;
      });
    } catch (_) {}
  } else {
    try {
      const snap = await getDocs(collection(db, collName));
      snap.forEach(d => {
        const rec = d.data() as LeaderboardRecord;
        oldLeaderboard[rec.studentId] = rec;
      });
    } catch (_) {}
  }

  // Assign final ranks and shifts
  const updatedRecords = records.map((item, idx) => {
    const calculatedRank = idx + 1;
    const previous = oldLeaderboard[item.studentId];
    const previousRank = previous ? (previous.currentRank || previous.rank) : calculatedRank;
    
    // FIX 6: Rank movement logging (+3 when moving from 8 to 5, negative when dropped, "flat" if same)
    let rankChange = "flat";
    const delta = previousRank - calculatedRank;
    if (delta > 0) {
      rankChange = `+${delta}`;
    } else if (delta < 0) {
      rankChange = `${delta}`;
    }

    return {
      ...item,
      rank: calculatedRank,
      currentRank: calculatedRank,
      previousRank,
      rankChange
    };
  });

  // 5. Persist Rankings
  if (isPlaceholder) {
    try {
      localStorage.setItem(`dle:${collName}`, JSON.stringify(updatedRecords));
    } catch (_) {}
  } else {
    try {
      const batchList = updatedRecords.slice(0, 100); 
      const batch = writeBatch(db);
      for (const rec of batchList) {
        const docRef = doc(db, collName, rec.studentId);
        batch.set(docRef, {
          ...rec,
          updatedAt: serverTimestamp()
        });
      }
      await batch.commit();
    } catch (e: any) {
      errorsList.push(`Failed writing to ${collName}: ${e.message}`);
    }
  }

  // Write audit trail
  const durationMs = Date.now() - durationStart;
  await writeAuditLog(updatedRecords.length, durationMs, errorsList);

  return updatedRecords;
}

/**
 * FIX 2: REAL SUBJECT LEADERBOARDS
 * Calculates and persists rankings per subject category:
 * "Science", "Mathematics", "Gujarati", "English", "Social Science", "Hindi"
 */
export async function calculateSubjectLeaderboards(): Promise<SubjectLeaderboardRecord[]> {
  const isPlaceholder = isFirebasePlaceholder;
  const now = new Date();
  const subjects = ["Science", "Mathematics", "Gujarati", "English", "Social Science", "Hindi"];
  const allSubjectRecords: SubjectLeaderboardRecord[] = [];

  // Security role guard to prevent permission denied wipes from students
  if (!isPlaceholder) {
    let userIsAdmin = false;
    if (auth.currentUser) {
      try {
        const uSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (uSnap.exists()) {
          const r = uSnap.data()?.role;
          if (r === "admin" || r === "super_admin") {
            userIsAdmin = true;
          }
        }
      } catch (err) {
        console.warn("Failed checking admin status during subject calculation:", err);
      }
    }
    if (!userIsAdmin) {
      console.warn("Unauthorized attempt to recalculate subject leaderboard database. Aborting.");
      const currentSubjList: SubjectLeaderboardRecord[] = [];
      try {
        const snap = await getDocs(collection(db, "subject_leaderboards"));
        snap.forEach(d => {
          currentSubjList.push(d.data() as SubjectLeaderboardRecord);
        });
      } catch (_) {}
      return currentSubjList;
    }
  }

  // 1. Load users
  let students: DBUser[] = [];
  if (isPlaceholder) {
    try {
      students = JSON.parse(localStorage.getItem("dle:users") || "[]");
      const currentUserStr = localStorage.getItem("dle:user");
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        if (!students.some(u => u.uid === currentUser.uid)) {
          students.push(currentUser);
        }
      }
    } catch (_) {}
  } else {
    try {
      const snap = await getDocs(collection(db, "users"));
      snap.forEach(d => {
        const u = d.data() as DBUser;
        if (u.role === "student") {
          students.push({
            ...u,
            uid: u.uid || d.id
          });
        }
      });
    } catch (_) {}
  }

  if (students.length === 0) {
    students = [{
      uid: "demo-user-123",
      fullName: "વિદ્યાર્થી",
      mobile: "9876543210",
      role: "student",
      status: "approved",
      school: "DL High School",
      standard: "10",
      village: "Village",
      createdAt: now.toISOString()
    }];
  }

  // 2. Load exam results & total points (tie-breaker)
  let allExamResults: ExamResult[] = [];
  let allPoints: StudentPoints[] = [];

  if (isPlaceholder) {
    try {
      allExamResults = JSON.parse(localStorage.getItem("dle:exam_results") || "[]");
      students.forEach(s => {
        const pStr = localStorage.getItem(`dle:student_points:${s.uid}`);
        if (pStr) {
          allPoints.push(JSON.parse(pStr));
        } else {
          allPoints.push({
            studentId: s.uid,
            totalPoints: s.uid === "demo-user-123" ? 220 : 0,
            examPoints: 0,
            revisionPoints: 0,
            masteryPoints: 0,
            achievementPoints: 0,
            updatedAt: new Date().toISOString()
          });
        }
      });
    } catch (_) {}
  } else {
    try {
      const [resSnap, ptsSnap] = await Promise.all([
        getDocs(collection(db, "exam_results")),
        getDocs(collection(db, "student_points"))
      ]);
      resSnap.forEach(d => {
        const item = d.data() as ExamResult;
        allExamResults.push({
          ...item,
          studentId: item.studentId || d.id
        });
      });
      ptsSnap.forEach(d => {
        const item = d.data() as StudentPoints;
        allPoints.push({
          ...item,
          studentId: item.studentId || d.id
        });
      });
    } catch (_) {}
  }

  // 3. Process rankings per subject
  for (const subjectId of subjects) {
    const listForSubj: {
      studentId: string;
      studentName: string;
      rankingScore: number;
      points: number;
    }[] = [];

    for (const student of students) {
      const subResults = allExamResults.filter(
        r => r.studentId === student.uid && 
        (r.subject?.toLowerCase() === subjectId.toLowerCase() || 
         (subjectId === "Social Science" && r.subject?.toLowerCase() === "social_science"))
      );

      const avgPercent = subResults.length > 0
        ? subResults.reduce((sum, r) => sum + (r.percentage || 0), 0) / subResults.length
        : 0;

      const pts = allPoints.find(p => p.studentId === student.uid)?.totalPoints ?? 0;

      listForSubj.push({
        studentId: student.uid,
        studentName: student.fullName || "વિદ્યાર્થી",
        rankingScore: parseFloat(avgPercent.toFixed(2)),
        points: pts
      });
    }

    // Sort: score desc, then total points desc (tie breaker)
    listForSubj.sort((a, b) => {
      if (b.rankingScore !== a.rankingScore) return b.rankingScore - a.rankingScore;
      return b.points - a.points;
    });

    // Rank assignment
    listForSubj.forEach((item, index) => {
      allSubjectRecords.push({
        subjectId,
        studentId: item.studentId,
        studentName: item.studentName,
        rankingScore: item.rankingScore,
        rank: index + 1,
        updatedAt: now.toISOString()
      });
    });
  }

  // 4. Persistence
  if (isPlaceholder) {
    try {
      localStorage.setItem("dle:subject_leaderboards", JSON.stringify(allSubjectRecords));
    } catch (_) {}
  } else {
    try {
      const batch = writeBatch(db);
      // Top 200 records to scale performance optimization
      const listToSave = allSubjectRecords.slice(0, 200);
      for (const rec of listToSave) {
        const docId = `${rec.subjectId}_${rec.studentId}`;
        const docRef = doc(db, "subject_leaderboards", docId);
        batch.set(docRef, {
          ...rec,
          updatedAt: serverTimestamp()
        });
      }
      await batch.commit();
    } catch (e) {
      console.error("Failed saving subject leaderboards to firestore:", e);
    }
  }

  return allSubjectRecords;
}

/**
 * FIX 9: TOP PERFORMER ENGINE
 * Computes, awards, and saves Gold, Silver, Bronze champions
 */
export async function calculateTopPerformers(allTimeLeaderboard: LeaderboardRecord[]): Promise<TopPerformer[]> {
  const isPlaceholder = isFirebasePlaceholder;
  const now = new Date();
  
  // Sort overall desc
  const sorted = [...allTimeLeaderboard].sort((a, b) => a.rank - b.rank);
  const podiumWinners: TopPerformer[] = [];

  const medals: ("gold" | "silver" | "bronze")[] = ["gold", "silver", "bronze"];

  medals.forEach((medal, index) => {
    const s = sorted[index];
    if (s) {
      podiumWinners.push({
        medal,
        studentId: s.studentId,
        studentName: s.studentName,
        points: s.points,
        rankingScore: s.rankingScore,
        standard: s.standard,
        school: s.school,
        village: s.village,
        updatedAt: now.toISOString()
      });
    } else {
      // Default/Fallback values if not enough records
      podiumWinners.push({
        medal,
        studentId: `fallback-${medal}`,
        studentName: medal === "gold" ? "પ્રથમ વિજેતા" : medal === "silver" ? "દ્વિતીય વિજેતા" : "તૃતીય વિજેતા",
        points: 0,
        rankingScore: 0,
        standard: "10",
        school: "DL High School",
        village: "Village",
        updatedAt: now.toISOString()
      });
    }
  });

  if (isPlaceholder) {
    try {
      localStorage.setItem("dle:topPerformers", JSON.stringify(podiumWinners));
    } catch (_) {}
  } else {
    try {
      const batch = writeBatch(db);
      for (const item of podiumWinners) {
        const docRef = doc(db, "topPerformers", item.medal);
        batch.set(docRef, {
          ...item,
          updatedAt: serverTimestamp()
        });
      }
      await batch.commit();
    } catch (e) {
      console.error("Failed saving topPerformers to firestore:", e);
    }
  }

  return podiumWinners;
}

/**
 * Scheduled Cloud Function daily executor
 */
export async function scheduledDailyUpdate() {
  return calculateLeaderboardForSpan("daily");
}

/**
 * Scheduled Cloud Function weekly executor
 */
export async function scheduledWeeklyUpdate() {
  return calculateLeaderboardForSpan("weekly");
}

/**
 * Scheduled Cloud Function monthly executor
 */
export async function scheduledMonthlyUpdate() {
  return calculateLeaderboardForSpan("monthly");
}

/**
 * Scheduled Cloud Function alltime executor
 * Runs and chains subject rankings + top performer extraction to complete scheduler sync completely
 */
export async function scheduledAllTimeUpdate() {
  const allTimeRecs = await calculateLeaderboardForSpan("alltime");
  await Promise.all([
    calculateSubjectLeaderboards(),
    calculateTopPerformers(allTimeRecs)
  ]);
  return allTimeRecs;
}

/**
 * Triggers all functions together for system initial seed synchronization
 */
export async function triggerAllLeaderboardsSync() {
  const [_, __, ___, allTimeRecs] = await Promise.all([
    calculateLeaderboardForSpan("daily"),
    calculateLeaderboardForSpan("weekly"),
    calculateLeaderboardForSpan("monthly"),
    calculateLeaderboardForSpan("alltime")
  ]);

  await Promise.all([
    calculateSubjectLeaderboards(),
    calculateTopPerformers(allTimeRecs)
  ]);

  return true;
}
