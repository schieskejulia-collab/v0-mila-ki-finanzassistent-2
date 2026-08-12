'use client'

export type MilaAuditEvent = {
  id: string
  clientId: string
  type: 'handoff_created' | 'manual_note'
  title: string
  detail?: string
  createdAt: string
}

const AUDIT_KEY = 'mila-client-audit-v1'

export function readAuditEvents(clientId: string): MilaAuditEvent[] {
  if (typeof window === 'undefined' || !clientId) return []
  try {
    const raw = window.localStorage.getItem(AUDIT_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    const events = parsed?.[clientId]
    return Array.isArray(events) ? events : []
  } catch {
    return []
  }
}

export function appendAuditEvent(event: Omit<MilaAuditEvent, 'id' | 'createdAt'> & { createdAt?: string }) {
  if (typeof window === 'undefined' || !event.clientId) return
  try {
    const raw = window.localStorage.getItem(AUDIT_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    const current = Array.isArray(parsed?.[event.clientId]) ? parsed[event.clientId] : []
    const nextEvent: MilaAuditEvent = {
      ...event,
      id: globalThis.crypto?.randomUUID?.() || `audit-${Date.now()}`,
      createdAt: event.createdAt || new Date().toISOString(),
    }
    const next = { ...parsed, [event.clientId]: [nextEvent, ...current].slice(0, 200) }
    window.localStorage.setItem(AUDIT_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent('mila-audit-updated', { detail: { clientId: event.clientId } }))
  } catch {
    // Audit logging must never block the user's workflow.
  }
}
