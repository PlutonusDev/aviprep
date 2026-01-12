import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@lib/auth"
import { prisma } from "@lib/prisma"
import { SUBJECTS } from "@lib/products"

function getSubjectById(id) {
    return Object.values(SUBJECTS).find((subject) => subject.id === id)
}

// Sample questions - in production these would come from the database
const SAMPLE_QUESTIONS: Record<
  string,
  Array<{
    id: string
    topic: string
    difficulty: "easy" | "medium" | "hard"
    question: string
    options: string[]
    correctAnswer: number
    explanation: string
  }>
> = {
  aero: [
    {
      id: "aero-1",
      topic: "Lift and Drag",
      difficulty: "medium",
      question: "What happens to the stall speed when an aircraft enters a level turn at 60 degrees of bank?",
      options: [
        "Stall speed decreases by approximately 41%",
        "Stall speed increases by approximately 41%",
        "Stall speed remains unchanged",
        "Stall speed doubles",
      ],
      correctAnswer: 1,
      explanation:
        "In a 60-degree bank turn, the load factor is 2G. Stall speed increases by the square root of the load factor. √2 ≈ 1.41, meaning stall speed increases by approximately 41%.",
    },
    {
      id: "aero-2",
      topic: "Aircraft Performance",
      difficulty: "easy",
      question: "Which factor has the greatest effect on increasing the takeoff distance required?",
      options: ["Low humidity", "High altitude airport", "Headwind", "Low gross weight"],
      correctAnswer: 1,
      explanation:
        "High altitude means lower air density, which reduces engine power and aerodynamic lift, significantly increasing takeoff distance. Low humidity actually helps performance, headwinds reduce ground roll, and lower weight reduces required distance.",
    },
    {
      id: "aero-3",
      topic: "Stability",
      difficulty: "hard",
      question: "An aircraft with positive static stability but negative dynamic stability will:",
      options: [
        "Return directly to its trimmed attitude after a disturbance",
        "Oscillate with increasing amplitude until structural failure",
        "Oscillate with decreasing amplitude and eventually stabilise",
        "Remain in its displaced position",
      ],
      correctAnswer: 1,
      explanation:
        "Positive static stability means the aircraft will initially tend to return to equilibrium. However, negative dynamic stability means the oscillations will increase in amplitude over time, potentially leading to structural failure if not corrected.",
    },
  ],
  met: [
    {
      id: "met-1",
      topic: "Weather Systems",
      difficulty: "medium",
      question: "A pilot flying VFR encounters an area of low pressure. What type of weather should they expect?",
      options: [
        "Clear skies and good visibility",
        "Cloudy conditions with possible precipitation",
        "Fog and mist only",
        "Stable air with little cloud development",
      ],
      correctAnswer: 1,
      explanation:
        "Low pressure systems are associated with rising air, cloud formation, and often precipitation. Convergence at the surface causes air to rise, cool, and condense, forming clouds and potentially causing poor weather conditions.",
    },
    {
      id: "met-2",
      topic: "Wind Shear",
      difficulty: "hard",
      question: "Which of the following is the most dangerous type of wind shear for an aircraft on final approach?",
      options: [
        "Decreasing headwind with increasing altitude",
        "Increasing headwind with decreasing altitude",
        "Decreasing headwind with decreasing altitude",
        "Crosswind component varying with altitude",
      ],
      correctAnswer: 2,
      explanation:
        "A decreasing headwind on final approach (as altitude decreases toward the runway) causes a sudden loss of airspeed and lift. This is particularly dangerous close to the ground where there is little time or altitude to recover.",
    },
    {
      id: "met-3",
      topic: "Icing",
      difficulty: "medium",
      question: "Clear ice is most likely to form on an aircraft when flying through:",
      options: [
        "Cirrus clouds at high altitude",
        "Cumulus clouds with large supercooled water droplets",
        "Stratus clouds at temperatures below -40°C",
        "Fog at temperatures just below freezing",
      ],
      correctAnswer: 1,
      explanation:
        "Clear ice forms when large supercooled water droplets strike the aircraft and freeze slowly, allowing the water to flow before freezing into a clear, smooth ice coating. This is common in cumulus clouds with temperatures between 0°C and -10°C.",
    },
  ],
  nav: [
    {
      id: "nav-1",
      topic: "VOR Navigation",
      difficulty: "medium",
      question: "When tracking TO a VOR on the 090 radial, what heading should you fly in a no-wind situation?",
      options: ["090°", "270°", "180°", "000°"],
      correctAnswer: 1,
      explanation:
        "Radials are always FROM the station. If you're on the 090 radial and tracking TO the VOR, you need to fly the reciprocal heading of 270° to fly toward the station.",
    },
    {
      id: "nav-2",
      topic: "Flight Planning",
      difficulty: "easy",
      question: "A True Airspeed of 120 knots with a 20 knot headwind gives a ground speed of:",
      options: ["140 knots", "120 knots", "100 knots", "110 knots"],
      correctAnswer: 2,
      explanation:
        "Ground speed = True Airspeed ± Wind Component. With a headwind, you subtract the wind speed: 120 - 20 = 100 knots ground speed.",
    },
    {
      id: "nav-3",
      topic: "GPS Navigation",
      difficulty: "hard",
      question: "The minimum number of GPS satellites required for a 3D position fix with altitude is:",
      options: ["2 satellites", "3 satellites", "4 satellites", "5 satellites"],
      correctAnswer: 2,
      explanation:
        "Four satellites are required for a 3D fix: three to determine position in three dimensions (latitude, longitude, altitude) and a fourth to resolve the time offset in the receiver's clock.",
    },
  ],
  law: [
    {
      id: "law-1",
      topic: "Flight Rules",
      difficulty: "easy",
      question:
        "Under CASA regulations, what is the minimum visibility required for VFR flight in Class G airspace below 3000ft AMSL?",
      options: ["3000 metres", "5000 metres", "8000 metres", "1500 metres"],
      correctAnswer: 1,
      explanation:
        "In Class G airspace below 3000ft AMSL, the minimum flight visibility for VFR operations is 5000 metres (5km). This allows pilots adequate time to see and avoid other traffic and terrain.",
    },
    {
      id: "law-2",
      topic: "Licensing",
      difficulty: "medium",
      question: "A CPL holder's licence is valid for flying as pilot in command for:",
      options: [
        "6 months from date of medical examination",
        "Until the pilot's next birthday after the medical expires",
        "The validity period of their medical certificate",
        "5 years from date of issue",
      ],
      correctAnswer: 2,
      explanation:
        "A pilot can only exercise the privileges of their licence while holding a valid medical certificate. The CPL privileges are limited by the validity of the medical certificate.",
    },
    {
      id: "law-3",
      topic: "Air Traffic Services",
      difficulty: "medium",
      question: "When operating in Class C airspace, a pilot must:",
      options: [
        "Only maintain two-way radio contact if requested by ATC",
        "Obtain a clearance and maintain two-way radio communication",
        "Be equipped with a transponder but radio is optional",
        "Follow VFR flight rules only",
      ],
      correctAnswer: 1,
      explanation:
        "Class C airspace is controlled airspace. All aircraft, whether IFR or VFR, must obtain an ATC clearance before entering and maintain continuous two-way radio communication with ATC.",
    },
  ],
  hf: [
    {
      id: "hf-1",
      topic: "Fatigue",
      difficulty: "easy",
      question: "Which of the following is NOT a symptom of fatigue?",
      options: [
        "Decreased attention span",
        "Improved decision making under stress",
        "Slowed reaction time",
        "Poor coordination",
      ],
      correctAnswer: 1,
      explanation:
        "Fatigue impairs cognitive function and does NOT improve decision making. All other options are genuine symptoms of fatigue that pilots should be aware of.",
    },
    {
      id: "hf-2",
      topic: "Hypoxia",
      difficulty: "medium",
      question: "At what altitude does hypoxia typically begin to affect most pilots without supplemental oxygen?",
      options: ["5,000 feet", "10,000 feet", "15,000 feet", "20,000 feet"],
      correctAnswer: 1,
      explanation:
        "While regulations permit flight without oxygen up to 10,000 feet, the effects of hypoxia can begin affecting cognitive function and night vision at altitudes above 5,000 feet, particularly at night.",
    },
    {
      id: "hf-3",
      topic: "Spatial Disorientation",
      difficulty: "hard",
      question: "The 'leans' occur when:",
      options: [
        "The pilot enters IMC conditions",
        "The aircraft accelerates rapidly",
        "The pilot returns to level flight too slowly for the vestibular system to detect",
        "The pilot experiences severe turbulence",
      ],
      correctAnswer: 2,
      explanation:
        "The leans occur when a pilot returns the aircraft to level flight at a rate below the vestibular system's threshold of detection. The pilot feels like they are still in a turn despite being level, creating a compelling illusion.",
    },
  ],
  pof: [
    {
      id: "pof-1",
      topic: "Engines",
      difficulty: "medium",
      question: "Detonation in a piston engine is most likely caused by:",
      options: [
        "Using fuel with a higher octane rating than required",
        "Operating with an excessively rich mixture",
        "High cylinder head temperatures and low fuel octane",
        "Operating at low power settings",
      ],
      correctAnswer: 2,
      explanation:
        "Detonation occurs when fuel ignites spontaneously due to excessive heat and pressure before the spark plug fires. This is promoted by high CHT, low octane fuel, over-leaning, and high power settings.",
    },
    {
      id: "pof-2",
      topic: "Systems",
      difficulty: "easy",
      question: "The purpose of the magneto 'P' lead is to:",
      options: [
        "Provide power to the magneto",
        "Ground the magneto to stop the engine",
        "Connect the magneto to the starter",
        "Regulate magneto timing",
      ],
      correctAnswer: 1,
      explanation:
        "The P-lead grounds the magneto primary circuit, preventing spark generation. When the ignition switch is OFF, the P-lead grounds the magneto. A broken P-lead means the magneto can still produce a spark even with the switch off.",
    },
    {
      id: "pof-3",
      topic: "Flight Instruments",
      difficulty: "medium",
      question: "If the static port becomes blocked during a climb, the altimeter will:",
      options: [
        "Over-read (show higher than actual altitude)",
        "Under-read (show lower than actual altitude)",
        "Remain fixed at the altitude when blockage occurred",
        "Fluctuate randomly",
      ],
      correctAnswer: 2,
      explanation:
        "The altimeter measures the difference between static pressure and a reference pressure. If the static port is blocked during a climb, the trapped static pressure is higher than actual, causing the altimeter to remain at or below the blocked altitude.",
    },
  ],
  ops: [
    {
      id: "ops-1",
      topic: "Weight and Balance",
      difficulty: "medium",
      question: "If an aircraft's centre of gravity is forward of the forward limit:",
      options: [
        "Stall speed will decrease",
        "Greater elevator authority will be required for rotation",
        "The aircraft will be more stable in pitch",
        "Cruise speed will increase",
      ],
      correctAnswer: 1,
      explanation:
        "A forward CG requires more tail-down force to balance the aircraft, meaning more elevator deflection is needed for rotation and flare. While it increases stability, it reduces elevator effectiveness.",
    },
    {
      id: "ops-2",
      topic: "Emergency Procedures",
      difficulty: "easy",
      question: "In the event of an engine failure after takeoff, the pilot's first priority should be:",
      options: [
        "Attempt to restart the engine",
        "Transmit a mayday call",
        "Maintain aircraft control and establish best glide speed",
        "Look for the cause of the failure",
      ],
      correctAnswer: 2,
      explanation:
        "The first priority in any emergency is to fly the aircraft. Maintaining control and establishing best glide speed gives the pilot time and options. Diagnosis and communication come after the aircraft is under control.",
    },
    {
      id: "ops-3",
      topic: "Flight Planning",
      difficulty: "hard",
      question:
        "When calculating fuel requirements, the fixed reserve for VFR day flights in a single-engine aircraft is:",
      options: [
        "30 minutes at normal cruise consumption",
        "45 minutes at normal cruise consumption",
        "30 minutes at holding consumption",
        "Fuel to the alternate plus 45 minutes",
      ],
      correctAnswer: 1,
      explanation:
        "Under CASR Part 91, VFR day flights require a fixed reserve of 30 minutes at normal cruise consumption. This is in addition to taxi fuel, trip fuel, and any variable reserve that may be required.",
    },
  ],
}

export async function GET(request: Request, { params }: { params: Promise<{ subjectId: string }> }) {
  try {
    const { subjectId } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Verify subject exists
    const subject = getSubjectById(subjectId)
    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 })
    }

    // Check if user has access to this subject
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { purchases: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const hasBundleAccess = user.hasBundle && user.bundleExpiry && new Date(user.bundleExpiry) > new Date()
    const hasPurchase = user.purchases.some((p) => p.subjectId === subjectId && new Date(p.expiresAt) > new Date())

    if (!hasBundleAccess && !hasPurchase) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Get questions - use sample questions for now
    const questions = SAMPLE_QUESTIONS[subjectId] || SAMPLE_QUESTIONS.aero

    return NextResponse.json({
      subject,
      questions,
    })
  } catch (error) {
    console.error("Error fetching questions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
