import React from 'react'
import { useStore, useDispatch } from '../hooks/useStore.jsx'
import { useMember } from '../hooks/useMember.js'
import { skippedDates } from '../lib/requests.js'
import { fmtLong, fmtDayMonth, fmtShort } from '../lib/dates.js'
import { requestSync } from '../hooks/useSync.js'
import Avatar from '../components/Avatar.jsx'
import { SyncDot } from '../components/AppShell.jsx'

const STATE_ES = {
  accepted: ['aceptada', 'ok'],
  declined: ['rechazada', 'no'],
  cancelled: ['cancelada', 'wait'],
  expired: ['caducada', 'wait'],
  pending: ['pendiente', 'wait'],
}

function memberOf(doc, id) {
  return doc.members.find(m => m.id === id) ?? null
}

function describe(request, doc, meId) {
  const req = memberOf(doc, request.requesterId)?.name ?? '¿?'
  const res = memberOf(doc, request.responderId)?.name ?? '¿?'
  const who = (id, name) => (id === meId ? 'tú' : name)
  if (request.type === 'cover') {
    return request.dates.length > 1
      ? `${who(request.requesterId, req)} → ${who(request.responderId, res)}: cubrir ${request.dates.length} mañanas`
      : `${who(request.requesterId, req)} → ${who(request.responderId, res)}: cubrir ${fmtDayMonth(request.dates[0])}`
  }
  if (request.type === 'swap') {
    return `${who(request.requesterId, req)} → ${who(request.responderId, res)}: cambio ${fmtDayMonth(request.dates[0])} ↔ ${fmtDayMonth(request.swapReturnDate)}`
  }
  return `${who(request.requesterId, req)} reclama el paseo del ${fmtDayMonth(request.dates[0])}`
}

function IncomingCard({ request, doc }) {
  const dispatch = useDispatch()
  const requester = memberOf(doc, request.requesterId)
  const skipped = skippedDates(request, doc)
  const effective = request.dates.filter(d => !skipped.includes(d))

  function act(type) {
    dispatch({ type, id: request.id })
    requestSync()
  }

  let what, when
  if (request.type === 'cover') {
    what = request.dates.length > 1 ? 'te pide cubrir varias mañanas' : 'te pide que le cubras'
    when = request.dates.length > 1
      ? `${fmtShort(request.dates[0])} → ${fmtShort(request.dates.at(-1))} · ${effective.length} mañanas`
      : fmtLong(request.dates[0])
  } else if (request.type === 'swap') {
    what = 'te propone un cambio'
    when = `Su ${fmtDayMonth(request.dates[0])} ↔ tu ${fmtDayMonth(request.swapReturnDate)}`
  } else {
    what = 'reclama un paseo pasado'
    when = fmtLong(request.dates[0])
  }

  return (
    <div className="req">
      <div className="head"><Avatar member={requester} /><span className="what">{what}</span></div>
      <div className="when">{when}{requester?.status ? <> · <span className="status-line">{requester.status}</span></> : null}</div>
      {request.note && <p className="note">«{request.note}»</p>}
      {request.dates.length > 1 && (
        <div className="range">
          {effective.map(fmtDayMonth).join(' · ')}
          {skipped.length > 0 && <><br /><b>Omitidos:</b> {skipped.map(fmtDayMonth).join(' · ')} (ya resueltos)</>}
        </div>
      )}
      <div className="btns">
        <button className="btn yes" onClick={() => act('ACCEPT_REQUEST')}>
          {request.type === 'retro' ? 'Confirmar — es verdad 🐩'
            : request.dates.length > 1 ? `Aceptar las ${effective.length}` : 'Aceptar 🐾'}
        </button>
        <button className="btn no" onClick={() => act('DECLINE_REQUEST')}>
          {request.type === 'retro' ? 'Mmm, no' : 'Rechazar'}
        </button>
      </div>
    </div>
  )
}

export default function RequestsScreen() {
  const { doc } = useStore()
  const { memberId, member } = useMember()
  const dispatch = useDispatch()

  const pending = doc.requests.filter(r => r.state === 'pending')
  const forMe = pending.filter(r => r.responderId === memberId)
  const fromMe = pending.filter(r => r.requesterId === memberId)
  const history = doc.requests
    .filter(r => r.state !== 'pending')
    .sort((a, b) => (b.resolvedAt ?? '').localeCompare(a.resolvedAt ?? ''))
    .slice(0, 15)

  function cancel(id) {
    dispatch({ type: 'CANCEL_REQUEST', id })
    requestSync()
  }

  return (
    <>
      <header className="app-head">
        <div>
          <h1>Bandeja</h1>
          <p className="date">Tú eres {member?.name ?? '…'}</p>
        </div>
        <div className="spacer" />
        <SyncDot />
      </header>

      <section className="card">
        <h2>Necesita tu respuesta · {forMe.length}</h2>
        {forMe.length === 0 && <p className="sub" style={{ color: 'var(--ink-soft)' }}>Nada pendiente. Lio está orgulloso 🐩</p>}
        {forMe.map(r => <IncomingCard key={r.id} request={r} doc={doc} />)}
      </section>

      <section className="card">
        <h2>Enviadas · pendientes</h2>
        {fromMe.length === 0 && <p className="sub" style={{ color: 'var(--ink-soft)' }}>No has pedido nada.</p>}
        {fromMe.map(r => (
          <div className="req" key={r.id}>
            <div className="head">
              <span className="what">{describe(r, doc, memberId)}</span>
              <span className="state-chip wait">pendiente</span>
            </div>
            {r.note && <p className="note">«{r.note}»</p>}
            <div className="btns"><button className="btn cancel" onClick={() => cancel(r.id)}>Cancelar petición</button></div>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>Actividad reciente</h2>
        {history.length === 0 && <p className="sub" style={{ color: 'var(--ink-soft)' }}>Aún no hay historia que contar.</p>}
        {history.map(r => {
          const [label, cls] = STATE_ES[r.state] ?? STATE_ES.pending
          return (
            <div className="req" key={r.id}>
              <div className="head">
                <span className="what">{describe(r, doc, memberId)}</span>
                <span className={`state-chip ${cls}`}>{label}</span>
              </div>
            </div>
          )
        })}
      </section>
    </>
  )
}
