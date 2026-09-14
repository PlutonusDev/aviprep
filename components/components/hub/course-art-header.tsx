import { courseArtDataUri } from "@lib/course-art"
import { cn } from "lib/utils"

/**
 * A card's header band. Uses the saved thumbnail when one exists and otherwise
 * generates the same branded art on the fly, so every card is identifiable
 * immediately rather than waiting on someone to author an image.
 *
 * The subject name is the big text; the eyebrow carries licence and code
 * ("RPL - RBKA"), which is what makes one card tell itself apart from another.
 */
export function CourseArtHeader({
  thumbnail,
  title,
  code,
  licenseType,
  className,
  children,
}: {
  thumbnail?: string | null
  title: string
  code?: string
  licenseType?: string
  className?: string
  children?: React.ReactNode
}) {
  const licence = licenseType?.toUpperCase()
  // IREX's licence and code are the same string, so joining them stutters.
  const parts = licence === code?.toUpperCase() ? [code] : [licence, code]
  const eyebrow = parts.filter(Boolean).join(" - ")
  const src = thumbnail || courseArtDataUri({ title, code, eyebrow, licenseType })

  return (
    <div className={cn("relative aspect-[3/1] w-full overflow-hidden bg-muted", className)}>
      <img
        src={src}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="h-full w-full object-cover"
      />
      {children}
    </div>
  )
}
