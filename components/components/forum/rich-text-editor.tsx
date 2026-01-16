"use client"

import type React from "react"

import { useEditor, EditorContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import Mention from "@tiptap/extension-mention"
import BulletList from "@tiptap/extension-bullet-list"
import OrderedList from "@tiptap/extension-ordered-list"
import ListItem from "@tiptap/extension-list-item"
import Blockquote from "@tiptap/extension-blockquote"
import Dropcursor from "@tiptap/extension-dropcursor"
import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { useState, useCallback, forwardRef, useImperativeHandle, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
} from "lucide-react"

function ResizableImageComponent({ node, updateAttributes, selected }: NodeViewProps) {
  const [isResizing, setIsResizing] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, direction: string) => {
      e.preventDefault()
      e.stopPropagation()
      setIsResizing(true)

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

        if (direction.includes("e")) {
          newWidth = Math.max(100, startWidth + deltaX)
        }
        if (direction.includes("w")) {
          newWidth = Math.max(100, startWidth - deltaX)
        }
        if (direction.includes("s")) {
          newHeight = Math.max(50, startHeight + deltaY)
        }
        if (direction.includes("n")) {
          newHeight = Math.max(50, startHeight - deltaY)
        }

        // Maintain aspect ratio when dragging corners
        if (direction.length === 2) {
          newHeight = newWidth / aspectRatio
        }

        updateAttributes({ width: Math.round(newWidth), height: Math.round(newHeight) })
      }

      const handleMouseUp = () => {
        setIsResizing(false)
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    },
    [updateAttributes],
  )

  return (
    <NodeViewWrapper className="relative inline-block my-2">
      <div className={`relative inline-block ${selected ? "ring-2 ring-primary rounded" : ""}`}>
        <img
          ref={imageRef}
          src={node.attrs.src || "/placeholder.svg"}
          alt={node.attrs.alt || ""}
          width={node.attrs.width || undefined}
          height={node.attrs.height || undefined}
          className="rounded-lg max-w-full"
          style={{
            width: node.attrs.width ? `${node.attrs.width}px` : undefined,
            height: node.attrs.height ? `${node.attrs.height}px` : undefined,
          }}
          draggable={false}
        />
        {selected && (
          <>
            {/* Resize handles */}
            <div
              className="absolute -right-1 -bottom-1 w-3 h-3 bg-primary rounded-full cursor-se-resize"
              onMouseDown={(e) => handleMouseDown(e, "se")}
            />
            <div
              className="absolute -left-1 -bottom-1 w-3 h-3 bg-primary rounded-full cursor-sw-resize"
              onMouseDown={(e) => handleMouseDown(e, "sw")}
            />
            <div
              className="absolute -right-1 -top-1 w-3 h-3 bg-primary rounded-full cursor-ne-resize"
              onMouseDown={(e) => handleMouseDown(e, "ne")}
            />
            <div
              className="absolute -left-1 -top-1 w-3 h-3 bg-primary rounded-full cursor-nw-resize"
              onMouseDown={(e) => handleMouseDown(e, "nw")}
            />
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-6 bg-primary rounded-full cursor-e-resize"
              onMouseDown={(e) => handleMouseDown(e, "e")}
            />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-6 bg-primary rounded-full cursor-w-resize"
              onMouseDown={(e) => handleMouseDown(e, "w")}
            />
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-6 h-2 bg-primary rounded-full cursor-s-resize"
              onMouseDown={(e) => handleMouseDown(e, "s")}
            />
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-2 bg-primary rounded-full cursor-n-resize"
              onMouseDown={(e) => handleMouseDown(e, "n")}
            />
          </>
        )}
      </div>
      {selected && node.attrs.width && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground bg-background/90 px-2 py-0.5 rounded">
          {node.attrs.width} x {node.attrs.height}px
        </div>
      )}
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
    return ["img", mergeAttributes(HTMLAttributes, { class: "rounded-lg max-w-full" })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent)
  },

  addCommands() {
    return {
      setResizableImage:
        (options: { src: string; alt?: string; title?: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          })
        },
    }
  },
})

interface RichTextEditorProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
  className?: string
}

export interface RichTextEditorRef {
  getHTML: () => string
  clearContent: () => void
  setContent: (content: string) => void
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({ content = "", onChange, placeholder = "Write something...", className }, ref) => {
    const [showLinkDialog, setShowLinkDialog] = useState(false)
    const [linkUrl, setLinkUrl] = useState("")
    const [linkText, setLinkText] = useState("")
    const [showImageDialog, setShowImageDialog] = useState(false)
    const [imageUrl, setImageUrl] = useState("")
    const [uploading, setUploading] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const editorContainerRef = useRef<HTMLDivElement>(null)

    const uploadFile = useCallback(async (file: File): Promise<string | null> => {
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
      if (!allowedTypes.includes(file.type)) {
        alert("Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.")
        return null
      }
      if (file.size > 5 * 1024 * 1024) {
        alert("File too large. Maximum size is 5MB.")
        return null
      }

      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      if (!res.ok) throw new Error("Upload failed")
      const { url } = await res.json()
      return url
    }, [])

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          bulletList: false,
          orderedList: false,
          listItem: false,
          blockquote: false,
        }),
        BulletList.configure({
          HTMLAttributes: {
            class: "list-disc ml-4 my-2",
          },
        }),
        OrderedList.configure({
          HTMLAttributes: {
            class: "list-decimal ml-4 my-2",
          },
        }),
        ListItem.configure({
          HTMLAttributes: {
            class: "my-1",
          },
        }),
        Blockquote.configure({
          HTMLAttributes: {
            class: "border-l-4 border-primary/50 pl-4 my-2 italic text-muted-foreground",
          },
        }),
        Underline,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: "text-primary underline cursor-pointer hover:text-primary/80",
          },
        }),
        ResizableImage,
        Placeholder.configure({
          placeholder,
        }),
        Dropcursor.configure({
          color: "hsl(var(--primary))",
          width: 2,
        }),
        Mention.configure({
          HTMLAttributes: {
            class: "bg-primary/20 text-primary rounded px-1 py-0.5 font-medium",
          },
          suggestion: {
            items: async ({ query }: { query: string }) => {
              if (!query || query.length < 2) return []
              try {
                const res = await fetch(`/api/messages/users/search?q=${encodeURIComponent(query)}`)
                if (!res.ok) return []
                const users = await res.json()
                return users.map((u: { id: string; firstName: string; lastName: string }) => ({
                  id: u.id,
                  label: `${u.firstName} ${u.lastName}`,
                }))
              } catch {
                return []
              }
            },
            render: () => {
              let component: HTMLDivElement | null = null
              let popup: HTMLDivElement | null = null

              return {
                onStart: (props: {
                  clientRect: () => DOMRect | null
                  items: Array<{ id: string; label: string }>
                  command: (item: { id: string; label: string }) => void
                }) => {
                  component = document.createElement("div")
                  component.className = "bg-popover border border-border rounded-md shadow-lg overflow-hidden z-50"
                  popup = document.createElement("div")
                  popup.className = "fixed"
                  popup.appendChild(component)
                  document.body.appendChild(popup)
                  updatePopup(props)
                },
                onUpdate: (props: {
                  clientRect: () => DOMRect | null
                  items: Array<{ id: string; label: string }>
                  command: (item: { id: string; label: string }) => void
                }) => {
                  updatePopup(props)
                },
                onKeyDown: (props: { event: KeyboardEvent }) => {
                  if (props.event.key === "Escape") {
                    popup?.remove()
                    return true
                  }
                  return false
                },
                onExit: () => {
                  popup?.remove()
                },
              }

              function updatePopup(props: {
                clientRect: () => DOMRect | null
                items: Array<{ id: string; label: string }>
                command: (item: { id: string; label: string }) => void
              }) {
                if (!component || !popup) return
                const rect = props.clientRect?.()
                if (rect) {
                  popup.style.left = `${rect.left}px`
                  popup.style.top = `${rect.bottom + 4}px`
                }
                component.innerHTML = ""
                if (props.items.length === 0) {
                  component.innerHTML = '<div class="px-3 py-2 text-sm text-muted-foreground">No users found</div>'
                } else {
                  props.items.forEach((item) => {
                    const btn = document.createElement("button")
                    btn.className = "w-full px-3 py-2 text-left text-sm hover:bg-secondary transition-colors"
                    btn.textContent = item.label
                    btn.onclick = () => {
                      props.command(item)
                      popup?.remove()
                    }
                    component?.appendChild(btn)
                  })
                }
              }
            },
          },
        }),
      ],
      content,
      onUpdate: ({ editor }) => {
        onChange?.(editor.getHTML())
      },
      editorProps: {
        attributes: {
          class: "prose prose-sm prose-invert max-w-none min-h-[120px] p-3 focus:outline-none",
        },
        handlePaste: (view, event) => {
          const items = event.clipboardData?.items
          if (!items) return false

          for (const item of items) {
            if (item.type.startsWith("image/")) {
              event.preventDefault()
              const file = item.getAsFile()
              if (file) {
                setUploading(true)
                uploadFile(file)
                  .then((url) => {
                    if (url && editor) {
                      ;(editor.chain().focus() as any).setResizableImage({ src: url }).run()
                    }
                  })
                  .catch(console.error)
                  .finally(() => setUploading(false))
              }
              return true
            }
          }
          return false
        },
        handleDrop: (view, event, slice, moved) => {
          if (moved) return false

          const files = event.dataTransfer?.files
          if (!files || files.length === 0) return false

          const file = files[0]
          if (!file.type.startsWith("image/")) return false

          event.preventDefault()
          setUploading(true)
          uploadFile(file)
            .then((url) => {
              if (url && editor) {
                ;(editor.chain().focus() as any).setResizableImage({ src: url }).run()
              }
            })
            .catch(console.error)
            .finally(() => setUploading(false))

          return true
        },
      },
    })

    useImperativeHandle(ref, () => ({
      getHTML: () => editor?.getHTML() || "",
      clearContent: () => editor?.commands.clearContent(),
      setContent: (newContent: string) => editor?.commands.setContent(newContent),
    }))

    const handleAddLink = useCallback(() => {
      if (!editor) return
      const { from, to } = editor.state.selection
      const selectedText = editor.state.doc.textBetween(from, to)
      setLinkText(selectedText || "")
      setLinkUrl("")
      setShowLinkDialog(true)
    }, [editor])

    const insertLink = useCallback(() => {
      if (!editor || !linkUrl) return
      if (linkText) {
        editor.chain().focus().insertContent(`<a href="${linkUrl}">${linkText}</a>`).run()
      } else {
        editor.chain().focus().setLink({ href: linkUrl }).run()
      }
      setShowLinkDialog(false)
      setLinkUrl("")
      setLinkText("")
    }, [editor, linkUrl, linkText])

    const handleImageUpload = useCallback(
      async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !editor) return

        setUploading(true)
        try {
          const url = await uploadFile(file)
          if (url) {
            ;(editor.chain().focus() as any).setResizableImage({ src: url }).run()
            setShowImageDialog(false)
          }
        } catch (err) {
          console.error(err)
          alert("Failed to upload image")
        } finally {
          setUploading(false)
        }
      },
      [editor, uploadFile],
    )

    const insertImageUrl = useCallback(() => {
      if (!editor || !imageUrl) return
      ;(editor.chain().focus() as any).setResizableImage({ src: imageUrl }).run()
      setShowImageDialog(false)
      setImageUrl("")
    }, [editor, imageUrl])

    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
    }, [])

    const handleDrop = useCallback(
      async (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)

        const files = e.dataTransfer?.files
        if (!files || files.length === 0 || !editor) return

        const file = files[0]
        if (!file.type.startsWith("image/")) {
          alert("Please drop an image file")
          return
        }

        setUploading(true)
        try {
          const url = await uploadFile(file)
          if (url) {
            ;(editor.chain().focus() as any).setResizableImage({ src: url }).run()
          }
        } catch (err) {
          console.error(err)
          alert("Failed to upload image")
        } finally {
          setUploading(false)
        }
      },
      [editor, uploadFile],
    )

    if (!editor) return null

    return (
      <div
        ref={editorContainerRef}
        className={`rounded-md border border-input bg-background relative ${isDragging ? "ring-2 ring-primary" : ""} ${className}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-md z-10 flex items-center justify-center">
            <div className="flex items-center gap-2 text-primary font-medium">
              <Upload className="h-5 w-5" />
              Drop image here
            </div>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-background/80 z-10 flex items-center justify-center rounded-md">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Uploading image...
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
          <Button
            type="button"
            variant={editor.isActive("bold") ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive("italic") ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive("underline") ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="h-4 w-4" />
          </Button>
          <div className="mx-1 h-6 w-px bg-border" />
          <Button
            type="button"
            variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive("blockquote") ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="h-4 w-4" />
          </Button>
          <div className="mx-1 h-6 w-px bg-border" />
          <Button
            type="button"
            variant={editor.isActive("link") ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={handleAddLink}
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowImageDialog(true)}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <span className="ml-auto text-xs text-muted-foreground hidden sm:inline">
            Type @ to mention | Drag images to resize
          </span>
        </div>
        <EditorContent editor={editor} />

        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="linkText">Link Text (optional)</Label>
                <Input
                  id="linkText"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Display text"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkUrl">URL</Label>
                <Input
                  id="linkUrl"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={insertLink} disabled={!linkUrl}>
                  Add Link
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Image</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Upload Image</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
                {uploading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </div>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowImageDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={insertImageUrl} disabled={!imageUrl || uploading}>
                  Add Image
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  },
)

RichTextEditor.displayName = "RichTextEditor"

export default RichTextEditor
