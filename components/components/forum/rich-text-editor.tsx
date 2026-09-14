"use client"

import type React from "react"

import { useEditor, useEditorState, EditorContent, NodeViewWrapper, type NodeViewProps, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Mention from "@tiptap/extension-mention"
import HardBreak from "@tiptap/extension-hard-break"
import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { useState, useCallback, forwardRef, useImperativeHandle, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Bold,
  Italic,
  UnderlineIcon,
  LinkIcon,
  ImageIcon,
  List,
  ListOrdered,
  Quote,
  Loader2,
  Upload,
  Heading2,
  Heading3,
  Strikethrough,
} from "lucide-react"
import { cn } from "@lib/utils"

const CustomHardBreak = HardBreak.extend({
  renderText() {
    return "\n"
  },
})

function ResizableImageComponent({ node, updateAttributes, selected }: NodeViewProps) {
  const imageRef = useRef<HTMLImageElement>(null)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, direction: string) => {
      e.preventDefault()
      e.stopPropagation()

      const startX = e.clientX
      const startY = e.clientY
      const startWidth = imageRef.current?.offsetWidth || 300
      const startHeight = imageRef.current?.offsetHeight || 200
      const aspectRatio = startWidth / startHeight

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX
        const deltaY = moveEvent.clientY - startY

        let newWidth = startWidth
        let newHeight = startHeight

        if (direction.includes("e")) newWidth = Math.max(100, startWidth + deltaX)
        if (direction.includes("w")) newWidth = Math.max(100, startWidth - deltaX)
        if (direction.includes("s")) newHeight = Math.max(50, startHeight + deltaY)
        if (direction.includes("n")) newHeight = Math.max(50, startHeight - deltaY)

        // Corners keep the aspect ratio.
        if (direction.length === 2) newHeight = newWidth / aspectRatio

        updateAttributes({ width: Math.round(newWidth), height: Math.round(newHeight) })
      }

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    },
    [updateAttributes],
  )

  const handles: { dir: string; className: string }[] = [
    { dir: "se", className: "-right-1 -bottom-1 h-3 w-3 cursor-se-resize" },
    { dir: "sw", className: "-left-1 -bottom-1 h-3 w-3 cursor-sw-resize" },
    { dir: "ne", className: "-right-1 -top-1 h-3 w-3 cursor-ne-resize" },
    { dir: "nw", className: "-left-1 -top-1 h-3 w-3 cursor-nw-resize" },
    { dir: "e", className: "right-0 top-1/2 h-6 w-2 -translate-y-1/2 translate-x-1/2 cursor-e-resize" },
    { dir: "w", className: "left-0 top-1/2 h-6 w-2 -translate-y-1/2 -translate-x-1/2 cursor-w-resize" },
    { dir: "s", className: "bottom-0 left-1/2 h-2 w-6 -translate-x-1/2 translate-y-1/2 cursor-s-resize" },
    { dir: "n", className: "top-0 left-1/2 h-2 w-6 -translate-x-1/2 -translate-y-1/2 cursor-n-resize" },
  ]

  return (
    <NodeViewWrapper className="relative my-2 inline-block">
      <div className={cn("relative inline-block", selected && "rounded ring-2 ring-primary")}>
        <img
          ref={imageRef}
          src={node.attrs.src || "/placeholder.svg"}
          alt={node.attrs.alt || ""}
          width={node.attrs.width || undefined}
          height={node.attrs.height || undefined}
          className="max-w-full rounded-lg"
          style={{
            width: node.attrs.width ? `${node.attrs.width}px` : undefined,
            height: node.attrs.height ? `${node.attrs.height}px` : undefined,
          }}
          draggable={false}
        />
        {selected &&
          handles.map((h) => (
            <div
              key={h.dir}
              className={cn("absolute rounded-full bg-primary", h.className)}
              onMouseDown={(e) => handleMouseDown(e, h.dir)}
            />
          ))}
      </div>
    </NodeViewWrapper>
  )
}

const ResizableImage = Node.create({
  name: "resizableImage",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: null },
      height: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: "img[src]" }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent)
  },

  addCommands() {
    return {
      setResizableImage:
        (options: { src: string; alt?: string; title?: string }) =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs: options })
        },
    } as any
  },
})

type MentionItem = { id: string; label: string }
type SuggestionProps = {
  clientRect?: (() => DOMRect | null) | null
  items: MentionItem[]
  command: (item: MentionItem) => void
}

/** The @mention picker. Plain DOM, since Tiptap drives it outside React. */
function mentionRenderer() {
  let popup: HTMLDivElement | null = null
  let current: SuggestionProps | null = null
  let active = 0

  const draw = () => {
    if (!popup || !current) return
    const rect = current.clientRect?.()
    if (rect) {
      popup.style.left = `${rect.left}px`
      popup.style.top = `${rect.bottom + 6}px`
    }
    popup.replaceChildren()
    if (current.items.length === 0) {
      const empty = document.createElement("div")
      empty.className = "px-3 py-2 text-sm text-muted-foreground"
      empty.textContent = "No one found"
      popup.appendChild(empty)
      return
    }
    current.items.forEach((item, i) => {
      const btn = document.createElement("button")
      btn.type = "button"
      btn.setAttribute("role", "option")
      btn.setAttribute("aria-selected", String(i === active))
      btn.className = cn(
        "block w-full px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted",
        i === active && "bg-muted",
      )
      btn.textContent = item.label
      // mousedown so the editor keeps focus
      btn.onmousedown = (e) => {
        e.preventDefault()
        current?.command(item)
      }
      popup!.appendChild(btn)
    })
  }

  return {
    onStart: (props: SuggestionProps) => {
      current = props
      active = 0
      popup = document.createElement("div")
      popup.setAttribute("role", "listbox")
      popup.className = "fixed z-50 min-w-48 overflow-hidden rounded-md border border-border bg-popover py-1 shadow-e3"
      document.body.appendChild(popup)
      draw()
    },
    onUpdate: (props: SuggestionProps) => {
      current = props
      active = Math.min(active, Math.max(0, props.items.length - 1))
      draw()
    },
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (!current) return false
      if (event.key === "Escape") {
        popup?.remove()
        popup = null
        return true
      }
      if (!current.items.length) return false
      if (event.key === "ArrowDown") {
        active = (active + 1) % current.items.length
        draw()
        return true
      }
      if (event.key === "ArrowUp") {
        active = (active - 1 + current.items.length) % current.items.length
        draw()
        return true
      }
      if (event.key === "Enter" || event.key === "Tab") {
        current.command(current.items[active])
        return true
      }
      return false
    },
    onExit: () => {
      popup?.remove()
      popup = null
      current = null
    },
  }
}

interface RichTextEditorProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
  className?: string
  /** Accessible name for the editing area. */
  label?: string
  /** Focus the editor when it mounts, e.g. after pressing Reply. */
  autoFocus?: boolean
}

export interface RichTextEditorRef {
  getHTML: () => string
  /** True when there's no text and no image. */
  isEmpty: () => boolean
  clearContent: () => void
  setContent: (content: string) => void
  focus: () => void
}

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({ content = "", onChange, placeholder = "Write something...", className, label = "Post content", autoFocus }, ref) => {
    const [showLinkDialog, setShowLinkDialog] = useState(false)
    const [linkUrl, setLinkUrl] = useState("")
    const [linkText, setLinkText] = useState("")
    const [showImageDialog, setShowImageDialog] = useState(false)
    const [imageUrl, setImageUrl] = useState("")
    const [uploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)

    const uploadFile = useCallback(async (file: File): Promise<string | null> => {
      setUploadError(null)
      if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
        setUploadError("Images only: JPEG, PNG, GIF or WebP.")
        return null
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError("That image is over 10MB.")
        return null
      }
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (!res.ok) {
        setUploadError("Upload failed. Try again.")
        return null
      }
      const { url } = await res.json()
      return url
    }, [])

    const insertUploaded = useCallback(
      async (editor: Editor, file: File) => {
        setUploading(true)
        try {
          const url = await uploadFile(file)
          if (url) (editor.chain().focus() as any).setResizableImage({ src: url }).run()
          return !!url
        } catch {
          setUploadError("Upload failed. Try again.")
          return false
        } finally {
          setUploading(false)
        }
      },
      [uploadFile],
    )

    const editor = useEditor({
      immediatelyRender: false,
      autofocus: autoFocus ? "end" : false,
      extensions: [
        // StarterKit v3 already bundles link, underline, headings and lists.
        // Registering them again as separate extensions caused duplicate-name
        // conflicts, so they're configured here instead.
        StarterKit.configure({
          heading: { levels: [2, 3] },
          hardBreak: false,
          codeBlock: false,
          horizontalRule: false,
          link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
          dropcursor: { color: "var(--primary)", width: 2 },
        }),
        CustomHardBreak,
        ResizableImage,
        Placeholder.configure({ placeholder }),
        Mention.configure({
          renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
          suggestion: {
            items: async ({ query }: { query: string }) => {
              if (!query || query.length < 2) return []
              try {
                const res = await fetch(`/api/messages/users/search?q=${encodeURIComponent(query)}`)
                if (!res.ok) return []
                const users = await res.json()
                return users.slice(0, 8).map((u: { id: string; firstName: string; lastName: string }) => ({
                  id: u.id,
                  label: `${u.firstName} ${u.lastName}`,
                }))
              } catch {
                return []
              }
            },
            render: mentionRenderer as any,
          },
        }),
      ],
      content,
      onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
      editorProps: {
        attributes: {
          class: "rich-text min-h-32 px-4 py-3",
          role: "textbox",
          "aria-multiline": "true",
          "aria-label": label,
        },
        handlePaste: (_view, event) => {
          const file = Array.from(event.clipboardData?.items ?? [])
            .find((item) => item.type.startsWith("image/"))
            ?.getAsFile()
          if (!file || !editor) return false
          event.preventDefault()
          insertUploaded(editor, file)
          return true
        },
      },
    })

    // Toolbar state without re-rendering the whole editor on every keystroke.
    const marks = useEditorState({
      editor,
      selector: ({ editor: e }) =>
        e
          ? {
              bold: e.isActive("bold"),
              italic: e.isActive("italic"),
              underline: e.isActive("underline"),
              strike: e.isActive("strike"),
              h2: e.isActive("heading", { level: 2 }),
              h3: e.isActive("heading", { level: 3 }),
              bullet: e.isActive("bulletList"),
              ordered: e.isActive("orderedList"),
              quote: e.isActive("blockquote"),
              link: e.isActive("link"),
            }
          : null,
    })

    useImperativeHandle(ref, () => ({
      getHTML: () => editor?.getHTML() || "",
      isEmpty: () => !editor || (editor.isEmpty && !editor.getHTML().includes("<img")),
      clearContent: () => editor?.commands.clearContent(),
      setContent: (newContent: string) => editor?.commands.setContent(newContent),
      focus: () => editor?.commands.focus("end"),
    }))

    const openLinkDialog = useCallback(() => {
      if (!editor) return
      const { from, to } = editor.state.selection
      setLinkText(editor.state.doc.textBetween(from, to))
      setLinkUrl(editor.getAttributes("link").href ?? "")
      setShowLinkDialog(true)
    }, [editor])

    const insertLink = useCallback(() => {
      if (!editor || !linkUrl) return
      const href = /^(https?:|mailto:|\/)/i.test(linkUrl) ? linkUrl : `https://${linkUrl}`
      const { from, to } = editor.state.selection
      if (from === to && linkText) {
        // Insert as a node, not an HTML string, so the text can't inject markup.
        editor
          .chain()
          .focus()
          .insertContent({ type: "text", text: linkText, marks: [{ type: "link", attrs: { href } }] })
          .run()
      } else {
        editor.chain().focus().extendMarkRange("link").setLink({ href }).run()
      }
      setShowLinkDialog(false)
      setLinkUrl("")
      setLinkText("")
    }, [editor, linkUrl, linkText])

    const handleDrop = useCallback(
      async (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer?.files?.[0]
        if (!file || !editor) return
        if (!file.type.startsWith("image/")) {
          setUploadError("Drop an image file.")
          return
        }
        insertUploaded(editor, file)
      },
      [editor, insertUploaded],
    )

    if (!editor) {
      return <div className={cn("h-44 rounded-lg border border-input bg-background", className)} />
    }

    return (
      <div className={className}>
        <div
          className={cn(
            "relative overflow-hidden rounded-lg border border-input bg-background transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30",
            isDragging && "ring-2 ring-primary",
          )}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes("Files")) return
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/10">
              <span className="flex items-center gap-2 font-medium text-primary">
                <Upload className="h-5 w-5" aria-hidden="true" />
                Drop image here
              </span>
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80" role="status">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Uploading image...
              </span>
            </div>
          )}

          <div
            role="toolbar"
            aria-label="Formatting"
            className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-1.5 py-1"
          >
            <ToolbarButton label="Bold" active={marks?.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
              <Bold className="h-4 w-4" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton label="Italic" active={marks?.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
              <Italic className="h-4 w-4" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
              label="Underline"
              active={marks?.underline}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon className="h-4 w-4" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
              label="Strikethrough"
              active={marks?.strike}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              <Strikethrough className="h-4 w-4" aria-hidden="true" />
            </ToolbarButton>
            <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
            <ToolbarButton
              label="Heading"
              active={marks?.h2}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <Heading2 className="h-4 w-4" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
              label="Subheading"
              active={marks?.h3}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              <Heading3 className="h-4 w-4" aria-hidden="true" />
            </ToolbarButton>
            <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
            <ToolbarButton
              label="Bulleted list"
              active={marks?.bullet}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List className="h-4 w-4" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
              label="Numbered list"
              active={marks?.ordered}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="h-4 w-4" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton label="Quote" active={marks?.quote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
              <Quote className="h-4 w-4" aria-hidden="true" />
            </ToolbarButton>
            <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
            <ToolbarButton label="Link" active={marks?.link} onClick={openLinkDialog}>
              <LinkIcon className="h-4 w-4" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton label="Image" onClick={() => setShowImageDialog(true)}>
              <ImageIcon className="h-4 w-4" aria-hidden="true" />
            </ToolbarButton>
            <span className="ml-auto hidden pr-2 text-xs text-muted-foreground md:inline">@ to mention</span>
          </div>

          <EditorContent editor={editor} />
        </div>

        {uploadError && (
          <p role="alert" className="mt-1.5 text-sm text-destructive">
            {uploadError}
          </p>
        )}

        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add link</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                insertLink()
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="linkUrl">URL</Label>
                <Input
                  id="linkUrl"
                  type="url"
                  inputMode="url"
                  autoFocus
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkText">Text</Label>
                <Input id="linkText" value={linkText} onChange={(e) => setLinkText(e.target.value)} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowLinkDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!linkUrl}>
                  Add link
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add image</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="imageFile">Upload</Label>
                <Input
                  id="imageFile"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  disabled={uploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file && (await insertUploaded(editor, file))) setShowImageDialog(false)
                  }}
                />
              </div>
              <div className="relative text-center text-xs uppercase text-muted-foreground">
                <span className="absolute inset-x-0 top-1/2 border-t border-border" aria-hidden="true" />
                <span className="relative bg-background px-2">or</span>
              </div>
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!imageUrl) return
                  ;(editor.chain().focus() as any).setResizableImage({ src: imageUrl }).run()
                  setShowImageDialog(false)
                  setImageUrl("")
                }}
              >
                <Label htmlFor="imageUrl">Image URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="imageUrl"
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://"
                  />
                  <Button type="submit" disabled={!imageUrl || uploading}>
                    Add
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  },
)

RichTextEditor.displayName = "RichTextEditor"

export default RichTextEditor
