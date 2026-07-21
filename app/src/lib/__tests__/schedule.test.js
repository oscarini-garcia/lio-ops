import { describe, it, expect } from 'vitest'
import { assignedWalker, creditedWalker, walkEntry } from '../schedule.js'
import { emptyDoc } from '../storage.js'

// 2026-07-21 es martes; 2026-07-24 viernes; 2026-07-25 sábado; 2026-07-26 domingo

describe('assignedWalker', () => {
  it('resuelve días fijos', () => {
    const doc = emptyDoc()
    expect(assignedWalker('2026-07-20', doc)).toBe('mariona') // lunes
    expect(assignedWalker('2026-07-21', doc)).toBe('amaya')   // martes
  })

  it('alterna semana a semana desde el ancla', () => {
    const doc = emptyDoc()
    // vie: ancla 2026-07-24 → mariona; siguiente viernes amaya; anterior amaya
    expect(assignedWalker('2026-07-24', doc)).toBe('mariona')
    expect(assignedWalker('2026-07-31', doc)).toBe('amaya')
    expect(assignedWalker('2026-08-07', doc)).toBe('mariona')
    expect(assignedWalker('2026-07-17', doc)).toBe('amaya')
    // dom: ancla 2026-07-26 → oscar; siguiente ana
    expect(assignedWalker('2026-07-26', doc)).toBe('oscar')
    expect(assignedWalker('2026-08-02', doc)).toBe('ana')
  })

  it('el override aprobado manda sobre el patrón', () => {
    const doc = emptyDoc()
    doc.overrides['2026-07-21'] = { memberId: 'oscar', requestId: 'r_x', updatedAt: 'now' }
    expect(assignedWalker('2026-07-21', doc)).toBe('oscar')
  })

  it('normaliza un ancla que no cae en ese día de la semana', () => {
    const doc = emptyDoc()
    // ancla en jueves 2026-07-23 para el patrón del viernes → primer viernes = 24 → mariona
    doc.schedule.days.fri = { type: 'alternate', memberIds: ['mariona', 'amaya'], anchorDate: '2026-07-23' }
    expect(assignedWalker('2026-07-24', doc)).toBe('mariona')
    expect(assignedWalker('2026-07-31', doc)).toBe('amaya')
  })
})

describe('creditedWalker y walkEntry', () => {
  it('el registro manda para el pasado; cleared cuenta como ausencia', () => {
    const doc = emptyDoc()
    doc.walks['2026-07-20'] = { status: 'walked', memberId: 'amaya', updatedAt: 'now' }
    doc.walks['2026-07-19'] = { status: 'cleared', updatedAt: 'now' }
    expect(creditedWalker('2026-07-20', doc)).toBe('amaya') // aunque el plan decía mariona
    expect(walkEntry('2026-07-19', doc)).toBeNull()
  })
})
