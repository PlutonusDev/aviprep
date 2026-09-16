import type { Metadata } from "next"
import { AdminHome } from "./admin-home"

export const metadata: Metadata = {
  title: "Overview",
}

export default function AdminPage() {
  return <AdminHome />
}
