"use client"

import { useMemo, useState } from "react"
import { Check, Search, Users } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@lib/utils"

/**
 * Choosing students for a group.
 *
 * A searchable list of the whole roster with a tick against everyone in. Each
 * row carries the other groups that student is already in, because the usual
 * mistake is putting someone in two intakes without realising.
 */

export interface PickableStudent {
  id: string
  firstName: string
  lastName: string
  email: string
  /** Groups they're in besides the one being edited. */
  otherGroups?: { id: string; name: string; color: string }[]
}

export function MemberPicker({
  students,
  selected,
  onChange,
  idPrefix = "members",
}: {
  students: PickableStudent[]
  selected: string[]
  onChange: (ids: string[]) => void
  idPrefix?: string
}) {
  const [query, setQuery] = useState("")
  const chosen = useMemo(() => new Set(selected), [selected])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return students
    return students.filter((s) => `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(q))
  }, [students, query])

  const toggle = (id: string) => onChange(chosen.has(id) ? selected.filter((x) => x !== id) : [...selected, id])

  // Acts on what's on screen, so it reads the same whether or not you've searched.
  const visibleIds = matches.map((s) => s.id)
  const allVisibleIn = visibleIds.length > 0 && visibleIds.every((id) => chosen.has(id))
  const toggleVisible = () =>
    onChange(allVisibleIn ? selected.filter((id) => !visibleIds.includes(id)) : [...new Set([...selected, ...visibleIds])])

  if (students.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
        <Users className="mx-auto mb-2 h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">No students yet. Add some first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            aria-label="Search students"
            className="h-10 pl-9"
          />
        </div>
        <button
          type="button"
          onClick={toggleVisible}
          disabled={visibleIds.length === 0}
          className="shrink-0 rounded-md px-2 py-1.5 text-sm font-medium text-primary hover:underline disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {allVisibleIn ? "Clear" : query ? `Select these ${visibleIds.length}` : "Select all"}
        </button>
      </div>

      <div className="max-h-[22rem] overflow-y-auto rounded-lg border border-border">
        {matches.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-muted-foreground">Nobody matches &ldquo;{query}&rdquo;.</p>
        ) : (
          <ul>
            {matches.map((s) => {
              const isIn = chosen.has(s.id)
              return (
                <li key={s.id} className="border-t border-border first:border-t-0">
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/60",
                      isIn && "bg-primary/5",
                    )}
                  >
                    <input
                      type="checkbox"
                      id={`${idPrefix}-${s.id}`}
                      checked={isIn}
                      onChange={() => toggle(s.id)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                        isIn ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background",
                      )}
                    >
                      {isIn && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {s.firstName} {s.lastName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{s.email}</span>
                    </span>
                    {s.otherGroups && s.otherGroups.length > 0 && (
                      <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
                        {s.otherGroups.slice(0, 2).map((g) => (
                          <span
                            key={g.id}
                            title={`Also in ${g.name}`}
                            className="flex items-center gap-1 rounded border border-border bg-muted/60 px-1.5 py-px text-[11px] text-muted-foreground"
                          >
                            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: g.color }} />
                            <span className="max-w-[7rem] truncate">{g.name}</span>
                          </span>
                        ))}
                        {s.otherGroups.length > 2 && (
                          <span className="text-[11px] text-muted-foreground">+{s.otherGroups.length - 2}</span>
                        )}
                      </span>
                    )}
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <p aria-live="polite" className="text-xs text-muted-foreground">
        {selected.length} of {students.length} selected
      </p>
    </div>
  )
}
