import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Sparkles, CheckCircle2, ChevronLeft, ChevronRight, Target, Flame, RotateCw, BookOpen, AlertCircle, HelpCircle, Trophy, BarChart3, TrendingUp, HelpCircleIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/FirebaseProvider";
import { MistakeRepository, AnalyticsRepository } from "@/lib/db";
import { StudentMistake, RevisionAnalytics } from "@/types";
import { sfx } from "@/lib/settings";
import { toast } from "sonner";

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

  // Practice state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [practicedCount, setPracticedCount] = useState(0);
  const [motivationMsg, setMotivationMsg] = useState("");

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
      // Load prioritized daily pool (Max 5)
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

  // Active question details
  const activeQ = dailyPool[currentIndex];
  const totalPoolQuestions = dailyPool.length;

  const handleOptionSelect = (option: "A" | "B" | "C" | "D") => {
    if (isSubmitted) return;
    setSelectedOption(option);
    sfx.tap();
  };

  const handleSubmitAnswer = async () => {
    if (!user || !activeQ || !selectedOption || isSubmitted) return;

    const answerCorrect = selectedOption === activeQ.correctAnswer;
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
        toast.error(`ખોટો જવાબ. સાચો જવાબ ${activeQ.correctAnswer} છે.`);
      }

      // Commit to Database/Local Storage with Spaced Repetition Rules
      await MistakeRepository.recordRevisionAttempt(user.uid, activeQ.questionId, answerCorrect);
      
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

    if (currentIndex < totalPoolQuestions - 1) {
      setCurrentIndex((p) => p + 1);
      sfx.tap();
    } else {
      // Completed pool! Let's load fresh daily state and show finished card
      loadData(true);
      toast.success("આજનું પુનરાવર્તન ગોલ પૂર્ણ! 🏆");
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

        {/* POOL EMPTY / FULL DAILY PROGRESS FINISHED STATE */}
        {totalPoolQuestions === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-3xl p-6 shadow-card space-y-4 animate-[fade-in_0.4s_ease-out]">
            <div className="size-20 mx-auto rounded-full bg-success-soft flex items-center justify-center text-4xl shadow-card relative">
              🎉 <Trophy className="size-6 absolute -top-1 -right-1 text-yellow-500 animate-bounce" />
            </div>
            <h3 className="font-bold text-lg font-gu">આજે તમારું પુનરાવર્તન પૂર્ણ થયું.</h3>
            <p className="text-xs text-muted-foreground font-gu max-w-sm mx-auto leading-relaxed">
              શાબાશ! તમે આજની સક્રિય પુનરાવર્તન પ્રવૃત્તિઓ પૂર્ણ કરી છે. હવે કોઈ પણ પ્રશ્નો બાકી નથી. તમારી ભૂલોમાંથી સારું શીખતા રહો!
            </p>
            <Link
              to="/dashboard"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-2xl text-xs shadow-float hover:opacity-90 active:scale-95 transition font-gu"
            >
              પાછા ડેશબોર્ડ પર જાઓ
            </Link>
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

              {/* OPTIONS LIST */}
              <div className="space-y-2 mt-4 font-sans">
                {["A", "B", "C", "D"].map((key) => {
                  const optText =
                    key === "A" ? activeQ.optionA :
                    key === "B" ? activeQ.optionB :
                    key === "C" ? activeQ.optionC :
                    activeQ.optionD;

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
                      onClick={() => handleOptionSelect(key as any)}
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

              {/* ACTION COMMAND CONTROLS */}
              <div className="pt-2 border-t border-border/60">
                {!isSubmitted ? (
                  <button
                    disabled={!selectedOption}
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

        <div className="text-center py-2">
          <p className="text-[11px] text-muted-foreground font-gu italic max-w-xs mx-auto">
            "પરીક્ષા એ માત્ર આંકડા નથી, પણ તમારી ભૂલો સુધારી સફળ થવાની તક છે."
          </p>
        </div>
      </div>
    </AppShell>
  );
}
