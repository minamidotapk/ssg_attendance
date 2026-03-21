/**
 * Reverse geocode via OpenStreetMap Nominatim (free; respect usage policy).
 * @see https://operations.osmfoundation.org/policies/nominatim/
 */

export type PhPlaceLabels = {
  barangay: string | null
  municipality: string | null
  province: string | null
}

type NominatimAddress = Record<string, string | undefined>

function pickFirst(
  addr: NominatimAddress,
  keys: string[],
): string | null {
  for (const k of keys) {
    const v = addr[k]
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return null
}

/**
 * Map Nominatim `address` object to PH-oriented labels (best effort; OSM tagging varies).
 */
function nominatimAddressToPhPlace(addr: unknown): PhPlaceLabels {
  if (!addr || typeof addr !== "object") {
    return { barangay: null, municipality: null, province: null }
  }
  const a = addr as NominatimAddress

  const barangay = pickFirst(a, [
    "village",
    "neighbourhood",
    "suburb",
    "quarter",
    "hamlet",
  ])

  const municipality = pickFirst(a, [
    "city",
    "town",
    "municipality",
    "city_district",
    "county",
  ])

  const province = pickFirst(a, ["state", "region", "province"])

  return { barangay, municipality, province }
}

const NOMINATIM_REVERSE =
  "https://nominatim.openstreetmap.org/reverse"

/**
 * ~8s timeout; failures return all nulls (caller still stores GPS).
 */
export async function reverseGeocodeToPhPlace(
  latitude: number,
  longitude: number,
): Promise<PhPlaceLabels> {
  const userAgent =
    process.env.NOMINATIM_USER_AGENT?.trim() ||
    "SSG-Attendance-App/1.0 (attendance; contact: configure NOMINATIM_USER_AGENT)"

  const url = new URL(NOMINATIM_REVERSE)
  url.searchParams.set("lat", String(latitude))
  url.searchParams.set("lon", String(longitude))
  url.searchParams.set("format", "json")
  url.searchParams.set("addressdetails", "1")
  url.searchParams.set("accept-language", "en")
  url.searchParams.set("zoom", "18")

  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), 8_000)

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": userAgent,
      },
      signal: ac.signal,
      cache: "no-store",
    })
    if (!res.ok) {
      return { barangay: null, municipality: null, province: null }
    }
    const json = (await res.json()) as { address?: unknown }
    return nominatimAddressToPhPlace(json.address)
  } catch {
    return { barangay: null, municipality: null, province: null }
  } finally {
    clearTimeout(t)
  }
}
