import React from 'react'
import confetti from 'canvas-confetti'
import { useStore, useDispatch } from '../hooks/useStore.jsx'
import { useMember } from '../hooks/useMember.js'
import { assignedWalker, walkEntry } from '../lib/schedule.js'
import { pendingForMe } from '../lib/requests.js'
import { lioStreak } from '../lib/stats.js'
import { todayKey, addDays, fmtLong, fmtTime } from '../lib/dates.js'
import { requestSync } from '../hooks/useSync.js'
import { TAUNTS } from '../components/TauntToast.jsx'
import LioMascot from '../components/LioMascot.jsx'
import Avatar from '../components/Avatar.jsx'
import { SyncDot } from '../components/AppShell.jsx'

function memberOf(doc, id) {
  return doc.members.find(m => m.id === id) ?? null
}

export default function TodayScreen() {
  const { doc } = useStore()
  const { memberId } = useMember()
  const dispatch = useDispatch()

  const today = todayKey()
  const tomorrow = addDays(today, 1)
  const assignedId = assignedWalker(today, doc)
  const assigned = memberOf(doc, assignedId)
  const tomorrowWalker = memberOf(doc, assignedWalker(tomorrow, doc))
  const walk = walkEntry(today, doc)
  const streak = lioStreak(doc)
  const pending = memberId ? pendingForMe(doc, memberId).length : 0

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

  return (
    <>
      <header className="app-head">
        <LioMascot size={36} className="logo" />
        <div>
          <h1>Las Mañanas de Lio</h1>
          <p className="date">{fmtLong(today)}</p>
        </div>
        <div className="spacer" />
        <SyncDot />
      </header>

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

      {tomorrowWalker && !walk && (
        <section className="card tomorrow">
          <Avatar member={tomorrowWalker} />
          <span className="grow" />
          <span className="lbl">Mañana le toca<b>{fmtLong(tomorrow)} 🌄</b></span>
        </section>
      )}

      <div className="strip">
        <div className="pill">🔥 <span><strong>{streak} {streak === 1 ? 'día' : 'días'}</strong><br />de racha de Lio</span></div>
        <div className={`pill ${pending > 0 ? 'alert' : ''}`} onClick={() => dispatch({ type: 'SET_ACTIVE_SCREEN', screen: 'requests' })} style={{ cursor: 'pointer' }}>
          💌 <span><strong>{pending} {pending === 1 ? 'petición' : 'peticiones'}</strong><br />{pending === 1 ? 'espera tu respuesta' : 'esperan tu respuesta'}</span>
        </div>
      </div>
    </>
  )
}
