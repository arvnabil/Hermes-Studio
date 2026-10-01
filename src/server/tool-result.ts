/** Normalize a Hermes tool completion payload into a safe display string. */
export function getToolResultPreview(
  data: Record<string, unknown>,
): string {
  const raw = data.result_preview ?? data.result ?? data.output ?? data.message
  if (typeof raw === 'string') return raw
  if (raw === undefined || raw === null) return ''

  try {
    const serialized = JSON.stringify(raw, null, 2)
    return serialized === undefined ? String(raw) : serialized
  } catch {
    return String(raw)
  }
}
