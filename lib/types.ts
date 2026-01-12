// Types for subject data from API
export interface SubjectData {
  id: string
  name: string
  code: string
  description: string
  totalQuestions: number
  icon: string
  priceAud: number
  isPurchased: boolean
  hasPrinting: boolean
  hasAiInsights: boolean
  progress: number
  averageScore: number
  questionsAttempted: number
  examsCompleted: number
  lastAttempt?: Date
}

export interface QuestionData {
  id: string
  topic: string
  difficulty: "easy" | "medium" | "hard"
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
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
