import type { AttendanceLocation } from "@/lib/attendance-location"
import { mapsUrl } from "@/lib/attendance-location"

type LocationCellProps = {
  loc: AttendanceLocation | null | undefined
}

export function LocationCell({ loc }: LocationCellProps) {
  if (!loc) {
    return <span className="text-xs text-gray-400">—</span>
  }
  const href = mapsUrl(loc.latitude, loc.longitude)
  const label = `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`
  const title =
    loc.accuracy != null
      ? `${label} (±${Math.round(loc.accuracy)} m)`
      : label
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className="text-xs font-medium text-cyan-700 underline-offset-2 hover:underline"
    >
      Open map
    </a>
  )
}
