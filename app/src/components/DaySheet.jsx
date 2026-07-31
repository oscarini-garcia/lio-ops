import React, { useState } from 'react'
import { useStore, useDispatch } from '../hooks/useStore.jsx'
import { useMember } from '../hooks/useMember.js'
import { assignedWalker, walkEntry } from '../lib/schedule.js'
import { retroResponder } from '../lib/requests.js'
import { todayKey, addDays, fmtLong, fmtShort } from '../lib/dates.js'
import { requestSync } from '../hooks/useSync.js'
import Avatar from './Avatar.jsx'

function memberName(doc, id) {
  return doc.members.find(m => m.id === id)?.name ?? '¿?'
}

// Hoja inferior al tocar un día en Semana: pedir cubrir, cambio, rango o
// (en días pasados) reclamar el paseo.
export default function DaySheet() {
  const { doc, daySheet: date } = useStore()
  const { memberId } = useMember()
  const dispatch = useDispatch()
  const [step, setStep] = useState('menu')
  const [responderId, setResponderId] = useState(null)
  const [rangeEnd, setRangeEnd] = useState(null)
  const [note, setNote] = useState('')

  if (!date) return null

  const today = todayKey()
  const isPast = date < today
  const assigned = assignedWalker(date, doc)
  const walk = walkEntry(date, doc)
  const others = doc.members.filter(m => m.id !== memberId)

  function close() {
    setStep('menu'); setResponderId(null); setRangeEnd(null); setNote('')
    dispatch({ type: 'CLOSE_DAY_SHEET' })
  }

  function submit(request) {
    dispatch({ type: 'CREATE_REQUEST', request })
    requestSync()
    close()
  }

  // ── Reclamar un paseo pasado ──
  function submitRetro(confirmerId) {
    submit({
      type: 'retro',
      requesterId: memberId,
      responderId: confirmerId,
      dates: [date],
      note,
    })
  }

  // ── Pedir que me cubran (una fecha o rango) ──
  function myAssignedDatesInRange(from, to) {
    const dates = []
    for (let d = from; d <= to; d = addDays(d, 1)) {
      if (assignedWalker(d, doc) === memberId && !walkEntry(d, doc)) dates.push(d)
    }
    return dates
  }

  function submitCover(toId, endDate) {
    const dates = endDate ? myAssignedDatesInRange(date, endDate) : [date]
    if (dates.length === 0) return
    submit({ type: 'cover', requesterId: memberId, responderId: toId, dates, note })
  }

  // ── Proponer un cambio: su próxima fecha a elegir ──
  function theirUpcomingDates(theirId) {
    const out = []
    for (let d = addDays(today, 1), i = 0; i < 60 && out.length < 8; d = addDays(d, 1), i++) {
      if (d === date) continue
      if (assignedWalker(d, doc) === theirId && !walkEntry(d, doc)) out.push(d)
    }
    return out
  }

  function submitSwap(theirId, theirDate) {
    submit({
      type: 'swap',
      requesterId: memberId,
      responderId: theirId,
      dates: [date],
      swapReturnDate: theirDate,
      note,
    })
  }

  const noteInput = (
    <input
      type="text"
      value={note}
      onChange={e => setNote(e.target.value)}
      placeholder="Nota (opcional): ¿por qué?"
      style={{ width: '100%', font: 'inherit', padding: '0.6rem 0.8rem', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--chip)', color: 'var(--ink)', marginBottom: '0.6rem' }}
    />
  )

  let body
  if (isPast) {
    const defaultConfirmer = retroResponder(date, memberId, doc)
    body = (
      <>
        <p className="sub">
          {walk?.status === 'missed'
            ? 'Está marcada como «se quedó en casa».'
            : walk?.status === 'walked'
              ? `Consta que paseó ${memberName(doc, walk.memberId)}.`
              : 'No consta ningún paseo.'}
          {' '}¿Lo sacaste tú? La otra persona tiene que confirmarlo.
        </p>
        {noteInput}
        {defaultConfirmer ? (
          <button className="opt" onClick={() => submitRetro(defaultConfirmer)}>
            <span className="ico">🐾</span>
            <span>
              <span className="t">Reclamar este paseo</span>
              <span className="s">Confirma {memberName(doc, defaultConfirmer)} (era su mañana)</span>
            </span>
          </button>
        ) : (
          <>
            <p className="sub">Era tu mañana — elige quién lo confirma:</p>
            {others.map(m => (
              <button key={m.id} className="opt" onClick={() => submitRetro(m.id)}>
                <Avatar member={m} />
              </button>
            ))}
          </>
        )}
      </>
    )
  } else if (assigned !== memberId) {
    body = (
      <p className="sub">
        Es la mañana de <b>{memberName(doc, assigned)}</b>. Solo quien tiene el día puede pedir un
        cambio — si no puede, que lo pida desde su móvil 🐾
      </p>
    )
  } else if (step === 'menu') {
    body = (
      <>
        <p className="sub">¿Qué quieres hacer?</p>
        <button className="opt" onClick={() => setStep('cover')}>
          <span className="ico">🤝</span>
          <span><span className="t">Pedir que te cubran</span><span className="s">Se quedan con esta mañana — les deberás una</span></span>
        </button>
        <button className="opt" onClick={() => setStep('swap-person')}>
          <span className="ico">🔁</span>
          <span><span className="t">Proponer un cambio</span><span className="s">Intercambia esta mañana por una suya</span></span>
        </button>
        <button className="opt" onClick={() => setStep('range')}>
          <span className="ico">🧳</span>
          <span><span className="t">Seleccionar más días</span><span className="s">¿De viaje? Pide un rango entero de una vez</span></span>
        </button>
      </>
    )
  } else if (step === 'cover') {
    body = (
      <>
        <p className="sub">¿A quién se lo pides?</p>
        {noteInput}
        {others.map(m => (
          <button key={m.id} className="opt" onClick={() => submitCover(m.id, null)}>
            <Avatar member={m} />
            {m.status && <span className="s status-line">{m.status}</span>}
          </button>
        ))}
      </>
    )
  } else if (step === 'swap-person') {
    body = (
      <>
        <p className="sub">¿Con quién cambias?</p>
        {others.map(m => (
          <button key={m.id} className="opt" onClick={() => { setResponderId(m.id); setStep('swap-date') }}>
            <Avatar member={m} />
          </button>
        ))}
      </>
    )
  } else if (step === 'swap-date') {
    const options = theirUpcomingDates(responderId)
    body = (
      <>
        <p className="sub">¿Qué mañana de {memberName(doc, responderId)} te quedas tú?</p>
        {noteInput}
        {options.length === 0 && <p className="sub">No tiene mañanas próximas en el horario 🤔</p>}
        {options.map(d => (
          <button key={d} className="opt" onClick={() => submitSwap(responderId, d)}>
            <span className="ico">📅</span>
            <span><span className="t">{fmtLong(d)}</span></span>
          </button>
        ))}
      </>
    )
  } else if (step === 'range') {
    const endOptions = Array.from({ length: 21 }, (_, i) => addDays(date, i + 1))
    const chosen = rangeEnd ? myAssignedDatesInRange(date, rangeEnd) : null
    body = (
      <>
        <p className="sub">¿Hasta qué día (incluido)?</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.7rem' }}>
          {endOptions.map(d => (
            <button
              key={d}
              className="opt"
              style={{ width: 'auto', padding: '0.4rem 0.7rem', marginBottom: 0, borderColor: rangeEnd === d ? 'var(--sunrise)' : undefined, outline: rangeEnd === d ? '2px solid var(--sunrise)' : 'none' }}
              onClick={() => setRangeEnd(d)}
            >
              {fmtShort(d)}
            </button>
          ))}
        </div>
        {chosen && (
          <>
            <p className="sub">
              {chosen.length === 0
                ? 'En ese rango no tienes mañanas asignadas.'
                : <>Tus mañanas en el rango: <b>{chosen.map(fmtShort).join(' · ')}</b> ({chosen.length})</>}
            </p>
            {noteInput}
            {chosen.length > 0 && (
              <>
                <p className="sub">¿Quién te las cubre? (aprueba el rango entero de una vez)</p>
                {others.map(m => (
                  <button key={m.id} className="opt" onClick={() => submitCover(m.id, rangeEnd)}>
                    <Avatar member={m} />
                  </button>
                ))}
              </>
            )}
          </>
        )}
      </>
    )
  }

  return (
    <div className="sheet-wrap" onClick={e => { if (e.target === e.currentTarget) close() }}>
      <div className="sheet">
        <div className="grab" />
        <h3>{fmtLong(date)}{assigned ? ` · mañana de ${memberName(doc, assigned)}` : ''}</h3>
        {body}
        <button className="ghost-btn" onClick={close} style={{ width: '100%' }}>Cerrar</button>
      </div>
    </div>
  )
}
