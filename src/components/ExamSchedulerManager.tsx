import React, { useState, useEffect } from "react";
import { 
  Calendar, Clock, Award, ShieldAlert, BookOpen, Trash2, Edit3, PlusCircle, 
  Layers, CheckCircle2, XCircle, Info, Sparkles, Cpu, ChevronRight, BarChart2, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DailyExam, Subject, Chapter, Question, ExamTemplate, ExamResult } from "@/types";
import { AdminRepository } from "@/lib/db";
import { toast } from "sonner";

interface ExamSchedulerManagerProps {
  subjects: Subject[];
  chapters: Chapter[];
  questions: Question[];
  exams: DailyExam[];
  results: ExamResult[];
  onRefresh: () => void;
  currentUser: { uid: string; fullName: string; role: any } | null;
}

export function ExamSchedulerManager({
  subjects,
  chapters,
  questions,
  exams,
  results,
  onRefresh,
  currentUser
}: ExamSchedulerManagerProps) {
  // Tabs
  const [activeSubTab, setActiveSubTab] = useState<"scheduled" | "templates" | "results">("scheduled");
  
  // States for scheduling a new exam from scratch or template
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [examDateStr, setExamDateStr] = useState("");
  const [examDurationMin, setExamDurationMin] = useState(30);
  const [questionsTotalCount, setQuestionsTotalCount] = useState(15);
  const [examType, setExamType] = useState<any>("Scheduled");
  const [publishAtDate, setPublishAtDate] = useState("");
  const [startAtDate, setStartAtDate] = useState("");
  const [endAtDate, setEndAtDate] = useState("");
  const [recurringType, setRecurringType] = useState<any>("none");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [examinerNameStr, setExaminerNameStr] = useState("");

  // States for template actions
  const [templates, setTemplates] = useState<ExamTemplate[]>([]);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState("");
  const [tempEasyMix, setTempEasyMix] = useState("40");
  const [tempMediumMix, setTempMediumMix] = useState("40");
  const [tempHardMix, setTempHardMix] = useState("20");

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await AdminRepository.getExamTemplates();
      setTemplates(data);
    } catch (_) {
      console.warn("Could not retrieve exam templates.");
    }
  };

  useEffect(() => {
    if (subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].subjectId);
    }
  }, [subjects, selectedSubjectId]);

  // Adjust chapter selectors
  useEffect(() => {
    setSelectedChapterIds([]);
  }, [selectedSubjectId]);

  const handleChapterToggle = (chapterId: string) => {
    setSelectedChapterIds(prev => 
      prev.includes(chapterId) 
        ? prev.filter(id => id !== chapterId) 
        : [...prev, chapterId]
    );
  };

  // Automated Paper Generator - extracts questions according to templates/difficulty Mix & locks them inside scheduledExam once!
  const generateExamPaperQuestions = (
    subjectId: string, 
    chapterIds: string[], 
    totalRequired: number, 
    difficultyMix: { easy: number; medium: number; hard: number }
  ): string[] => {
    // 1. Get all approved questions from our master bank matching this subject and chapters!
    const pool = questions.filter(q => 
      q.subjectId === subjectId && 
      (chapterIds.length === 0 || chapterIds.includes(q.chapterId)) &&
      q.approvalStatus !== "rejected" &&
      q.status !== "archived"
    );

    if (pool.length === 0) {
      return [];
    }

    // 2. Segment pool by difficulty
    const easyQ = pool.filter(q => q.difficulty === "easy");
    const mediumQ = pool.filter(q => q.difficulty === "medium" || !q.difficulty);
    const hardQ = pool.filter(q => q.difficulty === "hard");

    // 3. Calculate target sizes
    const targetEasy = Math.round((difficultyMix.easy / 100) * totalRequired);
    const targetMedium = Math.round((difficultyMix.medium / 100) * totalRequired);
    const targetHard = Math.max(0, totalRequired - targetEasy - targetMedium);

    const shuffleArray = (arr: Question[]) => {
      return [...arr].sort(() => Math.random() - 0.5);
    };

    const selectedEasy = shuffleArray(easyQ).slice(0, targetEasy);
    const selectedMedium = shuffleArray(mediumQ).slice(0, targetMedium);
    const selectedHard = shuffleArray(hardQ).slice(0, targetHard);

    let paper = [...selectedEasy, ...selectedMedium, ...selectedHard];

    // Fallback if difficulty segments are insufficient: just fill up from remaining pool randomly
    if (paper.length < totalRequired) {
      const currentIds = new Set(paper.map(q => q.questionId));
      const remaining = pool.filter(q => !currentIds.has(q.questionId));
      const neededCount = totalRequired - paper.length;
      paper = [...paper, ...shuffleArray(remaining).slice(0, neededCount)];
    }

    // Return the stable locked IDs
    return paper.map(q => q.questionId);
  };

  // Submit Template Handler
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateTitle.trim() || !selectedSubjectId || selectedChapterIds.length === 0) {
      toast.warning("ટેમ્પલેટ શીર્ષક, વિષય અને ઓછામાં ઓછું એક પ્રકરણ સિલેક્ટ કરવું અનિવાર્ય છે!");
      return;
    }

    const easy = Number(tempEasyMix) || 0;
    const medium = Number(tempMediumMix) || 0;
    const hard = Number(tempHardMix) || 0;

    if (easy + medium + hard !== 100) {
      toast.error(`વિભાજન નિયંત્રણ ભૂલ: કાઠિણ્યતાનું કુલ લિમિટ ૧૦૦% થવું જોઈએ! હાલમાં: ${easy + medium + hard}%`);
      return;
    }

    const matchedSub = subjects.find(s => s.subjectId === selectedSubjectId);
    const standardStr = matchedSub ? matchedSub.standard : "10";

    const newTemplatePayload: ExamTemplate = {
      templateId: "temp_" + Date.now(),
      title: newTemplateTitle,
      standard: standardStr,
      subjectId: selectedSubjectId,
      chapterIds: selectedChapterIds,
      questionsCount: questionsTotalCount,
      difficultyMix: { easy, medium, hard },
      createdBy: currentUser?.uid || "admin",
      createdAt: new Date().toISOString()
    };

    try {
      await AdminRepository.createExamTemplate(
        currentUser?.uid || "admin",
        currentUser?.fullName || "Admin",
        newTemplatePayload
      );
      toast.success("નવો એક્ઝામ બ્લુપ્રિન્ટ ટેમ્પલેટ સફળતાપૂર્વક સાચવવામાં આવ્યો!");
      setNewTemplateTitle("");
      setIsCreatingTemplate(false);
      loadTemplates();
    } catch (_) {
      toast.error("બ્લુપ્રિન્ટ સેવ કરવામાં કોઈ ખામી ઉદ્ભવી.");
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm("શું તમે આ એક્ઝામ ટેમ્પલેટ બ્લુપ્રિન્ટ કાઢી નાખવા માંગો છો?")) {
      return;
    }
    try {
      await AdminRepository.deleteExamTemplate(
        currentUser?.uid || "admin",
        currentUser?.fullName || "Admin",
        templateId
      );
      toast.success("ટેમ્પલેટ સફળતાપૂર્વક ડિલીટ થયો.");
      loadTemplates();
    } catch (_) {
      toast.error("ટેમ્પલેટ ડિલીટ કરવામાં મુશ્કેલી પડી.");
    }
  };

  // Apply Blueprint to inputs instantly!
  const applyTemplate = (tId: string) => {
    setSelectedTemplateId(tId);
    const item = templates.find(temp => temp.templateId === tId);
    if (!item) return;

    setSelectedSubjectId(item.subjectId);
    setSelectedChapterIds(item.chapterIds || []);
    setQuestionsTotalCount(item.questionsCount);
    setTempEasyMix(String(item.difficultyMix.easy));
    setTempMediumMix(String(item.difficultyMix.medium));
    setTempHardMix(String(item.difficultyMix.hard));
    toast.success(`વીજળીક એપ્લાય: '${item.title}' બ્લુપ્રિન્ટ કન્ફિગર થઈ ગઈ છે!`);
  };

  // Submit Scheduled Exam
  const handleCreateScheduledExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId || selectedChapterIds.length === 0 || !examDateStr || !examinerNameStr.trim()) {
      toast.warning("તારીખ, વિષય, ચેપ્ટર્સ અને પરીક્ષકનું નામ ફરજિયાત છે!");
      return;
    }

    // Get Difficulty configuration
    let easy = 40, medium = 40, hard = 20;
    if (selectedTemplateId) {
      const t = templates.find(temp => temp.templateId === selectedTemplateId);
      if (t) {
        easy = t.difficultyMix.easy;
        medium = t.difficultyMix.medium;
        hard = t.difficultyMix.hard;
      }
    }

    // Generate fixed selected standard question IDs list (Pre-generated Paper model)
    const matchedQuestionIds = generateExamPaperQuestions(
      selectedSubjectId,
      selectedChapterIds,
      questionsTotalCount,
      { easy, medium, hard }
    );

    if (matchedQuestionIds.length === 0) {
      toast.error("પસંદ કરેલ પ્રકરણો માટે પૂરતા પ્રશ્નો પ્રશ્નબેંકમાં ઉપલબ્ધ નથી! પહેલા પ્રશ્નો ઉમેરો.");
      return;
    }

    // Enforce matching amount or adjust to available
    if (matchedQuestionIds.length < questionsTotalCount) {
      toast.info(`સૂચના: પૂલમાં ફક્ત ${matchedQuestionIds.length} પ્રશ્નો છે. કસોટી ${matchedQuestionIds.length} પ્રશ્નો સાથે જનરેટ થઈ.`);
    }

    const examId = "ex_" + Date.now();
    
    // Parse time bounds or calculate defaults
    const pubTime = publishAtDate ? new Date(publishAtDate).toISOString() : new Date().toISOString();
    const startTime = startAtDate ? new Date(startAtDate).toISOString() : new Date().toISOString();
    
    // Default exam close is 24 hours unless customized
    const defaultEndTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const endTime = endAtDate ? new Date(endAtDate).toISOString() : defaultEndTime;

    const newExam: DailyExam = {
      examId,
      subjectId: selectedSubjectId,
      chapterId: selectedChapterIds[0] || "", // legacy fallback
      chapterIds: selectedChapterIds, // Multi-chapter Array!
      examinerId: examinerNameStr.trim(),
      examinerName: examinerNameStr.trim(),
      examDate: examDateStr,
      duration: examDurationMin,
      totalQuestions: matchedQuestionIds.length,
      status: "active",
      createdAt: new Date().toISOString(),
      
      // Dynamic Scheduling metadata
      publishAt: pubTime,
      startAt: startTime,
      endAt: endTime,
      expireAt: endTime,
      questionIds: matchedQuestionIds, // Pre-generated immutable IDs list locked ONCE!
      examTemplateId: selectedTemplateId || undefined,
      examType,
      recurringType: examType === "Recurring" ? recurringType : "none",
    };

    try {
      const isOk = await AdminRepository.createExam(
        currentUser?.uid || "admin",
        currentUser?.fullName || "Admin",
        newExam
      );

      if (!isOk) {
        toast.error("એક પરીક્ષા મર્યાદા નિયંત્રણ ભૂલ: આ તારીખે પહેલેથી અન્ય સક્રિય સાપ્તાહિક પરીક્ષા મોજૂદ છે!");
        return;
      }

      toast.success("કસોટી શીડ્યુલર મોડ્યુલ દ્વારા સફળતાપૂર્વક મોકલવામાં આવી છે!");
      // Reset inputs
      setExamDateStr("");
      setExaminerNameStr("");
      setSelectedChapterIds([]);
      setSelectedTemplateId("");
      onRefresh();
    } catch (_) {
      toast.error("કસોટી સબમિટ કરવામાં ભૂલ થઈ.");
    }
  };

  const handleCloseExam = async (examId: string) => {
    try {
      await AdminRepository.updateExam(
        currentUser?.uid || "admin",
        currentUser?.fullName || "Admin",
        examId,
        { status: "closed" }
      );
      toast.success("પરીક્ષા સફળતાપૂર્વક બંધ કસોટી તરીકે સ્ટોર કરાઈ.");
      onRefresh();
    } catch (_) {
      toast.error("સ્થિતિ બદલવામાં કોઈ કટોકટી સર્જાઈ.");
    }
  };

  const handleOpenExam = async (exam: DailyExam) => {
    try {
      const updated = await AdminRepository.updateExam(
        currentUser?.uid || "admin",
        currentUser?.fullName || "Admin",
        exam.examId,
        { status: "active" }
      );
      if (updated) {
        toast.success("પરીક્ષા ફરીથી વિદ્યાર્થીઓ માટે ઉપલબ્ધ કરાઈ.");
        onRefresh();
      } else {
        toast.error("DUPLICATE ACTIVE EXAM PREVENTED! You already have an active exam scheduled for this date.");
      }
    } catch (_) {
      toast.error("પરીક્ષા ચાલુ કરવામાં અવરોધ આવ્યો.");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Subtab selection */}
      <div className="flex border-b pb-3 items-center justify-between">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveSubTab("scheduled")}
            className={`pb-2.5 text-xs font-black border-b-2 flex items-center gap-1.5 transition ${activeSubTab === "scheduled" ? "text-teal-600 border-teal-600" : "text-muted-foreground border-transparent hover:text-foreground"}`}
          >
            <Calendar className="size-4" /> 📅 શીડ્યુલ થયેલ કસોટીઓ (Active Deliveries)
          </button>
          
          <button
            onClick={() => setActiveSubTab("templates")}
            className={`pb-2.5 text-xs font-black border-b-2 flex items-center gap-1.5 transition ${activeSubTab === "templates" ? "text-teal-600 border-teal-600" : "text-muted-foreground border-transparent hover:text-foreground"}`}
          >
            <Cpu className="size-4" /> 📐 કસોટી બ્લુપ્રિન્ટ્સ (Exam Templates)
          </button>

          <button
            onClick={() => setActiveSubTab("results")}
            className={`pb-2.5 text-xs font-black border-b-2 flex items-center gap-1.5 transition ${activeSubTab === "results" ? "text-teal-600 border-teal-600" : "text-muted-foreground border-transparent hover:text-foreground"}`}
          >
            <BarChart2 className="size-4" /> 📈 પરિણામો અને પ્રભાવ ઓડિટ (Data Stats)
          </button>
        </div>

        <div className="hidden md:flex gap-1 items-center bg-teal-50 dark:bg-teal-950/20 px-3 py-1 rounded-full text-[10px] text-teal-700 font-extrabold uppercase">
          <Zap className="size-3" /> Pre-generated Paper Engine active
        </div>
      </div>

      {/* SUB-VIEW 1: SCHEDULED EXAMS SECTION */}
      {activeSubTab === "scheduled" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          
          {/* Scheduling Creator Form */}
          <form onSubmit={handleCreateScheduledExam} className="bg-card border rounded-3xl p-5 shadow-sm space-y-4 h-fit font-semibold">
            <div className="flex items-center gap-1 pb-1.5 border-b">
              <Sparkles className="size-4 text-teal-600" />
              <h4 className="text-xs font-extrabold text-foreground uppercase">એક્ઝામ પેપર ડિસ્પેચર (Schedule Direct)</h4>
            </div>

            {/* Template shortcuts dropdown */}
            {templates.length > 0 && (
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">📐 સંગ્રહિત બ્લુપ્રિન્ટ વડે સેટ કરો (Load Template Option)</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => applyTemplate(e.target.value)}
                  className="w-full h-10 px-3 bg-amber-500/10 text-amber-800 dark:text-amber-400 font-bold border border-amber-500/20 rounded-xl outline-none text-xs"
                >
                  <option value="">-- મોડલ પસંદ કરો --</option>
                  {templates.map(t => (
                    <option key={t.templateId} value={t.templateId}>{t.title} ({t.questionsCount} Qs)</option>
                  ))}
                </select>
                <span className="text-[9px] text-muted-foreground font-gu block mt-1">ટેમ્પલેટ પસંદ કરવાથી પ્રકરણો અને કાઠિણ્યતાનું ચોક્કસ માળખું આપોઆપ આવી જશે.</span>
              </div>
            )}

            <div>
              <label className="text-[10px] text-block text-muted-foreground mb-1 block">વિષય (Subject)</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full h-10 px-3 bg-muted/40 rounded-xl border text-xs"
              >
                {subjects.map(s => (
                  <option key={s.subjectId} value={s.subjectId}>{s.subjectName} (Std {s.standard})</option>
                ))}
              </select>
            </div>

            {/* Chapter Multi-Checkboxes with Scroll Container */}
            <div>
              <label className="text-[10px] text-muted-foreground mb-1.5 block">📘 પ્રકરણો પસંદ કરો (Support Multi-Chapter Selection)</label>
              <div className="max-h-28 overflow-y-auto border rounded-xl p-2.5 bg-muted/20 space-y-2 text-xs">
                {chapters.filter(c => c.subjectId === selectedSubjectId).map(c => (
                  <label key={c.chapterId} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-muted/40 rounded px-1.5 transition">
                    <input
                      type="checkbox"
                      checked={selectedChapterIds.includes(c.chapterId)}
                      onChange={() => handleChapterToggle(c.chapterId)}
                      className="rounded size-4 text-teal-600"
                    />
                    <span className="truncate">{c.chapterName}</span>
                  </label>
                ))}
                {chapters.filter(c => c.subjectId === selectedSubjectId).length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-2">આ વિષય માટે કોઈ પ્રકરણ મળ્યું નથી.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">કુલ પ્રશ્નો (No. of Qs)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={questionsTotalCount}
                  onChange={(e) => setQuestionsTotalCount(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-muted/40 border rounded-xl"
                />
              </div>

              <div>
                <label className="text-[10px] text-block text-muted-foreground mb-1 block">સમય મર્યાદા (Minutes)</label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={examDurationMin}
                  onChange={(e) => setExamDurationMin(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-muted/40 border rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">ડિલિવરી પદ્ધતિ (Scheduling Release Mode)</label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                className="w-full h-10 px-3 bg-muted/40 rounded-xl border text-xs"
              >
                <option value="Immediate">Immediate (પાલન તુરંત શરૂ કરો)</option>
                <option value="Scheduled">Scheduled (ચોક્કસ સમય ગણતરી)</option>
                <option value="Recurring">Recurring (સાપ્તાહિક પુનરાવર્તિત)</option>
              </select>
            </div>

            {/* Recurring controls */}
            {examType === "Recurring" && (
              <div>
                <label className="text-[10px] text-indigo-700 block mb-1">ચક્ર ગલન (Recurrence Pattern)</label>
                <select
                  value={recurringType}
                  onChange={(e) => setRecurringType(e.target.value)}
                  className="w-full h-10 px-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 rounded-xl text-xs outline-none"
                >
                  <option value="daily">મે રોજ (Every single day)</option>
                  <option value="weekly">દર રવિવારે (Sunday revision test cycle)</option>
                  <option value="monthly">માસિક મધ્ય સ્તર કસોટી (Once a month)</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">પરીક્ષા તારીખ (Exam Date)</label>
                <input
                  type="date"
                  value={examDateStr}
                  onChange={(e) => setExamDateStr(e.target.value)}
                  className="w-full h-10 px-3 bg-muted/40 border rounded-xl text-xs font-sans"
                />
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">પરીક્ષકનું નામ (Examiner Name)</label>
                <input
                  type="text"
                  value={examinerNameStr}
                  placeholder="કિશોરભાઈ મહેતા"
                  onChange={(e) => setExaminerNameStr(e.target.value)}
                  className="w-full h-10 px-3 bg-muted/40 border rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Auto Schedule release inputs details */}
            {examType === "Scheduled" && (
              <div className="space-y-2 pt-2 border-t text-[10px]">
                <p className="text-teal-700 uppercase font-black">⏰ સમયસીમા કંટ્રોલ (Time-Based Publish Bounds):</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-muted-foreground mb-1 block font-gu">પ્રકાશન સમય (Publish At)</label>
                    <input
                      type="datetime-local"
                      value={publishAtDate}
                      onChange={(e) => setPublishAtDate(e.target.value)}
                      className="w-full h-8 px-2 bg-muted/40 border rounded-lg font-sans text-[9px]"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground mb-1 block font-gu">બંધ થવાનો સમય (Expire At)</label>
                    <input
                      type="datetime-local"
                      value={endAtDate}
                      onChange={(e) => setEndAtDate(e.target.value)}
                      className="w-full h-8 px-2 bg-muted/40 border rounded-lg font-sans text-[9px]"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full h-11 bg-primary text-primary-foreground font-extrabold rounded-xl text-xs transition shadow-md"
            >
              🚀 પેપર જનરેશન અને શીડ્યુલ લૉક
            </button>
          </form>

          {/* Deliveries List Visualisation Dashboard */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center bg-muted/30 p-3 rounded-2xl border">
              <span className="text-xs font-extrabold text-foreground uppercase">કસોટી પત્રિકો (Scheduled Deliveries Logs)</span>
              <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-sans font-black">{exams.length} Exams Dispatched</span>
            </div>

            <div className="space-y-3">
              {exams.length === 0 ? (
                <div className="border border-dashed p-10 rounded-3xl text-center text-muted-foreground">
                  <Calendar className="size-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-xs font-semibold">હજી સુધી કોઈ પરીક્ષાઓ ગોઠવવામાં આવી નથી.</p>
                </div>
              ) : (
                exams.map((ex) => {
                  const sub = subjects.find(s => s.subjectId === ex.subjectId);
                  
                  // Count total unique student participants in results
                  const participants = results.filter(r => r.examId === ex.examId);
                  const participantUserIds = Array.from(new Set(participants.map(p => p.studentId)));

                  return (
                    <div 
                      key={ex.examId} 
                      className="bg-card border border-border/80 hover:border-teal-500/40 rounded-3xl p-5 shadow-sm transition relative overflow-hidden"
                    >
                      {/* Colored Left Bar for status visualizer */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${ex.status === "active" ? "bg-emerald-500" : "bg-slate-300"}`} />

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-extrabold uppercase mb-2">
                        <div className="flex items-center gap-1.5 pl-1">
                          <span className="px-2.5 py-1 bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 rounded-full">
                            Std {sub?.standard || "10"}
                          </span>
                          <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 rounded-full max-w-40 truncate">
                            {sub?.subjectName || "Syllabus Unit"}
                          </span>
                          <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-full font-serif font-bold">
                            {ex.totalQuestions} Qs locked
                          </span>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full ${
                          ex.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-500/10 text-slate-500"
                        }`}>
                          ● {ex.status === "active" ? "ચાલુ (ACTIVE)" : "બંધ (CLOSED)"}
                        </span>
                      </div>

                      {/* Title block */}
                      <div className="pl-1">
                        <h4 className="text-xs font-black text-foreground">
                          {sub?.subjectName || "General Science"} - Multi Chapter Term Test
                        </h4>
                        
                        {/* Chapter IDs lists inside description */}
                        {ex.chapterIds && ex.chapterIds.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1.5 mb-1 text-[9px] text-muted-foreground items-center">
                            <span className="font-bold">પ્રકરણ યાદી (Chapters):</span>
                            {ex.chapterIds.map((cId, cIdx) => {
                              const cName = chapters.find(ch => ch.chapterId === cId)?.chapterName || cId;
                              return (
                                <span key={cId} className="bg-muted px-1.5 py-0.5 rounded border border-border">
                                  {cName}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[10px] text-muted-foreground mt-1 font-gu">પ્રકરણ ક્રમાંક: {chapters.find(c => c.chapterId === ex.chapterId)?.chapterName || ex.chapterId || "સંકલિત યુનિટ"}</p>
                        )}
                      </div>

                      {/* Locked pre-generated Paper indicators check */}
                      {ex.questionIds && ex.questionIds.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-dashed flex items-center justify-between text-[10px] font-sans text-teal-600 mt-2 font-bold pl-1">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="size-3.5" /> Paper Pre-compiled successfully (ID: {ex.examId.substring(3, 7)}...)
                          </span>
                          <span className="text-slate-400 font-mono text-[9px]">{ex.questionIds.join(", ").substring(0, 30)}...</span>
                        </div>
                      )}

                      {/* Timestamps, active delivery metadata and actions */}
                      <div className="mt-3 pt-3 border-t flex flex-wrap justify-between items-center gap-3 text-[10px] pl-1 font-sans text-muted-foreground">
                        <div className="space-y-1 font-semibold leading-none">
                          <p>📅 તારીખ: <span className="font-bold text-foreground">{ex.examDate}</span> • સમયાવધિ: <span className="font-bold text-foreground">{ex.duration} min</span></p>
                          <p>👤 પરીક્ષક: <span className="font-bold text-foreground">{ex.examinerName || ex.examinerId || "પેનલ એડમિન"}</span></p>
                          {ex.publishAt && (
                            <p className="text-amber-600">⏰ પબ્લિશ સમયાવધિ: {new Date(ex.publishAt).toLocaleString()}</p>
                          )}
                        </div>

                        {/* Control actions */}
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border">
                            👥 {participantUserIds.length} Participated
                          </span>
                          
                          {ex.status === "active" ? (
                            <button
                              onClick={() => handleCloseExam(ex.examId)}
                              className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 font-extrabold rounded-lg hover:shadow-sm transition"
                            >
                              કસોટી સમાપ્ત કરો (Close Test)
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenExam(ex)}
                              className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-extrabold rounded-lg hover:shadow-sm transition"
                            >
                              ફરી શરૂ કરો (Re-activate)
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

      {/* SUB-VIEW 2: BLUEPRINTS / EXAM TEMPLATES */}
      {activeSubTab === "templates" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          
          {/* Blueprints compiler creator form */}
          <form onSubmit={handleSaveTemplate} className="bg-card border rounded-3xl p-5 shadow-sm space-y-4 h-fit font-semibold">
            <div className="flex items-center gap-1 pb-1 border-b">
              <Cpu className="size-4 text-teal-600" />
              <h4 className="text-xs font-extrabold text-foreground uppercase">બ્લુપ્રિન્ટ મશીન (Template blueprint compiler)</h4>
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">📐 બ્લુપ્રિન્ટ શીર્ષક (Template Title)</label>
              <input
                type="text"
                value={newTemplateTitle}
                onChange={(e) => setNewTemplateTitle(e.target.value)}
                placeholder="દસમા ધોરણની પ્રકરણ ૧-૨ ની કસોટી"
                className="w-full h-10 px-3 bg-muted/40 border rounded-xl placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">વિષય (Subject)</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full h-10 px-3 bg-muted/40 rounded-xl border text-xs"
              >
                {subjects.map(s => (
                  <option key={s.subjectId} value={s.subjectId}>{s.subjectName} (Std {s.standard})</option>
                ))}
              </select>
            </div>

            {/* Chapters selecting checklist inside Template compiler */}
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">📘 પ્રકરણો લિંક કરો (Checklist selector)</label>
              <div className="max-h-24 overflow-y-auto border rounded-xl p-2.5 bg-muted/20 space-y-2 text-xs">
                {chapters.filter(c => c.subjectId === selectedSubjectId).map(c => (
                  <label key={c.chapterId} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-muted/40 rounded px-1 transition">
                    <input
                      type="checkbox"
                      checked={selectedChapterIds.includes(c.chapterId)}
                      onChange={() => handleChapterToggle(c.chapterId)}
                      className="rounded size-4 text-teal-600"
                    />
                    <span>{c.chapterName}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">કુલ પ્રશ્ન સંખ્યા (Questions limit)</label>
              <input
                type="number"
                min="5"
                max="50"
                value={questionsTotalCount}
                onChange={(e) => setQuestionsTotalCount(Number(e.target.value))}
                className="w-full h-10 px-3 bg-muted/40 border rounded-xl text-xs font-sans"
              />
            </div>

            {/* Target Difficulty proportions indicators */}
            <div className="space-y-2.5 pt-2 border-t">
              <p className="text-[10px] text-teal-600 font-black uppercase">📊 કાઠિણ્યતા સ્તર વિભાજન (Difficulty Mix proportion %):</p>
              <div className="grid grid-cols-3 gap-2 font-sans font-black text-center">
                <div>
                  <span className="text-[9px] block mb-1 text-emerald-600">Easy (સરળ)</span>
                  <input
                    type="number"
                    value={tempEasyMix}
                    onChange={(e) => setTempEasyMix(e.target.value)}
                    className="w-full h-8 border rounded px-2 text-center text-xs text-foreground bg-muted/30"
                  />
                </div>
                <div>
                  <span className="text-[9px] block mb-1 text-amber-600">Medium (મધ્યમ)</span>
                  <input
                    type="number"
                    value={tempMediumMix}
                    onChange={(e) => setTempMediumMix(e.target.value)}
                    className="w-full h-8 border rounded px-2 text-center text-xs text-foreground bg-muted/30"
                  />
                </div>
                <div>
                  <span className="text-[9px] block mb-1 text-red-600">Hard (અઘરું)</span>
                  <input
                    type="number"
                    value={tempHardMix}
                    onChange={(e) => setTempHardMix(e.target.value)}
                    className="w-full h-8 border rounded px-2 text-center text-xs text-foreground bg-muted/30"
                  />
                </div>
              </div>
              <span className="text-[9px] text-muted-foreground font-gu block">આ ત્રણેય ખાલી જગ્યાઓનો સરવાળો ૧૦૦ થવો ફરજિયાત છે!</span>
            </div>

            <button
              type="submit"
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs transition shadow-md"
            >
              📐 નવો બ્લુપ્રિન્ટ ટેમ્પલેટ સાચવો
            </button>
          </form>

          {/* Generated Templates list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center bg-muted/30 p-3 rounded-2xl border">
              <span className="text-xs font-extrabold text-foreground uppercase">સંગ્રહિત બ્લુપ્રિન્ટ્સ (Saved blueprints list)</span>
              <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-sans font-black">{templates.length} Templates</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.length === 0 ? (
                <div className="col-span-2 border border-dashed rounded-3xl p-10 text-center text-muted-foreground text-xs leading-normal">
                  <Cpu className="size-8 mx-auto text-muted-foreground/50 mb-2" />
                  હજી સુધી કોઈ એક્ઝામ પેપર બ્લુપ્રિન્ટ તૈયાર કરાઈ નથી.
                </div>
              ) : (
                templates.map(t => {
                  const subject = subjects.find(s => s.subjectId === t.subjectId);
                  
                  return (
                    <div 
                      key={t.templateId} 
                      className="bg-card border rounded-3xl p-5 shadow-sm hover:border-indigo-500/40 transition relative flex flex-col justify-between"
                    >
                      <div>
                        {/* Blueprint header indicators */}
                        <div className="flex justify-between items-start gap-2 mb-2 font-sans text-[9px] font-black uppercase text-muted-foreground">
                          <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full font-bold">Std {t.standard} blueprint</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(t.templateId)}
                            className="text-red-500 hover:text-red-700 transition"
                            title="ટેમ્પલેટ કાઢી નાખો"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>

                        <h4 className="text-xs font-extrabold text-foreground leading-normal">{t.title}</h4>
                        <p className="text-[10px] text-teal-600 font-semibold font-sans mt-0.5">Syllabus Subject: {subject?.subjectName || t.subjectId}</p>

                        {/* Difficulty mix badge layout indicators */}
                        <div className="grid grid-cols-3 gap-1.5 mt-3 text-center text-[9px] leading-none font-bold font-sans">
                          <div className="bg-emerald-500/5 text-emerald-600 p-1.5 rounded-lg border border-emerald-500/10">
                            <span className="opacity-80 block mb-0.5">Easy</span>
                            <span className="text-xs font-black">{t.difficultyMix.easy}%</span>
                          </div>
                          <div className="bg-amber-500/5 text-amber-600 p-1.5 rounded-lg border border-amber-500/10">
                            <span className="opacity-80 block mb-0.5">Medium</span>
                            <span className="text-xs font-black">{t.difficultyMix.medium}%</span>
                          </div>
                          <div className="bg-red-500/5 text-red-600 p-1.5 rounded-lg border border-red-500/10">
                            <span className="opacity-80 block mb-0.5">Hard</span>
                            <span className="text-xs font-black">{t.difficultyMix.hard}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t flex justify-between items-center text-[10px] font-sans font-bold">
                        <span className="text-muted-foreground">{t.questionsCount} questions model</span>
                        <button
                          type="button"
                          onClick={() => { applyTemplate(t.templateId); setActiveSubTab("scheduled"); }}
                          className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        >
                          મોકલો (Dispatch Paper) <ChevronRight className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

      {/* SUB-VIEW 3: RESULTS & METRICS DASHBOARD */}
      {activeSubTab === "results" && (
        <div className="space-y-6 animate-fadeIn font-semibold text-xs text-foreground">
          
          {/* General Metrics Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-black block leading-none">કુલ લેવાયેલી કસોટીઓ</span>
              <span className="text-xl font-extrabold text-foreground">{exams.length} Exams</span>
            </div>

            <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-black block leading-none">કુલ વિદ્યાર્થી નોંધણી</span>
              <span className="text-xl font-extrabold text-teal-600">{results.length} Attempt submissions</span>
            </div>

            <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-black block leading-none">ઉત્તીર્ણ થયેલ વિદ્યાર્થીઓ (Averages score)</span>
              <span className="text-xl font-extrabold text-indigo-600">
                {results.length > 0 ? (results.reduce((s, r) => s + r.percentage, 0) / results.length).toFixed(1) : "0"} %
              </span>
            </div>

            <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-black block leading-none">રિપીટ પ્રકરણ રેટર્સ (Sparsity indexes)</span>
              <span className="text-xl font-extrabold text-emerald-600">Healthy</span>
            </div>
          </div>

          {/* Historical Attempts Records */}
          <div className="bg-card border rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h4 className="text-xs font-extrabold text-foreground uppercase">વિદ્યાર્થી ગુણાંક શ્રેણી પત્રક (Students attempt records)</h4>
              <span className="text-[10px] text-muted-foreground">Historical records list review</span>
            </div>

            <div className="border rounded-2xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left font-medium border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b">
                    <th className="p-3 text-[10px] uppercase font-bold text-muted-foreground">Student UID ID</th>
                    <th className="p-3 text-[10px] uppercase font-bold text-muted-foreground font-gu">કસોટી પત્રક</th>
                    <th className="p-3 text-[10px] uppercase font-bold text-muted-foreground">સાચા પ્રશ્નો (Accuracy indices)</th>
                    <th className="p-3 text-[10px] uppercase font-bold text-muted-foreground">ટકાવારી (Percentage Score)</th>
                    <th className="p-3 text-[10px] uppercase font-bold text-muted-foreground">સબમિટ સમય (Submitted At)</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground text-xs leading-normal">હજી સુધી કોઈ પ્રયાસો રેકોર્ડ કરાયા નથી.</td>
                    </tr>
                  ) : (
                    results.map((r, rIdx) => (
                      <tr key={r.resultId || rIdx} className="border-b hover:bg-muted/30">
                        <td className="p-3 font-sans font-extrabold text-foreground">{r.studentId}</td>
                        <td className="p-3 leading-normal">
                          <span className="font-extrabold">{r.subject}</span><br />
                          <span className="text-[10px] text-muted-foreground">{r.chapter || "(પ્રકરણ ડેટા)"}</span>
                        </td>
                        <td className="p-3 font-sans">
                          🏆 <span className="font-extrabold text-emerald-600">{r.correctAnswers}</span> / {r.totalQuestions}
                        </td>
                        <td className="p-3 font-sans">
                          <span className={`px-2 py-0.5 rounded font-black ${r.percentage >= 60 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20" : "bg-red-50 text-red-600 dark:bg-red-950/20"}`}>
                            {r.percentage}%
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[10px] text-muted-foreground">
                          {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : ""}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
