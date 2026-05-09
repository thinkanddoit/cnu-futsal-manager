import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Firebase modules globally to prevent initialization errors in tests
vi.mock('./firebase', () => ({
  app: {},
  auth: {},
  db: {},
  functions: {},
}))
