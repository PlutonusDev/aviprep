"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { theorySubjects } from "lib/mock-data";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaBoltLightning, FaBrain, FaCheck, FaCrown, FaPlane, FaPrint, FaStar } from "react-icons/fa6";
import { ALL_PRODUCTS, CPL_BUNDLE, getProductById, SUBJECTS } from "lib/products";

export default () => {
    const router = useRouter();
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
    const [addPrinting, setAddPrinting] = useState(false);
    const [addAI, setAddAI] = useState(false);

    const purchasedSubjectIds = theorySubjects.filter(s => s.isPurchased).map(s => s.id);

    const toggleSubject = (id: string) => {
        if (purchasedSubjectIds.includes(id)) return
        setSelectedSubjects((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
    }

    const calculateTotal = () => {
        const subjectTotal = selectedSubjects.reduce((sum, id) => {
            const subject = ALL_PRODUCTS.find(s => s.id === id);
            return sum + (subject?.priceInCents / 100 || 0);
        }, 0);
        const addonsTotal = (addPrinting ? 9 : 0) + (addAI ? 14 * selectedSubjects.length : 0);
        return subjectTotal + (selectedSubjects.length > 0 ? addonsTotal : 0);
    }

    const bundlePrice = CPL_BUNDLE.priceInCents / 100;
    const bundleSavings = Math.abs(SUBJECTS.reduce((sum, s) => sum + (s.priceInCents / 100), 0) - bundlePrice + 9 + (14 * 7));

    const handleBundleCheckout = () => {
        router.push("/checkout?products=cpl-bundle")
    }

    const handleIndividualCheckout = () => {
        const products = [...selectedSubjects]
        if (addPrinting) products.push("addon-printing")
        if (addAI) products.push("addon-ai-insights")
        router.push(`/checkout?products=${products.join(",")}`)
    }

    return (
        <div className="p-4 lg:p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Get Access</h1>
                <p className="mt-1 text-muted-foreground">
                    Choose individual subjects or unlock everything with the CPL Bundle
                </p>
            </div>

            <Tabs defaultValue="bundle" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="bundle" className="gap-2 cursor-pointer">
                        <FaCrown />
                        CPL Bundle
                    </TabsTrigger>
                    <TabsTrigger value="individual" className="cursor-pointer">Individual Subjects</TabsTrigger>
                </TabsList>

                <TabsContent value="bundle" className="mt-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                        <Card className="relative overflow-hidden border-primary/50 bg-gradient-to-br from-card to-primary/5">
                            <div className="absolute right-0 top-0 rounded-bl-lg bg-primary px-3 py-1">
                                <span className="text-xs font-semibold text-primary-foreground">BEST VALUE</span>
                            </div>
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-4">
                                    <FaCrown className="text-4xl text-primary" />
                                    <div>
                                        <CardTitle className="text-xl">CPL Bundle</CardTitle>
                                        <CardDescription>Complete exam preparation</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-bold text-foreground">${bundlePrice}</span>
                                    <span className="text-muted-foreground">/quarter</span>
                                </div>
                                <Badge variant="secondary" className="bg-green-500/20 text-green-500">
                                    <FaStar className="mr-2" />
                                    Save ${bundleSavings} compared to individually purchasing
                                </Badge>

                                <div className="space-y-3">
                                    {getProductById("cpl-bundle").features.map((feature, index) => (
                                        <div key={index} className="flex items-center gap-3">
                                            <FaCheck className="text-green-500 translate-y-[2px]" />
                                            <span className="text-sm text-foreground">{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="rounded-lg border border-border bg-secondary/30 p-4">
                                    <p className="text-xs text-muted-foreground">
                                        Subscription renews every 3 months. Cancel anytime. Your progress is saved permanently.
                                    </p>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button onClick={handleBundleCheckout} className="cursor-pointer w-full gap-2" size="lg">
                                    <FaBoltLightning />
                                    Subscribe to Bundle
                                </Button>
                            </CardFooter>
                        </Card>

                        <Card className="border-border bg-card">
                            <CardHeader>
                                <CardTitle className="text-lg">All 7 CPL Theory Subjects</CardTitle>
                                <CardDescription>1,690 exam questions across all topics</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-3">
                                    {SUBJECTS.map(subject => (
                                        <div key={subject.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-12 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                                                    {subject.code}
                                                </div>
                                                <p className="text-foreground">{subject.name}</p>
                                            </div>
                                            <FaCheck className="text-green-500" />
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="individual" className="mt-6 space-y-6">
                    <Card className="border border-border bg-card">
                        <CardHeader>
                            <CardTitle className="text-lg">Select Subjects</CardTitle>
                            <CardDescription>One-off payment, 12 months access to each subject</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {SUBJECTS.map(subject => {
                                    const isPurchased = purchasedSubjectIds.includes(subject.id);
                                    const isSelected = selectedSubjects.includes(subject.id);

                                    return (
                                        <button key={subject.id} onClick={() => toggleSubject(subject.id)} disabled={isPurchased} className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-all ${isPurchased
                                            ? "border-green-500/30"
                                            : isSelected
                                                ? "cursor-pointer border-primary bg-primary/10"
                                                : "cursor-pointer border-border bg-secondary/30 hover:border-primary/50"
                                            }`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`flex h-8 w-12 items-center justify-center rounded-md text-xs font-bold ${isPurchased
                                                    ? "bg-green-500/0 text-green-500"
                                                    : isSelected
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-muted text-muted-foreground"
                                                    }`}>
                                                    {subject.code}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">{subject.name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {isPurchased ? (
                                                    <Badge variant="secondary" className="bg-green-500/20 text-green-500">Owned</Badge>
                                                ) : (
                                                    <span className="text-sm font-semibold text-foreground">${subject.priceInCents / 100}</span>
                                                )}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <Card className="border border-border bg-card">
                            <CardHeader>
                                <CardTitle className="text-lg">Included Features</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20">
                                        <FaCheck className="text-green-500" />
                                    </div>
                                    <span className="text-sm text-foreground">{
                                        selectedSubjects.reduce((acc, subId) => {
                                            const product = ALL_PRODUCTS.find(p => p.id === subId);
                                            if (!product || !product.features?.[0]) return acc;

                                            // dirty, but works
                                            const questionCount = parseInt(product.features[0].replace(/\D/g, ""), 10) || 0;

                                            return acc + questionCount;
                                        }, 0)
                                    }+ exam questions
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20">
                                        <FaCheck className="text-green-500" />
                                    </div>
                                    <span className="text-sm text-foreground">
                                        12 months access
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20">
                                        <FaCheck className="text-green-500" />
                                    </div>
                                    <span className="text-sm text-foreground">
                                        Statistics & progress tracking
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20">
                                        <FaCheck className="text-green-500" />
                                    </div>
                                    <span className="text-sm text-foreground">
                                        Learning materials
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20">
                                        <FaCheck className="text-green-500" />
                                    </div>
                                    <span className="text-sm text-foreground">
                                        Access to the student forums
                                    </span>
                                </div>
                                

                                <p className="text-xs pt-6 font-medium uppercase tracking-wider text-mutd-foreground">Optional Add-ons</p>

                                <div className="space-y-4 pt-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                                                <FaPrint className="text-muted-foreground" />
                                            </div>
                                            <div>
                                                <span className="text-sm text-foreground">Print Exams & Results</span>
                                                <p className="text-xs text-muted-foreground">Export to PDF for offline study</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-muted-foreground">+$9</span>
                                            <Switch checked={addPrinting} onCheckedChange={setAddPrinting} disabled={selectedSubjects.length === 0} />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                                                <FaBrain className="text-muted-foreground" />
                                            </div>
                                            <div>
                                                <span className="text-sm text-foreground">AI Feedback & Insights</span>
                                                <p className="text-xs text-muted-foreground">Personalised weak point analysis</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-muted-foreground">+$14/subject</span>
                                            <Switch checked={addAI} onCheckedChange={setAddAI} disabled={selectedSubjects.length === 0} />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-border bg-card">
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    Order Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {selectedSubjects.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-border py-8 text-center">
                                        <p className="text-sm text-muted-foreground">
                                            Select subjects to see your total
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            {selectedSubjects.map(id => {
                                                const subject = ALL_PRODUCTS.find(s => s.id === id);
                                                if (!subject) return null;

                                                return (
                                                    <div key={id} className="flex items-center justify-between text-sm">
                                                        <span className="text-foreground">{subject.name}</span>
                                                        <span className="text-muted-foreground">${subject.priceInCents / 100}</span>
                                                    </div>
                                                )
                                            })}
                                            {addPrinting && (
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-foreground">Print Feature</span>
                                                    <span className="text-muted-foreground">$9</span>
                                                </div>
                                            )}
                                            {addAI && (
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-foreground">AI Insights</span>
                                                    <span className="text-muted-foreground">$14/subject (${selectedSubjects.length * 14})</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="border-t border-border pt-4">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-foreground">Total</span>
                                                <span className="text-2xl font-bold text-foreground">${calculateTotal()}</span>
                                            </div>
                                            <p className="mt-1 text-xs text-muted-foreground">One-off payment · 12 months access</p>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button className={`w-full ${selectedSubjects.length === 0 ? "" : "cursor-pointer"}`} size="lg" disabled={selectedSubjects.length === 0} onClick={handleIndividualCheckout}>
                                    {selectedSubjects.length === 0 ? "Select Subjects First" : `Purchase for $${calculateTotal()}`}
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>

                    <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-transparent">
                        <CardContent className="flex flex-col items-center justify-between gap-4 py-6 sm:flex-row">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
                                    <FaCrown className="text-primary-foreground" />
                                </div>
                                <div>
                                    <p className="font-semibold text-foreground">
                                        Get more value with the CPL Bundle
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        All subjects + premium features for just ${bundlePrice}/quarter
                                    </p>
                                </div>
                            </div>
                            <Button variant="outline" className="shrink-0 border-primary texxt-primary hover:bg-primary hover:text-primary-foreground bg-transparent cursor-pointer">View Bundle</Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Card className="border border-border bg-card">
                <CardHeader>
                    <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 sm:grid-cols-2">
                    <div>
                        <p className="font-medium text-foreground">
                            How long does access last?
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Individual subjects give you 12 months of access from purchase date. The CPL Bundle renews every 3 months of continuous access.
                        </p>
                    </div>
                    <div>
                        <p className="font-medium text-foreground">
                            Can I upgrade later?
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Yes! You can upgrade to the CPL Bundle at any time. We'll credit you for any remaining time on individual purchases.
                        </p>
                    </div>
                    <div>
                        <p className="font-medium text-foreground">
                            Are the questions aligned with the PEXO exams?
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            All questions are written to match the style and difficulty of actual CASA PEXO theory exams, covering the entirety of all syllabus areas.
                        </p>
                    </div>
                    <div>
                        <p className="font-medium text-foreground">
                            What payment methods do you accept?
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            We accept all major credit cards, PayPal, Google Pay, and Apple Pay. All transactions are secured with 256-bit encryption.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}