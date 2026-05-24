# 사후(수동) 경기 등록 설계

**작성일:** 2026-05-24  
**대상:** 관리자(admin) 전용 기능  
**진입점:** `/admin/matches` → "경기 등록" 버튼

---

## 개요

운영진이 경기 날짜·시간·장소·참석자가 확정된 상태에서 수동으로 경기를 등록하는 기능.  
경기 전 등록과 경기 후 등록 모두 지원하며, 입력한 날짜/시간 기준으로 MVP 처리 방식을 자동 결정한다.

---

## 3단계 Wizard UI

### ① 기본정보

| 필드 | 타입 | 비고 |
|------|------|------|
| 날짜 | date input | 필수 |
| 시간 | time input (HH:MM) | 필수 |
| 경기장 | text input | 필수 |

### ② 참석자

- 가입된 회원 목록을 2열 그리드 체크박스로 표시
- 최대 16명 제한 (회원 + 비회원 합산)
- 선택 카운터 표시 (n / 16명)
- 비회원 추가: 이름 입력 후 추가, 삭제 가능
- 비회원은 노란색 배경으로 구분 표시

### ③ MVP

입력한 날짜/시간과 현재 시각을 비교하여 자동 분기:

**경기 전 (날짜/시간 > 현재)**
- "경기 완료 후 참석자 투표로 MVP가 선정됩니다" 안내 화면만 표시
- 별도 입력 없음

**경기 후 (날짜/시간 ≤ 현재)**
- 🥇 1등, 🥈 2등, 🥉 3등 각각 복수 선택 가능
- 이미 다른 등수에 선택된 참석자는 비활성화 + 등수 표시
- 3등은 선택 선택 사항 (동률로 인해 없을 수 있음)

---

## 등록 완료 처리

| 케이스 | status | 추가 처리 |
|--------|--------|-----------|
| 경기 전 | `confirmed` | 없음 |
| 경기 후 (MVP 미지정) | `completed` | 없음 |
| 경기 후 (MVP 지정) | `completed` | mvpResults 저장 |

---

## Firestore 데이터 모델 변경

### `matches` 컬렉션 — 필드 추가

```
time: string  // "HH:MM" 형식, 기존 date 필드는 유지
```

### `attendances` 컬렉션 — 필드 추가

```
guestName?: string  // 비회원인 경우 이름. userId는 null
```

### `mvpResults` 컬렉션 (신규)

```
matchId: string
first: string[]   // uid 또는 guestName 배열
second: string[]
third: string[]   // 빈 배열 허용
createdAt: Timestamp
```

---

## 기존 코드 변경 사항

- `types/index.ts`: `Match`에 `time` 필드 추가, `Attendance`에 `guestName` 필드 추가, `MvpResult` 타입 신규 추가
- `services/matches.ts`: `createMatch` 함수에 `time` 파라미터 추가
- `services/attendances.ts`: 비회원 참석 저장 지원
- `services/mvpResults.ts`: 신규 서비스 파일
- `AdminMatchesPage.tsx`: 기존 일괄 생성 UI 유지 + 수동 등록 Wizard 추가

---

## 범위 외 (이번 구현에 포함 안 함)

- 경기 수정/삭제
- 사전 투표 기반 경기 등록 (별도 기능)
- 경기 결과 스코어 입력
