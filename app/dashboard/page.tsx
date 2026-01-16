"use client";

import StatsCard from "@/components/hub/stats-card"
import SubjectCard from "@/components/hub/subject-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CardSpotlight } from "@/ui/card-spotlight"
import Link from "next/link"
import { FaArrowRight, FaArrowTrendUp, FaBookOpen, FaCheck, FaClock, FaCross, FaFireFlameCurved, FaMedal, FaShuffle } from "react-icons/fa6"
import { useUser } from "@lib/user-context"
import { SUBJECTS } from "@lib/products"
import { Loader2 } from "lucide-react"

export default () => {
    const { user, purchases, weakPoints, examAttempts, stats, isLoading, hasAccessToSubject } = useUser();

    const theorySubjects = SUBJECTS.map(s => ({
        ...s,
        isPurchased: hasAccessToSubject(s.id)
    }));

    const purchasedSubjects = theorySubjects.filter(s => s.isPurchased);
    const lockedSubjects = theorySubjects.filter(s => !s.isPurchased);

    const recentExams = examAttempts.slice(0, 3).map(exam => ({
        id: exam.id,
        subjectId: exam.subjectId,
        subjectName: exam.subjectName,
        date: new Date(exam.completedAt).toLocaleDateString(),
        score: exam.score,
        totalQuestions: exam.totalQuestions,
        correctAnswers: exam.correctAnswers,
        timeSpent: exam.timeSpentMins,
        passed: exam.passed
    }));

    const displayStats = stats || {
        totalExamsTaken: 0,
        averageScore: 0,
        studyStreak: 0,
        totalStudyHours: 0,
        questionsAnswered: 0,
        correctAnswers: 0
    }

    if (isLoading) return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading your dashboard...</p>
            </div>
        </div>
    )

    return (
        <div className="p-4 lg:p-6 space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Welcome back, Joshua</h1>
                    <p className="text-muted-foreground">
                        {purchasedSubjects.length > 0 ? "Continue your AviPrep journey. You're making great progress!" : "Get started by purchasing access to your first subject."}
                    </p>
                </div>
                <Link href={purchasedSubjects.length > 0 ? "/dashboard/exams" : "/dashboard/pricing"}>
                    <Button className="gap-2 text-foreground cursor-pointer">
                        <FaBookOpen className="text-lg" />
                        {purchasedSubjects.length > 0 ? "Quick Practice" : "Get Access"}
                    </Button>
                </Link>
            </div>

            {weakPoints.length > 0 && (
                <CardSpotlight radius={5000} color={"#010203"} className="p-0 bg-primary/5 border-primary/20">
                    <div className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="z-20 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                                <FaArrowTrendUp className="text-xl" />
                            </div>
                            <div className="flex-1 z-20">
                                <h3 className="font-semibold text-foreground">AI-Powered Insights Available</h3>
                                <p className="text-sm text-muted-foreground">
                                    We've identified {weakPoints.length} area{weakPoints.length === 1 ? "" : "s"} where you can improve. View personalised recommendations to boost your scores.
                                </p>
                            </div>
                            <div className="z-20">
                                <Link href="/dashboard/insights">
                                    <Button className="text-foreground cursor-pointer">
                                        View Insights
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </CardSpotlight>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Study Streak"
                    value={`${displayStats.studyStreak} days`}
                    icon={FaFireFlameCurved}
                    description="in a row"
                />
                <StatsCard
                    title="Average Score"
                    value={`${displayStats.averageScore}%`}
                    icon={FaMedal}
                    trend={{ value: "0%", isPositive: true }}
                />
                <StatsCard
                    title="Exams Taken"
                    value={`${displayStats.totalExamsTaken} exams`}
                    icon={FaBookOpen}
                    description="this month"
                />
                <StatsCard
                    title="Study Hours"
                    value={`${displayStats.totalStudyHours} hours`}
                    icon={FaClock}
                    description="total time"
                />
            </div>

            {displayStats.questionsAnswered > 0 && (
                <Card className="border-blue-400/50">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Overall Progress</CardTitle>
                            <Badge variant="secondary">{purchasedSubjects.length} / {SUBJECTS.length} Subjects Completed</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <div className="h-3 rounded-full bg-secondary overflow-hidden">
                                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${displayStats.questionsAnswered > 0 ? (displayStats.correctAnswers / displayStats.questionsAnswered) * 100 : 0}%` }} />
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="2xl font-bold text-foreground">
                                    {displayStats.questionsAnswered > 0
                                        ? Math.round((displayStats.correctAnswers / displayStats.questionsAnswered) * 100)
                                        : 0}
                                    %
                                </p>
                                <p className="text-xs text-muted-foreground">{displayStats.correctAnswers}/{displayStats.questionsAnswered} correct</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-foreground">My Subjects</h2>
                    <Link href="/dashboard/exams">
                        <Button variant="ghost" size="sm" className="cursor-pointer gap-1 text-muted-foreground">
                            View All
                            <FaArrowRight className="text-lg" />
                        </Button>
                    </Link>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {purchasedSubjects.map(subject => (
                        <SubjectCard key={subject.id} subject={subject} />
                    ))}
                </div>
            </section>

            {lockedSubjects.length > 0 && (
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-foreground">Available to Purchase</h2>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {lockedSubjects.map(subject => (
                            <SubjectCard key={subject.id} subject={subject} />
                        ))}
                    </div>
                </section>
            )}

            {recentExams.length > 0 && (
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-foreground">Recent Exams</h2>
                        <Link href="/dashboard/history">
                            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                                View All
                                <FaArrowRight className="text-lg" />
                            </Button>
                        </Link>
                    </div>
                    <Card>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border">
                                {recentExams.map(exam => (
                                    <div key={exam.id} className="flex items-center justify-between p-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-1 items-center justify-center rounded-full ${exam.passed ? "bg-green-600" : "bg-red-600"}`}>
                                                {exam.passed ? <FaCheck className="text-green-300" /> : <FaCross className="text-red-300" />}
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground">{exam.subjectName}</p>
                                                <p className="text-sm text-muted-foreground">{exam.date}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-lg font-bold ${exam.passed ? "text-green-500" : "text-red-500"}`}>
                                                {exam.score}%
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {exam.correctAnswers} / {exam.totalQuestions} correct
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </section>
            )}
        </div>
    )
}