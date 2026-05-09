import { Router } from 'express'
import * as admin from 'firebase-admin'

const router = Router()

const POINTS: Record<number, number> = { 1: 3, 2: 2, 3: 1 }

router.post('/tally/:matchId', async (req, res) => {
  const { matchId } = req.params

  try {
    const db = admin.firestore()

    // Check match exists and is completed
    const matchSnap = await db.collection('matches').doc(matchId).get()
    if (!matchSnap.exists) {
      res.status(404).json({ error: 'Match not found' })
      return
    }
    const matchData = matchSnap.data()!
    if (matchData.status !== 'completed') {
      res.status(400).json({ error: 'Match is not completed' })
      return
    }
    if (matchData.voteTallied) {
      res.status(400).json({ error: 'Match stats already tallied' })
      return
    }

    const batch = db.batch()

    // 1. Attendance points
    const attendSnap = await db
      .collection('attendances')
      .where('matchId', '==', matchId)
      .where('status', '==', 'attending')
      .get()

    for (const a of attendSnap.docs) {
      const { userId } = a.data()
      const statsRef = db.collection('userStats').doc(userId)
      batch.set(
        statsRef,
        {
          totalPoints: admin.firestore.FieldValue.increment(1),
          attendanceCount: admin.firestore.FieldValue.increment(1),
        },
        { merge: true }
      )
    }

    // 2. MVP vote points
    const voteSnap = await db.collection('mvpVotes').where('matchId', '==', matchId).get()
    const voteCounts: Record<string, number> = {}
    for (const v of voteSnap.docs) {
      const { votedFor } = v.data()
      voteCounts[votedFor] = (voteCounts[votedFor] ?? 0) + 1
    }

    const sorted = Object.entries(voteCounts)
      .map(([userId, votes]) => ({ userId, votes }))
      .sort((a, b) => b.votes - a.votes)

    let rank = 1
    let i = 0
    while (i < sorted.length && rank <= 3) {
      const currentVotes = sorted[i].votes
      const tied: string[] = []
      while (i < sorted.length && sorted[i].votes === currentVotes) {
        tied.push(sorted[i].userId)
        i++
      }
      for (const userId of tied) {
        if (rank <= 3) {
          const points = POINTS[rank]
          const rankField = rank === 1 ? 'mvp1st' : rank === 2 ? 'mvp2nd' : 'mvp3rd'
          const statsRef = db.collection('userStats').doc(userId)
          batch.set(
            statsRef,
            {
              totalPoints: admin.firestore.FieldValue.increment(points),
              [rankField]: admin.firestore.FieldValue.increment(1),
            },
            { merge: true }
          )
        }
      }
      rank += tied.length
    }

    // 3. Mark as tallied
    batch.update(matchSnap.ref, { voteTallied: true })
    await batch.commit()

    res.json({ success: true, attendees: attendSnap.size, voters: voteSnap.size })
  } catch (err) {
    console.error('Tally error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export { router as tallyStatsRouter }
