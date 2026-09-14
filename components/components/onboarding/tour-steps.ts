import type { TenantFeature } from "@lib/tenant-features"

export interface TourStep {
  id: string
  title: string
  body: string
  /**
   * `data-tour` value of the element to spotlight. Omit for a centred step with
   * no anchor - used for the opening and closing cards.
   */
  target?: string
  /** Skipped when the school has switched this feature off. */
  feature?: TenantFeature
  /** Where to send the reader if they want to act on this step now. */
  action?: { label: string; href: string }
}

/**
 * AviPrep's own customers: they choose and buy subjects themselves, so the
 * story runs pick a subject -> practise -> read the feedback -> keep going.
 */
export const MAIN_TOUR: TourStep[] = [
  {
    id: "welcome",
    title: "Quick look around?",
    body: "Under a minute. Skip it whenever you like — it's in Settings if you want it later.",
  },
  {
    id: "subjects",
    title: "Pick your subjects",
    body: "Each CASA subject is sold on its own, or take the whole licence as a bundle and save.",
    target: "nav-pricing",
    action: { label: "Browse subjects", href: "/dashboard/pricing" },
  },
  {
    id: "learn",
    title: "Then work through the course",
    body: "Lessons, flash cards and quizzes, in order. Close the tab mid-lesson and you'll come back to the same spot.",
    target: "nav-learn",
    feature: "learn",
  },
  {
    id: "exams",
    title: "Practise until it sticks",
    body: "One subject at a time, or mix them for a full mock. Answer a question and you get the reasoning, not just a tick or a cross.",
    target: "nav-exams",
  },
  {
    id: "insights",
    title: "Find the gaps",
    body: "Results break down by topic, so a bad score tells you what to revise instead of just how you did.",
    target: "nav-insights",
    feature: "insights",
  },
  {
    id: "resume",
    title: "Start here each time",
    body: "Your dashboard opens on whatever you were last doing, plus the topic worth a look next.",
    target: "dashboard-resume",
  },
  {
    id: "done",
    title: "That's it",
    body: "Buy a subject, work through the lessons, then practise until the scores hold. Good luck with the exams.",
  },
]

/**
 * School students: subjects are assigned by their school, so there is no buying
 * step and no point showing them anything they cannot reach.
 */
export const STUDENT_TOUR: TourStep[] = [
  {
    id: "welcome",
    title: "Quick look around?",
    body: "Under a minute. Skip it whenever you like — it's in Settings if you want it later.",
  },
  {
    id: "assigned",
    title: "Your school picks your subjects",
    body: "Whatever they've assigned shows up here on its own. If something's missing, they're the ones to ask.",
    target: "nav-exams",
  },
  {
    id: "learn",
    title: "Work through the course",
    body: "Lessons, flash cards and quizzes, in order. Close the tab mid-lesson and you'll come back to the same spot.",
    target: "nav-learn",
    feature: "learn",
  },
  {
    id: "exams",
    title: "Practise until it sticks",
    body: "Sit as many practice exams as you want. Answer a question and you get the reasoning, not just a tick or a cross.",
    target: "nav-exams",
  },
  {
    id: "insights",
    title: "Find the gaps",
    body: "Results break down by topic, so a bad score tells you what to revise instead of just how you did.",
    target: "nav-insights",
    feature: "insights",
  },
  {
    id: "resume",
    title: "Start here each time",
    body: "Your dashboard opens on whatever you were last doing, plus the topic worth a look next.",
    target: "dashboard-resume",
  },
  {
    id: "done",
    title: "That's it",
    body: "Work through the lessons, then practise until the scores hold. Your instructors can see how you're going too.",
  },
]

/** Drops steps whose feature is off, or whose target is not on the page. */
export function resolveSteps(
  steps: TourStep[],
  { disabledFeatures, hasTarget }: { disabledFeatures: string[]; hasTarget: (key: string) => boolean },
): TourStep[] {
  return steps.filter((step) => {
    if (step.feature && disabledFeatures.includes(step.feature)) return false
    // A step pointing at something that is not rendered would spotlight nothing.
    if (step.target && !hasTarget(step.target)) return false
    return true
  })
}
