export type UserRole = 'pending' | 'member' | 'admin'

export interface AppUser {
  uid: string
  name: string
  kakaoId: string
  profileImage: string
  role: UserRole
  createdAt: Date
  nameConfirmed: boolean
}

export type MatchStatus = 'voting' | 'confirmed' | 'cancelled' | 'completed'

export interface Match {
  id: string
  date: Date
  time: string        // "HH:MM" 형식
  venue: string
  status: MatchStatus
  confirmedAt: Date | null
  voteDeadline: Date | null
  voteTallied: boolean
  createdBy: string
}

export type AttendanceStatus = 'attending' | 'absent'

export interface Attendance {
  matchId: string
  userId: string | null   // 비회원은 null
  guestName?: string      // 비회원 이름
  status: AttendanceStatus
  updatedAt: Date
}

export interface MvpResult {
  matchId: string
  first: string[]    // uid 또는 guestName 배열
  second: string[]
  third: string[]    // 빈 배열 허용
  createdAt: Date
}

export interface MvpVote {
  matchId: string
  voterId: string
  votedFor: string
  createdAt: Date
}

export interface UserStats {
  userId: string
  totalPoints: number
  attendanceCount: number
  mvp1st: number
  mvp2nd: number
  mvp3rd: number
}

export interface RankedUser {
  user: AppUser
  stats: UserStats
  rank: number
}
