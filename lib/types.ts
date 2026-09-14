// Types for subject data from API
export interface SubjectData {
  id: string
  name: string
  code: string
  description: string
  totalQuestions: number // real published bank size
  catalogueQuestions?: number // planned size from lib/subjects.ts
  icon: string
  priceAud: number
  isPurchased: boolean
  hasPrinting: boolean
  hasAiInsights: boolean
  licenseType?: string
  progress: number
  accuracy: number
  averageScore: number
  questionsAttempted: number
  correctAnswers: number
  examsCompleted: number
  lastAttempt?: Date
}

export interface QuestionData {
  id: string
  topic: string
  difficulty: "easy" | "medium" | "hard"
  questionText: string
  options: string[]
  correctIndex: number
  explanation: string
  /**
   * Answers are shuffled per exam. optionOrder[shownIndex] is the option's index
   * in the question bank, so saved choices can be matched back to the bank.
   */
  optionOrder?: number[]
}

export interface ExamHistoryItem {
  id: string
  subjectId: string
  subjectName: string
  score: number
  totalQuestions: number
  correctAnswers: number
  timeSpent: number
  passed: boolean
  date: string
  completedAt: Date
}

export interface WeakPointData {
  id: string
  topic: string
  subjectId: string
  subjectName: string
  accuracy: number
  questionsAttempted: number
  recommendation: string
  priority: "high" | "medium" | "low"
}

export interface UserStats {
  averageScore: number
  totalExams: number
  passedExams: number
  passRate: number
  questionsAnswered: number
  correctAnswers: number
  studyStreak: number
  totalStudyHours: number
}
