"use client"

import { Download, FileCode2, ImageOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PRESET_SIZES, type BackgroundStyle, type DiagramNode, type Scene } from "@lib/diagrams/scene"
import { cn } from "@lib/utils"

/**
 * The right-hand panel: what the selection looks like, or what the page looks
 * like when nothing is selected. Only the controls that apply to the current
 * selection are shown, so a line never offers a fill.
 */

type Opts = { coalesce?: boolean }

export function Inspector({
  scene,
  selected,
  colour,
  palette,
  gridSnap,
  onColour,
  onGridSnap,
  onScene,
  onNodes,
  onPickBackgroundImage,
  onDownloadPng,
  onDownloadSvg,
}: {
  scene: Scene
  selected: DiagramNode[]
  colour: string
  palette: string[]
  gridSnap: number
  onColour: (colour: string) => void
  onGridSnap: (grid: number) => void
  onScene: (next: (scene: Scene) => Scene, opts?: Opts) => void
  onNodes: (patch: Partial<DiagramNode>, opts?: Opts) => void
  onPickBackgroundImage: () => void
  onDownloadPng: () => void
  onDownloadSvg: () => void
}) {
  const one = selected.length === 1 ? selected[0] : null
  const kinds = new Set(selected.map((n) => n.kind))
  const hasStroke = selected.some((n) => n.kind !== "image")
  const hasFill = selected.some((n) => n.kind === "rect" || n.kind === "ellipse")
  const hasWidth = selected.some((n) => n.kind === "line" || n.kind === "rect" || n.kind === "ellipse")

  return (
    <aside className="w-full shrink-0 space-y-5 overflow-y-auto border-t border-border p-4 lg:w-72 lg:border-l lg:border-t-0">
      {selected.length === 0 ? (
        <>
          <Section title="Page">
            <Field label="Size">
              <div className="grid grid-cols-2 gap-1.5">
                {PRESET_SIZES.map((preset) => {
                  const active = scene.width === preset.width && scene.height === preset.height
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onScene((s) => ({ ...s, width: preset.width, height: preset.height }))}
                      className={cn(
                        "rounded-lg border px-2 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active ? "border-primary bg-primary/10 font-medium text-foreground" : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {preset.label}
                      <span className="block text-[10px] text-muted-foreground" data-tabular>
                        {preset.width}×{preset.height}
                      </span>
                    </button>
                  )
                })}
              </div>
            </Field>

            <Field label="Paper">
              <div className="flex flex-wrap gap-1.5">
                {(["blank", "grid", "dots", "graph"] as BackgroundStyle[]).map((style) => (
                  <Chip
                    key={style}
                    active={scene.background.style === style}
                    onClick={() => onScene((s) => ({ ...s, background: { ...s.background, style } }))}
                  >
                    {style === "graph" ? "Graph" : style[0].toUpperCase() + style.slice(1)}
                  </Chip>
                ))}
              </div>
            </Field>

            <Field label="Trace over an image" hint="Sits behind everything, at reduced opacity.">
              {scene.background.imageUrl ? (
                <div className="space-y-2">
                  <Slider
                    label="Opacity"
                    value={Math.round((scene.background.imageOpacity ?? 0.6) * 100)}
                    min={5}
                    max={100}
                    onChange={(v) =>
                      onScene((s) => ({ ...s, background: { ...s.background, imageOpacity: v / 100 } }), { coalesce: true })
                    }
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={() => onScene((s) => ({ ...s, background: { ...s.background, imageUrl: null } }))}
                  >
                    <ImageOff className="h-3.5 w-3.5" aria-hidden="true" />
                    Remove
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="w-full" onClick={onPickBackgroundImage}>
                  Choose an image
                </Button>
              )}
            </Field>
          </Section>

          <Section title="Drawing">
            <Field label="Snap to">
              <div className="flex flex-wrap gap-1.5">
                {[0, 5, 10, 20, 40].map((grid) => (
                  <Chip key={grid} active={gridSnap === grid} onClick={() => onGridSnap(grid)}>
                    {grid === 0 ? "Off" : grid}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="New items">
              <Swatches palette={palette} value={colour} onChange={onColour} />
            </Field>
          </Section>

          <Section title="Export">
            <div className="space-y-1.5">
              <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={onDownloadPng}>
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Download PNG
              </Button>
              <Button variant="ghost" size="sm" className="w-full gap-1.5" onClick={onDownloadSvg}>
                <FileCode2 className="h-3.5 w-3.5" aria-hidden="true" />
                Download SVG
              </Button>
            </div>
          </Section>
        </>
      ) : (
        <Section title={one ? label(one) : `${selected.length} selected`}>
          {hasStroke && (
            <Field label={hasFill ? "Line" : "Colour"}>
              <Swatches
                palette={palette}
                value={(one as { colour?: string })?.colour ?? ""}
                onChange={(value) => onNodes({ colour: value } as Partial<DiagramNode>)}
              />
            </Field>
          )}

          {hasFill && (
            <Field label="Fill">
              <Swatches
                palette={["none", ...palette]}
                value={(one as { fill?: string })?.fill ?? ""}
                onChange={(value) => onNodes({ fill: value } as Partial<DiagramNode>)}
              />
            </Field>
          )}

          {hasWidth && (
            <Field label="Line weight">
              <Slider
                value={Number((one as { width?: number })?.width ?? 3)}
                min={1}
                max={16}
                onChange={(v) => onNodes({ width: v } as Partial<DiagramNode>, { coalesce: true })}
              />
            </Field>
          )}

          {selected.some((n) => n.kind === "line" || n.kind === "rect" || n.kind === "ellipse") && (
            <Field label="Line style">
              <div className="flex flex-wrap gap-1.5">
                {(["solid", "dashed", "dotted"] as const).map((dash) => (
                  <Chip
                    key={dash}
                    active={(one as { dash?: string })?.dash === dash}
                    onClick={() => onNodes({ dash } as Partial<DiagramNode>)}
                  >
                    {dash[0].toUpperCase() + dash.slice(1)}
                  </Chip>
                ))}
              </div>
            </Field>
          )}

          {kinds.has("line") && (
            <Field label="Arrows">
              <div className="flex flex-wrap gap-1.5">
                <Chip
                  active={!!(one as { arrowStart?: boolean })?.arrowStart}
                  onClick={() => onNodes({ arrowStart: !(one as { arrowStart?: boolean })?.arrowStart } as Partial<DiagramNode>)}
                >
                  Start
                </Chip>
                <Chip
                  active={!!(one as { arrowEnd?: boolean })?.arrowEnd}
                  onClick={() => onNodes({ arrowEnd: !(one as { arrowEnd?: boolean })?.arrowEnd } as Partial<DiagramNode>)}
                >
                  End
                </Chip>
              </div>
            </Field>
          )}

          {one?.kind === "text" && (
            <>
              <Field label="Text">
                <Textarea
                  rows={3}
                  value={one.text}
                  onChange={(e) => onNodes({ text: e.target.value } as Partial<DiagramNode>, { coalesce: true })}
                  className="resize-none text-sm"
                />
              </Field>
              <Field label="Size">
                <Slider value={one.size} min={10} max={96} onChange={(v) => onNodes({ size: v } as Partial<DiagramNode>, { coalesce: true })} />
              </Field>
              <Field label="Align">
                <div className="flex flex-wrap gap-1.5">
                  {([
                    ["left", "Left"],
                    ["middle", "Centre"],
                    ["end", "Right"],
                  ] as const).map(([value, text]) => (
                    <Chip key={value} active={one.align === value} onClick={() => onNodes({ align: value } as Partial<DiagramNode>)}>
                      {text}
                    </Chip>
                  ))}
                </div>
              </Field>
              <Field label="Weight">
                <Chip active={!!one.bold} onClick={() => onNodes({ bold: !one.bold } as Partial<DiagramNode>)}>
                  Bold
                </Chip>
              </Field>
            </>
          )}

          {one?.kind === "symbol" && (
            <>
              <Field label="Size">
                <Slider value={one.size} min={16} max={320} onChange={(v) => onNodes({ size: v } as Partial<DiagramNode>, { coalesce: true })} />
              </Field>
              <Field label="Label" hint="Printed under the symbol.">
                <Input
                  value={one.label ?? ""}
                  onChange={(e) => onNodes({ label: e.target.value } as Partial<DiagramNode>, { coalesce: true })}
                  maxLength={24}
                  placeholder="e.g. WGA"
                  className="h-9"
                />
              </Field>
            </>
          )}

          {one?.kind === "image" && (
            <Field label="Description" hint="Read out instead of the image.">
              <Input
                value={one.alt ?? ""}
                onChange={(e) => onNodes({ alt: e.target.value } as Partial<DiagramNode>, { coalesce: true })}
                maxLength={200}
                className="h-9"
              />
            </Field>
          )}

          {one && one.kind !== "line" && (
            <Field label="Rotation">
              <Slider
                value={one.rotation}
                min={-180}
                max={180}
                suffix="°"
                onChange={(v) => onNodes({ rotation: v } as Partial<DiagramNode>, { coalesce: true })}
              />
            </Field>
          )}
        </Section>
      )}
    </aside>
  )
}

/* --- Small pieces ------------------------------------------------------------ */

const label = (node: DiagramNode) =>
  node.kind === "symbol" ? "Symbol" : node.kind[0].toUpperCase() + node.kind.slice(1)

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </section>
  )
}

function Field({ label: text, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground">{text}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-8 rounded-full border px-3 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "border-primary bg-primary/10 font-medium text-foreground" : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

function Swatches({ palette, value, onChange }: { palette: string[]; value: string; onChange: (colour: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {palette.map((colour) => (
        <button
          key={colour}
          type="button"
          aria-label={colour === "none" ? "No fill" : colour}
          aria-pressed={value === colour}
          onClick={() => onChange(colour)}
          style={colour === "none" ? undefined : { background: colour }}
          className={cn(
            "h-7 w-7 rounded-full border-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === colour ? "scale-110 border-primary" : "border-border hover:scale-105",
            colour === "none" && "bg-background",
          )}
        >
          {colour === "none" && <span aria-hidden="true" className="block h-full w-full rotate-45 border-l-2 border-destructive" />}
        </button>
      ))}
    </div>
  )
}

function Slider({
  label: text,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label?: string
  value: number
  min: number
  max: number
  suffix?: string
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        aria-label={text}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-[var(--primary)]"
      />
      <span className="w-12 shrink-0 text-right text-xs text-muted-foreground" data-tabular>
        {Math.round(value)}
        {suffix}
      </span>
    </div>
  )
}
