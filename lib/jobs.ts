import "server-only"

import { createHash } from "crypto"
import { Prisma } from "@prisma/client"
import { prisma } from "@lib/prisma"

/**
 * Runs a job once per key, across every server instance.
 *
 * The lock is the JobRun document's _id, derived from the key. MongoDB always
 * enforces _id uniqueness, so this works without relying on a unique index
 * having been created (Prisma only builds those on `prisma db push`). Whoever
 * inserts it runs the job; everyone else gets a duplicate key and moves on.
 *
 * A failed run releases the lock so the next check retries, and keeps a record
 * of the failure under a separate id.
 */

const lockId = (key: string) => createHash("sha256").update(`job:${key}`).digest("hex").slice(0, 24)

const isDuplicate = (error: unknown) =>
  (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") ||
  /E11000|duplicate key/i.test((error as Error)?.message ?? "")

export async function runOnce<T>(key: string, job: () => Promise<T>): Promise<{ ran: boolean; result?: T; error?: string }> {
  const id = lockId(key)
  try {
    await prisma.jobRun.create({ data: { id, key } })
  } catch (error) {
    if (isDuplicate(error)) return { ran: false }
    throw error
  }

  try {
    const result = await job()
    await prisma.jobRun.update({ where: { id }, data: { finishedAt: new Date(), result: (result ?? null) as Prisma.InputJsonValue } })
    return { ran: true, result }
  } catch (error) {
    const message = (error as Error)?.message ?? String(error)
    console.error(`Job ${key} failed:`, error)
    await prisma.jobRun.delete({ where: { id } }).catch(() => {})
    await prisma.jobRun.create({ data: { key: `${key}:failed:${Date.now()}`, finishedAt: new Date(), error: message } }).catch(() => {})
    return { ran: true, error: message }
  }
}

/** Whether a job has finished for this key. */
export async function jobFinishedAt(key: string) {
  const run = await prisma.jobRun.findUnique({ where: { id: lockId(key) }, select: { finishedAt: true } })
  return run?.finishedAt ?? null
}
