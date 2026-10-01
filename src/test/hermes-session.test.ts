import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetSession = vi.fn()
const mockCreateSession = vi.fn()

vi.mock('../server/hermes-api', () => ({
  createSession: (...args: unknown[]) => mockCreateSession(...args),
  getSession: (...args: unknown[]) => mockGetSession(...args),
}))

import {
  ensureHermesSession,
  shouldEnsureHermesSession,
} from '../server/hermes-session'

beforeEach(() => {
  mockGetSession.mockReset()
  mockCreateSession.mockReset()
})

describe('enhanced Hermes session lifecycle', () => {
  it('keeps an existing UUID session', async () => {
    mockGetSession.mockResolvedValue({ id: 'uuid-session' })

    await ensureHermesSession('uuid-session')

    expect(mockGetSession).toHaveBeenCalledWith('uuid-session')
    expect(mockCreateSession).not.toHaveBeenCalled()
  })

  it('creates a missing UUID session before streaming', async () => {
    mockGetSession.mockRejectedValue(
      new Error('Hermes API /api/sessions/uuid-session: 404 not found'),
    )
    mockCreateSession.mockResolvedValue({ id: 'uuid-session' })

    await ensureHermesSession('uuid-session')

    expect(mockCreateSession).toHaveBeenCalledWith({ id: 'uuid-session' })
  })

  it('continues when concurrent creation returns 409', async () => {
    mockGetSession.mockRejectedValue(
      new Error('Hermes API /api/sessions/uuid-session: 404 not found'),
    )
    mockCreateSession.mockRejectedValue(
      new Error('Hermes API POST /api/sessions: 409 already exists'),
    )

    await expect(ensureHermesSession('uuid-session')).resolves.toBeUndefined()
  })

  it('preserves main/new bootstrap behavior', () => {
    expect(shouldEnsureHermesSession('main')).toBe(false)
    expect(shouldEnsureHermesSession('new')).toBe(false)
    expect(shouldEnsureHermesSession('uuid-session')).toBe(true)
  })
})
