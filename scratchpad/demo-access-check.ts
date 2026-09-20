import { newCode, normaliseCode, hashCode, codeHint, grantStatus } from "../lib/demo/codes"

let bad = 0
const check = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) bad++
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : ` got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`)
}

const codes = Array.from({ length: 5000 }, newCode)
check("shape", /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(codes[0]), true)
check("every code matches", codes.every((c) => /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(c)), true)
check("no ambiguous glyphs", codes.some((c) => /[IO01]/.test(c)), false)
check("no duplicates in 5000", new Set(codes).size, 5000)

check("dashes ignored", normaliseCode("ab12-cd34"), "AB12CD34")
check("case ignored", hashCode("ab12-cd34") === hashCode("AB12CD34"), true)
check("spaces ignored", hashCode(" AB12 CD34 ") === hashCode("AB12-CD34"), true)
check("different codes differ", hashCode("AB12CD34") === hashCode("AB12CD35"), false)
check("hint is last four", codeHint("AB12-CD34"), "CD34")

const soon = new Date(Date.now() + 60000)
const past = new Date(Date.now() - 60000)
check("active", grantStatus({ expiresAt: soon, revokedAt: null }), "active")
check("expired", grantStatus({ expiresAt: past, revokedAt: null }), "expired")
check("revoked beats expiry", grantStatus({ expiresAt: past, revokedAt: new Date() }), "revoked")
check("revoked beats active", grantStatus({ expiresAt: soon, revokedAt: new Date() }), "revoked")

console.log(bad ? `\n${bad} FAILED` : "\nall pass")
