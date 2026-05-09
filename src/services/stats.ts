export async function triggerMatchTally(matchId: string): Promise<void> {
  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'
  const res = await fetch(`${serverUrl}/stats/tally/${matchId}`, { method: 'POST' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || 'Tally failed')
  }
}
