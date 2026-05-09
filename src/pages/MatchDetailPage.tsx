import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import { subscribeToMatchAttendances, setAttendance } from '../services/attendances'
import { castMvpVote, getMyVote } from '../services/votes'
import { getAllMembers } from '../services/users'
import { Match, Attendance, AppUser } from '../types'

function docToMatch(id: string, data: Record<string, any>): Match {
  return {
    id,
    date: data.date?.toDate() ?? new Date(),
    venue: data.venue,
    status: data.status,
    confirmedAt: data.confirmedAt?.toDate() ?? null,
    voteDeadline: data.voteDeadline?.toDate() ?? null,
    voteTallied: data.voteTallied ?? false,
    createdBy: data.createdBy,
  }
}

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { appUser } = useAuth()
  const [match, setMatch] = useState<Match | null>(null)
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [members, setMembers] = useState<AppUser[]>([])
  const [myVote, setMyVote] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getDoc(doc(db, 'matches', id)).then((snap) => {
      if (snap.exists()) setMatch(docToMatch(snap.id, snap.data()))
      setLoading(false)
    })
    getAllMembers().then(setMembers)
  }, [id])

  useEffect(() => {
    if (!id) return
    return subscribeToMatchAttendances(id, setAttendances)
  }, [id])

  useEffect(() => {
    if (!id || !appUser) return
    getMyVote(id, appUser.uid).then((v) => setMyVote(v?.votedFor ?? null))
  }, [id, appUser])

  if (loading) return <p className="text-center p-8">로딩 중...</p>
  if (!match) return <p className="text-center p-8">경기를 찾을 수 없습니다.</p>

  const attending = attendances.filter((a) => a.status === 'attending')
  const myAttendance = attendances.find((a) => a.userId === appUser?.uid)
  const canChangeAttendance = match.status === 'voting'
  const isVotingOpen =
    match.status === 'completed' &&
    !match.voteTallied &&
    match.voteDeadline &&
    match.voteDeadline > new Date()

  async function handleAttendanceToggle() {
    if (!appUser || !id) return
    const next = myAttendance?.status === 'attending' ? 'absent' : 'attending'
    await setAttendance(id, appUser.uid, next)
  }

  async function handleVote(votedFor: string) {
    if (!appUser || !id) return
    await castMvpVote(id, appUser.uid, votedFor)
    setMyVote(votedFor)
  }

  const memberMap = Object.fromEntries(members.map((m) => [m.uid, m]))

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-4">
        <h1 className="text-xl font-bold">
          {match.date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
        </h1>
        <p className="text-gray-500">{match.venue}</p>
        <p className="text-sm mt-1">
          참석 예정: <strong>{attending.length}명</strong>
        </p>
      </div>

      {appUser && canChangeAttendance && (
        <button
          onClick={handleAttendanceToggle}
          className={`w-full py-3 rounded-lg font-semibold ${
            myAttendance?.status === 'attending'
              ? 'bg-red-100 text-red-600'
              : 'bg-green-500 text-white'
          }`}
        >
          {myAttendance?.status === 'attending' ? '불참으로 변경' : '참석 신청'}
        </button>
      )}

      <div>
        <h2 className="font-semibold mb-2">참석자 ({attending.length}명)</h2>
        <ul className="space-y-1">
          {attending.map((a) => (
            <li key={a.userId} className="flex items-center justify-between bg-white rounded p-3 shadow-sm">
              <span>{memberMap[a.userId]?.name ?? a.userId}</span>
              {isVotingOpen && appUser && a.userId !== appUser.uid && (
                <button
                  onClick={() => handleVote(a.userId)}
                  disabled={!!myVote}
                  className={`text-sm px-3 py-1 rounded-full ${
                    myVote === a.userId
                      ? 'bg-yellow-400 text-black font-bold'
                      : myVote
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-blue-500 text-white'
                  }`}
                >
                  {myVote === a.userId ? 'MVP 투표함' : 'MVP 투표'}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
