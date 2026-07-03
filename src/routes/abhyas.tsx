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
  Settings,
  Trophy,
  Lock
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

const MEDALS = [
  {
    id: "aryabhata",
    name: "આર્યભટ્ટ મેડલ (Aryabhata Medal)",
    type: "ખગોળશાસ્ત્રી અને ગણિતશાસ્ત્રી",
    icon: "🪐",
    desc: "૧ પ્રકરણનો અભ્યાસ પૂર્ણ કરવા બદલ.",
    threshold: 1,
    color: "from-amber-400 to-amber-600 text-amber-950",
  },
  {
    id: "brahmagupta",
    name: "બ્રહ્મગુપ્ત મેડલ (Brahmagupta Medal)",
    type: "શૂન્યના શોધક (Pioneer of Zero)",
    icon: "🔘",
    desc: "૩ પ્રકરણનો અભ્યાસ પૂર્ણ કરવા બદલ.",
    threshold: 3,
    color: "from-blue-400 to-cyan-500 text-blue-950",
  },
  {
    id: "bhaskara",
    name: "ભાસ્કરાચાર્ય મેડલ (Bhaskara II Medal)",
    type: "ગણિતશાસ્ત્રી અને ભૌતિકશાસ્ત્રી",
    icon: "📐",
    desc: "૫ પ્રકરણનો અભ્યાસ પૂર્ણ કરવા બદલ.",
    threshold: 5,
    color: "from-emerald-400 to-teal-600 text-emerald-950",
  },
  {
    id: "varahamihira",
    name: "વરાહમિહિર મેડલ (Varahamihira Medal)",
    type: "પ્રાચીન ખગોળશાસ્ત્રી",
    icon: "🌠",
    desc: "૮ પ્રકરણનો અભ્યાસ પૂર્ણ કરવા બદલ.",
    threshold: 8,
    color: "from-purple-400 to-indigo-600 text-purple-950",
  },
  {
    id: "madhava",
    name: "સંગમગ્રામના માધવ મેડલ (Madhava Medal)",
    type: "અનંત શ્રેણીના પ્રણેતા (Infinite Series)",
    icon: "♾️",
    desc: "૧૨ પ્રકરણનો અભ્યાસ પૂર્ણ કરવા બદલ.",
    threshold: 12,
    color: "from-pink-400 to-rose-600 text-pink-950",
  },
  {
    id: "ramanujan",
    name: "શ્રીનિવાસ રામાનુજન મેડલ (Ramanujan Medal)",
    type: "મહાન ગણિતશાસ્ત્રી",
    icon: "🔢",
    desc: "૧૬ પ્રકરણનો અભ્યાસ પૂર્ણ કરવા બદલ.",
    threshold: 16,
    color: "from-amber-500 to-red-600 text-white",
  },
  {
    id: "cvraman",
    name: "સી. વી. રમણ મેડલ (C. V. Raman Medal)",
    type: "નોબેલ પુરસ્કાર વિજેતા ભૌતિકશાસ્ત્રી",
    icon: "💎",
    desc: "૨૦ પ્રકરણનો અભ્યાસ પૂર્ણ કરવા બદલ.",
    threshold: 20,
    color: "from-indigo-500 to-purple-700 text-white",
  },
  {
    id: "homibhabha",
    name: "હોમી જહાંગીર ભાભા મેડલ (Bhabha Medal)",
    type: "ભારતીય પરમાણુ વિજ્ઞાનના પિતા",
    icon: "⚛️",
    desc: "૨૫ પ્રકરણનો અભ્યાસ પૂર્ણ કરવા બદલ.",
    threshold: 25,
    color: "from-sky-500 to-blue-700 text-white",
  },
  {
    id: "sarabhai",
    name: "વિક્રમ સારાભાઈ મેડલ (Sarabhai Medal)",
    type: "ભારતીય અંતરિક્ષ વિજ્ઞાનના પિતા",
    icon: "🚀",
    desc: "૩૦ પ્રકરણનો અભ્યાસ પૂર્ણ કરવા બદલ.",
    threshold: 30,
    color: "from-teal-500 to-emerald-700 text-white",
  },
  {
    id: "abdulkalam",
    name: "એ. પી. જે. અબ્દુલ કલામ મેડલ (Kalam Medal)",
    type: "મિશાઇલ મેન ઓફ ઇન્ડિયા",
    icon: "🦅",
    desc: "૪૦ પ્રકરણનો અભ્યાસ પૂર્ણ કરવા બદલ.",
    threshold: 40,
    color: "from-orange-400 to-amber-600 text-white animate-pulse",
  },
  {
    id: "snbose",
    name: "એસ. એન. બોઝ મેડલ (S. N. Bose Medal)",
    type: "કવોન્ટમ ભૌતિકશાસ્ત્રી (Bose-Einstein)",
    icon: "✴️",
    desc: "૫૦ પ્રકરણનો અભ્યાસ પૂર્ણ કરવા બદલ.",
    threshold: 50,
    color: "from-violet-500 to-fuchsia-700 text-white",
  },
  {
    id: "jcbose",
    name: "જગદીશ ચંદ્ર બોઝ મેડલ (J. C. Bose Medal)",
    type: "રેડિયો અને વનસ્પતિ વિજ્ઞાનના પ્રણેતા",
    icon: "🌿",
    desc: "૬૦ પ્રકરણનો અભ્યાસ પૂર્ણ કરવા બદલ.",
    threshold: 60,
    color: "from-green-400 to-emerald-600 text-white",
  },
  {
    id: "shakuntala",
    name: "શકુંતલા દેવી મેડલ (Shakuntala Devi Medal)",
    type: "ધ હ્યુમન કોમ્પ્યુટર",
    icon: "⚡",
    desc: "૮૦ પ્રકરણનો અભ્યાસ પૂર્ણ કરવા બદલ.",
    threshold: 80,
    color: "from-yellow-400 to-orange-500 text-amber-950",
  },
  {
    id: "chandrasekhar",
    name: "સુબ્રહ્મણ્યમ ચંદ્રશેખર મેડલ (Chandrasekhar Medal)",
    type: "અંતરિક્ષ અને બ્લેક હોલના સંશોધક",
    icon: "🌟",
    desc: "૧૦૦ પ્રકરણનો અભ્યાસ પૂર્ણ કરવા બદલ.",
    threshold: 100,
    color: "from-slate-700 to-slate-900 text-yellow-300 border border-yellow-400/50",
  }
];

const detectLanguage = (text: string): string => {
  if (/[\u0A80-\u0AFF]/.test(text)) {
    return "gu-IN";
  }
  if (/[\u0900-\u097F]/.test(text)) {
    return "hi-IN";
  }
  return "en-US";
};

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

  // Completed study records and global lists
  const [completions, setCompletions] = useState<any[]>([]);
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);

  const refreshStudyProgress = () => {
    if (user?.uid) {
      ChapterRepository.getStudentAbhyasCompletions(user.uid)
        .then((res) => {
          setCompletions(res || []);
        })
        .catch(err => console.error("Error fetching study completions:", err));
    }
  };

  useEffect(() => {
    refreshStudyProgress();
    ChapterRepository.getAllChaptersInSystem()
      .then((res) => {
        setAllChapters(res || []);
      })
      .catch(err => console.error("Error fetching all chapters:", err));
    ChapterRepository.getAllSubjectsInSystem()
      .then((res) => {
        setAllSubjects(res || []);
      })
      .catch(err => console.error("Error fetching all subjects:", err));
  }, [user]);

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
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

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

  // Handle Speech Synthesis Lifecycle
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthRef.current) {
        try { synthRef.current.cancel(); } catch (_) {}
      }
    };
  }, []);

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

  // Automatic auto-detecting Text-To-Speech Controls using Capacitor Native TTS & Browser SpeechSynthesis Fallback
  const speakText = async (textToSpeak: string) => {
    if (typeof window === "undefined") return;

    const cleanText = textToSpeak
      .replace(/[\n\r]+/g, " ")
      .replace(/[\*\_]+/g, "")
      .trim();

    if (!cleanText) return;

    const detectedLang = detectLanguage(cleanText);

    // Try native Capacitor platform first
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) {
        const { TextToSpeech } = await import("@capacitor-community/text-to-speech");
        
        setIsSpeaking(true);
        setIsPaused(false);

        await TextToSpeech.stop();
        await TextToSpeech.speak({
          text: cleanText,
          lang: detectedLang,
          rate: 1.0,
          pitch: 1.0,
        });

        setIsSpeaking(false);
        setIsPaused(false);
        return;
      }
    } catch (err) {
      console.warn("Capacitor Native TTS speak failed, trying browser:", err);
    }

    // Web Browser SpeechSynthesis
    if (!synthRef.current && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    }

    if (!synthRef.current) return;

    try {
      synthRef.current.cancel();
    } catch (_) {}

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utteranceRef.current = utterance;
    utterance.lang = detectedLang;
    utterance.rate = 1.0;
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
    } catch (err) {
      console.warn("Browser SpeechSynthesis speak failed:", err);
    }
  };

  const speakSummary = async () => {
    if (typeof window === "undefined") return;

    if (!summaryText) {
      toast.error("વાંચવા માટે કોઈ સાહિત્ય મળ્યું નથી.");
      return;
    }

    // Handle Resume from Pause
    if (isSpeaking && isPaused) {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (Capacitor.isNativePlatform()) {
          // Native cannot resume from stop easily, so just replay from the text to be safe
          speakText(summaryText);
          sfx.tap();
          return;
        }
      } catch (_) {}

      if (synthRef.current) {
        try {
          synthRef.current.resume();
          setIsPaused(false);
          sfx.tap();
          return;
        } catch (err) {
          console.warn("Resume failed, starting over:", err);
        }
      }
    }

    speakText(summaryText);
    sfx.tap();
  };

  const pauseSummary = async () => {
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) {
        const { TextToSpeech } = await import("@capacitor-community/text-to-speech");
        await TextToSpeech.stop();
        setIsPaused(true);
        sfx.tap();
        return;
      }
    } catch (_) {}

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

  const stopSpeaking = async () => {
    setIsSpeaking(false);
    setIsPaused(false);

    try {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) {
        const { TextToSpeech } = await import("@capacitor-community/text-to-speech");
        await TextToSpeech.stop();
      }
    } catch (_) {}

    if (synthRef.current) {
      try {
        synthRef.current.cancel();
      } catch (err) {
        console.warn("Cancel failed:", err);
      }
    }
    sfx.tap();
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

      speakText(`સાચો જવાબ! ${randomCongrat}`);
    } else {
      sfx.wrong();
      // Select random Gujarati encouraging phrase
      const randomEnc = GUJARATI_ENCOURAGEMENT[Math.floor(Math.random() * GUJARATI_ENCOURAGEMENT.length)];
      setFeedbackMsg(randomEnc);

      const explanationSpeech = currentQuestion.explanation ? `. સમજૂતી: ${currentQuestion.explanation}` : "";
      speakText(`ખોટો જવાબ. ${randomEnc}${explanationSpeech}`);
    }
  };

  // Proceed to next question or complete practice bounds
  const handleNextQuestion = () => {
    stopSpeaking(); // Shut off feedback TTS reader if active
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
            refreshStudyProgress();
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

            {/* 🎖️ INDIAN LEGENDS MEDALS & ACHIEVEMENTS PANEL */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-black text-foreground font-gu flex items-center gap-1.5">
                    <Trophy className="size-4 text-amber-500 fill-amber-500/20" /> અભ્યાસ પદકો (Study Medals)
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-gu">
                    મહાન ભારતીય વૈજ્ઞાનિકો અને ગણિતશાસ્ત્રીઓના નામના મેડલ્સ મેળવો!
                  </p>
                </div>
                <span className="text-xs font-sans font-black bg-teal-500/10 text-teal-700 px-2.5 py-1 rounded-full shrink-0">
                  {completions.length} / {MEDALS.length} Completed
                </span>
              </div>

              {/* Medals grid visualizer */}
              <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                {MEDALS.map((medal) => {
                  const isUnlocked = completions.length >= medal.threshold;
                  return (
                    <div 
                      key={medal.id}
                      className={`relative border rounded-2xl p-3 flex flex-col gap-2 transition overflow-hidden ${
                        isUnlocked 
                          ? "bg-gradient-to-br from-card to-muted/20 border-teal-500/30 shadow-xs scale-[1.01]" 
                          : "bg-muted/10 border-border/60 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {/* Medal Icon Badge */}
                        <div className={`size-8 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 shadow-xs ${
                          isUnlocked 
                            ? `bg-gradient-to-br ${medal.color}`
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {isUnlocked ? medal.icon : <Lock className="size-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[11px] font-black font-gu text-foreground truncate">{medal.name}</h4>
                          <p className="text-[9px] text-muted-foreground truncate font-gu">{medal.type}</p>
                        </div>
                      </div>
                      <p className="text-[10px] leading-relaxed text-foreground/80 font-gu">
                        {medal.desc}
                      </p>
                      {/* Locking / progress overlay indicator */}
                      {!isUnlocked && (
                        <div className="text-[9px] font-sans font-black text-amber-600 bg-amber-500/10 self-start px-1.5 py-0.5 rounded">
                          Requires {medal.threshold} Chapters
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 📊 DETAILED ABHYAS PROGRESS TABLE */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-black text-foreground font-gu flex items-center gap-1.5">
                    <BookOpen className="size-4 text-emerald-500" /> અભ્યાસ વિગતો (Your Study Progress)
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-gu">
                    તમે અત્યાર સુધી કયા વિષયના કયા ચેપ્ટરનો અભ્યાસ કેટલી વાર કર્યો છે તેની સુંદર વિગતવાર માહિતી.
                  </p>
                </div>
              </div>

              {completions.length === 0 ? (
                <div className="border border-dashed p-6 rounded-2xl text-center text-muted-foreground">
                  <BookOpen className="size-6 mx-auto mb-1.5 text-muted-foreground/40" />
                  <p className="text-[11px] font-semibold font-gu">હજી સુધી કોઈ અભ્યાસ પૂર્ણ થયો નથી. પહેલો અભ્યાસ શરૂ કરો!</p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[220px] border border-border rounded-2xl">
                  <table className="w-full text-left border-collapse text-xs font-sans">
                    <thead>
                      <tr className="bg-muted border-b border-border text-[10px] uppercase font-bold text-muted-foreground font-gu">
                        <th className="py-2.5 px-3">વિષય (Subject)</th>
                        <th className="py-2.5 px-3">પ્રકરણ (Chapter)</th>
                        <th className="py-2.5 px-3 text-center">વાર (Times)</th>
                        <th className="py-2.5 px-3 text-right">છેલ્લે (Last)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-foreground font-gu">
                      {completions.map((item: any, idx: number) => {
                        const chap = allChapters.find(c => c.chapterId === item.chapterId);
                        const sub = allSubjects.find(s => s.subjectId === chap?.subjectId);
                        
                        const chapterName = chap ? chap.chapterName : item.chapterId;
                        const subjectName = sub ? sub.subjectName : "અન્ય વિષય";
                        const formattedDate = new Date(item.completedAt).toLocaleDateString("gu-IN", {
                          day: "numeric",
                          month: "short"
                        });

                        return (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="py-2.5 px-3 font-semibold text-foreground/80 truncate max-w-[100px]" title={subjectName}>
                              📚 {subjectName}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-foreground truncate max-w-[120px]" title={chapterName}>
                              {chapterName}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="bg-teal-500/10 text-teal-700 font-sans font-extrabold px-2 py-0.5 rounded-full text-[10px]">
                                {item.count || 1} વાર
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground text-[10px] whitespace-nowrap">
                              {formattedDate}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
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
                </div>

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
