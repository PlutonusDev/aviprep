import type { Metadata } from "next"
import { DiagramEditor } from "./diagram-editor"

export const metadata: Metadata = {
  title: "Diagram",
}

export default async function DiagramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DiagramEditor id={id} />
}
