"use client"

import StatsCard from "@/components/hub/stats-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
    BookOpen,
    Target,
    Flame,
    Clock,
    TrendingUp,
    ArrowRight,
    CheckCircle2,
    XCircle,
    Loader2,
    Plane,
    Cloud,
    Compass,
    Scale,
    Brain,
    Gauge,
    ClipboardList,
    Lock,
    GraduationCap,
    ChevronRight,
} from "lucide-react"
import Link from "next/link"
import { useUser } from "@lib/user-context"
import { SUBJECTS as allSubjects } from "@lib/subjects"
import type React from "react"

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Plane,
    Cloud,
    Compass,
    Scale,
    Brain,
    Gauge,
    ClipboardList,
}

export default function DashboardContent() {
    const { user, purchases, examAttempts, stats, isLoading, hasAccessToSubject } = useUser()

    const theorySubjects = allSubjects.map((subject) => ({
        ...subject,
        isPurchased: hasAccessToSubject(subject.id),
    }))

    const purchasedSubjects = theorySubjects.filter((s) => s.isPurchased)
    const lockedSubjects = theorySubjects.filter((s) => !s.isPurchased)

    const recentExams = examAttempts.slice(0, 3).map((exam) => ({
        id: exam.id,
        subjectId: exam.subjectId,
        subjectName: exam.subjectName,
        date: new Date(exam.completedAt).toLocaleDateString(),
        score: exam.score,
        totalQuestions: exam.totalQuestions,
        correctAnswers: exam.correctAnswers,
        timeSpent: exam.timeSpentMins,
        passed: exam.passed,
    }))

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading your dashboard...</p>
                </div>
            </div>
        )
    }

    const displayStats = stats || {
        totalExamsTaken: 0,
        averageScore: 0,
        studyStreak: 0,
        totalStudyHours: 0,
        questionsAnswered: 0,
        correctAnswers: 0,
    }

    return (
        <div className="p-4 lg:p-6 space-y-6">
            {/* Welcome Section */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Welcome back, {user?.firstName || "Pilot"}</h1>
                    <p className="text-muted-foreground">
                        {purchasedSubjects.length > 0
                            ? "Continue your AviPrep journey. You're making great progress!"
                            : "Get started by purchasing access to your first subject."}
                    </p>
                </div>
                <Link href={purchasedSubjects.length > 0 ? "/dashboard/exams" : "/dashboard/pricing"}>
                    <Button className="gap-2">
                        <BookOpen className="h-4 w-4" />
                        {purchasedSubjects.length > 0 ? "Quick Practice" : "Get Access"}
                    </Button>
                </Link>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Study Streak"
                    value={`${displayStats.studyStreak} days`}
                    icon={Flame}
                    trend={displayStats.studyStreak > 0 ? { value: 20, isPositive: true } : undefined}
                />
                <StatsCard
                    title="Average Score"
                    value={`${displayStats.averageScore}%`}
                    icon={Target}
                    trend={displayStats.averageScore > 0 ? { value: 5, isPositive: true } : undefined}
                />
                <StatsCard title="Exams Taken" value={displayStats.totalExamsTaken} icon={BookOpen} description="Total" />
                <StatsCard
                    title="Study Hours"
                    value={`${displayStats.totalStudyHours}h`}
                    icon={Clock}
                    description="Total time"
                />
            </div>

            {/* Overall Progress */}
            {displayStats.questionsAnswered > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Overall Progress</CardTitle>
                            <Badge variant="secondary">
                                {purchasedSubjects.length}/{allSubjects.length} Subjects Unlocked
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <div className="h-3 rounded-full bg-secondary overflow-hidden">
                                    <div
                                        className="h-full bg-primary rounded-full transition-all"
                                        style={{
                                            width: `${displayStats.questionsAnswered > 0 ? (displayStats.correctAnswers / displayStats.questionsAnswered) * 100 : 0}%`,
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-foreground">
                                    {displayStats.questionsAnswered > 0
                                        ? Math.round((displayStats.correctAnswers / displayStats.questionsAnswered) * 100)
                                        : 0}
                                    %
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {displayStats.correctAnswers}/{displayStats.questionsAnswered} correct
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* My Courses - Compact List View */}
            {purchasedSubjects.length > 0 && (
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-semibold text-foreground">My Courses</h2>
                            <Badge variant="secondary" className="font-normal">
                                {purchasedSubjects.length} active
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link href="/dashboard/learn">
                                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                                    <GraduationCap className="h-4 w-4" />
                                    Learn
                                </Button>
                            </Link>
                            <Link href="/dashboard/exams">
                                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                                    Practice
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                    <Card>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border">
                                {purchasedSubjects.map((subject) => {
                                    const Icon = iconMap[subject.icon] || Plane
                                    return (
                                        <div
                                            key={subject.id}
                                            className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                                        >
                                            {/* Icon */}
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                                <Icon className="h-5 w-5 text-primary" />
                                            </div>

                                            {/* Subject Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge variant="outline" className="text-xs shrink-0">
                                                        {subject.code}
                                                    </Badge>
                                                    <p className="font-medium text-foreground truncate">{subject.name}</p>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                    <span>{0/*subject.questionsAttempted*/}/{subject.totalQuestions} questions</span>
                                                    <span className="hidden sm:inline">
                                                        Avg: {/*subject.averageScore > */0 ? `${0/*subject.averageScore*/}%` : "—"}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Progress */}
                                            <div className="hidden md:flex items-center gap-3 w-32">
                                                <Progress value={0/*subject.progress*/} className="h-2 flex-1" />
                                                <span className="text-sm font-medium text-foreground w-10 text-right">
                                                    {0/*subject.progress*/}%
                                                </span>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Link href={`/dashboard/learn?license=${subject.licenseType}&subject=${subject.id}`}>
                                                    <Button variant="ghost" size="sm" className="hidden sm:flex h-8 gap-1">
                                                        Courses
                                                        <GraduationCap className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Link href={`/dashboard/exams/${subject.id}`}>
                                                    <Button variant="ghost" size="sm" className="h-8 gap-1">
                                                        Practice
                                                        <ChevronRight className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </section>
            )}

            {/* Available to Purchase - Compact Grid */}
            {lockedSubjects.length > 0 && (
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-semibold text-foreground">
                                {purchasedSubjects.length > 0 ? "More Subjects" : "Get Started"}
                            </h2>
                            <Badge variant="outline" className="font-normal">
                                {lockedSubjects.length} available
                            </Badge>
                        </div>
                        <Link href="/dashboard/pricing">
                            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                                View pricing
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                    <Card>
                        <CardContent className="p-4">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {lockedSubjects.slice(0, 6).map((subject) => {
                                    const Icon = iconMap[subject.icon] || Plane
                                    return (
                                        <Link
                                            key={subject.id}
                                            href="/dashboard/pricing"
                                            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all group"
                                        >
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                                                <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">{subject.name}</p>
                                                <p className="text-xs text-muted-foreground">{subject.code}</p>
                                            </div>
                                            <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                                        </Link>
                                    )
                                })}
                            </div>
                            {lockedSubjects.length > 6 && (
                                <div className="mt-4 pt-4 border-t border-border text-center">
                                    <Link href="/dashboard/pricing">
                                        <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                                            View all {lockedSubjects.length} subjects
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </section>
            )}

            {/* Recent Exams */}
            {recentExams.length > 0 && (
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-foreground">Recent Exams</h2>
                        <Link href="/dashboard/history">
                            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                                View all
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                    <Card>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border">
                                {recentExams.map((exam) => (
                                    <div key={exam.id} className="flex items-center justify-between p-4">
                                        <div className="flex items-center gap-4">
                                            <div
                                                className={`flex h-10 w-10 items-center justify-center rounded-full ${exam.passed ? "bg-[var(--success)]/10" : "bg-destructive/10"}`}
                                            >
                                                {exam.passed ? (
                                                    <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
                                                ) : (
                                                    <XCircle className="h-5 w-5 text-destructive" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground">{exam.subjectName}</p>
                                                <p className="text-sm text-muted-foreground">{exam.date}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-lg font-bold ${exam.passed ? "text-[var(--success)]" : "text-destructive"}`}>
                                                {exam.score}%
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {exam.correctAnswers}/{exam.totalQuestions} correct
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </section>
            )}

            {/* AI Insights Teaser */}
            {purchasedSubjects.length > 0 && (
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                                <TrendingUp className="h-6 w-6 text-primary-foreground" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-foreground">AI-Powered Insights Available</h3>
                                <p className="text-sm text-muted-foreground">
                                    We've identified areas where you can improve. View personalized recommendations to boost your scores.
                                </p>
                            </div>
                            <Link href="/dashboard/insights">
                                <Button>View Insights</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Empty state for new users */}
            {purchasedSubjects.length === 0 && recentExams.length === 0 && (
                <Card className="border-dashed">
                    <CardContent className="p-8 text-center">
                        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <BookOpen className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">Start Your CPL Journey</h3>
                        <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                            Get access to comprehensive practice exams and study materials to help you pass your CASA CPL theory
                            exams.
                        </p>
                        <Link href="/dashboard/pricing">
                            <Button>Browse Subjects</Button>
                        </Link>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
