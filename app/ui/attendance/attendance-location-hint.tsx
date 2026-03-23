export function AttendanceLocationHint() {
  return (
    <p className="text-center text-xs text-gray-500">
      Each In/Out records GPS (browser will ask for permission). The server
      turns coordinates into barangay, city/municipality, and province when
      possible (OpenStreetMap).
    </p>
  )
}
