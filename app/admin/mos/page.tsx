import type { Metadata } from "next"
import { MosOverview } from "./mos-overview"

export const metadata: Metadata = {
  title: "MOS coverage",
}

export default function MosCoveragePage() {
  return <MosOverview />
}
