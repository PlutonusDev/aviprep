// Static subject definitions - these match the database Subject model
export const SUBJECTS = [
  {
    id: "aerodynamics",
    name: "Aerodynamics",
    code: "AERO",
    description: "Principles of flight, aircraft performance, and aerodynamic forces",
    totalQuestions: 450,
    icon: "Plane",
    priceAud: 4900, // $49
  },
  {
    id: "meteorology",
    name: "Meteorology",
    code: "CMET",
    description: "Weather systems, forecasting, and aviation weather hazards",
    totalQuestions: 520,
    icon: "Cloud",
    priceAud: 5900, // $59
  },
  {
    id: "navigation",
    name: "Navigation",
    code: "CNAV",
    description: "Flight planning, radio navigation, and GPS systems",
    totalQuestions: 480,
    icon: "Compass",
    priceAud: 5500, // $55
  },
  {
    id: "air-law",
    name: "Air Law",
    code: "CLWA",
    description: "Aviation regulations, CASA rules, and operational requirements",
    totalQuestions: 380,
    icon: "Scale",
    priceAud: 3900, // $39
  },
  {
    id: "human-factors",
    name: "Human Factors",
    code: "CHUF",
    description: "Human performance, limitations, and crew resource management",
    totalQuestions: 320,
    icon: "Brain",
    priceAud: 3900, // $39
  },
  {
    id: "aircraft-systems",
    name: "Aircraft General Knowledge",
    code: "CSYA",
    description: "Aircraft systems, flight instruments, and performance theory",
    totalQuestions: 400,
    icon: "Gauge",
    priceAud: 4500, // $45
  },
  {
    id: "performance-planning",
    name: "Operations, Performance & Flight Planning",
    code: "CFPA",
    description: "Operational procedures, flight planning, and safety management",
    totalQuestions: 350,
    icon: "ClipboardList",
    priceAud: 4500, // $45
  },
] as const

export type SubjectId = (typeof SUBJECTS)[number]["id"]

export function getSubjectById(id: string) {
  return SUBJECTS.find((s) => s.id === id)
}

export function getAllSubjects() {
  return SUBJECTS
}
