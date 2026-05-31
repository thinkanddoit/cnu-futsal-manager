import { useEffect, useRef, useState } from 'react'
import { calculateAllStats } from '../services/userStats'
import { getAllUsers } from '../services/users'
import { UserStats } from '../types'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

type RankedRow = UserStats & { name: string; rank: number }

function JerseyIcon() {
  return (
    <svg
      width="14" height="14" viewBox="0 0 16 16"
      className="fill-white stroke-blue-900 dark:fill-gray-700 dark:stroke-amber-400 shrink-0"
      strokeWidth="1.2"
    >
      <path d="M5,0 Q8,2.5 11,0 L16,3 L14,7 L11,6 L11,15 L5,15 L5,6 L2,7 L0,3 Z" />
    </svg>
  )
}

function RotatingName({ players, nameColor }: { players: RankedRow[]; nameColor: string }) {
  const [idx, setIdx] = useState(0)
  const keyRef = useRef(0)

  useEffect(() => {
    if (players.length <= 1) return
    const timer = setInterval(() => {
      keyRef.current += 1
      setIdx((i) => (i + 1) % players.length)
    }, 2200)
    return () => clearInterval(timer)
  }, [players.length])

  if (players.length === 0) return null
  return (
    <div className="overflow-hidden w-full text-center">
      <p
        key={keyRef.current}
        className={`text-sm font-bold mb-0.5 leading-tight slide-in-right ${nameColor}`}
      >
        {players[idx].name}
      </p>
    </div>
  )
}

function Podium({ top3 }: { top3: RankedRow[] }) {
  const byRank = (rank: number) => top3.filter((r) => r.rank === rank)

  const Card = ({ players, medal, label, blockH, blockColor, nameColor }: {
    players: RankedRow[]
    medal: string
    label: string
    blockH: string
    blockColor: string
    nameColor: string
  }) => (
    <div className="flex flex-col items-center flex-1">
      {players.length > 0 ? (
        <>
          <span className="text-2xl mb-1">{medal}</span>
          <RotatingName players={players} nameColor={nameColor} />
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{players[0].totalPoints}점</p>
        </>
      ) : (
        <div className="mb-2" style={{ height: 64 }} />
      )}
      <div className={`w-full ${blockH} ${blockColor} rounded-t-lg flex items-center justify-center`}>
        <span className="text-white font-black text-xl opacity-80">{label}</span>
      </div>
    </div>
  )

  return (
    <div className="flex items-end gap-1 mb-6 px-2">
      <Card players={byRank(2)} medal="🥈" label="2" blockH="h-20" blockColor="bg-gray-400 dark:bg-gray-500" nameColor="dark:text-gray-200" />
      <Card players={byRank(1)} medal="🥇" label="1" blockH="h-28" blockColor="bg-amber-400 dark:bg-amber-500" nameColor="dark:text-white" />
      <Card players={byRank(3)} medal="🥉" label="3" blockH="h-14" blockColor="bg-orange-400 dark:bg-orange-600" nameColor="dark:text-gray-200" />
    </div>
  )
}

export default function RankingsPage() {
  const [rows, setRows] = useState<RankedRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([calculateAllStats(), getAllUsers()]).then(([stats, users]) => {
      const userMap = Object.fromEntries(users.map((u) => [u.uid, u]))
      const statsMap = Object.fromEntries(stats.map((s) => [s.userId, s]))

      const allStats = users.filter((u) => u.role !== 'guest').map((u) => statsMap[u.uid] ?? {
        userId: u.uid,
        totalPoints: 0,
        attendanceCount: 0,
        mom1st: 0,
        mom2nd: 0,
        mom3rd: 0,
      }).sort((a, b) => b.totalPoints - a.totalPoints)

      let rank = 1
      const ranked: RankedRow[] = []
      for (let i = 0; i < allStats.length; i++) {
        if (i > 0 && allStats[i].totalPoints < allStats[i - 1].totalPoints) rank = i + 1
        ranked.push({
          ...allStats[i],
          name: userMap[allStats[i].userId]?.name ?? '알 수 없음',
          rank,
        })
      }
      setRows(ranked)
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingSpinner />

  const top3 = rows.filter((r) => r.rank <= 3)

  return (
    <div>
      <h1 className="text-xl font-bold mb-4 dark:text-white">랭킹</h1>

      <div className="bg-yellow-50 dark:bg-amber-900/20 border border-yellow-200 dark:border-amber-700/50 rounded-lg p-3 mb-6 text-sm">
        <p className="font-semibold text-yellow-800 dark:text-amber-300 mb-1">MOM (Man of the Match) 제도 안내</p>
        <ul className="text-yellow-700 dark:text-amber-400/80 space-y-0.5">
          <li>• 점수: 1등 3점 / 2등 2점 / 3등 1점 / 참석자 0.5점</li>
          <li>• 투표 대상: 경기 참석자만 투표 가능</li>
        </ul>
      </div>

      {top3.length > 0 && <Podium top3={top3} />}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
            <th className="pb-2 w-8">#</th>
            <th className="pb-2">이름</th>
            <th className="pb-2 text-right">점수</th>
            <th className="pb-2 text-right">출석</th>
            <th className="pb-2 text-right">MOM</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.userId} className="border-b dark:border-gray-700 last:border-0">
              <td className={`py-3 font-bold ${r.rank <= 3 ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500'}`}>{r.rank}</td>
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <JerseyIcon />
                  <span className="dark:text-gray-200">{r.name}</span>
                </div>
              </td>
              <td className="py-3 text-right font-semibold text-blue-900 dark:text-amber-400">{r.totalPoints}</td>
              <td className="py-3 text-right dark:text-gray-300">{r.attendanceCount}</td>
              <td className="py-3 text-right text-yellow-500">
                {r.mom1st > 0 && `🥇${r.mom1st} `}
                {r.mom2nd > 0 && `🥈${r.mom2nd} `}
                {r.mom3rd > 0 && `🥉${r.mom3rd}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
