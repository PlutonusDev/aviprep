"use client";

import SubjectCard from "@/components/hub/subject-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubjectData } from "@lib/types";
import { theorySubjects } from "lib/mock-data"
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FaArrowTrendUp, FaBookOpen, FaClock, FaShuffle } from "react-icons/fa6";

export default () => {
    const [subjects, setSubjects] = useState<SubjectData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchSubjects() {
            try {
                const response = await fetch("/api/user/subjects");
                if (!response.ok) throw new Error("Failed to fetch subjects");
                const data = await response.json();
                setSubjects(data.subjects);
                setLoading(false);
            } catch (error) {
                setError("Failed to fetch subjects");
                setLoading(false);
            } finally {
                setLoading(false);
            }
        }

        fetchSubjects();
    }, []);

    const purchasedSubjects = subjects.filter(s => s.isPurchased);
    const lockedSubjects = subjects.filter(s => !s.isPurchased);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading your exams...</p>
            </div>
        </div>
    )

    return (
        <div className="p-4 lg:p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Practice Exams</h1>
                <p className="text-muted-foreground">Select a subject to start practicing or try a mixed exam</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                    <Link href="/practice/exams/mixed">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                                    <FaShuffle />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">Mixed Exam</h3>
                                    <p className="text-sm text-muted-foreground">Questions from all subjects</p>
                                </div>
                            </div>
                        </CardContent>
                    </Link>
                </Card>

                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                    <Link href="/practice/exams/timed">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                                    <FaClock />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">Timed Exams</h3>
                                    <p className="text-sm text-muted-foreground">Simulate real exam conditions</p>
                                </div>
                            </div>
                        </CardContent>
                    </Link>
                </Card>

                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                    <Link href="/practice/insights">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                                    <FaArrowTrendUp />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">Weak Points</h3>
                                    <p className="text-sm text-muted-foreground">Focus on areas to improve</p>
                                </div>
                            </div>
                        </CardContent>
                    </Link>
                </Card>
            </div>

            <Tabs defaultValue="purchased" className="space-y-4">
                <TabsList className="bg-secondary">
                    <TabsTrigger value="purchased" className="cursor-pointer">My Subjects ({purchasedSubjects.length})</TabsTrigger>
                    <TabsTrigger value="available" className="cursor-pointer">Available ({lockedSubjects.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="purchased" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {purchasedSubjects.map(subject => (
                            <SubjectCard key={subject.id} subject={subject} />
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="available" className="space-y-4">
                    {lockedSubjects.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {lockedSubjects.map(subject => (
                                <SubjectCard key={subject.id} subject={subject} />
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <FaBookOpen className="text-lg text-muted-foreground mb-4" />
                                <p className="text-lg font-medium text-foreground">All subjects unlocked!</p>
                                <p className="text-sm text-muted-foreground">You have access to all available theory subjects.</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Exam Modes</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary">Practice</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Untimed practice with immediate feedback after each question. Perfect for learning.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary">Review</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Review previous attempted questions and study explanations.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}