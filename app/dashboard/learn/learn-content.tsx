"use client"

import SubjectCard from "@/components/hub/subject-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Modal, ModalBody, ModalContent, ModalTrigger } from "@/ui/animated-modal";
import { SubjectData } from "@lib/types";
import { VscDebugRestart } from "react-icons/vsc";
import { useEffect, useState } from "react"
import { FaArrowRight } from "react-icons/fa6";
import { AlertCircleIcon, ArrowRight, CheckCircle2, RotateCcw, XCircle } from "lucide-react";

export default function LearnContent() {
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<SubjectData[]>([])
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchSubjects() {
            try {
                const response = await fetch("/api/user/subjects")
                if (!response.ok) throw new Error("Failed to fetch subjects")
                const data = await response.json()
                setSubjects(data.subjects)
            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred")
            } finally {
                setLoading(false)
            }
        }
        fetchSubjects()
    }, [])

    const purchasedSubjects = subjects.filter((s) => s.isPurchased)
    const lockedSubjects = subjects.filter((s) => !s.isPurchased)

    if (loading) return (
        <div className="p-4 lg:p-6 space-y-6">
            <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-96" />
            </div>
        </div>
    )

    if (error) {
        return (
            <div className="p-4 lg:p-6">
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <p className="text-lg font-medium text-red-500">Error loading subjects</p>
                        <p className="text-sm text-muted-foreground">{error}</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="p-4 lg:p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Courses</h1>
                <p className="text-muted-foreground">Select a subject to start learning</p>
            </div>

            <Tabs defaultValue="purchased" className="space-y-4">
                <TabsList className="bg-secondary">
                    <TabsTrigger value="purchased">My Subjects ({purchasedSubjects.length})</TabsTrigger>
                    <TabsTrigger value="available">Available ({lockedSubjects.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="purchased" className="space-y-4">
                    {purchasedSubjects.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {purchasedSubjects.map((subject) => (
                                <Modal key={subject.id}>
                                    <ModalTrigger className="text-left">
                                        <SubjectCard subject={subject} hideButton={true} />
                                    </ModalTrigger>
                                    <ModalBody className="bg-background">
                                        <ModalContent>
                                            <CardTitle className="text-lg">{subject.name} Courses</CardTitle>
                                            <CardDescription>{"3"} courses found</CardDescription>
                                            <div className="overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="hover:bg-transparent hover:bg-transparent">
                                                            <TableHead>Component</TableHead>
                                                            <TableHead className="text-right">Actions</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        <TableRow>
                                                            <TableCell>
                                                                <div className="flex items-center gap-3">
                                                                    <div
                                                                        className={`h-8 w-8 rounded-full flex items-center justify-center ${true ? "bg-green-500/10" : "bg-slate-500/10"}`}
                                                                    >
                                                                        {true ? (
                                                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                                        ) : (
                                                                            <AlertCircleIcon className="h-4 w-4 text-yellow-500" />
                                                                        )}
                                                                    </div>
                                                                    <span className="font-medium text-foreground">Fire Suppression System</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="flex justify-end gap-2">
                                                                <Button size="sm" variant="ghost" className="cursor-pointer gap-2">
                                                                    <RotateCcw className="h-4 w-4" />
                                                                    Restart
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                        <TableRow>
                                                            <TableCell>
                                                                <div className="flex items-center gap-3">
                                                                    <div
                                                                        className={`h-8 w-8 rounded-full flex items-center justify-center ${false ? "bg-green-500/10" : "bg-slate-500/10"}`}
                                                                    >
                                                                        {false ? (
                                                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                                        ) : (
                                                                            <AlertCircleIcon className="h-4 w-4 text-yellow-500" />
                                                                        )}
                                                                    </div>
                                                                    <span className="font-medium text-foreground">Propellers</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="flex justify-end">
                                                                <Button size="sm" variant="ghost" className="cursor-pointer gap-2">
                                                                    <ArrowRight className="h-4 w-4" />
                                                                    Start
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                        <TableRow>
                                                            <TableCell>
                                                                <div className="flex items-center gap-3">
                                                                    <div
                                                                        className={`h-8 w-8 rounded-full flex items-center justify-center ${false ? "bg-green-500/10" : "bg-slate-500/10"}`}
                                                                    >
                                                                        {false ? (
                                                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                                        ) : (
                                                                            <AlertCircleIcon className="h-4 w-4 text-yellow-500" />
                                                                        )}
                                                                    </div>
                                                                    <span className="font-medium text-foreground">Constant Speed Units</span>
                                                                    <div className="py-1 px-2 bg-muted rounded-md text-xs font-medium tracking-relaxed">In Progress</div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="flex justify-end">
                                                                <Button size="sm" variant="ghost" className="cursor-pointer gap-2">
                                                                    <ArrowRight className="h-4 w-4" />
                                                                    Continue
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </ModalContent>
                                    </ModalBody>
                                </Modal>
                            ))}
                        </div>
                    ) : (
                        <p>No subjects?</p>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}