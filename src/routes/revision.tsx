import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { Sparkles, CheckCircle2, ChevronLeft, ChevronRight, Target, Flame, RotateCw, BookOpen, AlertCircle, HelpCircle, Trophy, BarChart3, TrendingUp, HelpCircleIcon, Mic, MicOff, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/FirebaseProvider";
import { MistakeRepository, AnalyticsRepository } from "@/lib/db";
import { StudentMistake, RevisionAnalytics } from "@/types";
import { sfx } from "@/lib/settings";
import { toast } from "sonner";
import { getApiUrl } from "@/lib/api/exam.functions";

export const Route = createFileRoute("/revision")({
  head: () => ({ meta: [{ title: "Daily Revision & Mastery Engine" }] }),
  component: Revision,
});

function Revision() {
  const { user } = useAuth();
  const [dailyPool, setDailyPool] = useState<StudentMistake[]>([]);
  const [loading, setLoading] = useState(true);
  const [allMistakes, setAllMistakes] = useState<StudentMistake[]>([]);
  const [analytics, setAnalytics] = useState<RevisionAnalytics | null>(null);

  // Subject & Chapter filtering and Views
  const [selectedSubject, setSelectedSubject] = useState<string>("All");
  const [selectedChapter, setSelectedChapter] = useState<string>("All");
  const [activeView, setActiveView] = useState<"quiz" | "breakdown">("quiz");
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  // Practice state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [practicedCount, setPracticedCount] = useState(0);
  const [motivationMsg, setMotivationMsg] = useState("");
  
  // Speech Recognition & AI validation states
  const [isRecording, setIsRecording] = useState(false);
  const [isLoadingEval, setIsLoadingEval] = useState(false);
  const [aiFeedbackText, setAiFeedbackText] = useState("");
  const recognitionRef = useRef<any>(null);

  const startVoiceTyping = () => {
    if (isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error("Failed to stop recognition instance:", err);
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("તમારા બ્રાઉઝરમાં સ્પીચ રેકગ્નિશન સપોર્ટ નથી. કૃપા કરીને ક્રોમ અથવા આઈપેડ/મોબાઈલનો ઉપયોગ કરો.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = "gu-IN"; // Speaks Gujarati
    rec.continuous = false;
    rec.interimResults = false;

    rec.onstart = () => {
      setIsRecording(true);
      sfx.tap();
      toast.info("બોલવાનું શરૂ કરો... (Speak in Gujarati now)");
    };

    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      if (transcript && transcript.trim() !== "") {
        const currentAnswer = selectedOption || "";
        const space = currentAnswer ? " " : "";
        const updatedText = currentAnswer + space + transcript;
        
        setSelectedOption(updatedText);
        toast.success("તમારો ઉત્તર ઉમેરાઈ ગયો!");
      }
    };

    rec.onerror = (err: any) => {
      console.error("Speech Recognition error:", err);
      const errType = String(err.error || "").toLowerCase();
      if (errType === "no-speech") {
        toast.warning("કોઈ અવાજ સંભળાયો નથી. મહેરબાની કરીને ફરીથી પ્રયાસ કરો.");
      } else if (errType === "not-allowed" || errType === "permission-blocked") {
        toast.error("માઇક્રોફોનની પરવાનગી બ્લોક છે! આના ઉકેલ માટે ઉપર આપેલ 'Open in a new tab' (તમારી લિંક નવા ટેબમાં ખોલો) બટન પર ક્લિક કરો.");
      } else {
        toast.error(`ભાષણ-થી-લખાણમાં સહેજ ક્ષતિ આવી (${err.error || "તપાસો"}).`);
      }
      setIsRecording(false);
    };

    rec.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const loadData = async (active: boolean) => {
    if (!user?.uid) return;

    const timeoutId = setTimeout(() => {
      if (active && loading) {
        setLoading(false);
        console.warn("Revision loading timed out after 8s");
      }
    }, 8000);

    try {
      setLoading(true);
      // Load prioritized daily pool
      const pool = await MistakeRepository.getDailyRevisionQuestions(user.uid);
      if (!active) return;
      setDailyPool(pool);

      // Load all mistakes to calculate global metrics
      const list = await MistakeRepository.getUserMistakes(user.uid);
      if (!active) return;
      setAllMistakes(list);

      // Load analytics
      const analyticsData = await AnalyticsRepository.getUserAnalytics(user.uid);
      if (!active) return;
      setAnalytics(analyticsData);
    } catch (e) {
      console.error("Failed to load revision questions:", e);
      toast.error("પુનરાવર્તન પ્રશ્નો લોડ કરવામાં ભૂલ આવી.");
    } finally {
      clearTimeout(timeoutId);
      if (active) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let active = true;
    loadData(active);

    return () => {
      active = false;
    };
  }, [user?.uid]);

  // Derive unique subjects and counts of questions in the active dailyPool
  const subjectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    dailyPool.forEach((m) => {
      const s = m.subjectName || "અન્ય";
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [dailyPool]);

  const uniqueSubjects = useMemo(() => {
    return Object.keys(subjectCounts).sort();
  }, [subjectCounts]);

  // Filter dailyPool to get only the selected subject's & chapter's questions
  const filteredPool = useMemo(() => {
    let pool = dailyPool;
    if (selectedSubject !== "All") {
      pool = pool.filter((m) => (m.subjectName || "અન્ય") === selectedSubject);
    }
    if (selectedChapter !== "All") {
      pool = pool.filter((m) => (m.chapterName || "અન્ય પ્રકરણ") === selectedChapter);
    }
    return pool;
  }, [dailyPool, selectedSubject, selectedChapter]);

  // Group the pending revision questions by subject and then by chapter
  const groupedHierarchy = useMemo(() => {
    const hierarchy: Record<string, {
      subjectId: string;
      totalPending: number;
      chapters: Record<string, {
        chapterId: string;
        count: number;
        questions: StudentMistake[];
      }>;
    }> = {};

    dailyPool.forEach((m) => {
      if (m.mastered) return;
      const subj = m.subjectName || "અન્ય";
      const chap = m.chapterName || "અન્ય પ્રકરણ";

      if (!hierarchy[subj]) {
        hierarchy[subj] = {
          subjectId: m.subjectId || "other",
          totalPending: 0,
          chapters: {}
        };
      }

      if (!hierarchy[subj].chapters[chap]) {
        hierarchy[subj].chapters[chap] = {
          chapterId: m.chapterId || "other",
          count: 0,
          questions: []
        };
      }

      hierarchy[subj].totalPending += 1;
      hierarchy[subj].chapters[chap].count += 1;
      hierarchy[subj].chapters[chap].questions.push(m);
    });

    return hierarchy;
  }, [dailyPool]);

  // General dashboard metrics
  const totalMistakes = allMistakes.length;
  const masteredCount = allMistakes.filter((m) => m.mastered).length;
  const pendingCount = totalMistakes - masteredCount;
  const revisionProgress = totalMistakes > 0 ? (masteredCount / totalMistakes) * 100 : 100;

  // Revision accuracy: correct actions / total actions (or correctRevisionCount contribution)
  const totalRevisions = allMistakes.reduce((acc, curr) => acc + (curr.revisionCount || 0), 0);
  const correctRevisions = allMistakes.reduce((acc, curr) => acc + (curr.correctRevisionCount || 0), 0);
  const revisionAccuracy = analytics 
    ? analytics.revisionAccuracy 
    : (totalRevisions > 0 ? Math.round((correctRevisions / totalRevisions) * 100) : 0);

  // Streaks display
  const streakDays = user?.streak || 0;
  const streakMilestone = streakDays >= 30 ? "30 દિવસ" : streakDays >= 7 ? "7 દિવસ" : "3 દિવસ";

  // Active question details from filteredPool
  const activeQ = filteredPool[currentIndex];
  const totalPoolQuestions = filteredPool.length;

  const handleOptionSelect = (option: string) => {
    if (isSubmitted) return;
    setSelectedOption(option);
    sfx.tap();
  };

  const handleSubmitAnswer = async () => {
    if (!user || !activeQ || !selectedOption || isSubmitted) return;

    let answerCorrect = false;
    const type = activeQ.questionType || "MCQ";

    if (type === "MCQ" || type === "MatchFollowing") {
      answerCorrect = selectedOption === activeQ.correctAnswer;
    } else if (type === "TrueFalse") {
      const word = selectedOption || "";
      const canonicalCorrect = (activeQ.correctAnswer || "").trim().toUpperCase();
      const isA_Correct = canonicalCorrect === "A" || canonicalCorrect === "TRUE" || canonicalCorrect.startsWith("સાચ") || canonicalCorrect === "YES" || canonicalCorrect === "ખર";
      const isB_Correct = canonicalCorrect === "B" || canonicalCorrect === "FALSE" || canonicalCorrect.startsWith("ખોટ") || canonicalCorrect === "NO";

      if ((word === "0" || word === "A" || word.toUpperCase() === "TRUE" || word.startsWith("સાચ")) && isA_Correct) {
        answerCorrect = true;
      } else if ((word === "1" || word === "B" || word.toUpperCase() === "FALSE" || word.startsWith("ખોટ")) && isB_Correct) {
        answerCorrect = true;
      } else {
        answerCorrect = false;
      }
    } else if (type === "FillBlank") {
      const selectedText = selectedOption || "";
      const cleanInput = selectedText.toLowerCase().replace(/[\s\.,\/#!$%\^&\*;:{}=\-_`~()""'?।]/g, "").trim();
      const cleanCorrect = (activeQ.correctAnswer || "").toLowerCase().replace(/[\s\.,\/#!$%\^&\*;:{}=\-_`~()""'?।]/g, "").trim();
      
      if (cleanInput && cleanCorrect) {
        answerCorrect = (cleanInput === cleanCorrect) || 
                        (cleanInput.includes(cleanCorrect) && cleanCorrect.length > 1) || 
                        (cleanCorrect.includes(cleanInput) && cleanInput.length > 1);
      } else {
        answerCorrect = false;
      }
    } else if (type === "ShortAnswer" || type === "LongAnswer" || type === "OneWordAnswer") {
      const textAns = selectedOption || "";
      if (!textAns || textAns.trim() === "") {
        answerCorrect = false;
      } else {
        setIsLoadingEval(true);
        try {
          const evalRes = await fetch(getApiUrl("/api/evaluate-subjective"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              question: activeQ.question,
              studentAnswer: textAns,
              correctAnswer: activeQ.correctAnswer || "",
              maxMarks: 1
            })
          });

          if (evalRes.ok) {
            const evalData = await evalRes.json();
            answerCorrect = evalData.isCorrect === true;
            if (evalData.feedback) {
              setAiFeedbackText(evalData.feedback);
            }
          } else {
            // fallback
            const cleanInput = textAns.toLowerCase().replace(/[\s\.,\/#!$%\^&\*;:{}=\-_`~()""'?।]/g, "").trim();
            const cleanCorrect = (activeQ.correctAnswer || "").toLowerCase().replace(/[\s\.,\/#!$%\^&\*;:{}=\-_`~()""'?।]/g, "").trim();
            answerCorrect = cleanInput.includes(cleanCorrect) || cleanCorrect.includes(cleanInput) || (cleanInput.length > 2 && cleanCorrect.length > 2 && (cleanInput.includes(cleanCorrect) || cleanCorrect.includes(cleanInput)));
          }
        } catch {
          const cleanInput = textAns.toLowerCase().replace(/[\s\.,\/#!$%\^&\*;:{}=\-_`~()""'?।]/g, "").trim();
          const cleanCorrect = (activeQ.correctAnswer || "").toLowerCase().replace(/[\s\.,\/#!$%\^&\*;:{}=\-_`~()""'?।]/g, "").trim();
          answerCorrect = cleanInput.includes(cleanCorrect) || cleanCorrect.includes(cleanInput);
        } finally {
          setIsLoadingEval(false);
        }
      }
    }

    setIsCorrect(answerCorrect);
    setIsSubmitted(true);

    try {
      // Set motivational triggers (Motivational System)
      if (answerCorrect) {
        sfx.correct();
        setMotivationMsg("🎉 શાબાશ! તમે એક વધુ પ્રશ્ન શીખી લીધો.");
        toast.success("અદ્ભુત! સાચો જવાબ.");
      } else {
        sfx.wrong();
        setMotivationMsg("💡 તમે તમારી ભૂલોમાંથી શીખી રહ્યા છો. ફરી પ્રયાસ કરો!");
        
        let correctDisplay = activeQ.correctAnswer;
        if (activeQ.optionA && ["A","B","C","D"].includes(activeQ.correctAnswer)) {
          const optVal = activeQ.correctAnswer === "A" ? activeQ.optionA : activeQ.correctAnswer === "B" ? activeQ.optionB : activeQ.correctAnswer === "C" ? activeQ.optionC : activeQ.optionD;
          correctDisplay = `વિકલ્પ ${activeQ.correctAnswer} (${optVal})`;
        } else if (activeQ.correctAnswer === "A" && (type === "TrueFalse" || type === "MCQ")) {
          correctDisplay = activeQ.optionA || "સાચું";
        } else if (activeQ.correctAnswer === "B" && (type === "TrueFalse" || type === "MCQ")) {
          correctDisplay = activeQ.optionB || "ખોટું";
        }
        
        toast.error(`ખોટો જવાબ. સાચો જવાબ "${correctDisplay}" છે.`);
      }

      // Commit to Database/Local Storage with Spaced Repetition Rules
      const updatedMistake = await MistakeRepository.recordRevisionAttempt(user.uid, activeQ.questionId, answerCorrect);
      
      // Update the question's state in the dailyPool to match
      setDailyPool(prevPool => {
        const index = prevPool.findIndex(m => m.questionId === activeQ.questionId);
        if (index > -1) {
          const newPool = [...prevPool];
          newPool[index] = updatedMistake;
          return newPool;
        }
        return prevPool;
      });

      // Update the mistake's state in allMistakes to keep stats completely up to date reactively
      setAllMistakes(prevList => {
        const index = prevList.findIndex(m => m.questionId === activeQ.questionId);
        if (index > -1) {
          const newList = [...prevList];
          newList[index] = updatedMistake;
          return newList;
        } else {
          return [...prevList, updatedMistake];
        }
      });
      
      setPracticedCount((prev) => prev + 1);

    } catch (e) {
      console.error("Revision commit failed:", e);
      toast.error("નોંધ સાચવવામાં સમસ્યા આવી.");
    }
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setIsSubmitted(false);
    setIsCorrect(false);
    setMotivationMsg("");
    setAiFeedbackText("");
    setIsLoadingEval(false);

    if (currentIndex < totalPoolQuestions - 1) {
      setCurrentIndex((p) => p + 1);
      sfx.tap();
    } else {
      // Completed pool for current selection! Let's load fresh state
      loadData(true);
      toast.success("આ પ્રશ્નમાળા પૂર્ણ થઈ! 🏆");
    }
  };

  if (loading) {
    return (
      <AppShell title="Revision Engine" titleGu="પુનરાવર્તન" back="/dashboard">
        <div className="flex items-center justify-center min-h-[50dvh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Revision Board" titleGu="પુનરાવર્તન" back="/dashboard">
      <div className="px-5 py-4 space-y-5 pb-10">

        {/* REVISION DASHBOARD */}
        <div className="bg-card border border-border rounded-3xl p-5 shadow-card space-y-4 animate-[scale-in_0.35s_ease-out]">
          <div className="flex justify-between items-center bg-primary-soft/50 rounded-2xl p-3">
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground font-gu">શાબાશ સ્કોર (Accuracy)</p>
              <h4 className="text-xl font-extrabold text-primary">{revisionAccuracy}%</h4>
            </div>
            
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-muted-foreground font-gu">પુનરાવર્તન સ્ટ્રીક (Streak)</p>
              <h4 className="text-sm font-extrabold text-amber-500 font-gu flex items-center justify-end gap-1">
                <Flame className="size-4 shrink-0 fill-amber-500" /> {streakDays} દિવસ ({streakMilestone})
              </h4>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/40 p-3 rounded-2xl border border-border/40 text-center">
              <p className="text-xs text-muted-foreground font-gu font-medium">સુધારેલ પ્રશ્નો</p>
              <p className="text-lg font-bold text-success">{masteredCount} / {totalMistakes}</p>
            </div>
            <div className="bg-muted/40 p-3 rounded-2xl border border-border/40 text-center">
              <p className="text-xs text-muted-foreground font-gu font-medium">સક્રિય પુનરાવર્તન</p>
              <p className="text-lg font-bold text-warning">{pendingCount}</p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-muted-foreground font-gu">
              <span>પુનરાવર્તન પ્રગતિ (Revision Progress %)</span>
              <span className="font-semibold">{Math.round(revisionProgress)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-success transition-all duration-700"
                style={{ width: `${revisionProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* VIEW SELECTOR TAB TOGGLE */}
        <div className="bg-muted p-1.5 rounded-2xl grid grid-cols-2 gap-1 border border-border/40 animate-[scale-in_0.35s_ease-out]">
          <button
            onClick={() => {
              setActiveView("quiz");
              sfx.tap();
            }}
            className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 font-gu ${
              activeView === "quiz"
                ? "bg-card text-foreground shadow-sm font-extrabold"
                : "text-muted-foreground hover:bg-card/40"
            }`}
          >
            <Target className="size-3.5 text-primary" /> ક્વિઝ અભ્યાસ (Quiz Practice)
          </button>
          <button
            onClick={() => {
              setActiveView("breakdown");
              sfx.tap();
            }}
            className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 font-gu ${
              activeView === "breakdown"
                ? "bg-card text-foreground shadow-sm font-extrabold"
                : "text-muted-foreground hover:bg-card/40"
            }`}
          >
            <BarChart3 className="size-3.5 text-success" /> પ્રકરણવાર બાકી વિગતો (Breakdown)
          </button>
        </div>

        {activeView === "quiz" ? (
          <>
            {/* CURRENTLY ACTIVE FILTER BANNER */}
            {(selectedSubject !== "All" || selectedChapter !== "All") && (
              <div className="bg-primary-soft border border-primary/20 rounded-2xl p-3 flex items-center justify-between animate-[fade-in_0.3s_ease-out]">
                <div className="min-w-0">
                  <p className="text-[9px] uppercase font-bold text-primary font-gu">સક્રિય ફિલ્ટર (Active Filter)</p>
                  <p className="text-xs font-semibold truncate font-sans text-foreground/90">
                    {selectedSubject !== "All" ? selectedSubject : "બધા વિષયો"} 
                    {selectedChapter !== "All" ? ` • ${selectedChapter}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedSubject("All");
                    setSelectedChapter("All");
                    setCurrentIndex(0);
                    setSelectedOption(null);
                    setIsSubmitted(false);
                    setIsCorrect(false);
                    setMotivationMsg("");
                    sfx.tap();
                  }}
                  className="text-[10px] font-bold text-destructive hover:underline font-gu shrink-0 pl-2"
                >
                  ફિલ્ટર સાફ કરો (Clear)
                </button>
              </div>
            )}

            {/* SUBJECT SECTOR SELECTION TAB BAR */}
            {dailyPool.length > 0 && selectedChapter === "All" && (
              <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none animate-[fade-in_0.35s_ease-out]">
                <button
                  onClick={() => {
                    setSelectedSubject("All");
                    setSelectedChapter("All");
                    setCurrentIndex(0);
                    setSelectedOption(null);
                    setIsSubmitted(false);
                    setIsCorrect(false);
                    setMotivationMsg("");
                    sfx.tap();
                  }}
                  className={`h-10 px-4 rounded-2xl text-xs font-bold font-gu transition flex items-center gap-1.5 shrink-0 active:scale-95 border ${
                    selectedSubject === "All"
                      ? "bg-primary text-primary-foreground border-primary shadow-float"
                      : "bg-card text-foreground border-border hover:bg-muted/40"
                  }`}
                >
                  <BookOpen className="size-3.5" /> બધા વિષયો ({dailyPool.length})
                </button>
                {uniqueSubjects.map((subj) => {
                  const count = subjectCounts[subj] || 0;
                  const isActive = selectedSubject === subj;
                  return (
                    <button
                      key={subj}
                      onClick={() => {
                        setSelectedSubject(subj);
                        setSelectedChapter("All");
                        setCurrentIndex(0);
                        setSelectedOption(null);
                        setIsSubmitted(false);
                        setIsCorrect(false);
                        setMotivationMsg("");
                        sfx.tap();
                      }}
                      className={`h-10 px-4 rounded-2xl text-xs font-bold font-gu transition flex items-center gap-1.5 shrink-0 active:scale-95 border ${
                        isActive
                          ? "bg-primary text-primary-foreground border-primary shadow-float"
                          : "bg-card text-foreground border-border hover:bg-muted/40"
                      }`}
                    >
                      {subj} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {/* POOL EMPTY / FULL DAILY PROGRESS FINISHED STATE */}
            {totalPoolQuestions === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-3xl p-6 shadow-card space-y-4 animate-[fade-in_0.4s_ease-out]">
                <div className="size-20 mx-auto rounded-full bg-success-soft flex items-center justify-center text-4xl shadow-card relative">
                  🎉 <Trophy className="size-6 absolute -top-1 -right-1 text-yellow-500 animate-bounce" />
                </div>
                <h3 className="font-bold text-lg font-gu">
                  {selectedSubject === "All" 
                    ? "આજે તમારું પુનરાવર્તન પૂર્ણ થયું."
                    : `પુનરાવર્તન પૂર્ણ થયું.`}
                </h3>
                <p className="text-xs text-muted-foreground font-gu max-w-sm mx-auto leading-relaxed">
                  {selectedSubject === "All"
                    ? "શાબાશ! તમે આજની સક્રિય પુનરાવર્તન પ્રવૃત્તિઓ પૂર્ણ કરી છે. હવે કોઈ પણ પ્રશ્નો બાકી નથી. તમારી ભૂલોમાંથી સારું શીખતા રહો!"
                    : `અદ્ભુત! તમે આ ફિલ્ટરના તમામ ઉપલબ્ધ પ્રશ્નોનું પુનરાવર્તન કરી લીધું છે. ફિલ્ટર સાફ કરીને અન્ય વિષય અથવા પ્રકરણનો અભ્યાસ કરો!`}
                </p>
                {(selectedSubject !== "All" || selectedChapter !== "All") && (
                  <button
                    onClick={() => {
                      setSelectedSubject("All");
                      setSelectedChapter("All");
                      setCurrentIndex(0);
                      setSelectedOption(null);
                      setIsSubmitted(false);
                      setIsCorrect(false);
                      setMotivationMsg("");
                      sfx.tap();
                    }}
                    className="inline-block px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-2xl text-xs shadow-float hover:opacity-90 active:scale-95 transition font-gu"
                  >
                    તમામ ફિલ્ટર સાફ કરો (Clear Filter)
                  </button>
                )}
                {selectedSubject === "All" && selectedChapter === "All" && (
                  <Link
                    to="/dashboard"
                    className="inline-block px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-2xl text-xs shadow-float hover:opacity-90 active:scale-95 transition font-gu"
                  >
                    પાછા ડેશબોર્ડ પર જાઓ
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* ACTIVE REVISION QUESTION BOARD */}
                <div className="bg-card border border-border rounded-3xl p-5 shadow-float space-y-4 animate-[slide-up_0.35s_ease-out]">
                  <div className="flex justify-between items-center border-b border-border/60 pb-3">
                    <span className="text-[10px] uppercase font-bold text-primary font-mono tracking-wide px-2 py-0.5 bg-primary-soft rounded-full">
                      Question {currentIndex + 1} of {totalPoolQuestions}
                    </span>
                    
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Target className="size-3" /> સ્પેસ્ડ લર્નિંગ સક્રિય
                    </span>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans font-bold">
                      {activeQ.subjectName || activeQ.subject} • {activeQ.chapterName || activeQ.chapter}
                    </p>
                    <h3 className="mt-2 font-bold text-sm text-foreground/90 leading-snug font-sans">
                      {activeQ.question}
                    </h3>
                  </div>

                  {/* OPTIONS LIST OR INPUT FOR REVISION */}
                  <div className="space-y-3 mt-4">
                    {/* 1. MCQ OR MatchFollowing */}
                    {(activeQ.questionType === "MCQ" || !activeQ.questionType || activeQ.questionType === "MatchFollowing") && (
                      <div className="space-y-2 font-sans">
                        {["A", "B", "C", "D"].map((key) => {
                          const optText =
                            key === "A" ? activeQ.optionA :
                            key === "B" ? activeQ.optionB :
                            key === "C" ? activeQ.optionC :
                            activeQ.optionD;

                          if (!optText) return null;

                          const isSelected = selectedOption === key;

                          // Highlighting styles
                          let btnStyle = "bg-card hover:bg-muted/40 border-border text-foreground";
                          if (isSelected) {
                            btnStyle = "bg-primary-soft/80 border-primary text-primary font-semibold shadow-card-sm";
                          }

                          if (isSubmitted) {
                            if (key === activeQ.correctAnswer) {
                              // Correct answer in green
                              btnStyle = "bg-success-soft/90 border-success text-success font-bold";
                            } else if (isSelected) {
                              // Incorrect submitted option in red
                              btnStyle = "bg-destructive-soft/90 border-destructive text-destructive font-semibold";
                            } else {
                              btnStyle = "opacity-55 border-border bg-card text-muted-foreground";
                            }
                          }

                          return (
                            <button
                              key={key}
                              onClick={() => handleOptionSelect(key)}
                              disabled={isSubmitted}
                              className={`w-full text-left min-h-12 p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 transition active:scale-[0.99] ${btnStyle}`}
                            >
                              <span className="font-bold uppercase shrink-0 mt-0.5 bg-muted size-5 rounded-full flex items-center justify-center text-[10px]">
                                {key}
                              </span>
                              <span className="leading-tight">{optText}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* 2. TrueFalse */}
                    {activeQ.questionType === "TrueFalse" && (
                      <div className="grid grid-cols-2 gap-3 font-sans">
                        {["A", "B"].map((key) => {
                          const optText = key === "A" ? (activeQ.optionA || "સાચું (True)") : (activeQ.optionB || "ખોટું (False)");
                          const idxValue = key === "A" ? "0" : "1";
                          const isSelected = selectedOption === idxValue || selectedOption === key;

                          let btnStyle = "bg-card hover:bg-muted/40 border-border text-foreground";
                          if (isSelected) {
                            btnStyle = "bg-primary-soft border-primary text-primary font-semibold shadow-card-sm";
                          }

                          if (isSubmitted) {
                            const canonicalCorrect = (activeQ.correctAnswer || "").toUpperCase();
                            const isA_Correct = canonicalCorrect === "A" || canonicalCorrect === "TRUE" || canonicalCorrect.startsWith("સાચ") || canonicalCorrect === "YES" || canonicalCorrect === "ખર";
                            
                            const isCurrentCorrect = (key === "A" && isA_Correct) || (key === "B" && !isA_Correct);
                            
                            if (isCurrentCorrect) {
                              btnStyle = "bg-success-soft/90 border-success text-success font-bold";
                            } else if (isSelected) {
                              btnStyle = "bg-destructive-soft/90 border-destructive text-destructive font-semibold";
                            } else {
                              btnStyle = "opacity-55 border-border bg-card text-muted-foreground";
                            }
                          }

                          return (
                            <button
                              key={key}
                              onClick={() => handleOptionSelect(idxValue)}
                              disabled={isSubmitted}
                              className={`w-full text-center py-3.5 px-3 rounded-2xl border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition active:scale-[0.99] ${btnStyle}`}
                            >
                              <span className="text-[10px] uppercase font-bold text-muted-foreground">
                                {key === "A" ? "ખરું (True)" : "ખોટું (False)"}
                              </span>
                              <span className="leading-tight">{optText}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* 3. FillBlank */}
                    {activeQ.questionType === "FillBlank" && (
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground font-semibold block font-gu">અહીં ખાલી જગ્યાનો ઉત્તર લખો:</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={selectedOption || ""}
                            disabled={isSubmitted}
                            onChange={(e) => handleOptionSelect(e.target.value)}
                            placeholder="ખાલી જગ્યાનો સાચો શબ્દ અહીં ટાઈપ કરો..."
                            className="flex-1 h-12 px-4 rounded-xl border border-border bg-card outline-none focus:border-primary text-sm shadow-sm font-semibold text-foreground transition-all duration-200"
                          />
                          {!isSubmitted && (
                            <button
                              type="button"
                              onClick={startVoiceTyping}
                              className={`size-12 rounded-xl flex items-center justify-center shadow-sm transition active:scale-95 ${
                                isRecording 
                                  ? "bg-destructive text-destructive-foreground animate-pulse" 
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                              title="બોલો અને ટાઈપ કરો"
                            >
                              {isRecording ? <MicOff className="size-5" /> : <Mic className="size-5" />}
                            </button>
                          )}
                        </div>
                        {isSubmitted && (
                          <div className="mt-2 p-3.5 rounded-2xl bg-muted/60 border text-xs space-y-1">
                            <p className="text-muted-foreground font-semibold">તમારો જવાબ: <span className={isCorrect ? "text-success font-bold" : "text-destructive font-bold"}>{selectedOption || "Skipped"}</span></p>
                            <p className="text-success font-bold">સાચો જવાબ: <span>{activeQ.correctAnswer}</span></p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 4. ShortAnswer or LongAnswer */}
                    {(activeQ.questionType === "ShortAnswer" || activeQ.questionType === "LongAnswer" || activeQ.questionType === "OneWordAnswer") && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-semibold font-gu">
                            {activeQ.questionType === "ShortAnswer" ? "ટૂંકો ઉત્તર લખો (Short Answer):" : activeQ.questionType === "OneWordAnswer" ? "એક શબ્દમાં ઉત્તર લખો:" : "લાંબો વિગતવાર ઉત્તર લખો (Long Answer):"}
                          </span>
                          {!isSubmitted && (
                            <button
                              type="button"
                              onClick={startVoiceTyping}
                              className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-semibold shadow-sm transition active:scale-95 ${
                                isRecording 
                                  ? "bg-destructive text-destructive-foreground animate-pulse" 
                                  : "bg-primary text-primary-foreground hover:bg-primary/95"
                              }`}
                            >
                              {isRecording ? (
                                <>
                                  <MicOff className="size-3.5" />
                                  રેકોર્ડિંગ બંધ કરો
                                </>
                              ) : (
                                <>
                                  <Mic className="size-3.5" />
                                  બોલો અને લખો (વોઇસ ટાઇપિંગ)
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        <textarea
                          rows={activeQ.questionType === "ShortAnswer" ? 4 : 7}
                          value={selectedOption || ""}
                          disabled={isSubmitted}
                          onChange={(e) => handleOptionSelect(e.target.value)}
                          placeholder="અહીં જવાબ લખો અથવા ઉપર આપેલા માઈક બટન પર ક્લિક કરીને સીધું બોલો..."
                          className="w-full p-4 rounded-xl border border-border bg-card outline-none focus:border-primary text-xs shadow-sm resize-none text-foreground leading-relaxed transition-all duration-200 font-sans"
                        />
                        {isRecording && (
                          <p className="text-[11px] text-muted-foreground italic flex items-center gap-2 animate-pulse mt-1">
                            <span className="size-2 rounded-full bg-destructive" /> મહેરબાની કરીને ગુજરાતીમાં બોલો, તમારો અવાજ લખાણમાં રૂપાંતરિત થઈ રહ્યો છે...
                          </p>
                        )}
                        {isLoadingEval && (
                          <div className="p-3 bg-muted rounded-xl flex items-center gap-2 text-xs italic text-primary animate-pulse">
                            <RotateCw className="size-3.5 animate-spin" />
                            શિક્ષક AI દ્વારા તમારા ઉત્તરનું મૂલ્યાંકન થઈ રહ્યો છે...
                          </div>
                        )}
                        {isSubmitted && (
                          <div className="p-3.5 rounded-2xl bg-muted/60 border text-xs space-y-1.5 leading-relaxed font-sans">
                            <p className="text-muted-foreground font-semibold">તમારો જવાબ: <span className="font-medium text-foreground">{selectedOption || "Skipped"}</span></p>
                            <p className="border-t border-border/50 pt-1.5 text-success font-bold">સાચો જવાબ: <span className="font-semibold text-foreground/90">{activeQ.correctAnswer}</span></p>
                            {aiFeedbackText && (
                              <p className="border-t border-border/50 pt-1.5 text-primary text-[11px] italic font-medium leading-normal">
                                <strong>શિક્ષક અભિપ્રાય (AI Feedback):</strong> {aiFeedbackText}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ACTION COMMAND CONTROLS */}
                  <div className="pt-2 border-t border-border/60">
                    {!isSubmitted ? (
                      <button
                        disabled={!selectedOption || selectedOption.trim() === ""}
                        onClick={handleSubmitAnswer}
                        className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-xs shadow-float hover:opacity-90 active:scale-95 transition disabled:opacity-40 flex items-center justify-center gap-1.5 font-gu"
                      >
                        જવાબ સબમિટ કરો (Submit Answer)
                      </button>
                    ) : (
                      <button
                        onClick={handleNextQuestion}
                        className="w-full h-12 rounded-2xl bg-success text-success-foreground font-bold text-xs shadow-float hover:opacity-90 active:scale-95 transition flex items-center justify-center gap-1.5 font-gu animate-[pulse_1.5s_infinite]"
                      >
                        આગળ વધો (Next Question) <ChevronRight className="size-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* FEEDBACK EXPLANATION ACCORDION */}
                {isSubmitted && (
                  <div className="bg-card border border-border rounded-3xl p-5 shadow-card space-y-3.5 overflow-hidden animate-[slide-up_0.35s_ease-out]">
                    
                    {/* Motivation phrase banner */}
                    <div className={`p-4 rounded-2xl text-center text-xs font-bold font-gu ${isCorrect ? 'bg-success-soft text-success' : 'bg-warning/10 text-warning-foreground'}`}>
                      {motivationMsg}
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground font-bold">
                        <HelpCircle className="size-4 text-primary" />
                        <span className="uppercase tracking-wider font-sans">Explanation Document</span>
                      </div>
                      
                      <div className="p-3 bg-muted/45 rounded-2xl border border-border leading-relaxed text-foreground/80 font-sans">
                        {activeQ.explanation || "આ પ્રશ્ન માટે ખુલાસો ઉપલબ્ધ છે. કૃપા કરીને પ્રશ્ન શીખો અને સાચો પ્રતિભાવ આપો."}
                      </div>
                    </div>

                    <div className="pt-2 flex justify-between items-center text-[10px] text-muted-foreground font-sans px-1">
                      <span>આવૃત્તિ સ્કોર: <strong>{activeQ.revisionCount || 0}</strong></span>
                      <span>પ્રગતિ (આવડે છે): <strong className="text-success">{activeQ.correctRevisionCount || 0} / 3</strong></span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* HIERARCHICAL SUBJECT & CHAPTER WISE BREAKDOWN VIEW */
          <div className="space-y-4 animate-[fade-in_0.4s_ease-out]">
            {Object.keys(groupedHierarchy).length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-3xl p-6 shadow-card space-y-4">
                <div className="size-16 mx-auto rounded-full bg-success-soft flex items-center justify-center text-3xl">
                  🎉
                </div>
                <h3 className="font-bold text-sm font-gu">બધા જ વિષય અને પ્રકરણો પૂર્ણ છે!</h3>
                <p className="text-[11px] text-muted-foreground font-gu mt-1 leading-relaxed max-w-xs mx-auto">
                  તમારી કોઈ પણ ભૂલો સુધારવાની બાકી નથી. તમામ પાઠોનું પુનરાવર્તન સફળતાપૂર્વક પૂરું થયેલ છે!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[11px] text-muted-foreground font-gu">
                  અહીં તમારા વિષયો અને પ્રકરણ મુજબના બાકી રહેલા તમામ પુનરાવર્તન પ્રશ્નોની સૂચિ છે:
                </p>

                {Object.keys(groupedHierarchy).sort().map((subj) => {
                  const subjData = groupedHierarchy[subj];
                  const chapters = Object.keys(subjData.chapters).sort();

                  return (
                    <div key={subj} className="bg-card border border-border rounded-3xl overflow-hidden shadow-card p-4.5 space-y-3.5">
                      {/* Subject Header Card */}
                      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="size-9 rounded-2xl bg-gradient-to-tr from-primary/10 to-primary/20 text-primary flex items-center justify-center font-bold text-base shadow-card-sm shrink-0">
                            📚
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-foreground/95 uppercase font-sans">
                              {subj}
                            </h3>
                            <p className="text-[9px] text-muted-foreground font-gu">
                              {chapters.length} પ્રકરણો બાકી
                            </p>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold px-2.5 py-1 bg-destructive-soft text-destructive rounded-full font-mono">
                          {subjData.totalPending} બાકી પ્રશ્નો
                        </span>
                      </div>

                      {/* Chapters Area */}
                      <div className="space-y-2.5">
                        {chapters.map((chap) => {
                          const chapData = subjData.chapters[chap];
                          const expansionKey = `${subj}::${chap}`;
                          const isExpanded = !!expandedChapters[expansionKey];

                          return (
                            <div key={chap} className="bg-muted/40 border border-border/60 rounded-2xl p-3.5 space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-semibold text-xs leading-tight text-foreground/90 font-sans">
                                    {chap}
                                  </h4>
                                  <p className="text-[10px] text-muted-foreground mt-0.5 font-gu">
                                    બાકી પ્રશ્નો: <span className="font-black text-amber-600 font-mono">{chapData.count}</span>
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {/* View Questions Toggle */}
                                  <button
                                    onClick={() => {
                                      setExpandedChapters(prev => ({
                                        ...prev,
                                        [expansionKey]: !prev[expansionKey]
                                      }));
                                      sfx.tap();
                                    }}
                                    className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold font-gu border transition font-mono ${
                                      isExpanded 
                                        ? "bg-muted text-muted-foreground border-border"
                                        : "bg-card text-foreground hover:bg-muted/40 border-border"
                                    }`}
                                  >
                                    {isExpanded ? "બંધ કરો" : "પ્રશ્નો જુઓ"}
                                  </button>

                                  {/* Quick Quiz Start for this chapter */}
                                  <button
                                    onClick={() => {
                                      setSelectedSubject(subj);
                                      setSelectedChapter(chap);
                                      setCurrentIndex(0);
                                      setSelectedOption(null);
                                      setIsSubmitted(false);
                                      setIsCorrect(false);
                                      setMotivationMsg("");
                                      setActiveView("quiz");
                                      sfx.tap();
                                      toast.success(`વિષય: ${subj}, પ્રકરણ: ${chap} નો ક્વિઝ અભ્યાસ શરૂ! 🎯`);
                                    }}
                                    className="px-2.5 py-1.5 bg-primary text-primary-foreground font-bold rounded-xl text-[10px] hover:opacity-90 active:scale-95 transition font-gu"
                                  >
                                    અભ્યાસ શરૂ
                                  </button>
                                </div>
                              </div>

                              {/* Questions list when expanded */}
                              {isExpanded && (
                                <div className="pt-3 border-t border-border/60 space-y-3 animate-[slide-up_0.3s_ease-out]">
                                  {chapData.questions.map((q, qidx) => (
                                    <div key={q.questionId} className="bg-card border border-border rounded-2xl p-3.5 space-y-2.5 shadow-card-sm text-left">
                                      <div className="flex justify-between items-center text-[9px] text-muted-foreground font-mono">
                                        <span className="font-bold">પ્રશ્ન #{qidx + 1}</span>
                                        <span>આવૃત્તિ: {q.revisionCount || 0} વખત</span>
                                      </div>

                                      <p className="text-xs font-semibold leading-relaxed text-foreground/90 font-sans">
                                        {q.question}
                                      </p>

                                      {/* Options List */}
                                      <div className="grid grid-cols-1 gap-1.5 text-[11px] font-sans">
                                        {[
                                          { label: "A", val: q.optionA },
                                          { label: "B", val: q.optionB },
                                          { label: "C", val: q.optionC },
                                          { label: "D", val: q.optionD },
                                        ].filter(opt => {
                                          if (!opt.val || opt.val.trim() === "" || opt.val === "Option C" || opt.val === "Option D") {
                                            if (q.questionType === "TrueFalse" || !opt.val || opt.val.trim() === "") {
                                              return false;
                                            }
                                          }
                                          return true;
                                        }).map((opt) => {
                                          const isCorrectAnswer = opt.label === q.correctAnswer;
                                          return (
                                            <div
                                              key={opt.label}
                                              className={`p-2.5 rounded-xl border text-left flex items-start gap-2 ${
                                                isCorrectAnswer 
                                                  ? "bg-success-soft text-success border-success font-bold font-sans" 
                                                  : "bg-muted/10 border-border/50 text-muted-foreground opacity-75"
                                              }`}
                                            >
                                              <span className={`font-extrabold uppercase text-[9px] size-4.5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isCorrectAnswer ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}`}>
                                                {opt.label}
                                              </span>
                                              <span className="leading-tight">{opt.val}</span>
                                            </div>
                                          );
                                        })}
                                      </div>

                                      {q.explanation && (
                                        <div className="bg-muted/30 p-3 rounded-xl border border-border/40 text-[10px] leading-relaxed text-muted-foreground font-sans">
                                          <span className="font-bold text-foreground font-gu block mb-0.5">💡 વિવરણ / ખુલાસો:</span>
                                          {q.explanation}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="text-center py-2">
          <p className="text-[11px] text-muted-foreground font-gu italic max-w-xs mx-auto">
            "પરીક્ષા એ માત્ર આંકડા નથી, પણ તમારી ભૂલો સુધારી સફળ થવાની તક છે."
          </p>
        </div>
      </div>
    </AppShell>
  );
}
