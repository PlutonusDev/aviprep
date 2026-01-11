import { IconType } from "react-icons";
import { FaCloud, FaScaleBalanced, FaWind } from "react-icons/fa6";

export interface TheorySubject {
    id: string;
    name: string;
    code: string;
    description: string;
    totalQuestions: number;
    questionsAttempted: number;
    averageScore: number;
    lastAttempt: string | null;
    isPurchased: boolean;
    progress: number;
    icon: IconType
}

export interface ExamAttempt {
    id: string;
    subjectId: string;
    subjectName: string;
    date: string;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    timeSpent: number;
    passScore: number;
    passed: boolean;
}

export interface WeakPoint {
    id: string;
    topic: string;
    subjectName: string;
    reference: string;
    accuracy: number;
    questionsAttempted: number;
    reccomendation: string;
    priority: "high" | "medium" | "low";
}

export interface MultipleChoiceQuestion {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    topic: string;
    difficulty: "easy" | "medium" | "hard";
}

export interface InputQuestion {
    id: string;
    question: string;
    correctAnswer: number;
    explanation: string;
    topic: string;
    difficulty: "easy" | "medium" | "hard";
}

export const theorySubjects: TheorySubject[] = [
    {
        id: "aero",
        name: "Aerodynamics",
        code: "CADA",
        description: "Principles of flight, lift, drag, and aircraft performance",
        totalQuestions: 245,
        questionsAttempted: 0,
        averageScore: 87,
        lastAttempt: "2026-01-08",
        isPurchased: true,
        progress: 73,
        icon: FaWind
    },
    {
        id: "met",
        name: "Meteorology",
        code: "CMET",
        description: "Weather systems, forecasting, and aviation meteorology",
        totalQuestions: 320,
        questionsAttempted: 85,
        averageScore: 85,
        lastAttempt: "2026-01-10",
        isPurchased: false,
        progress: 91,
        icon: FaCloud
    },
    {
        id: "law",
        name: "Air Law",
        code: "CLWA",
        description: "CASA regulations, airspace, and operational requirements",
        totalQuestions: 195,
        questionsAttempted: 195,
        averageScore: 92,
        lastAttempt: "2026-01-09",
        isPurchased: true,
        progress: 100,
        icon: FaScaleBalanced
    }
]

export const examHistory: ExamAttempt[] = [
    {
        id: "1",
        subjectId: "met",
        subjectName: "Meteorology",
        date: "2026-01-10",
        score: 88,
        totalQuestions: 40,
        correctAnswers: 35,
        timeSpent: 45,
        passed: true,
        passScore: 70
    },
    {
        id: "2",
        subjectId: "aero",
        subjectName: "Aerodynamics",
        date: "2026-01-08",
        score: 75,
        totalQuestions: 40,
        correctAnswers: 30,
        timeSpent: 52,
        passed: true,
        passScore: 70
    }
]

export const weakPoints: WeakPoint[] = [
    {
        id: "1",
        topic: "Wind Shear Recognition",
        subjectName: "Meteorology",
        reference: "CAO XXX.XXX",
        accuracy: 45,
        questionsAttempted: 22,
        reccomendation: "Review microburst patterns and low-level wind shear indicators. Focus on PIREP interpretation.",
        priority: "high"
    }
]

export const userStats = {
    totalExamsTaken: 24,
    averageScore: 79,
    studyStreak: 12,
    totalStudyHours: 86,
    subjectsCompleted: 1,
    totalSubjects: 7,
    questionsAnswered: 860,
    correctAnswers: 679
}