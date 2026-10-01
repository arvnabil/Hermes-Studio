import { afterEach, describe, expect, it, vi } from 'vitest'

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function loadCapabilities(fetchMock: typeof fetch) {
  vi.stubGlobal('fetch', fetchMock)
  vi.resetModules()
  return import('../server/gateway-capabilities')
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('gateway capability detection', () => {
  it('maps current Hermes /v1/capabilities metadata', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = new URL(String(input)).pathname
      if (path === '/health') return response({ status: 'ok' })
      if (path === '/v1/chat/completions') return response({}, 405)
      if (path === '/v1/models') return response({ object: 'list', data: [] })
      if (path === '/api/sessions') return response({ items: [] })
      if (path === '/v1/capabilities') {
        return response({
          features: {
            session_resources: true,
            session_chat: true,
            session_chat_streaming: true,
            skills_api: true,
            memory_write_api: false,
            admin_config_rw: false,
            jobs_admin: false,
          },
        })
      }
      return response({}, 404)
    })

    const gateway = await loadCapabilities(fetchMock)
    const capabilities = await gateway.probeGateway({ force: true })

    expect(capabilities.sessions).toBe(true)
    expect(capabilities.enhancedChat).toBe(true)
    expect(capabilities.skills).toBe(true)
    expect(capabilities.memory).toBe(false)
    expect(capabilities.config).toBe(false)
    expect(capabilities.jobs).toBe(false)
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).endsWith('/api/sessions/__probe__/chat/stream'),
      ),
    ).toBe(false)
  })

  it('uses legacy endpoint probing when capability metadata is unavailable', async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input))
        const path = url.pathname
        if (path === '/health') return response({ status: 'ok' })
        if (path === '/v1/capabilities') return response({}, 404)
        if (path === '/v1/chat/completions') return response({}, 405)
        if (path === '/v1/models') return response({ object: 'list', data: [] })
        if (path === '/api/sessions') {
          return response({ items: [{ id: 'real-session-id' }] })
        }
        if (
          path === '/api/sessions/real-session-id/chat/stream' &&
          init?.method === 'GET'
        ) {
          return response({}, 405)
        }
        if (path === '/api/skills') return response({ items: [] })
        if (path === '/api/memory') return response({})
        if (path === '/api/config') return response({})
        if (path === '/api/jobs') return response({ items: [] })
        return response({}, 404)
      },
    )

    const gateway = await loadCapabilities(fetchMock)
    const capabilities = await gateway.probeGateway({ force: true })

    expect(capabilities.sessions).toBe(true)
    expect(capabilities.enhancedChat).toBe(true)
    expect(capabilities.skills).toBe(true)
    expect(capabilities.memory).toBe(true)
    expect(capabilities.config).toBe(true)
    expect(capabilities.jobs).toBe(true)
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).includes('__probe__'),
      ),
    ).toBe(false)
  })
})
