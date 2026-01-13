"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { examHistory, theorySubjects, userStats } from "lib/mock-data";
import { Award, BookOpen, CheckCircle2, Clock, Flame, Target, TrendingUp, XCircle } from "lucide-react";
import { FaArrowTrendUp } from "react-icons/fa6";
import { AreaChart, PieChart, Pie, Cell, Legend, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Area, BarChart, Bar } from "recharts";

const performanceData = [
    { date: "Dec 1", score: 68 },
    { date: "Dec 8", score: 72 },
    { date: "Dec 15", score: 75 },
    { date: "Dec 22", score: 78 },
    { date: "Dec 29", score: 76 },
    { date: "Jan 5", score: 82 },
    { date: "Jan 10", score: 85 },
];

const subjectPerformance = theorySubjects
    .filter((s) => s.isPurchased && s.averageScore > 0)
    .map((s) => ({
        name: s.code,
        fullName: s.name,
        score: s.averageScore,
        questions: s.questionsAttempted,
    }))

const difficultyData = [
    { name: "Easy", value: 320, color: "#00c951" },
    { name: "Medium", value: 410, color: "#ff6900" },
    { name: "Hard", value: 130, color: "var(--red-500)" },
]

const studyTimeData = [
    { day: "Mon", hours: 2.5 },
    { day: "Tue", hours: 1.8 },
    { day: "Wed", hours: 3.2 },
    { day: "Thu", hours: 2.1 },
    { day: "Fri", hours: 1.5 },
    { day: "Sat", hours: 4.0 },
    { day: "Sun", hours: 0.0 },
]

export default () => {
    const purchasedSubjects = theorySubjects.filter(s => s.isPurchased);
    const totalProgress = purchasedSubjects.reduce((acc, s) => acc + s.progress, 0) / purchasedSubjects.length;

    const passedExams = examHistory.filter(e => e.passed).length;
    const passRate = Math.round((passedExams / examHistory.length) * 100);

    return (
        <div className="p-4 lg:p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Statistics & Analytics</h1>
                <p className="text-muted-foreground">Track your progress and identify areas for improvement</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Overall Score</p>
                                <p className="text-3xl font-bold text-foreground">{userStats.averageScore}%</p>
                                <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                                    <FaArrowTrendUp />
                                    +5% from last month
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <Target className="h-6 w-6 text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Pass Rate</p>
                                <p className="text-3xl font-bold text-foreground">{passRate}%</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {passedExams}/{examHistory.length} exams passed
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                                <Award className="h-6 w-6 text-green-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Study Streak</p>
                                <p className="text-3xl font-bold text-foreground">{userStats.studyStreak} days</p>
                                <p className="text-xs text-muted-foreground mt-1">Personal best: 18 days</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                                <Flame className="h-6 w-6 text-orange-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Study Time</p>
                                <p className="text-3xl font-bold text-foreground">{userStats.totalStudyHours}h</p>
                                <p className="text-xs text-muted-foreground mt-1">This month: 24h</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-chart-4/10 flex items-center justify-center">
                                <Clock className="h-6 w-6 text-chart-4" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="performance" className="space-y-4">
                <TabsList className="bg-secondary">
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="subjects">Subjects</TabsTrigger>
                    <TabsTrigger value="study-time">Study Time</TabsTrigger>
                </TabsList>

                <TabsContent value="performance" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Score Trend</CardTitle>
                            <CardDescription>Your average exam scores over time</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={performanceData}>
                                        <defs>
                                            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="oklch(0.65 0.18 220)" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="oklch(0.65 0.18 220)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                        <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
                                        <YAxis domain={[50, 100]} stroke="var(--muted-foreground)" fontSize={12} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "var(--card)",
                                                border: "1px solid var(--border)",
                                                borderRadius: "8px",
                                            }}
                                            labelStyle={{ color: "var(--foreground)" }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="score"
                                            stroke="oklch(0.65 0.18 220)"
                                            strokeWidth={2}
                                            fill="url(#scoreGradient)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Questions Breakdown</CardTitle>
                                <CardDescription>Your answer accuracy</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-center">
                                    <div className="relative h-[200px] w-[200px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { name: "Correct", value: userStats.correctAnswers },
                                                        { name: "Incorrect", value: userStats.questionsAnswered - userStats.correctAnswers },
                                                    ]}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                >
                                                    <Cell fill="#00c951" />
                                                    <Cell fill="#fb2c36" />
                                                </Pie>
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="mt-4 w-full flex justify-center space-x-6">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{userStats.correctAnswers}</p>
                                            <p className="text-xs text-muted-foreground">Correct</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <XCircle className="h-5 w-5 text-red-600" />
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                {userStats.questionsAnswered - userStats.correctAnswers}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Incorrect</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Difficulty Distribution</CardTitle>
                                <CardDescription>Questions attempted by difficulty level</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={difficultyData}
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={80}
                                                paddingAngle={2}
                                                dataKey="value"
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            >
                                                {difficultyData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
                <TabsContent value="subjects" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Performance by Subject</CardTitle>
                            <CardDescription>Average scores across all theory subjects</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={subjectPerformance} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--muted-foreground)" />
                                        <XAxis type="number" domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} />
                                        <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={12} width={50} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "var(--card)",
                                                color: "var(--muted-foreground)",
                                                border: "1px solid var(--border)",
                                                borderRadius: "4px",
                                            }}
                                            cursor={{
                                                fill: "var(--muted)"
                                            }}
                                            content={<CustomTooltip />}
                                        />
                                        <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                                            {subjectPerformance.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={
                                                        entry.score >= 80
                                                            ? "#00c951"
                                                            : entry.score >= 70
                                                                ? "#ff6c58"
                                                                : "#fb2c36"
                                                    }
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Subject Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {purchasedSubjects.map((subject) => (
                            <Card key={subject.id}>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary">{subject.code}</Badge>
                                            <span className="text-sm font-medium text-foreground">{subject.name}</span>
                                        </div>
                                        <span
                                            className={`text-lg font-bold ${subject.averageScore >= 80
                                                ? "text-green-500"
                                                : subject.averageScore >= 70
                                                    ? "text-primary"
                                                    : "text-orange-500"
                                                }`}
                                        >
                                            {subject.averageScore > 0 ? `${subject.averageScore}%` : "—"}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>Progress</span>
                                            <span>{subject.progress}%</span>
                                        </div>
                                        <Progress value={subject.progress} className="h-1.5" />
                                        <p className="text-xs text-muted-foreground">
                                            {subject.questionsAttempted}/{subject.totalQuestions} questions attempted
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="study-time" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Weekly Study Time</CardTitle>
                            <CardDescription>Hours spent studying each day this week</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={studyTimeData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                        <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                                        <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "var(--card)",
                                                border: "1px solid var(--border)",
                                                borderRadius: "8px",
                                            }}
                                            formatter={(value: number) => [`${value}h`, "Study Time"]}
                                        />
                                        <Bar dataKey="hours" fill="oklch(0.65 0.18 220)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Study Stats */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardContent className="p-6 text-center">
                                <BookOpen className="h-8 w-8 mx-auto text-primary mb-2" />
                                <p className="text-3xl font-bold text-foreground">18.6h</p>
                                <p className="text-sm text-muted-foreground">This Week</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6 text-center">
                                <Clock className="h-8 w-8 mx-auto text-green-500 mb-2" />
                                <p className="text-3xl font-bold text-foreground">2.7h</p>
                                <p className="text-sm text-muted-foreground">Daily Average</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6 text-center">
                                <TrendingUp className="h-8 w-8 mx-auto text-orange-500 mb-2" />
                                <p className="text-3xl font-bold text-foreground">+12%</p>
                                <p className="text-sm text-muted-foreground">vs Last Week</p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            <Card>
                <CardHeader>
                    <CardTitle>Course Completion</CardTitle>
                    <CardDescription>Your overall progress across all purchased subjects</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Overall Progress</span>
                            <span className="text-sm font-medium text-foreground">{Math.round(totalProgress)}%</span>
                        </div>
                        <Progress value={totalProgress} className="h-3" />
                        <p className="text-sm text-muted-foreground">
                            You've completed {Math.round(totalProgress)}% of the material across {purchasedSubjects.length} subjects.
                            Keep up the great work!
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload; // This is your original subject object
        return (
            <div style={{
                backgroundColor: "var(--card)",
                padding: "10px",
                border: "1px solid var(--border)",
                borderRadius: "4px"
            }}>
                <p style={{ fontWeight: 'bold', margin: 0 }}>{data.fullName}</p>
                <p style={{ color: "var(--muted-foreground)", margin: 0 }}>
                    Score: <span style={{ color: "#fff" }}>{data.score}%</span>
                </p>
                <p style={{ fontSize: "12px", margin: 0 }}>
                    Questions: {data.questions}
                </p>
            </div>
        );
    }
    return null;
};