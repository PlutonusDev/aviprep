# -*- coding: utf-8 -*-
"""Finishing a question sends you back to the MOS item you started from."""
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


# --- The question editor remembers where it was opened from -----------------
edit("app/admin/questions/questions-content.tsx", [
    ('''  const [deleteId, setDeleteId] = useState<string | null>(null)''',
     '''  const [deleteId, setDeleteId] = useState<string | null>(null)
  /**
   * Where to go when they're done. Arriving from MOS coverage means they were
   * working through one unit; dropping them in the question bank afterwards
   * loses their place in it.
   */
  const [returnTo, setReturnTo] = useState<string | null>(null)'''),

    ('''    const editId = searchParams.get("edit")
    const itemId = searchParams.get("mos")
    router.replace("/admin/questions", { scroll: false })''',
     '''    const editId = searchParams.get("edit")
    const itemId = searchParams.get("mos")
    // Captured before the URL is cleaned up, so Back and Save know the way home.
    if (itemId) setReturnTo(`/admin/mos/${target}?item=${encodeURIComponent(itemId)}`)
    router.replace("/admin/questions", { scroll: false })'''),

    ('''      // Keeping the topic and difficulty makes writing a run of questions quick.
      setEditing(
        addAnother
          ? { ...BLANK, subjectId, topic: payload.topic, difficulty: payload.difficulty }
          : null,
      )''',
     '''      if (addAnother) {
        // Keeping the topic and difficulty makes writing a run of questions quick.
        setEditing({ ...BLANK, subjectId, topic: payload.topic, difficulty: payload.difficulty })
      } else if (returnTo) {
        router.push(returnTo)
      } else {
        setEditing(null)
      }'''),
])

# Back and Cancel follow the same route home.
s = io.open("app/admin/questions/questions-content.tsx", encoding="utf-8").read()
old = '''          <Button
            variant="ghost"
            onClick={() => setEditing(null)}
            className="-ml-2 h-9 shrink-0 gap-1.5 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {subject?.code}
          </Button>'''
new = '''          <Button
            variant="ghost"
            onClick={() => (returnTo ? router.push(returnTo) : setEditing(null))}
            className="-ml-2 h-9 shrink-0 gap-1.5 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {returnTo ? "Question bank" : subject?.code}
          </Button>'''
assert old in s
s = s.replace(old, new, 1)

old = '''          onCancel={() => {
            setEditing(null)
            setOriginal(null)
          }}'''
new = '''          onCancel={() => {
            setOriginal(null)
            if (returnTo) router.push(returnTo)
            else setEditing(null)
          }}'''
assert old in s
s = s.replace(old, new, 1)
io.open("app/admin/questions/questions-content.tsx", "w", encoding="utf-8").write(s)
print("ok back/cancel")
