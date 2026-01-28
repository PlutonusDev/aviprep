export interface License {
  readonly id: string
  readonly name: string
  readonly fullName: string
  readonly description: string
  readonly available: boolean
  readonly comingSoon?: boolean // Mark as optional
  readonly order: number
}

export interface RawSubject {
  id: string
  name: string
  code: string
  licenseType: LicenseType
  description: string
  totalQuestions: number
  icon: string
  examOnlyPriceAud: number
  withLearningPriceAud: number
  comingSoon?: boolean // Add this since some subjects use it
}

// License types with availability
export const LICENSE_TYPES: License[] = [
  {
    id: "rpl",
    name: "RPL",
    fullName: "Recreational Pilot License",
    description: "Start your aviation journey with recreational flying privileges",
    available: true,
    order: 1,
  },
  {
    id: "ppl",
    name: "PPL",
    fullName: "Private Pilot License",
    description: "Fly privately with passengers for non-commercial purposes",
    available: true,
    order: 2,
  },
  {
    id: "cpl",
    name: "CPL",
    fullName: "Commercial Pilot License",
    description: "Get paid to fly - the gateway to a professional aviation career",
    available: true,
    order: 3,
  },
  {
    id: "irex",
    name: "IREX",
    fullName: "Instrument Rating Exam",
    description: "Master instrument flying for all-weather operations",
    available: false,
    comingSoon: true,
    order: 4,
  },
  {
    id: "atpl",
    name: "ATPL",
    fullName: "Air Transport Pilot License",
    description: "The highest level of pilot certification for airline pilots",
    available: false,
    comingSoon: true,
    order: 5,
  },
]

export type LicenseType = (typeof LICENSE_TYPES)[number]["id"]

// Subjects organized by license type
export const SUBJECTS: RawSubject[] = [
  // RPL Subjects
  {
    id: "rpl-agk",
    name: "RPL Basic Aeronautical Knowledge (A)",
    code: "RBKA",
    licenseType: "rpl" as LicenseType,
    description: "Fundamental principles of flight and aircraft operations",
    totalQuestions: 180,
    icon: "Plane",
    examOnlyPriceAud: 2900,
    withLearningPriceAud: 4900,
  },
  {
    id: "rpl-air-law",
    name: "RPL Air Law",
    code: "RFRC",
    licenseType: "rpl" as LicenseType,
    description: "Aviation regulations for recreational pilots",
    totalQuestions: 150,
    icon: "Scale",
    examOnlyPriceAud: 2500,
    withLearningPriceAud: 3900,
  },
  {
    id: "rpl-met",
    name: "RPL Meteorology",
    code: "RMTC",
    licenseType: "rpl" as LicenseType,
    description: "Meteorology basics for safe flying",
    totalQuestions: 120,
    icon: "Brain",
    examOnlyPriceAud: 2500,
    withLearningPriceAud: 3900,
  },
  {
    id: "rpl-radio",
    name: "RPL Radio Operator",
    code: "RARO",
    licenseType: "rpl" as LicenseType,
    description: "Operation of radio equipment for recreational pilots",
    totalQuestions: 120,
    icon: "Radio",
    examOnlyPriceAud: 2500,
    withLearningPriceAud: 3900,
  },
  // PPL Subjects
  {
    id: "ppl-agk",
    name: "PPL General Aeronautical Knowledge (A)",
    code: "PAKA",
    licenseType: "ppl" as LicenseType,
    description: "Intermediate principles of flight and aircraft operations",
    totalQuestions: 180,
    icon: "Plane",
    examOnlyPriceAud: 2900,
    withLearningPriceAud: 4900,
  },
  {
    id: "ppl-meteorology",
    name: "PPL Meteorology",
    code: "PMTC",
    licenseType: "ppl" as LicenseType,
    description: "Weather systems and aviation forecasting",
    totalQuestions: 260,
    icon: "Cloud",
    examOnlyPriceAud: 3500,
    withLearningPriceAud: 5500,
  },
  {
    id: "ppl-navigation",
    name: "PPL Navigation",
    code: "PNVC",
    licenseType: "ppl" as LicenseType,
    description: "Visual navigation and basic flight planning",
    totalQuestions: 300,
    icon: "Compass",
    examOnlyPriceAud: 3900,
    withLearningPriceAud: 5900,
  },
  {
    id: "ppl-air-law",
    name: "PPL Air Law (A)",
    code: "PFRA",
    licenseType: "ppl" as LicenseType,
    description: "CASA regulations and airspace rules",
    totalQuestions: 240,
    icon: "Scale",
    examOnlyPriceAud: 3200,
    withLearningPriceAud: 4900,
  },
  {
    id: "ppl-human-factors",
    name: "PPL Human Factors",
    code: "PHFC",
    licenseType: "ppl" as LicenseType,
    description: "Human performance and limitations",
    totalQuestions: 200,
    icon: "Brain",
    examOnlyPriceAud: 2900,
    withLearningPriceAud: 4500,
  },
  {
    id: "ppl-operations",
    name: "PPL Aircraft Systems",
    code: "POPA",
    licenseType: "ppl" as LicenseType,
    description: "Aircraft performance and flight planning",
    totalQuestions: 220,
    icon: "Gauge",
    examOnlyPriceAud: 3200,
    withLearningPriceAud: 4900,
  },
  // CPL Subjects
  {
    id: "cpl-agk",
    name: "CPL Aircraft Systems (A)",
    code: "CAKA",
    licenseType: "cpl" as LicenseType,
    description: "Complex aircraft systems and avionics",
    totalQuestions: 450,
    icon: "Plane",
    examOnlyPriceAud: 4500,
    withLearningPriceAud: 6900,
  },
  {
    id: "cpl-aerodynamics",
    name: "CPL Aerodynamics (A)",
    code: "CADA",
    licenseType: "cpl" as LicenseType,
    description: "Advanced principles of flight and performance theory",
    totalQuestions: 450,
    icon: "Plane",
    examOnlyPriceAud: 4500,
    withLearningPriceAud: 6900,
  },
  {
    id: "cpl-meteorology",
    name: "CPL Meteorology",
    code: "CMTC",
    licenseType: "cpl" as LicenseType,
    description: "Advanced weather systems and aviation meteorology",
    totalQuestions: 520,
    icon: "Cloud",
    examOnlyPriceAud: 4900,
    withLearningPriceAud: 7500,
  },
  {
    id: "cpl-navigation",
    name: "CPL Navigation",
    code: "CNVC",
    licenseType: "cpl" as LicenseType,
    description: "Advanced navigation and flight planning",
    totalQuestions: 580,
    icon: "Compass",
    examOnlyPriceAud: 5500,
    withLearningPriceAud: 8500,
  },
  {
    id: "cpl-air-law",
    name: "CPL Air Law (A)",
    code: "CFRA",
    licenseType: "cpl" as LicenseType,
    description: "Commercial aviation regulations and procedures",
    totalQuestions: 420,
    icon: "Scale",
    examOnlyPriceAud: 4200,
    withLearningPriceAud: 6500,
  },
  {
    id: "cpl-human-factors",
    name: "CPL Human Factors",
    code: "CHFC",
    licenseType: "cpl" as LicenseType,
    description: "CRM, TEM, physiology, and human performance",
    totalQuestions: 380,
    icon: "Brain",
    examOnlyPriceAud: 3900,
    withLearningPriceAud: 5900,
  },
  {
    id: "cpl-flight-planning",
    name: "CPL Flight Planning (A)",
    code: "COPA",
    licenseType: "cpl" as LicenseType,
    description: "Weight & balance, performance calculations",
    totalQuestions: 490,
    icon: "Calculator",
    examOnlyPriceAud: 4900,
    withLearningPriceAud: 7500,
  },
  // IREX Subjects (Coming Soon)
  {
    id: "irex-rating",
    name: "IREX Instrument Rating",
    code: "IREX",
    licenseType: "irex" as LicenseType,
    description: "Radio navigation and IFR flight planning",
    totalQuestions: 0,
    icon: "Radio",
    examOnlyPriceAud: 5500,
    withLearningPriceAud: 8500,
    comingSoon: true,
  },
  // ATPL Subjects (Coming Soon)
  {
    id: "atpl-performance",
    name: "ATPL Performance & Loading (A)",
    code: "APLA",
    licenseType: "atpl" as LicenseType,
    description: "Multi-engine performance and jet operations",
    totalQuestions: 0,
    icon: "TrendingUp",
    examOnlyPriceAud: 6500,
    withLearningPriceAud: 9900,
    comingSoon: true,
  },
  {
    id: "atpl-systems",
    name: "ATPL General Knowledge (A)",
    code: "AAGA",
    licenseType: "atpl" as LicenseType,
    description: "Advanced aircraft systems for airline operations",
    totalQuestions: 0,
    icon: "Cog",
    examOnlyPriceAud: 6500,
    withLearningPriceAud: 9900,
    comingSoon: true,
  },
  {
    id: "atpl-air-law",
    name: "ATPL Air Law (A)",
    code: "AFRA",
    licenseType: "atpl" as LicenseType,
    description: "Part 122 aviation regulations and procedures",
    totalQuestions: 420,
    icon: "Scale",
    examOnlyPriceAud: 8500,
    withLearningPriceAud: 11500,
    comingSoon: true,
  },
  {
    id: "atpl-human-factors",
    name: "ATPL Human Factors",
    code: "AHFC",
    licenseType: "atpl" as LicenseType,
    description: "Advanced CRM, TEM, physiology, and human performance",
    totalQuestions: 420,
    icon: "Brain",
    examOnlyPriceAud: 5500,
    withLearningPriceAud: 8000,
    comingSoon: true,
  },
  {
    id: "atpl-navigation",
    name: "ATPL Navigation (A)",
    code: "ANVA",
    licenseType: "atpl" as LicenseType,
    description: "Advanced navigation and flight planning",
    totalQuestions: 420,
    icon: "Calculator",
    examOnlyPriceAud: 5500,
    withLearningPriceAud: 8000,
    comingSoon: true,
  },
  {
    id: "atpl-meteorology",
    name: "ATPL Meteorology (A)",
    code: "AMTA",
    licenseType: "atpl" as LicenseType,
    description: "Advanced weather systems and aviation forecasting",
    totalQuestions: 420,
    icon: "Cloud",
    examOnlyPriceAud: 5500,
    withLearningPriceAud: 8000,
    comingSoon: true,
  },
  {
    id: "atpl-flight-planning",
    name: "ATPL Flight Planning (A)",
    code: "AFPA",
    licenseType: "atpl" as LicenseType,
    description: "Advanced weight & balance, performance calculations",
    totalQuestions: 420,
    icon: "Calculator",
    examOnlyPriceAud: 5500,
    withLearningPriceAud: 8000,
    comingSoon: true,
  }
]

export type SubjectId = (typeof SUBJECTS)[number]["id"]

export function getSubjectById(id: string) {
  return SUBJECTS.find((s) => s.id === id)
}

export function getSubjectsByLicense(licenseType: LicenseType) {
  return SUBJECTS.filter((s) => s.licenseType === licenseType)
}

export function getLicenseById(id: string) {
  return LICENSE_TYPES.find((l) => l.id === id)
}

export function getAllSubjects() {
  return SUBJECTS
}

// Alias for backward compatibility
export const ALL_SUBJECTS = SUBJECTS

export function getAvailableLicenses() {
  return LICENSE_TYPES.filter((l) => l.available)
}

export function getAllLicenses() {
  return LICENSE_TYPES
}
