// Documento único de la familia, local-first (mismo enfoque que Counter Ops):
// se guarda entero en localStorage y se sincroniza en segundo plano con un
// bin de JSONBin. El merge es por entidad con last-write-wins (updatedAt),
// así dos móviles nunca se pisan datos.
//
// Forma del documento:
//   members[]            — { id, name, color, avatar: {type, value}, status, updatedAt }
//   deletedMemberIds[]   — tombstones { id, ts }
//   schedule             — { days: { mon..sun: patrón }, updatedAt }
//   walks{fecha}         — { status: 'walked'|'missed'|'cleared', memberId, walkedAt, loggedBy, updatedAt }
//   overrides{fecha}     — { memberId, requestId, updatedAt } (solo se escriben al aceptar peticiones)
//   requests[]           — ciclo pending → accepted | declined | cancelled | expired

const KEY = 'lio-ops-store'

export const SEED_MEMBERS = [
  { id: 'mariona', name: 'Mariona', color: '#c96f9b', avatar: { type: 'initials', value: 'M' }, status: '' },
  { id: 'amaya', name: 'Amaya', color: '#5e8fc7', avatar: { type: 'initials', value: 'A' }, status: '' },
  { id: 'ana', name: 'Ana', color: '#58a274', avatar: { type: 'initials', value: 'A' }, status: '' },
  { id: 'oscar', name: 'Oscar', color: '#cf8f3e', avatar: { type: 'initials', value: 'O' }, status: '' },
]

// Horario real de la familia: Mariona/Amaya entre semana, Ana/Oscar el finde.
// El ancla de los patrones alternos marca "a quién le toca" en esa fecha.
export const SEED_SCHEDULE = {
  days: {
    mon: { type: 'fixed', memberId: 'mariona' },
    tue: { type: 'fixed', memberId: 'amaya' },
    wed: { type: 'fixed', memberId: 'mariona' },
    thu: { type: 'fixed', memberId: 'amaya' },
    fri: { type: 'alternate', memberIds: ['mariona', 'amaya'], anchorDate: '2026-07-24' },
    sat: { type: 'alternate', memberIds: ['ana', 'oscar'], anchorDate: '2026-07-25' },
    sun: { type: 'alternate', memberIds: ['oscar', 'ana'], anchorDate: '2026-07-26' },
  },
  updatedAt: '',
}

export function emptyDoc() {
  return {
    v: 1,
    members: SEED_MEMBERS.map(m => ({ ...m, updatedAt: '' })),
    deletedMemberIds: [],
    schedule: structuredClone(SEED_SCHEDULE),
    walks: {},
    overrides: {},
    requests: [],
    // Estado auxiliar compartido (p. ej. dedup del recordatorio matutino
    // que envía la Action de avisos). LWW por updatedAt.
    meta: { updatedAt: '' },
  }
}

export function loadStore() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { doc: emptyDoc(), currentMemberId: null }
    const persisted = JSON.parse(raw)
    return {
      doc: { ...emptyDoc(), ...persisted.doc },
      currentMemberId: persisted.currentMemberId ?? null,
    }
  } catch {
    return { doc: emptyDoc(), currentMemberId: null }
  }
}

export function saveStore(state) {
  localStorage.setItem(KEY, JSON.stringify({
    doc: state.doc,
    currentMemberId: state.currentMemberId ?? null,
  }))
}

// ── Merge ──

function newer(a, b) {
  return ((b?.updatedAt ?? '') > (a?.updatedAt ?? '')) ? b : a
}

export function tombstoneMap(deletedIds = []) {
  const map = new Map()
  for (const t of deletedIds) {
    const id = typeof t === 'string' ? t : t?.id
    if (!id) continue
    const ts = typeof t === 'string' ? '' : (t.ts ?? '')
    if (!map.has(id) || ts > map.get(id)) map.set(id, ts)
  }
  return map
}

export function unionTombstones(a = [], b = []) {
  const map = tombstoneMap([...a, ...b])
  return Array.from(map.entries()).map(([id, ts]) => ({ id, ts }))
}

function mergeMembers(local = [], remote = [], deletedIds = []) {
  const tombs = tombstoneMap(deletedIds)
  const alive = m => !tombs.has(m.id) || ((m.updatedAt ?? '') > tombs.get(m.id))
  const map = new Map(local.filter(alive).map(m => [m.id, m]))
  for (const m of remote) {
    if (!alive(m)) continue
    map.set(m.id, map.has(m.id) ? newer(map.get(m.id), m) : m)
  }
  return Array.from(map.values())
}

function mergeByDate(local = {}, remote = {}) {
  const out = { ...local }
  for (const [date, item] of Object.entries(remote)) {
    out[date] = out[date] ? newer(out[date], item) : item
  }
  return out
}

// Un estado terminal (accepted/declined/cancelled/expired) siempre gana a
// pending, aunque el pending llegue con updatedAt posterior — nadie puede
// "reabrir" una petición desde un móvil desincronizado.
function mergeRequests(local = [], remote = []) {
  const terminal = s => s !== 'pending'
  const map = new Map(local.map(r => [r.id, r]))
  for (const r of remote) {
    const cur = map.get(r.id)
    if (!cur) { map.set(r.id, r); continue }
    if (terminal(cur.state) !== terminal(r.state)) {
      map.set(r.id, terminal(r.state) ? r : cur)
    } else {
      map.set(r.id, newer(cur, r))
    }
  }
  return Array.from(map.values()).sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
}

export function mergeDocs(local, remote) {
  if (!remote || !remote.v) return local
  const deletedMemberIds = unionTombstones(local.deletedMemberIds, remote.deletedMemberIds)
  return {
    v: 1,
    members: mergeMembers(local.members, remote.members, deletedMemberIds),
    deletedMemberIds,
    schedule: newer(local.schedule, remote.schedule),
    walks: mergeByDate(local.walks, remote.walks),
    overrides: mergeByDate(local.overrides, remote.overrides),
    requests: mergeRequests(local.requests, remote.requests),
    meta: newer(local.meta ?? { updatedAt: '' }, remote.meta ?? { updatedAt: '' }),
  }
}
