import type { Metadata } from "next"
import CoursesAdminContent from "./courses-admin-content"

export const metadata: Metadata = {
  title: "Course Management | Admin",
  description: "Manage learning courses and lessons",
}

export default function CoursesAdminPage() {
  return <CoursesAdminContent />
}
