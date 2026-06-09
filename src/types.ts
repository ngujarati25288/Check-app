export type UserRole = "student" | "teacher" | "admin" | "super_admin";
export type UserStatus = "pending" | "approved" | "blocked" | "Approved" | "Pending" | "Blocked" | "Disabled";
export type QuestionDifficulty = "easy" | "medium" | "hard";
export type ExamStatus = "active" | "closed" | "scheduled" | "published" | "archived" | "cancelled";

export interface AdminAuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  timestamp: any;
  affectedRecord: string;
}

export interface DBUser {
  uid: string;
  studentId?: string;
  passwordHash?: string;
  fullName: string;
  mobile: string;
  school?: string;
  standard?: string;
  division?: string;
  village?: string;
  role: UserRole;
  status: UserStatus;
  streak?: number;
  fcmToken?: string;
  lastTokenUpdate?: string;
  createdAt: any; // Server timestamp or Date string
  updatedAt?: any;
}

export interface NotificationHistoryItem {
  id: string;
  studentId: string;
  type: string; // "exam" | "revision" | "achievement" | "rank" | "streak" | "inactive"
  title: string;
  message: string;
  sentAt: any;
  opened: boolean;
}

export interface Subject {
  subjectId: string;
  subjectName: string;
  standard: string;
  createdAt: any;
  status?: "active" | "disabled";
  description?: string;
  active?: boolean;
  updatedAt?: any;
}

export interface Chapter {
  chapterId: string;
  subjectId: string;
  chapterName: string;
  standard: string;
  status?: "active" | "archived";
  chapterNo?: number;
  description?: string;
  active?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface Question {
  questionId: string;
  subjectId: string;
  chapterId: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation?: string;
  difficulty: QuestionDifficulty;
  status?: "active" | "archived";
  illustrationUrl?: string; // Legacy/backward compatibility field for single image
  illustrationUrls?: string[]; // Supports multiple diagrams, image-based MCQs, scanned textbook images, and future OCR imports
  sourceType?: "Textbook" | "Navneet" | "TeacherCreated" | "AIGenerated" | "BoardPattern"; // Allow PDF upload or textbook tracing/OCR mapping
  sourceBook?: string; // Tracer back to textbook name
  sourceChapter?: string; // Chapter in textbook
  sourcePage?: number; // Page number in textbook
  createdBy?: string; // UID of admin who uploaded/approved
  verified?: boolean; // Human verifier status flag
  aiGenerated?: boolean; // Whether generated via future LLM scanning pipeline
  humanReviewed?: boolean; // Whether approved by standard teacher
  reviewScore?: number; // Teacher rating score out of 100 for AI training feedback

  // Custom metadata
  standard?: string;
  questionType?: "MCQ" | "TrueFalse" | "FillBlank" | "MatchFollowing" | "OneWordAnswer" | "ShortAnswer" | "LongAnswer" | "ImageBasedQuestion";
  options?: string[];
  marks?: number;
  active?: boolean;
  createdAt?: any;
  approvalStatus?: "draft" | "pending_review" | "approved" | "rejected"; // Question status pipeline
}

export interface ExamTemplate {
  templateId: string;
  title: string;
  description?: string;
  standard: string;
  subjectId: string;
  chapterIds: string[];
  questionsCount: number;
  difficultyMix: {
    easy: number; // e.g., 40 (meaning 40%)
    medium: number; // e.g., 40
    hard: number; // e.g., 20
  };
  createdBy: string;
  createdAt: any;
  updatedAt?: any;
}

export interface DailyExam {
  examId: string;
  subjectId: string;
  chapterId: string; // for compatibility: e.g. chapterIds[0]
  chapterIds?: string[]; // supports multi-chapter tests seamlessly!
  examinerId: string;
  examDate: string; // YYYY-MM-DD
  duration: number; // in minutes
  totalQuestions: number;
  status: ExamStatus;
  createdAt: any;
  publishAt?: any; // Timestamp / Date - when the exam should be visible to students
  startAt?: any; // Timestamp / Date - when the exam becomes active
  endAt?: any; // Timestamp / Date - when the exam closes
  expireAt?: any; // Timestamp / Date - when the paper collapses
  questionIds?: string[]; // Generation engine stores exact paper selected question IDs ONCE
  examTemplateId?: string; // Link to blueprint used
  recurringType?: "none" | "daily" | "weekly" | "monthly";
  recurringPattern?: string; // Day of week or interval indicator
  examType?: "Immediate" | "Scheduled" | "Recurring";
  examinerName?: string;
}

export interface QuestionWiseAnswer {
  questionId: string;
  selectedAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  marks?: number;
}

export interface ExamResult {
  resultId: string;
  studentId: string;
  examId: string;
  subject: string;
  chapter: string;
  examDate: string;
  examiner?: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  obtainedMarks: number;
  percentage: number;
  submittedAt: any;
  deviceId?: string;
  appVersion?: string;
  startTime?: string;
  submitTime?: string;
  attemptNumber?: number;
  questionWiseAnswers?: QuestionWiseAnswer[]; // Spaced-repetition detailed analysis payload
}

export interface StudentMistake {
  studentId: string;
  examId: string;
  questionId: string;
  subjectId: string;
  subjectName: string;
  chapterId: string;
  chapterName: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  selectedAnswer: string;
  correctAnswer: string;
  explanation?: string;
  examDate: string;
  revisionCount: number;
  correctRevisionCount: number;
  mastered: boolean;
  createdAt?: any;
  updatedAt?: any;
  latestExamDate?: string;
  lastWrongAttempt?: string;
  nextRevisionDate?: string; 
  lastRevisionDate?: string;
  lastRevisedAt?: any;
  consecutiveCorrectCount?: number;
  revisionLevel?: number;
  masteredAt?: any;
  illustrationUrl?: string; // Legacy/backward compatibility field for single image
  illustrationUrls?: string[]; // Supports multiple diagrams, image-based MCQs, scanned textbook images, and future OCR imports
  sourceType?: "Textbook" | "Navneet" | "TeacherCreated" | "AIGenerated"; // Tracing source type
  sourceName?: string; // Name of the source
  pageNumber?: number; // Page number of scanned textbook page

  // Legacy / Compatibility fields
  subject?: string;
  chapter?: string;
}

export interface RevisionAnalytics {
  studentId: string;
  totalRevisions: number;
  totalCorrectRevisions: number;
  revisionAccuracy: number;
  strongestSubject: string;
  weakestSubject: string;
  pendingRevisionCount: number;
  masteredQuestionsCount: number;
  updatedAt: string;
}

export interface RevisionProgress {
  studentId: string;
  questionId: string;
  revisionCount: number;
  correctRevisionCount: number;
  mastered: boolean;
  lastRevisedAt: any;
}

export interface Achievement {
  achievementId: string;
  studentId: string;
  title: string;
  description: string;
  unlockedAt: any;
}

export interface UserAchievement {
  userAchievementId: string;
  studentId: string;
  achievementId: string;
  category: string;
  badgeName: string;
  title: string;
  titleGu?: string;
  description: string;
  pointsAwarded: number;
  emoji: string;
  unlockedAt: any;
}

export interface StudentPoints {
  studentId: string;
  studentName?: string;
  totalPoints: number;
  examPoints: number;
  revisionPoints: number;
  masteryPoints: number;
  achievementPoints: number;
  updatedAt: any;
}

export interface Notification {
  id: string;
  studentId: string;
  type: "exam" | "revision" | "achievement";
  title: string;
  titleGu: string;
  body: string;
  time: string;
  createdAt: any;
}

export interface LeaderboardItem {
  studentId: string;
  studentName: string;
  totalMarks: number;
  percentage: number;
  rank: number;
  updatedAt: any;
}

export interface SuperAdminSettings {
  appName: string;
  appVersion: string;
  supportContact: string;
  maintenanceMode: boolean;
  maintenanceBanner: string;
  instantPushToggled: boolean;
  badgeThresholdGold: number;
  badgeThresholdSilver: number;
  badgeThresholdBronze: number;
  updatedAt: any;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  targetStandard: string; // "all" | "7" | "8" | "9" | "10" | "11" | "12"
  targetSchool: string; // "all" | specific school
  targetVillage: string; // "all" | specific village
  targetGroupList?: string[]; // array of studentId
  sentAt: any;
  senderName: string;
  readRate: number; // percentage
  readCount: number;
  totalCount: number;
}

export interface SystemBackup {
  id: string;
  backupName: string;
  timestamp: any;
  sizeMB: number;
  status: "Completed" | "Failed";
  triggeredBy: string;
}

export interface SecurityLog {
  id: string;
  eventType: "login_success" | "login_failed" | "privilege_escalation" | "api_access" | "config_change";
  userId: string;
  userName: string;
  userRole: UserRole;
  ipAddress?: string;
  details: string;
  timestamp?: any;
}

// ----------------------------------------------------
// PHASE 14: ADVANCED EDUCATIONAL ANALYTICS ENGINE TYPES
// ----------------------------------------------------

export interface StudentAnalytics {
  id: string; // studentId
  studentId: string;
  studentName: string;
  school: string;
  village: string;
  standard: string;
  
  totalExams: number;
  averageScore: number;
  bestSubject: string;
  weakestSubject: string;
  revisionAccuracy: number;
  masteredQuestions: number;
  pendingRevisions: number;
  achievementCount: number;
  currentRank: number;
  rankTrend: "up" | "down" | "stable";
  learningStreak: number;
  
  performanceScore: number; // calculated index: e.g. 0-100 combining avg score, streak and mastery
  riskLevel: "low" | "medium" | "high";
  calculatedAt: string;
}

export interface SubjectAnalytics {
  id: string; // subjectId
  subjectId: string;
  subjectName: string;
  standard: string;
  averageScore: number;
  mostDifficultChapter: string;
  mostDifficultChapterName: string;
  mostFailedQuestionsCount: number;
  revisionSuccessRate: number;
  masteryRate: number;
  studentParticipationPercent: number;
  calculatedAt: string;
}

export interface ChapterAnalytics {
  id: string; // chapterId
  chapterId: string;
  chapterName: string;
  subjectId: string;
  subjectName: string;
  standard: string;
  totalAttempts: number;
  averageMarks: number;
  difficultyScore: number; // 0-100 (higher = harder)
  revisionSuccessPercent: number;
  masteryPercent: number;
  mostCommonMistakes: string[]; // brief questions/concepts
  riskLevel: "low" | "medium" | "high";
  calculatedAt: string;
}

export interface QuestionAnalytics {
  id: string; // questionId
  questionId: string;
  questionText: string;
  subjectName: string;
  chapterName: string;
  timesAsked: number;
  correctPercent: number;
  wrongPercent: number;
  skipPercent: number;
  difficultyScore: number; // calculated from fail rate
  revisionSuccessPercent: number;
  category: "difficult" | "confusing" | "improved" | "normal";
  calculatedAt: string;
}

export interface SchoolAnalytics {
  id: string; // schoolName slug or ID
  schoolName: string;
  totalStudents: number;
  averageScore: number;
  participationPercent: number;
  revisionCompletionPercent: number;
  achievementCount: number;
  leaderboardPosition: number;
  calculatedAt: string;
}

export interface VillageAnalytics {
  id: string; // villageName slug or ID
  villageName: string;
  totalStudents: number;
  averagePerformance: number;
  participationRate: number;
  masteryRate: number;
  topStudents: { studentId: string; studentName: string; score: number }[];
  villageRank: number;
  calculatedAt: string;
}

export interface StandardAnalytics {
  id: string; // standard e.g. "10"
  standard: string;
  averageMarks: number;
  subjectPerformance: { subjectName: string; avgScore: number }[];
  revisionSuccessRate: number;
  achievementDistribution: { badgeName: string; count: number }[];
  leaderboardTrends: { date: string; highestScore: number }[];
  calculatedAt: string;
}

export interface LearningTrendItem {
  date: string;
  scoreTrend: number; // Average obtained percentage on this day
  revisionTrend: number; // Number of revisions performed
  participationTrend: number; // Number of unique students participating
  achievementTrend: number; // Number of achievements unlocked
}

export interface LearningTrends {
  id: string; // "global" or standard-specific
  trends7d: LearningTrendItem[];
  trends30d: LearningTrendItem[];
  trends9d: LearningTrendItem[];
  calculatedAt: string;
}

export interface AnalyticsReport {
  id: string;
  reportType: "daily" | "weekly" | "monthly";
  title: string;
  summary: string;
  totalStudentsActive: number;
  globalAvgScore: number;
  topPerformingSchool: string;
  topPerformingVillage: string;
  weakestSubject: string;
  highRiskChaptersCount: number;
  createdAt: string;
  jsonPayload: string; // raw serialized breakdown for deep querying
}

export interface School {
  schoolId: string;
  schoolName: string;
  village: string;
  createdAt: string;
}

export interface Village {
  villageId: string;
  villageName: string;
  createdAt: string;
}

export interface SchoolRequest {
  requestId: string;
  schoolName: string;
  village: string;
  requestedBy: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface VillageRequest {
  requestId: string;
  villageName: string;
  requestedBy: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}



