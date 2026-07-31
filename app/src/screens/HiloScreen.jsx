import React, { useState } from 'react'
import confetti from 'canvas-confetti'
import { useStore, useDispatch } from '../hooks/useStore.jsx'
import { useMember } from '../hooks/useMember.js'
import { assignedWalker, walkEntry } from '../lib/schedule.js'
import { lioStreak } from '../lib/stats.js'
import { todayKey, addDays, fmtLong, fmtDow, fmtTime, isWeekend, parseKey } from '../lib/dates.js'
import { requestSync } from '../hooks/useSync.js'
import { TAUNTS } from '../components/TauntToast.jsx'
import LioMascot from '../components/LioMascot.jsx'
import Avatar from '../components/Avatar.jsx'
import { SyncDot } from '../components/AppShell.jsx'

// El hilo empieza con la voz de Lio: caniche toy negro con opiniones firmes.
const QUIPS = [
  'Llevo despierto desde las 6:12. Solo lo menciono.',
  'El parque no se va a oler solo.',
  'Soy pequeño, pero mis necesidades son de gran danés.',
  'He soñado con una salchicha. Interpretadlo como queráis.',
  'Un buen paseo, o dibujo mi descontento en la alfombra.',
  'No pido mucho. Pido todo, pero con cariño.',
  'Vuestra puntualidad define mi opinión sobre vosotros.',
]

function memberOf(doc, id) {
  return doc.members.find(m => m.id === id) ?? null
}

// Una fila del hilo: día, quién pasea (o quién tiene el mérito si ya está
// registrado) y su marca. Tocar abre la hoja de acciones (cubrir, cambio,
// rango o —en días pasados— reclamar «esto lo saqué yo»).
function DayRow({ date, doc, onTap }) {
  const today = todayKey()
  const isPast = date < today
  const isToday = date === today
  const walk = walkEntry(date, doc)
  const member = memberOf(doc, walk?.status === 'walked' ? walk.memberId : assignedWalker(date, doc))

  let mark
  if (walk?.status === 'walked') {
    mark = <span className="mark ok">✓ {walk.walkedAt ? fmtTime(walk.walkedAt) : ''}</span>
  } else if (walk?.status === 'missed') {
    mark = <span className="mark sad">😢 se quedó</span>
  } else if (isToday) {
    mark = <span className="mark">hoy 🌅</span>
  } else {
    mark = <span className="mark">›</span>
  }

  const classes = ['day-row', isPast && 'past', isToday && 'today', isWeekend(date) && 'weekend']
    .filter(Boolean).join(' ')

  return (
    <div className={classes} onClick={() => onTap(date)} style={{ cursor: 'pointer' }}>
      <div className="d">
        <div className="dow">{fmtDow(date)}</div>
        <div className="num">{parseKey(date).getDate()}</div>
      </div>
      {member ? <Avatar member={member} /> : <span className="sub" style={{ color: 'var(--ink-soft)' }}>sin asignar</span>}
      <span className="who" />
      {mark}
    </div>
  )
}

// Pantalla principal: un único hilo cronológico. Hoy clavado arriba; el pasado
// se pliega tras «Días anteriores» (donde se reclama); el futuro baja.
export default function HiloScreen() {
  const { doc } = useStore()
  const { memberId } = useMember()
  const dispatch = useDispatch()

  const today = todayKey()
  const tomorrow = addDays(today, 1)
  const assigned = memberOf(doc, assignedWalker(today, doc))
  const tomorrowWalker = memberOf(doc, assignedWalker(tomorrow, doc))
  const walk = walkEntry(today, doc)
  const streak = lioStreak(doc)

  const [quip, setQuip] = useState(0)
  const [showPast, setShowPast] = useState(false)

  // Pasado (7 días antes de hoy, en orden cronológico) y futuro (7 días).
  const past = Array.from({ length: 7 }, (_, i) => addDays(today, i - 7))
  const future = Array.from({ length: 7 }, (_, i) => addDays(today, i + 1))

  function logWalk() {
    dispatch({ type: 'LOG_WALK' })
    dispatch({ type: 'SET_TAUNT', taunt: TAUNTS[Math.floor(Math.random() * TAUNTS.length)] })
    confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } })
    requestSync()
  }

  function markMissed() {
    if (!window.confirm('¿Marcar que esta mañana Lio se quedó sin salir?')) return
    dispatch({ type: 'MARK_MISSED' })
    requestSync()
  }

  function undoToday() {
    dispatch({ type: 'CLEAR_TODAY' })
    requestSync()
  }

  const onTap = date => dispatch({ type: 'OPEN_DAY_SHEET', date })

  return (
    <>
      <header className="app-head">
        <LioMascot size={36} className="logo" />
        <div>
          <h1>Lio</h1>
          <p className="date">{fmtLong(today)}</p>
        </div>
        <div className="spacer" />
        <SyncDot />
      </header>

      {/* Voz de Lio — toca para otra ocurrencia */}
      <section className="card quip-card">
        <LioMascot size={44} className="qlogo" />
        <button className="quip-say" onClick={() => setQuip(q => (q + 1) % QUIPS.length)}>
          <span className="qt">{QUIPS[quip]}</span>
          <small className="qm">— Lio · 🔥 {streak} {streak === 1 ? 'día' : 'días'} de racha · toca para otra</small>
        </button>
      </section>

      {/* Pasado plegado — aquí se reclama «esto lo saqué yo» */}
      <button className="past-toggle" onClick={() => setShowPast(v => !v)}>
        {showPast ? '▼ Ocultar días anteriores' : '▲ Días anteriores'}
      </button>
      {showPast && (
        <section className="card">
          {past.map(d => <DayRow key={d} date={d} doc={doc} onTap={onTap} />)}
          <p className="sub" style={{ color: 'var(--ink-soft)', textAlign: 'center', marginTop: '0.7rem' }}>
            Toca un día para reclamar «esto lo saqué yo» — lo confirma quien tenía el turno 🐾
          </p>
        </section>
      )}

      {/* HOY — clavado arriba */}
      {!walk && (
        <section className="card hero">
          <LioMascot className="mascot" />
          <p className="whose">Esta mañana le toca a</p>
          <p className="who"><span className="you">{assigned?.name ?? 'nadie 🤔'}</span></p>
          {assigned?.status && <p className="status-line" style={{ marginBottom: '1rem' }}>{assigned.status}</p>}
          {assigned && (
            <>
              <button className="paw-btn" onClick={logWalk}>🐾 &nbsp;¡Paseado!</button>
              <button className="ghost-btn" onClick={markMissed}>Esta mañana no salió 😢</button>
            </>
          )}
        </section>
      )}

      {walk?.status === 'walked' && (
        <section className="card hero done">
          <LioMascot className="mascot" size={100} />
          <p className="cheer">¡Energía de buen perro! 🎉</p>
          <p className="whose">{memberOf(doc, walk.memberId)?.name ?? '¿?'} y Lio conquistaron la mañana</p>
          {walk.walkedAt && (
            <p style={{ margin: '0.7rem 0 0' }}><span className="badge-time">Paseado a las {fmtTime(walk.walkedAt)}</span></p>
          )}
          {tomorrowWalker && <p className="status-line" style={{ marginTop: '0.8rem' }}>Mañana: {tomorrowWalker.name} 🌄</p>}
          {walk.loggedBy === memberId && (
            <button className="ghost-btn" onClick={undoToday}>Deshacer (me equivoqué)</button>
          )}
        </section>
      )}

      {walk?.status === 'missed' && (
        <section className="card hero missed">
          <LioMascot className="mascot" size={100} sad />
          <p className="cheer">Lio se quedó en casa 😢</p>
          <p className="whose">
            Pasa a veces. Te perdona (por una chuche).<br />
            ¿Alguien salió en realidad?{' '}
            <u style={{ cursor: 'pointer' }} onClick={() => dispatch({ type: 'OPEN_DAY_SHEET', date: today })}>Reclamar este paseo</u>
          </p>
          {assigned && (
            <button className="ghost-btn" onClick={logWalk}>Al final sí salió — registrar 🐾</button>
          )}
        </section>
      )}

      {/* FUTURO — lo que viene, toca un día para pedir un cambio */}
      <section className="card">
        <h2>Lo que viene · toca un día para pedir un cambio</h2>
        {future.map(d => <DayRow key={d} date={d} doc={doc} onTap={onTap} />)}
      </section>
    </>
  )
}
