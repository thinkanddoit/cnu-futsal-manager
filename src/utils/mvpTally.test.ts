import { describe, it, expect } from 'vitest'
import { tallyMvpVotes } from './mvpTally'

describe('tallyMvpVotes', () => {
  it('득표 없으면 빈 배열 반환', () => {
    expect(tallyMvpVotes([])).toEqual([])
  })

  it('1등 2등 3등 순서대로 점수 부여', () => {
    const result = tallyMvpVotes([
      { userId: 'a', votes: 5 },
      { userId: 'b', votes: 3 },
      { userId: 'c', votes: 1 },
    ])
    expect(result).toEqual([
      { userId: 'a', rank: 1, points: 3 },
      { userId: 'b', rank: 2, points: 2 },
      { userId: 'c', rank: 3, points: 1 },
    ])
  })

  it('공동 2등이면 3등 없음', () => {
    const result = tallyMvpVotes([
      { userId: 'a', votes: 5 },
      { userId: 'b', votes: 3 },
      { userId: 'c', votes: 3 },
      { userId: 'd', votes: 1 },
    ])
    expect(result).toEqual([
      { userId: 'a', rank: 1, points: 3 },
      { userId: 'b', rank: 2, points: 2 },
      { userId: 'c', rank: 2, points: 2 },
    ])
  })

  it('공동 1등이면 2등 없이 3등으로 넘어감', () => {
    const result = tallyMvpVotes([
      { userId: 'a', votes: 5 },
      { userId: 'b', votes: 5 },
      { userId: 'c', votes: 3 },
    ])
    expect(result).toEqual([
      { userId: 'a', rank: 1, points: 3 },
      { userId: 'b', rank: 1, points: 3 },
      { userId: 'c', rank: 3, points: 1 },
    ])
  })

  it('4위 이하는 포함하지 않음', () => {
    const result = tallyMvpVotes([
      { userId: 'a', votes: 5 },
      { userId: 'b', votes: 4 },
      { userId: 'c', votes: 3 },
      { userId: 'd', votes: 2 },
    ])
    expect(result.map((r) => r.userId)).not.toContain('d')
  })
})
