import React from 'react'
import { useStore, useDispatch } from '../hooks/useStore.jsx'
import { assignedWalker, walkEntry } from '../lib/schedule.js'
import { todayKey, addDays, fmtDow, isWeekend, parseKey, fmtTime } from '../lib/dates.js'
import Avatar from '../components/Avatar.jsx'
import { SyncDot } from '../components/AppShell.jsx'

function DayRow({ date, doc, onTap }) {
  const today = todayKey()
  const isPast = date < today
  const isToday = date === today
  const walk = walkEntry(date, doc)
  const member = doc.members.find(m => m.id === (walk?.status === 'walked' ? walk.memberId : assignedWalker(date, doc))) ?? null

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

export default function WeekScreen() {
  const { doc } = useStore()
  const dispatch = useDispatch()
  const today = todayKey()

  const lastWeek = Array.from({ length: 7 }, (_, i) => addDays(today, i - 7))
  const thisWeek = Array.from({ length: 7 }, (_, i) => addDays(today, i))

  const onTap = date => dispatch({ type: 'OPEN_DAY_SHEET', date })

  return (
    <>
      <header className="app-head">
        <div>
          <h1>El plan</h1>
          <p className="date">Toca un día para pedir un cambio</p>
        </div>
        <div className="spacer" />
        <SyncDot />
      </header>

      <section className="card">
        <h2>La semana pasada</h2>
        {lastWeek.map(d => <DayRow key={d} date={d} doc={doc} onTap={onTap} />)}
      </section>

      <section className="card">
        <h2>Esta semana</h2>
        {thisWeek.map(d => <DayRow key={d} date={d} doc={doc} onTap={onTap} />)}
      </section>
    </>
  )
}
