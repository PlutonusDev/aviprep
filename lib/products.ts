export interface Product {
    id: string;
    code?: string;
    name: string;
    description: string;
    priceInCents: number;
    type: "one-time" | "subscription";
    interval?: "money" | "quarter" | "year";
    intervalCount?: number;
    features: string[];
    category: "bundle" | "single";
    subjectId?: string;
}

export const CPL_BUNDLE: Product = {
    id: "cpl-bundle",
    name: "CPL Bundle",
    description: "Full access to all 7 CPL theory subjects with premium features",
    priceInCents: 11000,
    type: "subscription",
    interval: "quarter",
    features: [
        "All 7 theory subjects",
        "Unlimited practice exams",
        "AI-powered insights",
        "Detailed statistics",
        "Print exams & results",
        "Priority support"
    ],
    category: "bundle"
}

export const SUBJECTS: Product[] = [
    {
        id: "aerodynamics",
        name: "Aerodynamics",
        code: "CADA",
        description: "300+ practice questions covering principles of flight, aircraft performance, and stability",
        priceInCents: 5900,
        type: "one-time",
        features: [
            "300+ questions",
            "12-month access",
            "Progress tracking"
        ],
        category: "single",
        subjectId: "aerodynamics"
    },
    {
    id: "meteorology",
    name: "Meteorology",
    code: "CMET",
    description: "280+ practice questions covering weather patterns, forecasting, and aviation weather services",
    priceInCents: 5900,
    type: "one-time",
    features: [
        "280+ questions",
        "12-month access",
        "Progress tracking"
    ],
    category: "single",
    subjectId: "meteorology",
  },
  {
    id: "navigation",
    name: "Navigation",
    code: "CNAV",
    description: "340+ practice questions covering VFR/IFR navigation, flight planning, and instruments",
    priceInCents: 7500,
    type: "one-time",
    features: [
        "340+ questions",
        "12-month access",
        "Progress tracking"
    ],
    category: "single",
    subjectId: "navigation",
  },
  {
    id: "air-law",
    name: "Air Law",
    code: "CLWA",
    description: "290+ practice questions covering CASA regulations, airspace, and procedures",
    priceInCents: 5900,
    type: "one-time",
    features: [
        "290+ questions",
        "12-month access",
        "Progress tracking"
    ],
    category: "single",
    subjectId: "air-law",
  },
  {
    id: "human-factors",
    name: "Human Factors",
    code: "CHUF",
    description: "250+ practice questions covering physiology, psychology, and crew resource management",
    priceInCents: 4900,
    type: "one-time",
    features: [
        "250+ questions",
        "12-month access",
        "Progress tracking"
    ],
    category: "single",
    subjectId: "human-factors",
  },
  {
    id: "aircraft-systems",
    name: "Aircraft General Knowledge",
    code: "CSYA",
    description: "320+ practice questions covering engines, electrical, hydraulics, and avionics",
    priceInCents: 4900,
    type: "one-time",
    features: [
        "320+ questions",
        "12-month access",
        "Progress tracking"
    ],
    category: "single",
    subjectId: "aircraft-systems",
  },
  {
    id: "performance-planning",
    name: "Operations, Performance & Flight Planning",
    code: "CFPA",
    description: "270+ practice questions covering weight & balance, takeoff/landing performance",
    priceInCents: 9900,
    type: "one-time",
    features: [
        "270+ questions",
        "12-month access",
        "Progress tracking"
    ],
    category: "single",
    subjectId: "performance-planning",
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
            "Print exams",
            "Print results & reports",
            "PDF export"
        ],
        category: "single"
    },
    {
        id: "addon-ai-insights",
        name: "AI Insights",
        description: "AI-powered analysis of your weak points and personalised study recommndations",
        priceInCents: 1400,
        type: "one-time",
        features: [
            "Weak point analysis",
            "Personalised study recommendations",
            "Progress predictions"
        ],
        category: "single"
    }
]

export const ALL_PRODUCTS = [
    CPL_BUNDLE,
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