import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  HelpCircle, 
  X, 
  BookOpen, 
  Trophy, 
  RotateCcw, 
  FileText, 
  MessageSquare, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Phone, 
  Mail, 
  Send, 
  CheckCircle2, 
  Compass,
  AlertCircle
} from "lucide-react";
import { useAuth } from "./FirebaseProvider";
import { SupportRepository } from "@/lib/db";
import { toast } from "sonner";

interface HelpAndTourProps {
  isOpen: boolean;
  onClose: () => void;
  startTourDirectly?: boolean;
}

export function HelpAndTour({ isOpen, onClose, startTourDirectly = false }: HelpAndTourProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"tutorial" | "tour" | "contact">("tutorial");
  const [lang, setLang] = useState<"gu" | "en">(user?.medium === "English" ? "en" : "gu");
  
  // Support form state
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // App Tour state
  const [tourActive, setTourActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightStyle, setSpotlightStyle] = useState<React.CSSProperties>({});

  const tourSteps = [
    {
      titleGu: "અભિનંદન અને સ્વાગત છે! 🎉",
      titleEn: "Welcome to Daily Learning Exam! 🎉",
      descGu: "આપો દૈનિક પરીક્ષાઓ, રિવિઝન કરો તમારી ભૂલોનું અને મેળવો રેન્કિંગ બોર્ડમાં ટોચનું સ્થાન. ચાલો ૧ મિનિટની નાની ટૂર દ્વારા સમજીએ!",
      descEn: "Take daily exams, revise mistakes, and reach the top of the leaderboard. Let's take a quick 1-minute tour of how it works!",
      selector: "", // Screen center welcome
    },
    {
      titleGu: "૧. દૈનિક પ્રગતિ (Daily Progress) 📈",
      titleEn: "1. Daily Progress 📈",
      descGu: "અહીં તમારી આજની કુલ પ્રગતિ દેખાશે. તમે કેટલી પરીક્ષાઓ આપી, કેટલા પ્રશ્નો રિવિઝન કર્યા અને તમારી સતત હાજરી (Streak) અહીં જોઈ શકો છો.",
      descEn: "This section tracks your overall progress for today, including completed exams, revised questions, and your continuous active streak count.",
      selector: "#tour-progress",
    },
    {
      titleGu: "૨. આજની પરીક્ષા (Today's Exam) 📝",
      titleEn: "2. Today's Exam 📝",
      descGu: "દરેક વિષયની દૈનિક પરીક્ષા અહીં પ્રદર્શિત થાય છે. સમય મર્યાદા પૂરી થાય તે પહેલાં પરીક્ષા શરૂ કરો અને સાચા જવાબો સબમિટ કરો.",
      descEn: "Active and scheduled daily exams appear here. Tap the card to launch the exam and submit before the timer runs out.",
      selector: "#tour-exam",
    },
    {
      titleGu: "૩. અભ્યાસ મોડ્યુલ (Abhyas Material) 📚",
      titleEn: "3. Abhyas Module 📚",
      descGu: "પુસ્તકોનો ટૂંકો સારાંશ (Summary) વાંચો, સરસ અવાજમાં ટેક્સ્ટ-ટુ-સ્પીચ (TTS) દ્વારા સાંભળો અને પ્રેક્ટિસ ટેસ્ટ દ્વારા જ્ઞાન મેળવો!",
      descEn: "Access chapter synopses, listen to them via our audio read-aloud TTS engine, and complete practice tests to master topics.",
      selector: "#tour-abhyas",
    },
    {
      titleGu: "૪. ભૂલ સુધારણા બોક્સ (Revision Box) 🔄",
      titleEn: "4. Revision Box 🔄",
      descGu: "પરીક્ષામાં ખોટા પડેલા પ્રશ્નો આપમેળે રિવિઝન લિસ્ટમાં જશે. તેને ફરીથી સોલ્વ કરીને તમારી ભૂલોને સફળતામાં ફેરવો!",
      descEn: "Questions answered incorrectly automatically enter this box. Re-solve them here to learn from mistakes and master the concepts.",
      selector: "#tour-revision",
    },
    {
      titleGu: "૫. લીડરબોર્ડ અને રેન્કિંગ (Leaderboard) 🏆",
      titleEn: "5. Leaderboard & Rankings 🏆",
      descGu: "તમારો લાઇવ રેન્ક અહીં દેખાશે. આખા ગુજરાત અથવા તમારી શાળાના મિત્રો સાથે સ્વસ્થ સ્પર્ધા કરો અને મોખરે રહો!",
      descEn: "Check your live rank position here. Compete with schoolmates and statewide students on daily, weekly, and monthly leaderboards.",
      selector: "#tour-leaderboard-card",
    },
    {
      titleGu: "૬. મદદ અને એડમિન સંપર્ક (Help Menu) 💡",
      titleEn: "6. Help Menu & Support 💡",
      descGu: "કોઈપણ સમસ્યા હોય, વિગતવાર માહિતી જોઈતી હોય કે એડમિનનો સંપર્ક કરવો હોય, તો હંમેશા આ હેલ્પ મેનૂનો ઉપયોગ કરો!",
      descEn: "Whenever you need help, want to restart this tour, read detailed tutorials, or send a direct message to admins, tap here!",
      selector: "#tour-help",
    }
  ];

  useEffect(() => {
    if (startTourDirectly) {
      setTourActive(true);
      setCurrentStep(0);
      onClose();
    }
  }, [startTourDirectly]);

  // Check if a new user logged in to auto-trigger the tour
  useEffect(() => {
    if (user?.uid) {
      const completed = localStorage.getItem(`dle:tour_completed:${user.uid}`);
      if (!completed) {
        // Auto start tour on a small delay to let dashboard render
        const timer = setTimeout(() => {
          setTourActive(true);
          setCurrentStep(0);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [user?.uid]);

  // Position spotlight based on active element
  useEffect(() => {
    if (!tourActive) return;

    const step = tourSteps[currentStep];
    if (!step || !step.selector) {
      setSpotlightStyle({});
      return;
    }

    const element = document.querySelector(step.selector);
    if (element) {
      // Scroll element smoothly into view
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      
      const updateSpotlight = () => {
        const rect = element.getBoundingClientRect();
        setSpotlightStyle({
          top: `${rect.top + window.scrollY - 8}px`,
          left: `${rect.left + window.scrollX - 8}px`,
          width: `${rect.width + 16}px`,
          height: `${rect.height + 16}px`,
          opacity: 1
        });
      };

      // Set timeout to wait for scroll and potential animations
      const timer = setTimeout(updateSpotlight, 300);
      
      window.addEventListener("resize", updateSpotlight);
      window.addEventListener("scroll", updateSpotlight);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("resize", updateSpotlight);
        window.removeEventListener("scroll", updateSpotlight);
      };
    } else {
      setSpotlightStyle({ opacity: 0 });
    }
  }, [tourActive, currentStep]);

  const handleStartTour = () => {
    setTourActive(true);
    setCurrentStep(0);
    onClose();
  };

  const handleNextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleCompleteTour();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleCompleteTour = () => {
    setTourActive(false);
    if (user?.uid) {
      localStorage.setItem(`dle:tour_completed:${user.uid}`, "true");
    }
    toast.success(lang === "gu" ? "એપ ટૂર પૂર્ણ થઈ! આભાર." : "App Tour completed! Thank you.");
  };

  const handleSkipTour = () => {
    setTourActive(false);
    if (user?.uid) {
      localStorage.setItem(`dle:tour_completed:${user.uid}`, "true");
    }
    toast.info(lang === "gu" ? "ટૂર છોડી દીધી છે. તમે હેલ્પ મેનૂમાંથી ફરી શરૂ કરી શકો છો." : "Tour skipped. You can restart it anytime from the Help menu.");
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error(lang === "gu" ? "કૃપા કરીને બધા ખાલી બોક્સ ભરો." : "Please fill in all fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      await SupportRepository.submitMessage(
        user?.uid || "guest",
        user?.fullName || "Guest Student",
        user?.mobile,
        subject,
        message
      );
      setSubmitSuccess(true);
      setSubject("");
      setMessage("");
      toast.success(lang === "gu" ? "તમારો સંદેશ સફળતાપૂર્વક મોકલવામાં આવ્યો છે!" : "Your message has been sent successfully!");
    } catch (err) {
      console.error(err);
      toast.error(lang === "gu" ? "મોકલવામાં ભૂલ થઈ. ફરી પ્રયાસ કરો." : "Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* 1. HELP SLIDE-OVER DRAWER MENU */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex justify-end pointer-events-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md h-full bg-background border-l border-border flex flex-col shadow-float overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card">
                <div className="flex items-center gap-2">
                  <div className="size-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <HelpCircle className="size-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-foreground leading-none">મદદ અને ટૂર (Help & Tour)</h2>
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">Guide, Support & App Tour</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Language switch toggle */}
                  <button
                    onClick={() => setLang(l => l === "gu" ? "en" : "gu")}
                    className="px-2.5 py-1 text-xs font-black rounded-lg bg-muted text-foreground border border-border hover:bg-accent hover:text-accent-foreground transition"
                  >
                    {lang === "gu" ? "English" : "ગુજરાતી"}
                  </button>
                  
                  <button
                    onClick={onClose}
                    className="size-9 rounded-full flex items-center justify-center bg-muted/65 text-muted-foreground hover:bg-muted transition"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border bg-muted/30 p-1.5 gap-1 shrink-0">
                <button
                  onClick={() => { setActiveTab("tutorial"); setSubmitSuccess(false); }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
                    activeTab === "tutorial" 
                      ? "bg-card text-foreground shadow-sm border border-border" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {lang === "gu" ? "માર્ગદર્શિકા" : "Tutorial"}
                </button>
                <button
                  onClick={() => { setActiveTab("tour"); setSubmitSuccess(false); }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
                    activeTab === "tour" 
                      ? "bg-card text-foreground shadow-sm border border-border" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {lang === "gu" ? "એપ ટૂર" : "App Tour"}
                </button>
                <button
                  onClick={() => { setActiveTab("contact"); setSubmitSuccess(false); }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
                    activeTab === "contact" 
                      ? "bg-card text-foreground shadow-sm border border-border" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {lang === "gu" ? "એડમિન સંપર્ક" : "Contact Admin"}
                </button>
              </div>

              {/* Scrollable Content Container */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                
                {/* TAB 1: TUTORIALS */}
                {activeTab === "tutorial" && (
                  <div className="space-y-4 font-gu">
                    <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                      <h3 className="font-bold text-primary flex items-center gap-1.5 text-sm">
                        <Sparkles className="size-4 text-amber-500 animate-spin-slow" />
                        {lang === "gu" ? "દૈનિક શિક્ષણ પદ્ધતિ કેવી રીતે કામ કરે છે?" : "How does the Learning System work?"}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                        {lang === "gu" 
                          ? "અમારી એપનો મુખ્ય ઉદ્દેશ્ય ધોરણ ૧૦ ના વિદ્યાર્થીઓ માટે અભ્યાસ સરળ બનાવવાનો છે. નીચે દર્શાવેલ મુખ્ય મોડ્યુલ દ્વારા તમે તમારી પ્રગતિ સુધારી શકો છો."
                          : "Our main mission is to simplify learning. Follow the primary modules below to continuously scale up your exam scores."}
                      </p>
                    </div>

                    <div className="space-y-3">
                      {/* Section 1: Exams */}
                      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex gap-3.5">
                        <div className="size-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
                          <FileText className="size-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-foreground">
                            {lang === "gu" ? "૧. દૈનિક પરીક્ષાઓ (Daily Exams)" : "1. Daily Online Exams"}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {lang === "gu"
                              ? "દરરોજ તમારા અભ્યાસક્રમ મુજબના પ્રકરણોની પરીક્ષા લેવામાં આવે છે. પરીક્ષામાં પૂછાતા બહુવિકલ્પ (MCQs) પ્રશ્નોનો સાચો જવાબ પસંદ કરી સમય મર્યાદા પૂરી થાય તે પહેલાં પરીક્ષા સબમિટ કરો."
                              : "Every day, scheduled multi-choice questions exams based on your class board syllabus are rolled out. Solve carefully and submit before the countdown ticks to zero."}
                          </p>
                        </div>
                      </div>

                      {/* Section 2: Revision */}
                      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex gap-3.5">
                        <div className="size-10 rounded-xl bg-warning/15 text-warning-foreground flex items-center justify-center shrink-0">
                          <RotateCcw className="size-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-foreground">
                            {lang === "gu" ? "૨. ભૂલ સુધારણા (Revision Box)" : "2. Automated Revision Box"}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {lang === "gu"
                              ? "પરીક્ષામાં ખોટા પડેલા પ્રશ્નો ઓટોમેટિકલી રિવિઝન લિસ્ટમાં ઉમેરાય છે. તેને વારંવાર પ્રેક્ટિસ કરો, જ્યાં સુધી તેનો સાચો જવાબ ન આપો. જ્યારે તમે સાચો જવાબ આપો ત્યારે તે પ્રશ્ન રિવિઝન લિસ્ટમાંથી દૂર થશે."
                              : "Questions with wrong answers are moved to the Revision Box. Repeat the practice until you answer correctly, ensuring that mistakes are transformed into permanent knowledge."}
                          </p>
                        </div>
                      </div>

                      {/* Section 3: Abhyas */}
                      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex gap-3.5">
                        <div className="size-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                          <BookOpen className="size-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-foreground">
                            {lang === "gu" ? "૩. અભ્યાસ પદ્ધતિ (Abhyas Module)" : "3. Self Learning - Abhyas Module"}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {lang === "gu"
                              ? "કોઈ પણ વિષયના પ્રકરણનો ટૂંકો સારાંશ (Summary) વાંચો, તેને સુંદર માનવ જેવા અવાજમાં (TTS Voice Reader) સાંભળો અને તેના સંબંધિત પ્રશ્નો ઉકેલીને જ્ઞાન પાકું કરો."
                              : "Read neat chapter summaries, listen to summaries read aloud in highly realistic speech with our smart TTS engine, and challenge yourself with instant chapter practices."}
                          </p>
                        </div>
                      </div>

                      {/* Section 4: Streak/Ranks */}
                      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex gap-3.5">
                        <div className="size-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                          <Trophy className="size-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-foreground">
                            {lang === "gu" ? "૪. રેન્કિંગ અને પોઈન્ટ્સ (Ranks & Points)" : "4. Rankings & Reward Points"}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {lang === "gu"
                              ? "દરેક પરીક્ષામાં મેળવેલ ગુણ, રિવિઝન બોક્સમાં પૂર્ણ કરેલ પ્રશ્નો અને રોજ લોગીન કરીને જાળવેલ હાજરી (Streak) ના પોઈન્ટ્સ મળે છે. આ પોઈન્ટ્સ દ્વારા તમે લીડરબોર્ડમાં ઉચ્ચ સ્થાન મેળવી શકો છો."
                              : "Score high on exams, revise mistake questions, and maintain active day streaks to earn points. Climb the daily, weekly, and monthly state ranks!"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: APP TOUR */}
                {activeTab === "tour" && (
                  <div className="text-center py-6 font-gu flex flex-col items-center space-y-4">
                    <div className="size-20 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center animate-[pulse-soft_2s_infinite]">
                      <Compass className="size-10" />
                    </div>
                    
                    <div className="space-y-1.5 max-w-xs">
                      <h3 className="font-extrabold text-lg text-foreground">
                        {lang === "gu" ? "ઇન્ટરેક્ટિવ ગાઇડેડ ટૂર" : "Interactive Guided Tour"}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {lang === "gu"
                          ? "મોડેલ પ્રણાલી દ્વારા એપ્લિકેશનના મુખ્ય ફીચર્સ કેમ ચલાવવા તેનો ઓન-સ્ક્રીન પરિચય મેળવો."
                          : "Take an interactive on-screen tour to see exactly where all modules are placed on your dashboard."}
                      </p>
                    </div>

                    <div className="w-full pt-4">
                      <button
                        onClick={handleStartTour}
                        className="w-full py-3 rounded-2xl gradient-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 shadow-float active:scale-[0.98] transition"
                      >
                        <Sparkles className="size-4" />
                        <span>{lang === "gu" ? "ટૂર શરૂ કરો (Start App Tour)" : "Launch Guided App Tour"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 3: CONTACT ADMIN */}
                {activeTab === "contact" && (
                  <div className="space-y-5 font-gu">
                    {/* Official Helplines */}
                    <div className="space-y-2.5">
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        {lang === "gu" ? "એડમિન હેલ્પલાઇન વિગતો" : "Official Helplines"}
                      </h3>
                      <div className="grid grid-cols-1 gap-2.5">
                        <a
                          href="https://wa.me/919904212123"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/15 rounded-2xl transition"
                        >
                          <div className="size-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                            <Phone className="size-4" />
                          </div>
                          <div className="text-left">
                            <span className="text-[10px] text-muted-foreground uppercase block font-medium">WhatsApp Support</span>
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">+91 99042 12123</span>
                          </div>
                        </a>

                        <a
                          href="mailto:support@daily-learning-exam.com"
                          className="flex items-center gap-3 p-3 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/15 rounded-2xl transition"
                        >
                          <div className="size-9 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0">
                            <Mail className="size-4" />
                          </div>
                          <div className="text-left">
                            <span className="text-[10px] text-muted-foreground uppercase block font-medium">Email Helpline</span>
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">support@dailyexam.com</span>
                          </div>
                        </a>
                      </div>
                    </div>

                    {/* Direct Contact Form */}
                    <div className="border-t border-border pt-4">
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                        {lang === "gu" ? "મોકલો સીધો સંદેશ એડમિનને" : "Send Direct Message to Admin"}
                      </h3>

                      {submitSuccess ? (
                        <div className="bg-success-soft border border-success/20 rounded-2xl p-5 text-center flex flex-col items-center space-y-2">
                          <CheckCircle2 className="size-10 text-success" />
                          <h4 className="font-bold text-sm text-success">
                            {lang === "gu" ? "સંદેશ મોકલવામાં આવ્યો!" : "Message Sent Successfully!"}
                          </h4>
                          <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                            {lang === "gu"
                              ? "તમારો પ્રશ્ન એડમિન ડેસ્ક પર નોંધવામાં આવ્યો છે. ટૂંક સમયમાં અમે તમારો સંપર્ક કરીશું."
                              : "Your message has been registered. Our admin desk will review it and follow up as soon as possible."}
                          </p>
                          <button
                            onClick={() => setSubmitSuccess(false)}
                            className="mt-2 text-xs font-semibold text-primary hover:underline"
                          >
                            {lang === "gu" ? "બીજો પ્રશ્ન મોકલો" : "Send another inquiry"}
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleContactSubmit} className="space-y-3.5">
                          <div>
                            <label className="text-xs font-bold text-foreground mb-1 block">
                              {lang === "gu" ? "પ્રશ્નનો પ્રકાર / વિષય (Subject)" : "Inquiry Subject"}
                            </label>
                            <input
                              type="text"
                              value={subject}
                              onChange={(e) => setSubject(e.target.value)}
                              placeholder={lang === "gu" ? "ઉદા. લોગીન અથવા ટેસ્ટ સબમિટમાં સમસ્યા" : "e.g., Profile login or test submission issue"}
                              className="w-full h-11 px-3.5 text-xs bg-muted/65 border border-border rounded-xl focus:border-primary focus:bg-card focus:outline-none transition font-sans font-medium"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-bold text-foreground mb-1 block">
                              {lang === "gu" ? "તમારો વિસ્તૃત સંદેશ (Message)" : "Detailed Message"}
                            </label>
                            <textarea
                              rows={4}
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              placeholder={lang === "gu" ? "તમારી સમસ્યા અથવા મદદની વિગતવાર માહિતી લખો..." : "Describe your problem, query or suggestion in detail..."}
                              className="w-full p-3 text-xs bg-muted/65 border border-border rounded-xl focus:border-primary focus:bg-card focus:outline-none resize-none transition font-sans font-medium"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition disabled:opacity-50"
                          >
                            {isSubmitting ? (
                              <span className="size-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                            ) : (
                              <>
                                <Send className="size-3.5" />
                                <span>{lang === "gu" ? "એડમિનને સંદેશ મોકલો" : "Submit Message to Admin"}</span>
                              </>
                            )}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. SPOTLIGHT INTERACTIVE APP TOUR */}
      <AnimatePresence>
        {tourActive && (
          <div className="fixed inset-0 z-50 pointer-events-auto">
            {/* Dark background with visual mask */}
            <div className="absolute inset-0 bg-black/65 backdrop-blur-[1px] transition-opacity" />

            {/* Custom Visual Spotlighter Element */}
            {spotlightStyle.top && (
              <motion.div
                layout
                className="absolute border-[3px] border-indigo-500 rounded-3xl bg-indigo-500/5 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] pointer-events-none z-40 transition-all duration-300"
                style={spotlightStyle}
              >
                {/* Pulsating Ring indicator */}
                <span className="absolute -inset-1 rounded-3xl border-2 border-indigo-400 animate-ping opacity-60" />
              </motion.div>
            )}

            {/* Tour Step Popover Card */}
            <div className="absolute inset-0 flex items-center justify-center p-4 z-50 pointer-events-none">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-sm bg-card border border-border rounded-3xl p-5 shadow-float pointer-events-auto flex flex-col space-y-4"
              >
                {/* Step indicator */}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-primary bg-primary-soft rounded-full px-2.5 py-1 font-bold">
                    <Sparkles className="size-3 animate-spin-slow text-indigo-500" />
                    <span>એપ ટૂર • Step {currentStep + 1}/{tourSteps.length}</span>
                  </span>
                  <button
                    onClick={handleSkipTour}
                    className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition"
                  >
                    સ્કીપ (Skip)
                  </button>
                </div>

                {/* Text Content */}
                <div className="space-y-1.5 text-left">
                  <h3 className="font-extrabold text-base text-foreground leading-tight">
                    {lang === "gu" ? tourSteps[currentStep].titleGu : tourSteps[currentStep].titleEn}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {lang === "gu" ? tourSteps[currentStep].descGu : tourSteps[currentStep].descEn}
                  </p>
                </div>

                {/* Navigation actions */}
                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <button
                    onClick={handlePrevStep}
                    disabled={currentStep === 0}
                    className="h-9 px-3 text-xs font-semibold rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-35 disabled:hover:bg-transparent transition flex items-center gap-1"
                  >
                    <ChevronLeft className="size-3.5" />
                    <span>પાછળ</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {tourSteps.map((_, idx) => (
                      <span 
                        key={idx}
                        className={`size-1.5 rounded-full transition-all duration-300 ${
                          idx === currentStep ? "bg-primary w-3.5" : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={handleNextStep}
                    className="h-9 px-3.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition flex items-center gap-1"
                  >
                    <span>{currentStep === tourSteps.length - 1 ? "પૂર્ણ કરો" : "આગળ"}</span>
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
