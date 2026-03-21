/**
 * GPS payload for attendance IN/OUT (stored in MongoDB, sent from the browser).
 */

export type AttendanceLocation = {
  latitude: number
  longitude: number
  /** Meters, or null if the browser did not report it */
  accuracy: number | null
}

/** Lower = better (meters); unknown accuracy sorts last. */
function locationQuality(loc: AttendanceLocation): number {
  if (loc.accuracy != null && Number.isFinite(loc.accuracy)) return loc.accuracy
  return Number.POSITIVE_INFINITY
}

function positionToLocation(pos: GeolocationPosition): AttendanceLocation {
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy:
      pos.coords.accuracy != null && Number.isFinite(pos.coords.accuracy)
        ? pos.coords.accuracy
        : null,
  }
}

function mapGeolocationError(err: GeolocationPositionError): Error {
  let msg = "Could not read your location."
  if (err.code === 1) {
    msg =
      "Location permission denied. Allow location access in your browser to record attendance."
  } else if (err.code === 3) {
    msg =
      "Location request timed out. Try again near a window or outdoors, and wait a few seconds."
  } else if (err.message) msg = err.message
  return new Error(msg)
}

export function parseAttendanceLocationPayload(
  raw: unknown,
): AttendanceLocation | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const latitude = Number(o.latitude)
  const longitude = Number(o.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null
  }
  let accuracy: number | null = null
  if (o.accuracy !== undefined && o.accuracy !== null && o.accuracy !== "") {
    const a = Number(o.accuracy)
    if (Number.isFinite(a) && a >= 0) accuracy = a
  }
  return { latitude, longitude, accuracy }
}

/**
 * Browser geolocation for clock-in / clock-out (HTTPS or localhost only).
 *
 * Uses a short `watchPosition` session so the device can refine GPS instead
 * of returning the first coarse network fix. Keeps the sample with the best
 * (smallest) reported accuracy. Indoor / dense urban error is still limited by
 * hardware and OS — stay near a window or outside when possible.
 */
export function requestDeviceLocation(): Promise<AttendanceLocation> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(
        new Error(
          "Geolocation is not supported. Use a modern browser on HTTPS.",
        ),
      )
      return
    }

    /** How long to keep listening for better fixes (ms). */
    const WATCH_MAX_MS = 24_000
    /** Good enough to stop immediately (one strong GPS-like reading). */
    const ACCURACY_STOP_SINGLE_M = 18
    /** Good enough after we have at least two samples (avoids one lucky coarse fix). */
    const ACCURACY_STOP_MULTI_M = 40
    const MIN_SAMPLES_FOR_MULTI_STOP = 2

    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 28_000,
    }

    let best: AttendanceLocation | null = null
    let sampleCount = 0
    let watchId: number | null = null
    let settled = false
    let deadlineId: ReturnType<typeof setTimeout> | null = null

    const cleanup = () => {
      if (deadlineId != null) {
        clearTimeout(deadlineId)
        deadlineId = null
      }
      if (watchId != null) {
        navigator.geolocation.clearWatch(watchId)
        watchId = null
      }
    }

    const finishOk = (loc: AttendanceLocation) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(loc)
    }

    const finishErr = (err: Error) => {
      if (settled) return
      settled = true
      cleanup()
      reject(err)
    }

    const onSample = (pos: GeolocationPosition) => {
      if (settled) return
      sampleCount++
      const loc = positionToLocation(pos)
      if (!best || locationQuality(loc) < locationQuality(best)) {
        best = loc
      }
      const acc = best.accuracy
      if (acc != null && acc <= ACCURACY_STOP_SINGLE_M) {
        finishOk(best)
        return
      }
      if (
        acc != null &&
        acc <= ACCURACY_STOP_MULTI_M &&
        sampleCount >= MIN_SAMPLES_FOR_MULTI_STOP
      ) {
        finishOk(best)
      }
    }

    watchId = navigator.geolocation.watchPosition(
      onSample,
      (err) => {
        if (settled) return
        if (sampleCount === 0 && !best) {
          finishErr(mapGeolocationError(err))
        }
      },
      options,
    )

    deadlineId = setTimeout(() => {
      if (settled) return
      cleanup()
      if (best) {
        settled = true
        resolve(best)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (settled) return
          settled = true
          resolve(positionToLocation(pos))
        },
        (err) => {
          if (settled) return
          settled = true
          reject(mapGeolocationError(err))
        },
        options,
      )
    }, WATCH_MAX_MS)
  })
}

export function mapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`
}
