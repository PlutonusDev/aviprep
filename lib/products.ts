import { Check, Printer, BrainCircuit, BarChart3, Clock, ShieldCheck, Calendar, Sparkles } from "lucide-react";

export interface Product {
    id: string;
    code?: string;
    name: string;
    description: string;
    priceInCents: number;
    type: "one-time" | "subscription";
    interval?: "month" | "year";
    intervalCount?: number;
    features: Feature[];
    category: "bundle" | "single";
    subjectId?: string;
    stripeProductId: string;
    stripePriceId: string;
}

export interface Feature {
    icon: any;
    text: string;
}

export const BUNDLES: Product[] = [{
    id: "ppl-bundle",
    name: "PPL Bundle",
    description: "Full access to all PPL theory subjects with premium features",
    priceInCents: 8900,
    type: "subscription",
    interval: "month",
    intervalCount: 3,
    features: [
        { icon: Check, text: "Access to all PPL theory subjects" },
        { icon: Printer, text: "Print practice exams & results" },
        { icon: BrainCircuit, text: "AI-powered weak point analysis" },
        { icon: BarChart3, text: "Detailed performance statistics" },
        { icon: Clock, text: "Unlimited exam attempts" },
        { icon: ShieldCheck, text: "Priority support" }
    ],
    category: "bundle",
    stripeProductId: "prod_TpSpU6ch814GfZ",
    stripePriceId: "price_1SrntPL8qLbqF4tCdc41cDQz"
}, {
    id: "cpl-bundle",
    name: "CPL Bundle",
    description: "Full access to all 7 CPL theory subjects with premium features",
    priceInCents: 11000,
    type: "subscription",
    interval: "month",
    intervalCount: 3,
    features: [
        { icon: Check, text: "Access to all 7 CPL theory subjects" },
        { icon: Printer, text: "Print practice exams & results" },
        { icon: BrainCircuit, text: "AI-powered weak point analysis" },
        { icon: BarChart3, text: "Detailed performance statistics" },
        { icon: Clock, text: "Unlimited exam attempts" },
        { icon: ShieldCheck, text: "Priority support" }
    ],
    category: "bundle",
    stripeProductId: "prod_TlqCDtVoHM52wU",
    stripePriceId: "price_1SoIVnL8qLbqF4tCGDT2ipV6"
}]

export const SUBJECTS: Product[] = [
    {
        id: "aerodynamics",
        name: "Aerodynamics",
        code: "CADA",
        description: "300+ practice questions covering principles of flight, aircraft performance, and stability",
        priceInCents: 5900,
        type: "one-time",
        features: [
            { icon: Check, text: "300+ questions" },
            { icon: Calendar, text: "12-month access" },
            { icon: BarChart3, text: "Progress tracking" }
        ],
        category: "single",
        subjectId: "aerodynamics",
        stripeProductId: "prod_TmXndMivSEVbwd",
        stripePriceId: "price_1SoyhaL8qLbqF4tCBeZhrrzQ"
    },
    {
        id: "meteorology",
        name: "Meteorology",
        code: "CMET",
        description: "280+ practice questions covering weather patterns, forecasting, and aviation weather services",
        priceInCents: 5900,
        type: "one-time",
        features: [
            { icon: Check, text: "280+ questions" },
            { icon: Calendar, text: "12-month access" },
            { icon: BarChart3, text: "Progress tracking" }
        ],
        category: "single",
        subjectId: "meteorology",
        stripeProductId: "prod_TmXpBSKGwbNKdY",
        stripePriceId: "price_1SoyjjL8qLbqF4tCBXfo7MZ1"
    },
    {
        id: "navigation",
        name: "Navigation",
        code: "CNAV",
        description: "340+ practice questions covering VFR/IFR navigation, flight planning, and instruments",
        priceInCents: 7500,
        type: "one-time",
        features: [
            { icon: Check, text: "340+ questions" },
            { icon: Calendar, text: "12-month access" },
            { icon: BarChart3, text: "Progress tracking" }
        ],
        category: "single",
        subjectId: "navigation",
        stripeProductId: "prod_TmXnNJjWstEznA",
        stripePriceId: "price_1Soyi5L8qLbqF4tCfagb8NCZ"
    },
    {
        id: "air-law",
        name: "Air Law",
        code: "CLWA",
        description: "290+ practice questions covering CASA regulations, airspace, and procedures",
        priceInCents: 5900,
        type: "one-time",
        features: [
            { icon: Check, text: "290+ questions" },
            { icon: Calendar, text: "12-month access" },
            { icon: BarChart3, text: "Progress tracking" }
        ],
        category: "single",
        subjectId: "air-law",
        stripeProductId: "prod_TmXpNxrtS6pXQB",
        stripePriceId: "price_1Soyk6L8qLbqF4tCeAp3Hz3G"
    },
    {
        id: "human-factors",
        name: "Human Factors",
        code: "CHUF",
        description: "250+ practice questions covering physiology, psychology, and crew resource management",
        priceInCents: 4900,
        type: "one-time",
        features: [
            { icon: Check, text: "250+ questions" },
            { icon: Calendar, text: "12-month access" },
            { icon: BarChart3, text: "Progress tracking" }
        ],
        category: "single",
        subjectId: "human-factors",
        stripeProductId: "prod_TmXoF3T2VzDS8p",
        stripePriceId: "price_1SoyigL8qLbqF4tCzRogMwWN"
    },
    {
        id: "aircraft-systems",
        name: "Aircraft General Knowledge",
        code: "CSYA",
        description: "320+ practice questions covering engines, electrical, hydraulics, and avionics",
        priceInCents: 4900,
        type: "one-time",
        features: [
            { icon: Check, text: "320+ questions" },
            { icon: Calendar, text: "12-month access" },
            { icon: BarChart3, text: "Progress tracking" }
        ],
        category: "single",
        subjectId: "aircraft-systems",
        stripeProductId: "prod_TmXqWHx0TeVbYT",
        stripePriceId: "price_1SoykhL8qLbqF4tCaiTgap9i"
    },
    {
        id: "performance-planning",
        name: "Operations, Performance & Flight Planning",
        code: "CFPA",
        description: "270+ practice questions covering weight & balance, takeoff/landing performance",
        priceInCents: 9900,
        type: "one-time",
        features: [
            { icon: Check, text: "270+ questions" },
            { icon: Calendar, text: "12-month access" },
            { icon: BarChart3, text: "Progress tracking" }
        ],
        category: "single",
        subjectId: "performance-planning",
        stripeProductId: "prod_TmXpKKTNT8orAs",
        stripePriceId: "price_1SoyjML8qLbqF4tC4Roq51qh"
    },
]

export const ADDONS: Product[] = [
    {
        id: "addon-printing",
        name: "Printing Feature",
        description: "Print practice exams and results for offline study",
        priceInCents: 900,
        type: "one-time",
        features: [
            { icon: Printer, text: "Print practice exams" },
            { icon: Printer, text: "Print results & reports" },
            { icon: Printer, text: "PDF export" }
        ],
        category: "single",
        stripeProductId: "prod_TmXuSD0Pi7tLhx",
        stripePriceId: "price_1SoyozL8qLbqF4tCTGf5S9nv"
    },
    {
        id: "addon-ai-insights",
        name: "AI Insights",
        description: "AI-powered analysis of your weak points and personalised study recommndations",
        priceInCents: 1400,
        type: "one-time",
        features: [
            { icon: Sparkles, text: "AI-powered analysis" },
            { icon: Sparkles, text: "Personalised study recommendations" },
            { icon: BrainCircuit, text: "Progress predictions" }
        ],
        category: "single",
        stripeProductId: "prod_TmXvaqif78cTwt",
        stripePriceId: "price_1SoyplL8qLbqF4tCJHo6VEAq"
    }
]

export const ALL_PRODUCTS = [
    ...BUNDLES,
    ...SUBJECTS,
    ...ADDONS
]

export function getProductById(id: string): Product | undefined {
    return ALL_PRODUCTS.find(p => p.id === id);
}

export function calculateTotal(productIds: string[]): number {
    const products = productIds
        .map(id => getProductById(id))
        .filter((p): p is Product => p !== undefined);

    const subjectCount = products.filter(p => p.category === "single" && p.subjectId).length;

    return products.reduce((total, product) => {
        if (product.id === "addon-ai-insights") {
            return total + (product.priceInCents * subjectCount);
        }

        return total + product.priceInCents;
    }, 0);
}