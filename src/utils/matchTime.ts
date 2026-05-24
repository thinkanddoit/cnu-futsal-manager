export function isMatchInPast(dateStr: string, timeStr: string): boolean {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = timeStr.split(':').map(Number)
  const matchDate = new Date(year, month - 1, day, hour, minute)
  return matchDate <= new Date()
}
