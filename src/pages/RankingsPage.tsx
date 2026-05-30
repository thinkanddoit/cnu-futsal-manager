import { useEffect, useState } from 'react'
import { calculateAllStats } from '../services/userStats'
import { getAllUsers } from '../services/users'
import { UserStats } from '../types'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

type RankedRow = UserStats & { name: string; rank: number; isGuest: boolean }

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

export default function RankingsPage() {
  const [rows, setRows] = useState<RankedRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([calculateAllStats(), getAllUsers()]).then(([stats, users]) => {
      const userMap = Object.fromEntries(users.map((u) => [u.uid, u]))
      let rank = 1
      const ranked: RankedRow[] = []
      for (let i = 0; i < stats.length; i++) {
        if (i > 0 && stats[i].totalPoints < stats[i - 1].totalPoints) rank = i + 1
        const user = userMap[stats[i].userId]
        if (!user) continue
        ranked.push({
          ...stats[i],
          name: user.name,
          rank,
          isGuest: user.role === 'guest',
        })
      }
      setRows(ranked)
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <h1 className="text-xl font-bold mb-4 dark:text-white">랭킹</h1>

      <div className="bg-yellow-50 dark:bg-amber-900/20 border border-yellow-200 dark:border-amber-700/50 rounded-lg p-3 mb-4 text-sm">
        <p className="font-semibold text-yellow-800 dark:text-amber-300 mb-1">MOM (Man of the Match) 제도 안내</p>
        <ul className="text-yellow-700 dark:text-amber-400/80 space-y-0.5">
          <li>• 점수: 1등 3점 / 2등 2점 / 3등 1점 / 참석자 0.5점</li>
          <li>• 투표 대상: 경기 참석자만 투표 가능</li>
        </ul>
      </div>
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
              <td className="py-3 font-bold text-gray-400 dark:text-gray-500">{r.rank}</td>
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <JerseyIcon />
                  <span className="dark:text-gray-200">{r.name}</span>
                  {r.isGuest && (
                    <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full">비회원</span>
                  )}
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
