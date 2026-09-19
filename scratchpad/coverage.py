# -*- coding: utf-8 -*-
"""Covered now means questions AND a lesson, and says which one is missing."""
import io
import sys


def edit(path, pairs):
    s = io.open(path, encoding="utf-8").read()
    for old, new in pairs:
        if old not in s:
            print("MISS:", path, "|", old[:90])
            sys.exit(1)
        s = s.replace(old, new, 1)
    io.open(path, "w", encoding="utf-8").write(s)
    print("ok", path)


edit("lib/mos/coverage.ts", [
    ('''  /** Mapped, but with fewer live questions than MIN_QUESTIONS_PER_ITEM. */''',
     '''  /** Mapped, but not yet fully covered. See `needs` for what's outstanding. */'''),

    ('''    let status: MosStatus
    if (i.excluded) {
      status = "excluded"
      excluded++
    } else if (live + liveLessons > 0) {
      mapped++
      if (live < MIN_QUESTIONS_PER_ITEM) {
        status = "low"
        lowDensity++
      } else status = "covered"
    } else if (drafts + lessons.length > 0) {
      status = "draft"
      draftOnly++
    } else status = "missing"''',
     '''    // An item is only covered once a student can both read about it and be
    // tested on it. Questions without a lesson leave nothing to learn from;
    // a lesson without questions is never examined.
    const needs: ItemCoverage["needs"] = []
    if (live < MIN_QUESTIONS_PER_ITEM) needs.push("questions")
    if (liveLessons === 0) needs.push("lesson")

    let status: MosStatus
    if (i.excluded) {
      status = "excluded"
      excluded++
    } else if (live + liveLessons > 0) {
      mapped++
      if (needs.length) {
        status = "low"
        lowDensity++
      } else status = "covered"
    } else if (drafts + lessons.length > 0) {
      status = "draft"
      draftOnly++
    } else status = "missing"'''),

    ('''      status,
      liveQuestions: live,
      draftQuestions: drafts,
      lessons,
    }''',
     '''      status,
      needs: i.excluded ? [] : needs,
      liveQuestions: live,
      draftQuestions: drafts,
      lessons,
    }'''),
])

# The shape the UI reads.
s = io.open("lib/mos/coverage.ts", encoding="utf-8").read()
anchor = "  status: MosStatus\n"
assert anchor in s
s = s.replace(
    anchor,
    "  status: MosStatus\n  /** What's still outstanding: live questions, a live lesson, or both. */\n  needs: (\"questions\" | \"lesson\")[]\n",
    1,
)
io.open("lib/mos/coverage.ts", "w", encoding="utf-8").write(s)
print("ok ItemCoverage.needs")

edit("lib/mos/subjects.ts", [
    ('''  covered: "Covered",
  low: "Low on questions",''',
     '''  covered: "Covered",
  low: "Partly covered",'''),
])

edit("components/components/admin/mos-ui.tsx", [
    ('''    { status: "low", label: "Low on questions" },''',
     '''    { status: "low", label: "Partly covered" },'''),
])

edit("app/admin/mos/[subjectId]/mos-subject.tsx", [
    ('''  { id: "low", label: "Low on questions", match: (s) => s === "low" },''',
     '''  { id: "low", label: "Partly covered", match: (s) => s === "low" },'''),
])
