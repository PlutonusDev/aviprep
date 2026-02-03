import type { Metadata } from "next"
import FlightSchoolsContent from "./flight-schools-content"

export const metadata: Metadata = {
  title: "Flight Schools",
  description: "Manage flight school institutions",
}

export default function FlightSchoolsPage() {
  return <FlightSchoolsContent />
}
