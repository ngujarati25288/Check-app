export const student = {
  name: "Aarav Patel",
  nameGu: "આરવ પટેલ",
  school: "Shri Saraswati Vidyalaya",
  standard: "10",
  village: "Anand",
  mobile: "+91 98765 43210",
  totalExams: 42,
  avgPercentage: 78,
  rank: 12,
  progress: 78,
  streak: 12,
  revisionCompleted: 64,
};

export const todayExam = {
  subject: "Science",
  subjectGu: "વિજ્ઞાન",
  chapter: "Chapter 6 — Life Processes",
  chapterGu: "પ્રકરણ ૬ — જીવન પ્રક્રિયાઓ",
  date: "Today, 2 June 2026",
  dateGu: "આજે, ૨ જૂન ૨૦૨૬",
  time: "5:00 PM",
  timeGu: "સાંજે ૫:૦૦",
  examiner: "Prof. Mehulbhai Shah",
  duration: "30 min",
  totalQuestions: 20,
};

export const pendingRevision = {
  count: 5,
  total: 40,
  mastered: 32,
};

export const parentSummary = {
  totalExams: 18,
  avgPercentage: 78,
  rank: 12,
  revisionCompleted: 64,
};

export const motivationalMessages = [
  "દરરોજ થોડું શીખો, મોટો ફેરફાર આવશે.",
  "તમારી મહેનત જ તમારી સફળતા છે.",
  "ભૂલોમાંથી શીખવું એ જ સાચું શિક્ષણ છે.",
  "સતત પ્રયત્ન જ સફળતાની ચાવી છે.",
  "આજનો અભ્યાસ આવતીકાલની સફળતા છે.",
  "નાનું પગલું પણ આગળ વધવા માટે પૂરતું છે.",
  "જે શીખે છે, તે જ જીતે છે.",
];

export const avatars = [
  { id: "scholar", emoji: "📚", labelGu: "વિદ્યાર્થી" },
  { id: "scientist", emoji: "👨‍🔬", labelGu: "વૈજ્ઞાનિક" },
  { id: "doctor", emoji: "👨‍⚕️", labelGu: "ડૉક્ટર" },
  { id: "teacher", emoji: "👨‍🏫", labelGu: "શિક્ષક" },
  { id: "astronaut", emoji: "👨‍🚀", labelGu: "અંતરિક્ષયાત્રી" },
  { id: "engineer", emoji: "👨‍💻", labelGu: "ઇજનેર" },
];

export const weeklyChallenge = {
  titleGu: "વિજ્ઞાનની ૩ પરીક્ષા પૂર્ણ કરો",
  title: "Complete 3 Science exams",
  progress: 2,
  total: 3,
  rewardGu: "+૫૦ પોઈન્ટ્સ • Science Master બેજ",
  reward: "+50 pts • Science Master badge",
  endsInGu: "આ અઠવાડિયે પૂર્ણ કરો",
  daysLeft: 3,
};

export const dailyProgress = {
  completedExams: 1,
  totalExams: 2,
  revisionDone: 7,
  revisionTotal: 12,
  percent: 80,
};

export function gradeFor(percent: number) {
  if (percent >= 90) return { grade: "A+", tone: "success" as const, message: "અદ્ભુત! તમે શ્રેષ્ઠ પ્રદર્શન કર્યું." };
  if (percent >= 80) return { grade: "A", tone: "success" as const, message: "ખૂબ સરસ! તમારો સતત સુધારો થઈ રહ્યો છે." };
  if (percent >= 70) return { grade: "B+", tone: "primary" as const, message: "સારું! થોડી મહેનત અને તમે ટોપ પર પહોંચી જશો." };
  if (percent >= 60) return { grade: "B", tone: "primary" as const, message: "આગળ વધો — પુનરાવર્તન કરો અને સુધારો." };
  if (percent >= 50) return { grade: "C", tone: "warning" as const, message: "ભૂલો જુઓ અને ફરીથી પ્રયત્ન કરો." };
  return { grade: "D", tone: "destructive" as const, message: "હાર ન માનો — દરરોજ થોડું શીખો." };
}

export const achievements = [
  { id: 1, icon: "🥇", title: "પ્રથમ ૧૦૦ ગુણ", desc: "First 100 marks earned", unlocked: true },
  { id: 2, icon: "🔥", title: "૭ દિવસ સતત પરીક્ષા", desc: "7-day exam streak", unlocked: true },
  { id: 3, icon: "📚", title: "૫૦ Revision Completed", desc: "50 revision questions mastered", unlocked: true },
  { id: 4, icon: "⭐", title: "Science Master", desc: "90%+ in Science exams", unlocked: true },
  { id: 5, icon: "🏆", title: "Top 10 Rank", desc: "Reach top 10 in leaderboard", unlocked: false },
  { id: 6, icon: "💎", title: "૩૦ દિવસ સ્ટ્રીક", desc: "30-day learning streak", unlocked: false },
  { id: 7, icon: "🎯", title: "Perfect Score", desc: "Score 100% in any exam", unlocked: false },
  { id: 8, icon: "🧠", title: "Math Wizard", desc: "90%+ in Mathematics", unlocked: false },
];

export const questions = [
  {
    id: 1,
    q: "Which organ is responsible for filtering blood in the human body?",
    qGu: "માનવ શરીરમાં લોહીને ગાળવાનું કાર્ય કયું અંગ કરે છે?",
    options: ["Heart", "Kidney", "Liver", "Lungs"],
    correct: 1,
    explanation: "Kidneys filter waste from blood and produce urine.",
  },
  {
    id: 2,
    q: "Photosynthesis occurs in which part of the plant cell?",
    qGu: "પ્રકાશસંશ્લેષણ વનસ્પતિ કોષના કયા ભાગમાં થાય છે?",
    options: ["Nucleus", "Mitochondria", "Chloroplast", "Ribosome"],
    correct: 2,
    explanation: "Chloroplasts contain chlorophyll, which captures light energy.",
  },
  {
    id: 3,
    q: "What is the chemical formula of glucose?",
    qGu: "ગ્લુકોઝનું રાસાયણિક સૂત્ર શું છે?",
    options: ["C6H12O6", "CO2", "H2O", "CH4"],
    correct: 0,
    explanation: "Glucose has 6 carbon, 12 hydrogen, and 6 oxygen atoms.",
  },
  {
    id: 4,
    q: "Which gas is released during respiration?",
    qGu: "શ્વસન દરમ્યાન કયો વાયુ બહાર નીકળે છે?",
    options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"],
    correct: 2,
    explanation: "Respiration releases carbon dioxide as a waste product.",
  },
  {
    id: 5,
    q: "The smallest unit of life is called?",
    qGu: "જીવનનો સૌથી નાનો એકમ શું કહેવાય છે?",
    options: ["Tissue", "Cell", "Organ", "Atom"],
    correct: 1,
    explanation: "The cell is the basic structural and functional unit of life.",
  },
];

export const mistakes = [
  {
    id: 1,
    q: "Which organ produces insulin in the human body?",
    studentAnswer: "Liver",
    correctAnswer: "Pancreas",
    explanation: "The pancreas secretes insulin to regulate blood sugar.",
    subject: "Science",
    subjectGu: "વિજ્ઞાન",
    chapter: "Life Processes",
    date: "30 May 2026",
    mastered: false,
  },
  {
    id: 2,
    q: "The capital of Gujarat is?",
    studentAnswer: "Ahmedabad",
    correctAnswer: "Gandhinagar",
    explanation: "Gandhinagar has been the capital of Gujarat since 1970.",
    subject: "Social Science",
    subjectGu: "સામાજિક વિજ્ઞાન",
    chapter: "States of India",
    date: "28 May 2026",
    mastered: true,
  },
  {
    id: 3,
    q: "Value of π up to two decimals?",
    studentAnswer: "3.41",
    correctAnswer: "3.14",
    explanation: "π ≈ 3.14159, rounded to two decimals is 3.14.",
    subject: "Mathematics",
    subjectGu: "ગણિત",
    chapter: "Circles",
    date: "26 May 2026",
    mastered: false,
  },
];

export const mistakesBySubject = [
  { subject: "Science", subjectGu: "વિજ્ઞાન", count: 12 },
  { subject: "Mathematics", subjectGu: "ગણિત", count: 8 },
  { subject: "Gujarati", subjectGu: "ગુજરાતી", count: 5 },
  { subject: "English", subjectGu: "અંગ્રેજી", count: 3 },
];

export const leaderboard = {
  daily: [
    { name: "Diya Shah", marks: 19, percent: 95, rank: 1 },
    { name: "Krish Modi", marks: 18, percent: 90, rank: 2 },
    { name: "Aarav Patel", marks: 17, percent: 85, rank: 3 },
    { name: "Meera Joshi", marks: 16, percent: 80, rank: 4 },
    { name: "Rohan Desai", marks: 15, percent: 75, rank: 5 },
    { name: "Sanya Trivedi", marks: 14, percent: 70, rank: 6 },
    { name: "Yash Bhatt", marks: 13, percent: 65, rank: 7 },
  ],
};

export const subjectPerformance = [
  { subject: "Science", percent: 86, color: "var(--primary)" },
  { subject: "Mathematics", percent: 72, color: "var(--success)" },
  { subject: "English", percent: 80, color: "var(--primary)" },
  { subject: "Social Science", percent: 68, color: "var(--success)" },
  { subject: "Gujarati", percent: 90, color: "var(--primary)" },
];

export const notifications = [
  {
    id: 1,
    type: "exam",
    title: "Today's Exam is Live",
    titleGu: "આજની પરીક્ષા તૈયાર છે",
    body: "Science — Life Processes • 20 questions",
    time: "5 min ago",
  },
  {
    id: 2,
    type: "revision",
    title: "Revision Reminder",
    titleGu: "પુનરાવર્તનની યાદ",
    body: "You have 8 pending revision questions.",
    time: "1 hour ago",
  },
  {
    id: 3,
    type: "achievement",
    title: "Achievement Unlocked!",
    titleGu: "સિદ્ધિ પ્રાપ્ત!",
    body: "7-day streak completed. Keep it up!",
    time: "Yesterday",
  },
];
