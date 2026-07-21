// Emisor de avisos push (lo ejecuta .github/workflows/notify.yml cada 30 min).
//
// Lee el documento compartido de JSONBin y envía por OneSignal:
//   1. peticiones nuevas → aviso al que tiene que responder
//   2. peticiones resueltas → aviso a quien las pidió
//   3. recordatorio matutino (7:00–10:00) si el paseo de hoy no está registrado
//
// El proceso corre con TZ=Europe/Madrid, así que las fechas "locales" de la
// lógica compartida (app/src/lib) coinciden con las de los móviles.
//
// Sale con código 0 y sin hacer nada si falta configuración: así el workflow
// no falla en repos donde el push aún no está montado.

import { assignedWalker, walkEntry } from '../app/src/lib/schedule.js'
import { todayKey } from '../app/src/lib/dates.js'

const JSONBIN_ID = process.env.JSONBIN_ID
const JSONBIN_KEY = process.env.JSONBIN_KEY
const APP_ID = process.env.ONESIGNAL_APP_ID
const API_KEY = process.env.ONESIGNAL_API_KEY
const APP_URL = process.env.APP_URL || 'https://oscarini-garcia.github.io/lio-ops/'

if (!JSONBIN_ID || !JSONBIN_KEY || !APP_ID || !API_KEY) {
  console.log('Push sin configurar (faltan variables/secrets) — nada que hacer.')
  process.exit(0)
}

const BIN = `https://api.jsonbin.io/v3/b/${JSONBIN_ID}`

async function binRequest(method, body) {
  const res = await fetch(BIN, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': JSONBIN_KEY,
      'X-Bin-Versioning': 'false',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`JSONBin ${method} ${res.status}: ${await res.text()}`)
  return res.json()
}

async function sendPush(memberId, title, message) {
  const auth = API_KEY.startsWith('os_v2_') ? `Key ${API_KEY}` : `Basic ${API_KEY}`
  const res = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify({
      app_id: APP_ID,
      include_aliases: { external_id: [memberId] },
      target_channel: 'push',
      headings: { en: title, es: title },
      contents: { en: message, es: message },
      url: APP_URL,
    }),
  })
  const body = await res.text()
  if (!res.ok) throw new Error(`OneSignal ${res.status}: ${body}`)
  console.log(`→ ${memberId}: ${title}`)
}

const doc = (await binRequest('GET')).record ?? {}
if (!doc.v) {
  console.log('El bin aún no tiene datos de la app — nada que hacer.')
  process.exit(0)
}

const name = id => doc.members?.find(m => m.id === id)?.name ?? id
const now = new Date().toISOString()
const today = todayKey()
const sends = []
let changed = false

const fmtDates = r => r.dates.length > 1
  ? `${r.dates.length} mañanas (${r.dates[0]} → ${r.dates.at(-1)})`
  : r.dates[0]

// 1. Peticiones nuevas → aviso al responder
for (const r of doc.requests ?? []) {
  if (r.state !== 'pending' || r.notifiedAt) continue
  const msg = {
    cover: `${name(r.requesterId)} te pide cubrir ${fmtDates(r)}`,
    swap: `${name(r.requesterId)} te propone un cambio: ${r.dates[0]} ↔ ${r.swapReturnDate}`,
    retro: `${name(r.requesterId)} dice que sacó a Lio el ${r.dates[0]} — ¿lo confirmas?`,
  }[r.type]
  if (!msg) continue
  sends.push([r.responderId, 'Las Mañanas de Lio 💌', r.note ? `${msg} — «${r.note}»` : msg])
  r.notifiedAt = now
  r.updatedAt = now
  changed = true
}

// 2. Peticiones resueltas → aviso al requester
for (const r of doc.requests ?? []) {
  if (!['accepted', 'declined'].includes(r.state) || r.resolutionNotifiedAt || !r.resolvedAt) continue
  const msg = r.state === 'accepted'
    ? `${name(r.responderId)} ha aceptado 🎉 (${fmtDates(r)})`
    : `${name(r.responderId)} no puede esta vez (${fmtDates(r)})`
  sends.push([r.requesterId, 'Las Mañanas de Lio 💌', msg])
  r.resolutionNotifiedAt = now
  r.updatedAt = now
  changed = true
}

// 3. Recordatorio matutino, una vez al día
const hour = new Date().getHours()
if (hour >= 7 && hour < 10 && !walkEntry(today, doc) && doc.meta?.remindedFor !== today) {
  const assigned = assignedWalker(today, doc)
  if (assigned) {
    sends.push([assigned, '🐾 ¡Buenos días!', 'Hoy te toca sacar a Lio. Él ya lo sabe y te está mirando.'])
    doc.meta = { ...(doc.meta ?? {}), remindedFor: today, updatedAt: now }
    changed = true
  }
}

if (sends.length === 0) {
  console.log('Nada que avisar.')
  process.exit(0)
}

// Persistir las marcas antes de enviar: si el PUT falla no queremos avisos
// duplicados en la siguiente pasada; un aviso perdido es menos malo.
if (changed) await binRequest('PUT', doc)

for (const [memberId, title, message] of sends) {
  try {
    await sendPush(memberId, title, message)
  } catch (err) {
    console.error(`Fallo enviando a ${memberId}:`, err.message)
  }
}
console.log(`${sends.length} aviso(s) procesado(s).`)
