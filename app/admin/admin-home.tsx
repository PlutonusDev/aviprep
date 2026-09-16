"use client"

import { useUser } from "@lib/user-context"
import { AdminOverview } from "./admin-overview"
import { CuratorHome } from "./curator-home"

/** Admins get the business overview; curators get their own numbers. */
export function AdminHome() {
  const { user } = useUser()
  return user?.isCurator ? <CuratorHome /> : <AdminOverview />
}
