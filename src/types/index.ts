export type UserRole = 'pending' | 'member' | 'admin' | 'guest'

export interface AppUser {
  uid: string
  name: string
  kakaoId?: string
  role: UserRole
  createdAt: Date
  nameConfirmed?: boolean
}

export type MatchStatus = 'voting' | 'confirmed' | 'completed'

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
  userId: string | null
  status: AttendanceStatus
  updatedAt: Date
}

export interface MomResult {
  matchId: string
  first: string[]    // uid 또는 guestName 배열
  second: string[]
  third: string[]    // 빈 배열 허용
  createdAt: Date
}

export interface MomVote {
  matchId: string
  voterId: string
  votedFor: string
  createdAt: Date
}

export interface MatchPhoto {
  id: string
  matchId: string
  url: string
  uploadedBy: string
  createdAt: Date
}

export interface UserStats {
  userId: string
  totalPoints: number
  attendanceCount: number
  mom1st: number
  mom2nd: number
  mom3rd: number
}

export interface RankedUser {
  user: AppUser
  stats: UserStats
  rank: number
}
