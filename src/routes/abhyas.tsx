import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { 
  BookOpen, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft, 
  HelpCircle, 
  CheckCircle, 
  XCircle, 
  Smile, 
  ArrowRight, 
  Award, 
  ChevronRight,
  Book,
  GraduationCap,
  Sparkles,
  Info,
  Settings
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/FirebaseProvider";
import { SubjectRepository, ChapterRepository, QuestionRepository, PointsRepository } from "@/lib/db";
import { Subject, Chapter, Question } from "@/types";
import { sfx } from "@/lib/settings";
import { toast } from "sonner";

export const Route = createFileRoute("/abhyas")({
  head: () => ({ meta: [{ title: "Abhyas - Interactive Learning Hub" }] }),
  component: AbhyasComponent,
});

const GUJARATI_CONGRATULATIONS = [
  "અદ્ભુત! તમારો જવાબ બિલકુલ સાચો છે! 🌟",
  "મહાન પ્રયાસ! ખૂબ જ ગર્વ છે તમારા પર! 🥳",
  "વાહ! તમે પ્રકરણ ખૂબ ઊંડાણપૂર્વક શીખ્યા છો! 🚀",
  "જબરદસ્ત! પ્રગતિ ચાલુ રાખો! 🎉",
  "શાબાશ! સાચી દિશામાં આગળ વધી રહ્યા છો! 💎",
  "એકદમ સાચું! તમારો ઉત્સાહ પ્રશંસનીય છે! ❤️"
];

const GUJARATI_ENCOURAGEMENT = [
  "કોઈ વાંધો નહીં, શીખવા માટે જ આપણે અહીં છીએ! 👍",
  "ભૂલો એ સાબિતી છે કે તમે પ્રયાસ કરી રહ્યા છો. આગળ વધો! 💪",
  "ખૂબ નજીક હતા! આગળના પ્રશ્નમાં ચોક્કસ સફળતા મળશે! ✨",
  "મુંઝાશો નહીં! આ સમજૂતી વાંચી લો, બધું સમજાઈ જશે! 📖",
  "તમારા પ્રયાસ ખૂબ સુંદર હતો. શીખતા રહો! 🌈"
];

function AbhyasComponent() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Helper to parse standard string safely (e.g. "6th" -> "6")
  const getParsedStandard = (std: string | undefined): string => {
    if (!std) return "7";
    const num = String(std).replace(/[^0-9]/g, "");
    return num || "7";
  };

  const isStudent = user?.role !== "admin" && user?.role !== "teacher" && user?.role !== "super_admin";
  const studentMedium = user?.medium || "Gujarati";

  // State Management
  const [phase, setPhase] = useState<"select" | "summary" | "practice" | "results">("select");
  const [loading, setLoading] = useState(false);

  // Selector Data
  const [standards] = useState<string[]>(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
  const [selectedStandard, setSelectedStandard] = useState<string>(() => {
    return getParsedStandard(user?.standard) || "7";
  });
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);

  // Sync state with user profile once fetched
  useEffect(() => {
    if (user?.standard) {
      const parsed = getParsedStandard(user.standard);
      setSelectedStandard(parsed);
    }
  }, [user]);

  // Study Summary State
  const [summaryText, setSummaryText] = useState<string>("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState<number>(1);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Advanced stateful TTS variables for device/language customization & troubleshooting
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(() => {
    return localStorage.getItem("preferred_tts_voice") || "";
  });
  const [ttsLanguage, setTtsLanguage] = useState<string>("");
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  // Practice Exam State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userSelection, setUserSelection] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [scoreCount, setScoreCount] = useState(0);
  const [totalAttempted, setTotalAttempted] = useState(0);

  // Load subjects based on standard selection
  useEffect(() => {
    if (selectedStandard) {
      setLoading(true);
      SubjectRepository.getSubjects(selectedStandard)
        .then((subs) => {
          setSubjects(subs);
          setSelectedSubject(subs[0] || null);
          setChapters([]);
          setSelectedChapter(null);
        })
        .catch((e) => {
          console.error("Failed to load subjects:", e);
          toast.error("વિષયો લોડ કરવામાં મુશ્કેલી આવી.");
        })
        .finally(() => setLoading(false));
    }
  }, [selectedStandard]);

  // Load chapters based on subject selection
  useEffect(() => {
    if (selectedSubject) {
      setLoading(true);
      ChapterRepository.getChapters(selectedSubject.subjectId)
        .then((chaps) => {
          setChapters(chaps);
          setSelectedChapter(chaps[0] || null);
        })
        .catch((e) => {
          console.error("Failed to load chapters:", e);
          toast.error("પ્રકરણો લોડ કરવામાં મુશ્કેલી આવી.");
        })
        .finally(() => setLoading(false));
    } else {
      setChapters([]);
      setSelectedChapter(null);
    }
  }, [selectedSubject]);

  // Handle Speech Synthesis Lifecycle & dynamic voice loading
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    synthRef.current = window.speechSynthesis;

    const loadVoices = () => {
      if (synthRef.current) {
        const voices = synthRef.current.getVoices();
        setAvailableVoices(voices);
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (synthRef.current) {
        try { synthRef.current.cancel(); } catch (_) {}
      }
    };
  }, []);

  // Initialize and sync preferred language based on user's profile medium
  useEffect(() => {
    if (!ttsLanguage && user?.medium) {
      const medium = user.medium.trim().toLowerCase();
      if (medium === "hindi" || medium === "hi") {
        setTtsLanguage("hi-IN");
      } else if (medium === "english" || medium === "en") {
        setTtsLanguage("en-IN");
      } else {
        setTtsLanguage("gu-IN");
      }
    } else if (!ttsLanguage) {
      setTtsLanguage("gu-IN");
    }
  }, [user, ttsLanguage]);

  const handleStartStudy = () => {
    if (!selectedChapter) {
      toast.warning("કૃપા કરીને અભ્યાસ માટે પ્રકરણ પસંદ કરો!");
      return;
    }

    // Default summaries if none are present in DB
    const backupSummary = `પ્રકરણ: ${selectedChapter.chapterName} માટેનો આ ટૂંકો અભ્યાસ સારાંશ છે. આ પ્રકરણ વિદ્યાર્થીઓને તેના પાયાના ખ્યાલો વિગતવાર અને રસપ્રદ શૈલીમાં સમજાવવા માટે તૈયાર કરવામાં આવ્યો છે. 

અહીં અભ્યાસ કરવા પાછળનો મુખ્ય ઉદ્દેશ્ય તમારા જ્ઞાનને વધુ મજબૂત અને વ્યવહારિક બનાવવાનો છે. સારાંશ પૂરો થયા પછી તમારી પ્રેક્ટિસ ચકાસણી કરવામાં આવશે જેમાં સવાલ-જવાબ પૂછવામાં આવશે. તમામ પ્રશ્નોના જવાબો આ સારાંશના આધારે જ લેવામાં આવશે.

વિદ્યાર્થી મિત્રો, ધ્યાનથી અને એકાગ્રતાથી સારાંશ વાંચો તેમજ સુંદર અવાજ દ્વારા તેને સાંભળો જેથી કરીને તમે પ્રેક્ટિસ એક્ઝામમાં પૂરા માર્કસ મેળવી શકો. `;

    setSummaryText(selectedChapter.summaryText || backupSummary);
    setPhase("summary");
    sfx.tap();
  };

  // Text-To-Speech Controls using native Web Speech Synthesis API with fallback language support
  const speakSummary = () => {
    if (typeof window === "undefined") return;

    if (!synthRef.current && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    }

    if (!synthRef.current) {
      toast.error("તમારા ઉપકરણમાં વૉઇસ ક્ષમતા ઉપલબ્ધ નથી.");
      return;
    }

    // Handle Resume from Pause
    if (isSpeaking && isPaused) {
      try {
        synthRef.current.resume();
        setIsPaused(false);
      } catch (err) {
        console.warn("Resume failed:", err);
      }
      sfx.tap();
      return;
    }

    // Cancel current speaking before starting new
    try {
      synthRef.current.cancel();
    } catch (_) {}

    if (!summaryText) {
      toast.error("વાંચવા માટે કોઈ સાહિત્ય મળ્યું નથી.");
      return;
    }

    // Clean text: strip markdown characters and double newlines
    const cleanText = summaryText
      .replace(/[\n\r]+/g, " ")
      .replace(/[\*\_]+/g, "")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utteranceRef.current = utterance;

    // Set targeted language
    utterance.lang = ttsLanguage || "gu-IN";

    // Select custom matched voice if available
    try {
      const voices = synthRef.current.getVoices();
      let matchingVoice = voices.find(v => v.name === selectedVoiceName);
      if (!matchingVoice) {
        // Fallback to finding any voice starting with current language code prefix
        const prefix = (ttsLanguage || "gu-IN").substring(0, 2).toLowerCase();
        matchingVoice = voices.find(v => v.lang.toLowerCase().startsWith(prefix));
      }
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }
    } catch (e) {
      console.warn("Voice list matching error:", e);
    }

    utterance.rate = ttsSpeed;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = (e) => {
      if (e.error !== "interrupted" && e.error !== "canceled") {
        console.warn("SpeechSynthesis error:", e);
        toast.error("અવાજ શરૂ કરવામાં મુશ્કેલી પડી. અવાજ સેટિંગ્સમાં જઈને 'Hindi' અથવા 'English' પસંદ કરો.");
      }
      setIsSpeaking(false);
      setIsPaused(false);
    };

    try {
      synthRef.current.speak(utterance);
    } catch (err) {
      console.warn("Native speak failed:", err);
      toast.error("અવાજ શરૂ કરવામાં મુશ્કેલી પડી.");
      setIsSpeaking(false);
      setIsPaused(false);
    }

    sfx.tap();
  };

  const testSpeak = (langCode: string, voiceName: string) => {
    if (typeof window === "undefined" || !synthRef.current) return;
    try {
      synthRef.current.cancel();
    } catch (_) {}

    let text = "નમસ્તે, તમારા ફોન પર ગુજરાતી અવાજ યોગ્ય રીતે કામ કરી રહ્યો છે.";
    if (langCode === "hi-IN") {
      text = "नमस्ते, आपके फोन पर हिंदी आवाज़ सही तरीके से काम कर रही है.";
    } else if (langCode === "en-IN") {
      text = "Hello, English voice is working correctly on your phone.";
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;

    try {
      const voice = synthRef.current.getVoices().find(v => v.name === voiceName);
      if (voice) {
        utterance.voice = voice;
      }
    } catch (_) {}

    utterance.rate = ttsSpeed;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    try {
      synthRef.current.speak(utterance);
      toast.success("ટેસ્ટ અવાજ શરૂ થયો!");
    } catch (err) {
      console.warn("Test speak failed:", err);
      toast.error("ટેસ્ટ કરવા માટે અવાજ શરૂ ન થઈ શક્યો.");
    }
  };

  const pauseSummary = () => {
    if (synthRef.current && isSpeaking && !isPaused) {
      try {
        synthRef.current.pause();
        setIsPaused(true);
      } catch (err) {
        console.warn("Pause failed:", err);
      }
    }
    sfx.tap();
  };

  const stopSpeaking = () => {
    setIsSpeaking(false);
    setIsPaused(false);
    if (synthRef.current) {
      try {
        synthRef.current.cancel();
      } catch (err) {
        console.warn("Cancel failed:", err);
      }
    }
    sfx.tap();
  };

  const updateTtsSpeed = (newSpeed: number) => {
    setTtsSpeed(newSpeed);
    if (synthRef.current && isSpeaking && !isPaused) {
      try {
        synthRef.current.cancel();
      } catch (_) {}
      setTimeout(() => {
        speakSummary();
      }, 50);
    }
  };

  // Start Practice Session
  const handleStartPractice = async () => {
    if (!selectedSubject || !selectedChapter) return;
    setLoading(true);
    stopSpeaking(); // Shut off reader if active

    try {
      const allQuestions = await QuestionRepository.getQuestions(
        selectedSubject.subjectId,
        selectedChapter.chapterId
      );

      // Filter by registered medium
      const targetMedium = (user?.medium || "Gujarati").trim().toLowerCase();
      const allQuestionsFiltered = allQuestions.filter(q => {
        const qMed = (q.medium || "Gujarati").trim().toLowerCase();
        return qMed === targetMedium;
      });

      if (allQuestionsFiltered.length === 0) {
        toast.warning(`આ પ્રકરણ હેઠળ ${user?.medium || "Gujarati"} માધ્યમના પ્રશ્નો ઉપલબ્ધ નથી!`);
        setLoading(false);
        return;
      }

      // Randomize up to 10 questions of each type
      const mcqs = allQuestionsFiltered.filter(q => q.questionType === "MCQ").sort(() => 0.5 - Math.random()).slice(0, 10);
      const tfs = allQuestionsFiltered.filter(q => q.questionType === "TrueFalse").sort(() => 0.5 - Math.random()).slice(0, 10);
      const fbs = allQuestionsFiltered.filter(q => q.questionType === "FillBlank").sort(() => 0.5 - Math.random()).slice(0, 10);
      const shorts = allQuestionsFiltered.filter(q => q.questionType === "ShortAnswer").sort(() => 0.5 - Math.random()).slice(0, 10);
      const longs = allQuestionsFiltered.filter(q => q.questionType === "LongAnswer").sort(() => 0.5 - Math.random()).slice(0, 10);

      const combinedQuestions = [...mcqs, ...tfs, ...fbs, ...shorts, ...longs];
      if (combinedQuestions.length === 0) {
        setQuestions(allQuestionsFiltered.slice(0, 10));
      } else {
        setQuestions(combinedQuestions);
      }
      setCurrentIdx(0);
      setUserSelection(null);
      setIsAnswerSubmitted(false);
      setScoreCount(0);
      setTotalAttempted(0);
      setPhase("practice");
      sfx.tap();
    } catch (e) {
      console.error("Failed to load practice questions:", e);
      toast.error("પ્રશ્નો મેળવવામાં મુશ્કેલી આવી.");
    } finally {
      setLoading(false);
    }
  };

  // Check Answer & Show custom dynamic feedback (encouraging / explaining)
  const handleCheckAnswer = () => {
    if (!userSelection) {
      toast.warning("કૃપા કરીને પૂર્વે એક વિકલ્પ પસંદ કરો!");
      return;
    }

    const currentQuestion = questions[currentIdx];
    const isCorrectAns = String(userSelection).trim().toLowerCase() === String(currentQuestion.correctAnswer).trim().toLowerCase();

    setIsCorrect(isCorrectAns);
    setIsAnswerSubmitted(true);
    setTotalAttempted(prev => prev + 1);

    if (isCorrectAns) {
      setScoreCount(prev => prev + 1);
      sfx.correct();
      // Select random Gujarati congratulatory phrase
      const randomCongrat = GUJARATI_CONGRATULATIONS[Math.floor(Math.random() * GUJARATI_CONGRATULATIONS.length)];
      setFeedbackMsg(randomCongrat);

      // Instantly reward student points!
      if (user?.uid) {
        PointsRepository.addPoints(user.uid, 10, "abhyas_success")
          .then(() => toast.success("+૧૦ અભ્યાસ પોઈન્ટ્સ ઉમેરાયા! 🎖️"))
          .catch((err: any) => console.error("Points award error:", err));
      }
    } else {
      sfx.wrong();
      // Select random Gujarati encouraging phrase
      const randomEnc = GUJARATI_ENCOURAGEMENT[Math.floor(Math.random() * GUJARATI_ENCOURAGEMENT.length)];
      setFeedbackMsg(randomEnc);
    }
  };

  // Proceed to next question or complete practice bounds
  const handleNextQuestion = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(prev => prev + 1);
      setUserSelection(null);
      setIsAnswerSubmitted(false);
      setFeedbackMsg("");
      sfx.tap();
    } else {
      // Done - show achievements report
      if (user?.uid && selectedChapter?.chapterId) {
        ChapterRepository.markAbhyasCompleted(user.uid, selectedChapter.chapterId)
          .then(() => {
            console.log("Abhyas completion status persisted successfully.");
          })
          .catch(err => {
            console.error("Failed to persist abhyas completion:", err);
          });
      }
      setPhase("results");
      sfx.achievement();
    }
  };

  const handleFinishPractice = () => {
    setPhase("select");
    sfx.tap();
  };

  const activeQuestion = questions[currentIdx];

  return (
    <AppShell 
      title="અભ્યાસ મટીરીયલ" 
      titleGu="સ્માર્ટ રીડીંગ & સેલ્ફ પ્રેક્ટિસ" 
      back="/dashboard"
    >
      {/* LOADING ELEMENT */}
      {loading && (
        <div className="absolute inset-x-0 top-0 h-1 gradient-primary animate-pulse z-50 rounded-full" />
      )}

      <div className="p-4 space-y-4">
        
        {/* PHASE 1: SELECTOR SCREEN */}
        {phase === "select" && (
          <div className="space-y-4 animate-[fade-in_0.35s_ease-out]">
            
            {/* Header banner decoration */}
            <div className="rounded-3xl bg-gradient-to-br from-indigo-500 via-primary to-purple-600 p-5 text-white shadow-float relative overflow-hidden">
              <div className="absolute top-0 right-0 size-32 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 size-20 bg-white/5 rounded-full blur-2xl" />
              
              <div className="relative space-y-2">
                <div className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-xs font-bold border border-white/10">
                  <BookOpen className="size-3.5" /> સેલ્ફ લર્નિંગ પ્રોગ્રામ (Self Learning)
                </div>
                <h1 className="text-xl font-black font-gu">નવું ફિચર્સ: અભ્યાસ (અભ્યાસ)</h1>
                <p className="text-xs text-white/90 font-gu leading-relaxed">
                  વિદ્યાર્થીઓને મોબાઇલની ક્ષમતા દ્વારા રસપ્રદ અને આનંદદાયી રીતે ભણાવવા માટે રચેલું તકનીકી ફોર્મ. ચાલો શરૂ કરીએ!
                </p>
              </div>
            </div>

            {/* Selection Form Cards */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-card space-y-4">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <GraduationCap className="size-4 text-primary" /> તમારો પાઠ્યક્રમ પસંદ કરો
              </h2>

              {/* Standard Selector */}
              {isStudent ? (
                <div className="bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/50 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-sky-500 dark:text-sky-400 block uppercase tracking-by-wide font-gu">તમારું રજિસ્ટર્ડ ધોરણ અને માધ્યમ</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm font-gu block mt-1">
                      ધોરણ {selectedStandard} • {(user?.medium || "Gujarati")} Medium
                    </span>
                  </div>
                  <div className="bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-black font-gu rounded-full px-2.5 py-1">
                    લોક કરેલ 🔒
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-foreground/80 font-gu">૧. ધોરણ (Standard) [એડમિન મોડ]</label>
                  <div className="grid grid-cols-5 gap-2 mt-2">
                    {standards.map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          setSelectedStandard(st);
                          sfx.tap();
                        }}
                        className={`h-10 rounded-xl font-gu text-xs font-bold transition border ${
                          selectedStandard === st 
                            ? "gradient-primary text-primary-foreground border-transparent shadow-sm" 
                            : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        ધોરણ {st}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Subject Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80 font-gu">૨. વિષય (Subject)</label>
                <div className="relative">
                  <select
                    value={selectedSubject?.subjectId || ""}
                    onChange={(e) => {
                      const found = subjects.find(s => s.subjectId === e.target.value);
                      setSelectedSubject(found || null);
                      sfx.tap();
                    }}
                    className="w-full h-11 px-3 bg-muted/40 rounded-2xl border border-border outline-none text-xs font-bold font-gu text-foreground focus:border-primary transition"
                  >
                    {subjects.length === 0 ? (
                      <option value="">વિષયો ઉપલબ્ધ નથી</option>
                    ) : (
                      subjects.map(s => (
                        <option key={s.subjectId} value={s.subjectId}>
                          📚 {s.subjectName}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Chapter Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80 font-gu">૩. પાઠ / પ્રકરણ (Chapter)</label>
                <div className="relative">
                  <select
                    value={selectedChapter?.chapterId || ""}
                    onChange={(e) => {
                      const found = chapters.find(c => c.chapterId === e.target.value);
                      setSelectedChapter(found || null);
                      sfx.tap();
                    }}
                    className="w-full h-11 px-3 bg-muted/40 rounded-2xl border border-border outline-none text-xs font-bold font-gu text-foreground focus:border-primary transition"
                  >
                    {chapters.length === 0 ? (
                      <option value="">આ વિષય હેઠળ કોઈ પ્રકરણ નથી</option>
                    ) : (
                      chapters.map(c => (
                        <option key={c.chapterId} value={c.chapterId}>
                          📖 {c.chapterName}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Big Action Button */}
              <button
                type="button"
                onClick={handleStartStudy}
                disabled={!selectedChapter || loading}
                className="w-full h-12 rounded-2xl gradient-primary text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-float active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition mt-2"
              >
                <span>અભ્યાસ (સારાંશ) શરૂ કરો 🚀</span>
              </button>
            </div>
            
            {/* Interactive instructions widget */}
            <div className="rounded-3xl bg-muted/50 border border-border p-4 flex gap-3 text-xs text-muted-foreground leading-relaxed font-gu">
              <Info className="size-5 shrink-0 text-primary mt-0.5" />
              <div>
                <p className="font-bold text-foreground">રેગ્યુલર સીસ્ટમ (How it works):</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>પહેલા પ્રકરણ વાંચવા માટે સુંદર ટેક્સ્ટ નો સારાંશ આવશે.</li>
                  <li>તમે વાચતી વખતે સ્પીકર પર સુંદર અવાજ દ્વારા સાંભળી શકો છો.</li>
                  <li>પૂરું થાય એટલે સવાલો ની પ્રેક્ટિકલ ટેસ્ટ લેવામાં આવશે.</li>
                  <li>સાચા જવાબ પર ઉત્સાહવર્ધક શબ્દો અને ખોટા જવાબ પર વિગતવાર ડાયરેક્ટ સમજણ મળશે!</li>
                </ul>
              </div>
            </div>

          </div>
        )}

        {/* PHASE 2: SUMMARY SCREEN */}
        {phase === "summary" && selectedChapter && (
          <div className="space-y-4 animate-[slide-up_0.35s_ease-out]">
            
            {/* Header breadcrumb & Navigation row */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setPhase("select");
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline bg-muted/50 py-1.5 px-3 rounded-full border border-border"
              >
                <ChevronLeft className="size-4" /> પ્રકરણ બદલો
              </button>
              <div className="text-right text-[10px] font-gu text-muted-foreground">
                <span className="font-bold text-foreground">ધોરણ {selectedStandard}</span> • {selectedSubject?.subjectName}
              </div>
            </div>

            {/* Read text card */}
            <div className="bg-card border border-border rounded-3xl shadow-card overflow-hidden">
              <div className="p-4 bg-muted/40 border-b border-border flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-primary">વિષયવસ્તુ સારાંશ (Concept Synopsis)</p>
                  <h2 className="font-ex font-bold font-gu truncate text-foreground text-sm mt-0.5">
                    {selectedChapter.chapterName}
                  </h2>
                </div>
                <Book className="size-5 text-primary shrink-0" />
              </div>

              {/* Summary paragraphs body */}
              <div className="p-5 max-h-[340px] overflow-y-auto leading-relaxed text-sm text-foreground/90 font-gu whitespace-pre-line space-y-4">
                {summaryText}
              </div>

              {/* TTS Read Aloud Control bar */}
              <div className="p-4 bg-muted/30 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  {/* Status Indicator */}
                  <div className="flex items-center gap-2">
                    <span className={`size-2.5 rounded-full ${isSpeaking ? "bg-success animate-ping" : "bg-muted-foreground"}`} />
                    <span className="text-xs font-semibold font-gu text-muted-foreground">
                      {isSpeaking ? (isPaused ? "વાચક થોભાવેલ છે (Paused)" : "સુંદર અવાજમાં વાંચન ચાલુ...") : "સારાંશ સાંભળવા પ્લે કરો"}
                    </span>
                  </div>

                  {/* Play speeds and Settings toggle */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-muted/70 px-2 py-1 rounded-xl border border-border">
                      <span className="text-[9px] font-bold text-muted-foreground">SPEED:</span>
                      <select
                        value={ttsSpeed}
                        onChange={(e) => updateTtsSpeed(parseFloat(e.target.value))}
                        className="text-[10px] font-bold bg-transparent border-none outline-none cursor-pointer text-foreground"
                      >
                        <option value="0.75">0.75x</option>
                        <option value="1">1.0x</option>
                        <option value="1.25">1.25x</option>
                        <option value="1.5">1.5x</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowVoiceSettings(!showVoiceSettings);
                        sfx.tap();
                      }}
                      className={`p-1.5 rounded-xl border flex items-center justify-center transition ${showVoiceSettings ? "bg-primary border-primary text-white" : "bg-muted/70 border-border text-muted-foreground hover:text-foreground"}`}
                      title="અવાજ સેટિંગ્સ (Voice Settings)"
                    >
                      <Settings className="size-4 shrink-0" />
                    </button>
                  </div>
                </div>

                {/* Collapsible Voice Settings & Troubleshooting Diagnostics */}
                {showVoiceSettings && (
                  <div className="bg-card border border-border p-3 rounded-2xl space-y-2.5 animate-[fade-in_0.2s_ease-out]">
                    <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                      <span className="text-[11px] font-bold text-foreground font-gu flex items-center gap-1">
                        ⚙️ અવાજ સેટિંગ્સ (Voice Settings)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowVoiceSettings(false)}
                        className="text-[10px] text-muted-foreground hover:text-foreground font-bold"
                      >
                        બંધ કરો ×
                      </button>
                    </div>

                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 text-xs">
                      {/* Language Selection */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase font-gu block">અવાજની ભાષા (Language):</label>
                        <select
                          value={ttsLanguage}
                          onChange={(e) => {
                            const newLang = e.target.value;
                            setTtsLanguage(newLang);
                            localStorage.setItem("preferred_tts_language", newLang);
                            // Auto reset voice name so matching logic finds a voice for the new language
                            setSelectedVoiceName("");
                            sfx.tap();
                          }}
                          className="w-full h-8 px-2 bg-muted/40 border border-border rounded-lg outline-none text-[11px] font-bold font-gu text-foreground"
                        >
                          <option value="gu-IN">ગુજરાતી (Gujarati)</option>
                          <option value="hi-IN">હિન્દી (Hindi) - વધુ વિશ્વસનીય</option>
                          <option value="en-IN">English (India) - કાયમ ચાલુ</option>
                        </select>
                      </div>

                      {/* Voice Selection */}
                      <div className="space-y-1 col-span-1 xs:col-span-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase font-gu block">ઉપલબ્ધ અવાજ (Voice Engine):</label>
                        <select
                          value={selectedVoiceName}
                          onChange={(e) => {
                            setSelectedVoiceName(e.target.value);
                            localStorage.setItem("preferred_tts_voice", e.target.value);
                            sfx.tap();
                          }}
                          className="w-full h-8 px-2 bg-muted/40 border border-border rounded-lg outline-none text-[11px] font-semibold text-foreground truncate"
                        >
                          {availableVoices.length === 0 ? (
                            <option value="">શોધાઈ રહ્યું છે...</option>
                          ) : (
                            availableVoices
                              .filter(v => {
                                const prefix = (ttsLanguage || "gu-IN").substring(0, 2).toLowerCase();
                                return v.lang.toLowerCase().startsWith(prefix);
                              })
                              .map(v => (
                                <option key={v.name} value={v.name}>
                                  {v.name.replace(/Google/gi, "☁️ Google").replace(/Android/gi, "📱 Android")}
                                </option>
                              ))
                          )}
                          {/* If no voices match language, show all voices */}
                          {availableVoices.length > 0 && availableVoices.filter(v => {
                            const prefix = (ttsLanguage || "gu-IN").substring(0, 2).toLowerCase();
                            return v.lang.toLowerCase().startsWith(prefix);
                          }).length === 0 && (
                            availableVoices.map(v => (
                              <option key={v.name} value={v.name}>
                                {v.name}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Test Voice and Warning */}
                    <div className="space-y-2 pt-1 border-t border-border/40">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-semibold text-muted-foreground font-gu">
                          {availableVoices.filter(v => v.lang.toLowerCase().startsWith((ttsLanguage || "gu-IN").substring(0, 2))).length === 0 ? (
                            <span className="text-amber-500 font-bold">⚠️ આ ભાષાનો અવાજ ફોનમાં ઇન્સ્ટોલ કરેલ નથી.</span>
                          ) : (
                            <span className="text-emerald-600 font-bold">✓ અવાજ ઉપલબ્ધ છે</span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => testSpeak(ttsLanguage, selectedVoiceName)}
                          className="h-7 px-3 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-[10px] font-bold rounded-lg flex items-center gap-1 transition"
                        >
                          🔊 ટેસ્ટ અવાજ (Test Audio)
                        </button>
                      </div>

                      <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] text-amber-600 font-gu leading-relaxed">
                        <p className="font-bold">💡 અવાજ ન આવવાના કારણો અને ઉપાય:</p>
                        <p className="mt-0.5">1. જો ગુજરાતીમાં અવાજ ન આવે તો અવાજની ભાષા <strong>'હિન્દી (Hindi)'</strong> અથવા <strong>'English'</strong> કરો.</p>
                        <p className="mt-0.5">2. તમારા મોબાઈલ ના સેટિંગ્સમાં જઈને <strong>Text-to-speech output</strong> માં <strong>Preferred engine</strong> ને <strong>Speech Services by Google</strong> કરો અને ગુજરાતી લેંગ્વેજ પેક ડાઉનલોડ કરો.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Interaction controls buttons */}
                <div className="flex gap-2.5">
                  {!isSpeaking || isPaused ? (
                    <button
                      type="button"
                      onClick={speakSummary}
                      className="flex-1 h-11 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98]"
                    >
                      <Play className="size-4 shrink-0" />
                      <span>{isPaused ? "વાંચન ફરી શરૂ કરો" : "સારાંશ સાંભળો (Read Aloud)"}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={pauseSummary}
                      className="flex-1 h-11 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98]"
                    >
                      <Pause className="size-4 shrink-0" />
                      <span>અવાજ થોભો (Pause Audio)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={stopSpeaking}
                    disabled={!isSpeaking}
                    className="size-11 rounded-2xl bg-muted border border-border text-muted-foreground flex items-center justify-center hover:bg-muted/80 disabled:opacity-50 disabled:pointer-events-none transition shrink-0"
                    title="સમૂળગું બંધ કરો"
                  >
                    <RotateCcw className="size-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Giant Action Proceed to Practice Button */}
            <button
              type="button"
              onClick={handleStartPractice}
              className="w-full h-12 bg-primary hover:bg-primary-hover text-white rounded-2xl font-black text-sm tracking-wide shadow-float flex items-center justify-center gap-2 active:scale-[0.98] transition"
            >
              <span>સારાંશ પૂરો થયો, પ્રેક્ટિસ પરીક્ષા શરૂ કરો! 📝</span>
              <ChevronRight className="size-4" />
            </button>

          </div>
        )}

        {/* PHASE 3: PRACTICE ACTIVE EXAM SCREEN */}
        {phase === "practice" && activeQuestion && (
          <div className="space-y-4 animate-[fade-in_0.3s_ease-out]">
            
            {/* Steps & stats bar */}
            <div className="flex items-center justify-between bg-card border border-border p-3.5 rounded-3xl shadow-card">
              <div className="flex items-center gap-2">
                <span className="size-6 bg-primary-soft text-primary rounded-full flex items-center justify-center text-xs font-bold">
                  {currentIdx + 1}
                </span>
                <span className="text-xs font-bold font-gu text-muted-foreground">
                  પ્રશ્ન {currentIdx + 1} / {questions.length} (Self Practice)
                </span>
              </div>
              <div className="bg-success-soft text-success text-xs font-bold py-1 px-2.5 rounded-xl font-gu">
                સાચા ઉત્તર: {scoreCount}
              </div>
            </div>

            {/* Main Question Card with multiple choices options */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-card space-y-4">
              
              {/* The Question Text string */}
              <div className="space-y-1">
                <span className="text-[10px] tracking-wider text-warning font-extrabold uppercase bg-warning/10 px-2 py-0.5 rounded-full inline-block">
                  સવાલ (Answer of the summary)
                </span>
                <h3 className="text-base font-bold font-gu leading-relaxed text-foreground pt-1">
                  {activeQuestion.question}
                </h3>
              </div>

              {/* Illustrative support if presents */}
              {activeQuestion.illustrationUrl && (
                <div className="rounded-xl overflow-hidden border border-border bg-muted/30 p-1">
                  <img 
                    src={activeQuestion.illustrationUrl} 
                    alt="Question Diagram" 
                    className="max-h-48 mx-auto object-contain rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {/* Standard Options (A, B, C, D) Option Select List */}
              <div className="space-y-2.5 pt-2">
                
                {/* MCQ Mode options mapping */}
                {activeQuestion.questionType !== "TrueFalse" && activeQuestion.questionType !== "ShortAnswer" && activeQuestion.questionType !== "LongAnswer" && (
                  <>
                    {[
                      { key: "A", text: activeQuestion.optionA || activeQuestion.options?.[0] },
                      { key: "B", text: activeQuestion.optionB || activeQuestion.options?.[1] },
                      { key: "C", text: activeQuestion.optionC || activeQuestion.options?.[2] },
                      { key: "D", text: activeQuestion.optionD || activeQuestion.options?.[3] }
                    ]
                      .filter(opt => opt.text && opt.text.trim() !== "")
                      .map((opt) => {
                        const isSelected = userSelection === opt.key;
                        const isCorrectOpt = String(opt.key).trim().toLowerCase() === String(activeQuestion.correctAnswer).trim().toLowerCase();
                        
                        let btnStyle = "bg-muted/40 border-border hover:bg-muted text-foreground";
                        if (isAnswerSubmitted) {
                          if (isCorrectOpt) {
                            btnStyle = "bg-emerald-500/15 text-emerald-700 border-emerald-500 font-bold dark:text-emerald-400";
                          } else if (isSelected) {
                            btnStyle = "bg-destructive/15 text-destructive border-destructive font-bold";
                          } else {
                            btnStyle = "opacity-60 bg-muted/20 border-border";
                          }
                        } else if (isSelected) {
                          btnStyle = "bg-primary-soft text-primary border-primary shadow-sm font-bold";
                        }

                        return (
                          <button
                            key={opt.key}
                            type="button"
                            disabled={isAnswerSubmitted}
                            onClick={() => {
                              setUserSelection(opt.key);
                              sfx.tap();
                            }}
                            className={`w-full p-3.5 text-left rounded-2xl border text-xs font-semibold font-gu flex items-center gap-3 transition min-h-[48px] ${btnStyle}`}
                          >
                            <span className={`size-6 rounded-xl flex items-center justify-center text-xs border ${
                              isSelected ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground border-border"
                            }`}>
                              {opt.key}
                            </span>
                            <span className="flex-1">{opt.text}</span>
                          </button>
                        );
                    })}
                  </>
                )}

                {/* True / False Mode */}
                {activeQuestion.questionType === "TrueFalse" && (
                  <div className="grid grid-cols-2 gap-3 pb-1">
                    {[
                      { key: "True", label: "સાચું (True)" },
                      { key: "False", label: "ખોટું (False)" }
                    ].map((opt) => {
                      const isSelected = String(userSelection).trim().toLowerCase() === String(opt.key).trim().toLowerCase();
                      const isCorrectChoice = String(opt.key).trim().toLowerCase() === String(activeQuestion.correctAnswer).trim().toLowerCase();

                      let btnStyle = "bg-muted/40 border-border hover:bg-muted text-foreground";
                      if (isAnswerSubmitted) {
                        if (isCorrectChoice) {
                          btnStyle = "bg-emerald-500/15 text-emerald-700 border-emerald-500 font-bold dark:text-emerald-400";
                        } else if (isSelected) {
                          btnStyle = "bg-destructive/15 text-destructive border-destructive font-bold";
                        } else {
                          btnStyle = "opacity-60 bg-muted/20 border-border";
                        }
                      } else if (isSelected) {
                        btnStyle = "bg-primary-soft text-primary border-primary shadow-sm font-bold";
                      }

                      return (
                        <button
                          key={opt.key}
                          type="button"
                          disabled={isAnswerSubmitted}
                          onClick={() => {
                            setUserSelection(opt.key);
                            sfx.tap();
                          }}
                          className={`h-14 rounded-2xl border text-xs font-bold font-gu flex items-center justify-center gap-2 transition ${btnStyle}`}
                        >
                          {opt.key === "True" ? <CheckCircle className="size-4 shrink-0" /> : <XCircle className="size-4 shrink-0" />}
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Short / Long Descriptive Questions self-evaluation mode */}
                {(activeQuestion.questionType === "ShortAnswer" || activeQuestion.questionType === "LongAnswer") && (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground font-gu italic bg-muted/60 p-3.5 rounded-2xl border leading-relaxed">
                      💡 આ વર્ણનાત્મક ઉત્તર પ્રકારનો પ્રશ્ન છે. તમારા મનમાં જવાબ ધારી લો અથવા તમારી નોટબુકમાં લખી લો, ત્યારબાદ સાચો આદર્શ ઉત્તર જોવા માટે નીચેનું બટન દબાવો.
                    </p>
                    {!isAnswerSubmitted ? (
                      <button
                        type="button"
                        onClick={() => {
                          setUserSelection("A");
                          setIsCorrect(true);
                          setIsAnswerSubmitted(true);
                          setScoreCount(prev => prev + 1);
                          setTotalAttempted(prev => prev + 1);
                          sfx.correct();
                          setFeedbackMsg("ખૂબ જ સરસ! તમે આ જવાબનો પણ યોગ્ય અભ્યાસ કર્યો. 🌟");
                        }}
                        className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm font-gu cursor-pointer"
                      >
                        🔍 સાચો આદર્શ ઉત્તર જુઓ (Reveal Correct Answer)
                      </button>
                    ) : (
                      <div className="p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-400 space-y-3 font-gu animate-[fade-in_0.3s_ease-out]">
                        <p className="font-bold text-xs flex items-center gap-2">
                          <CheckCircle className="size-4 text-emerald-600" /> આ પ્રશ્નનો આદર્શ ઉત્તર નીચે મુજબ છે:
                        </p>
                        <p className="text-xs leading-relaxed bg-background/50 p-3.5 rounded-2xl border border-current/15 font-semibold text-foreground">
                          {activeQuestion.optionA || activeQuestion.question}
                        </p>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Dynamic feedback panel upon answer submission */}
              {isAnswerSubmitted && feedbackMsg && (
                <div className={`p-4 rounded-3xl border animate-[slide-up_0.3s_ease-out] space-y-2 leading-relaxed ${
                  isCorrect 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-400" 
                    : "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-400"
                }`}>
                  <div className="flex items-center gap-2">
                    {isCorrect ? (
                      <Smile className="size-5 shrink-0 text-emerald-600" />
                    ) : (
                      <HelpCircle className="size-5 shrink-0 text-amber-600" />
                    )}
                    <p className="font-ex font-bold font-gu text-xs">
                      {feedbackMsg}
                    </p>
                  </div>
                  
                  {/* Detailed Explanation / Concept guidance */}
                  {activeQuestion.explanation && activeQuestion.explanation.trim() !== "" && (
                    <div className="pt-1.5 border-t border-current/15 text-xs font-gu leading-relaxed space-y-1">
                      <p className="font-bold">💡 વિગતવાર સમજૂતી (Detailed Explanation):</p>
                      <p className="opacity-90">{activeQuestion.explanation}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Action trigger button */}
              {!isAnswerSubmitted ? (
                activeQuestion.questionType !== "ShortAnswer" && activeQuestion.questionType !== "LongAnswer" && (
                  <button
                    type="button"
                    onClick={handleCheckAnswer}
                    disabled={!userSelection}
                    className="w-full h-11 rounded-2xl gradient-primary text-white font-bold text-xs tracking-wide shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition cursor-pointer"
                  >
                    જવાબ ચકાસો (Check Answer)
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm tracking-wide shadow-float flex items-center justify-center gap-2 active:scale-[0.98] transition cursor-pointer"
                >
                  <span>{currentIdx + 1 < questions.length ? "આગળનો પ્રશ્ન (Next) 👉" : "રિપોર્ટ જુઓ (See Results) 🏆"}</span>
                  <ArrowRight className="size-4" />
                </button>
              )}

            </div>
          </div>
        )}

        {/* PHASE 4: SUMMARY RESULTS SCORE REPORT */}
        {phase === "results" && (
          <div className="space-y-4 text-center animate-[scale-in_0.4s_ease-out]">
            
            {/* Visual Trophy Badge */}
            <div className="bg-card border border-border rounded-3xl p-6 shadow-card space-y-4">
              <div className="relative size-24 bg-primary-soft text-primary rounded-full flex items-center justify-center mx-auto animate-bounce">
                <Award className="size-12" />
                <div className="absolute -top-1 -right-1 size-6 rounded-full bg-success text-white flex items-center justify-center">
                  <Sparkles className="size-3" />
                </div>
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-black font-gu text-foreground">પ્રેક્ટિસ પૂર્ણ થઈ! 🎉</h2>
                <p className="text-xs text-muted-foreground font-gu">
                  અભિનંદન! તમે સફળતાપૂર્વક આ પાઠનો અભ્યાસ પૂર્ણ કર્યો છે.
                </p>
              </div>

              {/* Scores summary table */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-muted/50 p-4 rounded-2xl text-center">
                  <p className="text-2xl font-black text-primary tabular-nums">{scoreCount}/{questions.length}</p>
                  <p className="text-[10px] text-muted-foreground font-gu mt-1">સાચા ઉત્તરો (Score)</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-2xl text-center">
                  <p className="text-2xl font-black text-success tabular-nums">+{scoreCount * 10}</p>
                  <p className="text-[10px] text-muted-foreground font-gu mt-1">કુલ મેળવેલા પોઇન્ટ્સ (Points)</p>
                </div>
              </div>

              {/* Progress feedback comment */}
              <div className="p-3.5 bg-primary-soft/10 border border-primary-soft rounded-2xl text-xs font-semibold font-gu text-primary text-center">
                📊 સચોટતા ગુણોત્તર (Accuracy Index): {Math.round((scoreCount / questions.length) * 100)}%
              </div>

              {/* Done button */}
              <button
                type="button"
                onClick={handleFinishPractice}
                className="w-full h-11 rounded-2xl gradient-primary text-white font-semibold text-xs tracking-wide shadow-sm active:scale-[0.98] transition mt-2"
              >
                અન્ય પ્રકરણ નો અભ્યાસ કરો 📚
              </button>
            </div>
            
          </div>
        )}

      </div>
    </AppShell>
  );
}
