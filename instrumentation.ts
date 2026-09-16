/**
 * Background checks for this long-running server. Next calls register() once
 * when the server starts, in each runtime; the schedule only runs in Node.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  // Opt out with DISABLE_SCHEDULER=true, e.g. when an external cron calls /api/cron/monthly-statements instead.
  if (process.env.DISABLE_SCHEDULER === "true") return

  const { runMonthlyStatements } = await import("./lib/finance/monthly")

  const check = () =>
    runMonthlyStatements().then(
      (outcome) => outcome.ran && console.info("Monthly statements:", outcome.error ?? outcome.result),
      (error) => console.error("Monthly statements check failed:", error),
    )

  // Shortly after start, then hourly. Only the first check after the 1st does any work.
  setTimeout(check, 60_000)
  setInterval(check, 60 * 60_000)
}
