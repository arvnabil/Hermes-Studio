import { isSyntheticSessionKey } from './session-utils'
import { createSession, getSession } from './hermes-api'

function hasStatus(error: unknown, status: number): boolean {
  return error instanceof Error &&
    new RegExp(`\\b${status}\\b`).test(error.message)
}

/** Whether a key needs an existence check before enhanced Hermes chat. */
export function shouldEnsureHermesSession(sessionKey: string): boolean {
  return !isSyntheticSessionKey(sessionKey)
}

/**
 * Ensure a real session key exists in Hermes before starting a stream.
 * A 409 during creation is an expected concurrent-create race.
 */
export async function ensureHermesSession(sessionKey: string): Promise<void> {
  try {
    await getSession(sessionKey)
    return
  } catch (error) {
    if (!hasStatus(error, 404)) throw error
  }

  try {
    await createSession({ id: sessionKey })
  } catch (error) {
    if (!hasStatus(error, 409)) throw error
  }
}
