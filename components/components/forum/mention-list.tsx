"use client"

import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react"
import { Button } from "@/components/ui/button"

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

const MentionList = forwardRef<MentionListRef, { items: any[]; command: any }>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.items[index]
    if (item) {
      props.command(item)
    }
  }

  useEffect(() => setSelectedIndex(0), [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
        return true
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((selectedIndex + 1) % props.items.length)
        return true
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex)
        return true
      }
      return false
    },
  }))

  return (
    <div className="z-50 min-w-[12rem] overflow-hidden rounded-md border bg-secondary p-1 text-popover-foreground shadow-md">
      {props.items.length > 0 && (
        <p className="text-xs mb-1 text-muted-foreground">Press Enter to mention:</p>
      )}
      {props.items.length ? (
        props.items.map((item, index) => (
          <div
            key={item.id}
            onMouseDown={e => {
              props.command(item)
            }}
            className={`flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors 
              ${index === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"}`}
          >
            {item.label}
          </div>
        ))
      ) : (
        <div className="px-2 py-1.5 text-sm text-muted-foreground">No users found</div>
      )}
    </div>
  )
})

MentionList.displayName = "MentionList"
export default MentionList