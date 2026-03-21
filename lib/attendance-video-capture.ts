/**
 * Grab a JPEG data URL from a live video element (for attendance API payload).
 */
export function captureFrameFromVideo(video: HTMLVideoElement): string | null {
  if (video.readyState < 2 || video.videoWidth === 0) {
    return null
  }
  const maxW = 960
  const scale = Math.min(1, maxW / video.videoWidth)
  const w = Math.round(video.videoWidth * scale)
  const h = Math.round(video.videoHeight * scale)
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  ctx.drawImage(video, 0, 0, w, h)
  return canvas.toDataURL("image/jpeg", 0.82)
}
