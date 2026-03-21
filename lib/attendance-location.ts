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

function getCurrentPositionOnce(
  options: PositionOptions,
): Promise<AttendanceLocation> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(positionToLocation(pos)),
      (err) => reject(mapGeolocationError(err)),
      options,
    )
  })
}

/**
 * Browser geolocation for clock-in / clock-out (HTTPS or localhost only).
 *
 * Tuned for **low latency**: short watch window, early exit on decent accuracy,
 * then fallbacks. Trade-off: slightly coarser fixes indoors vs waiting tens of
 * seconds for GPS to converge.
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

    /** Wall-clock cap for watch phase — keeps UX snappy. */
    const WATCH_MAX_MS = 5_500
    /** Per-callback timeout (browser); avoid huge values that stall each fix. */
    const PER_CALL_TIMEOUT_MS = 8_000
    /** Stop early on one strong reading. */
    const ACCURACY_STOP_SINGLE_M = 35
    /** Two quick network fixes are enough to stop. */
    const ACCURACY_STOP_MULTI_M = 120
    const MIN_SAMPLES_FOR_MULTI_STOP = 2
    /** After this long, return best fix we have (don’t wait for perfect GPS). */
    const STOP_AFTER_MS_WITH_ANY_FIX = 4_000

    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: PER_CALL_TIMEOUT_MS,
    }

    let best: AttendanceLocation | null = null
    let sampleCount = 0
    let watchId: number | null = null
    let settled = false
    let deadlineId: ReturnType<typeof setTimeout> | null = null
    const startedAt = Date.now()

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

    const maybeStopEarly = () => {
      if (settled || !best) return
      const acc = best.accuracy
      const elapsed = Date.now() - startedAt
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
        return
      }
      if (elapsed >= STOP_AFTER_MS_WITH_ANY_FIX) {
        finishOk(best)
      }
    }

    const onSample = (pos: GeolocationPosition) => {
      if (settled) return
      sampleCount++
      const loc = positionToLocation(pos)
      if (!best || locationQuality(loc) < locationQuality(best)) {
        best = loc
      }
      maybeStopEarly()
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
      void (async () => {
        try {
          const loc = await getCurrentPositionOnce({
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 7_000,
          })
          if (!settled) {
            settled = true
            resolve(loc)
          }
        } catch {
          try {
            const loc = await getCurrentPositionOnce({
              enableHighAccuracy: false,
              maximumAge: 0,
              timeout: 5_000,
            })
            if (!settled) {
              settled = true
              resolve(loc)
            }
          } catch (e) {
            if (!settled) {
              settled = true
              reject(
                e instanceof Error ? e : new Error("Could not read your location."),
              )
            }
          }
        }
      })()
    }, WATCH_MAX_MS)
  })
}

export function mapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`
}
