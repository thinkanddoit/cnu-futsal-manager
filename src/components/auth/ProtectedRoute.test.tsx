import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { ProtectedRoute } from './ProtectedRoute'

vi.mock('../../hooks/useAuth')

import { useAuth } from '../../hooks/useAuth'
const mockUseAuth = vi.mocked(useAuth)

function renderWithRouter(ui: React.ReactNode, initialPath = '/protected') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/protected" element={ui} />
        <Route path="/login" element={<div>로그인 페이지</div>} />
        <Route path="/pending" element={<div>승인 대기 페이지</div>} />
        <Route path="/" element={<div>홈</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  it('로그인하지 않으면 /login으로 이동한다', () => {
    mockUseAuth.mockReturnValue({ firebaseUser: null, appUser: null, loading: false })
    renderWithRouter(<ProtectedRoute><div>보호된 페이지</div></ProtectedRoute>)
    expect(screen.getByText('로그인 페이지')).toBeInTheDocument()
  })

  it('pending 상태면 /pending으로 이동한다', () => {
    mockUseAuth.mockReturnValue({
      firebaseUser: {} as any,
      appUser: { uid: '1', role: 'pending' } as any,
      loading: false,
    })
    renderWithRouter(<ProtectedRoute><div>보호된 페이지</div></ProtectedRoute>)
    expect(screen.getByText('승인 대기 페이지')).toBeInTheDocument()
  })

  it('member는 보호된 페이지에 접근할 수 있다', () => {
    mockUseAuth.mockReturnValue({
      firebaseUser: {} as any,
      appUser: { uid: '1', role: 'member' } as any,
      loading: false,
    })
    renderWithRouter(<ProtectedRoute><div>보호된 페이지</div></ProtectedRoute>)
    expect(screen.getByText('보호된 페이지')).toBeInTheDocument()
  })

  it('admin 전용 페이지에 member가 접근하면 홈으로 이동한다', () => {
    mockUseAuth.mockReturnValue({
      firebaseUser: {} as any,
      appUser: { uid: '1', role: 'member' } as any,
      loading: false,
    })
    renderWithRouter(<ProtectedRoute requiredRole="admin"><div>관리자 페이지</div></ProtectedRoute>)
    expect(screen.getByText('홈')).toBeInTheDocument()
  })
})
