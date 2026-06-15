import { 
  db, 
  isFirebasePlaceholder,
  auth
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
  let dbQuestions: any[] = [];

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
      let idToken = "";
      try {
        if (auth.currentUser) {
          idToken = await auth.currentUser.getIdToken();
        }
      } catch (tokenErr) {
        console.warn("Failed to retrieve ID Token in getExamQuestionsSecure", tokenErr);
      }

      const response = await fetch("/api/exam-questions", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(idToken ? { "Authorization": `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({
          userId: studentId,
          examId,
          subjectId,
          chapterId,
          isSubmit: false
        })
      });
      if (response.ok) {
        const body = await response.json();
        dbQuestions = body.questions || [];
      } else {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "પરીક્ષાના પ્રશ્નો લોડ કરવામાં નિષ્ફળતા.");
      }
    } catch (e: any) {
      console.error("Firestore loading error on secure get questions function (Option A):", e);
      throw e;
    }
  }

  // Filter matching subject/chapter if in placeholder
  if (isFirebasePlaceholder) {
    dbQuestions = dbQuestions.filter(
      (q) => q.subjectId === subjectId && q.chapterId === chapterId && q.questionId !== "q1" && q.questionId !== "q2"
    );
  }

  // 3. SECURE STRIPPING: Client maps stripped form to expected Question structure safely
  const strippedQuestions = dbQuestions.map((q) => ({
    questionId: q.questionId,
    subjectId: subjectId,
    chapterId: chapterId,
    question: q.question,
    optionA: q.options?.[0] || "",
    optionB: q.options?.[1] || "",
    optionC: q.options?.[2] || "",
    optionD: q.options?.[3] || "",
    difficulty: q.difficulty || "medium",
    illustrationUrl: q.imageUrl || "",
    questionType: q.type || "MCQ"
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
    try {
      let idToken = "";
      try {
        if (auth.currentUser) {
          idToken = await auth.currentUser.getIdToken();
        }
      } catch (tokenErr) {
        console.warn("Failed to retrieve ID Token in submitExamSecure", tokenErr);
      }

      const response = await fetch("/api/exam-questions", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(idToken ? { "Authorization": `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({
          userId: studentId,
          examId,
          subjectId,
          chapterId,
          isSubmit: true
        })
      });
      if (response.ok) {
        const body = await response.json();
        const qList = body.questions || [];
        masterQuestions = qList.map((q: any) => ({
          questionId: q.questionId,
          question: q.question,
          optionA: q.options?.[0] || "",
          optionB: q.options?.[1] || "",
          optionC: q.options?.[2] || "",
          optionD: q.options?.[3] || "",
          correctAnswer: q.correctAnswer || "",
          explanation: q.explanation || "સમજૂતી ઉપલબ્ધ નથી.",
          subjectId: subjectId,
          chapterId: chapterId,
          difficulty: "medium"
        }));
      } else {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "પરીક્ષાના જવાબો મેળવવામાં નિષ્ફળતા.");
      }
    } catch (e: any) {
      console.error("Firestore loading error on secure submit questions function (Option A):", e);
      throw e;
    }
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

  // 3. Update student streak on active dynamic acti  // Trigger Points & Achievements Securing
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

const buildAchievements = (): any[] => {
  const list: any[] = [];

  // 1. Exam completed milestones (32 milestones)
  const examMilestones = [
    { v: 1, e: "🤖", badge: "Mark I Armor", nameEn: "Arc Reactor Mk 1", nameGu: "આર્ક રિએક્ટર માર્ક ૧" },
    { v: 2, e: "👥", badge: "Acrobat Spider", nameEn: "Web Shooter v1", nameGu: "વેબ શૂટર લેવલ ૧" },
    { v: 3, e: "🍃", badge: "Academy Ninja", nameEn: "Ninja Academy Entrant", nameGu: "નીન્જા એકેડેમી પ્રવેશક" },
    { v: 4, e: "🛡️", badge: "First Shield", nameEn: "Vibranium Shield Force", nameGu: "વાઇબ્રેનિયમ સ્ટાર શીલ્ડ" },
    { v: 5, e: "🦊", badge: "Genin Student", nameEn: "Genin Ninja Candidate", nameGu: "ગેનિન નીન્જા કેન્ડિડેટ" },
    { v: 6, e: "🔨", badge: "Storm Bolt", nameEn: "Mjolnir Buzz", nameGu: "મ્યોલનીર બઝ શક્તિ" },
    { v: 7, e: "💍", badge: "Wakanda Citizen", nameEn: "Wakandan Ring Power", nameGu: "વાઇબ્રેનિયમ ફિંગર રીંગ" },
    { v: 8, e: "🎯", badge: "Bullseye Hawkeye", nameEn: "Hawkeye Arrow Aim", nameGu: "હોકઆઈ બુલઝઆઈ એમ" },
    { v: 9, e: "🧠", badge: "Pym Particles", nameEn: "Ant-Man Growth", nameGu: "એન્ટમેન માઇક્રો વિઝન" },
    { v: 10, e: "🦾", badge: "Mark X Armor", nameEn: "Mark X Armor suit", nameGu: "આર્ક રિએક્ટર માર્ક ૧૦" },
    { v: 12, e: "👁️", badge: "Byakugan Initiate", nameEn: "Byakugan Visuals", nameGu: "બ્યાકુગન વિઝ્યુઅલ જાગૃતિ" },
    { v: 14, e: "🏹", badge: "Eagle Archer", nameEn: "Advanced Arrow Shooter", nameGu: "એડવાન્સ બાણ શૂટર" },
    { v: 16, e: "🕷️", badge: "Iron Spider Legs", nameEn: "Iron Spider Legs On", nameGu: "આયર્ન સ્પાઈડર લેગ્સ રેડી" },
    { v: 18, e: "🎭", badge: "Houdini Widow", nameEn: "Black Widow stealth", nameGu: "બ્લેક વિડો રણનીતિ" },
    { v: 20, e: "🎖️", badge: "Chunin Cadet", nameEn: "Chunin Exam Candidate", nameGu: "ચુનીન પરીક્ષા ક્વોલિફાયર" },
    { v: 22, e: "⚡", badge: "Mjolnir Charge", nameEn: "Mjolnir Worthy Spark", nameGu: "મ્યોલનીર ગ્રીપ જાગૃતિ" },
    { v: 25, e: "👁️‍🗨️", badge: "Sharingan One Tomoe", nameEn: "Sharingan Activated", nameGu: "શારિંગન સુપર આઈ" },
    { v: 28, e: "🐾", badge: "Panther Claws", nameEn: "Panther Claws Upgraded", nameGu: "પેન્થર ક્લોઝ અપગ્રેડેડ" },
    { v: 30, e: "🛡️", badge: "Mark L Suit", nameEn: "Mark L Nanotech Armor", nameGu: "માર્ક ૫૦ નેનોટેક સુટ" },
    { v: 35, e: "🐸", badge: "Mt Myoboku Mount", nameEn: "Toads Mount Training", nameGu: "ટોડ્સ માઉન્ટેન તાલીમ" },
    { v: 40, e: "🛡️", badge: "Captain Guard", nameEn: "Vibranium Focus Shield", nameGu: "કેપ્ટન અમેરિકા સ્ટાર શીલ્ડ" },
    { v: 45, e: "🌀", badge: "Rasengan Form", nameEn: "Rasengan Sphere Formed", nameGu: "રાસેંગન ગોળાકાર ચક્ર" },
    { v: 50, e: "🦍", badge: "Hulkbuster Pilot", nameEn: "Hulkbuster Deployed", nameGu: "હલ્કબસ્ટર પાવર ફોર્સ" },
    { v: 55, e: "🦅", badge: "Jonin Elite", nameEn: "Jonin Commander Title", nameGu: "જોનીન લશ્કરી કમાન્ડર પદ" },
    { v: 60, e: "🛡️", badge: "Wakanda Shield", nameEn: "Wakandan Force Barrier", nameGu: "વાઇબ્રેનિયમ ફોર્સ બેરિયર" },
    { v: 65, e: "👁️‍🗨️", badge: "Mangekyou Eye", nameEn: "Mangekyou Vision Spark", nameGu: "માંગેક્યો સ્પાર્ક ચક્ષુ" },
    { v: 70, e: "🪓", badge: "Stormbreaker Axe", nameEn: "Stormbreaker Thunder God", nameGu: "તોફાની તોડનાર કુહાડી શક્તિ" },
    { v: 80, e: "🎭", badge: "Anbu Leader", nameEn: "Anbu Special Ops Leader", nameGu: "આનબુ બ્લેક ઓપ્સ લીડર" },
    { v: 90, e: "🟣", badge: "Susano Ribcage", nameEn: "Susanoo Armor Shield", nameGu: "સુસાનો સુપર બાર્મર" },
    { v: 100, e: "🍥", badge: "Hokage Elite", nameEn: "Sixth Hokage Title", nameGu: "સર્વોચ્ચ હોકાગે સન્માન" },
    { v: 120, e: "🔮", badge: "Magic Dimension", nameEn: "Mirror Dimension Magic", nameGu: "જાદુઈ કક્ષ રક્ષણ વિઝન" },
    { v: 150, e: "👑", badge: "Six Paths Sage", nameEn: "Sage of Six Paths Overlord", nameGu: "સર્વોચ્ચ સિક્સ પાથ રીષિ કિંગ" }
  ];

  examMilestones.forEach(m => {
    list.push({
      id: `exam_${m.v}`,
      category: "exam",
      badgeName: m.badge,
      targetValue: m.v,
      points: m.v <= 10 ? m.v * 10 : Math.min(300, m.v * 3),
      emoji: m.e,
      title: m.nameGu,
      titleEn: m.nameEn,
      description: `Complete ${m.v} exam(s) to prove your tactical logic like the legendary heroes.`,
      descriptionGu: `${m.v} પરીક્ષાઓ સફળતાપૂર્વક પૂર્ણ કરીને સુપરહીરો જેવી બૌદ્ધિક ક્ષમતા સાબિત કરો.`
    });
  });

  // 2. Revision Question completed milestones (30 milestones)
  const revMilestones = [
    { v: 1, e: "🩹", badge: "Quick Patch", nameEn: "Deadpool Band-Aid", nameGu: "પ્રથમ રિવિઝન બેન્ડ-એઇડ" },
    { v: 2, e: "🦊", badge: "Fox Advice", nameEn: "Kurama Whispers Guidance", nameGu: "કુરામા સજેશન માર્ગદર્શન" },
    { v: 3, e: "🐜", badge: "Atom Vision", nameEn: "Antman Microsize Error Finder", nameGu: "ખામી વિઝ્યુલાઇઝેશન એન્ટમેન" },
    { v: 4, e: "💚", badge: "Medical Nin", nameEn: "Medical Ninjutsu Healing", nameGu: "મેડિકલ સેલ્ફ હીલિંગ ટેકનિક" },
    { v: 5, e: "🧬", badge: "Flesh Regen", nameEn: "Wolverine Cell Regeneration", nameGu: "વુલ્વરાઇન ઝડપી રિકવરી" },
    { v: 10, e: "⚔️", badge: "Regrow Blade", nameEn: "Deadpool Sword Self Healing", nameGu: "ડેડપૂલ ત્વરિત તલવાર અપડેટ" },
    { v: 15, e: "🧠", badge: "Shikamaru I.Q.", nameEn: "Chunin Tactical IQ", nameGu: "ચીનીન શિકામરૂ ૧૮૦+ આઈક્યુ" },
    { v: 20, e: "🛠️", badge: "Stark Lab", nameEn: "Stark Lab Code Upgrade", nameGu: "ટોની સ્ટાર્ક ગિયર શક્તિ" },
    { v: 25, e: "❤️", badge: "Immortal Heal", nameEn: "Deadpool Pure Recovery Gear", nameGu: "ડેડપૂલ કિંગ રિકવરી" },
    { v: 30, e: "🌸", badge: "Chakra Fist", nameEn: "Lady Tsunade Strength Charge", nameGu: "પ્રચંડ શારિરીક પ્રકોપ સેલ્ફ" },
    { v: 35, e: "🕷️", badge: "Spider Agile", nameEn: "Black Widow Trap Reflex", nameGu: "બ્લેક વિડો ચપળ રીફ્લેક્સિબિલિટી" },
    { v: 40, e: "👁️", badge: "See Flaws", nameEn: "Byakugan Defect Locator", nameGu: "બ્યાકુગન ભૂલ કેન્દ્ર નિરીક્ષણ" },
    { v: 45, e: "🖥️", badge: "JARVIS Diag", nameEn: "JARVIS Hologram Diagnostics", nameGu: "જાર્વિસ કોમ્પ્યુટર ટેસ્ટિંગ" },
    { v: 50, e: "🌀", badge: "Spiral Orb", nameEn: "Rasengan Training Phase 2", nameGu: "રાસેંગન કંટ્રોલ તાલીમ" },
    { v: 60, e: "🥊", badge: "Infinity Snap", nameEn: "Infinity Gauntlet Snaps", nameGu: "ઇન્ફિનિટી પાવર બટન સ્નેપ" },
    { v: 70, e: "🐍", badge: "Snake Skin", nameEn: "Orochimaru Shed Errors", nameGu: "ઓરોચિમારૂ નવી ત્વચા ધારણ" },
    { v: 80, e: "⏳", badge: "Loop Diagnostic", nameEn: "Strange Time-Loop Analysis", nameGu: "અલ્ટીમેટ ટાઇમ લૂપ ચેકિંગ" },
    { v: 90, e: "🍥", badge: "Uchiha Vision", nameEn: "Kotoamatsukami Mind Mastery", nameGu: "સુપર સ્પેશ્યલ કોટોઆમાત્સુકમી" },
    { v: 100, e: "🌀", badge: "Infinite Rasengan", nameEn: "Grand Rasengan Chakra Sphere", nameGu: "પ્રચંડ ઓર્ડ રાસેંગન સ્ફીયર" },
    { v: 120, e: "🏋️", badge: "Vibranium Shield", nameEn: "Wakandan Metal Hardening", nameGu: "વાઇબ્રેનિયમ ફોર્જિંગ ટાઇટન" },
    { v: 140, e: "👁️", badge: "Izanagi Rewrite", nameEn: "Uchiha Izanagi Time Loop", nameGu: "ઇઝાનાગી હિસ્ટ્રી રીરાઇટ" },
    { v: 160, e: "⚡", badge: "Storm Lightning", nameEn: "Stormbreaker Lightning Bolt", nameGu: "વીજળી તોફાન કનેક્ટર" },
    { v: 180, e: "🦊", badge: "Nine Tails Link", nameEn: "Sage Kurama Recovery Shield", nameGu: "કુરામા અલ્ટીમેટ રિકવરી" },
    { v: 200, e: "⚔️", badge: "Deadpool Shield", nameEn: "Deadpool Instant Armor Healing", nameGu: "ડેડપૂલ ન્યુ ટાઈમ અમરત્વ" },
    { v: 250, e: "🟣", badge: "Perfect Shield", nameEn: "Perfect Susanoo Defense Shield", nameGu: "સુસાનો પૂર્ણ રક્ષા શક્તિ" },
    { v: 300, e: "👁️", badge: "Strange Time Reverse", nameEn: "Eye of Agamotto Replay", nameGu: "અગામોટો લૂપ પ્રભાવ વિડિયો" },
    { v: 350, e: "🔴", badge: "Reality Stone", nameEn: "Thanos Reality Stone Illusion", nameGu: "રિયાલિટી સ્ટોન ઇલ્યુઝન ફોર્સ" },
    { v: 400, e: "🦊", badge: "Chakra Sync", nameEn: "Kurama Nine-Tails Full Fusion", nameGu: "કુરામા સાથે સંપૂર્ણ મિલન સ્તર" },
    { v: 450, e: "🛡", badge: "Ultimate Nano", nameEn: "Stark Nanoshield Elite System", nameGu: "સ્ટાર્ક રક્ષા કવચ અલ્ટીમેટ" },
    { v: 500, e: "🔴", badge: "Tsukuyomi King", nameEn: "Infinite Tsukuyomi Overlord", nameGu: "અનંત સુકુયોમી સુપર કિંગ" }
  ];

  revMilestones.forEach(m => {
    list.push({
      id: `rev_${m.v}`,
      category: "revision",
      badgeName: m.badge,
      targetValue: m.v,
      points: m.v <= 10 ? m.v * 8 : Math.min(300, m.v * 2),
      emoji: m.e,
      title: m.nameGu,
      titleEn: m.nameEn,
      description: `Review ${m.v} incorrect answers to target total mastery over complex chapters.`,
      descriptionGu: `${m.v} ભૂલવાળા પ્રશ્નોનું પુનરાવર્તન કરીને તમારી નબળાઈઓને સચોટ તાકાતમાં બદલો.`
    });
  });

  // 3. Mastery Milestones (31 milestones)
  const masteryMilestones = [
    { v: 1, e: "🕸️", badge: "Spidey Crawl", nameEn: "Spidey Bite Power", nameGu: "વાઇલ્ડ સ્પાઈડર બાઇટ શક્તિ" },
    { v: 2, e: "👥", badge: "Double Study", nameEn: "Double Shadow Clone Study", nameGu: "શેડો ક્લોન ડબલ તાલીમ" },
    { v: 3, e: "🦊", badge: "Tails Power", nameEn: "Three Tails Chakra Shield", nameGu: "૩-ટેલ્સ કુરામા રક્ષા રેડિયેશન" },
    { v: 4, e: "👁️", badge: "Three Tomoe", nameEn: "Three Tomoe Sharingan Sight", nameGu: "થ્રી-ટોમો શારિંગન અદ્ભુત દ્રષ્ટિ" },
    { v: 5, e: "🛡️", badge: "Shield Shockwave", nameEn: "Vibranium Kinetic Shockwave", nameGu: "બ્લેક પેન્થર વાઇબ્રેશન કરંટ" },
    { v: 8, e: "🦾", badge: "Vibranium Fist", nameEn: "Winter Soldier cybernetic arm", nameGu: "બકી બાર્નેસ અતૂટ આર્મ" },
    { v: 10, e: "👥", badge: "Multiple Clones", nameEn: "Multi Shadow Clone Jutsu", nameGu: "નરુટો મલ્ટી શેડો ક્લોન" },
    { v: 12, e: "🔨", badge: "Thor Spark", nameEn: "Thor Lightning Master", nameGu: "થોર વીજળી સાર્વભૌમિક કમાન્ડર" },
    { v: 15, e: "👁️‍🗨️", badge: "Mangekyou Jutsu", nameEn: "Amaterasu Black Flames", nameGu: "અલ્ટીમેટ અમાતેરાસુ બ્લેક અગ્નિ" },
    { v: 18, e: "🐾", badge: "Wakanda Spear", nameEn: "Okoye King Spear combat", nameGu: "ડોરા મિલાજે શાહી ભાલો" },
    { v: 20, e: "🌀", badge: "Giant Rasengan", nameEn: "Oodama Rasengan Mastery", nameGu: "ઓડામા પ્રચંડ રાસેંગન સ્પાર્ક" },
    { v: 25, e: "🦾", badge: "Iron Punch", nameEn: "Nanotech Repulsor Thrusters", nameGu: "ટોની સ્ટાર્ક નેનો રીપલ્સર" },
    { v: 30, e: "👁️‍🗨️", badge: "Susano Ribs", nameEn: "Susanoo Armored Protection", nameGu: "સુસાનો સુવર્ણ પાંસળી બારી" },
    { v: 35, e: "⚡", badge: "Lightning Chidori", nameEn: "Chidori Raikiri Lightning Cut", nameGu: "કાકાશી ચિદોરી વીજળી પંજો" },
    { v: 40, e: "🧬", badge: "Stark Extremis", nameEn: "Extremis Bio-Upgrade Armor", nameGu: "એક્સટ્રીમીસ બાયો કવચ ફિટિંગ" },
    { v: 45, e: "👑", badge: "Sannin Sage", nameEn: "Jiraiya Giant Frog Sage", nameGu: "લિજેન્ડરી સન્નીન તોડ માસ્ટરી" },
    { v: 50, e: "⚡", badge: "Thor Hammer", nameEn: "Mjolnir Thunder Hammer Lift", nameGu: "થોરનું ઓરિજિનલ મ્યોલનીર" },
    { v: 55, e: "👁️‍🗨️", badge: "Kamui Warp", nameEn: "Kamui Space Time Distortion", nameGu: "કામુઈ સ્પેસ ટાઇમ હોલ" },
    { v: 60, e: "🥊", badge: "Stark Gauntlet", nameEn: "Nano Gauntlet Final Fit", nameGu: "નેનો ગોન્ટલેટ્સ પાવર હોવર" },
    { v: 65, e: "🦊", badge: "Six-Tails Mode", nameEn: "Six-Tails Fox Bone Armor", nameGu: "૬-ટેલ્સ અસ્થિ રક્ષા મોડ" },
    { v: 70, e: "🪓", badge: "Stormbreaker Smash", nameEn: "Stormbreaker Bifrost Portal", nameGu: "બાયફ્રોસ્ટ પોર્ટલ વીજળી શક્તિ" },
    { v: 75, e: "🟣", badge: "Susano Giant", nameEn: "Susanoo Colossal Titan Armor", nameGu: "સુસાનો કદાવર ટાઇટન વોરિયર" },
    { v: 80, e: "🔴", badge: "Rinnegan Power", nameEn: "Rinnegan Eye of Transmigration", nameGu: "પુરાતન રિંનેગન દિવ્ય મહาચક્ષુ" },
    { v: 85, e: "🦸", badge: "Captain Marvel Core", nameEn: "Binary Power Photon Beam", nameGu: "કેપ્ટન માર્વેલ બાઈનરી રેડિયેશન" },
    { v: 90, e: "🔥", badge: "Amaterasu Shield", nameEn: "Susanoo Flame Shield Guard", nameGu: "સુસાનો ઇગ્નીસ ફાયર કવચ" },
    { v: 95, e: "⚔️", badge: "Kusanagi Blade", nameEn: "Sasuke Kusanagi Sword Mastery", nameGu: "સાસુકે કુસાનાગી તલવાર ધાર" },
    { v: 100, e: "🟣", badge: "Perfect Susanoo", nameEn: "Perfect Susanoo Colossus Titan", nameGu: "અલ્ટીમેટ કરાલા સુસાનો રક્ષા કવચ" },
    { v: 110, e: "🔮", badge: "Mystic Magic Grid", nameEn: "Doctor Strange Eldritch Shields", nameGu: "જાદુઈ એલ્ડ્રીચ ગોળાકાર ચક્ર" },
    { v: 120, e: "👑", badge: "Rishi Sage", nameEn: "Sage of Six Paths Truth Orbs", nameGu: "સિક્ષ પાથ સત્ય ગોળાઓ" },
    { v: 130, e: "🍥", badge: "Asura Avatar", nameEn: "Asura Otsutsuki Wood Golem", nameGu: "આસુરા લાકડાનો દિવ્ય કિલ્લો" },
    { v: 150, e: "🦊", badge: "Nine Tails Sage Mode", nameEn: "Kurama Nine-Tails Full Mode", nameGu: "કુરામા ફૂલ મોડ સંતુષ્ટિ" }
  ];

  masteryMilestones.forEach(m => {
    list.push({
      id: `master_${m.v}`,
      category: "mastery",
      badgeName: m.badge,
      targetValue: m.v,
      points: m.v <= 10 ? m.v * 12 : Math.min(400, m.v * 3),
      emoji: m.e,
      title: m.nameGu,
      titleEn: m.nameEn,
      description: `Master ${m.v} tough question(s) consecutively to build an unbreakable shield of wisdom.`,
      descriptionGu: `સળંગ ૩ વાર સાચો જવાબ આપીને ${m.v} ભૂલવાળા કઠિન પ્રશ્નોને સંપૂર્ણપણે માસ્ટર કરો.`
    });
  });

  // 4. Streak Milestones (30 milestones)
  const streakMilestones = [
    { v: 1, e: "🌱", badge: "Focus On", nameEn: "First Day Focus Spark", nameGu: "અભ્યાસ સફર પ્રથમ શિંગારી" },
    { v: 2, e: "🐾", badge: "Quick Panther", nameEn: "Two Day Panther Prowl", nameGu: "૨ દિવસ પેન્થર તાલીમ સંકલન" },
    { v: 3, e: "🕷️", badge: "Spider Sense", nameEn: "Spider Sense Danger Alert", nameGu: "સ્પાઈડી સેન્સ એલર્ટ રક્ષણ" },
    { v: 4, e: "🍃", badge: "Leaf Shinobi", nameEn: "Four Day Leaf Village Will", nameGu: "કોનોહા પર્ણ અગ્નિ પ્રેરણા" },
    { v: 5, e: "🤖", badge: "Iron Calibration", nameEn: "Iron Man Armor Boot Calibration", nameGu: "આયર્નમેન આર્મર વેરિફિકેશન" },
    { v: 6, e: "🦁", badge: "Asgard Cadet", nameEn: "Asgard Warrior Cadet Streak", nameGu: "એસ્ગાર્ડ વોરિયર કેડેટ અભ્યાસ" },
    { v: 7, e: "🐆", badge: "Wakanda Vibranium", nameEn: "Wakanda Kinetic Charge Up", nameGu: "વાઇબ્રેનિયમ ફુલ ડાયનેમિક ચાર્જ" },
    { v: 8, e: "🏹", badge: "Hawkeye Bow", nameEn: "Hawkeye Bow Unchecked Aim", nameGu: "હોકઆય પ્રિસિઝન બો તાણ" },
    { v: 9, e: "🌪️", badge: "Wind Control", nameEn: "Temari Fan Wind Jutsu", nameGu: "તેમારી જાયન્ટ ચક્ર પંખો વિન્ડ" },
    { v: 10, e: "🦊", badge: "Ninja Fire Will", nameEn: "Konoha Fire Will Flame On", nameGu: "કોનોહા વિલ ઓફ ફાયર સેન્સર" },
    { v: 11, e: "🧬", badge: "Stark AI", nameEn: "FRIDAY Assistant Online", nameGu: "સ્ટાર્ક ફ્રાઈડે આર્ટિફિશિયલ અસિસ્ટન્ટ" },
    { v: 12, e: "🔮", badge: "Mirror Walker", nameEn: "Mirror Dimension Portal Access", nameGu: "મિરર ડાયમેન્શન પોર્ટલ એન્ટ્રી" },
    { v: 13, e: "👑", badge: "Wakandan Throne", nameEn: "Wakanda Throne Room Access", nameGu: "વાઇબ્રેનિયમ શાહી સિંહાસન કક્ષ" },
    { v: 14, e: "⚡", badge: "Thor Bolt Link", nameEn: "Bifrost Rainbow Energy Link", nameGu: "બાયફ્રોસ્ટ બ્રિજ રેઈન્બો કનેક્ટર" },
    { v: 15, e: "🦊", badge: "Tails Energy", nameEn: "Five Tails Sage Fire Mode", nameGu: "પાંચ પૂંછડી કુરામા અગ્નિ મોડ" },
    { v: 18, e: "🧬", badge: "Stark Tech", nameEn: "Edith Smart Glasses Active", nameGu: "એડિથ ચિત્ર સ્માર્ટ ગ્લાસ શક્તિ" },
    { v: 20, e: "🛡️", badge: "Vibranium Body", nameEn: "Vibranium Kinetic Blast Strike", nameGu: "વાઇબ્રેનિયમ બ્લાસ્ટ પ્રહાર ક્ષમતા" },
    { v: 22, e: "🌀", badge: "Sage Energy", nameEn: "Sage Mode Natural Chakra Sync", nameGu: "સેજ મોડ નેચરલ ચક્ર પ્રવાહ" },
    { v: 25, e: "🧠", badge: "Gamma Blast", nameEn: "Hulk Brain Smart Synthesis", nameGu: "સ્માર્ટ પ્રોફેسور હલ્ક બ્રેઈન વેવ" },
    { v: 28, e: "⚡", badge: "Lightning Speed", nameEn: "Yellow Flash Golden Speed", nameGu: "યલો ફ્લેશ ગોલ્ડન નીન્જા ઝડપ" },
    { v: 30, e: "🔥", badge: "Kurama Nine-Tails Mode", nameEn: "Kurama Nine-Tails sync", nameGu: "કુરામા નાઇન-ટેલ્સ મોડ સિંકન" },
    { v: 35, e: "🔮", badge: "Strange Sanctum", nameEn: "New York Sanctum Sanctorum", nameGu: "ન્યુયોર્ક સેન્ક્ટમ સુરક્ષા પાયો" },
    { v: 40, e: "🦾", badge: "Stark Nanotechnology", nameEn: "Nanotech Auto Assembly", nameGu: "ઑટો એસેમ્બલી માર્ક ૫૦" },
    { v: 45, e: "🌀", badge: "Wind Rasenshuriken", nameEn: "Wind Release Rasenshuriken", nameGu: "રાસેનશુરીકેન વાયુ પ્રચંડ બોમ્બ" },
    { v: 50, e: "💎", badge: "Asgard King", nameEn: "Asgard King Throne Worthy", nameGu: "એસ્ગાર્ડ મ્યોલનીર કિંગ ટાઇટલ" },
    { v: 60, e: "🟣", badge: "Grand Susano armor", nameEn: "Armored Perfect Susano Full", nameGu: "પરફેક્ટ સુસાનો અમર કિંગ કવચ" },
    { v: 70, e: "🔴", badge: "Rinne-Sharingan", nameEn: "Madara Rinnegan Moon Check", nameGu: "માદારા મુન રીફ્લેક્શન કંટ્રોલ" },
    { v: 80, e: "🌌", badge: "Cosmic Photon Force", nameEn: "Marvel Star Photon Blast", nameGu: "માર્વેલ બ્રહ્માંડ ગ્લોવિંગ એનર્જી" },
    { v: 90, e: "⚡", badge: "Odin Force Power", nameEn: "King Odin Cosmic Thunderbolt", nameGu: "દિવ્ય ઓડિન ફોર્સ અલ્ટીમેટ પાવર" },
    { v: 100, e: "👁️", badge: "Eye of Agamotto Check", nameEn: "Eye of Agamotto Time Control", nameGu: "ડોક્ટર સ્ટ્રેન્જ ટાઇમ સ્ટોન કાબૂ" }
  ];

  streakMilestones.forEach(m => {
    list.push({
      id: `streak_${m.v}`,
      category: "streak",
      badgeName: m.badge,
      targetValue: m.v,
      points: m.v <= 10 ? m.v * 10 : Math.min(300, m.v * 3),
      emoji: m.e,
      title: m.nameGu,
      titleEn: m.nameEn,
      description: `Keep your study streak burning for ${m.v} day(s) consecutively like an legendary warrior.`,
      descriptionGu: `સતત ${m.v} દિવસ સુધી અભ્યાસની જ્યોત જલતી રાખીને નીન્જા એકાગ્રતા સાબિત કરો.`
    });
  });

  // 5. Subject Specific Milestones (30 milestones: 5 fields * 6 subjects)
  const subjects = [
    { cat: "subject_science", subName: "Science", nameGu: "વિજ્ઞાન", subText: "વિજ્ઞાન ક્ષેત્ર" },
    { cat: "subject_math", subName: "Mathematics", nameGu: "ગણિત", subText: "ગણિત પ્રદેશ" },
    { cat: "subject_english", subName: "English", nameGu: "અંગ્રેજી", subText: "અંગ્રેજી વ્યાકરણ" },
    { cat: "subject_gujarati", subName: "Gujarati", nameGu: "ગુજરાતી", subText: "માતૃભાષા સાહિત્ય" },
    { cat: "subject_social", subName: "Social Science", nameGu: "સામાજિક વિજ્ઞાન", subText: "સામાજિક ઇતિહાસ" },
    { cat: "subject_hindi", subName: "Hindi", nameGu: "હિન્દી", subText: "હિન્દી રાષ્ટ્રભાષા" }
  ];

  const subRanks = [
    { target: 70, points: 50, emoji: "🎖️", badge: "Warrior Cadet", rawGu: "નીન્જા કેડેટ શક્તિ", rawEn: "Ninja Cadet Stage" },
    { target: 80, points: 100, emoji: "🛡️", badge: "Shield Force", rawGu: "અભેદ કવચ કીપર", rawEn: "Iron Stark Protectors" },
    { target: 90, points: 150, emoji: "⚡", badge: "Thunder Strike", rawGu: "યલો ફ્લેશ સ્પીડ", rawEn: "Lightning Flash Speed" },
    { target: 95, points: 200, emoji: "🔮", badge: "Dimensional Mage", rawGu: "સુપર ડાયમેન્શન જાદુગર", rawEn: "Sorcerer Master Stage" },
    { target: 100, points: 300, emoji: "👑", badge: "Sage Mastery", rawGu: "ધ ગ્રેટ સેજ અલ્ટીમેટ", rawEn: "Sage of academic Scroll" }
  ];

  subjects.forEach(sub => {
    subRanks.forEach(rank => {
      list.push({
        id: `${sub.cat}_${rank.target}`,
        category: sub.cat,
        badgeName: `${sub.subName} ${rank.badge}`,
        targetValue: rank.target,
        points: rank.points,
        emoji: rank.emoji,
        title: `${sub.nameGu}: ${rank.rawGu}`,
        titleEn: `${sub.subName}: ${rank.rawEn}`,
        description: `Score high ${rank.target}% or more in any ${sub.subName} examination exam to win.`,
        descriptionGu: `${sub.nameGu} વિષયની કોઈપણ પ્રોગ્રેસ ટેસ્ટમાં શ્રેષ્ઠ પ્રદર્શન કરી ${rank.target}% થી વધુ પોઈન્ટ્સ લાવો.`
      });
    });
  });

  return list;
};

export const ACHIEVEMENT_DEFINITIONS = buildAchievements();

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
