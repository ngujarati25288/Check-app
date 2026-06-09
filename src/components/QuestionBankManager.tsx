import React, { useState, useEffect } from "react";
import { 
  PlusCircle, Search, Trash2, Edit3, CheckCircle2, XCircle, 
  AlertCircle, Upload, BookOpen, Layers, HelpCircle, Check, 
  Loader2, Eye, Sparkles, Filter, FileText, CheckCircle, RefreshCw, X, ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Question, Subject, Chapter, QuestionDifficulty, UserRole } from "@/types";
import { AdminRepository } from "@/lib/db";
import { toast } from "sonner";

interface QuestionBankManagerProps {
  subjects: Subject[];
  chapters: Chapter[];
  questions: Question[];
  onRefresh: () => void;
  currentUser: { uid: string; fullName: string; role: UserRole } | null;
}

export function QuestionBankManager({
  subjects,
  chapters,
  questions,
  onRefresh,
  currentUser
}: QuestionBankManagerProps) {
  // Navigation / Tabs
  const [managerView, setManagerView] = useState<"list" | "form" | "bulk">("list");
  
  // Single Entry Form State
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  
  // Fields
  const [questSubId, setQuestSubId] = useState("");
  const [questChapId, setQuestChapId] = useState("");
  const [questText, setQuestText] = useState("");
  const [questType, setQuestType] = useState<any>("MCQ");
  const [questA, setQuestA] = useState("");
  const [questB, setQuestB] = useState("");
  const [questC, setQuestC] = useState("");
  const [questD, setQuestD] = useState("");
  const [questCorrect, setQuestCorrect] = useState("");
  const [questExplanation, setQuestExplanation] = useState("");
  const [questDifficulty, setQuestDifficulty] = useState<QuestionDifficulty>("medium");
  const [questActive, setQuestActive] = useState(true);
  
  // Tracing & Source Metadata
  const [questSourceType, setQuestSourceType] = useState<any>("Textbook");
  const [questSourceBook, setQuestSourceBook] = useState("");
  const [questSourceChapter, setQuestSourceChapter] = useState("");
  const [questSourcePage, setQuestSourcePage] = useState("");
  const [questVerified, setQuestVerified] = useState(true);
  const [imageUrlString, setImageUrlString] = useState(""); // comma separated
  
  // AI Metadata
  const [questAiGenerated, setQuestAiGenerated] = useState(false);
  const [questHumanReviewed, setQuestHumanReviewed] = useState(true);
  const [questReviewScore, setQuestReviewScore] = useState("95");
  const [questApprovalStatus, setQuestApprovalStatus] = useState<any>("approved");

  // Filters state
  const [filterStd, setFilterStd] = useState<string>("All");
  const [filterSub, setFilterSub] = useState<string>("All");
  const [filterChap, setFilterChap] = useState<string>("All");
  const [filterDiff, setFilterDiff] = useState<string>("All");
  const [filterType, setFilterType] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Bulk Upload state
  const [bulkMode, setBulkMode] = useState<"CSV" | "JSON">("CSV");
  const [bulkInput, setBulkInput] = useState("");
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [bulkValidationErrors, setBulkValidationErrors] = useState<{ [key: number]: string[] }>({});
  const [isCommittingBulk, setIsCommittingBulk] = useState(false);

  // Auto select default subject & chapter if available
  useEffect(() => {
    if (subjects.length > 0 && !questSubId) {
      setQuestSubId(subjects[0].subjectId);
    }
  }, [subjects, questSubId]);

  useEffect(() => {
    const chapList = chapters.filter(c => c.subjectId === questSubId);
    if (chapList.length > 0) {
      setQuestChapId(chapList[0].chapterId);
    } else {
      setQuestChapId("");
    }
  }, [questSubId, chapters]);

  // Adjust correct answers automatically when switching type
  useEffect(() => {
    if (questType === "TrueFalse") {
      setQuestCorrect("True");
    } else if (questType === "MCQ" || questType === "MatchFollowing") {
      if (!questCorrect || !["A", "B", "C", "D"].includes(questCorrect)) {
        setQuestCorrect("A");
      }
    } else {
      // Free form text
      if (["A", "B", "C", "D", "True", "False"].includes(questCorrect)) {
        setQuestCorrect("");
      }
    }
  }, [questType]);

  // Handle set active values on edit
  const startEdit = (q: Question) => {
    setEditingQuestion(q);
    setQuestSubId(q.subjectId);
    setQuestChapId(q.chapterId);
    setQuestText(q.question);
    setQuestType(q.questionType || "MCQ");
    setQuestA(q.optionA || "");
    setQuestB(q.optionB || "");
    setQuestC(q.optionC || "");
    setQuestD(q.optionD || "");
    setQuestCorrect(q.correctAnswer || "");
    setQuestExplanation(q.explanation || "");
    setQuestDifficulty(q.difficulty);
    setQuestActive(q.active !== false);
    
    setQuestSourceType(q.sourceType || "Textbook");
    setQuestSourceBook(q.sourceBook || "");
    setQuestSourceChapter(q.sourceChapter || "");
    setQuestSourcePage(q.sourcePage ? String(q.sourcePage) : "");
    setQuestVerified(q.verified !== false);
    setImageUrlString(q.illustrationUrls ? q.illustrationUrls.join(", ") : q.illustrationUrl || "");
    
    setQuestAiGenerated(q.aiGenerated || false);
    setQuestHumanReviewed(q.humanReviewed !== false);
    setQuestReviewScore(q.reviewScore ? String(q.reviewScore) : "95");
    setQuestApprovalStatus(q.approvalStatus || "approved");
    
    setManagerView("form");
  };

  const resetForm = () => {
    setEditingQuestion(null);
    setQuestText("");
    setQuestA("");
    setQuestB("");
    setQuestC("");
    setQuestD("");
    setQuestCorrect(questType === "MCQ" ? "A" : questType === "TrueFalse" ? "True" : "");
    setQuestExplanation("");
    setQuestDifficulty("medium");
    setQuestActive(true);
    setQuestSourceBook("");
    setQuestSourceChapter("");
    setQuestSourcePage("");
    setQuestVerified(true);
    setImageUrlString("");
    setQuestAiGenerated(false);
    setQuestHumanReviewed(true);
    setQuestReviewScore("95");
    setQuestApprovalStatus("approved");
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questText.trim() || !questSubId || !questChapId) {
      toast.warning("પ્રશ્નની સામગ્રી, વિષય અને પ્રકરણ ફરજિયાત છે!");
      return;
    }

    if (questType === "MCQ" && (!questA.trim() || !questB.trim() || !questC.trim() || !questD.trim())) {
      toast.warning("MCQ પ્રકારના તમામ વિકલ્પો (A, B, C, D) ભરવા ફરજિયાત છે!");
      return;
    }

    let optionsArray: string[] = [];
    if (questType === "MCQ") {
      optionsArray = [questA, questB, questC, questD];
    } else if (questType === "TrueFalse") {
      optionsArray = ["True", "False"];
    } else if (questType === "MatchFollowing") {
      optionsArray = [questA, questB, questC, questD];
    }

    const matchedSub = subjects.find(s => s.subjectId === questSubId);
    const standardStr = matchedSub ? matchedSub.standard : "10";
    
    // Parse Illustration URLs
    const urls = imageUrlString
      .split(",")
      .map(u => u.trim())
      .filter(u => u.length > 0);

    const questionId = editingQuestion ? editingQuestion.questionId : "q_" + Date.now();

    const qPayload: Question = {
      questionId,
      subjectId: questSubId,
      chapterId: questChapId,
      question: questText,
      optionA: questType === "MCQ" || questType === "MatchFollowing" ? questA : questType === "TrueFalse" ? "True" : "",
      optionB: questType === "MCQ" || questType === "MatchFollowing" ? questB : questType === "TrueFalse" ? "False" : "",
      optionC: questType === "MCQ" || questType === "MatchFollowing" ? questC : "",
      optionD: questType === "MCQ" || questType === "MatchFollowing" ? questD : "",
      correctAnswer: questCorrect,
      explanation: questExplanation,
      difficulty: questDifficulty,
      illustrationUrls: urls,
      illustrationUrl: urls[0] || "",
      sourceType: questSourceType,
      sourceBook: questSourceBook,
      sourceChapter: questSourceChapter,
      sourcePage: questSourcePage ? Number(questSourcePage) : undefined,
      createdBy: currentUser?.uid || "admin",
      verified: questVerified,
      aiGenerated: questAiGenerated,
      humanReviewed: questHumanReviewed,
      reviewScore: Number(questReviewScore) || undefined,
      approvalStatus: questApprovalStatus,
      status: questActive ? "active" : "archived",
      
      // Secondary schema compliance
      standard: standardStr,
      questionType: questType,
      options: optionsArray,
      marks: 1,
      active: questActive,
    };

    try {
      if (editingQuestion) {
        await AdminRepository.updateQuestion(
          currentUser?.uid || "admin",
          currentUser?.fullName || "Admin",
          editingQuestion.questionId,
          qPayload
        );
        toast.success("પ્રશ્ન સફળતાપૂર્વક અપડેટ થયો!");
      } else {
        await AdminRepository.createQuestion(
          currentUser?.uid || "admin",
          currentUser?.fullName || "Admin",
          qPayload
        );
        toast.success("નવો પ્રશ્ન પ્રશ્નબેંકમાં ઉમેરાયો!");
      }
      resetForm();
      setManagerView("list");
      onRefresh();
    } catch (err: any) {
      console.error(err);
      toast.error("પ્રશ્ન સેવ કરવામાં મુશ્કેલી પડી.");
    }
  };

  const handleDelete = async (questionId: string) => {
    if (!window.confirm("શું તમે ખરેખર આ પ્રશ્નને કાયમી ધોરણે પ્રશ્નબેંકમાંથી કાઢી નાખવા માંગો છો?")) {
      return;
    }
    try {
      await AdminRepository.deleteQuestion(
        currentUser?.uid || "admin",
        currentUser?.fullName || "Admin",
        questionId
      );
      toast.success("પ્રશ્ન સફળતાપૂર્વક ડિલીટ કરાયો.");
      onRefresh();
    } catch (err) {
      toast.error("પ્રશ્ન ડિલીટ કરવામાં મુશ્કેલી પડી.");
    }
  };

  // Bulk Upload parsing with robust row-level validations!
  const validateBulkInput = () => {
    if (!bulkInput.trim()) {
      setParsedRows([]);
      setBulkValidationErrors({});
      return;
    }

    const rows: any[] = [];
    const errors: { [key: number]: string[] } = {};

    if (bulkMode === "JSON") {
      try {
        const parsed = JSON.parse(bulkInput);
        if (!Array.isArray(parsed)) {
          toast.error("JSON ઇનપુટ એરે હોવો જોઈએ!");
          return;
        }
        
        parsed.forEach((item, index) => {
          const rowErrors: string[] = [];
          
          if (!item.question || !item.question.trim()) {
            rowErrors.push("Question content is empty");
          }
          if (!item.subjectId) {
            rowErrors.push("Missing subjectId");
          }
          if (!item.chapterId) {
            rowErrors.push("Missing chapterId");
          }
          
          const type = item.questionType || "MCQ";
          if (type === "MCQ") {
            if (!item.optionA || !item.optionB || !item.optionC || !item.optionD) {
              rowErrors.push("MCQ question must provide optionA, optionB, optionC, and optionD");
            }
            if (!item.correctAnswer || !["A", "B", "C", "D"].includes(item.correctAnswer)) {
              rowErrors.push("MCQ correct answer must be 'A', 'B', 'C', or 'D'");
            }
          } else if (type === "TrueFalse") {
            if (!item.correctAnswer || !["True", "False"].includes(item.correctAnswer)) {
              rowErrors.push("Correct answer for True/False must be 'True' or 'False'");
            }
          } else {
            if (item.correctAnswer === undefined || item.correctAnswer === null) {
              rowErrors.push("Correct answer is required");
            }
          }

          rows.push({
            id: item.questionId || `q_bulk_${Date.now()}_${index}`,
            questionId: item.questionId || `q_bulk_${Date.now()}_${index}`,
            subjectId: item.subjectId || "",
            chapterId: item.chapterId || "",
            question: item.question || "",
            questionType: type,
            optionA: item.optionA || "",
            optionB: item.optionB || "",
            optionC: item.optionC || "",
            optionD: item.optionD || "",
            correctAnswer: String(item.correctAnswer || ""),
            explanation: item.explanation || "",
            difficulty: item.difficulty || "medium",
            sourceBook: item.sourceBook || "",
            sourceChapter: item.sourceChapter || "",
            sourcePage: item.sourcePage || "",
            sourceType: item.sourceType || "Textbook",
            approvalStatus: item.approvalStatus || "approved",
          });

          if (rowErrors.length > 0) {
            errors[index] = rowErrors;
          }
        });
      } catch (err: any) {
        toast.error(`JSON પર્સિંગ નિષ્ફળ: ${err.message}`);
        return;
      }
    } else {
      // Parse CSV
      const lines = bulkInput.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) {
        toast.error("CSVમાં ઓછામાં ઓછી હેડર લાઇન અને એક લાઇન હોવી જોઈએ!");
        return;
      }

      const headers = lines[0].split(",").map(h => h.trim().replace(/['"']/g, ""));
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Split with care for quotes or just standard comma
        const values: string[] = [];
        let cur = "";
        let inQuotes = false;
        
        for (let charIndex = 0; charIndex < line.length; charIndex++) {
          const char = line[charIndex];
          if (char === '"' || char === "'") {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            values.push(cur.trim());
            cur = "";
          } else {
            cur += char;
          }
        }
        values.push(cur.trim());

        const rowObj: any = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] !== undefined ? values[idx].replace(/^["']|["']$/g, "") : "";
        });

        const rowErrors: string[] = [];
        if (!rowObj.question) {
          rowErrors.push("Question is empty");
        }
        if (!rowObj.subjectId) {
          rowErrors.push("Missing subjectId");
        }
        if (!rowObj.chapterId) {
          rowErrors.push("Missing chapterId");
        }

        const type = rowObj.questionType || "MCQ";
        if (type === "MCQ") {
          if (!rowObj.optionA || !rowObj.optionB || !rowObj.optionC || !rowObj.optionD) {
            rowErrors.push("MCQ option columns must have valid values");
          }
          if (!rowObj.correctAnswer || !["A", "B", "C", "D"].includes(rowObj.correctAnswer)) {
            rowErrors.push("MCQ correct answer must be 'A', 'B', 'C', or 'D'");
          }
        } else if (type === "TrueFalse") {
          if (!rowObj.correctAnswer || !["True", "False"].includes(rowObj.correctAnswer)) {
            rowErrors.push("True/False correctAnswer must be 'True' or 'False'");
          }
        }

        rows.push({
          id: rowObj.questionId || `q_bulk_${Date.now()}_${i}`,
          questionId: rowObj.questionId || `q_bulk_${Date.now()}_${i}`,
          subjectId: rowObj.subjectId || "",
          chapterId: rowObj.chapterId || "",
          question: rowObj.question || "",
          questionType: type,
          optionA: rowObj.optionA || "",
          optionB: rowObj.optionB || "",
          optionC: rowObj.optionC || "",
          optionD: rowObj.optionD || "",
          correctAnswer: rowObj.correctAnswer || "",
          explanation: rowObj.explanation || "",
          difficulty: rowObj.difficulty || "medium",
          sourceBook: rowObj.sourceBook || "",
          sourceChapter: rowObj.sourceChapter || "",
          sourcePage: rowObj.sourcePage || "",
          sourceType: rowObj.sourceType || "Textbook",
          approvalStatus: rowObj.approvalStatus || "approved",
        });

        if (rowErrors.length > 0) {
          errors[i - 1] = rowErrors;
        }
      }
    }

    setParsedRows(rows);
    setBulkValidationErrors(errors);
    toast.success(`વિશ્લેષણ સંપન્ન: ${rows.length} રેકોર્ડ પર્સ થયા, મહેરબાની કરીને પરિણામ ચકાસો.`);
  };

  const handleCommitBulk = async () => {
    const errorCount = Object.keys(bulkValidationErrors).length;
    if (errorCount > 0) {
      if (!window.confirm(`સાવચેતી: પાસ્ટ કરેલા ડેટામાં ${errorCount} પ્રશ્નોમાં ખામીઓ છે. શું તમે ફક્ત સાચા પ્રશ્નો અપલોડ કરવા માંગો છો?`)) {
        return;
      }
    }

    const validQuestions: Question[] = [];
    parsedRows.forEach((row, idx) => {
      if (!bulkValidationErrors[idx]) {
        const matchedSub = subjects.find(s => s.subjectId === row.subjectId);
        const standardStr = matchedSub ? matchedSub.standard : "10";
        
        let opts: string[] = [];
        if (row.questionType === "MCQ") {
          opts = [row.optionA, row.optionB, row.optionC, row.optionD];
        } else if (row.questionType === "TrueFalse") {
          opts = ["True", "False"];
        }

        validQuestions.push({
          questionId: row.questionId || "q_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
          subjectId: row.subjectId,
          chapterId: row.chapterId,
          question: row.question,
          optionA: row.optionA,
          optionB: row.optionB,
          optionC: row.optionC,
          optionD: row.optionD,
          correctAnswer: row.correctAnswer,
          explanation: row.explanation,
          difficulty: row.difficulty as QuestionDifficulty,
          sourceType: row.sourceType as any,
          sourceBook: row.sourceBook,
          sourceChapter: row.sourceChapter,
          sourcePage: row.sourcePage ? Number(row.sourcePage) : undefined,
          createdBy: currentUser?.uid || "admin",
          verified: true,
          approvalStatus: row.approvalStatus || "approved",
          status: "active",
          standard: standardStr,
          questionType: row.questionType,
          options: opts,
          marks: 1,
          active: true,
        });
      }
    });

    if (validQuestions.length === 0) {
      toast.error("અપલોડ કરવા લાયક કોઈ સાચો રેકોર્ડ નથી!");
      return;
    }

    try {
      setIsCommittingBulk(true);
      await AdminRepository.bulkUploadQuestions(
        currentUser?.uid || "admin",
        currentUser?.fullName || "Admin",
        validQuestions
      );
      toast.success(`${validQuestions.length} પ્રશ્નો સફળતાપૂર્વક પ્રશ્નબેંકમાં સ્ટોર કરાયા!`);
      setBulkInput("");
      setParsedRows([]);
      setBulkValidationErrors({});
      setManagerView("list");
      onRefresh();
    } catch (err) {
      toast.error("જથ્થાબંધ અપલોડ નિષ્ફળ રહ્યો.");
    } finally {
      setIsCommittingBulk(false);
    }
  };

  // Filtered list computed
  const filteredQuestions = questions.filter(q => {
    // Standard Filter
    if (filterStd !== "All" && q.standard !== filterStd) return false;
    
    // Subject Filter
    if (filterSub !== "All" && q.subjectId !== filterSub) return false;
    
    // Chapter Filter
    if (filterChap !== "All" && q.chapterId !== filterChap) return false;
    
    // Difficulty Filter
    if (filterDiff !== "All" && q.difficulty !== filterDiff) return false;

    // Type Filter
    if (filterType !== "All" && q.questionType !== filterType) return false;

    // Approval Pipeline Tab Filter
    if (filterStatus !== "All" && q.approvalStatus !== filterStatus) return false;

    // Search query constraint
    if (searchQuery.trim()) {
      const s = searchQuery.toLowerCase();
      const matchText = (q.question || "").toLowerCase();
      const matchA = (q.optionA || "").toLowerCase();
      const matchB = (q.optionB || "").toLowerCase();
      const matchBook = (q.sourceBook || "").toLowerCase();
      return matchText.includes(s) || matchA.includes(s) || matchB.includes(s) || matchBook.includes(s);
    }

    return true;
  });

  const activeChaptersFiltered = chapters.filter(c => filterSub === "All" || c.subjectId === filterSub);

  return (
    <div className="space-y-6">
      
      {/* Tab Control Bars */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/30 p-3 rounded-2xl border">
        <div className="flex bg-muted p-1 rounded-xl">
          <button
            onClick={() => { setManagerView("list"); resetForm(); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${managerView === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            📋 પ્રશ્ન ભંડાર (Content List)
          </button>
          <button
            onClick={() => setManagerView("form")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${managerView === "form" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {editingQuestion ? "✏️ પ્રશ્ન સંપાદન (Edit)" : "➕ નવો પ્રશ્ન (Single Entry)"}
          </button>
          <button
            onClick={() => setManagerView("bulk")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${managerView === "bulk" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            ⚡ બલ્ક અપલોડર (Excel / CSV)
          </button>
        </div>

        {managerView === "list" && (
          <div className="text-xs text-muted-foreground font-semibold">
            કુલ પ્રશ્નો: <span className="text-teal-600 font-extrabold">{questions.length}</span> • ફિલ્ટર કરેલ: <span className="text-indigo-600 font-extrabold">{filteredQuestions.length}</span>
          </div>
        )}
      </div>

      {/* VIEW 1: QUESTIONS FILTERABLE GRID/LIST */}
      {managerView === "list" && (
        <div className="space-y-4 animate-fadeIn">
          
          {/* Advanced Multi-Selector Filters */}
          <div className="bg-card border rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border/60">
              <Filter className="size-4 text-teal-600" />
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-teal-700">સંકલિત ફિલ્ટર્સ (Question Filters)</h4>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs font-semibold">
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">ધોરણ (Class)</label>
                <select
                  value={filterStd}
                  onChange={(e) => setFilterStd(e.target.value)}
                  className="w-full h-10 px-2 bg-muted/40 rounded-xl border outline-none text-xs"
                >
                  <option value="All">All standards</option>
                  <option value="7">Standard 7</option>
                  <option value="8">Standard 8</option>
                  <option value="9">Standard 9</option>
                  <option value="10">Standard 10</option>
                  <option value="11">Standard 11</option>
                  <option value="12">Standard 12</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">વિષય (Subject)</label>
                <select
                  value={filterSub}
                  onChange={(e) => {
                    setFilterSub(e.target.value);
                    setFilterChap("All");
                  }}
                  className="w-full h-10 px-2 bg-muted/40 rounded-xl border outline-none text-xs"
                >
                  <option value="All">All Subjects</option>
                  {subjects.map(s => (
                    <option key={s.subjectId} value={s.subjectId}>{s.subjectName} (Std {s.standard})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">પ્રકરણ (Chapter)</label>
                <select
                  value={filterChap}
                  onChange={(e) => setFilterChap(e.target.value)}
                  className="w-full h-10 px-2 bg-muted/40 rounded-xl border outline-none text-xs"
                >
                  <option value="All">All Chapters</option>
                  {activeChaptersFiltered.map(c => (
                    <option key={c.chapterId} value={c.chapterId}>{c.chapterName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">કાઠિણ્યતા (Difficulty)</label>
                <select
                  value={filterDiff}
                  onChange={(e) => setFilterDiff(e.target.value)}
                  className="w-full h-10 px-2 bg-muted/40 rounded-xl border outline-none text-xs"
                >
                  <option value="All">All Levels</option>
                  <option value="easy">Easy (સરળ)</option>
                  <option value="medium">Medium (મધ્યમ)</option>
                  <option value="hard">Hard (અઘરું)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">પ્રકાર (Type)</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full h-10 px-2 bg-muted/40 rounded-xl border outline-none text-xs"
                >
                  <option value="All">All MCQ types</option>
                  <option value="MCQ">MCQ</option>
                  <option value="TrueFalse">True / False</option>
                  <option value="FillBlank">Fill in the Blank</option>
                  <option value="MatchFollowing">Match Following</option>
                  <option value="OneWordAnswer">One Word Answer</option>
                  <option value="ShortAnswer">Short Answer</option>
                  <option value="LongAnswer">Long Answer</option>
                  <option value="ImageBasedQuestion">Image-Based Qs</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">મંજૂરી પાઈપલાઈન (Workflow)</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full h-10 px-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 rounded-xl border border-indigo-200 outline-none text-xs"
                >
                  <option value="All">All States</option>
                  <option value="draft">Draft (ડ્રાફ્ટ)</option>
                  <option value="pending_review">Pending Review (બાકી)</option>
                  <option value="approved">Approved (મંજૂર)</option>
                  <option value="rejected">Rejected (નામંજૂર)</option>
                </select>
              </div>
            </div>

            {/* Keyword Search Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="size-4 text-muted-foreground" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="પ્રશ્ન લખાણ અથવા સંદર્ભ પુસ્તક દ્વારા સર્ચ કરો..."
                className="w-full h-10 pl-10 pr-4 bg-muted/30 border border-border rounded-xl text-xs outline-none focus:border-teal-500 font-semibold"
              />
            </div>
          </div>

          {/* List Display Container */}
          <div className="space-y-3">
            {filteredQuestions.length === 0 ? (
              <div className="bg-card border border-dashed rounded-3xl p-12 text-center text-muted-foreground">
                <HelpCircle className="size-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm font-semibold">મેળ ખાતા કોઈ પ્રશ્નો મળ્યા નથી.</p>
                <p className="text-xs mt-1">ફિલ્ટર્સ ચેન્જ કરો અથવા નવો પ્રશ્ન ઉમેરો.</p>
              </div>
            ) : (
              filteredQuestions.map((q, idx) => {
                const sub = subjects.find(s => s.subjectId === q.subjectId);
                const chap = chapters.find(c => c.chapterId === q.chapterId);
                
                return (
                  <div 
                    key={q.questionId} 
                    className="bg-card border border-border/80 hover:border-teal-500/50 rounded-3xl p-5 shadow-sm transition-all relative overflow-hidden"
                  >
                    {/* Badge header strip */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-extrabold uppercase mb-3">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="px-2.5 py-1 bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 rounded-full">
                          Std {q.standard || sub?.standard || "?"}
                        </span>
                        <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 rounded-full max-w-40 truncate">
                          {sub?.subjectName || "Subject Details"}
                        </span>
                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full max-w-40 truncate">
                          {chap?.chapterName || "Chapter Details"}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full ${
                          q.difficulty === "hard" ? "bg-red-100 text-red-600 dark:bg-red-950/40" : 
                          q.difficulty === "medium" ? "bg-amber-100 text-amber-600 dark:bg-amber-950/40" : 
                          "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40"
                        }`}>
                          {q.difficulty}
                        </span>
                        <span className="px-2.5 py-1 bg-cyan-100 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 rounded-full">
                          {q.questionType || "MCQ"}
                        </span>
                      </div>

                      {/* Approval Status indicators */}
                      <div className="flex items-center gap-1.5 font-sans">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] tracking-wider uppercase font-bold ${
                          q.approvalStatus === "approved" ? "bg-emerald-500/10 text-emerald-600" :
                          q.approvalStatus === "rejected" ? "bg-red-500/10 text-red-600" :
                          q.approvalStatus === "pending_review" ? "bg-blue-500/10 text-blue-600" :
                          "bg-slate-500/10 text-slate-600"
                        }`}>
                          ● {q.approvalStatus || "approved"}
                        </span>
                      </div>
                    </div>

                    {/* Question Content */}
                    <div className="text-sm font-semibold text-foreground leading-relaxed pr-24">
                      {q.question}
                    </div>

                    {/* MCQs Preview */}
                    {(q.questionType === "MCQ" || !q.questionType) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 text-xs font-semibold font-sans">
                        <div className={`p-2.5 rounded-xl border ${q.correctAnswer === "A" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300" : "bg-muted/30"}`}>
                          <span className="font-extrabold text-muted-foreground mr-1">A.</span> {q.optionA}
                        </div>
                        <div className={`p-2.5 rounded-xl border ${q.correctAnswer === "B" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300" : "bg-muted/30"}`}>
                          <span className="font-extrabold text-muted-foreground mr-1">B.</span> {q.optionB}
                        </div>
                        <div className={`p-2.5 rounded-xl border ${q.correctAnswer === "C" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300" : "bg-muted/30"}`}>
                          <span className="font-extrabold text-muted-foreground mr-1">C.</span> {q.optionC}
                        </div>
                        <div className={`p-2.5 rounded-xl border ${q.correctAnswer === "D" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300" : "bg-muted/30"}`}>
                          <span className="font-extrabold text-muted-foreground mr-1">D.</span> {q.optionD}
                        </div>
                      </div>
                    )}

                    {q.questionType === "TrueFalse" && (
                      <div className="flex gap-4 mt-3 text-xs font-sans font-bold">
                        <span className={`px-4 py-2 rounded-xl border ${q.correctAnswer === "True" ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" : "bg-muted/40 opacity-70"}`}>True (ખરું)</span>
                        <span className={`px-4 py-2 rounded-xl border ${q.correctAnswer === "False" ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" : "bg-muted/40 opacity-70"}`}>False (ખોટું)</span>
                      </div>
                    )}

                    {q.questionType === "MatchFollowing" && (
                      <div className="grid grid-cols-2 gap-2 mt-4 text-xs bg-muted/40 p-3 rounded-2xl">
                        <div><span className="font-bold">Col A:</span> {q.optionA} ➔ <span className="font-bold">Col B choice:</span> {q.optionC}</div>
                        <div><span className="font-bold">Col A:</span> {q.optionB} ➔ <span className="font-bold">Col B choice:</span> {q.optionD}</div>
                        <div className="col-span-2 pt-2 border-t mt-1 text-teal-600 font-extrabold font-sans">Answer matching sequence: {q.correctAnswer}</div>
                      </div>
                    )}

                    {q.questionType !== "MCQ" && q.questionType !== "TrueFalse" && q.questionType !== "MatchFollowing" && (
                      <div className="mt-3 bg-muted/40 p-3 rounded-2xl border text-xs font-sans">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">લઘુ જવાબ / સાચો ઉત્તર (Correct Answer Formula)</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 mt-1 block">{q.correctAnswer || "(ખાલી)"}</span>
                      </div>
                    )}

                    {/* Metadata & Media references */}
                    <div className="mt-4 pt-3 border-t flex flex-wrap justify-between items-center gap-3 text-[10px] text-muted-foreground uppercase font-sans font-semibold">
                      <div className="flex flex-wrap items-center gap-3">
                        {q.sourceBook && (
                          <span>📚 {q.sourceType}: {q.sourceBook} {q.sourcePage ? `• Pg ${q.sourcePage}` : ""}</span>
                        )}
                        {q.illustrationUrls && q.illustrationUrls.length > 0 && (
                          <span className="text-teal-600 font-bold">🖼️ {q.illustrationUrls.length} Diagram(s) Attached</span>
                        )}
                        {q.aiGenerated && (
                          <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                            <Sparkles className="size-3" /> AI GENERATED
                          </span>
                        )}
                      </div>

                      {/* Controls Area */}
                      <div className="absolute right-5 bottom-4 flex items-center gap-2">
                        <button
                          onClick={() => startEdit(q)}
                          className="size-8 rounded-full border bg-card hover:bg-muted flex items-center justify-center text-teal-600 transition"
                          title="પ્રશ્ન સંપાદિત કરો"
                        >
                          <Edit3 className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(q.questionId)}
                          className="size-8 rounded-full border bg-card hover:bg-red-500/10 flex items-center justify-center text-red-500 transition"
                          title="પ્રશ્ન કાયમી કાઢી નાખો"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: FORM FOR SINGLE ADD/EDIT */}
      {managerView === "form" && (
        <form onSubmit={handleSingleSubmit} className="bg-card border rounded-3xl p-6 shadow-sm space-y-6 font-semibold animate-fadeIn">
          <div className="border-b pb-4 flex justify-between items-center">
            <div>
              <h3 className="text-base font-extrabold text-foreground">
                {editingQuestion ? "✏️ પ્રશ્ન સંપાદિત કરો (Edit Question Settings)" : "➕ પ્રશ્નબેંકમાં નવો પ્રશ્ન સંગઠિત કરો (Add To Permanent Bank)"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">આ પ્રશ્ન આજીવન સંગ્રહીત રહેશે અને અગણિત પરીક્ષાઓમાં પુનરાવર્તિત ઉપયોગ માટે ઉપલબ્ધ રહેશે.</p>
            </div>
            <button
              type="button"
              onClick={() => { setManagerView("list"); resetForm(); }}
              className="px-3.5 py-1.5 border hover:bg-muted rounded-xl text-xs font-bold"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-semibold">
            
            {/* Standard Category & Structuring parameters */}
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold text-teal-700 uppercase tracking-wider pb-1 border-b">1. Class-Syllabus Mapping</h4>
              
              <div>
                <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">વિષય (Subject)</label>
                <select
                  value={questSubId}
                  onChange={(e) => setQuestSubId(e.target.value)}
                  className="w-full h-11 px-3 bg-muted/40 rounded-xl border outline-none text-xs"
                >
                  {subjects.map(s => (
                    <option key={s.subjectId} value={s.subjectId}>{s.subjectName} (Std {s.standard})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">પ્રકરણ (Chapter Component)</label>
                <select
                  value={questChapId}
                  onChange={(e) => setQuestChapId(e.target.value)}
                  className="w-full h-11 px-3 bg-muted/40 rounded-xl border outline-none text-xs"
                >
                  {chapters.filter(c => c.subjectId === questSubId).map(c => (
                    <option key={c.chapterId} value={c.chapterId}>{c.chapterName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">પ્રશ્નનો પ્રકાર (Question Format type)</label>
                <select
                  value={questType}
                  onChange={(e) => setQuestType(e.target.value)}
                  className="w-full h-11 px-3 bg-muted/40 rounded-xl border outline-none text-xs"
                >
                  <option value="MCQ">MCQ (ચાર વિકલ્પ વાળા)</option>
                  <option value="TrueFalse">True / False (ખરા-ખોટા)</option>
                  <option value="FillBlank">Fill in the Blank (ખાલી જગ્યા)</option>
                  <option value="MatchFollowing">Match Following (જોડકા જોડો)</option>
                  <option value="OneWordAnswer">One Word Answer (એક શબ્દ ઉત્તર)</option>
                  <option value="ShortAnswer">Short Answer (એક વાક્ય ઉત્તર)</option>
                  <option value="LongAnswer">Long Answer (વિગતવાર ઉત્તર)</option>
                  <option value="ImageBasedQuestion">Image-Based MCQ (આકૃતિ આધારિત પ્રશ્ન)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">કાઠિણ્યતા સ્તર (Difficulty Level)</label>
                <select
                  value={questDifficulty}
                  onChange={(e) => setQuestDifficulty(e.target.value as QuestionDifficulty)}
                  className="w-full h-11 px-3 bg-muted/40 rounded-xl border outline-none text-xs font-sans"
                >
                  <option value="easy">easy (~૪૦% માર્ક ભલામણ)</option>
                  <option value="medium">medium (~૪૦% માર્ક ભલામણ)</option>
                  <option value="hard">hard (~૨૦% માર્ક ભલામણ)</option>
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={questActive}
                    onChange={(e) => setQuestActive(e.target.checked)}
                    className="rounded text-teal-600 size-4"
                  />
                  <span className="text-xs font-bold font-gu">વિદ્યાર્થીઓ માટે મુલાકાત માટે સક્રિય (Active status)</span>
                </label>
              </div>
            </div>

            {/* Content Logic Panel */}
            <div className="space-y-4 md:col-span-2">
              <h4 className="text-xs font-extrabold text-teal-700 uppercase tracking-wider pb-1 border-b">2. Content & Answer Logic</h4>
              
              <div>
                <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">પ્રશ્ન મટીરીયલ (Question content)</label>
                <textarea
                  rows={3}
                  value={questText}
                  onChange={(e) => setQuestText(e.target.value)}
                  placeholder="અહીં પ્રશ્નનું સંપૂર્ણ હાર્દ ગુજરાતી અથવા ઇંગ્લિશ લખાણ ટાઈપ કરો..."
                  className="w-full p-3 bg-muted/40 rounded-2xl border outline-none text-xs leading-relaxed"
                />
              </div>

              {/* MCQ Choices input slots conditional rendering */}
              {(questType === "MCQ" || questType === "MatchFollowing" || questType === "ImageBasedQuestion") && (
                <div className="space-y-3 font-sans">
                  <div className="font-gu text-[10px] text-teal-700 uppercase tracking-wider font-extrabold mb-1">
                    {questType === "MatchFollowing" ? "Col A and Col B parameters" : "MCQ Choices (વિકલ્પો ધરાવો)"}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground">Option A:</span>
                      <input
                        type="text"
                        value={questA}
                        onChange={(e) => setQuestA(e.target.value)}
                        placeholder={questType === "MatchFollowing" ? "Col A Left item 1" : "વિકલ્પ A લખાણ..."}
                        className="w-full h-10 px-3 mt-1 bg-muted/40 rounded-xl border text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground">Option B:</span>
                      <input
                        type="text"
                        value={questB}
                        onChange={(e) => setQuestB(e.target.value)}
                        placeholder={questType === "MatchFollowing" ? "Col A Left item 2" : "વિકલ્પ B લખાણ..."}
                        className="w-full h-10 px-3 mt-1 bg-muted/40 rounded-xl border text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground">Option C:</span>
                      <input
                        type="text"
                        value={questC}
                        onChange={(e) => setQuestC(e.target.value)}
                        placeholder={questType === "MatchFollowing" ? "Col B Correct Map for Left 1" : "વિકલ્પ C લખાણ..."}
                        className="w-full h-10 px-3 mt-1 bg-muted/40 rounded-xl border text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground">Option D:</span>
                      <input
                        type="text"
                        value={questD}
                        onChange={(e) => setQuestD(e.target.value)}
                        placeholder={questType === "MatchFollowing" ? "Col B Correct Map for Left 2" : "વિકલ્પ D લખાણ..."}
                        className="w-full h-10 px-3 mt-1 bg-muted/40 rounded-xl border text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Correct Answer selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">સાચો જવાબ કોડ (Correct Answer Formula/Sequence)</label>
                  {questType === "MCQ" || questType === "ImageBasedQuestion" ? (
                    <select
                      value={questCorrect}
                      onChange={(e) => setQuestCorrect(e.target.value)}
                      className="w-full h-11 px-3 bg-muted/40 rounded-xl border outline-none text-xs font-sans font-bold"
                    >
                      <option value="A">Choice A</option>
                      <option value="B">Choice B</option>
                      <option value="C">Choice C</option>
                      <option value="D">Choice D</option>
                    </select>
                  ) : questType === "TrueFalse" ? (
                    <select
                      value={questCorrect}
                      onChange={(e) => setQuestCorrect(e.target.value)}
                      className="w-full h-11 px-3 bg-muted/40 rounded-xl border outline-none text-xs font-sans font-bold"
                    >
                      <option value="True">True (ખરું)</option>
                      <option value="False">False (ખોટું)</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={questCorrect}
                      onChange={(e) => setQuestCorrect(e.target.value)}
                      placeholder="સાચો ટેક્સ્ટ જવાબ (દા.ત. 'ગુરુત્વાકર્ષણ' અથવા '15')"
                      className="w-full h-11 px-3 bg-muted/40 rounded-xl border outline-none text-sm font-semibold"
                    />
                  )}
                </div>

                <div>
                  <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">આકૃતિ અથવા સંદર્ભ ચિત્ર લિંક (Comma separated Image URLs)</label>
                  <input
                    type="text"
                    value={imageUrlString}
                    onChange={(e) => setImageUrlString(e.target.value)}
                    placeholder="https://example.com/diagram.jpg"
                    className="w-full h-11 px-3 bg-muted/40 rounded-xl border outline-none text-xs font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">સમજૂતી (Explanation for Mistakes learning review)</label>
                <textarea
                  rows={2}
                  value={questExplanation}
                  onChange={(e) => setQuestExplanation(e.target.value)}
                  placeholder="જવાબ ખોટો પડવાના કિસ્સામાં વિદ્યાર્થી આ સ્પષ્ટ સમજૂતી જોઈને પોતાની ખામી સુધારી શકશે..."
                  className="w-full p-3 bg-muted/40 rounded-2xl border outline-none text-xs leading-relaxed"
                />
              </div>

            </div>
          </div>

          {/* Tracing Triggers Section */}
          <div className="pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-semibold">
            
            {/* Textbook source tracing fields */}
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider pb-1 border-b">3. Textbook Source Tracing</h4>
              
              <div>
                <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">સોર્સ પદ્ધતિ (Source Type)</label>
                <select
                  value={questSourceType}
                  onChange={(e) => setQuestSourceType(e.target.value)}
                  className="w-full h-11 px-3 bg-muted/40 rounded-xl border outline-none text-xs"
                >
                  <option value="Textbook">Textbook (રાજ્ય પાઠ્યપુસ્તક)</option>
                  <option value="Navneet">Navneet Companion (નવનીત સંદર્ભ)</option>
                  <option value="BoardPattern">Board Pattern Model (બોર્ડ પરીક્ષા નમૂનો)</option>
                  <option value="TeacherCreated">Teacher Created (શિક્ષક રચિત મૌલિક)</option>
                  <option value="AIGenerated">AI Generated System (કૃત્રિમ બુદ્ધિ રચિત)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">સંદર્ભ બુક (Source Book)</label>
                  <input
                    type="text"
                    value={questSourceBook}
                    onChange={(e) => setQuestSourceBook(e.target.value)}
                    placeholder="GCERT વિજ્ઞાન ધો ૧૦"
                    className="w-full h-10 px-3 bg-muted/40 rounded-xl border text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">પાના ક્રમાંક (Page No)</label>
                  <input
                    type="number"
                    value={questSourcePage}
                    onChange={(e) => setQuestSourcePage(e.target.value)}
                    placeholder="128"
                    className="w-full h-10 px-3 bg-muted/40 rounded-xl border text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">સોર્સ ચેપ્ટર (Source Chapter)</label>
                <input
                  type="text"
                  value={questSourceChapter}
                  onChange={(e) => setQuestSourceChapter(e.target.value)}
                  placeholder="Chapter 6 (જીવન ક્રિયાઓ)"
                  className="w-full h-10 px-3 bg-muted/40 rounded-xl border text-xs"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={questVerified}
                    onChange={(e) => setQuestVerified(e.target.checked)}
                    className="rounded text-indigo-600 size-4"
                  />
                  <span className="text-xs font-bold font-gu">આ પ્રશ્નની સત્યતા ચકાસેલી છે (Verified status)</span>
                </label>
              </div>
            </div>

            {/* Workflow approval parameters */}
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider pb-1 border-b">4. Approval Workflow pipeline</h4>
              
              <div>
                <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">દસ્તાવેજ વ્યવસ્થા સ્ટેટસ (Approval Status)</label>
                <select
                  value={questApprovalStatus}
                  onChange={(e) => setQuestApprovalStatus(e.target.value)}
                  className="w-full h-11 px-3 bg-muted/40 text-indigo-600 font-extrabold rounded-xl border outline-none text-xs"
                >
                  <option value="draft">Draft (ડ્રાફ્ટ ફાઇલમાં રાખો)</option>
                  <option value="pending_review">Pending Review (નવેસરથી ચકાસણી માટે મોકલેલ)</option>
                  <option value="approved">Approved (માન્ય - પ્રશ્ન પત્રોમાં ઉપયોગ યોગ્ય)</option>
                  <option value="rejected">Rejected (નામંજૂર અને બ્લેકલિસ્ટ કરેલ)</option>
                </select>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-dashed space-y-2">
                <p className="text-[11px] text-muted-foreground font-gu">શા માટે મંજૂરી ફરજિયાત છે?</p>
                <p className="text-[10px] text-muted-foreground leading-normal font-gu">
                  પરીક્ષા શીડ્યુલર ફક્ત <strong>Approved</strong> શ્રેણીના પ્રશ્નોને જ સક્રિય રિકોર્ડમાંથી સ્કેન કરે છે. આ નિયંત્રણથી સદંતર ભૂલ વગરની કસોટી ડિલિવરી સુનિશ્ચિત બને છે.
                </p>
              </div>
            </div>

            {/* Future LLM and AI alignment controls */}
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider pb-1 border-b">5. future LLM Meta Training Parameters</h4>
              
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={questAiGenerated}
                    onChange={(e) => setQuestAiGenerated(e.target.checked)}
                    className="rounded text-indigo-600 size-4"
                  />
                  <span className="text-xs font-bold font-gu text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Sparkles className="size-3.5" /> Generative AI OCR Import pipeline
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={questHumanReviewed}
                    onChange={(e) => setQuestHumanReviewed(e.target.checked)}
                    className="rounded text-indigo-600 size-4"
                  />
                  <span className="text-xs font-bold font-gu">Human Trainer Reviewed (શિક્ષક ઓડિટ)</span>
                </label>

                <div>
                  <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">AI પ્રશ્ન ગુણવત્તા રેટિંગ (Review accuracy rating score %)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={questReviewScore}
                    onChange={(e) => setQuestReviewScore(e.target.value)}
                    className="w-full h-10 px-3 bg-muted/40 rounded-xl border text-xs font-sans"
                    placeholder="95"
                  />
                  <span className="text-[9px] text-muted-foreground font-gu mt-1 block">AI દ્વારા ક્રિએટ કરાયેલા પ્રશ્નો ફીડબેક ટ્રેકિંગ માટે ૦ થી ૧૦૦ નું સ્કોરિંગ.</span>
                </div>
              </div>
            </div>

          </div>

          {/* Form Action Controls */}
          <div className="pt-4 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={() => { setManagerView("list"); resetForm(); }}
              className="h-12 px-6 border hover:bg-muted font-bold rounded-2xl text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-12 px-8 bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-2xl text-xs transition shadow-md"
            >
              {editingQuestion ? "💾 પ્રશ્ન ફેરફાર સાચવો (Update)" : "🚀 કાયમી ભંડારમાં સંગઠિત કરો (Save Content)"}
            </button>
          </div>
        </form>
      )}

      {/* VIEW 3: BULK UPLOADER & ROW LEVEL VALIDATOR TABLE */}
      {managerView === "bulk" && (
        <div className="bg-card border rounded-3xl p-6 shadow-sm space-y-6 animate-fadeIn font-semibold">
          <div>
            <h3 className="text-base font-extrabold text-foreground">⚡ સંકલિત જથ્થાબંધ પ્રશ્ન આયાત કેન્દ્ર (Bulk Question Importer)</h3>
            <p className="text-xs text-muted-foreground mt-0.5 font-gu">
              CSV પાઠ્ય લખાણ અથવા JSON એરે પેસ્ટ કરી કોષ્ટકમાં રો-લેવલ પર વાસ્તવિક ચકાસણી કરો અને ગણતરીની સેકન્ડોમાં સેંકડો પ્રશ્નો આયાત કરો.
            </p>
          </div>

          {/* Upload Configuration selection */}
          <div className="flex gap-4 border-b pb-3">
            <button
              type="button"
              onClick={() => { setBulkMode("CSV"); setParsedRows([]); setBulkValidationErrors({}); }}
              className={`pb-2 text-xs font-extrabold border-b-2 transition ${bulkMode === "CSV" ? "text-indigo-600 border-indigo-600" : "text-muted-foreground border-transparent hover:text-foreground"}`}
            >
              CSV ફોર્મેટ (Standard Columns)
            </button>
            <button
              type="button"
              onClick={() => { setBulkMode("JSON"); setParsedRows([]); setBulkValidationErrors({}); }}
              className={`pb-2 text-xs font-extrabold border-b-2 transition ${bulkMode === "JSON" ? "text-indigo-600 border-indigo-600" : "text-muted-foreground border-transparent hover:text-foreground"}`}
            >
              JSON સંગ્રહ એરે (Deep schema)
            </button>
          </div>

          {/* Guidelines Block */}
          <div className="bg-muted/40 border p-4 rounded-2xl text-xs leading-normal">
            <span className="font-extrabold text-indigo-700 block mb-1">આયાત માર્ગદર્શિકા (Bulk Import Columns List):</span>
            <div className="font-mono text-[10px] space-y-1">
              {bulkMode === "CSV" ? (
                <>
                  <p>૧. હેડર રો આ મુજબ હોવી જોઈએ: <span className="bg-background px-1 border rounded">subjectId,chapterId,question,questionType,optionA,optionB,optionC,optionD,correctAnswer,explanation,difficulty,sourceBook,sourcePage</span></p>
                  <p>૨. MCQ માટે correctAnswer માં A, B, C, અથવા D ટાઈપ કરો. True/False માટે True અથવા False ટાઈપ કરો.</p>
                </>
              ) : (
                <>
                  <p>એક JSON ઓબ્જેક્ટ એરે પેસ્ટ કરો. દા.ત:</p>
                  <pre className="bg-background p-2 border rounded overflow-x-auto mt-1 leading-normal text-[9px] text-indigo-600">
{`[
  {
    "subjectId": "sub1",
    "chapterId": "ch1",
    "question": "લોહી ગાળવાની પ્રક્રિયા કયા અંગમાં થાય છે?",
    "questionType": "MCQ",
    "optionA": "કિડની", "optionB": "હૃદય", "optionC": "ફેફસાં", "optionD": "યકૃત",
    "correctAnswer": "A",
    "difficulty": "medium",
    "sourceBook": "પાઠ્યપુસ્તક ધો ૧૦"
  }
]`}
                  </pre>
                </>
              )}
            </div>
          </div>

          {/* Paste Area */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-muted-foreground block">પેસ્ટ ઇનપુટ એરિયા (Raw String input Area)</label>
            <textarea
              rows={6}
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder={bulkMode === "CSV" ? "subjectId,chapterId,question,questionType,optionA,optionB,optionC,optionD,correctAnswer,explanation,difficulty,sourceBook,sourcePage\nsub1,ch1,લોહી ગાળવાની ક્રિયા કયા અંક માં થાય છે?,MCQ,મૂત્રપિંડ,હૃદય,ફેફસા,પિત્તાશય,A,કિડની લોહી ગાળે છે,easy,વિજ્ઞાન ૧૦,144" : "JSON Array here..."}
              className="w-full text-xs font-mono p-3 bg-muted/20 border rounded-2xl outline-none focus:border-teal-500 leading-normal"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={validateBulkInput}
              className="h-11 px-5 border decoration-teal-600 hover:bg-muted text-foreground flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition"
            >
              <RefreshCw className="size-4 animate-none" />
              વિશ્લેષણ અને ઓડિટ રન (Validate & Parse Data)
            </button>
            
            {parsedRows.length > 0 && (
              <button
                type="button"
                onClick={handleCommitBulk}
                disabled={isCommittingBulk}
                className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition"
              >
                {isCommittingBulk ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Inserting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="size-4" /> મંજૂર પ્રશ્નો ડેટાબેઝમાં મોકલો (Submit Valid Content)
                  </>
                )}
              </button>
            )}
          </div>

          {/* VALIDATOR INTERACTIVE PREVIEW TABLES */}
          {parsedRows.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <h4 className="text-xs font-extrabold text-teal-700 uppercase tracking-widest">ચકાસણી પરિણામ પત્રક (Interactive validation grid review):</h4>
              <p className="text-xs text-muted-foreground leading-none font-gu">ભૂલ વાળા પ્રશ્નો ક્રાઈટેરીયા લાલ કલર માં દેખાશે, જેને અવગણીને બાકીના સાચા પ્રશ્નો સીધા અપલોડ કરી શકાશે.</p>
              
              <div className="border rounded-2xl overflow-hidden overflow-x-auto max-h-[400px]">
                <table className="w-full text-xs font-medium text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b">
                      <th className="p-3 text-[10px] uppercase font-bold text-muted-foreground">Row</th>
                      <th className="p-3 text-[10px] uppercase font-bold text-muted-foreground">સ્ટોર લાયક? (Status)</th>
                      <th className="p-3 text-[10px] uppercase font-bold text-muted-foreground">વિષય / પ્રકરણ</th>
                      <th className="p-3 text-[10px] uppercase font-bold text-muted-foreground">પ્રશ્ન લખાણ (Content Core)</th>
                      <th className="p-3 text-[10px] uppercase font-bold text-muted-foreground">જવાબ (Answer Formula)</th>
                      <th className="p-3 text-[10px] uppercase font-bold text-muted-foreground">ચકાસણી ભૂલ અહેવાલ (Validation details)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, idx) => {
                      const rowErrors = bulkValidationErrors[idx];
                      const isValid = !rowErrors || rowErrors.length === 0;

                      return (
                        <tr 
                          key={row.id} 
                          className={`border-b ${isValid ? "hover:bg-teal-500/5 dark:hover:bg-teal-950/20" : "bg-red-500/5 dark:bg-red-950/10 hover:bg-red-500/10"}`}
                        >
                          <td className="p-3 font-mono font-bold text-muted-foreground">{idx + 1}</td>
                          <td className="p-3">
                            {isValid ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-full font-bold text-[9px] uppercase">
                                Valid Row
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 rounded-full font-bold text-[9px] uppercase">
                                Rejected
                              </span>
                            )}
                          </td>
                          <td className="p-3 leading-normal font-sans text-xs">
                            <span className="font-extrabold text-[10px] text-muted-foreground">SUB:</span> {row.subjectId || "(ખાલી)"}<br />
                            <span className="font-extrabold text-[10px] text-muted-foreground font-gu">CHAP:</span> {row.chapterId || "(ખાલી)"}
                          </td>
                          <td className="p-3 font-semibold max-w-sm truncate leading-relaxed">
                            {row.question}
                          </td>
                          <td className="p-3 leading-normal font-sans">
                            <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-md font-bold">{row.correctAnswer}</span><br />
                            <span className="text-[10px] text-muted-foreground uppercase">{row.questionType}</span>
                          </td>
                          <td className="p-3">
                            {isValid ? (
                              <span className="text-emerald-600 font-extrabold font-gu flex items-center gap-1">
                                <Check className="size-3.5" /> Normal parameters
                              </span>
                            ) : (
                              <div className="space-y-1 text-[10px] text-red-500 font-gu">
                                {rowErrors.map((err, eIdx) => (
                                  <div key={eIdx} className="flex items-start gap-1">
                                    <X className="size-3.5 shrink-0 mt-0.5" />{err}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
