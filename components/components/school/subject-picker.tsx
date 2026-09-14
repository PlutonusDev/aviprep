"use client"

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import { LICENSE_TYPES, SUBJECTS } from "@lib/subjects"
import { cn } from "@lib/utils"

/**
 * Choose which subjects a student or group can see.
 *
 * Grouped by licence because that is how a school thinks about it - an intake
 * is doing RPL or CPL, not an arbitrary set - with whole-licence shortcuts so
 * the common case is one click rather than seven.
 */
export function SubjectPicker({
  selected,
  onChange,
  coveredByGroup = [],
  idPrefix = "subjects",
}: {
  selected: string[]
  onChange: (next: string[]) => void
  /** Already granted via a group; shown as read-only context. */
  coveredByGroup?: string[]
  idPrefix?: string
}) {
  const [query, setQuery] = useState("")

  const byLicence = useMemo(() => {
    const q = query.trim().toLowerCase()
    return LICENSE_TYPES.map((licence) => ({
      licence,
      subjects: SUBJECTS.filter(
        (s) =>
          s.licenseType === licence.id &&
          (!q || `${s.name} ${s.code}`.toLowerCase().includes(q)),
      ),
    })).filter((g) => g.subjects.length > 0)
  }, [query])

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id])

  const setLicence = (ids: string[], on: boolean) =>
    onChange(on ? Array.from(new Set([...selected, ...ids])) : selected.filter((s) => !ids.includes(s)))

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Label htmlFor={`${idPrefix}-search`} className="sr-only">
          Search subjects
        </Label>
        <Input
          id={`${idPrefix}-search`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search subjects..."
          className="h-10 pl-9"
        />
      </div>

      <div className="max-h-80 space-y-4 overflow-y-auto rounded-md border border-border p-3">
        {byLicence.map(({ licence, subjects }) => {
          const ids = subjects.map((s) => s.id)
          const allOn = ids.every((id) => selected.includes(id))

          return (
            <fieldset key={licence.id}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {licence.name}
                </legend>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setLicence(ids, !allOn)}
                >
                  {allOn ? "Clear all" : "Select all"}
                </Button>
              </div>

              <div className="space-y-0.5">
                {subjects.map((s) => {
                  const checked = selected.includes(s.id)
                  const viaGroup = coveredByGroup.includes(s.id)
                  return (
                    <label
                      key={s.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted",
                        checked && "bg-primary/5",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(s.id)}
                        className="h-4 w-4 shrink-0 accent-primary"
                      />
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {s.code}
                      </Badge>
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                        {s.name}
                      </span>
                      {viaGroup && (
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          via group
                        </Badge>
                      )}
                    </label>
                  )
                })}
              </div>
            </fieldset>
          )
        })}

        {byLicence.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">No subjects match that.</p>
        )}
      </div>

      <p className="text-xs text-muted-foreground" data-tabular>
        {selected.length} selected
        {coveredByGroup.length > 0 && ` · ${coveredByGroup.length} more via groups`}
      </p>
    </div>
  )
}
