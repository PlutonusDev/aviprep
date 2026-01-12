import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { theorySubjects, userStats, weakPoints } from "lib/mock-data"
import { CardSpotlight } from "@/ui/card-spotlight";
import Link from "next/link";
import { FaArrowRight, FaArrowTrendDown, FaArrowTrendUp, FaBrain, FaTriangleExclamation, FaWandMagicSparkles } from "react-icons/fa6";
import { FiTarget } from "react-icons/fi";

export default () => {
    const highPriorityWeakPoints = weakPoints.filter(w => w.priority === "high");
    const mediumPriorityWeakPoints = weakPoints.filter(w => w.priority === "medium");
    const lowPriorityWeakPoints = weakPoints.filter(w => w.priority === "low");

    const purchasedSubjects = theorySubjects.filter(s => s.isPurchased);
    const strongestSubject = purchasedSubjects.reduce((prev, curr) => prev.averageScore > curr.averageScore ? prev : curr);
    const weakestSubject = purchasedSubjects.reduce((prev, curr) => prev.averageScore < curr.averageScore ? prev: curr);

    return (
        <div className="p-4 lg:p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">AI Insights</h1>
                    <p className="text-muted-foreground">Personalised recommendations based on your performance</p>
                </div>
                <Badge variant="outline" className="w-fit gap-2 px-3 py-1.5">
                    <FaWandMagicSparkles className="text-primary text-lg" />
                    <span>Powered by AI Analysis</span>
                </Badge>
            </div>

            <CardSpotlight radius={5000} color={"#010203"} className="p-0 bg-primary/5 border-primary/20">
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="z-20 flex h-12 w-12 items-center justify-center rounded-xl bg-primary shrink-0">
                            <FaBrain className="text-lg text-primary-foreground" />
                        </div>
                        <div className="z-20 space-y-2">
                            <h3 className="font-semibold text-foreground">Performance Analysis Summary</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Based on your recent exam history, you're performing well overall with a{" "}
                                <span className="text-foreground font-medium">{userStats.averageScore}% average score</span>.{" "}
                                Your strongest area is <span className="text-green-500 font-medium">{strongestSubject.name} ({strongestSubject.averageScore}%)</span>,{" "}
                                while <span className="text-red-600 font-medium">{weakestSubject.name} ({weakestSubject.averageScore}%)</span> needs the most attention.{" "}
                            </p>
                            <p className="text-sm text-foreground font-medium">{weakPoints.length} specific topic{weakPoints.length === 1 ? " was" : "s were"} identified where focused study could significantly improve your scores.</p>
                        </div>
                    </div>
                </CardContent>
            </CardSpotlight>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center">
                                <FaArrowTrendUp />
                            </div>
                            <span className="font-medium text-foreground">Strongest Area</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">{strongestSubject.name}</p>
                        <p className="text-sm text-muted-foreground">{strongestSubject.averageScore}% average</p>
                        <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-xs text-muted-foreground">Keep up the excellent work! Consider helping others in study groups.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="h-10 w-10 rounded-lg bg-red-600 flex items-center justify-center">
                                <FaArrowTrendDown />
                            </div>
                            <span className="font-medium text-foreground">Focus Area</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">{weakestSubject.name}</p>
                        <p className="text-sm text-muted-foreground">{weakestSubject.averageScore}% average</p>
                        <div className="mt-3 pt-3 border-t border-border">
                            <Link href={`/practice/exams/${weakestSubject.id}`}>
                                <Button variant="ghost" size="sm" className="cursor-pointer w-full gap-2 text-primary">
                                    Practice Now
                                    <FaArrowRight className="text-lg" />
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="h-10 w-10 rounded-lg bg-red-600 flex items-center justify-center">
                                <FaTriangleExclamation />
                            </div>
                            <span className="font-medium text-foreground">Weak Points</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">{weakPoints.length} Topic{weakPoints.length === 1 ? "" : "s"}</p>
                        <p className="text-sm text-muted-foreground">
                            {highPriorityWeakPoints.length} of which is a high priority
                        </p>
                        <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-xs text-muted-foreground">
                                Address these topics to potentially boost your overall score by 8-12%.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-foreground">
                        AI-Identified Weak Points
                    </h2>
                </div>

                {highPriorityWeakPoints.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <FaTriangleExclamation className="text-red-600" />
                            <span className="text-sm font-medium text-red-600">High Priority</span>
                        </div>
                        {highPriorityWeakPoints.map(weakPoint => (
                            <WeakPointCard key={weakPoint.id} weakPoint={weakPoint} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}

function WeakPointCard({
    weakPoint,
}: {
    weakPoint: (typeof weakPoints)[0]
}) {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                            <h4 className="font-medium text-foreground">
                                {weakPoint.topic}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                                {weakPoint.subjectName}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-muted-foreground">Accuracy</span>
                                    <span className={`font-medium ${weakPoint.accuracy < 50 ? "text-red-600" : weakPoint.accuracy < 70 ? "text-orange-600" : "text-green-500"}`}>
                                        {weakPoint.accuracy}%
                                    </span>
                                </div>
                                <Progress value={weakPoint.accuracy} className={`h-1.5 ${weakPoint.accuracy < 50 ? "[&>div]:bg-red-600" : weakPoint.accuracy < 70 ? "[&>div]:bg-orange-600" : ""}`} />
                            </div>
                            <p className="text-xs text-muted-foreground whitespace-nowrap">
                                {weakPoint.questionsAttempted} questions attempted
                            </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {weakPoint.reccomendation}
                        </p>
                    </div>
                    <Button variant="outline" size="sm" className="cursor-pointer shrink-0 gap-2 bg-transparent">
                        <FiTarget />
                        Practice
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}