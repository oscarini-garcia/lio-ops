import { describe, it, expect } from 'vitest'
import { mergeDocs, emptyDoc } from '../storage.js'
import { createRequest } from '../requests.js'

describe('mergeDocs', () => {
  it('dos móviles convergen: el walk más reciente gana por fecha', () => {
    const a = emptyDoc()
    const b = emptyDoc()
    a.walks['2026-07-21'] = { status: 'walked', memberId: 'amaya', updatedAt: '2026-07-21T07:00:00Z' }
    b.walks['2026-07-21'] = { status: 'missed', updatedAt: '2026-07-21T09:00:00Z' }
    b.walks['2026-07-20'] = { status: 'walked', memberId: 'mariona', updatedAt: '2026-07-20T08:00:00Z' }

    const ab = mergeDocs(a, b)
    const ba = mergeDocs(b, a)
    expect(ab.walks['2026-07-21'].status).toBe('missed')
    expect(ba.walks['2026-07-21'].status).toBe('missed')
    expect(ab.walks['2026-07-20'].memberId).toBe('mariona')
  })

  it('un estado terminal de petición gana siempre a pending', () => {
    const r = createRequest({ type: 'cover', requesterId: 'amaya', responderId: 'oscar', dates: ['2026-07-28'] })
    const a = emptyDoc()
    const b = emptyDoc()
    a.requests = [{ ...r, state: 'pending', updatedAt: '2026-07-22T10:00:00Z' }]
    b.requests = [{ ...r, state: 'accepted', resolvedAt: '2026-07-21T10:00:00Z', updatedAt: '2026-07-21T10:00:00Z' }]

    expect(mergeDocs(a, b).requests[0].state).toBe('accepted')
    expect(mergeDocs(b, a).requests[0].state).toBe('accepted')
  })

  it('los miembros borrados no resucitan, pero re-crearlos después sí', () => {
    const a = emptyDoc()
    const b = emptyDoc()
    a.members = a.members.filter(m => m.id !== 'ana')
    a.deletedMemberIds = [{ id: 'ana', ts: '2026-07-21T10:00:00Z' }]

    const merged = mergeDocs(a, b)
    expect(merged.members.find(m => m.id === 'ana')).toBeUndefined()

    // re-creación posterior al tombstone
    b.members = b.members.map(m => m.id === 'ana' ? { ...m, updatedAt: '2026-07-22T10:00:00Z' } : m)
    const merged2 = mergeDocs(a, b)
    expect(merged2.members.find(m => m.id === 'ana')).toBeDefined()
  })

  it('el horario usa last-write-wins', () => {
    const a = emptyDoc()
    const b = emptyDoc()
    a.schedule = { ...a.schedule, days: { ...a.schedule.days, mon: { type: 'fixed', memberId: 'oscar' } }, updatedAt: '2026-07-22T10:00:00Z' }
    b.schedule = { ...b.schedule, updatedAt: '2026-07-21T10:00:00Z' }
    expect(mergeDocs(b, a).schedule.days.mon.memberId).toBe('oscar')
    expect(mergeDocs(a, b).schedule.days.mon.memberId).toBe('oscar')
  })

  it('un remoto vacío o corrupto no destruye lo local', () => {
    const a = emptyDoc()
    a.walks['2026-07-21'] = { status: 'walked', memberId: 'amaya', updatedAt: 'now' }
    expect(mergeDocs(a, null).walks['2026-07-21']).toBeDefined()
    expect(mergeDocs(a, {}).walks['2026-07-21']).toBeDefined()
  })
})
