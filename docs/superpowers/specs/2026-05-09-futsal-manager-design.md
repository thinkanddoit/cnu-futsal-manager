# 풋살 동호회 관리 앱 — 설계 문서

**날짜:** 2026-05-09  
**스택:** React 19, TypeScript, Vite, Tailwind CSS, Firebase (Auth + Firestore + Hosting + Cloud Functions), React Router 7

---

## 개요

풋살 동호회 운영을 위한 웹앱. PC/모바일 반응형. 로그인 없이 조회 가능하며, 카카오 OAuth 기반 회원가입 + 운영진 승인 절차를 통해 회원/관리자 권한을 구분한다.

---

## 사용자 권한

| 권한 | 설명 |
|------|------|
| 비회원 | 경기 일정, 랭킹 조회만 가능 |
| pending | 카카오 로그인 후 승인 대기 상태 |
| member | 경기 참석 신청/변경, MVP 투표 가능 |
| admin | 전체 관리 권한 (경기 생성/확정, 회원 승인 등) |

---

## 화면 구성 (라우팅)

### 공개
- `/` — 홈: 다가오는 경기, 랭킹 미리보기
- `/schedule` — 경기 일정: 월별 경기 목록, 신청 현황
- `/rankings` — 랭킹: 점수/참석률 순위표

### 회원 전용
- `/match/:id` — 경기 상세: 참석/불참 변경, MVP 투표
- `/mypage` — 마이페이지: 내 참석 내역, 내 점수

### 관리자 전용
- `/admin` — 가입 승인 대기 목록
- `/admin/matches` — 경기 생성/확정/취소
- `/admin/members` — 회원 목록 및 권한 관리

### 인증
- `/login` — 카카오 로그인
- `/pending` — 승인 대기 안내

---

## Firestore 데이터 모델

### `users/{uid}`
```
name: string
kakaoId: string
profileImage: string
role: 'pending' | 'member' | 'admin'
createdAt: Timestamp
```

### `matches/{matchId}`
```
date: Timestamp          // 경기 날짜 (매주 월요일)
venue: string            // 경기장
status: 'voting' | 'confirmed' | 'cancelled' | 'completed'
confirmedAt: Timestamp | null
voteDeadline: Timestamp | null   // completed 처리 시 now + 24h 자동 설정
voteTallied: boolean             // 집계 완료 여부
createdBy: uid
```

### `attendances/{matchId_userId}`
```
matchId: string
userId: string
status: 'attending' | 'absent'
updatedAt: Timestamp
```

### `mvpVotes/{matchId_voterId}`
```
matchId: string
voterId: string
votedFor: string         // userId
createdAt: Timestamp
```

### `userStats/{userId}`
```
totalPoints: number
attendanceCount: number
mvp1st: number
mvp2nd: number
mvp3rd: number
```

---

## 점수 시스템

| 항목 | 점수 |
|------|------|
| 경기 참석 | 1점 |
| MVP 1등 | 3점 |
| MVP 2등 | 2점 |
| MVP 3등 | 1점 |

- MVP는 해당 경기 참석자만 투표 가능, 자기 자신에게 투표 불가
- 투표는 경기 완료 후 24시간 동안만 유효
- 동점 처리: 득표수 기준 내림차순, 동점이면 같은 순위 공유 (공동 1등 → 2등 없이 다음은 3등)
- `completed` 처리 시 `voteDeadline = now + 24h`, `voteTallied = false` 자동 설정
- 스케줄 Cloud Function (매시간)이 `voteDeadline < now && voteTallied === false` 인 경기를 찾아 득표 집계 후 `userStats` 업데이트, `voteTallied = true`로 변경

---

## 주요 플로우

### 가입 플로우
1. `/login`에서 카카오 로그인 버튼 클릭
2. Kakao OAuth 인증
3. Cloud Function: Kakao 토큰 검증 → Firebase Custom Token 발급
4. Firestore `users`에 `role: pending`으로 신규 저장 (기존 사용자는 그대로)
5. pending이면 `/pending`으로 리다이렉트
6. 관리자가 `/admin`에서 승인 → `role: member`로 업데이트
7. 회원은 로그인 후 정상 이용

### 경기 플로우
1. 관리자가 `/admin/matches`에서 다음 달 월요일 경기 일괄 생성 (`status: voting`)
2. 회원들이 각 경기에 참석 신청 (`attendances` 문서 생성)
3. 관리자가 인원 수 및 경기장 예약 여부 확인 후 `confirmed` 또는 `cancelled`로 변경
4. 경기 완료 후 `completed`로 변경 → Cloud Function 트리거 → MVP 투표 24시간 오픈
5. 투표 마감 후 득표 집계 → `userStats` 업데이트

### 카카오톡 참석자 공유
- Kakao SDK `Kakao.Share.sendDefault()` 사용
- 공유 내용: 경기 날짜, 경기장, 참석자 명단
- 관리자 또는 회원이 경기 상세 페이지에서 공유 버튼 클릭

### 참석 변경
- 회원은 `/match/:id`에서 참석 → 불참 또는 불참 → 참석으로 변경 가능
- 경기 status가 `confirmed` 또는 `completed`이면 변경 불가 (관리자만 가능)

---

## 인프라 / 배포

| 항목 | 선택 |
|------|------|
| Hosting | Firebase Hosting (무료) |
| DB | Firestore (무료 티어) |
| Auth | Firebase Auth (Custom Token) |
| Functions | Cloud Functions for Firebase (무료 티어: 월 2M 호출) |
| Kakao Auth | Kakao Developers REST API |
| Kakao Share | Kakao SDK (JavaScript) |

---

## 미결 사항 (나중에 수정 가능)
- 점수 배점 (현재: 참석 1점, MVP 1/2/3등 → 3/2/1점) — 추후 조정 가능
- 경기 참석 신청 마감 시점 (현재: 경기 confirmed 전까지 자유)
- 푸시 알림 여부 (현재 스코프 외)
