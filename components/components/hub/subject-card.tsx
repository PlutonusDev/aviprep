import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import { FaArrowRight, FaLock } from "react-icons/fa6";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import Link from "next/link";

export default ({ subject }) => {
    return (
        <Card className={`relative overflow-hidden transition-all hover:border-primary/50 ${!subject.isPurchased ? "opacity-75" : ""}`}>
            {!subject.isPurchased && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="text-center">
                        <FaLock className="text-xl text-muted-foreground mx-auto mb-2" />
                        <h3 className="text-foreground">{subject.name}</h3>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Not Purchased</p>
                        <Link href="/practice/pricing">
                            <Button size="sm" className="mt-3 cursor-pointer text-foreground">Unlock Access</Button>
                        </Link>
                    </div>
                </div>
            )}

            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-foreground">{subject.name}</h3>
                    </div>
                    <Badge variant="secondary" className="text-xs">{subject.code}</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">{subject.description}</p>
            </CardHeader>
            <CardContent className="pb-3">
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium text-foreground">{subject.progress}%</span>
                    </div>
                    <Progress value={subject.progress} className="h-2" />

                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                            <p className="text-xs text-muted-foreground">Questions</p>
                            <p className="text-sm font-medium text-foreground">{subject.questionsAttempted} / {subject.totalQuestions}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Avg. Score</p>
                            <p className="text-sm font-medium text-foreground">
                                {subject.averageScore > 0 ? `${subject.averageScore}%` : "-"}
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="pt-0">
                <Link href={`/practice/exams/${subject.id}`} className="w-full">
                    <Button variant="secondary" className="w-full group cursor-pointer">
                        Start Practice
                        <FaArrowRight className="ml-2 text-lg transition-transform group-hover:translate-x-1" />
                    </Button>
                </Link>
            </CardFooter>
        </Card>
    )
}