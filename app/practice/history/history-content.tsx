"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { examHistory, theorySubjects } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Search, CheckCircle2, XCircle, Clock, Eye, Link, RotateCcw } from "lucide-react";
import { useState } from "react"
import { FaChevronDown, FaChevronUp } from "react-icons/fa6";

type SortField = "date" | "score" | "subject"
type SortDirection = "asc" | "desc"

export default () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [subjectFilter, setSubjectFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [sortField, setSortField] = useState<SortField>("date");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

    const filteredExams = examHistory.filter(exam => {
        const matchesSearch = exam.subjectName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSubject = subjectFilter === "all" || exam.subjectId === subjectFilter;
        const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "passed" && exam.passed) ||
            (statusFilter === "failed" && !exam.passed);
        return matchesSearch && matchesSubject && matchesStatus;
    }).sort((a, b) => {
        let comp = 0;
        switch (sortField) {
            case "date":
                comp = new Date(a.date).getTime() - new Date(b.date).getTime();
                break;
            case "score":
                comp = a.score - b.score;
                break;
            case "subject":
                comp = a.subjectName.localeCompare(b.subjectName);
                break;
        }
        return sortDirection === "asc" ? comp : -comp;
    });

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("desc");
        }
    }

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return null;
        return sortDirection === "asc" ? <FaChevronUp className="ml-1" /> : <FaChevronDown className="ml-1" />;
    }

    const totalExams = examHistory.length
    const passedExams = examHistory.filter((e) => e.passed).length
    const averageScore = Math.round(examHistory.reduce((acc, e) => acc + e.score, 0) / totalExams)
    const totalTime = examHistory.reduce((acc, e) => acc + e.timeSpent, 0)

    return (
        <div className="p-4 lg:p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Exam History</h1>
                <p className="text-muted-foreground">Review your past exam attempts and track your progress</p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Total Exams</p>
                        <p className="text-2xl font-bold text-foreground">{totalExams}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Pass Rate</p>
                        <p className="text-2xl font-bold text-green-500">{Math.round((passedExams / totalExams) * 100)}%</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Average Score</p>
                        <p className="text-2xl font-bold text-foreground">{averageScore}%</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Total Time</p>
                        <p className="text-2xl font-bold text-foreground">
                            {Math.round(totalTime / 60)}h {totalTime % 60}m
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search exams..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-secondary border-0"
                            />
                        </div>
                        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                            <SelectTrigger className="w-full md:w-[180px] bg-secondary border-0">
                                <SelectValue placeholder="All Subjects" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Subjects</SelectItem>
                                {theorySubjects
                                    .filter((s) => s.isPurchased)
                                    .map((subject) => (
                                        <SelectItem key={subject.id} value={subject.id}>
                                            {subject.name}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full md:w-[140px] bg-secondary border-0">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="passed">Passed</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-0">
                    <CardTitle className="text-lg">Exam Results</CardTitle>
                    <CardDescription>{filteredExams.length} exams found</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="cursor-pointer hover:text-foreground" onClick={() => handleSort("subject")}>
                                        <div className="flex items-center">
                                            Subject
                                            <SortIcon field="subject" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="cursor-pointer hover:text-foreground" onClick={() => handleSort("date")}>
                                        <div className="flex items-center">
                                            Date
                                            <SortIcon field="date" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="cursor-pointer hover:text-foreground" onClick={() => handleSort("score")}>
                                        <div className="flex items-center">
                                            Score
                                            <SortIcon field="score" />
                                        </div>
                                    </TableHead>
                                    <TableHead>Result</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredExams.map((exam) => (
                                    <TableRow key={exam.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`h-8 w-8 rounded-full flex items-center justify-center ${exam.passed ? "bg-green-500/10" : "bg-destructive/10"}`}
                                                >
                                                    {exam.passed ? (
                                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                    ) : (
                                                        <XCircle className="h-4 w-4 text-destructive" />
                                                    )}
                                                </div>
                                                <span className="font-medium text-foreground">{exam.subjectName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{exam.date}</TableCell>
                                        <TableCell>
                                            <div>
                                                <span className={`font-semibold ${exam.passed ? "text-green-500" : "text-destructive"}`}>
                                                    {exam.score}%
                                                </span>
                                                <p className="text-xs text-muted-foreground">
                                                    {exam.correctAnswers}/{exam.totalQuestions} correct
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={exam.passed ? "default" : "destructive"}
                                                className={exam.passed ? "bg-green-500 hover:bg-green-500/80" : ""}
                                            >
                                                {exam.passed ? "Passed" : "Failed"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <Clock className="h-4 w-4" />
                                                <span>{exam.timeSpent}m</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="sm" className="gap-1">
                                                    <Eye className="h-4 w-4" />
                                                    <span className="hidden sm:inline">Review</span>
                                                </Button>
                                                <Link href={`/dashboard/exams/${exam.subjectId}`}>
                                                    <Button variant="ghost" size="sm" className="gap-1">
                                                        <RotateCcw className="h-4 w-4" />
                                                        <span className="hidden sm:inline">Retry</span>
                                                    </Button>
                                                </Link>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div >
    );
}