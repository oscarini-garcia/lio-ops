import { describe, it, expect } from 'vitest'
import {
  createRequest, acceptRequest, declineRequest, cancelRequest, sweepExpired, skippedDates, retroResponder,
} from '../requests.js'
import { assignedWalker } from '../schedule.js'
import { emptyDoc } from '../storage.js'

function docWith(requests) {
  const doc = emptyDoc()
  doc.requests = requests
  return doc
}

describe('ciclo de peticiones', () => {
  it('aceptar un cover escribe overrides y cierra la petición', () => {
    const r = createRequest({ type: 'cover', requesterId: 'amaya', responderId: 'oscar', dates: ['2026-07-28'] })
    let doc = docWith([r])
    doc = acceptRequest(doc, r.id, 'oscar')
    expect(doc.requests[0].state).toBe('accepted')
    expect(doc.overrides['2026-07-28'].memberId).toBe('oscar')
    expect(assignedWalker('2026-07-28', doc)).toBe('oscar')
  })

  it('solo el responder puede aceptar; solo el requester puede cancelar', () => {
    const r = createRequest({ type: 'cover', requesterId: 'amaya', responderId: 'oscar', dates: ['2026-07-28'] })
    let doc = docWith([r])
    expect(acceptRequest(doc, r.id, 'amaya')).toBe(doc)
    expect(cancelRequest(doc, r.id, 'oscar')).toBe(doc)
    doc = cancelRequest(doc, r.id, 'amaya')
    expect(doc.requests[0].state).toBe('cancelled')
    // un estado terminal ya no se puede aceptar
    expect(acceptRequest(doc, r.id, 'oscar')).toBe(doc)
  })

  it('un swap aceptado escribe los dos overrides', () => {
    const r = createRequest({ type: 'swap', requesterId: 'oscar', responderId: 'ana', dates: ['2026-07-26'], swapReturnDate: '2026-08-01' })
    let doc = docWith([r])
    doc = acceptRequest(doc, r.id, 'ana')
    expect(doc.overrides['2026-07-26'].memberId).toBe('ana')
    expect(doc.overrides['2026-08-01'].memberId).toBe('oscar')
  })

  it('una retro aceptada escribe el paseo pasado (incluso sobre un "se quedó")', () => {
    const r = createRequest({ type: 'retro', requesterId: 'mariona', responderId: 'oscar', dates: ['2026-07-19'] })
    let doc = docWith([r])
    doc.walks['2026-07-19'] = { status: 'missed', updatedAt: '2026-07-19T10:00:00Z' }
    doc = acceptRequest(doc, r.id, 'oscar')
    expect(doc.walks['2026-07-19'].status).toBe('walked')
    expect(doc.walks['2026-07-19'].memberId).toBe('mariona')
  })

  it('en un rango, los días ya resueltos se omiten', () => {
    const r = createRequest({ type: 'cover', requesterId: 'amaya', responderId: 'oscar', dates: ['2026-07-28', '2026-07-30'] })
    let doc = docWith([r])
    doc.walks['2026-07-28'] = { status: 'walked', memberId: 'amaya', updatedAt: 'now' }
    expect(skippedDates(r, doc)).toEqual(['2026-07-28'])
    doc = acceptRequest(doc, r.id, 'oscar')
    expect(doc.overrides['2026-07-28']).toBeUndefined()
    expect(doc.overrides['2026-07-30'].memberId).toBe('oscar')
  })

  it('las peticiones con fecha pasada caducan en el barrido', () => {
    const r = createRequest({ type: 'cover', requesterId: 'amaya', responderId: 'oscar', dates: ['2026-07-10'] })
    const doc = sweepExpired(docWith([r]), '2026-07-21')
    expect(doc.requests[0].state).toBe('expired')
  })

  it('rechazar cierra sin efectos', () => {
    const r = createRequest({ type: 'cover', requesterId: 'amaya', responderId: 'oscar', dates: ['2026-07-28'] })
    const doc = declineRequest(docWith([r]), r.id, 'oscar')
    expect(doc.requests[0].state).toBe('declined')
    expect(doc.overrides['2026-07-28']).toBeUndefined()
  })

  it('quién confirma una retro: el dueño del día, o a elegir si era tuyo', () => {
    const doc = emptyDoc()
    // 2026-07-20 lunes → mariona; si reclama amaya, confirma mariona
    expect(retroResponder('2026-07-20', 'amaya', doc)).toBe('mariona')
    // si reclama la propia mariona, debe elegir confirmador
    expect(retroResponder('2026-07-20', 'mariona', doc)).toBeNull()
  })
})
