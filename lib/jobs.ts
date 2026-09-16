import "server-only"

import { Prisma } from "@prisma/client"
import { prisma } from "@lib/prisma"

/**
 * Runs a job once per key, across every server instance. Creating the JobRun
 * row is the lock: whoever creates it runs the job; everyone else finds it
 * taken and moves on. A failed run records its error and releases the key, so
 * the next check tries again.
 */
export async function runOnce<T>(key: string, job: () => Promise<T>): Promise<{ ran: boolean; result?: T; error?: string }> {
  try {
    await prisma.jobRun.create({ data: { key } })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { ran: false }
    throw error
  }

  try {
    const result = await job()
    await prisma.jobRun.update({ where: { key }, data: { finishedAt: new Date(), result: (result ?? null) as Prisma.InputJsonValue } })
    return { ran: true, result }
  } catch (error) {
    const message = (error as Error)?.message ?? String(error)
    console.error(`Job ${key} failed:`, error)
    // Free the key so it's retried, keeping a record of what went wrong.
    await prisma.jobRun.update({ where: { key }, data: { key: `${key}:failed:${Date.now()}`, finishedAt: new Date(), error: message } }).catch(() => {})
    return { ran: true, error: message }
  }
}
