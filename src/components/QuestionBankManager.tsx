import React, { useState, useEffect } from "react";
import { 
  PlusCircle, Search, Trash2, Edit3, CheckCircle2, XCircle, 
  AlertCircle, Upload, BookOpen, Layers, HelpCircle, Check, 
  Loader2, Eye, Sparkles, Filter, FileText, CheckCircle, RefreshCw, X, ArrowRight, Calendar, Clock,
  Download, Copy
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Question, Subject, Chapter, QuestionDifficulty, UserRole, DailyExam } from "@/types";
import { AdminRepository } from "@/lib/db";
import { toast } from "sonner";

const DEFAULT_GUJARATI_SUBJECTS = [
  "ગણિત",
  "વિજ્ઞાન",
  "સામાજિક વિજ્ઞાન",
  "ગુજરાતી",
  "અંગ્રેજી",
  "હિન્દી",
  "સંસ્કૃત",
  "ભૌતિક વિજ્ઞાન",
  "રસાયણ વિજ્ઞાન",
  "જીવ વિજ્ઞાન",
  "નામાના મૂળતત્વો",
  "આંકડાશાસ્ત્ર",
  "અર્થશાસ્ત્ર",
  "વાણિજ્ય વ્યવસ્થા"
];

const DEFAULT_ENGLISH_SUBJECTS = [
  "Mathematics",
  "Science",
  "Social Science",
  "English",
  "Gujarati",
  "Hindi",
  "Sanskrit",
  "Physics",
  "Chemistry",
  "Biology",
  "Accountancy",
  "Statistics",
  "Economics",
  "Business Administration"
];

function getSubjectsByStandardAndMedium(standard: string, medium: "Gujarati" | "English"): string[] {
  const stdNum = parseInt(standard, 10);
  if (medium === "Gujarati") {
    if (stdNum >= 11 && stdNum <= 12) {
      return [
        "ભૌતિક વિજ્ઞાન",
        "રસાયણ વિજ્ઞાન",
        "જીવ વિજ્ઞાન",
        "ગણિત",
        "નામાના મૂળતત્વો",
        "આંકડાશાસ્ત્ર",
        "અર્થશાસ્ત્ર",
        "વાણિજ્ય વ્યવસ્થા",
        "ગુજરાતી",
        "અંગ્રેજી"
      ];
    } else {
      return [
        "ગણિત",
        "વિજ્ઞાન",
        "સામાજિક વિજ્ઞાન",
        "ગુજરાતી",
        "અંગ્રેજી",
        "હિન્દી",
        "સંસ્કૃત"
      ];
    }
  } else {
    if (stdNum >= 11 && stdNum <= 12) {
      return [
        "Physics",
        "Chemistry",
        "Biology",
        "Mathematics",
        "Accountancy",
        "Statistics",
        "Economics",
        "Business Administration",
        "English",
        "Gujarati"
      ];
    } else {
      return [
        "Mathematics",
        "Science",
        "Social Science",
        "English",
        "Gujarati",
        "Hindi",
        "Sanskrit"
      ];
    }
  }
}


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
  const [filterOwnerId, setFilterOwnerId] = useState("All");
  
  // CSV Import States
  const [isUploading, setIsUploading] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [activeImportMode, setActiveImportMode] = useState<"file" | "text">("file");
  const [pastedCsvText, setPastedCsvText] = useState("");
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // AI Question Generation States
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiFileType, setAiFileType] = useState<"pdf" | "image" | null>(null);
  const [aiSelectedFiles, setAiSelectedFiles] = useState<File[]>([]);
  const [aiMedium, setAiMedium] = useState<"Gujarati" | "English">("Gujarati");
  const [aiStandard, setAiStandard] = useState("10");
  const [aiSubjectSelector, setAiSubjectSelector] = useState("ગણિત");
  const [aiCustomSubjectFlag, setAiCustomSubjectFlag] = useState(false);
  const [aiCustomSubjectName, setAiCustomSubjectName] = useState("");
  const [aiChapterSelector, setAiChapterSelector] = useState("Ch-1");
  const [aiCustomChapterFlag, setAiCustomChapterFlag] = useState(false);
  const [aiCustomChapterName, setAiCustomChapterName] = useState("");
  const [aiQuestionType, setAiQuestionType] = useState<"MCQ" | "True/False" | "Fill Blank" | "Mixed">("MCQ");
  const [aiQuestionCount, setAiQuestionCount] = useState("10");
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Auto-sync Subjects & Chapters based on selected medium and standard
  useEffect(() => {
    const list = getSubjectsByStandardAndMedium(aiStandard, aiMedium);
    if (list.length > 0) {
      setAiSubjectSelector(list[0]);
    }
    setAiChapterSelector("Ch-1");
    setAiCustomSubjectFlag(false);
    setAiCustomChapterFlag(false);
  }, [aiMedium, aiStandard]);

  // Handler to update or delete items from the edit preview modal list
  const handleUpdatePreviewItem = (index: number, updatedFields: Partial<any>) => {
    const updated = [...parsedItems];
    updated[index] = { ...updated[index], ...updatedFields };
    setParsedItems(updated);
  };

  const handleDeletePreviewItem = (index: number) => {
    const updated = parsedItems.filter((_, idx) => idx !== index);
    setParsedItems(updated);
  };

  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (aiSelectedFiles.length === 0) {
      toast.warning("કૃપા કરીને પહેલા વાંચવા માટે પીડીએફ અથવા ઈમેજ ફાઇલ અપલોડ કરો.");
      return;
    }

    const finalSubject = aiCustomSubjectFlag ? aiCustomSubjectName.trim() : aiSubjectSelector;
    const finalChapter = aiCustomChapterFlag ? aiCustomChapterName.trim() : aiChapterSelector;

    if (!finalSubject) {
      toast.warning("કૃપા કરીને વિષય પસંદ કરો અથવા નવો વિષય લખો.");
      return;
    }
    if (!finalChapter) {
      toast.warning("કૃપા કરીને પ્રકરણ પસંદ કરો અથવા નવું પ્રકરણ લખો.");
      return;
    }

    setIsAiGenerating(true);
    const progressToast = toast.loading("Gemini AI દસ્તાવેજ વાંચીને પ્રશ્નો બનાવી રહ્યું છે... કૃપા કરીને થોડી સેકન્ડ્સ રાહ જુઓ...");

    try {
      const filePromises = aiSelectedFiles.map((file) => {
        return new Promise<{ fileBase64: string, fileMimeType: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64String = (reader.result as string).split(",")[1];
            const fileMime = file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg");
            resolve({ fileBase64: base64String, fileMimeType: fileMime });
          };
          reader.onerror = () => reject(new Error(`ફાઇલ ${file.name} વાંચવામાં ભૂલ આવી.`));
          reader.readAsDataURL(file);
        });
      });

      const filesPayload = await Promise.all(filePromises);

      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: currentUser?.uid || "admin",
          role: currentUser?.role || "admin",
          files: filesPayload,
          medium: aiMedium,
          standard: aiStandard,
          subject: finalSubject,
          chapter: finalChapter,
          questionType: aiQuestionType,
          questionCount: aiQuestionCount
        })
      });

      if (!response.ok) {
        const textResponse = await response.text();
        let errMsg = "સર્વર પ્રશ્ન બનાવવામાં નિષ્ફળ રહ્યું.";
        try {
          const errRes = JSON.parse(textResponse);
          errMsg = errRes.error || errMsg;
        } catch {
          if (textResponse.includes("<html") || textResponse.includes("<!DOCTYPE")) {
            errMsg = `સર્વર એરર ${response.status}: સર્વરમાં કોઈ આંતરિક ભૂલ આવી છે અથવા અપલોડ ફાઇલની કદ મર્યાદા વધારે છે. (HTML Error)`;
          } else {
            errMsg = `સર્વર એરર ${response.status}: ${textResponse.substring(0, 200)}`;
          }
        }
        throw new Error(errMsg);
      }

      const textData = await response.text();
      let resData;
      try {
        resData = JSON.parse(textData);
      } catch (jsonErr) {
        throw new Error(`સર્વર તરફથી અમાન્ય રિસ્પોન્સ (JSON parsing error): ${textData.substring(0, 150)}`);
      }
      if (resData.success && resData.questions) {
        const mappedAiItems = resData.questions.map((q: any) => ({
          standard: aiStandard,
          subject: finalSubject,
          chapter: finalChapter,
          question: q.question,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctAnswer: q.correctAnswer || "A",
          explanation: q.explanation || "",
          difficulty: q.difficulty || "medium",
          medium: aiMedium,
          questionType: q.optionC === "" ? "TrueFalse" : (q.question.includes("_____") ? "FillBlank" : "MCQ"),
          source: "AI Generated"
        }));

        toast.dismiss(progressToast);
        setParsedItems(mappedAiItems);
        setShowAiModal(false);
        setAiSelectedFiles([]);
        setShowImportPreview(true);
        toast.success(`અભિનંદન! ${mappedAiItems.length} પ્રશ્નો સફળતાપૂર્વક મેળવાયા છે અને પૂર્વાવલોકન માટે તૈયાર છે!`);
      } else {
        throw new Error("અમાન્ય રિસ્પોન્સ મળ્યો.");
      }
    } catch (error: any) {
      toast.dismiss(progressToast);
      toast.error(error?.message || "AI પ્રશ્ન નિર્માણ અટકી ગયું.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  const downloadSampleCSV = (medium: "English" | "Gujarati") => {
    const headers = "Standard,Subject,Chapter,Type,Medium,Question,Option A,Option B,Option C,Option D,Correct Answer,Explanation,Difficulty\n";
    let rows = "";
    if (medium === "English") {
      rows += `10,Science,Life Processes,MCQ,English,Which of the following is crucial for photosynthesis?,Nitrogen,Carbon dioxide,Oxygen,Hydrogen,B,Plants absorb carbon dioxide for photosynthesis,medium\n`;
      rows += `10,Science,Life Processes,TrueFalse,English,Photosynthesis occurs in plants during both day and night?,True,False,,,B,Photosynthesis can only occur in the presence of sunlight,easy\n`;
      rows += `10,Science,Life Processes,FillBlank,English,The upper chambers of the human heart are called _________.,Atria,Ventricles,Valves,Aorta,A,The top chambers are called atria and the bottom ones ventricles,medium\n`;
      rows += `10,Science,Life Processes,MatchFollowing,English,"Match the columns: (1) Chlorophyll (2) Salivary gland (3) Stomach - (X) Amylase (Y) Pepsin (Z) Pigment","1-Z, 2-X, 3-Y","1-X, 2-Y, 3-Z","1-Y, 2-Z, 3-X","1-Z, 2-Y, 3-X",A,Chlorophyll is a pigment, salivary gland secretes amylase and stomach secretes pepsin,hard\n`;
    } else {
      rows += `10,Science,Life Processes,MCQ,Gujarati,પ્રકાશસંશ્લેષણ પ્રક્રિયા માટે નીચેનામાંથી કયો વાયુ જરૂરી છે?,નાઇટ્રોજન,કાર્બન ડાયોક્સાઇડ,ઓક્સિજન,હાઇડ્રોજન,B,વનસ્પતિ પ્રકાશસંશ્લેષણ માટે કાર્બન ડાયોક્સાઇડ હવામાંથી લે છે,medium\n`;
      rows += `10,Science,Life Processes,TrueFalse,Gujarati,વનસ્પતિ માં પ્રકાશસંશ્લેષણ દિવસ અને રાત બંને સમયે થાય છે?,સાચું,ખોટું,,,B,પ્રકાશસંશ્લેષણ ફક્ત સૂર્યપ્રકાશની હાજરીમાં જ થાય છે,easy\n`;
      rows += `10,Science,Life Processes,FillBlank,Gujarati,હૃદયના ઉપરના ખંડોને _________ કહે છે.,કર્ણકો,ક્ષેપકો,વાલ્વ,મહાધમની,A,ઉપરના બે ખંડો કર્ણકો અને નીચેના બે ખંડો ક્ષેપકો છે,medium\n`;
      rows += `10,Science,Life Processes,MatchFollowing,Gujarati,"યોગ્ય જોડકા જોડો: (1) કલોરોફિલ (2) લાળગ્રંથિ (3) જઠર - (X) એમાયલેઝ (Y) પેપ્સીન (Z) રંજકદ્રવ્ય","1-Z, 2-X, 3-Y","1-X, 2-Y, 3-Z","1-Y, 2-Z, 3-X","1-Z, 2-Y, 3-X",A,કલોરોફિલ રંજકદ્રવ્ય છે, લાળગ્રંથિ એમાયલેઝ સ્ત્રવે છે અને જઠર પેપ્સીન સ્ત્રવે છે,hard\n`;
    }
    const csvContent = "\ufeff" + headers + rows;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sample_questions_${medium.toLowerCase()}_formats.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`${medium} માધ્યમ ફાઇલ ડાઉનલોડ થઈ ગઈ છે!`);
  };

  const aiPromptText = `You are a professional educational material writer. Generate balanced educational questions spanning multiple formats: Multiple Choice (MCQ), True/False (TrueFalse), Fill-in-the-blanks (FillBlank), and Match the Columns (MatchFollowing - jodka). Output the result strictly in raw CSV format (using double quotes for text where necessary, and no markdown wrapping or text before/after).

The CSV must contain these exact headers:
Standard,Subject,Chapter,Type,Medium,Question,Option A,Option B,Option C,Option D,Correct Answer,Explanation,Difficulty

Rules for different formats:
1. MCQ: Normal question with 4 choices (Option A, B, C, D).
2. TrueFalse: Statement in the Question. Option A must be "સાચું" (or True), Option B "ખોટું" (or False). Option C and D must be kept empty. Correct Answer is A or B.
3. FillBlank: Use "_________" inside the Question string. Provide options. Correct Answer is the option letter with correct word.
4. MatchFollowing (Jodka Jogo): List items in Question like "જોડકા જોડો: (1) કલોરોફિલ (2) જઠર - (X) પેપ્સીન (Y) રંજકદ્રવ્ય". In options, draft matching combinations like "1-Y, 2-X", "1-X, 2-Y" etc. Option A must be correct answer combo.

Example Gujarati Rows:
10,Science,Life Processes,MCQ,Gujarati,"પ્રકાશસંશ્લેષણ મુખ્યત્વે વનસ્પતિના કયા અંગ દ્વારા થાય છે?","મૂળ","ફળ","પર્ણ","પ્રકાંડ","C","પ્રકાશસંશ્લેષણ પર્ણમાં આવેલા કલોરોફિલની મદદથી થાય છે","medium"
10,Science,Life Processes,TrueFalse,Gujarati,"હૃદયના ડાબા કર્ણકમાં ઓક્સિજનયુક્ત રુધિર આવે છે.","સાચું","ખોટું",,,A,"ફેફસામાંથી ઓક્સિજનયુક્ત રુધિર સૌપ્રથમ ડાબા કર્ણકમાં આવે છે","easy"
10,Science,Life Processes,FillBlank,Gujarati,"મનુષ્યની લાળગ્રંથિમાંથી _________ ઉત્સેચક સ્ત્રવે છે.","પેપ્સીન","ટ્રિપ્સીન","એમાયલેઝ","લિપેઝ","C","લાળરસમાં એમાયલેઝ નામનો ઉત્સેચક હોય છે","medium"
10,Science,Life Processes,MatchFollowing,Gujarati,"જોડકા જોડો: (1) ધમની (2) શિરા - (X) શુદ્ધ રુધિર (Y) અશુદ્ધ રુધિર","1-X, 2-Y","1-Y, 2-X","1-X, 2-X","1-Y, 2-Y",A,"ધમની શુદ્ધ રુધિરનું વહન કરે છે અને શિરા અશુદ્ધ રુધિરનું વહન કરે છે","hard"

Example English Rows:
10,Science,Life Processes,MCQ,English,"Which plant organ is primary for photosynthesis?","Roots","Fruits","Leaves","Stem","C","Photosynthesis occurs primary in leaves.","medium"
10,Science,Life Processes,TrueFalse,English,"The left atrium of heart receives deoxygenated blood.","True","False",,,B,"The left atrium receives oxygenated blood from lungs.","easy"
10,Science,Life Processes,FillBlank,English,"Saliva contains an enzyme called salivary _________.","Pepsin","Trypsin","Amylase","Lipase","C","Salivary amylase breaks down starch.","medium"
10,Science,Life Processes,MatchFollowing,English,"Match: (1) Artery (2) Vein - (X) Pure Blood (Y) Impure Blood","1-X, 2-Y","1-Y, 2-X","1-X, 2-X","1-Y, 2-Y",A,"Arteries carry pure blood and veins carry impure blood.","hard"

Important: Output strictly valid raw CSV text with headers. No markdown block wraps.`;

  const copyAiPrompt = () => {
    navigator.clipboard.writeText(aiPromptText);
    setCopiedPrompt(true);
    toast.success("AI Prompt ક્લિપબોર્ડ પર કોપી થઈ ગઈ છે!");
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

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
    medium?: string;
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

    const qMedium = q.medium || "Gujarati";
    const bundleKey = `${standard}_${q.subjectId}_${q.chapterId}_${qMedium}`;

    if (!bundlesMap[bundleKey]) {
      bundlesMap[bundleKey] = {
        standard,
        medium: qMedium,
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

  // Extract unique owner admins for filtering (for Super Admin)
  const uniqueOwners = React.useMemo(() => {
    const ownersMap: Record<string, string> = {};
    questions.forEach(q => {
      if (q.ownerAdminId) {
        ownersMap[q.ownerAdminId] = q.ownerAdminName || "Unknown Admin";
      }
    });
    return Object.entries(ownersMap).map(([id, name]) => ({ id, name }));
  }, [questions]);

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

    // Filters search, standard selection & owner selection
    const matchStandard = filterStd === "All" || b.standard === filterStd;
    const matchOwner = filterOwnerId === "All" || b.questions.some(q => q.ownerAdminId === filterOwnerId);
    const matchText = searchQuery === "" || 
      b.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      b.chapterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.standard.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStandard && matchOwner && matchText;
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
      } else if (nh === "medium" || nh === "lang" || nh === "language" || h.includes("માધ્યમ")) {
        map["medium"] = h;
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

        let rowMedium = "Gujarati"; // Default to Gujarati
        if (headerMap["medium"]) {
          const mVal = (rowObj[headerMap["medium"]] || "").trim().toLowerCase();
          if (mVal.startsWith("eng") || mVal === "e") {
            rowMedium = "English";
          } else if (mVal.startsWith("guj") || mVal === "g") {
            rowMedium = "Gujarati";
          } else if (mVal.startsWith("hin") || mVal === "h") {
            rowMedium = "Hindi";
          } else if (mVal) {
            rowMedium = mVal.charAt(0).toUpperCase() + mVal.slice(1);
          }
        } else {
          // Intelligent language detection: Gujarati (or other Indic languages) letters check
          const hasGujarati = /[\u0a80-\u0aff]/.test(questionText);
          if (!hasGujarati && /[a-zA-Z]{5,}/.test(questionText)) {
            rowMedium = "English";
          }
        }

        let qType: "MCQ" | "TrueFalse" | "FillBlank" | "MatchFollowing" = "MCQ";
        if (headerMap["questionType"]) {
          const tVal = (rowObj[headerMap["questionType"]] || "").trim().toLowerCase();
          if (tVal.includes("true") || tVal.includes("false") || tVal === "tf" || tVal.includes("ખરા") || tVal.includes("ખોટા") || tVal.includes("ખરા-ખોટા") || tVal.includes("ખરા ખોટા")) {
            qType = "TrueFalse";
          } else if (tVal.includes("blank") || tVal.includes("fill") || tVal === "fb" || tVal.includes("ખાલી") || tVal.includes("જગ્યા")) {
            qType = "FillBlank";
          } else if (tVal.includes("match") || tVal.includes("following") || tVal === "mf" || tVal.includes("જોડકા") || tVal.includes("જોડો")) {
            qType = "MatchFollowing";
          }
        } else {
          // Auto-detect based on option strings or blanks
          const aLower = optA.toLowerCase().trim();
          const bLower = optB.toLowerCase().trim();
          if (
            aLower === "true" || aLower === "false" ||
            aLower === "yes" || aLower === "no" ||
            aLower === "સાચું" || aLower === "ખોટું" ||
            aLower === "સાચુ" || aLower === "ખોટુ" ||
            aLower === "ખરું" || aLower === "ખોટું"
          ) {
            qType = "TrueFalse";
          } else if (questionText.includes("______") || questionText.includes("ખાલી જગ્યા")) {
            qType = "FillBlank";
          }
        }

        if (questionText.trim()) {
          items.push({
            standard: std,
            subject: cleanedSubject,
            chapter: cleanedChapter,
            question: questionText.trim(),
            optionA: optA.trim() || (qType === "TrueFalse" ? "સાચું" : "Option A"),
            optionB: optB.trim() || (qType === "TrueFalse" ? "ખોટું" : "Option B"),
            optionC: qType === "TrueFalse" ? "" : (optC.trim() || "Option C"),
            optionD: qType === "TrueFalse" ? "" : (optD.trim() || "Option D"),
            correctAnswer: ["A", "B", "C", "D"].includes(correct) ? correct : "A",
            explanation: expl.trim(),
            difficulty: ["easy", "medium", "hard"].includes(diff) ? diff : "medium",
            medium: rowMedium,
            questionType: qType
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
          medium: item.medium || "Gujarati",
          questionType: item.questionType || "MCQ",
          active: true,
          verified: true,
          approvalStatus: "approved",
          ownerAdminId: currentUser?.uid || "admin",
          ownerAdminName: currentUser?.fullName || "Admin",
          createdByUid: currentUser?.uid || "admin",
          createdAt: new Date().toISOString(),
          createdBy: currentUser?.uid || "admin",
          source: item.source || "CSV Import"
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
      ownerAdminId: isEdit ? (editingQuestion.ownerAdminId || currentUser?.uid || "admin") : (currentUser?.uid || "admin"),
      ownerAdminName: isEdit ? (editingQuestion.ownerAdminName || currentUser?.fullName || "Admin") : (currentUser?.fullName || "Admin"),
      createdByUid: isEdit ? (editingQuestion.createdByUid || currentUser?.uid || "admin") : (currentUser?.uid || "admin"),
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
        standard: activeBundle.standard,
        medium: activeBundle.medium || "Gujarati"
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
      
      {/* AI MULTI-MODAL QUESTION GENERATOR ZONE */}
      {currentUser && (
        (currentUser.role || "").toLowerCase().trim() === "admin" || 
        (currentUser.role || "").toLowerCase().trim() === "super_admin" || 
        (currentUser.role || "").toLowerCase().trim() === "teacher"
      ) && (
        <div className="bg-gradient-to-r from-violet-600/10 via-purple-600/5 to-pink-600/10 border border-purple-500/30 rounded-3xl p-6 shadow-md space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-2 border-b border-purple-500/10">
            <div className="space-y-1 text-center md:text-left">
              <h3 className="text-base font-extrabold text-purple-900 dark:text-purple-400 flex items-center justify-center md:justify-start gap-2">
                <Sparkles className="size-5 text-purple-600 animate-pulse" /> AI મલ્ટી-મોડલ ક્વેશ્ચન જનરેટર (AI Question Generator Engine)
              </h3>
              <p className="text-xs text-muted-foreground max-w-xl">
                તમારી પીડીએફ દસ્તાવેજ અથવા પુસ્તકના પાનાની તસવીરો (Images) માંથી આપમેળે સચોટ પ્રશ્નો બનાવો. Gemini AI ફક્ત અપલોડેડ સામગ્રીમાંથી જ પ્રશ્નો બનાવશે.
              </p>
            </div>
            
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setAiFileType("pdf");
                  setAiSelectedFiles([]);
                  setShowAiModal(true);
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs transition active:scale-[0.98] shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="size-4" /> AI Generate from PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  setAiFileType("image");
                  setAiSelectedFiles([]);
                  setShowAiModal(true);
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold rounded-xl text-xs transition active:scale-[0.98] shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Layers className="size-4" /> AI Generate from Images
              </button>
            </div>
          </div>
        </div>
      )}

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

        {/* Sample Templates & AI Prompt Helper Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-teal-500/5 dark:bg-teal-500/10 border border-teal-500/20 p-4 rounded-2xl text-xs">
          <div className="space-y-2">
            <p className="font-extrabold text-teal-800 dark:text-teal-400 flex items-center gap-1.5">
              <Download className="size-4 text-teal-600" /> નમૂનારૂપ એક્સેલ/CSV ડાઉનલોડ કરો (Download Sample Templates)
            </p>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              અમારી પાસે ગુજરાતી અને અંગ્રેજી માધ્યમની સેમ્પલ CSV ફાઇલો તૈયાર છે. આ ફાઇલ ડાઉનલોડ કરી તેનો ક્રમ અને હેડર્સ સમજી શકો છો.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => downloadSampleCSV("Gujarati")}
                className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 active:scale-[0.98] transition text-white font-bold rounded-lg flex items-center gap-1 text-[11px] cursor-pointer shadow-xs"
              >
                <Download className="size-3.5" /> ગુજરાતી માધ્યમ સેમ્પલ (.csv)
              </button>
              <button
                type="button"
                onClick={() => downloadSampleCSV("English")}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition text-white font-bold rounded-lg flex items-center gap-1 text-[11px] cursor-pointer shadow-xs"
              >
                <Download className="size-3.5" /> English Sample (.csv)
              </button>
            </div>
          </div>

          <div className="space-y-2 border-t md:border-t-0 md:border-l border-teal-500/20 pt-3 md:pt-0 md:pl-4">
            <div className="flex items-center gap-1.5 justify-between">
              <p className="font-extrabold text-teal-800 dark:text-teal-400 flex items-center gap-1.5">
                <Sparkles className="size-4 text-emerald-600 animate-pulse" /> AI પ્રશ્ન પ્રોમ્પ્ટ સહાયક (AI Prompt Copier)
              </p>
              <button
                type="button"
                onClick={copyAiPrompt}
                className="text-[10px] bg-teal-600/10 dark:bg-teal-400/10 hover:bg-teal-600 hover:text-white transition text-teal-700 dark:text-teal-300 px-2.5 py-1 rounded-md font-extrabold border border-teal-500/30 flex items-center gap-1 cursor-pointer"
              >
                {copiedPrompt ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                {copiedPrompt ? "કોપી થઈ ગઈ!" : "કોપી કરો"}
              </button>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Gemini કે ChatGPT માંથી નવો પ્રશ્ન સંગ્રહ સીધો મેળવવા માટે આ પ્રોમ્પ્ટ કોપી કરી AI ને આપો. તે ઓટોમેટિકલી ગુજરાતી/અંગ્રેજી માધ્યમ અનુસાર પરફેક્ટ હેડર્સ સાથે પ્રશ્નો આપશે!
            </p>
            <div className="relative bg-black/5 dark:bg-black/20 p-2.5 rounded-lg border border-border font-mono text-[9px] text-muted-foreground select-all h-16 overflow-y-auto leading-normal">
              {aiPromptText}
            </div>
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

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {(((currentUser?.role || "").toLowerCase().trim() === "super_admin" || (currentUser?.role || "").toLowerCase().trim() === "admin")) && uniqueOwners.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] whitespace-nowrap uppercase tracking-wider font-bold text-muted-foreground">Owner:</span>
              <select
                value={filterOwnerId}
                onChange={(e) => setFilterOwnerId(e.target.value)}
                className="px-3 py-2 bg-muted/60 border border-border rounded-xl text-xs font-semibold focus:outline-none"
              >
                <option value="All">All Owners</option>
                {uniqueOwners.map(owner => (
                  <option key={owner.id} value={owner.id}>{owner.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5">
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
          </div>
          
          <button 
            onClick={() => onRefresh()}
            className="p-2 bg-primary-soft hover:bg-primary/20 text-primary rounded-xl active:scale-[0.95] transition cursor-pointer"
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
                <th className="py-4 px-6">Medium</th>
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
                  <td colSpan={7} className="py-16 text-center text-muted-foreground">
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
                    key={`${bundle.standard}_${bundle.subjectId}_${bundle.chapterId}_${bundle.medium || "Gujarati"}`}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors"
                  >
                    <td className="py-4 px-6 text-center">
                      <span className="bg-teal-500/10 text-teal-700 dark:text-teal-400 font-extrabold px-3 py-1 rounded-xl text-xs inline-block">
                        {bundle.standard}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block ${
                        bundle.medium === "English" 
                          ? "bg-blue-500/10 text-blue-700 dark:text-blue-400" 
                          : bundle.medium === "Hindi"
                          ? "bg-purple-500/10 text-purple-700 dark:text-purple-400"
                          : "bg-teal-500/10 text-teal-700 dark:text-teal-400"
                      }`}>
                        {bundle.medium || "Gujarati"}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-extrabold text-slate-800 dark:text-slate-100 text-[13px]">
                      <div>{bundle.subjectName}</div>
                      {(((currentUser?.role || "").toLowerCase().trim() === "super_admin" || (currentUser?.role || "").toLowerCase().trim() === "admin")) && (
                        <div className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold mt-0.5">
                          Owner: {bundle.questions[0]?.ownerAdminName || "System Migration"}
                        </div>
                      )}
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

      {/* MODAL 0: AI QUESTION GENERATOR INPUT FORM */}
      <AnimatePresence>
        {showAiModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-background border border-border rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => {
                  if (!isAiGenerating) {
                    setShowAiModal(false);
                    setAiSelectedFiles([]);
                  }
                }}
                className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full"
                type="button"
              >
                <X className="size-4" />
              </button>

              <div className="p-6 border-b border-border bg-gradient-to-r from-purple-500/10 to-pink-500/10 font-bold">
                <h3 className="text-base font-extrabold flex items-center gap-2 text-purple-700">
                  <Sparkles className="size-5 text-purple-600 animate-pulse" /> AI પ્રશ્ન નિર્માતા ({aiFileType === "pdf" ? "Gen from PDF" : "Gen from Images"})
                </h3>
                <p className="text-xs text-muted-foreground font-semibold mt-1">
                  नीચેની વિગતો ભરો અને ફાઇલ સબમિટ કરો. Gemini AI ફક્ત અપલોડ કરેલ દસ્તાવેજના આધારે જ પ્રશ્નો બનાવશે.
                </p>
              </div>

              <form onSubmit={handleAiGenerate} className="p-6 overflow-y-auto space-y-4 max-h-[60dvh] text-xs font-semibold">
                {/* File picker with Drag and Drop area */}
                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                    {aiFileType === "pdf" ? "PDF દસ્તાવેજ અપલોડ કરો" : "ઈમેજ ફાઇલ પસંદ કરો (મહત્તમ 8 લિમિટ)"}
                  </label>
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-purple-500/25 dark:border-purple-500/40 hover:border-purple-600 rounded-2xl p-5 bg-purple-500/5 hover:bg-purple-500/10 transition cursor-pointer text-center relative">
                    <Upload className="size-5 text-purple-600 mb-1.5" />
                    <span className="font-bold text-muted-foreground block text-[11px]">
                      {aiFileType === "pdf" && aiSelectedFiles.length > 0 
                        ? aiSelectedFiles[0].name 
                        : `અહીં ફાઇલ ખેંચો અથવા ક્લિક કરો (${aiFileType === "pdf" ? "Only .pdf" : ".jpg, .png, image/*"})`}
                    </span>
                    <span className="text-[9px] text-muted-foreground/60 block mt-0.5">
                      {aiFileType === "image" 
                        ? `પસંદ કરેલ: ${aiSelectedFiles.length}/8 ઇમેજ (મહત્તમ 15MB/ફાઇલ)` 
                        : "મહત્તમ ફાઇલ કદ: 15MB"}
                    </span>
                    <input
                      type="file"
                      multiple={aiFileType === "image"}
                      required={aiSelectedFiles.length === 0}
                      accept={aiFileType === "pdf" ? "application/pdf" : "image/*"}
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length === 0) return;

                        if (aiFileType === "pdf") {
                          const file = files[0];
                          if (!file.name.endsWith(".pdf")) {
                            toast.error("કૃપા કરીને ફક્ત પીડીએફ (.pdf) ફાઇલ પસંદ કરો.");
                            return;
                          }
                          setAiSelectedFiles([file]);
                        } else {
                          const validImages = files.filter(f => f.type.startsWith("image/"));
                          if (validImages.length === 0) {
                            toast.error("કૃપા કરીને ફક્ત ઈમેજ ફાઇલો પસંદ કરો.");
                            return;
                          }
                          if (aiSelectedFiles.length + validImages.length > 8) {
                            toast.error("મહત્તમ 8 ઇમેજ જ અપલોડ કરી શકાય છે.");
                            return;
                          }
                          setAiSelectedFiles((prev) => {
                            const newFiles = [...prev, ...validImages];
                            if (newFiles.length > 8) {
                              toast.error("મહત્તમ 8 ઇમેજ જ અપલોડ કરી શકાય છે.");
                              return prev;
                            }
                            return newFiles;
                          });
                        }
                      }}
                    />
                  </label>

                  {/* List of uploaded files with clear-all and delete button */}
                  {aiSelectedFiles.length > 0 && (
                    <div className="bg-purple-500/5 border border-purple-500/10 rounded-2xl p-3 space-y-1.5 max-h-[150px] overflow-y-auto">
                      <div className="flex justify-between items-center text-[10px] text-purple-700/80 uppercase border-b border-purple-500/10 pb-1">
                        <span>પસંદ કરેલ ફાઇલો ({aiSelectedFiles.length}/8)</span>
                        <button
                          type="button"
                          onClick={() => setAiSelectedFiles([])}
                          className="text-purple-600 hover:underline"
                        >
                          બધી સાફ કરો (Clear All)
                        </button>
                      </div>
                      <div className="space-y-1">
                        {aiSelectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-muted/60 px-3 py-1.5 rounded-xl text-xs font-medium">
                            <span className="truncate max-w-[80%] text-muted-foreground">
                              {index + 1}. {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setAiSelectedFiles((prev) => prev.filter((_, i) => i !== index));
                              }}
                              className="text-red-500 hover:text-red-700 transition"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Grid for Medium + Standard */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">માધ્યમ (Medium)</label>
                    <select
                      value={aiMedium}
                      onChange={(e) => setAiMedium(e.target.value as any)}
                      className="w-full bg-background border px-3 py-2.5 rounded-xl border-border"
                    >
                      <option value="Gujarati">Gujarati Medium</option>
                      <option value="English">English Medium</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">ધોરણ (Standard)</label>
                    <select
                      value={aiStandard}
                      onChange={(e) => setAiStandard(e.target.value)}
                      className="w-full bg-background border px-3 py-2.5 rounded-xl border-border font-bold"
                    >
                      {["5", "6", "7", "8", "9", "10", "11", "12"].map((std) => (
                        <option key={std} value={std}>Std {std}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Subject Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider block">વિષય (Subject)</label>
                    <button
                      type="button"
                      onClick={() => setAiCustomSubjectFlag(!aiCustomSubjectFlag)}
                      className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      {aiCustomSubjectFlag ? "✍️ લિસ્ટમાંથી પસંદ કરો" : "✍️ નવો વિષય બનાવો (New Subject)"}
                    </button>
                  </div>

                  {aiCustomSubjectFlag ? (
                    <input
                      type="text"
                      required
                      placeholder="દાખલા તરીકે: Science, Maths..."
                      value={aiCustomSubjectName}
                      onChange={(e) => setAiCustomSubjectName(e.target.value)}
                      className="w-full bg-background border px-3 py-2.5 rounded-xl border-purple-500/40 font-bold focus:border-purple-600"
                    />
                  ) : (
                    <select
                      value={aiSubjectSelector}
                      onChange={(e) => setAiSubjectSelector(e.target.value)}
                      className="w-full bg-background border px-3 py-2.5 rounded-xl border-border font-bold"
                    >
                      {getSubjectsByStandardAndMedium(aiStandard, aiMedium).map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Chapter Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider block">પ્રકરણ (Chapter)</label>
                    <button
                      type="button"
                      onClick={() => setAiCustomChapterFlag(!aiCustomChapterFlag)}
                      className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      {aiCustomChapterFlag ? "✍️ લિસ્ટમાંથી પસંદ કરો" : "✍️ નવું પ્રકરણ બનાવો (New Chapter)"}
                    </button>
                  </div>

                  {aiCustomChapterFlag ? (
                    <input
                      type="text"
                      required
                      placeholder="દાખલા તરીકે: CH-1 રાસાયણિક પ્રક્રિયાઓ..."
                      value={aiCustomChapterName}
                      onChange={(e) => setAiCustomChapterName(e.target.value)}
                      className="w-full bg-background border px-3 py-2.5 rounded-xl border-purple-500/40 font-bold focus:border-purple-600"
                    />
                  ) : (
                    <select
                      value={aiChapterSelector}
                      onChange={(e) => setAiChapterSelector(e.target.value)}
                      className="w-full bg-background border px-3 py-2.5 rounded-xl border-border font-bold"
                    >
                      {Array.from({ length: 30 }, (_, i) => `Ch-${i + 1}`).map((ch) => (
                        <option key={ch} value={ch}>{ch}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Question Type & Count */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">પ્રશ્ન પ્રકાર (Question Type)</label>
                    <select
                      value={aiQuestionType}
                      onChange={(e) => setAiQuestionType(e.target.value as any)}
                      className="w-full bg-background border px-3 py-2.5 rounded-xl border-border font-bold"
                    >
                      <option value="MCQ">MCQ (ચાર વિકલ્પો)</option>
                      <option value="True/False">સાચું / ખોટું (True/False)</option>
                      <option value="Fill Blank">ખાલી જગ્યા પૂરો (Fill Blank)</option>
                      <option value="Mixed">Mixed (બધા મિશ્ર પ્રશ્નો)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">પ્રશ્નોની સંખ્યા (Questions Count)</label>
                    <select
                      value={aiQuestionCount}
                      onChange={(e) => setAiQuestionCount(e.target.value)}
                      className="w-full bg-background border px-3 py-2.5 rounded-xl border-border font-extrabold text-teal-600"
                    >
                      <option value="10">10 પ્રશ્નો</option>
                      <option value="20">20 પ્રશ્નો</option>
                      <option value="40">40 પ્રશ્નો</option>
                      <option value="60">60 પ્રશ્નો</option>
                    </select>
                  </div>
                </div>
              </form>

              <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/20">
                <button
                  type="button"
                  disabled={isAiGenerating}
                  onClick={() => {
                    setShowAiModal(false);
                    setAiSelectedFiles([]);
                  }}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAiGenerating || aiSelectedFiles.length === 0}
                  onClick={handleAiGenerate}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md disabled:opacity-55 cursor-pointer"
                >
                  {isAiGenerating ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" /> પ્રશ્નો બનાવી રહ્યું છે...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5" /> પ્રશ્નો બનાવો (AI Generate)
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 1: PREVIEW CSV BEFORE SAVE */}
      <AnimatePresence>
        {showImportPreview && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-background border border-border rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl relative"
            >
              <button 
                onClick={() => setShowImportPreview(false)}
                className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full"
                type="button"
              >
                <X className="size-4" />
              </button>

              <div className="p-6 border-b border-border">
                <h3 className="text-base font-extrabold flex items-center gap-2 text-teal-600">
                  <CheckCircle2 className="size-5" /> પ્રશ્નો પૂર્વાવલોકન અને સંપાદન (Questions Preview & Editor)
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  ડેટા ચકાસો. તમે કોઈપણ ભૂલ હોય તો પ્રશ્નો, જવાબો અથવા વિકલ્પો સુધારી શકો છો અથવા જે પ્રશ્ન ઉપયોગી ન હોય તેને કાયમ માટે કાઢી શકો છો.
                </p>
              </div>

              {/* Scrollable grid of preview items */}
              <div className="p-6 overflow-y-auto space-y-4 max-h-[58dvh] text-xs">
                <div className="bg-teal-500/5 rounded-2xl p-4 border border-teal-500/10 space-y-2">
                  <p className="font-bold text-teal-800 dark:text-teal-400">શોધાયેલ વિષય અને ધોરણ લિસ્ટ (Detected Targets):</p>
                  <div className="flex flex-wrap gap-2 pt-1 font-semibold">
                    {Array.from(new Set(parsedItems.map(p => `Std ${p.standard} | ${p.subject} | ${p.chapter}`))).map((item, idx) => (
                      <span key={idx} className="bg-teal-500/10 text-teal-800 dark:text-teal-300 px-3 py-1 rounded-full text-[10px]">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {parsedItems.map((p, idx) => (
                    <div key={idx} className="border border-border/75 rounded-2xl p-4 space-y-3 relative bg-card shadow-xs">
                      
                      {/* Top Header Row within Card with Delete Option */}
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold border-b pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-teal-600 bg-teal-500/10 px-2 py-0.5 rounded-md">#{idx + 1}</span>
                          <span>Std {p.standard} | {p.medium || "Gujarati"} Medium</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeletePreviewItem(idx)}
                          className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 hover:text-rose-700 bg-rose-500/10 rounded-lg font-bold flex items-center gap-1 active:scale-[0.96] transition"
                        >
                          <Trash2 className="size-3" /> કાઢી નાખો (Delete)
                        </button>
                      </div>

                      {/* Question Content Input */}
                      <div>
                        <label className="text-[9px] text-muted-foreground block mb-0.5 uppercase tracking-wider font-bold">પ્રશ્નની વિગત (Question Text)</label>
                        <textarea
                          rows={2}
                          value={p.question}
                          onChange={(e) => handleUpdatePreviewItem(idx, { question: e.target.value })}
                          className="w-full bg-background border rounded-lg p-2 text-xs font-bold focus:border-teal-500 outline-none"
                        />
                      </div>

                      {/* Options & Choices Forms */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] text-muted-foreground block mb-0.5 font-bold">વિકલ્પ A (Option A)</label>
                          <input
                            type="text"
                            value={p.optionA}
                            onChange={(e) => handleUpdatePreviewItem(idx, { optionA: e.target.value })}
                            className="w-full bg-background border rounded-lg p-2 text-xs font-semibold focus:border-teal-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-muted-foreground block mb-0.5 font-bold">વિકલ્પ B (Option B)</label>
                          <input
                            type="text"
                            value={p.optionB}
                            onChange={(e) => handleUpdatePreviewItem(idx, { optionB: e.target.value })}
                            className="w-full bg-background border rounded-lg p-2 text-xs font-semibold focus:border-teal-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-muted-foreground block mb-0.5 font-bold">વિકલ્પ C (Option C - MCQ માટે)</label>
                          <input
                            type="text"
                            disabled={p.questionType === "TrueFalse"}
                            placeholder={p.questionType === "TrueFalse" ? "ખરા-ખોટામાં સક્રિય નથી" : "વિકલ્પ C ભરો"}
                            value={p.optionC}
                            onChange={(e) => handleUpdatePreviewItem(idx, { optionC: e.target.value })}
                            className="w-full bg-background disabled:bg-muted border rounded-lg p-2 text-xs font-semibold focus:border-teal-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-muted-foreground block mb-0.5 font-bold">વિકલ્પ D (Option D - MCQ માટે)</label>
                          <input
                            type="text"
                            disabled={p.questionType === "TrueFalse"}
                            placeholder={p.questionType === "TrueFalse" ? "ખરા-ખોટામાં સક્રિય નથી" : "વિકલ્પ D ભરો"}
                            value={p.optionD}
                            onChange={(e) => handleUpdatePreviewItem(idx, { optionD: e.target.value })}
                            className="w-full bg-background disabled:bg-muted border rounded-lg p-2 text-xs font-semibold focus:border-teal-500 outline-none"
                          />
                        </div>
                      </div>

                      {/* Correct Option selector (A, B, C, D) + Explanation & Difficulty */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                        <div>
                          <label className="text-[9px] text-muted-foreground block mb-1 uppercase tracking-wider font-extrabold text-teal-700">સાચો જવાબ (Correct Option):</label>
                          <div className="flex gap-1.5">
                            {["A", "B", "C", "D"].map((letter) => (
                              <button
                                key={letter}
                                type="button"
                                disabled={p.questionType === "TrueFalse" && (letter === "C" || letter === "D")}
                                onClick={() => handleUpdatePreviewItem(idx, { correctAnswer: letter })}
                                className={`size-8 rounded-lg font-extrabold text-xs border transition flex items-center justify-center cursor-pointer ${
                                  p.correctAnswer === letter
                                    ? "bg-teal-600 border-teal-600 text-white shadow-xs"
                                    : "hover:bg-muted font-medium text-muted-foreground"
                                }`}
                              >
                                {letter}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-[9px] text-muted-foreground block mb-0.5 font-bold">સમજૂતી (Explanation Details)</label>
                          <input
                            type="text"
                            value={p.explanation || ""}
                            onChange={(e) => handleUpdatePreviewItem(idx, { explanation: e.target.value })}
                            placeholder="સાચો વિકલ્પ હોવાનું શૈક્ષણિક કારણ..."
                            className="w-full bg-background border rounded-lg p-2 text-xs font-medium focus:border-teal-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/20">
                <button
                  type="button"
                  onClick={() => setShowImportPreview(false)}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCommitImport}
                  disabled={isCommitting || parsedItems.length === 0}
                  className="px-5 py-2.5 bg-teal-600 font-bold hover:bg-teal-700 text-white rounded-xl text-xs flex items-center gap-2 shadow-md cursor-pointer"
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
                  <h3 className="text-base font-extrabold line-clamp-1 flex flex-wrap items-center gap-2">
                    <span>{activeBundle.subjectName} — {activeBundle.chapterName}</span>
                    {(((currentUser?.role || "").toLowerCase().trim() === "super_admin" || (currentUser?.role || "").toLowerCase().trim() === "admin")) && (
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-teal-600 dark:text-teal-400 font-bold px-2 py-0.5 rounded-md border border-border inline-block">
                        Owner: {activeBundle.questions[0]?.ownerAdminName || "System Migration"}
                      </span>
                    )}
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
