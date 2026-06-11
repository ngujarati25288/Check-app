import React, { useState, useEffect } from "react";
import { 
  PlusCircle, Search, Trash2, Edit3, CheckCircle2, XCircle, 
  AlertCircle, Upload, BookOpen, Layers, HelpCircle, Check, 
  Loader2, Eye, Sparkles, Filter, FileText, CheckCircle, RefreshCw, X, ArrowRight, Calendar, Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Question, Subject, Chapter, QuestionDifficulty, UserRole, DailyExam } from "@/types";
import { AdminRepository } from "@/lib/db";
import { toast } from "sonner";

interface QuestionBankManagerProps {
  subjects: Subject[];
  chapters: Chapter[];
  questions: Question[];
  exams?: DailyExam[];
  onRefresh: () => void;
  currentUser: { uid: string; fullName: string; role: UserRole } | null;
  onScheduleSuccess?: () => void;
}

export function QuestionBankManager({
  subjects,
  chapters,
  questions,
  exams = [],
  onRefresh,
  currentUser,
  onScheduleSuccess
}: QuestionBankManagerProps) {
  // State variables for our simplified layout
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStd, setFilterStd] = useState("All");
  
  // CSV Import States
  const [isUploading, setIsUploading] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [activeImportMode, setActiveImportMode] = useState<"file" | "text">("file");
  const [pastedCsvText, setPastedCsvText] = useState("");

  // Active modal controls
  const [activeBundle, setActiveBundle] = useState<any | null>(null);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [showSchedulerModal, setShowSchedulerModal] = useState(false);
  
  // Single Question CRUD forms inside active bundle
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showAddQuestionForm, setShowAddQuestionForm] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newOptA, setNewOptA] = useState("");
  const [newOptB, setNewOptB] = useState("");
  const [newOptC, setNewOptC] = useState("");
  const [newOptD, setNewOptD] = useState("");
  const [newCorrect, setNewCorrect] = useState("A");
  const [newExpl, setNewExpl] = useState("");
  const [newDiff, setNewDiff] = useState<QuestionDifficulty>("medium");

  // Exam Scheduler Form States
  const [scheduledExamName, setScheduledExamName] = useState("");
  const [scheduledLaunchDate, setScheduledLaunchDate] = useState("");
  const [scheduledLaunchTime, setScheduledLaunchTime] = useState("");
  const [scheduledDuration, setScheduledDuration] = useState(30);
  const [questionSelectionMode, setQuestionSelectionMode] = useState<"All" | "Random">("All");
  const [randomCount, setRandomCount] = useState(15);
  const [isScheduling, setIsScheduling] = useState(false);

  // Auto clean standards
  const cleanStandard = (val: string): string => {
    const numMatches = val.match(/\d+/);
    if (numMatches) {
      return numMatches[0];
    }
    return val.trim();
  };

  // Group questions into Bundles automatically of Standard | Subject | Chapter
  const bundlesMap: Record<string, {
    standard: string;
    subjectId: string;
    subjectName: string;
    chapterId: string;
    chapterName: string;
    questionCount: number;
    questions: Question[];
    createdAt: string;
    lastUpdated: string;
  }> = {};

  questions.forEach(q => {
    // Determine standard
    const matchingSubjectObj = subjects.find(s => s.subjectId === q.subjectId);
    const standard = matchingSubjectObj ? matchingSubjectObj.standard : "10";
    const subjectName = matchingSubjectObj ? matchingSubjectObj.subjectName : q.subjectId;
    
    const matchingChapterObj = chapters.find(c => c.chapterId === q.chapterId);
    const chapterName = matchingChapterObj ? matchingChapterObj.chapterName : q.chapterId;

    const bundleKey = `${standard}_${q.subjectId}_${q.chapterId}`;

    if (!bundlesMap[bundleKey]) {
      bundlesMap[bundleKey] = {
        standard,
        subjectId: q.subjectId,
        subjectName,
        chapterId: q.chapterId,
        chapterName,
        questionCount: 0,
        questions: [],
        createdAt: q.createdAt || new Date().toISOString(),
        lastUpdated: q.createdAt || new Date().toISOString()
      };
    }

    bundlesMap[bundleKey].questions.push(q);
    bundlesMap[bundleKey].questionCount += 1;

    // Resolve date bounds nicely
    if (q.createdAt && q.createdAt < bundlesMap[bundleKey].createdAt) {
      bundlesMap[bundleKey].createdAt = q.createdAt;
    }
    if (q.createdAt && q.createdAt > bundlesMap[bundleKey].lastUpdated) {
      bundlesMap[bundleKey].lastUpdated = q.createdAt;
    }
  });

  const bundleList = Object.values(bundlesMap).filter(b => {
    // Exclude bundles that are already scheduled as daily exams
    const isScheduled = (exams || []).some(exam => {
      if (exam.status === "cancelled" || exam.status === "archived") return false;
      const sameStd = (exam.standard || "10") === b.standard;
      const sameSub = exam.subjectId === b.subjectId;
      const containsChap = exam.chapterId === b.chapterId || (exam.chapterIds && exam.chapterIds.includes(b.chapterId));
      return sameStd && sameSub && containsChap;
    });
    if (isScheduled) return false;

    // Filters search & standard selection
    const matchStandard = filterStd === "All" || b.standard === filterStd;
    const matchText = searchQuery === "" || 
      b.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      b.chapterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.standard.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStandard && matchText;
  });

  // Extract unique standards list
  const uniqueStandards = Array.from(new Set(Object.values(bundlesMap).map(b => b.standard))).sort((a,b) => Number(a) - Number(b));

  // CSV Reader & Parser Block
  const mapHeaders = (rawHeaders: string[]) => {
    const norm = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
    const map: Record<string, string> = {};
    
    rawHeaders.forEach(h => {
      const nh = norm(h);
      if (nh.includes("standard") || nh === "std" || h.includes("ધોરણ")) {
        map["standard"] = h;
      } else if (nh.includes("subject") || nh === "sub" || h.includes("વિષય")) {
        map["subject"] = h;
      } else if (nh.includes("chapter") || nh === "chap" || h.includes("પ્રકરણ")) {
        map["chapter"] = h;
      } else if (nh === "question" || nh === "quest" || h.includes("પ્રશ્ન")) {
        map["question"] = h;
      } else if (nh.includes("type") || h.includes("પ્રકાર") || nh === "questiontype") {
        map["questionType"] = h;
      } else if (nh.includes("optiona") || nh === "opta" || h.includes("વિકલ્પ એ")) {
        map["optionA"] = h;
      } else if (nh.includes("optionb") || nh === "optb" || h.includes("વિકલ્પ બી")) {
        map["optionB"] = h;
      } else if (nh.includes("optionc") || nh === "optc" || h.includes("વિકલ્પ સી")) {
        map["optionC"] = h;
      } else if (nh.includes("optiond") || nh === "optd" || h.includes("વિકલ્પ ડી")) {
        map["optionD"] = h;
      } else if (nh === "options" || nh === "choices") {
        map["options"] = h;
      } else if (nh.includes("answer") || nh === "ans" || nh.includes("correct") || h.includes("જવાબ")) {
        map["correctAnswer"] = h;
      } else if (nh === "explanation" || h.includes("સમજૂતી")) {
        map["explanation"] = h;
      } else if (nh === "difficulty" || h.includes("મુશ્કેલી")) {
        map["difficulty"] = h;
      }
    });

    return map;
  };

  const splitCSVRow = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          processCsvText(event.target.result as string);
        }
      };
      reader.readAsText(file);
    } else {
      toast.error("કૃપા કરીને ફક્ત .csv ફાઇલ જ સબમિટ કરો");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          processCsvText(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const processCsvText = (text: string) => {
    try {
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        toast.error("CSV ફાઇલમાં પૂરતો ડેટા ઉપલબ્ધ નથી");
        return;
      }

      const headers = splitCSVRow(lines[0]);
      const headerMap = mapHeaders(headers);

      // Verify essential headers
      const missing: string[] = [];
      if (!headerMap["standard"]) missing.push("Standard/ધોરણ");
      if (!headerMap["subject"]) missing.push("Subject/વિષય");
      if (!headerMap["chapter"]) missing.push("Chapter/પ્રકરણ");
      if (!headerMap["question"]) missing.push("Question/પ્રશ્ન");
      if (!headerMap["correctAnswer"]) missing.push("Correct Answer/સાચો જવાબ");

      if (missing.length > 0) {
        toast.warning(`કેટલાક હેડર ખૂટે છે: ${missing.join(", ")}. CSV ફોર્મેટ ચેક કરો.`);
      }

      const items: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const fields = splitCSVRow(line);
        if (fields.length === 0 || fields.every(f => !f)) continue;

        const rowObj: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = fields[idx] || "";
        });

        const rawSubject = (rowObj[headerMap["subject"]] || "Science").trim();
        const rawChapter = (rowObj[headerMap["chapter"]] || "Chapter 1").trim();

        let rawStd = (rowObj[headerMap["standard"]] || "").trim();
        if (!rawStd || rawStd === "10") {
          const subMatch = rawSubject.match(/(?:std|standard|class|ધોરણ|ધો)\s*(\d+)/i) || rawSubject.match(/(\d+)/);
          if (subMatch) {
            const num = parseInt(subMatch[1]);
            if (num >= 1 && num <= 12) {
              rawStd = String(num);
            }
          }
        }
        if (!rawStd || rawStd === "") {
          rawStd = "10";
        }
        const std = cleanStandard(rawStd);

        let cleanedSubject = rawSubject;
        if (cleanedSubject.toLowerCase() === "science7" || cleanedSubject.toLowerCase() === "science") {
          cleanedSubject = "Science";
        } else if (cleanedSubject.toLowerCase() === "maths7" || cleanedSubject.toLowerCase() === "maths" || cleanedSubject.toLowerCase() === "math") {
          cleanedSubject = "Maths";
        } else if (cleanedSubject.toLowerCase() === "social7" || cleanedSubject.toLowerCase() === "social" || cleanedSubject.toLowerCase() === "ss") {
          cleanedSubject = "Social Science";
        } else {
          cleanedSubject = cleanedSubject
            .replace(/(?:std|standard|class|ધોરણ|ધો)\s*\d+/i, "")
            .replace(/\d+$/, "")
            .trim();
          if (/^[a-zA-Z]+$/.test(cleanedSubject)) {
            cleanedSubject = cleanedSubject.charAt(0).toUpperCase() + cleanedSubject.slice(1).toLowerCase();
          }
        }
        if (!cleanedSubject) {
          cleanedSubject = "Science";
        }

        let cleanedChapter = rawChapter;
        const chNoMatch = cleanedChapter.match(/(?:ch|chapter|પ્રકરણ)\D*(\d+)$/i);
        if (chNoMatch) {
          cleanedChapter = `CH-${parseInt(chNoMatch[1])}`;
        } else {
          const chNoMatch2 = cleanedChapter.match(/^(?:chapter|ch|પ્રકરણ)\s*(\d+)/i);
          if (chNoMatch2) {
            cleanedChapter = `CH-${parseInt(chNoMatch2[1])}`;
          } else {
            const endNumMatch = cleanedChapter.match(/(\d+)$/);
            if (endNumMatch) {
              cleanedChapter = `CH-${parseInt(endNumMatch[1])}`;
            }
          }
        }

        const questionText = rowObj[headerMap["question"]] || "";
        const optA = rowObj[headerMap["optionA"]] || rowObj["optionA"] || "";
        const optB = rowObj[headerMap["optionB"]] || rowObj["optionB"] || "";
        const optC = rowObj[headerMap["optionC"]] || rowObj["optionC"] || "";
        const optD = rowObj[headerMap["optionD"]] || rowObj["optionD"] || "";
        const correct = (rowObj[headerMap["correctAnswer"]] || "A").trim().toUpperCase();
        const expl = rowObj[headerMap["explanation"]] || "";
        const diff = (rowObj[headerMap["difficulty"]] || "medium").trim().toLowerCase() as QuestionDifficulty;

        if (questionText.trim()) {
          items.push({
            standard: std,
            subject: cleanedSubject,
            chapter: cleanedChapter,
            question: questionText.trim(),
            optionA: optA.trim() || "Option A",
            optionB: optB.trim() || "Option B",
            optionC: optC.trim() || "Option C",
            optionD: optD.trim() || "Option D",
            correctAnswer: ["A", "B", "C", "D"].includes(correct) ? correct : "A",
            explanation: expl.trim(),
            difficulty: ["easy", "medium", "hard"].includes(diff) ? diff : "medium"
          });
        }
      }

      setParsedItems(items);
      setShowImportPreview(true);
      toast.success(`${items.length} પ્રશ્નો સફળતાપૂર્વક મેળવવામાં આવ્યા!`);
    } catch (e) {
      console.error(e);
      toast.error("CSV પારસ કરવામાં સામાન્ય સમસ્યા ઉદ્ભવી.");
    }
  };

  const handleCommitImport = async () => {
    if (parsedItems.length === 0) return;
    setIsCommitting(true);
    try {
      // Step 1: Automatically gather unique standards, subjects and chapters from CSV
      const uniqueSubs: Record<string, { std: string; name: string }> = {};
      const uniqueChaps: Record<string, { std: string; subId: string; name: string }> = {};

      parsedItems.forEach(item => {
        const std = item.standard;
        const subName = item.subject;
        const chapName = item.chapter;

        const subId = "sub_" + std + "_" + subName.toLowerCase().replace(/[^a-z0-9]/g, "");
        const chapId = "ch_" + subId + "_" + chapName.toLowerCase().replace(/[^a-z0-9]/g, "");

        uniqueSubs[subId] = { std, name: subName };
        uniqueChaps[chapId] = { std, subId, name: chapName };
      });

      // Step 2: Auto-create discovered subjects if absent
      for (const [subId, sInfo] of Object.entries(uniqueSubs)) {
        const exists = subjects.some(s => s.subjectId === subId);
        if (!exists) {
          await AdminRepository.createSubject(
            currentUser?.uid || "admin",
            currentUser?.fullName || "Admin",
            {
              subjectId: subId,
              subjectName: sInfo.name,
              standard: sInfo.std,
              status: "active",
              createdAt: new Date().toISOString()
            }
          );
        }
      }

      // Step 3: Auto-create discovered chapters if absent
      for (const [chapId, cInfo] of Object.entries(uniqueChaps)) {
        const exists = chapters.some(c => c.chapterId === chapId);
        if (!exists) {
          let chNo = 1;
          const chMatches = cInfo.name.match(/\d+/g);
          if (chMatches && chMatches.length > 0) {
            chNo = parseInt(chMatches[chMatches.length - 1]);
          }
          await AdminRepository.createChapter(
            currentUser?.uid || "admin",
            currentUser?.fullName || "Admin",
            {
              chapterId: chapId,
              subjectId: cInfo.subId,
              chapterName: cInfo.name,
              chapterNo: chNo,
              standard: cInfo.std,
              status: "active"
            }
          );
        }
      }

      // Step 4: Map parsed CSV questions to payloads and save
      const finalQuestionsList: Question[] = parsedItems.map((item, idx) => {
        const std = item.standard;
        const subId = "sub_" + std + "_" + item.subject.toLowerCase().replace(/[^a-z0-9]/g, "");
        const chapId = "ch_" + subId + "_" + item.chapter.toLowerCase().replace(/[^a-z0-9]/g, "");

        return {
          questionId: "q_" + Date.now() + "_" + idx,
          subjectId: subId,
          chapterId: chapId,
          question: item.question,
          optionA: item.optionA,
          optionB: item.optionB,
          optionC: item.optionC,
          optionD: item.optionD,
          correctAnswer: item.correctAnswer,
          explanation: item.explanation,
          difficulty: item.difficulty,
          active: true,
          verified: true,
          approvalStatus: "approved",
          createdAt: new Date().toISOString()
        };
      });

      await AdminRepository.bulkUploadQuestions(
        currentUser?.uid || "admin",
        currentUser?.fullName || "Admin",
        finalQuestionsList
      );

      toast.success(`${finalQuestionsList.length} પ્રશ્નો સફળતાપૂર્વક ડેટાબેઝમાં સાચવવામાં આવ્યા!`);
      setShowImportPreview(false);
      setParsedItems([]);
      onRefresh();
    } catch (e) {
      console.error(e);
      toast.error("ડેટાબેઝ સેવ પ્રક્રિયામાં ક્ષતિ ઉદભવી.");
    } finally {
      setIsCommitting(false);
    }
  };

  // Bundle single questions CRUD functions
  const openQuestionsView = (bundle: any) => {
    setActiveBundle(bundle);
    setShowQuestionsModal(true);
    setShowAddQuestionForm(false);
    setEditingQuestion(null);
  };

  const handleCreateOrUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim() || !newOptA.trim() || !newOptB.trim()) {
      toast.warning("કૃપા કરીને પ્રશ્નની વિગત અને ઓપ્શન્સ ભરો!");
      return;
    }

    const isEdit = !!editingQuestion;
    const qId = isEdit ? editingQuestion.questionId : "q_" + Date.now();

    const payload: Question = {
      ...(isEdit ? editingQuestion : {}),
      questionId: qId,
      subjectId: activeBundle.subjectId,
      chapterId: activeBundle.chapterId,
      question: newQuestionText.trim(),
      optionA: newOptA.trim(),
      optionB: newOptB.trim(),
      optionC: newOptC.trim() || "Option C",
      optionD: newOptD.trim() || "Option D",
      correctAnswer: newCorrect,
      explanation: newExpl.trim(),
      difficulty: newDiff,
      active: true,
      verified: true,
      approvalStatus: "approved",
      createdAt: isEdit ? editingQuestion.createdAt : new Date().toISOString()
    };

    try {
      if (isEdit) {
        await AdminRepository.updateQuestion(
          currentUser?.uid || "admin",
          currentUser?.fullName || "Admin",
          qId,
          payload
        );
        toast.success("પ્રશ્ન સફળતાપૂર્વક એડિટ થયો!");
      } else {
        await AdminRepository.createQuestion(
          currentUser?.uid || "admin",
          currentUser?.fullName || "Admin",
          payload
        );
        toast.success("નવો પ્રશ્ન બંડલની અંદર ઉમેરાઈ ગયો!");
      }

      setEditingQuestion(null);
      setShowAddQuestionForm(false);
      
      // Reset form variables
      setNewQuestionText("");
      setNewOptA("");
      setNewOptB("");
      setNewOptC("");
      setNewOptD("");
      setNewCorrect("A");
      setNewExpl("");
      setNewDiff("medium");

      onRefresh();
      
      const updatedQuestions = isEdit 
        ? activeBundle.questions.map((q: any) => q.questionId === qId ? payload : q)
        : [...activeBundle.questions, payload];
      
      setActiveBundle({
        ...activeBundle,
        questions: updatedQuestions,
        questionCount: updatedQuestions.length
      });

    } catch (err) {
      console.error(err);
      toast.error("સેવ કરવામાં ખામી સર્જાઈ");
    }
  };

  const initiateEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setNewQuestionText(q.question);
    setNewOptA(q.optionA);
    setNewOptB(q.optionB);
    setNewOptC(q.optionC);
    setNewOptD(q.optionD);
    setNewCorrect(q.correctAnswer);
    setNewExpl(q.explanation || "");
    setNewDiff(q.difficulty);
    setShowAddQuestionForm(true);
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!window.confirm("શું તમે ખરેખર આ પ્રશ્ન રદ કરવા માંગો છો?")) return;
    try {
      await AdminRepository.deleteQuestion(
        currentUser?.uid || "admin",
        currentUser?.fullName || "Admin",
        qId
      );
      toast.success("પ્રશ્ન રદ થઈ ગયો છે");
      onRefresh();
      
      const filtered = activeBundle.questions.filter((q: any) => q.questionId !== qId);
      setActiveBundle({
        ...activeBundle,
        questions: filtered,
        questionCount: filtered.length
      });
    } catch (e) {
      console.error(e);
      toast.error("ડીલીટ કરવાની પ્રક્રિયા અસફળ રહી");
    }
  };

  // Exam Scheduler Open Modal
  const openExamScheduler = (bundle: any) => {
    setActiveBundle(bundle);
    
    let chDisplay = "";
    // Find the current chapter object from the chapters prop list
    const chapterObj = chapters.find(c => c.chapterId === bundle.chapterId);
    if (chapterObj && chapterObj.chapterNo !== undefined && chapterObj.chapterNo !== null) {
      chDisplay = `Ch ${chapterObj.chapterNo}`;
    } else {
      // Look up unique chapterIds in questions if there are multiple
      const uniqueChapIds = Array.from(new Set((bundle.questions || []).map((q: any) => q.chapterId).filter(Boolean))) as string[];
      if (uniqueChapIds.length > 1) {
        const matchedChaps = chapters.filter(c => uniqueChapIds.includes(c.chapterId));
        const chapNos = matchedChaps
          .map(c => c.chapterNo)
          .filter(no => no !== undefined && no !== null) as number[];
        if (chapNos.length > 0) {
          const minCh = Math.min(...chapNos);
          const maxCh = Math.max(...chapNos);
          chDisplay = minCh === maxCh ? `Ch ${minCh}` : `Ch ${minCh} to ${maxCh}`;
        }
      }
    }

    if (!chDisplay && bundle.chapterName) {
      const matches = bundle.chapterName.match(/\d+/g);
      if (matches && matches.length > 0) {
        chDisplay = `Ch ${matches[matches.length - 1]}`;
      }
    }

    if (!chDisplay) {
      chDisplay = bundle.chapterName || "Ch 1";
    }

    setScheduledExamName(`${bundle.subjectName} — ${chDisplay} કસોટી`);
    
    // Set default date as today, format YYYY-MM-DD
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setScheduledLaunchDate(`${yyyy}-${mm}-${dd}`);

    // Default target time 10 minutes from now
    today.setMinutes(today.getMinutes() + 15);
    const launchH = String(today.getHours()).padStart(2, '0');
    const launchM = String(today.getMinutes()).padStart(2, '0');
    setScheduledLaunchTime(`${launchH}:${launchM}`);
    
    setScheduledDuration(30);
    setQuestionSelectionMode("All");
    setRandomCount(Math.min(15, bundle.questionCount));
    setShowSchedulerModal(true);
  };

  const handleSaveScheduledExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledExamName.trim() || !scheduledLaunchDate || !scheduledLaunchTime) {
      toast.warning("કૃપા કરીને પરીક્ષાનું નામ, તારીખ અને સમય ભરો!");
      return;
    }

    setIsScheduling(true);

    try {
      // Shuffling questions if random
      let paperQuestionIds: string[] = [];
      const pool = activeBundle.questions;

      if (questionSelectionMode === "All") {
        paperQuestionIds = pool.map((q: any) => q.questionId);
      } else {
        const count = Math.min(randomCount, pool.length);
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        paperQuestionIds = shuffled.slice(0, count).map(q => q.questionId);
      }

      if (paperQuestionIds.length === 0) {
        toast.error("આ બંડલમાં કોઈ પ્રશ્ન ઉપલબ્ધ ન હોવાથી પરીક્ષા લોન્ચ કરી શકાય નહીં!");
        setIsScheduling(false);
        return;
      }

      // Compute startAt and endAt ISO datetime tags correctly
      const startAtString = new Date(`${scheduledLaunchDate}T${scheduledLaunchTime}:00`).toISOString();
      const tempEndDate = new Date(`${scheduledLaunchDate}T${scheduledLaunchTime}:00`);
      tempEndDate.setMinutes(tempEndDate.getMinutes() + scheduledDuration);
      const endAtString = tempEndDate.toISOString();

      const newExam: DailyExam = {
        examId: "exam_" + Date.now(),
        subjectId: activeBundle.subjectId,
        chapterId: activeBundle.chapterId,
        chapterIds: [activeBundle.chapterId],
        examinerId: currentUser?.uid || "admin",
        examinerName: currentUser?.fullName || "Admin Instructor",
        examDate: scheduledLaunchDate,
        duration: scheduledDuration,
        totalQuestions: paperQuestionIds.length,
        status: "scheduled",
        startAt: startAtString,
        endAt: endAtString,
        publishAt: startAtString,
        examType: "Scheduled",
        questionIds: paperQuestionIds,
        createdAt: new Date().toISOString(),
        standard: activeBundle.standard
      };

      const success = await AdminRepository.createExam(
        currentUser?.uid || "admin",
        currentUser?.fullName || "Admin",
        newExam
      );

      if (success) {
        toast.success(`નવી પરીક્ષા સફળતાપૂર્વક નિયત સમયપત્રક મુજબ શેડ્યુલ થઈ ગઈ!`);
        setShowSchedulerModal(false);
        onRefresh();
        if (onScheduleSuccess) {
          onScheduleSuccess();
        }
      } else {
        toast.error("પરીક્ષા શેડ્યૂલ કરવામાં કોઈક ખામી સર્જાઈ છે.");
      }
    } catch (err) {
      console.error(err);
      toast.error("પરીક્ષા શેડ્યૂલ પ્રક્રિયામાં એરર આવી");
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* CSV UPLOADER ZONE */}
      <div className="bg-gradient-to-r from-teal-500/5 to-emerald-500/5 border border-dashed border-teal-500/30 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-2 border-b border-teal-500/10">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-base font-extrabold text-teal-800 dark:text-teal-400 flex items-center justify-center md:justify-start gap-2">
              <Upload className="size-5" /> પ્રશ્ન બેંક બલ્ક અપલોડ એન્જિન (Bulk Import Engine)
            </h3>
            <p className="text-xs text-muted-foreground max-w-xl">
              તમે બલ્કમાં પ્રશ્નો આયાત કરવા માટે .csv ફાઇલ પણ અપલોડ કરી શકો છો અથવા ડાયરેક્ટ રૉ ડેટા કોપી-પેસ્ટ કરી શકો છો. કોઈ મેન્યુઅલ સેટઅપની જરૂર નથી!
            </p>
          </div>

          {/* Dual Toggle Option Tab Bar */}
          <div className="flex bg-muted/65 p-1 rounded-xl border shrink-0">
            <button
              onClick={() => setActiveImportMode("file")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeImportMode === "file" 
                  ? "bg-teal-600 text-white shadow-sm" 
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <FileText className="size-3.5" /> CSV ફાઇલ અપલોડ
            </button>
            <button
              onClick={() => setActiveImportMode("text")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeImportMode === "text" 
                  ? "bg-teal-600 text-white shadow-sm" 
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Sparkles className="size-3.5" /> રૉ CSV ટેક્સ્ટ પેસ્ટ
            </button>
          </div>
        </div>

        {activeImportMode === "file" ? (
          <div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <p className="text-xs text-muted-foreground">
                તમારી કોમ્પ્યુટર કે ફોનમાંથી સંગ્રહિત <b>.csv ફાઇલ</b> પસંદ કરો. સબમિટ કરવાથી બંડલ ઓટોમેટિકલી ક્રિએટ થઈ જશે.
              </p>
              <label className="flex flex-col items-center justify-center px-6 py-4 bg-teal-600 hover:bg-teal-700 active:scale-[0.98] transition text-white rounded-2xl cursor-pointer shadow-float text-xs font-bold gap-1 shrink-0">
                <FileText className="size-4" /> CSV ફાઇલ પસંદ કરો
                <input 
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  onChange={handleFileChange} 
                />
              </label>
            </div>

            {/* Drag and Drop implementation */}
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="mt-4 border-2 border-dashed border-teal-500/10 hover:border-teal-500/30 rounded-2xl p-8 text-center text-xs text-muted-foreground transition cursor-pointer"
            >
              અથવા ફાઇલને અહીં ખેંચીને લાવો (Drag & Drop CSV inside this area)
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              એક્સેલ (Excel) અથવા ગુગલ શીટ્સ (Google Sheets) માંથી હેડર્સ સહિતની પંક્તિઓ (Rows) સિલેક્ટ કરી કોપી કરો અને નીચે પેસ્ટ કરી આયાત કરી શકો છો:
            </p>
            <textarea
              value={pastedCsvText}
              onChange={(e) => setPastedCsvText(e.target.value)}
              placeholder="Standard,Subject,Chapter,Question,Option A,Option B,Option C,Option D,Correct Answer,Explanation&#10;7,Science 7,Life Processes,Photosynthesis processes question,A,B,C,D,A,Hint reason"
              rows={5}
              className="w-full bg-background border border-border rounded-2xl p-3 text-xs font-mono outline-none focus:border-teal-500 text-foreground"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!pastedCsvText.trim()) {
                    toast.warning("કૃપા કરીને પેલા રૉ ડેટા પેસ્ટ કરો.");
                    return;
                  }
                  processCsvText(pastedCsvText);
                }}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-[0.97] text-white rounded-xl shadow-md text-xs font-bold transition flex items-center gap-1.5"
              >
                <CheckCircle className="size-4" /> ડેટા આયાત કરો (Import Pasted CSV)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DASHBOARD SEARCH & FILTERS BAR */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card border border-border p-4 rounded-3xl shadow-sm">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="બંડલ શોધો (વિષય કે પ્રકરણ નામ લખો)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-2xl text-xs font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-[10px] whitespace-nowrap uppercase tracking-wider font-bold text-muted-foreground">ધોરણ / Std:</span>
          <select
            value={filterStd}
            onChange={(e) => setFilterStd(e.target.value)}
            className="px-3 py-2 bg-muted/60 border border-border rounded-xl text-xs font-semibold focus:outline-none"
          >
            <option value="All">All Standards</option>
            {uniqueStandards.map(std => (
              <option key={std} value={std}>Std {std}</option>
            ))}
          </select>
          
          <button 
            onClick={() => onRefresh()}
            className="p-2 bg-primary-soft hover:bg-primary/20 text-primary rounded-xl active:scale-[0.95] transition"
            title="Refresh Data"
          >
            <RefreshCw className="size-4" />
          </button>
        </div>
      </div>

      {/* QUESTION BUNDLES TABLE LIST */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-sans">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-border text-slate-500 uppercase font-bold tracking-wider text-[10px]">
                <th className="py-4 px-6 text-center w-20">Std</th>
                <th className="py-4 px-6">Subject</th>
                <th className="py-4 px-6">Chapter</th>
                <th className="py-4 px-6 text-center w-28">Questions</th>
                <th className="py-4 px-6 text-center w-24">Status</th>
                <th className="py-4 px-6 text-right pr-8">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bundleList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <span className="text-3xl">📂</span>
                      <p className="font-semibold text-sm">કોઈ સક્રિય ક્વેશ્ચન બંડલ્સ મળ્યા નથી</p>
                      <p className="text-xs text-muted-foreground/80">નવી CSV ફાઇલ અપલોડ કરીને પ્રક્રિયા શરૂ કરો.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                bundleList.map((bundle) => (
                  <tr 
                    key={`${bundle.standard}_${bundle.subjectId}_${bundle.chapterId}`}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors"
                  >
                    <td className="py-4 px-6 text-center">
                      <span className="bg-teal-500/10 text-teal-700 dark:text-teal-400 font-extrabold px-3 py-1 rounded-xl text-xs inline-block">
                        {bundle.standard}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-extrabold text-slate-800 dark:text-slate-100 text-[13px]">
                      {bundle.subjectName}
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-600 dark:text-slate-300">
                      {bundle.chapterName}
                    </td>
                    <td className="py-4 px-6 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                      {bundle.questionCount}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold px-2.5 py-1 rounded-full text-[10px]">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Ready
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right pr-8">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openQuestionsView(bundle)}
                          className="h-8 px-3 border border-border hover:bg-muted font-bold rounded-xl transition active:scale-[0.97] flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground shadow-xs cursor-pointer"
                        >
                          <Eye className="size-3.5" /> View
                        </button>
                        <button
                          onClick={() => openExamScheduler(bundle)}
                          className="h-8 px-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-xs transition active:scale-[0.97] flex items-center gap-1 text-[11px] cursor-pointer"
                        >
                          <Calendar className="size-3.5" /> Schedule Exam
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: PREVIEW CSV BEFORE SAVE */}
      <AnimatePresence>
        {showImportPreview && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-background border border-border rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl relative"
            >
              <button 
                onClick={() => setShowImportPreview(false)}
                className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full"
              >
                <X className="size-4" />
              </button>

              <div className="p-6 border-b border-border">
                <h3 className="text-base font-extrabold flex items-center gap-2 text-teal-600">
                  <CheckCircle2 className="size-5" /> CSV આયાત પૂર્વાવલોકન (Import Preview)
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  ડેટા તપાસો. સેવ બટન ક્લિક કરતાની સાથે જ નીચે દર્શાવેલ વિષય અને પ્રકરણો પણ ઓટોમેટિકલી બની જશે.
                </p>
              </div>

              {/* Scrollable grid of preview items */}
              <div className="p-6 overflow-y-auto space-y-4 max-h-[50dvh] text-xs">
                <div className="bg-teal-500/5 rounded-2xl p-4 border border-teal-500/10 space-y-2">
                  <p className="font-bold text-teal-800 dark:text-teal-400">શોધાયેલ મટીરીયલ લિસ્ટ (Auto-Detected Entities):</p>
                  <div className="flex flex-wrap gap-2 pt-1 font-semibold">
                    {Array.from(new Set(parsedItems.map(p => `Std ${p.standard} | ${p.subject} | ${p.chapter}`))).map((item, idx) => (
                      <span key={idx} className="bg-teal-500/10 text-teal-800 dark:text-teal-300 px-3 py-1 rounded-full text-[10px]">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border border-border rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted text-muted-foreground text-[10px] uppercase font-bold border-b border-border">
                        <th className="p-3">ધોરણ/વિષય</th>
                        <th className="p-3">પ્રશ્ન (Question Body)</th>
                        <th className="p-3">ઓપ્શન્સ</th>
                        <th className="p-3 text-center">સાચો જવાબ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {parsedItems.slice(0, 50).map((p, idx) => (
                        <tr key={idx} className="hover:bg-muted/35">
                          <td className="p-3 whitespace-nowrap font-medium text-muted-foreground text-[10px]">
                            Std {p.standard} - {p.subject}
                          </td>
                          <td className="p-3 max-w-sm font-semibold truncate">
                            {p.question}
                          </td>
                          <td className="p-3 text-muted-foreground font-mono text-[10px]">
                            A: {p.optionA.slice(0,12)}.. B: {p.optionB.slice(0,12)}..
                          </td>
                          <td className="p-3 text-center font-bold text-teal-600">
                            {p.correctAnswer}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {parsedItems.length > 50 && (
                  <p className="text-center text-muted-foreground text-[10px] font-semibold">
                    + અન્ય {parsedItems.length - 50} પ્રશ્નો મેળવેલ છે...
                  </p>
                )}
              </div>

              <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/20">
                <button
                  type="button"
                  onClick={() => setShowImportPreview(false)}
                  className="px-4 py-2 bg-muted rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCommitImport}
                  disabled={isCommitting}
                  className="px-5 py-2.5 bg-teal-600 font-bold hover:bg-teal-700 text-white rounded-xl text-xs flex items-center gap-2"
                >
                  {isCommitting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" /> સાચવી રહ્યું છે...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-3.5" /> સેવ કરો (Save to DB)
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: QUESTIONS IN BUNDLE VIEW (CRUD) */}
      <AnimatePresence>
        {showQuestionsModal && activeBundle && (
          <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-background border border-border rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl relative"
            >
              <button 
                onClick={() => setShowQuestionsModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full"
              >
                <X className="size-4" />
              </button>

              <div className="p-6 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="bg-teal-500 text-white font-extrabold px-2.5 py-0.5 rounded-full text-[10px]">
                    Std {activeBundle.standard}
                  </span>
                  <h3 className="text-base font-extrabold line-clamp-1">
                    {activeBundle.subjectName} — {activeBundle.chapterName}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  આ મટીરીયલમાં કુલ {activeBundle.questionCount} પ્રશ્નો સંગ્રહિત છે.
                </p>
              </div>

              {/* Scrollable core container */}
              <div className="p-6 overflow-y-auto space-y-6 max-h-[55dvh]">
                
                {/* ℹ️ સિંગલ પ્રશ્ન ઉમેરવાનો વિકલ્પ બંધ કર્યો છે (મેન્યુઅલ વિકલ્પો બંધ કરવા સંબંધિત) */}
                <div className="bg-teal-500/10 dark:bg-teal-500/5 p-4 rounded-3xl border border-teal-500/20 text-center text-xs text-teal-700 dark:text-teal-400 font-bold mb-6 flex flex-col items-center justify-center gap-1">
                  <span>ℹ️ આ પ્રક્રિયામાં નવો પ્રશ્ન ફક્ત CSV બલ્ક અપલોડ દ્વારા જ ઉમેરી શકાશે.</span>
                  <span className="text-[10px] text-muted-foreground font-normal">સિંગલ મેન્યુઅલ પ્રશ્ન ઉમેરવાનો કે એડિટ કરવાનો વિકલ્પ તમારા નિવેદન મુજબ અક્ષમ કરવામાં આવ્યો છે.</span>
                </div>

                {/* Questions Display Grid */}
                <div className="space-y-4">
                  {activeBundle.questions.map((q: Question, index: number) => (
                    <div key={q.questionId} className="border border-border rounded-2xl p-4 space-y-3 relative bg-card hover:border-muted-foreground/30 transition text-xs font-sans">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-extrabold text-muted-foreground mr-1.5 font-mono">#{index + 1}</span>
                          <span className="capitalize px-2 py-0.5 bg-muted rounded-full text-[9px] font-bold tracking-wider">
                            {q.difficulty || "medium"}
                          </span>
                        </div>

                        {/* Edit Delete tools disabled based on requirements */}
                      </div>

                      <p className="font-bold text-slate-800 dark:text-slate-100 leading-relaxed text-sm">
                        {q.question}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground font-semibold">
                        <div className={`p-2 rounded-xl flex items-center gap-2 ${q.correctAnswer === "A" ? "bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-400" : "bg-muted/40"}`}>
                          <span className="font-mono text-[10px] text-muted-foreground/60">A:</span> {q.optionA}
                        </div>
                        <div className={`p-2 rounded-xl flex items-center gap-2 ${q.correctAnswer === "B" ? "bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-400" : "bg-muted/40"}`}>
                          <span className="font-mono text-[10px] text-muted-foreground/60">B:</span> {q.optionB}
                        </div>
                        <div className={`p-3 rounded-xl flex items-center gap-2 ${q.correctAnswer === "C" ? "bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-400" : "bg-muted/40"}`}>
                          <span className="font-mono text-[10px] text-muted-foreground/60">C:</span> {q.optionC}
                        </div>
                        <div className={`p-2 rounded-xl flex items-center gap-2 ${q.correctAnswer === "D" ? "bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-400" : "bg-muted/40"}`}>
                          <span className="font-mono text-[10px] text-muted-foreground/60">D:</span> {q.optionD}
                        </div>
                      </div>

                      {q.explanation && (
                        <div className="p-2.5 bg-teal-50 dark:bg-teal-950/20 text-teal-800 dark:text-teal-400 border border-teal-100 dark:border-teal-900/40 rounded-xl text-[11px]">
                          <strong>સમજૂતી (Explanation):</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

              </div>

              <div className="p-6 border-t border-border flex justify-end bg-muted/10">
                <button
                  onClick={() => setShowQuestionsModal(false)}
                  className="px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-2xl text-xs"
                >
                  બાકી રહો (Close)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: SCHEDULE EXAM FORM */}
      <AnimatePresence>
        {showSchedulerModal && activeBundle && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-background border border-border rounded-3xl w-full max-w-lg shadow-2xl relative"
            >
              <button 
                onClick={() => setShowSchedulerModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full"
              >
                <X className="size-4" />
              </button>

              <div className="p-6 border-b border-border">
                <h3 className="text-base font-extrabold text-teal-600 flex items-center gap-2">
                  <Calendar className="size-5" /> પરીક્ષા સમયપત્રક (Schedule Exam Blueprint)
                </h3>
                <p className="text-xs text-muted-foreground">
                  બંડલ: <strong>Std {activeBundle.standard} | {activeBundle.subjectName}</strong>
                </p>
              </div>

              <form onSubmit={handleSaveScheduledExam} className="p-6 space-y-4 font-sans text-xs font-semibold">
                
                {/* 1. Exam title */}
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">પરીક્ષાનું નામ (Exam Name)</label>
                  <input
                    type="text"
                    required
                    value={scheduledExamName}
                    onChange={(e) => setScheduledExamName(e.target.value)}
                    placeholder="કસોટીનું શીર્ષક ભરો..."
                    className="w-full bg-background border px-3- py-2.5 rounded-xl border-border font-bold focus:border-teal-500"
                  />
                </div>

                {/* 2. Launch times */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">લોન્ચ તારીખ (Launch Date)</label>
                    <input
                      type="date"
                      required
                      value={scheduledLaunchDate}
                      onChange={(e) => setScheduledLaunchDate(e.target.value)}
                      className="w-full bg-background border px-3 py-2.5 rounded-xl border-border"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">લોન્ચ સમય (Launch Time)</label>
                    <input
                      type="time"
                      required
                      value={scheduledLaunchTime}
                      onChange={(e) => setScheduledLaunchTime(e.target.value)}
                      className="w-full bg-background border px-3 py-2.5 rounded-xl border-border"
                    />
                  </div>
                </div>

                {/* 3. Duration */}
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">પરીક્ષાduration (minutes)</label>
                  <input
                    type="number"
                    required
                    min={5}
                    max={180}
                    value={scheduledDuration}
                    onChange={(e) => setScheduledDuration(Number(e.target.value))}
                    className="w-full bg-background border px-3 py-2.5 rounded-xl border-border"
                  />
                </div>

                {/* 4. Question Selection counts */}
                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider block">પ્રશ્નોની પસંદગી (Question Selection Mode)</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="selectionMode"
                        checked={questionSelectionMode === "All"}
                        onChange={() => setQuestionSelectionMode("All")}
                      />
                      બધા પ્રશ્નો (All Questions: {activeBundle.questionCount})
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="selectionMode"
                        checked={questionSelectionMode === "Random"}
                        onChange={() => setQuestionSelectionMode("Random")}
                      />
                      રેન્ડમ પ્રશ્નો (Random N Questions)
                    </label>
                  </div>

                  {questionSelectionMode === "Random" && (
                    <div className="bg-muted pl-4 pr-3 py-3 rounded-2xl border border-border mt-1">
                      <label className="text-[10px] text-muted-foreground block mb-1">પ્રશ્નોની સંખ્યા (Number of Questions)</label>
                      <input
                        type="number"
                        min={1}
                        max={activeBundle.questionCount}
                        value={randomCount}
                        onChange={(e) => setRandomCount(Number(e.target.value))}
                        className="w-full bg-background border px-3 py-2 rounded-xl max-w-[120px]"
                      />
                      <span className="text-[10px] block text-muted-foreground/60 mt-1">
                        મહત્તમ ઉપલબ્ધ: {activeBundle.questionCount}
                      </span>
                    </div>
                  )}
                </div>

                {/* Submit operations */}
                <div className="pt-4 border-t border-border flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSchedulerModal(false)}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isScheduling}
                    className="px-5 py-2.5 gradient-primary text-primary-foreground font-bold rounded-xl flex items-center gap-1.5"
                  >
                    {isScheduling ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" /> Scheduling...
                      </>
                    ) : (
                      <>
                        <Calendar className="size-3.5 fill-current" /> શેડ્યુલ કરો (Schedule Exam)
                      </>
                    )}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
