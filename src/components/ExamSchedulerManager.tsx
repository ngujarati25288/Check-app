import React, { useState, useEffect } from "react";
import { 
  Calendar, Clock, Award, ShieldAlert, BookOpen, Trash2, Edit3, PlusCircle, 
  Layers, CheckCircle2, XCircle, Info, Sparkles, Cpu, ChevronRight, BarChart2, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DailyExam, Subject, Chapter, Question, ExamTemplate, ExamResult, DBUser } from "@/types";
import { AdminRepository } from "@/lib/db";
import { toast } from "sonner";

interface ExamSchedulerManagerProps {
  subjects: Subject[];
  chapters: Chapter[];
  questions: Question[];
  exams: DailyExam[];
  results: ExamResult[];
  students?: DBUser[];
  onRefresh: () => void;
  currentUser: { uid: string; fullName: string; role: any } | null;
}

export function ExamSchedulerManager({
  subjects,
  chapters,
  questions,
  exams,
  results,
  students = [],
  onRefresh,
  currentUser
}: ExamSchedulerManagerProps) {
  // Tabs
  const [activeSubTab, setActiveSubTab] = useState<"scheduled" | "completed" | "results">("scheduled");
  
  // States for scheduling a new exam from scratch
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

  // Real-time ticker for countdown displays in dispatch log
  const [nowTime, setNowTime] = useState(new Date());

  // Reschedule existing exam states
  const [schedulingExamId, setSchedulingExamId] = useState<string | null>(null);
  const [deletingExamId, setDeletingExamId] = useState<string | null>(null);
  const [newDateVal, setNewDateVal] = useState("");
  const [newDurationVal, setNewDurationVal] = useState(30);
  const [newExaminerVal, setNewExaminerVal] = useState("");

  useEffect(() => {
    const handle = setInterval(() => setNowTime(new Date()), 1000);
    return () => clearInterval(handle);
  }, []);

  // Filter subjects to only those that actually have questions in our master bank
  const activeQuestionSubjects = React.useMemo(() => {
    return subjects.filter(sub => 
      questions.some(q => q.subjectId === sub.subjectId)
    );
  }, [subjects, questions]);

  useEffect(() => {
    const list = activeQuestionSubjects.length > 0 ? activeQuestionSubjects : subjects;
    if (list.length > 0 && (!selectedSubjectId || !list.some(s => s.subjectId === selectedSubjectId))) {
      setSelectedSubjectId(list[0].subjectId);
    }
  }, [activeQuestionSubjects, subjects, selectedSubjectId]);

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

  // Direct exam creation from scheduler form is removed as daily exams are scheduled via the question bank.

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

  const handleDeleteExam = async (examId: string) => {
    try {
      const success = await AdminRepository.deleteExam(
        currentUser?.uid || "admin",
        currentUser?.fullName || "Admin",
        examId
      );
      if (success) {
        toast.success("పరీక్ష విజయవంతంగా డీలీట్ చేయబడింది! (પરીક્ષા સફળતાપૂર્વક ડિલીટ કરાઈ!)");
        onRefresh();
      } else {
        toast.error("પરીક્ષા ડિલીટ કરવામાં અસમર્થ.");
      }
    } catch (_) {
      toast.error("પરીક્ષા ડિલીટ કરતી વખતે કોઈ ભૂલ આવી.");
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

  const startScheduling = (ex: DailyExam) => {
    setSchedulingExamId(ex.examId);
    setNewDateVal(ex.examDate || new Date().toISOString().substring(0, 10));
    setNewDurationVal(ex.duration || 30);
    setNewExaminerVal(ex.examinerName || ex.examinerId || "");
  };

  const saveNewSchedule = async (examId: string) => {
    if (!newDateVal) {
      toast.error("કૃપા કરીને તારીખ પસંદ કરો.");
      return;
    }

    const exSource = exams.find(e => e.examId === examId);
    if (!exSource) return;

    // Create a NEW duplicate exam with a fresh ID so it can be retaken from scratch by students!
    const newExamId = "ex_" + Date.now();
    const newExamPayload: DailyExam = {
      ...exSource,
      examId: newExamId,
      examDate: newDateVal,
      duration: Number(newDurationVal),
      examinerName: newExaminerVal.trim() || exSource.examinerName || "Admin",
      examinerId: currentUser?.uid || "admin",
      status: "active", // Reactivates or marks as active
      createdAt: new Date().toISOString(),
      publishAt: new Date(newDateVal + "T00:00:00").toISOString(),
      startAt: new Date(newDateVal + "T00:00:00").toISOString(),
      endAt: new Date(newDateVal + "T23:59:59").toISOString(),
      expireAt: new Date(newDateVal + "T23:59:59").toISOString(),
    };

    try {
      const success = await AdminRepository.createExam(
        currentUser?.uid || "admin",
        currentUser?.fullName || "Admin",
        newExamPayload
      );

      if (success) {
        toast.success("નવું શેડ્યૂલ સફળતાપૂર્વક સેટ કરવામાં આવ્યું છે અને નવો એક્ઝામ સેટ લોન્ચ કરાયો છે!");
        setSchedulingExamId(null);
        onRefresh();
      } else {
        toast.error("નવું શેડ્યૂલ સેટ કરી શકાયું નહીં (તારીખ ડુપ્લિકેટ ડેટાબેઝ મર્યાદા નિયમ).");
      }
    } catch (_) {
      toast.error("શેડ્યૂલ સેવ કરવામાં કોઈ ખામી ઉદ્ભવી.");
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
            <Calendar className="size-4" /> 📅 ચાલુ પરીક્ષા (Active Exams)
          </button>
          
          <button
            onClick={() => setActiveSubTab("completed")}
            className={`pb-2.5 text-xs font-black border-b-2 flex items-center gap-1.5 transition ${activeSubTab === "completed" ? "text-teal-600 border-teal-600" : "text-muted-foreground border-transparent hover:text-foreground"}`}
          >
            <CheckCircle2 className="size-4" /> 🎓 પૂર્ણ થયેલ કસોટીઓ (Complete Exam)
          </button>

          <button
            onClick={() => setActiveSubTab("results")}
            className={`pb-2.5 text-xs font-black border-b-2 flex items-center gap-1.5 transition ${activeSubTab === "results" ? "text-teal-600 border-teal-600" : "text-muted-foreground border-transparent hover:text-foreground"}`}
          >
            <BarChart2 className="size-4" /> 📈 પરિણામો અને પ્રભાવ ઓડિટ (Data Stats)
          </button>
        </div>

        <div className="hidden md:flex gap-1 items-center bg-teal-50 dark:bg-teal-950/20 px-3 py-1 rounded-full text-[10px] text-teal-700 font-extrabold uppercase">
          <Zap className="size-3" /> Exam Engine Active
        </div>
      </div>

      {/* SUB-VIEW 1: SCHEDULED EXAMS SECTION */}
      {activeSubTab === "scheduled" && (
        <div className="space-y-4 animate-fadeIn">
          
          {/* Deliveries List Visualisation Dashboard */}
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-muted/30 p-3 rounded-2xl border">
              <span className="text-xs font-extrabold text-foreground uppercase">કસોટી પત્રિકો (Active & Scheduled Exams)</span>
              <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-sans font-black">
                {exams.filter(ex => ex.status === "active" || ex.status === "scheduled").length} Active / Scheduled
              </span>
            </div>

            <div className="space-y-3">
              {exams.filter(ex => ex.status === "active" || ex.status === "scheduled").length === 0 ? (
                <div className="border border-dashed p-10 rounded-3xl text-center text-muted-foreground">
                  <Calendar className="size-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-xs font-semibold">ચાલુ કે આયોજિત કોઈ કસોટી મળી નથી. કૃપા કરીને પ્રશ્ન બેંકમાંથી કસોટી યોજો.</p>
                </div>
              ) : (
                exams.filter(ex => ex.status === "active" || ex.status === "scheduled").map((ex) => {
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
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                        ex.status === "active" ? "bg-emerald-500" :
                        ex.status === "scheduled" ? "bg-amber-500 animate-pulse" : "bg-slate-300"
                      }`} />

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-extrabold uppercase mb-2">
                        <div className="flex items-center gap-1.5 pl-1">
                          <span className="px-2.5 py-1 bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 rounded-full">
                            Std {ex.standard || sub?.standard || "10"}
                          </span>
                          <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 rounded-full max-w-40 truncate">
                            {sub?.subjectName || "Syllabus Unit"}
                          </span>
                          <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-full font-serif font-bold">
                            {ex.totalQuestions} Qs
                          </span>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full ${
                          ex.status === "active" ? "bg-emerald-500/10 text-emerald-600" :
                          ex.status === "scheduled" ? "bg-amber-500/10 text-amber-600" : "bg-slate-500/10 text-slate-500"
                        }`}>
                          ● {
                            ex.status === "active" ? "ચાલુ (ACTIVE)" : "આયોજિત (SCHEDULED)"
                          }
                        </span>
                      </div>

                      {/* Title block */}
                      <div className="pl-1">
                        <h4 className="text-xs font-black text-foreground">
                          {sub?.subjectName || "General Science"} - Multi Chapter Term Test
                        </h4>
                        
                        {/* Chapter IDs lists inside description */}
                        {ex.chapterIds && ex.chapterIds.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5 mb-1 text-[9px] text-muted-foreground items-center">
                            <span className="font-bold">પ્રકરણ યાદી (Chapters):</span>
                            {ex.chapterIds.map((cId) => {
                              const cName = chapters.find(ch => ch.chapterId === cId)?.chapterName || cId;
                              return (
                                <span key={cId} className="bg-muted px-1.5 py-0.5 rounded border border-border">
                                  {cName}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Timestamps, active delivery metadata and actions */}
                      <div className="mt-3 pt-3 border-t flex flex-wrap justify-between items-center gap-3 text-[10px] pl-1 font-sans text-muted-foreground">
                        <div className="space-y-1 font-semibold leading-none">
                          <p>📅 તારીખ: <span className="font-bold text-foreground">{ex.examDate}</span> • સમયાવધિ: <span className="font-bold text-foreground">{ex.duration} min</span></p>
                          <p>👤 પરીક્ષક: <span className="font-bold text-foreground">{ex.examinerName || ex.examinerId || "પેનલ એડમિન"}</span></p>
                          {ex.publishAt && (
                            <p className="text-amber-600">
                              ⏰ પબ્લિશ સમય: {new Date(ex.publishAt).toLocaleString()}
                              {ex.status === "scheduled" && new Date(ex.publishAt) > nowTime && (
                                <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold font-mono">
                                  (Time left: {(() => {
                                    const diff = new Date(ex.publishAt).getTime() - nowTime.getTime();
                                    const h = Math.floor(diff / (1000 * 60 * 60));
                                    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                    const s = Math.floor((diff % (1000 * 60)) / 1000);
                                    let str = "";
                                    if (h > 0) str += `${h}h `;
                                    if (m > 0 || h > 0) str += `${m}m `;
                                    str += `${s}s`;
                                    return str;
                                  })()})
                                </span>
                              )}
                            </p>
                          )}
                        </div>

                        {/* Control actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t pt-3 mt-3">
                          <span className="text-[9px] bg-indigo-50 dark:bg-slate-800 dark:text-indigo-300 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-100 dark:border-slate-700 font-semibold">
                            👥 {participantUserIds.length} Participated
                          </span>
                          
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => startScheduling(ex)}
                              className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/40 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-extrabold rounded-lg hover:shadow-xs transition text-[9px] font-gu uppercase tracking-wider"
                            >
                              📅 નવું શેડ્યૂલ સેટ કરો (Set New Schedule)
                            </button>

                            <button
                              onClick={() => handleCloseExam(ex.examId)}
                              className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-extrabold rounded-lg hover:shadow-xs transition text-[9px] font-gu uppercase tracking-wider"
                            >
                              ❌ કસોટી સમાપ્ત કરો (Close Test)
                            </button>

                            {deletingExamId === ex.examId ? (
                              <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/30 p-1.5 rounded-lg border border-red-200 dark:border-red-950/50">
                                <span className="text-[9px] text-red-700 dark:text-red-400 font-bold">ખરેખર ડિલીટ કરવું છે? (Delete?)</span>
                                <button
                                  onClick={() => { handleDeleteExam(ex.examId); setDeletingExamId(null); }}
                                  className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[9px] font-black uppercase"
                                >
                                  હા (Yes)
                                </button>
                                <button
                                  onClick={() => setDeletingExamId(null)}
                                  className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[9px] font-black uppercase"
                                >
                                  ના (No)
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletingExamId(ex.examId)}
                                className="px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 font-extrabold rounded-lg hover:shadow-xs transition text-[9px] font-gu uppercase tracking-wider flex items-center gap-1"
                              >
                                <Trash2 className="size-3" /> ડિલીટ (Delete)
                              </button>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Compact Rescheduling Form */}
                      {schedulingExamId === ex.examId && (
                        <div className="mt-3.5 p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 font-semibold text-[11px] text-foreground mx-1 animate-[fade-in_0.25s_ease-out]">
                          <p className="text-[10px] font-extrabold text-teal-700 dark:text-teal-400 uppercase font-gu">નવું શેડ્યૂલ ગોઠવો (Schedule New Paper Set)</p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[9px] text-muted-foreground uppercase font-black mb-1">પરીક્ષા તારીખ (Date)</label>
                              <input 
                                type="date"
                                value={newDateVal}
                                onChange={(e) => setNewDateVal(e.target.value)}
                                className="w-full h-8 px-2 bg-background border rounded-lg text-xs font-semibold outline-none focus:border-teal-500 font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] text-muted-foreground uppercase font-black mb-1">સમય મર્યાદા મિનિટ (Duration)</label>
                              <input 
                                type="number"
                                value={newDurationVal}
                                onChange={(e) => setNewDurationVal(Number(e.target.value))}
                                className="w-full h-8 px-2 bg-background border rounded-lg text-xs font-semibold outline-none focus:border-teal-500 font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] text-muted-foreground uppercase font-black mb-1">પરીક્ષકનું નામ (Examiner)</label>
                              <input 
                                type="text"
                                value={newExaminerVal}
                                onChange={(e) => setNewExaminerVal(e.target.value)}
                                className="w-full h-8 px-2 bg-background border rounded-lg text-xs font-semibold outline-none focus:border-teal-500"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-1 font-sans">
                            <button
                              onClick={() => setSchedulingExamId(null)}
                              className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black rounded-lg text-[9px] hover:bg-slate-300 uppercase"
                            >
                              નિરસ્ત (Cancel)
                            </button>
                            <button
                              onClick={() => saveNewSchedule(ex.examId)}
                              className="px-2.5 py-1 bg-teal-600 dark:bg-teal-500 text-white font-black rounded-lg text-[9px] hover:bg-teal-700 transition uppercase"
                            >
                              સેટ શેડ્યૂલ (Confirm & Launch)
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

      {/* SUB-VIEW 2: COMPLETED EXAMS SECTION */}
      {activeSubTab === "completed" && (
        <div className="space-y-4 animate-fadeIn">
          
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-muted/30 p-3 rounded-2xl border font-semibold">
              <span className="text-xs font-extrabold text-foreground uppercase">પૂર્ણ થયેલ કસોટીઓ (Completed/Closed General History)</span>
              <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-sans font-black">
                {exams.filter(ex => ex.status === "closed" || ex.status === "archived").length} Closed Exams
              </span>
            </div>

            <div className="space-y-3">
              {exams.filter(ex => ex.status === "closed" || ex.status === "archived").length === 0 ? (
                <div className="border border-dashed p-10 rounded-3xl text-center text-muted-foreground">
                  <CheckCircle2 className="size-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-xs font-semibold">હજી સુધી કોઈ કસોટી પૂર્ણ થયેલ નથી.</p>
                </div>
              ) : (
                exams.filter(ex => ex.status === "closed" || ex.status === "archived").map((ex) => {
                  const sub = subjects.find(s => s.subjectId === ex.subjectId);
                  
                  // Count total unique student participants in results
                  const participants = results.filter(r => r.examId === ex.examId);
                  const participantUserIds = Array.from(new Set(participants.map(p => p.studentId)));

                  return (
                    <div 
                      key={ex.examId} 
                      className="bg-card border border-border/80 rounded-3xl p-5 shadow-sm transition relative overflow-hidden"
                    >
                      {/* Grey Left Bar for closed element */}
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-slate-400 dark:bg-slate-600" />

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-extrabold uppercase mb-2">
                        <div className="flex items-center gap-1.5 pl-1">
                          <span className="px-2.5 py-1 bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 rounded-full">
                            Std {ex.standard || sub?.standard || "10"}
                          </span>
                          <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 rounded-full max-w-40 truncate">
                            {sub?.subjectName || "Syllabus Unit"}
                          </span>
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full font-serif font-bold">
                            {ex.totalQuestions} Qs
                          </span>
                        </div>

                        <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-black">
                          ● બંધ (CLOSED)
                        </span>
                      </div>

                      {/* Title block */}
                      <div className="pl-1">
                        <h4 className="text-xs font-black text-foreground">
                          {sub?.subjectName || "General Science"} - Multi Chapter Term Test
                        </h4>
                        
                        {/* Chapter IDs lists inside description */}
                        {ex.chapterIds && ex.chapterIds.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5 mb-1 text-[9px] text-muted-foreground items-center">
                            <span className="font-bold">પ્રકરણ યાદી (Chapters):</span>
                            {ex.chapterIds.map((cId) => {
                              const cName = chapters.find(ch => ch.chapterId === cId)?.chapterName || cId;
                              return (
                                <span key={cId} className="bg-muted px-1.5 py-0.5 rounded border border-border">
                                  {cName}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Timestamps, active delivery metadata and actions */}
                      <div className="mt-3 pt-3 border-t flex flex-wrap justify-between items-center gap-3 text-[10px] pl-1 font-sans text-muted-foreground">
                        <div className="space-y-1 font-semibold leading-none">
                          <p>📅 તારીખ: <span className="font-bold text-foreground">{ex.examDate}</span> • સમયાવધિ: <span className="font-bold text-foreground">{ex.duration} min</span></p>
                          <p>👤 પરીક્ષક: <span className="font-bold text-foreground">{ex.examinerName || ex.examinerId || "પેનલ એડમિન"}</span></p>
                        </div>

                        {/* Control actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t pt-3 mt-3">
                          <span className="text-[9px] bg-indigo-50 dark:bg-slate-800 dark:text-indigo-300 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-100 dark:border-slate-700 font-semibold">
                            👥 {participantUserIds.length} Participated
                          </span>
                          
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => startScheduling(ex)}
                              className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/40 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-extrabold rounded-lg hover:shadow-xs transition text-[10px] font-gu uppercase tracking-wider"
                            >
                              📅 ફરી નવું શેડ્યૂલ સેટ કરો (Set New Schedule)
                            </button>

                            {deletingExamId === ex.examId ? (
                              <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/30 p-1.5 rounded-lg border border-red-200 dark:border-red-950/50">
                                <span className="text-[9px] text-red-700 dark:text-red-400 font-bold">ખરેખર ડિલીટ કરવું છે? (Delete?)</span>
                                <button
                                  onClick={() => { handleDeleteExam(ex.examId); setDeletingExamId(null); }}
                                  className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[9px] font-black uppercase"
                                >
                                  હા (Yes)
                                </button>
                                <button
                                  onClick={() => setDeletingExamId(null)}
                                  className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[9px] font-black uppercase"
                                >
                                  ના (No)
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletingExamId(ex.examId)}
                                className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 font-extrabold rounded-lg hover:shadow-xs transition text-[10px] font-gu uppercase tracking-wider flex items-center gap-1"
                              >
                                <Trash2 className="size-3.5" /> ડિલીટ (Delete)
                              </button>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Compact Rescheduling Form */}
                      {schedulingExamId === ex.examId && (
                        <div className="mt-3.5 p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 font-semibold text-[11px] text-foreground mx-1 animate-[fade-in_0.25s_ease-out]">
                          <p className="text-[10px] font-extrabold text-teal-700 dark:text-teal-400 uppercase font-gu">નવું શેડ્યૂલ ગોઠવો (Schedule New Paper Set)</p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[9px] text-muted-foreground uppercase font-black mb-1">પરીક્ષા તારીખ (Date)</label>
                              <input 
                                type="date"
                                value={newDateVal}
                                onChange={(e) => setNewDateVal(e.target.value)}
                                className="w-full h-8 px-2 bg-background border rounded-lg text-xs font-semibold outline-none focus:border-teal-500 font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] text-muted-foreground uppercase font-black mb-1">સમય મર્યાદા મિનિટ (Duration)</label>
                              <input 
                                type="number"
                                value={newDurationVal}
                                onChange={(e) => setNewDurationVal(Number(e.target.value))}
                                className="w-full h-8 px-2 bg-background border rounded-lg text-xs font-semibold outline-none focus:border-teal-500 font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] text-muted-foreground uppercase font-black mb-1">પરીક્ષકનું નામ (Examiner)</label>
                              <input 
                                type="text"
                                value={newExaminerVal}
                                onChange={(e) => setNewExaminerVal(e.target.value)}
                                className="w-full h-8 px-2 bg-background border rounded-lg text-xs font-semibold outline-none focus:border-teal-500"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-1 font-sans">
                            <button
                              onClick={() => setSchedulingExamId(null)}
                              className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black rounded-lg text-[9px] hover:bg-slate-300 uppercase"
                            >
                              નિરસ્ત (Cancel)
                            </button>
                            <button
                              onClick={() => saveNewSchedule(ex.examId)}
                              className="px-2.5 py-1 bg-teal-600 dark:bg-teal-500 text-white font-black rounded-lg text-[9px] hover:bg-teal-700 transition uppercase"
                            >
                              સેટ શેડ્યૂલ (Confirm & Launch)
                            </button>
                          </div>
                        </div>
                      )}

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
                    <th className="p-3 text-[10px] uppercase font-bold text-muted-foreground font-gu">વિદ્યાર્થી નું નામ & આઈડી (Student Name & ID)</th>
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
                    results.map((r, rIdx) => {
                      const matchStud = students.find(s => s.uid === r.studentId || s.studentId === r.studentId);
                      const studentNameDisplay = matchStud ? `${matchStud.fullName} (${matchStud.studentId || r.studentId})` : r.studentId;
                      
                      return (
                        <tr key={r.resultId || rIdx} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-semibold text-foreground text-xs font-sans">
                            {studentNameDisplay}
                          </td>
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
                    );
                  })
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
