import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import { subscribeToMatchAttendances, setAttendance } from '../services/attendances'
import { castMomVote, getMyVote, getVotesForMatch, computeMomResultFromVotes } from '../services/votes'
import { getMomResult } from '../services/momResults'
import { serverTally } from '../services/stats'
import { getAllUsers } from '../services/users'
import { setMatchPhoto, getMatchPhoto } from '../services/photos'
import { Match, Attendance, AppUser, MomResult, MatchPhoto } from '../types'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

function docToMatch(id: string, data: Record<string, any>): Match {
  return {
    id,
    date: data.date?.toDate() ?? new Date(),
    time: data.time ?? '',
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
  const navigate = useNavigate()
  const [match, setMatch] = useState<Match | null>(null)
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [members, setMembers] = useState<AppUser[]>([])
  const [myVote, setMyVote] = useState<string | null>(null)
  const [momResult, setMomResult] = useState<MomResult | null>(null)
  const [photo, setPhoto] = useState<MatchPhoto | null>(null)
  const [photoLoading, setPhotoLoading] = useState(true)
  const [lightbox, setLightbox] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!id) return
    getDoc(doc(db, 'matches', id)).then(async (snap) => {
      if (!snap.exists()) {
        alert('삭제된 경기입니다.')
        navigate('/', { replace: true })
        return
      }
      const m = docToMatch(snap.id, snap.data())
      setMatch(m)
      // mvpResults 없고 집계 완료된 경기면 votes에서 직접 계산
      if (m.voteTallied) {
        const result = await getMomResult(id)
        if (result) {
          setMomResult(result)
        } else {
          const fromVotes = await computeMomResultFromVotes(id)
          if (fromVotes) setMomResult({ matchId: id, ...fromVotes, createdAt: new Date() })
        }
      } else {
        getMomResult(id).then(setMomResult)
      }
      setLoading(false)
    })
    getAllUsers().then(setMembers)
    getMatchPhoto(id).then((p) => { setPhoto(p); setPhotoLoading(false) })
  }, [id])

  useEffect(() => {
    if (!id) return
    return subscribeToMatchAttendances(id, setAttendances)
  }, [id])

  useEffect(() => {
    if (!id || !appUser) return
    getMyVote(id, appUser.uid).then((v) => setMyVote(v?.votedFor ?? null))
  }, [id, appUser])

  if (loading) return <LoadingSpinner />
  if (!match) return null

  const attending = attendances.filter((a) => a.status === 'attending')
  const myAttendance = attendances.find((a) => a.userId === appUser?.uid)
  const canChangeAttendance = match.status === 'voting'
  const isCompleted = match.status === 'completed'
  const isAttending = attending.some((a) => a.userId === appUser?.uid)
  const isVotingOpen =
    match.status === 'completed' &&
    !match.voteTallied &&
    match.voteDeadline &&
    match.voteDeadline > new Date() &&
    isAttending

  async function handleAttendanceToggle() {
    if (!appUser || !id) return
    const next = myAttendance?.status === 'attending' ? 'absent' : 'attending'
    await setAttendance(id, appUser.uid, next)
  }

  async function handleVote(votedFor: string) {
    if (!appUser || !id) return
    await castMomVote(id, appUser.uid, votedFor)
    setMyVote(votedFor)

    // 비용병 참석자 전원 투표 완료 시 자동 집계
    const eligibleVoterIds = attending
      .filter((a) => a.userId && memberMap[a.userId]?.role !== 'guest')
      .map((a) => a.userId!)

    if (eligibleVoterIds.length > 0) {
      const votes = await getVotesForMatch(id)
      const voterIds = new Set(votes.map((v) => v.voterId))
      if (eligibleVoterIds.every((uid) => voterIds.has(uid))) {
        await serverTally(id)
        const snap = await getDoc(doc(db, 'matches', id))
        if (snap.exists()) setMatch(docToMatch(snap.id, snap.data()))
        const result = await getMomResult(id)
        if (result) {
          setMomResult(result)
        } else {
          const fromVotes = await computeMomResultFromVotes(id)
          if (fromVotes) setMomResult({ matchId: id, ...fromVotes, createdAt: new Date() })
        }
      }
    }
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!appUser || !id || !e.target.files?.length) return
    setUploading(true)
    try {
      const newPhoto = await setMatchPhoto(id, appUser.uid, e.target.files[0])
      setPhoto(newPhoto)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleKakaoShare() {
    const attendingNames = attending
      .map((a) => a.userId ? (memberMap[a.userId]?.name ?? '알 수 없음') : '알 수 없음')
      .join(', ')

    window.Kakao.Share.sendDefault({
      objectType: 'text',
      text: `⚽ CNU 풋살 경기 안내\n\n📅 ${match!.date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}${match!.time ? ' ' + match!.time : ''}\n📍 ${match!.venue}\n👥 참석 (${attending.length}명): ${attendingNames}`,
      link: { mobileWebUrl: window.location.href, webUrl: window.location.href },
    })
  }

  function getAttendeeName(a: Attendance): string {
    if (a.userId) return memberMap[a.userId]?.name ?? '알 수 없음'
    return '알 수 없음'
  }

  const memberMap = Object.fromEntries(members.map((m) => [m.uid, m]))

  return (
    <>
      {/* 라이트박스 */}
      {lightbox && photo && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setLightbox(false)}
        >
          <img
            src={photo.url}
            alt=""
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white text-3xl leading-none"
            onClick={() => setLightbox(false)}
          >
            ×
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoSelect}
      />

      <div className="space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400"
        >
          ← 뒤로
        </button>

        {/* 커버 사진 — 완료된 경기 + 로그인 유저만 */}
        {isCompleted && appUser && (
          <div
            className="w-full aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden relative"
            onClick={() => photo && !uploading && setLightbox(true)}
          >
            {photoLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <LoadingSpinner />
              </div>
            ) : photo ? (
              <>
                <img
                  src={photo.url}
                  alt=""
                  className="w-full h-full object-cover"
                  onLoad={(e) => (e.currentTarget.style.opacity = '1')}
                  style={{ opacity: 0, transition: 'opacity 0.3s ease' }}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                  disabled={uploading}
                  className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm"
                >
                  {uploading ? '업로드 중...' : '사진 수정'}
                </button>
              </>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400"
              >
                {uploading ? (
                  <LoadingSpinner />
                ) : (
                  <>
                    <span className="text-3xl">📷</span>
                    <span className="text-sm">경기 사진 추가</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* 경기 정보 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-4">
          <h1 className="text-xl font-bold dark:text-white">
            {match.date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
            {match.time && <span className="text-base font-normal text-gray-500 dark:text-gray-400 ml-2">{match.time}</span>}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">{match.venue}</p>
          <p className="text-sm mt-1 dark:text-gray-300">
            {isCompleted ? '참석' : '참석 예정'}: <strong>{attending.length}명</strong>
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

        {!isCompleted && (
          <button
            onClick={handleKakaoShare}
            className="w-full bg-yellow-400 text-black font-semibold py-2 rounded-lg"
          >
            카카오톡으로 참석자 공유
          </button>
        )}

        {momResult && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-4">
            <h2 className="font-semibold mb-3 dark:text-white">MOM</h2>
            {momResult.first.length > 0 && (
              <p className="text-sm mb-1 dark:text-gray-300">
                <span className="mr-1">🥇</span>
                {momResult.first.map((uid) => memberMap[uid]?.name ?? uid).join(', ')}
              </p>
            )}
            {momResult.second.length > 0 && (
              <p className="text-sm mb-1 dark:text-gray-300">
                <span className="mr-1">🥈</span>
                {momResult.second.map((uid) => memberMap[uid]?.name ?? uid).join(', ')}
              </p>
            )}
            {momResult.third.length > 0 && (
              <p className="text-sm dark:text-gray-300">
                <span className="mr-1">🥉</span>
                {momResult.third.map((uid) => memberMap[uid]?.name ?? uid).join(', ')}
              </p>
            )}
          </div>
        )}

        <div>
          <h2 className="font-semibold mb-2 dark:text-white">{isCompleted ? '참석자' : '참석 예정자'} ({attending.length}명)</h2>
          <ul className="space-y-2">
            {[...attending].sort((a, b) => {
              const aGuest = memberMap[a.userId!]?.role === 'guest' ? 1 : 0
              const bGuest = memberMap[b.userId!]?.role === 'guest' ? 1 : 0
              return aGuest - bGuest
            }).map((a, i) => (
              <li key={a.userId ?? i} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded p-3 shadow-sm dark:shadow-none dark:ring-1 dark:ring-gray-700">
                <span className="dark:text-gray-200">{getAttendeeName(a)}</span>
                {isVotingOpen && appUser && a.userId !== appUser.uid && memberMap[a.userId!]?.role !== 'guest' && (
                  <button
                    onClick={() => handleVote(a.userId!)}
                    className={`text-sm px-3 py-1 rounded-full ${
                      myVote === a.userId
                        ? 'bg-yellow-400 text-black font-bold'
                        : 'bg-blue-900 dark:bg-amber-500 text-white'
                    }`}
                  >
                    {myVote === a.userId ? '✓ 투표함' : 'MOM 투표'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}
