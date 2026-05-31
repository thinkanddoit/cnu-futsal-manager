import { Link } from 'react-router-dom'

export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <Link to="/admin/matches" className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-4 flex flex-col gap-1 active:opacity-70">
          <span className="text-2xl">⚽</span>
          <span className="font-semibold text-sm dark:text-white">경기 관리</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">일정 생성 · 상태 변경</span>
        </Link>
        <Link to="/admin/members" className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-4 flex flex-col gap-1 active:opacity-70">
          <span className="text-2xl">👥</span>
          <span className="font-semibold text-sm dark:text-white">회원 관리</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">역할 변경</span>
        </Link>
      </div>
    </div>
  )
}
