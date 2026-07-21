import { addDays, todayKey, monthOf, fmtTime } from './dates.js'
import { walkEntry } from './schedule.js'

function walkedDates(doc) {
  return Object.entries(doc.walks ?? {})
    .filter(([, w]) => w.status === 'walked')
    .map(([date, w]) => ({ date, ...w }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// Racha de Lio: mañanas seguidas con paseo, terminando hoy o ayer
export function lioStreak(doc, today = todayKey()) {
  const walked = new Set(walkedDates(doc).map(w => w.date))
  let start = walked.has(today) ? today : addDays(today, -1)
  let streak = 0
  let d = start
  while (walked.has(d)) { streak++; d = addDays(d, -1) }
  return streak
}

export function bestLioStreak(doc) {
  const dates = walkedDates(doc).map(w => w.date)
  let best = 0, run = 0, prev = null
  for (const d of dates) {
    run = (prev && addDays(prev, 1) === d) ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}

export function missedMornings(doc, month) {
  return Object.entries(doc.walks ?? {})
    .filter(([date, w]) => w.status === 'missed' && (!month || monthOf(date) === month))
    .map(([date, w]) => ({ date, ...w }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function walkTotals(doc, month) {
  const totals = {}
  for (const w of walkedDates(doc)) {
    if (month && monthOf(w.date) !== month) continue
    totals[w.memberId] = (totals[w.memberId] ?? 0) + 1
  }
  return totals
}

// Madrugador/a: mediana de la hora de paseo del mes (solo paseos con hora)
export function earlyBird(doc, month) {
  const byMember = {}
  for (const w of walkedDates(doc)) {
    if (month && monthOf(w.date) !== month) continue
    if (!w.walkedAt) continue
    const d = new Date(w.walkedAt)
    const mins = d.getHours() * 60 + d.getMinutes()
    ;(byMember[w.memberId] ??= []).push(mins)
  }
  let winner = null
  for (const [memberId, arr] of Object.entries(byMember)) {
    arr.sort((a, b) => a - b)
    const median = arr[Math.floor(arr.length / 2)]
    if (!winner || median < winner.median) winner = { memberId, median }
  }
  if (!winner) return null
  const h = Math.floor(winner.median / 60)
  const m = String(Math.round(winner.median % 60)).padStart(2, '0')
  return { memberId: winner.memberId, time: `${h}:${m}` }
}

export function favoriteWalker(doc, month) {
  const totals = walkTotals(doc, month)
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) return null
  return { memberId: entries[0][0], walks: entries[0][1] }
}

// Deuda matutina: solo los covers aceptados cuentan.
// El responder "presta" una mañana al requester por cada fecha cubierta.
export function balances(doc) {
  const pair = {} // clave "deudor→acreedor" → nº mañanas
  for (const r of doc.requests ?? []) {
    if (r.type !== 'cover' || r.state !== 'accepted') continue
    // Solo las fechas realmente aplicadas (con override de esta petición)
    const applied = r.dates.filter(d => doc.overrides?.[d]?.requestId === r.id)
    if (applied.length === 0) continue
    const key = `${r.requesterId}→${r.responderId}`
    pair[key] = (pair[key] ?? 0) + applied.length
  }
  // Neteo entre cada pareja
  const net = {}
  for (const [key, n] of Object.entries(pair)) {
    const [debtor, creditor] = key.split('→')
    const rev = `${creditor}→${debtor}`
    if (net[rev] !== undefined) {
      const diff = net[rev] - n
      delete net[rev]
      if (diff > 0) net[rev] = diff
      else if (diff < 0) net[key] = -diff
    } else {
      net[key] = (net[key] ?? 0) + n
    }
  }
  return Object.entries(net)
    .map(([key, mornings]) => {
      const [debtorId, creditorId] = key.split('→')
      return { debtorId, creditorId, mornings }
    })
    .sort((a, b) => b.mornings - a.mornings)
}

export function lastWalkTime(doc, date) {
  const w = walkEntry(date, doc)
  return w?.walkedAt ? fmtTime(w.walkedAt) : null
}
