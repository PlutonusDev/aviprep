/**
 * Undo and redo, as a stack of whole scenes.
 *
 * Diagrams are small and every operation already returns a new scene, so
 * snapshots cost far less than a command log would and can't drift out of step
 * with what's on screen. The stack is capped: fifty steps back is more than
 * anyone reaches for, and it bounds the memory a long session can hold.
 *
 * Pure, so the rules are testable without a canvas.
 */

import type { Scene } from "./scene"

export const HISTORY_LIMIT = 50

export interface History {
  past: Scene[]
  present: Scene
  future: Scene[]
}

export const initHistory = (scene: Scene): History => ({ past: [], present: scene, future: [] })

/**
 * `coalesce` merges this change into the last one instead of stacking a new
 * step - for a slider being dragged, where every pixel would otherwise be its
 * own undo.
 */
export function commit(history: History, next: Scene, { coalesce = false } = {}): History {
  if (next === history.present) return history
  if (coalesce && history.past.length) {
    return { past: history.past, present: next, future: [] }
  }
  const past = [...history.past, history.present].slice(-HISTORY_LIMIT)
  return { past, present: next, future: [] }
}

export function undo(history: History): History {
  if (!history.past.length) return history
  const previous = history.past[history.past.length - 1]
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future].slice(0, HISTORY_LIMIT),
  }
}

export function redo(history: History): History {
  if (!history.future.length) return history
  const [next, ...rest] = history.future
  return {
    past: [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: next,
    future: rest,
  }
}

export const canUndo = (history: History) => history.past.length > 0
export const canRedo = (history: History) => history.future.length > 0
