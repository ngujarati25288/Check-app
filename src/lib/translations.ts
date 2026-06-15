// Centralized Translation Engine for Multilingual (Gujarati, English, Hindi) Support
// Prepared for future languages without requiring major code changes later.

export type SupportedLanguage = "Gujarati" | "English" | "Hindi";

export interface TranslationDictionary {
  [key: string]: {
    Gujarati: string;
    English: string;
    Hindi: string;
  };
}

export const translations: TranslationDictionary = {
  // Navigation & Menu
  "nav_home": {
    Gujarati: "મુખ્ય",
    English: "Home",
    Hindi: "मुख्य"
  },
  "nav_exam": {
    Gujarati: "પરીક્ષા",
    English: "Exams",
    Hindi: "परीक्षा"
  },
  "nav_revision": {
    Gujarati: "પુનરાવર્તન",
    English: "Revision",
    Hindi: "पुनरावृत्ति"
  },
  "nav_leaderboard": {
    Gujarati: "ક્રમ",
    English: "Leaderboard",
    Hindi: "रैंकिंग"
  },
  "nav_profile": {
    Gujarati: "પ્રોફાઇલ",
    English: "Profile",
    Hindi: "प्रोफाइल"
  },
  "nav_admin": {
    Gujarati: "સંચાલન",
    English: "Admin Panel",
    Hindi: "प्रशासनिक"
  },
  "nav_superadmin": {
    Gujarati: "નિયંત્રણ",
    English: "Control Panel",
    Hindi: "नियंत्रण कक्ष"
  },

  // Common UI Buttons / Actions
  "btn_submit": {
    Gujarati: "સબમિટ કરો",
    English: "Submit",
    Hindi: "जमा करें"
  },
  "btn_back": {
    Gujarati: "પાછા જાઓ",
    English: "Back",
    Hindi: "पीछे जाएं"
  },
  "btn_cancel": {
    Gujarati: "રદ કરો",
    English: "Cancel",
    Hindi: "रद्द करें"
  },
  "btn_close": {
    Gujarati: "બંધ કરો",
    English: "Close",
    Hindi: "बंद करें"
  },
  "btn_save": {
    Gujarati: "સાચવો",
    English: "Save",
    Hindi: "सुरक्षित करें"
  },
  "btn_loading": {
    Gujarati: "લોડ થઈ રહ્યું છે...",
    English: "Loading...",
    Hindi: "लोड हो रहा है..."
  },
  "btn_register": {
    Gujarati: "રજીસ્ટ્રેશન કરો",
    English: "Register",
    Hindi: "पंजीकरण करें"
  },
  "btn_signin": {
    Gujarati: "પ્રવેશ કરો",
    English: "Sign In",
    Hindi: "साइन इन"
  },
  "btn_logout": {
    Gujarati: "લોગઆઉટ",
    English: "Log Out",
    Hindi: "लॉगआउट"
  },

  // Dashboard & Quick Stat Cards
  "dash_title": {
    Gujarati: "દૈનિક શિક્ષણ પરીક્ષા",
    English: "Daily Learning Exam",
    Hindi: "दैनिक शिक्षा परीक्षा"
  },
  "dash_subtitle": {
    Gujarati: "તમારા શિક્ષણ સ્તરને શ્રેષ્ઠ બનાવો",
    English: "Optimize Your Learning Journey",
    Hindi: "अपनी सीखने की यात्रा को बेहतर बनाएं"
  },
  "card_results": {
    Gujarati: "પરિણામ",
    English: "My Results",
    Hindi: "परिणाम"
  },
  "card_mistakes": {
    Gujarati: "મારી ભૂલો",
    English: "My Mistakes",
    Hindi: "मेरी गलतियाँ"
  },
  "card_achievements": {
    Gujarati: "સિદ્ધિઓ",
    English: "Achievements",
    Hindi: "उपलब्धियां"
  },
  "card_progress": {
    Gujarati: "પ્રગતિ",
    English: "Success Progress",
    Hindi: "प्रगति"
  },
  "stat_streak": {
    Gujarati: "લાગાતાર દિવસો (સ્ટ્રીક)",
    English: "Learning Streak",
    Hindi: "सक्रियता लकीर"
  },
  "stat_rank": {
    Gujarati: "તમારો ક્રમ (રેન્ક)",
    English: "Your Current Rank",
    Hindi: "आपकी रैंक"
  },
  "stat_all_time_points": {
    Gujarati: "કુલ પોઇન્ટ્સ",
    English: "Total Points",
    Hindi: "कुल अंक"
  },

  // Active Exam Widget on Dashboard
  "exam_today_title": {
    Gujarati: "આજની દૈનિક કસોટી",
    English: "Today's Active Exam",
    Hindi: "आज की सक्रिय परीक्षा"
  },
  "exam_no_active": {
    Gujarati: "આજે કોઈ પરીક્ષા સુનિશ્ચિત નથી.",
    English: "No exams scheduled for you today.",
    Hindi: "आज आपके लिए कोई परीक्षा तय नहीं है।"
  },
  "exam_limit_msg": {
    Gujarati: "તમે આ ટેસ્ટ સબમિટ કરી દીધો છે! પરિણામ વિભાગમાં સ્કોર તપાસો.",
    English: "You have already completed this test! Check your score in results.",
    Hindi: "आप पहले ही यह परीक्षा पूरी कर चुके हैं! परिणाम देखें।"
  },
  "exam_start": {
    Gujarati: "પરીક્ષા શરૂ કરો",
    English: "Start Exam NOW",
    Hindi: "परीक्षा शुरू करें"
  },
  "exam_time_limit": {
    Gujarati: "સમય મર્યાદા",
    English: "Time Limit",
    Hindi: "समय सीमा"
  },
  "exam_mins": {
    Gujarati: "મિનિટ",
    English: "mins",
    Hindi: "मिनट"
  },
  "exam_questions": {
    Gujarati: "પ્રશ્નો",
    English: "questions",
    Hindi: "प्रश्न"
  },

  // Revision & Spaced Repetition Box
  "rev_box_title": {
    Gujarati: "ભૂલ સુધારણા અને રિવિઝન",
    English: "Spaced Repetition & Revision",
    Hindi: "त्रुटि सुधार और पुनरावृत्ति"
  },
  "rev_box_desc": {
    Gujarati: "ભૂલોમાંથી શીખો! તમારી ભૂલોનું પુનરાવર્તન કરી પ્રશ્નમાં નિપુણતા મેળવો.",
    English: "Learn from mistakes! Revisit wrong answers to achieve academic mastery.",
    Hindi: "गलतियों से सीखें! अकादमिक महारत हासिल करने के लिए गलत उत्तरों को दोहराएं।"
  },
  "rev_count_desc": {
    Gujarati: "પુનરાવર્તન માટે બાકી પ્રશ્નો",
    English: "Pending Revision Questions",
    Hindi: "समीक्षा के लिए लंबित प्रश्न"
  },
  "rev_mastered_desc": {
    Gujarati: "નિપુણતા મેળવેલ પ્રશ્નો",
    English: "Mastered Questions",
    Hindi: "हल किए गए प्रश्न (मास्टर्ड)"
  },
  "rev_start": {
    Gujarati: "પુનરાવર્તન શરૂ કરો",
    English: "Start Revision Session",
    Hindi: "रिवीजन शुरू करें"
  },

  // Notifications & Announcements Widget
  "announcements": {
    Gujarati: "મહત્વની જાહેરાત",
    English: "Official Announcements",
    Hindi: "महत्वपूर्ण घोषणाएं"
  },
  "no_announcements": {
    Gujarati: "કોઈ તાજેતરની જાહેરાતો નથી.",
    English: "No recent announcements.",
    Hindi: "कोई हालिया घोषणा नहीं है।"
  },

  // Exam Screen Layout
  "exam_screen_title": {
    Gujarati: "આજની દૈનિક પરીક્ષા",
    English: "Daily Board Test Action",
    Hindi: "आज की दैनिक परीक्षा"
  },
  "exam_guidelines": {
    Gujarati: "પરીક્ષાની માર્ગદર્શિકા",
    English: "Exam Rules & Instructions",
    Hindi: "परीक्षा दिशानिर्देश"
  },
  "exam_guideline_1": {
    Gujarati: "સિસ્ટમ આ પરીક્ષા ઓટોમેટિક તપાસશે, તેથી યોગ્ય વિકલ્પ પસંદ કરો.",
    English: "The system grades items automatically. Select the best choice.",
    Hindi: "सिस्टम स्वचालित रूप से जांच करेगा। सही विकल्प चुनें।"
  },
  "exam_guideline_2": {
    Gujarati: "એકવાર સબમિટ કર્યા પછી તેને ફરી બદલી શકાશે નહીં.",
    English: "Once submitted, your responses are final and cannot be modified.",
    Hindi: "एक बार सबमिट करने के बाद इसे बदला नहीं जा सकता।"
  },
  "exam_guideline_3": {
    Gujarati: "સમય પૂરો થતા જ ટેસ્ટ આપમેળે જમા થઈ જશે.",
    English: "The exam auto-submits once the timer runs down completely.",
    Hindi: "समय समाप्त होते ही टेस्ट अपने आप जमा हो जाएगा।"
  },
  "exam_timer_remaining": {
    Gujarati: "બાકી સમય",
    English: "Time Remaining",
    Hindi: "बचा हुआ समय"
  },
  "exam_warning": {
    Gujarati: "તમે બધા પ્રશ્નોના ઉત્તર આપ્યા નથી! શું તમે ખરેખર સબમિટ કરવા માંગો છો?",
    English: "You haven't answered all questions. Are you sure you want to submit?",
    Hindi: "आपने सभी प्रश्नों के उत्तर नहीं दिए हैं! क्या आप सबमिट करना चाहते हैं?"
  },

  // Revision Screen
  "revision_engine": {
    Gujarati: "દૈનિક પુનરાવર્તન અને માસ્ટરી એન્જિન",
    English: "Daily Revision & Mastery Engine",
    Hindi: "दैनिक पुनरावृत्ति और महारत इंजन"
  },
  "revision_not_found": {
    Gujarati: "રિવિઝન માટે કોઈ પ્રશ્ન નથી! ખૂબ સરસ, તમારી પાસે કોઈ બાકી ભૂલો નથી.",
    English: "Hooray! No pending revision questions left for today.",
    Hindi: "रिवीजन के लिए कोई प्रश्न नहीं है! बहुत बढ़िया, आपकी कोई गलती लंबित नहीं है।"
  },
  "revision_congrats": {
    Gujarati: "અભિનંદન! તમે આજનું દૈનિક પુનરાવર્તન સત્ર પૂરું કર્યું છે.",
    English: "Congratulations! You have completed your revision session.",
    Hindi: "बधाई हो! आपने आज का रिवीजन सत्र पूरा कर लिया है।"
  },
  "explanation_title": {
    Gujarati: "સમજૂતી અને ઉત્તર વિશ્લેષણ",
    English: "Explanation & Performance Analysis",
    Hindi: "स्पष्टीकरण और उत्तर विश्लेषण"
  },

  // Achievements Screen
  "achieve_title": {
    Gujarati: "તમારી સુવર્ણ સિદ્ધિઓ",
    English: "Your Achievements & Badges",
    Hindi: "आपकी उपलब्धियां और पदक"
  },
  "achieve_empty": {
    Gujarati: "હજી સુધી કોઈ પદક અનલોક થયા નથી. ભણવાનું ચાલુ રાખો અને પોઈન્ટ્સ મેળવો!",
    English: "No badges unlocked yet. Keep studying to collect achievement marks!",
    Hindi: "अभी तक कोई पदक अनलॉक नहीं हुआ है। सीखते रहें और अंक जमा करें!"
  },
  "achieve_points_label": {
    Gujarati: "પોઇન્ટ્સ મળ્યા",
    English: "Points Awarded",
    Hindi: "अंक मिले"
  },

  // Leaderboard Screen
  "rank_title": {
    Gujarati: "તાજેતરનું લીડરબોર્ડ",
    English: "Dynamic Rank Leaderboard",
    Hindi: "नवीनतम लीडरबोर्ड"
  },
  "rank_all_time": {
    Gujarati: "સર્વકાલીન ક્રમ",
    English: "All Time Board",
    Hindi: "सर्वकालिक रैंकिंग"
  },
  "rank_weekly": {
    Gujarati: "સાપ્તાહિક ક્રમ",
    English: "Weekly Board",
    Hindi: "साप्ताहिक रैंकिंग"
  },
  "rank_monthly": {
    Gujarati: "માસિક ક્રમ",
    English: "Monthly Board",
    Hindi: "मासिक रैंकिंग"
  },
  "rank_student_name": {
    Gujarati: "વિદ્યાર્થી",
    English: "Student Name",
    Hindi: "छात्र"
  },
  "rank_points": {
    Gujarati: "પોઇન્ટ્સ",
    English: "Points",
    Hindi: "अंक"
  },
  "rank_your_position": {
    Gujarati: "લીડરબોર્ડમાં તમારું સ્થાન",
    English: "Your Leaderboard Position",
    Hindi: "लीडरबोर्ड में आपका स्थान"
  },

  // Login & Registration
  "login_title": {
    Gujarati: "દૈનિક શિક્ષણ પરીક્ષા",
    English: "Daily Learning Exam",
    Hindi: "दैनिक शिक्षा परीक्षा"
  },
  "login_welcome": {
    Gujarati: "વિદ્યાર્થી લોગઇન",
    English: "Student Login Portal",
    Hindi: "छात्र लॉगिन पोर्टल"
  },
  "login_student_id": {
    Gujarati: "વિદ્યાર્થી ID *",
    English: "Student ID *",
    Hindi: "विद्यार्थी आईडी *"
  },
  "login_password": {
    Gujarati: "સિક્યુરિટી પાસવર્ડ *",
    English: "Security Password *",
    Hindi: "सुरक्षा पासवर्ड *"
  },
  "forgot_id": {
    Gujarati: "વિદ્યાર્થી ID ભૂલી ગયા છો?",
    English: "Forgot Student ID?",
    Hindi: "विद्यार्थी आईडी भूल गए?"
  },
  "no_account_yet": {
    Gujarati: "નવું એડમિશન છે? અહીં નોંધણી કરો",
    English: "New Admission? Register here",
    Hindi: "नया प्रवेश? यहाँ पंजीकरण करें"
  },
  "register_title_main": {
    Gujarati: "વિદ્યાર્થી રજીસ્ટ્રેશન",
    English: "New Student Registration",
    Hindi: "छात्र पंजीकरण"
  },
  "label_medium": {
    Gujarati: "પરીક્ષાનું માધ્યમ (Medium) *",
    English: "Learning Medium (Language) *",
    Hindi: "शिक्षा का माध्यम *"
  },
  "medium_gujarati": {
    Gujarati: "ગુજરાતી માધ્યમ (Gujarati Medium)",
    English: "Gujarati Medium",
    Hindi: "गुजराती माध्यम"
  },
  "medium_english": {
    Gujarati: "અંગ્રેજી માધ્યમ (English Medium)",
    English: "English Medium",
    Hindi: "अंग्रेजी माध्यम"
  },
  "medium_hindi": {
    Gujarati: "હિન્દી માધ્યમ (Hindi Medium)",
    English: "Hindi Medium",
    Hindi: "हिंदी माध्यम"
  },

  // Results screen
  "results_history": {
    Gujarati: "આજે આપેલ પરીક્ષાઓનું પરિણામ",
    English: "Exam Results History",
    Hindi: "परीक्षा परिणाम इतिहास"
  },
  "result_percentage": {
    Gujarati: "ટકાવારી",
    English: "Percentage",
    Hindi: "प्रतिशत"
  },
  "result_obtained": {
    Gujarati: "મેળવેલ માર્ક્સ",
    English: "Obtained Marks",
    Hindi: "प्राप्त अंक"
  },
  "result_answered": {
    Gujarati: "આપેલ જવાબો",
    English: "Correct Answers",
    Hindi: "सही उत्तर"
  },
  "result_wrong": {
    Gujarati: "ખોટા જવાબો",
    English: "Wrong Answers",
    Hindi: "गलत उत्तर"
  },
  "result_subject": {
    Gujarati: "વિષય",
    English: "Subject",
    Hindi: "विषय"
  },

  // Mistakes screen
  "mistakes_title": {
    Gujarati: "મારી ભૂલોની યાદી",
    English: "My Logged Mistakes Dashboard",
    Hindi: "मेरी गलतियों की सूची"
  },
  "mistakes_desc": {
    Gujarati: "સ્કૂલ બોર્ડ પરીક્ષા પહેલા તમારી બધી ભૂલો અહીં સુધારી લો.",
    English: "Correct all logged failures before school board exams.",
    Hindi: "स्कूल बोर्ड परीक्षा से पहले अपनी सभी गलतियों को सुधारें।"
  },
  "mistakes_empty": {
    Gujarati: "શાબાશ! તમે ટેસ્ટમાં બિલકુલ ભૂલો કરી નથી.",
    English: "Outstanding! You have no logged mistakes in your history.",
    Hindi: "शानदार! इतिहास में आपकी कोई त्रुटि दर्ज नहीं है।"
  },

  // Validation messages
  "val_name_empty": {
    Gujarati: "કૃપા કરીને પૂરું નામ લખો.",
    English: "Please write your full name.",
    Hindi: "कृपया अपना पूरा नाम लिखें।"
  },
  "val_name_letters": {
    Gujarati: "નામમાં ફક્ત ગુજરાતી/અંગ્રેજી અક્ષરો અને સ્પેસ જ માન્ય છે.",
    English: "Only alphabets and spaces are permitted for names.",
    Hindi: "नाम में केवल अक्षर और स्पेस ही मान्य हैं।"
  },
  "val_mobile_invalid": {
    Gujarati: "કૃપા કરીને સાચો ૧૦ આંકડાનો મોબાઈલ નંબર લખો.",
    English: "Please enter a valid 10-digit mobile number.",
    Hindi: "कृपया एक मान्य 10 अंकों का मोबाइल नंबर दर्ज करें।"
  },
  "val_password_short": {
    Gujarati: "પાસવર્ડ ઓછામાં ઓછો ૬ અક્ષરનો હોવો જોઈએ.",
    English: "Security password must be at least 6 characters.",
    Hindi: "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।"
  },
  "val_school_empty": {
    Gujarati: "કૃપા કરીને યાદીમાંથી તમારી શાળા પસંદ કરો.",
    English: "Please select your school from the list.",
    Hindi: "कृपया सूची से अपने स्कूल का चयन करें।"
  },
  "val_village_empty": {
    Gujarati: "કૃપા કરીને તમારું ગામ પસંદ કરો.",
    English: "Please select your village from the list.",
    Hindi: "कृपया सूची से अपने गाँव का चयन करें।"
  },
  "val_medium_empty": {
    Gujarati: "કૃપા કરીને પરીક્ષા આપવાનું માધ્યમ પસંદ કરો.",
    English: "Please select your learning medium.",
    Hindi: "कृपया अपना माध्यम चुनें।"
  },

  // Dashboard & Navigation translations
  "dash_greeting_student": {
    Gujarati: "નમસ્તે, વિદ્યાર્થી 👋",
    English: "Hello, Student 👋",
    Hindi: "नमस्ते, छात्र 👋"
  },
  "dash_today_progress": {
    Gujarati: "આજની પ્રગતિ",
    English: "Today's Progress",
    Hindi: "आज की प्रगति"
  },
  "dash_learning_progress": {
    Gujarati: "આજનો ક્ષેત્ર વિકાસ",
    English: "Today's learning progress",
    Hindi: "आज की सीखने की प्रगति"
  },
  "dash_exams": {
    Gujarati: "પરીક્ષા",
    English: "Exams",
    Hindi: "परीक्षा"
  },
  "dash_revision": {
    Gujarati: "પુનરાવર્તન",
    English: "Revision",
    Hindi: "पुनरावृत्ति"
  },
  "dash_streak": {
    Gujarati: "સ્ટ્રીક",
    English: "Streak",
    Hindi: "सक्रियता"
  },
  "dash_leaderboard_title": {
    Gujarati: "તમારો રેન્ક (Leaderboard Position)",
    English: "Your Leaderboard Position",
    Hindi: "आपकी रैंकिंग स्थिति"
  },
  "dash_rank_prefix": {
    Gujarati: "ક્રમ",
    English: "Rank",
    Hindi: "रैंक"
  },
  "dash_all_time": {
    Gujarati: "All-Time",
    English: "All-Time",
    Hindi: "All-Time"
  },
  "dash_rank_up": {
    Gujarati: "▲ સુધારો",
    English: "▲ Up",
    Hindi: "▲ सुधार"
  },
  "dash_rank_down": {
    Gujarati: "▼ ઘટાડો",
    English: "▼ Down",
    Hindi: "▼ गिरावट"
  },
  "dash_rank_flat": {
    Gujarati: "● સમકક્ષ",
    English: "● Equal",
    Hindi: "● समान"
  },
  "dash_prev_rank": {
    Gujarati: "અગાઉનો ક્રમ",
    English: "Previous Rank",
    Hindi: "पिछली रैंक"
  },
  "dash_scheduled_exam": {
    Gujarati: "આયોજિત પરીક્ષા (Scheduled)",
    English: "Scheduled Exam",
    Hindi: "निर्धारित परीक्षा"
  },
  "dash_today_exam_title": {
    Gujarati: "આજની પરીક્ષા",
    English: "Today's Exam",
    Hindi: "आज की परीक्षा"
  },
  "dash_start_time_left": {
    Gujarati: "⌛ શરૂ થવા આડેનો સમય:",
    English: "⌛ Starts in:",
    Hindi: "⌛ शुरू होने में समय:"
  },
  "dash_hours": {
    Gujarati: "કલાક",
    English: "hours",
    Hindi: "घंटे"
  },
  "dash_minutes": {
    Gujarati: "મિનિટ",
    English: "minutes",
    Hindi: "मिनट"
  },
  "dash_seconds": {
    Gujarati: "સેકન્ડ",
    English: "seconds",
    Hindi: "सेकंड"
  },
  "dash_start_exam_now": {
    Gujarati: "પરીક્ષા શરૂ કરો",
    English: "Start Exam NOW",
    Hindi: "परीक्षा शुरू करें"
  },
  "dash_no_exam_today": {
    Gujarati: "આજે કોઈ પરીક્ષા ઉપલબ્ધ નથી",
    English: "No exam available today",
    Hindi: "आज कोई परीक्षा उपलब्ध नहीं है"
  },
  "dash_weekly_challenge": {
    Gujarati: "આ અઠવાડિયાનો ચેલેન્જ",
    English: "Weekly Challenge",
    Hindi: "साप्ताहिक चुनौती"
  },
  "dash_days_left": {
    Gujarati: "દિવસ બાકી",
    English: "days left",
    Hindi: "दिन बचे"
  },
  "dash_quick_action_title": {
    Gujarati: "મુખ્ય શોર્ટકટ લિંક્સ",
    English: "Quick Shortcut Links",
    Hindi: "त्वरित लिंक"
  },
  "dash_nav_result": {
    Gujarati: "પરિણામ",
    English: "Result",
    Hindi: "परिणाम"
  },
  "dash_nav_mistakes": {
    Gujarati: "મારી ભૂલો",
    English: "My Mistakes",
    Hindi: "मेरी गलतियां"
  },
  "dash_nav_achievements": {
    Gujarati: "સિદ્ધિઓ",
    English: "Achievements",
    Hindi: "उपलब्धियां"
  },
  "dash_nav_progress": {
    Gujarati: "પ્રગતિ",
    English: "Progress",
    Hindi: "प्रगति"
  },
  "dash_nav_profile": {
    Gujarati: "મારી પ્રોફાઇલ",
    English: "My Profile",
    Hindi: "मेरी प्रोफाइल"
  },
  "dash_nav_admin": {
    Gujarati: "સ્ટાન્ડર્ડ એડમિન",
    English: "Standard Admin",
    Hindi: "मानक एडमिन"
  },
  "update_available": {
    Gujarati: "નવું અપડેટ ઉપલબ્ધ છે",
    English: "New Update Available",
    Hindi: "नया अपडेट उपलब्ध है"
  },
  "current_version": {
    Gujarati: "ચાલુ વર્ઝન",
    English: "Current Version",
    Hindi: "वर्तमान संस्करण"
  },
  "latest_version": {
    Gujarati: "નવીનતમ વર્ઝન",
    English: "Latest Version",
    Hindi: "नवीनतम संस्करण"
  },
  "release_notes": {
    Gujarati: "નવી સુવિધાઓ (નોંધો)",
    English: "Release Notes",
    Hindi: "रिलीज़ नोट्स"
  },
  "update_now": {
    Gujarati: "હમણાં અપડેટ કરો",
    English: "Update Now",
    Hindi: "अभी अपडेट करें"
  },
  "later": {
    Gujarati: "પછીથી",
    English: "Later",
    Hindi: "बाद में"
  }
};

/**
 * Hook or translation resolver function.
 * Uses context user object to determine translation language.
 * Default fallback is "Gujarati" as requested.
 */
export function translate(key: string, userMedium?: string | null): string {
  const dict = translations[key];
  if (!dict) {
    return key; // return key as fallback if not verified
  }

  // Treat missing or undefined medium as "Gujarati" (Backward Compatibility)
  let lang: SupportedLanguage = "Gujarati";
  if (userMedium === "English") {
    lang = "English";
  } else if (userMedium === "Hindi") {
    lang = "Hindi";
  }

  return dict[lang] || dict["Gujarati"];
}

// Global short alias helper
export const t = translate;
