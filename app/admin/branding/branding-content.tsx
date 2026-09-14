"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Download, Loader2, Check, ImageIcon, Search } from "lucide-react"
import { SUBJECTS, LICENSE_TYPES } from "@lib/subjects"
import { cn } from "@lib/utils"
import {
  ART_PATTERNS,
  LICENSE_PALETTES,
  DEFAULT_PALETTE,
  courseArtDataUri,
  courseArtSvg,
  defaultPatternFor,
  type ArtPattern,
} from "@lib/course-art"

interface CourseRow {
  id: string
  title: string
  subjectId: string
  thumbnail?: string | null
}

const EXPORT_WIDTH = 1200
const EXPORT_HEIGHT = 400

/**
 * A filter box over a scrolling list. There are 27 subjects and more courses
 * than fit a dropdown, so the list stays open and is searched rather than
 * scrolled blindly.
 */
function FilterList<T>({
  label,
  items,
  selectedId,
  getId,
  getLabel,
  getMeta,
  onSelect,
  emptyLabel,
}: {
  label: string
  items: T[]
  selectedId: string
  getId: (item: T) => string
  getLabel: (item: T) => string
  getMeta?: (item: T) => string | undefined
  onSelect: (id: string) => void
  emptyLabel?: string
}) {
  const [query, setQuery] = useState("")
  const id = label.toLowerCase().replace(/\s+/g, "-")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) =>
      `${getLabel(item)} ${getMeta?.(item) ?? ""}`.toLowerCase().includes(q),
    )
  }, [items, query, getLabel, getMeta])

  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-search`}>{label}</Label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id={`${id}-search`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="h-10 pl-9"
        />
      </div>

      <div
        role="listbox"
        aria-label={label}
        className="max-h-56 overflow-y-auto rounded-md border border-border"
      >
        {emptyLabel && (
          <button
            type="button"
            role="option"
            aria-selected={selectedId === "none"}
            onClick={() => onSelect("none")}
            className={cn(
              "block w-full px-3 py-2 text-left text-sm transition-colors",
              selectedId === "none"
                ? "bg-primary/10 font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {emptyLabel}
          </button>
        )}

        {filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matches.</p>
        ) : (
          filtered.map((item) => {
            const itemId = getId(item)
            const active = itemId === selectedId
            return (
              <button
                key={itemId}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => onSelect(itemId)}
                className={cn(
                  "block w-full border-t border-border px-3 py-2 text-left text-sm transition-colors first:border-t-0",
                  active ? "bg-primary/10 font-medium text-foreground" : "hover:bg-muted",
                )}
              >
                <span className="block truncate">{getLabel(item)}</span>
                {getMeta?.(item) && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {getMeta(item)}
                  </span>
                )}
              </button>
            )
          })
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {filtered.length} of {items.length}
      </p>
    </div>
  )
}

export default function BrandingContent() {
  const [subjectId, setSubjectId] = useState(SUBJECTS[0]?.id ?? "")
  const [pattern, setPattern] = useState<ArtPattern | "auto">("auto")
  const [title, setTitle] = useState("")
  const [eyebrow, setEyebrow] = useState("")
  const [courses, setCourses] = useState<CourseRow[]>([])
  const [courseId, setCourseId] = useState<string>("none")
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const statusRef = useRef<HTMLDivElement>(null)

  const subject = useMemo(() => SUBJECTS.find((s) => s.id === subjectId), [subjectId])

  useEffect(() => {
    fetch("/api/admin/branding")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Could not load courses"))))
      .then((d) => setCourses(d.courses ?? []))
      .catch(() => setCourses([]))
  }, [])

  // Fields follow the chosen subject until the admin types over them.
  useEffect(() => {
    if (!subject) return
    setTitle(subject.name)
    const licence = LICENSE_TYPES.find((l) => l.id === subject.licenseType)
    const licenceLabel = licence?.name ?? subject.licenseType?.toUpperCase()
    const parts =
      licenceLabel?.toUpperCase() === subject.code.toUpperCase()
        ? [subject.code]
        : [licenceLabel, subject.code]
    setEyebrow(parts.filter(Boolean).join(" - "))
    setResult(null)
    setError(null)
  }, [subject])

  const artOptions = useMemo(
    () => ({
      title: title || subject?.name || "Untitled",
      code: subject?.code,
      eyebrow: eyebrow || undefined,
      licenseType: subject?.licenseType,
      pattern: pattern === "auto" ? defaultPatternFor(subjectId || "seed") : pattern,
    }),
    [title, eyebrow, subject, pattern, subjectId],
  )

  const previewUri = useMemo(() => courseArtDataUri(artOptions), [artOptions])
  const palette = LICENSE_PALETTES[subject?.licenseType ?? ""] ?? DEFAULT_PALETTE

  /** Rasterises the same SVG the cards use, so export matches preview exactly. */
  async function renderPng(): Promise<Blob> {
    const svg = courseArtSvg({ ...artOptions, width: EXPORT_WIDTH, height: EXPORT_HEIGHT })
    const img = new Image()
    img.crossOrigin = "anonymous"

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error("Could not rasterise the image"))
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    })

    const canvas = document.createElement("canvas")
    canvas.width = EXPORT_WIDTH
    canvas.height = EXPORT_HEIGHT
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas is unavailable")
    ctx.drawImage(img, 0, 0, EXPORT_WIDTH, EXPORT_HEIGHT)

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode PNG"))), "image/png")
    })
  }

  async function handleDownload() {
    setError(null)
    try {
      const blob = await renderPng()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${(subject?.code || "card").toLowerCase()}-card.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed")
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setResult(null)

    try {
      const blob = await renderPng()
      const body = new FormData()
      body.append("file", new File([blob], "card.png", { type: "image/png" }))
      body.append("slug", subject?.code || subjectId || "card")
      if (courseId !== "none") body.append("courseId", courseId)

      const res = await fetch("/api/admin/branding", { method: "POST", body })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upload failed")

      setResult(data.url)
      if (courseId !== "none") {
        setCourses((prev) =>
          prev.map((c) => (c.id === courseId ? { ...c, thumbnail: data.url } : c)),
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setSaving(false)
      statusRef.current?.focus()
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-4 lg:p-8">
      <header className="space-y-1.5">
        <h1 className="text-display-3 font-bold text-foreground">Card artwork</h1>
        <p className="text-muted-foreground">
          Generate branded header images for subject and course cards, then save them to a course.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Preview */}
        <div className="space-y-4">
          <Card className="overflow-hidden p-0 shadow-e2">
            <div className="aspect-[3/1] w-full">
              {/* The preview is the same SVG a card renders, at card proportions. */}
              <img
                src={previewUri}
                alt={`Preview of the ${title || "card"} artwork`}
                className="h-full w-full object-cover"
              />
            </div>
            <CardContent className="flex flex-wrap items-center gap-2 p-4">
              <Badge variant="secondary">{palette.label}</Badge>
              <Badge variant="outline">
                {ART_PATTERNS.find((p) => p.id === artOptions.pattern)?.label}
              </Badge>
              <span className="ml-auto text-xs text-muted-foreground">
                Exports at {EXPORT_WIDTH}×{EXPORT_HEIGHT}
              </span>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleDownload} variant="outline" className="h-11 gap-2">
              <Download className="h-4 w-4" aria-hidden="true" />
              Download PNG
            </Button>
            <Button onClick={handleSave} disabled={saving} className="h-11 gap-2">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Saving...
                </>
              ) : (
                <>
                  <ImageIcon className="h-4 w-4" aria-hidden="true" />
                  {courseId === "none" ? "Save to server" : "Save and assign to course"}
                </>
              )}
            </Button>
          </div>

          <div ref={statusRef} tabIndex={-1} className="outline-none">
            {error && (
              <Alert variant="destructive" role="alert">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {result && (
              <Alert role="status" className="border-success/30 bg-success/10">
                <Check className="h-4 w-4 text-success" aria-hidden="true" />
                <AlertDescription className="break-all">
                  Saved.{" "}
                  <a href={result} target="_blank" rel="noreferrer" className="underline">
                    {result}
                  </a>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        {/* Controls */}
        <Card className="h-fit shadow-e1">
          <CardContent className="space-y-5 p-5">
            <FilterList
              label="Subject"
              items={SUBJECTS}
              selectedId={subjectId}
              getId={(s) => s.id}
              getLabel={(s) => s.name}
              getMeta={(s) => `${s.licenseType.toUpperCase()} · ${s.code}`}
              onSelect={setSubjectId}
            />

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11"
                maxLength={70}
              />
              <p className="text-xs text-muted-foreground">
                The big text. Wraps to three lines and shrinks to fit.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="eyebrow">Eyebrow</Label>
              <Input
                id="eyebrow"
                value={eyebrow}
                onChange={(e) => setEyebrow(e.target.value)}
                className="h-11"
                maxLength={28}
                placeholder="RPL - RBKA"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pattern">Pattern</Label>
              <Select value={pattern} onValueChange={(v) => setPattern(v as ArtPattern | "auto")}>
                <SelectTrigger id="pattern" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automatic</SelectItem>
                  {ART_PATTERNS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-border pt-5">
              <FilterList
                label="Assign to course"
                items={courses}
                selectedId={courseId}
                getId={(c) => c.id}
                getLabel={(c) => c.title}
                getMeta={(c) => `${c.subjectId}${c.thumbnail ? " · has artwork" : ""}`}
                onSelect={setCourseId}
                emptyLabel="Don't assign"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Saving writes the image URL to the course thumbnail.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
