import type { AttendanceLocation } from "@/lib/attendance-location"
import {
  formatLocationPlace,
  hasPlaceLabels,
  mapsUrl,
} from "@/lib/attendance-location"

type LocationCellProps = {
  loc: AttendanceLocation | null | undefined
}

export function LocationCell({ loc }: LocationCellProps) {
  if (!loc) {
    return <span className="text-xs text-gray-400">—</span>
  }

  const href = mapsUrl(loc.latitude, loc.longitude)
  const mapTitle =
    loc.accuracy != null
      ? `Open map (±${Math.round(loc.accuracy)} m GPS)`
      : "Open map"

  return (
    <div className="max-w-[14rem] text-xs leading-snug text-gray-800">
      {hasPlaceLabels(loc) ? (
        <dl className="space-y-0.5">
          {loc.barangay ? (
            <div>
              <dt className="inline font-medium text-gray-600">Brgy.: </dt>
              <dd className="inline">{loc.barangay}</dd>
            </div>
          ) : null}
          {loc.municipality ? (
            <div>
              <dt className="inline font-medium text-gray-600">
                City / Municipality:{" "}
              </dt>
              <dd className="inline">{loc.municipality}</dd>
            </div>
          ) : null}
          {loc.province ? (
            <div>
              <dt className="inline font-medium text-gray-600">Province: </dt>
              <dd className="inline">{loc.province}</dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="text-gray-600">{formatLocationPlace(loc)}</p>
      )}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={mapTitle}
        className="mt-1 inline-block font-medium text-cyan-700 underline-offset-2 hover:underline"
      >
        Open map
      </a>
    </div>
  )
}
