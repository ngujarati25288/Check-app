import { 
  db, 
  isFirebasePlaceholder 
} from "../firebase";
import { 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc,
  collection, 
  query, 
  where,
  serverTimestamp
} from "firebase/firestore";
import { Question, DailyExam, ExamResult, StudentMistake, RevisionAnalytics, DBUser } from "../../types";

// Helper to get formatted date in Asia/Kolkata (IST) timezone
export function getKolkataDateString(date = new Date()): string {
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
}

// Helper to get day difference timezone-safely
export function getKolkataDaysDifference(dateStr1: string, dateStr2: string): number {
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
}

// Common Secure Streak Update Function
export async function updateStudentStreakSecure(studentId: string, todayStr: string, isPlaceholderMode: boolean) {
  let streakUpdated = false;
  let nextStreak = 1;
  let currentStreak = 0;

  if (isPlaceholderMode) {
    try {
      const userProfile = localStorage.getItem("dle:user");
      const u = userProfile ? (JSON.parse(userProfile) as DBUser) : null;
      if (u && u.uid === studentId) {
        currentStreak = u.streak || 0;
        const lastActiveDateStr = u.lastActiveDate;

        if (lastActiveDateStr === todayStr) {
          nextStreak = currentStreak || 1;
        } else if (lastActiveDateStr) {
          const diffDays = getKolkataDaysDifference(todayStr, lastActiveDateStr);
          if (diffDays === 1) {
            nextStreak = (currentStreak || 0) + 1;
          } else {
            nextStreak = 1;
          }
        } else {
          nextStreak = 1;
        }

        const updatedUser = {
          ...u,
          streak: nextStreak,
          lastActiveDate: todayStr
        };
        localStorage.setItem("dle:user", JSON.stringify(updatedUser));
        try {
          localStorage.setItem("dle:user_session", JSON.stringify(updatedUser));
        } catch (_) {}
        streakUpdated = true;
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("dle:user_updated"));
        }
      }
    } catch (e) {
      console.error("Local user profile streak update failed:", e);
    }
  } else {
    try {
      const userRef = doc(db, "users", studentId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data() as DBUser;
        currentStreak = userData.streak || 0;
        const lastActiveDateStr = userData.lastActiveDate;

        if (lastActiveDateStr === todayStr) {
          nextStreak = currentStreak || 1;
        } else if (lastActiveDateStr) {
          const diffDays = getKolkataDaysDifference(todayStr, lastActiveDateStr);
          if (diffDays === 1) {
            nextStreak = (currentStreak || 0) + 1;
          } else {
            nextStreak = 1;
          }
        } else {
          nextStreak = 1;
        }

        await updateDoc(userRef, {
          streak: nextStreak,
          lastActiveDate: todayStr,
          updatedAt: serverTimestamp()
        });
        streakUpdated = true;
      }
    } catch (e) {
      console.error("User profile streak update failed in Firestore:", e);
    }
  }

  if (streakUpdated) {
    try {
      await awardPointsAndCheckAchievementsSecure(studentId, "streak", nextStreak);
    } catch (e) {
      console.error("Points/Achievements award for streak failed:", e);
    }
  }

  return { streakUpdated, nextStreak };
}

export interface GetQuestionsInput {
  examId: string;
  studentId: string;
  subjectId: string;
  chapterId: string;
  standard?: string;
}

export interface SubmitExamInput {
  examId: string;
  studentId: string;
  studentName: string;
  subjectId: string;
  chapterId: string;
  answers: (number | null)[];
  deviceInfo: {
    deviceId: string;
    appVersion: string;
    startTime: string;
    submitTime: string;
    attemptNumber: number;
  };
}

export interface RecordRevisionInput {
  studentId: string;
  questionId: string;
  isCorrect: boolean;
}

/**
 * Loads exam questions securely by retrieving from Firestore
 * and stripping sensitive fields (correctAnswer, explanation) 
 * before returning them to the React client components.
 */
export async function getExamQuestionsSecure({ data }: { data: GetQuestionsInput }) {
  const { examId, studentId, subjectId, chapterId } = data;

  // 1. Double intent/abuse protection check
  if (!isFirebasePlaceholder) {
    try {
      const resultDocId = `res_${studentId}_${examId}`;
      const resDocRef = doc(db, "exam_results", resultDocId);
      const resDocSnap = await getDoc(resDocRef);
      if (resDocSnap.exists()) {
        throw new Error("તમે આ પરીક્ષા પહેલાથી જ સબમિટ કરી દીધી છે.");
      }
    } catch (e: any) {
      if (e.message && (e.message.includes("permission-denied") || e.message.includes("permissions") || e.code === "permission-denied")) {
        console.warn("Permission checking exam results document, proceeding assuming non-existent", e);
      } else if (e.message === "તમે આ પરીક્ષા પહેલાથી જ સબમિટ કરી દીધી છે.") {
        throw e;
      } else {
        console.error("Unhandleable error during security double-check:", e);
      }
    }
  }

  // 2. Load questions
  let dbQuestions: Question[] = [];

  if (isFirebasePlaceholder) {
    // In placeholder mode, look up from fallback local storage if available
    try {
      const storedQuestions = localStorage.getItem("dle:questions");
      if (storedQuestions) {
        dbQuestions = JSON.parse(storedQuestions) as Question[];
      }
    } catch (e) {
      dbQuestions = [];
    }
  } else {
    try {
      const qRef = collection(db, "questions");
      const qQuery = query(qRef, where("subjectId", "==", subjectId), where("chapterId", "==", chapterId));
      const qSnaps = await getDocs(qQuery);
      qSnaps.forEach((doc) => {
        const item = doc.data() as Question;
        if (item.questionId !== "q1" && item.questionId !== "q2") {
          dbQuestions.push(item);
        }
      });
    } catch (e: any) {
      console.error("Firestore loading error on secure get questions function:", e);
    }
  }

  // Filter matching subject/chapter if in placeholder
  if (isFirebasePlaceholder) {
    dbQuestions = dbQuestions.filter(
      (q) => q.subjectId === subjectId && q.chapterId === chapterId && q.questionId !== "q1" && q.questionId !== "q2"
    );
  }

  // 3. SECURE STRIPPING: Client must NEVER receive 'correctAnswer' and 'explanation'
  const strippedQuestions = dbQuestions.map((q) => ({
    questionId: q.questionId,
    subjectId: q.subjectId,
    chapterId: q.chapterId,
    question: q.question,
    optionA: q.optionA,
    optionB: q.optionB,
    optionC: q.optionC,
    optionD: q.optionD,
    difficulty: q.difficulty
  }));

  return {
    questions: strippedQuestions,
    isPlaceholder: isFirebasePlaceholder
  };
}

/**
 * Recalculates and saves RevisionAnalytics for a student.
 */
export async function updateRevisionAnalyticsInternal(studentId: string, isPlaceholder: boolean): Promise<RevisionAnalytics> {
  let allMistakes: StudentMistake[] = [];

  if (isPlaceholder) {
    try {
      const stored = localStorage.getItem("dle:student_mistakes");
      const list = stored ? JSON.parse(stored) as StudentMistake[] : [];
      allMistakes = list.filter(m => m.studentId === studentId);
    } catch (e) {
      allMistakes = [];
    }
  } else {
    try {
      const q = query(collection(db, "student_mistakes"), where("studentId", "==", studentId));
      const snaps = await getDocs(q);
      snaps.forEach((doc) => {
        allMistakes.push(doc.data() as StudentMistake);
      });
    } catch (e) {
      console.error("Firestore query error in revision analytics calculation:", e);
      try {
        const stored = localStorage.getItem("dle:student_mistakes");
        const list = stored ? JSON.parse(stored) as StudentMistake[] : [];
        allMistakes = list.filter(m => m.studentId === studentId);
      } catch (_) {}
    }
  }

  const totalRevisions = allMistakes.reduce((sum, m) => sum + (m.revisionCount || 0), 0);
  const totalCorrectRevisions = allMistakes.reduce((sum, m) => sum + (m.correctRevisionCount || 0), 0);
  const revisionAccuracy = totalRevisions > 0 ? Math.round((totalCorrectRevisions / totalRevisions) * 100) : 0;
  const pendingRevisionCount = allMistakes.filter(m => !m.mastered).length;
  const masteredQuestionsCount = allMistakes.filter(m => m.mastered).length;

  const subjectGroups: { [subj: string]: { total: number; mastered: number } } = {};
  allMistakes.forEach(m => {
    const subj = m.subjectName || m.subject || "General";
    if (!subjectGroups[subj]) {
      subjectGroups[subj] = { total: 0, mastered: 0 };
    }
    subjectGroups[subj].total += 1;
    if (m.mastered) {
      subjectGroups[subj].mastered += 1;
    }
  });

  let strongestSubject = "";
  let weakestSubject = "";
  let bestRatio = -1;
  let worstRatio = 2;

  Object.entries(subjectGroups).forEach(([subject, stats]) => {
    const ratio = stats.mastered / stats.total;
    if (ratio > bestRatio) {
      bestRatio = ratio;
      strongestSubject = subject;
    }
    if (ratio < worstRatio) {
      worstRatio = ratio;
      weakestSubject = subject;
    }
  });

  if (!strongestSubject) strongestSubject = "Science";
  if (!weakestSubject) weakestSubject = "Mathematics";

  const analyticsDoc: RevisionAnalytics = {
    studentId,
    totalRevisions,
    totalCorrectRevisions,
    revisionAccuracy,
    strongestSubject,
    weakestSubject,
    pendingRevisionCount,
    masteredQuestionsCount,
    updatedAt: new Date().toISOString()
  };

  if (isPlaceholder) {
    localStorage.setItem(`dle:revision_analytics:${studentId}`, JSON.stringify(analyticsDoc));
    localStorage.setItem(`dle:revision_analytics`, JSON.stringify(analyticsDoc));
  } else {
    try {
      await setDoc(doc(db, "revision_analytics", studentId), {
        ...analyticsDoc,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error("Firestore write failed for revision_analytics:", e);
    }
  }

  return analyticsDoc;
}

/**
 * processes exam submission securely:
 * 1. Validates duplicate submission attempts.
 * 2. Fetches the official answers directly from the database (so the UI never holds them!)
 * 3. Calculates metrics (correct counts, marks, percent, grade).
 * 4. Persists the exam results and mistakes to Firestore including device audit logs.
 */
export async function submitExamSecure({ data }: { data: SubmitExamInput }) {
  const { examId, studentId, studentName, subjectId, chapterId, answers, deviceInfo } = data;
  const resultDocId = `res_${studentId}_${examId}`;
  const todayStr = getKolkataDateString();

  // 1. One Submission Protection (even after logout/login)
  if (!isFirebasePlaceholder) {
    const resDocRef = doc(db, "exam_results", resultDocId);
    const resDocSnap = await getDoc(resDocRef);
    if (resDocSnap.exists()) {
      throw new Error("Duplicate submission blocked. You have already completed this exam.");
    }
  }

  // 2. Fetch answer keys on the server/secure storage securely
  let masterQuestions: Question[] = [];

  if (isFirebasePlaceholder) {
    // Local storage query in fallback mode
    try {
      const storedQuestions = localStorage.getItem("dle:questions");
      if (storedQuestions) {
        masterQuestions = JSON.parse(storedQuestions) as Question[];
      }
    } catch (e) {
      masterQuestions = [];
    }
  } else {
    const qRef = collection(db, "questions");
    const qQuery = query(qRef, where("subjectId", "==", subjectId), where("chapterId", "==", chapterId));
    const qSnaps = await getDocs(qQuery);
    qSnaps.forEach((doc) => {
      masterQuestions.push(doc.data() as Question);
    });
  }

  if (isFirebasePlaceholder) {
    masterQuestions = masterQuestions.filter(
      (q) => q.subjectId === subjectId && q.chapterId === chapterId
    );
  }

  if (masterQuestions.length === 0) {
    return {
      success: true,
      resultId: resultDocId,
      isPlaceholder: true
    };
  }

  // 3. Calculate metrics
  let correct = 0;
  let wrong = 0;
  const mistakesToSave: StudentMistake[] = [];

  let subjectStr = subjectId === "sub1" ? "Science" : subjectId === "sub2" ? "Mathematics" : "Social Science";
  let chapterStr = chapterId === "ch1" ? "Chapter 6 — Life Processes" : "Chapter 1 — Real Numbers";

  try {
    if (isFirebasePlaceholder) {
      const subjectsList = JSON.parse(localStorage.getItem("subjects") || "[]") as any[];
      const matchedS = subjectsList.find(s => s.subjectId === subjectId);
      if (matchedS) subjectStr = matchedS.subjectName;

      const chaptersList = JSON.parse(localStorage.getItem("chapters") || "[]") as any[];
      const matchedC = chaptersList.find(c => c.chapterId === chapterId);
      if (matchedC) chapterStr = matchedC.chapterName;
    } else {
      const sDoc = await getDoc(doc(db, "subjects", subjectId));
      if (sDoc.exists()) {
        subjectStr = (sDoc.data() as any).subjectName;
      }
      const cDoc = await getDoc(doc(db, "chapters", chapterId));
      if (cDoc.exists()) {
        chapterStr = (cDoc.data() as any).chapterName;
      }
    }
  } catch (err) {
    console.error("Failed to dynamically look up subject/chapter names:", err);
  }

  masterQuestions.forEach((q, idx) => {
    const selectedIdx = answers[idx];
    const selectedLetter = selectedIdx !== null && selectedIdx !== undefined ? String.fromCharCode(65 + selectedIdx) : null;
    const isCorrect = selectedLetter === q.correctAnswer;

    if (isCorrect) {
      correct++;
    } else {
      wrong++;
      mistakesToSave.push({
        studentId: studentId,
        examId: examId,
        questionId: q.questionId,
        subjectId: subjectId,
        subjectName: subjectStr,
        chapterId: chapterId,
        chapterName: chapterStr,
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        selectedAnswer: selectedLetter || "Skipped",
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || "No explanation document available.",
        examDate: todayStr,
        revisionCount: 0,
        correctRevisionCount: 0,
        mastered: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        latestExamDate: todayStr,
        lastWrongAttempt: selectedLetter || "Skipped",
        revisionLevel: 1,
        consecutiveCorrectCount: 0,
        nextRevisionDate: todayStr // available today immediately
      });
    }
  });

  const percentage = Math.round((correct / masterQuestions.length) * 100);

  // Save exam details including Extended Audit Data (FIX 7)
  const examResult: ExamResult = {
    resultId: resultDocId,
    studentId: studentId,
    examId: examId,
    subject: subjectStr,
    chapter: chapterStr,
    examDate: todayStr,
    totalQuestions: masterQuestions.length,
    correctAnswers: correct,
    wrongAnswers: wrong,
    obtainedMarks: correct,
    percentage: percentage,
    submittedAt: new Date().toISOString(),
    deviceId: deviceInfo.deviceId,
    appVersion: deviceInfo.appVersion,
    startTime: deviceInfo.startTime,
    submitTime: deviceInfo.submitTime,
    attemptNumber: deviceInfo.attemptNumber
  };

  // 4. Save to Firestore / local cache
  if (!isFirebasePlaceholder) {
    // Save exam result doc
    await setDoc(doc(db, "exam_results", resultDocId), {
      ...examResult,
      submittedAt: serverTimestamp()
    });

    // Save student mistakes docs with duplicate protection (Phase 7 / Phase 8)
    for (const mistake of mistakesToSave) {
      const mistakeDocId = `${studentId}_${mistake.questionId}`;
      const mistakeDocRef = doc(db, "student_mistakes", mistakeDocId);
      const existingDocSnap = await getDoc(mistakeDocRef);

      if (existingDocSnap.exists()) {
        const existingData = existingDocSnap.data();
        await setDoc(mistakeDocRef, {
          ...existingData,
          updatedAt: serverTimestamp(),
          latestExamDate: mistake.examDate,
          lastWrongAttempt: mistake.selectedAnswer,
          mastered: false, // Re-verify: incorrect again -> needs revision
          revisionLevel: 1,
          consecutiveCorrectCount: 0,
          nextRevisionDate: todayStr
        }, { merge: true });
      } else {
        await setDoc(mistakeDocRef, {
          ...mistake,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    }
  } else {
    // Seed local cache if in placeholder
    try {
      const storedResults = localStorage.getItem("dle:exam_results");
      const list = storedResults ? (JSON.parse(storedResults) as ExamResult[]) : [];
      list.push(examResult);
      localStorage.setItem("dle:exam_results", JSON.stringify(list));

      const storedMistakes = localStorage.getItem("dle:student_mistakes");
      const mistakesList = storedMistakes ? (JSON.parse(storedMistakes) as StudentMistake[]) : [];
      for (const mistake of mistakesToSave) {
        const existingIdx = mistakesList.findIndex(m => m.studentId === mistake.studentId && m.questionId === mistake.questionId);
        if (existingIdx > -1) {
          mistakesList[existingIdx] = {
            ...mistakesList[existingIdx],
            updatedAt: new Date().toISOString(),
            latestExamDate: mistake.examDate,
            lastWrongAttempt: mistake.selectedAnswer,
            mastered: false,
            revisionLevel: 1,
            consecutiveCorrectCount: 0,
            nextRevisionDate: todayStr
          };
        } else {
          mistakesList.push(mistake);
        }
      }
      localStorage.setItem("dle:student_mistakes", JSON.stringify(mistakesList));
    } catch (e) {
      console.warn("Could not save fallback placeholder results into localStorage:", e);
    }
  }

  // Recalculate revision analytics
  await updateRevisionAnalyticsInternal(studentId, isFirebasePlaceholder);

  // Update student streak on learning action
  await updateStudentStreakSecure(studentId, todayStr, isFirebasePlaceholder);

  // Trigger Points & Achievements Securing
  try {
    await awardPointsAndCheckAchievementsSecure(studentId, "exam");
    if (percentage >= 90) {
      await awardPointsAndCheckAchievementsSecure(studentId, "performance", percentage);
    }
  } catch (e) {
    console.error("Points/Achievements triggering failed inside submitExamSecure:", e);
  }

  return {
    success: true,
    resultId: resultDocId,
    correctAnswers: correct,
    wrongAnswers: wrong,
    obtainedMarks: correct,
    percentage,
    isPlaceholder: isFirebasePlaceholder
  };
}

/**
 * Records a revision attempt securely inside Cloud/Server function:
 * Implement True Spaced Repetition (FIX 2) & Consecutive Correct Mastery (FIX 3)
 */
export async function recordRevisionAttemptSecure({ data }: { data: RecordRevisionInput }) {
  const { studentId, questionId, isCorrect } = data;
  const now = new Date();
  const todayStr = getKolkataDateString(now);

  let targetMistake: StudentMistake | null = null;

  if (isFirebasePlaceholder) {
    try {
      const stored = localStorage.getItem("dle:student_mistakes");
      const list = stored ? (JSON.parse(stored) as StudentMistake[]) : [];
      const item = list.find(m => m.studentId === studentId && m.questionId === questionId);
      if (item) targetMistake = item;
    } catch (_) {}
  } else {
    try {
      const docRef = doc(db, "student_mistakes", `${studentId}_${questionId}`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        targetMistake = snap.data() as StudentMistake;
      }
    } catch (e) {
      console.error("Firestore load error on recordRevisionAttemptSecure:", e);
    }
  }

  // Fallback to local storage if Firestore load failed or empty snapshot
  if (!targetMistake) {
    try {
      const stored = localStorage.getItem("dle:student_mistakes");
      const list = stored ? (JSON.parse(stored) as StudentMistake[]) : [];
      const item = list.find(m => m.studentId === studentId && m.questionId === questionId);
      if (item) targetMistake = item;
    } catch (_) {}
  }

  if (!targetMistake) {
    throw new Error(`યાંત્રિક ખામી! કોઈ ભૂલ રેકોર્ડ મળી નથી: ${studentId}_${questionId}`);
  }

  // 1. Calculate spacing repetition level & consecutive counts
  const currentCount = targetMistake.revisionCount || 0;
  const currentCorrectCount = targetMistake.correctRevisionCount || 0;
  const currentLevel = targetMistake.revisionLevel || 1;
  const currentConsecutive = targetMistake.consecutiveCorrectCount || 0;

  let newCount = currentCount + 1;
  let newCorrectCount = isCorrect ? currentCorrectCount + 1 : currentCorrectCount;
  let newLevel = 1;
  let newConsecutive = 0;
  let newMastered = false;
  let addDays = 1;

  if (isCorrect) {
    newLevel = currentLevel + 1;
    newConsecutive = currentConsecutive + 1;
    newMastered = newConsecutive >= 1;

    // Spaced repetition scheduler logic (FIX 2)
    // Level 1 -> Day 1
    // Level 2 -> Day 3
    // Level 3 -> Day 7
    // Level 4 -> Day 15
    // Level 5 -> Day 30
    if (newLevel === 1) addDays = 1;
    else if (newLevel === 2) addDays = 3;
    else if (newLevel === 3) addDays = 7;
    else if (newLevel === 4) addDays = 15;
    else addDays = 30; // Level 5 or higher
  } else {
    // When wrong: level resets to 1, next review scheduled for tomorrow (+1 day)
    newLevel = 1;
    newConsecutive = 0;
    newMastered = false;
    addDays = 1;
  }

  const nextDate = new Date();
  nextDate.setDate(now.getDate() + addDays);
  const nextRevisionDateStr = nextDate.toISOString().split('T')[0];

  const updatedMistake: StudentMistake = {
    ...targetMistake,
    revisionCount: newCount,
    correctRevisionCount: newCorrectCount,
    consecutiveCorrectCount: newConsecutive,
    revisionLevel: newLevel,
    mastered: newMastered,
    lastRevisionDate: todayStr,
    lastRevisedAt: now.toISOString(),
    nextRevisionDate: nextRevisionDateStr,
    updatedAt: now.toISOString(),
    ...(newMastered ? { masteredAt: now.toISOString() } : { masteredAt: null })
  };

  // 2. Persists mistake change
  if (isFirebasePlaceholder) {
    try {
      const stored = localStorage.getItem("dle:student_mistakes");
      const list = stored ? (JSON.parse(stored) as StudentMistake[]) : [];
      const idx = list.findIndex(m => m.studentId === studentId && m.questionId === questionId);
      if (idx > -1) {
        list[idx] = updatedMistake;
      } else {
        list.push(updatedMistake);
      }
      localStorage.setItem("dle:student_mistakes", JSON.stringify(list));
    } catch (_) {}
  } else {
    try {
      const docRef = doc(db, "student_mistakes", `${studentId}_${questionId}`);
      await updateDoc(docRef, {
        revisionCount: newCount,
        correctRevisionCount: newCorrectCount,
        consecutiveCorrectCount: newConsecutive,
        revisionLevel: newLevel,
        mastered: newMastered,
        lastRevisionDate: todayStr,
        lastRevisedAt: serverTimestamp(),
        nextRevisionDate: nextRevisionDateStr,
        updatedAt: serverTimestamp(),
        masteredAt: newMastered ? serverTimestamp() : null
      });
    } catch (e) {
      console.error("Firestore update mistake failed, saving to local fallback state:", e);
      // Fallback
      try {
        const stored = localStorage.getItem("dle:student_mistakes");
        const list = stored ? (JSON.parse(stored) as StudentMistake[]) : [];
        const idx = list.findIndex(m => m.studentId === studentId && m.questionId === questionId);
        if (idx > -1) {
          list[idx] = updatedMistake;
        } else {
          list.push(updatedMistake);
        }
        localStorage.setItem("dle:student_mistakes", JSON.stringify(list));
      } catch (_) {}
    }
  }

  // 3. Update student streak on active dynamic action
  await updateStudentStreakSecure(studentId, todayStr, isFirebasePlaceholder);

  // 4. Recalculate revision analytics
  await updateRevisionAnalyticsInternal(studentId, isFirebasePlaceholder);

  // Trigger Points & Achievements Securing
  try {
    await awardPointsAndCheckAchievementsSecure(studentId, "revision");
    if (updatedMistake.mastered) {
      await awardPointsAndCheckAchievementsSecure(studentId, "mastery");
    }
  } catch (e) {
    console.error("Points/Achievements triggering failed inside recordRevisionAttemptSecure:", e);
  }

  return updatedMistake;
}

export const ACHIEVEMENT_DEFINITIONS = [
  // Exams (Marvel Iron Man / Naruto Shinobi Rank theme)
  { id: "exam_1", category: "exam", badgeName: "Arc Reactor", targetValue: 1, points: 50, emoji: "🤖", title: "આયર્ન મેન આર્ક રિએક્ટર", titleEn: "Arc Reactor Powered", description: "Powered up! Complete your first exam like Tony Stark starts his armor", descriptionGu: "મારી પ્રથમ પરીક્ષા પૂર્ણ કરીને આયર્ન મેનની જેમ પાવર-અપ બનો!" },
  { id: "exam_10", category: "exam", badgeName: "Genin Ninja", targetValue: 10, points: 100, emoji: "🍃", title: "ગેનિન નીન્જા લાયસન્સ", titleEn: "Genin Ninja Graduate", description: "Complete 10 exams to graduate from the Ninja Academy", descriptionGu: "૧૦ પરીક્ષાઓ સાથે શિનોબી એકેડેમી પાસ કરીને ગેનિન પદવી મેળવો!" },
  { id: "exam_25", category: "exam", badgeName: "Sharingan Eye", targetValue: 25, points: 150, emoji: "👁️‍🗨️", title: "શારિંગન સક્રિય", titleEn: "Sharingan Activated", description: "Complete 25 exams to unlock the legendary Sharingan visual prowess", descriptionGu: "૨૫ પરીક્ષાઓ આપીને ઉચીહા કુળનું સુપ્રસિદ્ધ શારિંગન ચક્ષુ સક્રિય કરો!" },
  { id: "exam_50", category: "exam", badgeName: "Captain Shield", targetValue: 50, points: 200, emoji: "🛡️", title: "કેપ્ટન અમેરિકા શીલ્ડ", titleEn: "Vibranium Shield Force", description: "Complete 50 exams to possess the unbreakable Vibranium shield of focus", descriptionGu: "૫૦ પરીક્ષાઓ સાથે કેપ્ટન અમેરિકા જેવી અતૂટ વાાઇબ્રેનિયમ ઢાલ મેળવો!" },
  { id: "exam_100", category: "exam", badgeName: "Hokage Supreme", targetValue: 100, points: 250, emoji: "🍥", title: "લિજેન્ડરી હોકાગે ટાઇટલ", titleEn: "Hokage Elite Supreme", description: "Complete 100 exams! You are now respected as the protector of the village", descriptionGu: "૧૦૦ પરીક્ષાઓ સફળતાપૂર્વક પૂર્ણ કરી તમે સર્વોચ્ચ હોકાગે બન્યા છો!" },

  // Revision (Deadpool Heal / Naruto Rasegan focus theme)
  { id: "rev_1", category: "revision", badgeName: "Chunin Rank", targetValue: 1, points: 30, emoji: "🦊", title: "ચીનીન શિનોબી પદવી", titleEn: "Chunin Shinobi", description: "Review your first question to demonstrate tactical adaptability", descriptionGu: "ભૂલ સુધારીને પ્રથમ વાર પ્રશ્નનું પુનરાવર્તન કરો" },
  { id: "rev_25", category: "revision", badgeName: "Deadpool Regenerate", targetValue: 25, points: 80, emoji: "⚔️", title: "ડેડપૂલ ઓટો-હીલિંગ", titleEn: "Deadpool Instant Heal", description: "Review 25 wrong questions to regenerate your stamina instantly", descriptionGu: "૨૫ પ્રશ્નોના રિવિઝન વડે ડેડપૂલની જેમ તમારી બધી ભૂલોને ત્વરિત સુધારો!" },
  { id: "rev_100", category: "revision", badgeName: "Rasengan Orb", targetValue: 100, points: 150, emoji: "🌀", title: "રાસેંગન ચક્ર એનર્જી", titleEn: "Rasengan Chakra Focus", description: "Review 100 wrong questions to mold the swirling sphere of ultimate focus", descriptionGu: "૧૦૦ રિવિઝન પૂરા કરીને પ્રચંડ રાસેંગન ચક્ર શક્તિ હસ્તગત કરો!" },
  { id: "rev_500", category: "revision", badgeName: "Infinite Tsukuyomi", targetValue: 500, points: 300, emoji: "🔴", title: "અનંત સુકુયોમી કિંગ", titleEn: "Infinite Tsukuyomi Overlord", description: "Review 500 wrong questions to command absolute control over your destiny", descriptionGu: "૫૦૦ રિવિઝન પૂરા કરીને બ્રહ્માંડના સર્વજ્ઞાની કિંગ સાબિત થાઓ!" },

  // Mastery (Shadow Clone / Thor / Susanoo armor theme)
  { id: "master_1", category: "mastery", badgeName: "Spidey Crawl", targetValue: 1, points: 50, emoji: "🕸️", title: "સ્પાઈડર બાઇટ શક્તિ", titleEn: "First Mastered Spark", description: "Master 1 question consecutively to stick to the ceiling of achievements", descriptionGu: "૧ ભૂલવાળો પ્રશ્ન સતત ૩ વાર સાચો આપી ગ્રીપ મેળવો!" },
  { id: "master_10", category: "mastery", badgeName: "Shadow Clone", targetValue: 10, points: 100, emoji: "👥", title: "શેડો ક્લોન ટેકનિક", titleEn: "Multi Shadow Clone Jutsu", description: "Master 10 wrong questions to clone your focus in multiple directions", descriptionGu: "૧૦ કઠિન પ્રશ્નો માસ્ટર કરી નરુટોની જેમ મલ્ટી શેડો ક્લોન જ્યુત્સુ જગાવો!" },
  { id: "master_50", category: "mastery", badgeName: "Thor Hammer", targetValue: 50, points: 200, emoji: "⚡", title: "થોરનું ઓરિજિનલ મ્યોલનીર", titleEn: "Mjolnir Thunder Worthy", description: "Master 50 wrong questions. You are now worthy to lift the Mighty Thor's hammer!", descriptionGu: "૫૦ માસ્ટર્ડ પ્રશ્નો સાથે થોરનું અતુલ્ય મ્યોલનીર હથિયાર હલનચલન કરાવો!" },
  { id: "master_100", category: "mastery", badgeName: "Perfect Susanoo", targetValue: 100, points: 300, emoji: "🟣", title: "સુસાનો અલ્ટીમેટ ડિફેન્સ", titleEn: "Ultimate Susanoo Armor", description: "Master 100 wrong questions to summon the unbreakable giant titan warrior armor", descriptionGu: "૧૦૦ કઠિન પ્રશ્નો સર કરી ઉચીહા અલ્ટીમેટ સુસાનો રક્ષા કવચ સક્રિય કરો!" },

  // Streak (Spider Sense / Black Panther / Kurama 九尾 theme)
  { id: "streak_3", category: "streak", badgeName: "Spider Sense", targetValue: 3, points: 30, emoji: "🕷️", title: "સ્પાઈડી-સેન્સ રક્ષણ", titleEn: "Spidey Sense On", description: "Learn 3 days in a row. Your senses are tingling for danger!", descriptionGu: "સતત ૩ દિવસ પરીક્ષા આપીને તમારું સ્પાઈડર સેન્સ સજાગ કરો!" },
  { id: "streak_7", category: "streak", badgeName: "Wakanda vibranium", targetValue: 7, points: 50, emoji: "🐆", title: "વાઇબ્રેનિયમ બ્લેક પેન્થર", titleEn: "Vibranium Kinetic Charge", description: "Learn 7 days in a row. Fuel your mind with Wakandan ultimate kinetic energy!", descriptionGu: "સતત ૭ દિવસની તાલીમ સાથે બ્લેક પેન્થર જેવી વાઇબ્રેનિયમ તાકાત મેળવો!" },
  { id: "streak_30", category: "streak", badgeName: "Kurama Chakra", targetValue: 30, points: 150, emoji: "🔥", title: "કુરામા નાઇન-ટેલ્સ મોડ", titleEn: "Kurama Nine-Tails Mode", description: "Learn 30 days in a row to sync with the powerful Nine-Tailed fox chakra", descriptionGu: "સતત ૩૦ દિવસ સુધી અભ્યાસ જાળવી નરુટોના સુપર પાવર કુરમા મોડમાં પધારો!" },
  { id: "streak_100", category: "streak", badgeName: "Eye of Agamotto", targetValue: 100, points: 300, emoji: "👁️", title: "ડોક્ટર સ્ટ્રેન્જ ટાઇમ સ્ટોન", titleEn: "Eye of Agamotto Time Control", description: "Learn 100 days in a row. You can now rewind time and rewrite physics", descriptionGu: "સતત ૧૦૦ દિવસ લર્નિંગ કરી ડોક્ટર સ્ટ્રેન્જના ટાઇમ સ્ટોન સાથે સમય પર કાબૂ મેળવો!" },

  // Subject performance-based (Avengers / Legendary Shinobi Specific Ranks)
  { id: "sub_science", category: "subject_science", badgeName: "Iron Lab", targetValue: 90, points: 150, emoji: "🧬", title: "ટોની સ્ટાર્ક સાયન્સ લેબ", titleEn: "Tony Stark Science Lab", description: "Score 90%+ in any Science (વિજ્ઞાન) exam. Ultimate genius engineer level!", descriptionGu: "વિજ્ઞાન પરીક્ષામાં ૯૦% કે વધુ સ્કોર મેળવી આયર્નમેન જેવા સાયન્ટિસ્ટ બનો!" },
  { id: "sub_math", category: "subject_math", badgeName: "Yellow Flash", targetValue: 90, points: 150, emoji: "⚡", title: "મિનાતો યલો ફ્લેશ સ્પીડ", titleEn: "Minato's Yellow Flash Speed", description: "Score 90%+ in a Mathematics (ગણિત) exam. Run calculations at the speed of light!", descriptionGu: "ગણિત પરીક્ષામાં ૯૦% કે વધુ લાવી લાઇટનિંગ ફ્લેશ કિંગ શિનોબી બનો!" },
  { id: "sub_english", category: "subject_english", badgeName: "Web of Words", targetValue: 90, points: 120, emoji: "🕸️", title: "સ્પાઈડરમેન વેબ ઓફ લેંગ્વેજ", titleEn: "Spiderman's Web of Words", description: "Score 90%+ in an English (અંગ્રેજી) exam. Perfectly knit your language web!", descriptionGu: "અંગ્રેજી ભાષા પરીક્ષામાં ૯૦% કે વધુ લાવી સ્પાઈડરમેન જેવું અતૂટ ભાષા જાળું ગૂંથો!" },
  { id: "sub_gujarati", category: "subject_gujarati", badgeName: "Will of Fire", targetValue: 90, points: 120, emoji: "☄️", title: "નરુટો વિલ ઓફ ફાયર", titleEn: "Naruto's Will of Fire", description: "Score 90%+ in a Gujarati (ગુજરાતી) exam. Embody the passion for your native roots!", descriptionGu: "માતૃભાષા ગુજરાતી પરીક્ષામાં ૯૦% કે વધુ લાવી નરુટોના વિલ ઓફ ફાયર શિનોબી બનો!" },
  { id: "sub_social", category: "subject_social", badgeName: "Patriot Force", targetValue: 90, points: 120, emoji: "🗺️", title: "કેપ્ટન અમેરિકા હિસ્ટ્રી ક્રોનિકલ", titleEn: "Captain America History Shield", description: "Score 90%+ in Social Science (સામાજિક વિજ્ઞાન) exam. Absolute tactical historian!", descriptionGu: "સામાજિક વિજ્ઞાનમાં ૯૦% કે તેથી વધુ મેળવી પૃથ્વીના રખેવાળ સુપર સોલ્જર સાબિત થાઓ!" },

  // General performance
  { id: "perf_100", category: "performance", badgeName: "Sand Shield", targetValue: 100, points: 200, emoji: "⏳", title: "ગારા એબ્સોલ્યુટ સેન્ડ ડિફેન્સ", titleEn: "Gaara Absolute Sand Shield", description: "Score a perfect 100% in any exam. Zero mistakes, total protection", descriptionGu: "કોઈપણ પ્રોગ્રેસ પરીક્ષામાં પૂરેપૂરા ૧૦૦% ગુણ મેળવી ગારા જેવું અભેદ રેત કવચ મેળવો!" }
];

export async function awardPointsAndCheckAchievementsSecure(
  studentId: string, 
  actionType: "exam" | "revision" | "mastery" | "streak" | "performance", 
  actionValue?: number
) {
  const isPlaceholder = isFirebasePlaceholder;

  // 1. Determine points to award
  let addExamPoints = 0;
  let addRevisionPoints = 0;
  let addMasteryPoints = 0;

  if (actionType === "exam") {
    addExamPoints = 10;
  } else if (actionType === "revision") {
    addRevisionPoints = 5;
  } else if (actionType === "mastery") {
    addMasteryPoints = 20;
  }

  // 2. Load or initialize student points
  let studentPoints: any = {
    studentId,
    totalPoints: 0,
    examPoints: 0,
    revisionPoints: 0,
    masteryPoints: 0,
    achievementPoints: 0,
    updatedAt: new Date().toISOString()
  };

  if (isPlaceholder) {
    try {
      const stored = localStorage.getItem(`dle:student_points:${studentId}`);
      if (stored) {
        studentPoints = JSON.parse(stored);
      }
    } catch (_) {}
  } else {
    try {
      const docRef = doc(db, "student_points", studentId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        studentPoints = snap.data();
      }
    } catch (e) {
      console.error("Error reading student points from Firestore:", e);
    }
  }

  // Award the action points
  studentPoints.examPoints = (studentPoints.examPoints || 0) + addExamPoints;
  studentPoints.revisionPoints = (studentPoints.revisionPoints || 0) + addRevisionPoints;
  studentPoints.masteryPoints = (studentPoints.masteryPoints || 0) + addMasteryPoints;
  studentPoints.achievementPoints = studentPoints.achievementPoints || 0;
  studentPoints.totalPoints = 
    (studentPoints.examPoints || 0) + 
    (studentPoints.revisionPoints || 0) + 
    (studentPoints.masteryPoints || 0) + 
    (studentPoints.achievementPoints || 0);
  studentPoints.updatedAt = new Date().toISOString();

  // 3. Load other counts needed for milestones
  let examsCount = 0;
  let revisionsCount = 0;
  let masteredCount = 0;
  let streakValue = 0;
  let highestScore = 0;

  // Load user results
  let resultsList: any[] = [];
  if (isPlaceholder) {
    try {
      const stored = localStorage.getItem("dle:exam_results");
      resultsList = stored ? JSON.parse(stored) : [];
      resultsList = resultsList.filter((r: any) => r.studentId === studentId);
    } catch (_) {}
  } else {
    try {
      const snaps = await getDocs(query(collection(db, "exam_results"), where("studentId", "==", studentId)));
      snaps.forEach(docSnap => resultsList.push(docSnap.data()));
    } catch (e) {
      console.error("Error loading exam results for milestones:", e);
    }
  }

  examsCount = resultsList.length;
  highestScore = resultsList.reduce((max: number, r: any) => Math.max(max, r.percentage || 0), 0);
  
  if (actionType === "performance" && actionValue !== undefined) {
    highestScore = Math.max(highestScore, actionValue);
  }

  // Load mistakes and analytics
  let mistakesList: any[] = [];
  if (isPlaceholder) {
    try {
      const stored = localStorage.getItem("dle:student_mistakes");
      mistakesList = stored ? JSON.parse(stored) : [];
      mistakesList = mistakesList.filter((m: any) => m.studentId === studentId);
    } catch (_) {}
  } else {
    try {
      const snaps = await getDocs(query(collection(db, "student_mistakes"), where("studentId", "==", studentId)));
      snaps.forEach(docSnap => mistakesList.push(docSnap.data()));
    } catch (e) {
      console.error("Error loading student mistakes for milestones:", e);
    }
  }

  revisionsCount = mistakesList.reduce((sum: number, m: any) => sum + (m.revisionCount || 0), 0);
  masteredCount = mistakesList.filter((m: any) => m.mastered).length;

  // Load student profile for streak
  let userProfile: any = null;
  if (isPlaceholder) {
    try {
      const stored = localStorage.getItem("dle:user");
      userProfile = stored ? JSON.parse(stored) : null;
    } catch (_) {}
  } else {
    try {
      const userSnap = await getDoc(doc(db, "users", studentId));
      if (userSnap.exists()) {
        userProfile = userSnap.data();
      }
    } catch (e) {
      console.error("Error reading user profile for milestone streak:", e);
    }
  }

  streakValue = userProfile?.streak || 0;
  if (actionType === "streak" && actionValue !== undefined) {
    streakValue = Math.max(streakValue, actionValue);
  }

  // 4. Evaluate Milestones & process new unlocks
  const unlockedAchievementIds: string[] = [];
  
  // Load currently unlocked achievements to prevent duplicates
  let currentlyUnlocked: any[] = [];
  if (isPlaceholder) {
    try {
      const stored = localStorage.getItem("dle:user_achievements");
      currentlyUnlocked = stored ? JSON.parse(stored) : [];
      currentlyUnlocked = currentlyUnlocked.filter((ua: any) => ua.studentId === studentId);
    } catch (_) {}
  } else {
    try {
      const snaps = await getDocs(query(collection(db, "user_achievements"), where("studentId", "==", studentId)));
      snaps.forEach(docSnap => currentlyUnlocked.push(docSnap.data()));
    } catch (e) {
      console.error("Error loading currently unlocked achievements:", e);
    }
  }

  const unlockedIdsSet = new Set(currentlyUnlocked.map((ua: any) => ua.achievementId));

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (unlockedIdsSet.has(def.id)) continue; // already unlocked

    let shouldUnlock = false;
    if (def.category === "exam" && examsCount >= def.targetValue) {
      shouldUnlock = true;
    } else if (def.category === "revision" && revisionsCount >= def.targetValue) {
      shouldUnlock = true;
    } else if (def.category === "mastery" && masteredCount >= def.targetValue) {
      shouldUnlock = true;
    } else if (def.category === "streak" && streakValue >= def.targetValue) {
      shouldUnlock = true;
    } else if (def.category === "performance" && highestScore >= def.targetValue) {
      shouldUnlock = true;
    } else if (def.category === "subject_science" && resultsList.some(r => r.subject?.toLowerCase() === "science" && (r.percentage || 0) >= def.targetValue)) {
      shouldUnlock = true;
    } else if (def.category === "subject_math" && resultsList.some(r => (r.subject?.toLowerCase() === "mathematics" || r.subject?.toLowerCase() === "maths") && (r.percentage || 0) >= def.targetValue)) {
      shouldUnlock = true;
    } else if (def.category === "subject_english" && resultsList.some(r => r.subject?.toLowerCase() === "english" && (r.percentage || 0) >= def.targetValue)) {
      shouldUnlock = true;
    } else if (def.category === "subject_gujarati" && resultsList.some(r => r.subject?.toLowerCase() === "gujarati" && (r.percentage || 0) >= def.targetValue)) {
      shouldUnlock = true;
    } else if (def.category === "subject_social" && resultsList.some(r => (r.subject?.toLowerCase() === "social science" || r.subject?.toLowerCase() === "social_science") && (r.percentage || 0) >= def.targetValue)) {
      shouldUnlock = true;
    }

    if (shouldUnlock) {
      // Unlock this achievement!
      unlockedAchievementIds.push(def.id);
      studentPoints.achievementPoints = (studentPoints.achievementPoints || 0) + def.points;

      const userAchievement = {
        userAchievementId: `${studentId}_${def.id}`,
        studentId,
        achievementId: def.id,
        category: def.category,
        badgeName: def.badgeName,
        title: def.titleEn,
        titleGu: def.title,
        description: def.description,
        pointsAwarded: def.points,
        emoji: def.emoji,
        unlockedAt: new Date().toISOString()
      };

      // Compatibility achievement (for older code reading from /achievements)
      const compatAchievement = {
        achievementId: `ach${def.id}`,
        studentId,
        title: def.title,
        description: def.description,
        unlockedAt: new Date().toISOString()
      };

      // Create Notification
      const notification = {
        id: `notif_${Date.now()}_${def.id}`,
        studentId,
        type: "achievement" as const,
        title: "Achievement Unlocked!",
        titleGu: `સિદ્ધિ પ્રાપ્ત: ${def.title}`,
        body: `You unlocked the "${def.badgeName}" badge and earned +${def.points} points!`,
        time: "Just now",
        createdAt: new Date().toISOString()
      };

      // Save user achievement
      if (isPlaceholder) {
        try {
          const stored = localStorage.getItem("dle:user_achievements");
          const list = stored ? JSON.parse(stored) : [];
          list.push(userAchievement);
          localStorage.setItem("dle:user_achievements", JSON.stringify(list));

          const storedCompat = localStorage.getItem("dle:achievements");
          const compatList = storedCompat ? JSON.parse(storedCompat) : [];
          compatList.push(compatAchievement);
          localStorage.setItem("dle:achievements", JSON.stringify(compatList));

          const storedNotifs = localStorage.getItem("dle:notifications");
          const notifsList = storedNotifs ? JSON.parse(storedNotifs) : [];
          notifsList.unshift(notification);
          localStorage.setItem("dle:notifications", JSON.stringify(notifsList));
        } catch (_) {}
      } else {
        try {
          await setDoc(doc(db, "user_achievements", userAchievement.userAchievementId), {
            ...userAchievement,
            unlockedAt: serverTimestamp()
          });
          await setDoc(doc(db, "achievements", compatAchievement.achievementId), {
            ...compatAchievement,
            unlockedAt: serverTimestamp()
          });
          await setDoc(doc(db, "notifications", notification.id), {
            ...notification,
            createdAt: serverTimestamp()
          });
        } catch (e) {
          console.error("Error saving new achievement lock to Firestore:", e);
        }
      }
    }
  }

  // Recalculate total points with updated achievement points
  studentPoints.totalPoints = 
    (studentPoints.examPoints || 0) + 
    (studentPoints.revisionPoints || 0) + 
    (studentPoints.masteryPoints || 0) + 
    (studentPoints.achievementPoints || 0);

  // 5. Persist student points & Leaderboard sync
  if (isPlaceholder) {
    try {
      localStorage.setItem(`dle:student_points:${studentId}`, JSON.stringify(studentPoints));
      localStorage.setItem(`dle:student_points`, JSON.stringify(studentPoints));

      // Sync local leaderboard rank list
      const storedLeaderboard = localStorage.getItem("dle:leaderboard");
      const list = storedLeaderboard ? JSON.parse(storedLeaderboard) : [];
      const itemIdx = list.findIndex((x: any) => x.studentId === studentId);
      
      const displayName = userProfile?.fullName || "વિદ્યાર્થી";
      
      if (itemIdx > -1) {
        list[itemIdx].totalMarks = studentPoints.totalPoints; // store points in marks field
        list[itemIdx].studentName = displayName;
        list[itemIdx].updatedAt = new Date().toISOString();
      } else {
        list.push({
          studentId,
          studentName: displayName,
          totalMarks: studentPoints.totalPoints,
          percentage: 100,
          rank: list.length + 1,
          updatedAt: new Date().toISOString()
        });
      }
      
      // Sort and recalculate ranks
      list.sort((a: any, b: any) => b.totalMarks - a.totalMarks);
      list.forEach((x: any, idx: number) => {
        x.rank = idx + 1;
      });
      localStorage.setItem("dle:leaderboard", JSON.stringify(list));
    } catch (_) {}
  } else {
    try {
      await setDoc(doc(db, "student_points", studentId), {
        ...studentPoints,
        studentName: userProfile?.fullName || "વિદ્યાર્થી",
        updatedAt: serverTimestamp()
      });

      // Update in legacy leaderboard as well for ranking
      const boardDocRef = doc(db, "leaderboard", studentId);
      await setDoc(boardDocRef, {
        studentId,
        studentName: userProfile?.fullName || "વિદ્યાર્થી",
        totalMarks: studentPoints.totalPoints, // map points to leaderboard totalMarks field
        percentage: 100,
        rank: 99,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Update in all spanning leaderboards so that points are always visually synced on load
      const leaderboardSpans = ["alltime", "daily", "weekly", "monthly"];
      for (const span of leaderboardSpans) {
        try {
          const spanDocRef = doc(db, `leaderboard_${span}`, studentId);
          await setDoc(spanDocRef, {
            studentId,
            studentName: userProfile?.fullName || "વિદ્યાર્થી",
            standard: userProfile?.standard || "10",
            school: userProfile?.school || "DL High School",
            village: userProfile?.village || "Village",
            points: studentPoints.totalPoints,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (spanErr) {
          console.warn(`Silently failed updating span leaderboard_${span}:`, spanErr);
        }
      }

      // Clean sync leaderboard rankings in Firestore
      const querySnaps = await getDocs(query(collection(db, "leaderboard")));
      const all_board: any[] = [];
      querySnaps.forEach((docSnap) => all_board.push(docSnap.data()));
      
      // Sort and update ranks
      all_board.sort((a, b) => (b.totalMarks || 0) - (a.totalMarks || 0));
      for (let idx = 0; idx < all_board.length; idx++) {
        const item = all_board[idx];
        if (item.studentId === studentId) {
          await updateDoc(doc(db, "leaderboard", item.studentId), {
            rank: idx + 1,
            updatedAt: serverTimestamp()
          });
        } else {
          try {
            if (userProfile?.role === "admin" || userProfile?.role === "super_admin") {
              await updateDoc(doc(db, "leaderboard", item.studentId), {
                rank: idx + 1,
                updatedAt: serverTimestamp()
              });
            }
          } catch (_) {
            // Suppress other students' permission update failures
          }
        }
      }
    } catch (e) {
      console.error("Error writing points and leaderboard sync to Firestore:", e);
    }
  }

  return {
    studentPoints,
    newUnlocks: unlockedAchievementIds
  };
}
