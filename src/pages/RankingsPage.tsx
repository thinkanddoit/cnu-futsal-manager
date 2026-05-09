import { useEffect, useState } from 'react'
import { getAllUserStats } from '../services/userStats'
import { getAllMembers } from '../services/users'
import { UserStats } from '../types'

type RankedRow = UserStats & { name: string; profileImage: string; rank: number }

export default function RankingsPage() {
  const [rows, setRows] = useState<RankedRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getAllUserStats(), getAllMembers()]).then(([stats, members]) => {
      const memberMap = Object.fromEntries(members.map((m) => [m.uid, m]))
      let rank = 1
      const ranked: RankedRow[] = []
      for (let i = 0; i < stats.length; i++) {
        if (i > 0 && stats[i].totalPoints < stats[i - 1].totalPoints) rank = i + 1
        const member = memberMap[stats[i].userId]
        if (!member) continue
        ranked.push({ ...stats[i], name: member.name, profileImage: member.profileImage, rank })
      }
      setRows(ranked)
      setLoading(false)
    })
  }, [])

  if (loading) return <p className="text-center p-8">로딩 중...</p>

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">랭킹</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b">
            <th className="pb-2 w-8">#</th>
            <th className="pb-2">이름</th>
            <th className="pb-2 text-right">점수</th>
            <th className="pb-2 text-right">출석</th>
            <th className="pb-2 text-right">MVP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.userId} className="border-b last:border-0">
              <td className="py-3 font-bold text-gray-400">{r.rank}</td>
              <td className="py-3 flex items-center gap-2">
                {r.profileImage && (
                  <img src={r.profileImage} alt="" className="w-7 h-7 rounded-full object-cover" />
                )}
                {r.name}
              </td>
              <td className="py-3 text-right font-semibold text-blue-600">{r.totalPoints}</td>
              <td className="py-3 text-right">{r.attendanceCount}</td>
              <td className="py-3 text-right text-yellow-500">
                {r.mvp1st > 0 && `🥇${r.mvp1st} `}
                {r.mvp2nd > 0 && `🥈${r.mvp2nd} `}
                {r.mvp3rd > 0 && `🥉${r.mvp3rd}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
