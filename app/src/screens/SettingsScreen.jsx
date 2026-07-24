import React, { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useStore, useDispatch } from '../hooks/useStore.jsx'
import { useMember } from '../hooks/useMember.js'
import { compressAvatar } from '../lib/imageCompress.js'
import { pushConfigured, requestPushPermission, getPushStatus } from '../lib/notify.js'
import { nextAssignments } from '../lib/schedule.js'
import { todayKey, addDays, weekdayOf, fmtDayMonth, fmtTime } from '../lib/dates.js'
import { requestSync } from '../hooks/useSync.js'
import { forceUpdate, currentVersion } from '../lib/native.js'
import Avatar from '../components/Avatar.jsx'
import { SyncDot } from '../components/AppShell.jsx'

const WEEKDAYS_ES = [
  ['mon', 'Lun'], ['tue', 'Mar'], ['wed', 'Mié'], ['thu', 'Jue'],
  ['fri', 'Vie'], ['sat', 'Sáb'], ['sun', 'Dom'],
]
const EMOJI_PRESETS = ['🐕', '🎾', '☕', '🌻', '🦋', '🌵', '🥐', '⚽', '🌙', '🏃']

function memberLink(id) {
  return `${window.location.origin}${import.meta.env.BASE_URL}?member=${id}`
}

function nextDateFor(weekday) {
  let d = todayKey()
  while (weekdayOf(d) !== weekday) d = addDays(d, 1)
  return d
}

// ── Personalización del propio perfil ──
function MakeItYours({ me }) {
  const dispatch = useDispatch()
  const [status, setStatus] = useState(me.status ?? '')
  const [emojiOpen, setEmojiOpen] = useState(false)

  function save(patch) {
    dispatch({ type: 'UPSERT_MEMBER', member: { ...me, ...patch } })
    requestSync()
  }

  async function onPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUri = await compressAvatar(file)
      save({ avatar: { type: 'photo', value: dataUri } })
    } catch {
      alert('No se pudo procesar la foto 😢')
    }
  }

  return (
    <section className="card">
      <h2>Hazlo tuyo</h2>
      <div className="row" style={{ display: 'block' }}>
        <span className="sub">Tu icono — iniciales, cualquier emoji o una foto de tu carrete</span>
        <div className="icon-picker">
          <span
            className={`opt-dot ${me.avatar?.type === 'initials' ? 'sel' : ''}`}
            style={{ background: me.color, color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}
            onClick={() => save({ avatar: { type: 'initials', value: me.name[0] } })}
          >
            {me.name[0]}
          </span>
          <span
            className={`opt-dot ${me.avatar?.type === 'emoji' ? 'sel' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setEmojiOpen(v => !v)}
          >
            {me.avatar?.type === 'emoji' ? me.avatar.value : '😊'}
          </span>
          <label className={`opt-dot ${me.avatar?.type === 'photo' ? 'sel' : ''}`} style={{ cursor: 'pointer' }}>
            📷
            <input type="file" accept="image/*" onChange={onPhoto} style={{ display: 'none' }} />
          </label>
        </div>
        {emojiOpen && (
          <div className="icon-picker">
            {EMOJI_PRESETS.map(e => (
              <span key={e} className="opt-dot" style={{ cursor: 'pointer' }} onClick={() => { save({ avatar: { type: 'emoji', value: e } }); setEmojiOpen(false) }}>
                {e}
              </span>
            ))}
          </div>
        )}
        <span className="sub" style={{ display: 'block', marginTop: '0.5rem' }}>Tu estado — aparece junto a tu nombre en toda la app</span>
        <input
          type="text"
          className="status-input"
          style={{ width: '100%', border: 'none', font: 'inherit' }}
          value={status}
          maxLength={60}
          placeholder="«Primero café, luego paseo ☕»"
          onChange={e => setStatus(e.target.value)}
          onBlur={() => status !== me.status && save({ status })}
        />
      </div>
    </section>
  )
}

// ── Editor de un día del horario ──
function DayEditor({ weekday, label, doc }) {
  const dispatch = useDispatch()
  const [editing, setEditing] = useState(false)
  const day = doc.schedule.days[weekday] ?? { type: 'fixed', memberId: null }
  const members = doc.members

  function set(pattern) {
    dispatch({ type: 'SET_SCHEDULE_DAY', weekday, pattern })
    requestSync()
  }

  const current = day.type === 'fixed'
    ? members.find(m => m.id === day.memberId)
    : members.find(m => m.id === (nextAssignments(nextDateFor(weekday), doc, 1, weekday)[0]?.memberId))

  const summary = day.type === 'fixed'
    ? 'cada semana'
    : `alterna ${(day.memberIds ?? []).map(id => members.find(m => m.id === id)?.name ?? id).join(' ↔ ')}`

  const isWknd = weekday === 'sat' || weekday === 'sun'

  return (
    <>
      <div className={`row ${isWknd ? 'weekend' : ''}`} onClick={() => setEditing(v => !v)} style={{ cursor: 'pointer' }}>
        <b style={{ width: '3rem' }}>{label}</b>
        {current ? <Avatar member={current} /> : <span className="sub">sin asignar</span>}
        <span className="grow" />
        <span className="sub">{summary}</span>
      </div>
      {editing && (
        <div className="row" style={{ display: 'block', background: 'var(--chip)', borderRadius: 14 }}>
          <span className="sub">¿Quién se encarga los {label.toLowerCase()}?</span>
          <div className="icon-picker">
            {members.map(m => (
              <span
                key={m.id}
                className={`opt-dot ${day.type === 'fixed' && day.memberId === m.id ? 'sel' : ''}`}
                style={{ background: m.color, color: '#fff', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                title={`${m.name} todas las semanas`}
                onClick={() => { set({ type: 'fixed', memberId: m.id }); setEditing(false) }}
              >
                {m.name[0]}
              </span>
            ))}
          </div>
          <span className="sub" style={{ display: 'block', marginTop: '0.5rem' }}>…o alternando (elige la pareja y a quién le toca primero):</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
            {members.flatMap(a => members.filter(b => b.id !== a.id).map(b => (
              <button
                key={`${a.id}-${b.id}`}
                className="btn no"
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.7rem' }}
                onClick={() => {
                  set({ type: 'alternate', memberIds: [a.id, b.id], anchorDate: nextDateFor(weekday) })
                  setEditing(false)
                }}
              >
                {a.name} ↔ {b.name} (empieza {a.name})
              </button>
            )))}
          </div>
        </div>
      )}
    </>
  )
}

// Avisos push: globo del icono siempre; OneSignal si la build lleva App ID.
// En iOS el permiso solo se puede pedir tras un toque y con la app añadida
// a la pantalla de inicio.
function PushRow() {
  const [status, setStatus] = useState('loading')
  React.useEffect(() => { getPushStatus(setStatus) }, [])

  if (!pushConfigured()) {
    return <div className="row"><span className="grow sub">Avisos: globo en el icono para peticiones pendientes. Push sin configurar (ver INSTALL.md) 🔔</span></div>
  }

  const label = {
    loading: 'Comprobando avisos…',
    unsupported: 'Este navegador no soporta push — añade la app a la pantalla de inicio y ábrela desde ahí.',
    enabled: 'Avisos activados en este móvil ✓',
    off: 'Recibe un aviso cuando te pidan un cambio o te toque salir.',
  }[status] ?? ''

  return (
    <div className="row">
      <span className="grow sub">{label}</span>
      {status === 'off' && (
        <span
          className="act"
          style={{ cursor: 'pointer' }}
          onClick={() => requestPushPermission(granted => setStatus(granted ? 'enabled' : 'off'))}
        >
          Activar 🔔
        </span>
      )}
    </div>
  )
}

// Actualización: en la app nativa fuerza el chequeo OTA (GitHub Releases) y
// aplica el nuevo bundle al momento; en web refresca el service worker, limpia
// caché y recarga para traer el último deploy. Si actualiza, la app se recarga
// sola, así que el mensaje solo se ve cuando ya estabas al día.
function UpdateRow() {
  const [version, setVersion] = useState('')
  const [checking, setChecking] = useState(false)
  const [msg, setMsg] = useState('')

  React.useEffect(() => { currentVersion().then(setVersion) }, [])

  async function onCheck() {
    setChecking(true)
    setMsg('')
    try {
      const r = await forceUpdate()
      setMsg(r.message ?? '')
    } catch {
      setMsg('No se pudo comprobar 😢')
    }
    setChecking(false)
  }

  return (
    <div className="row">
      <span className="grow sub">
        Versión {version || '—'}{msg ? ` · ${msg}` : ''}
      </span>
      <span
        className="act"
        style={{ cursor: checking ? 'default' : 'pointer', opacity: checking ? 0.6 : 1 }}
        onClick={checking ? undefined : onCheck}
      >
        {checking ? 'Buscando…' : 'Buscar actualización'}
      </span>
    </div>
  )
}

export default function SettingsScreen() {
  const { doc, lastSyncAt, syncStatus } = useStore()
  const { member: me } = useMember()
  const dispatch = useDispatch()
  const [qrFor, setQrFor] = useState(null)

  const sundayPreview = nextAssignments(nextDateFor('sun'), doc, 4, 'sun')

  return (
    <>
      <header className="app-head">
        <div>
          <h1>Ajustes</h1>
          <p className="date">Familia y horario</p>
        </div>
        <div className="spacer" />
        <SyncDot />
      </header>

      <section className="card">
        <h2>Tú</h2>
        <div className="row">
          {me ? <Avatar member={me} /> : <span className="sub">sin identificar</span>}
          <span className="grow sub">Este móvil es tuyo</span>
          <span className="act" style={{ cursor: 'pointer' }} onClick={() => dispatch({ type: 'SET_PROFILE_MODAL', open: true })}>Cambiar</span>
        </div>
      </section>

      {me && <MakeItYours me={me} />}

      <section className="card">
        <h2>La familia</h2>
        {doc.members.map(m => (
          <React.Fragment key={m.id}>
            <div className="row">
              <Avatar member={m} />
              <span className="grow status-line">{m.status ? `«${m.status}»` : ''}</span>
              <span className="act" style={{ cursor: 'pointer' }} onClick={() => setQrFor(qrFor === m.id ? null : m.id)}>Enlace · QR</span>
            </div>
            {qrFor === m.id && (
              <div className="row" style={{ display: 'block', textAlign: 'center' }}>
                <div style={{ background: '#fff', display: 'inline-block', padding: 12, borderRadius: 12 }}>
                  <QRCodeSVG value={memberLink(m.id)} size={140} />
                </div>
                <p className="sub" style={{ wordBreak: 'break-all', marginTop: '0.5rem' }}>{memberLink(m.id)}</p>
                <button
                  className="btn no"
                  onClick={() => navigator.clipboard?.writeText(memberLink(m.id))}
                >
                  Copiar enlace
                </button>
              </div>
            )}
          </React.Fragment>
        ))}
        <div className="row"><span className="sub grow">Cada uno añade su propio enlace a su pantalla de inicio — esa es su identidad, sin contraseñas.</span></div>
      </section>

      <section className="card">
        <h2>El horario de siempre</h2>
        {WEEKDAYS_ES.map(([key, label]) => <DayEditor key={key} weekday={key} label={label} doc={doc} />)}
        <div className="row" style={{ display: 'block' }}>
          <span className="sub">Próximos 4 domingos</span>
          <div className="sched-preview">
            {sundayPreview.map(a => (
              <span key={a.date}>{fmtDayMonth(a.date)} {doc.members.find(m => m.id === a.memberId)?.name ?? '—'}</span>
            ))}
          </div>
        </div>
        <div className="row"><span className="sub grow">Los cambios aplican de hoy en adelante — el pasado no se reescribe.</span></div>
      </section>

      <section className="card">
        <h2>Sincronización</h2>
        <div className="row">
          <span className="grow sub">
            {syncStatus === 'unconfigured'
              ? 'Solo local — falta configurar el bin de JSONBin (ver INSTALL.md)'
              : `Documento familiar compartido${lastSyncAt ? ` · sincronizado a las ${fmtTime(lastSyncAt)} ✓` : ''}`}
          </span>
          <span className="act" style={{ cursor: 'pointer' }} onClick={requestSync}>Sincronizar</span>
        </div>
        <PushRow />
        <div className="row">
          <span className="grow sub">¿Algo raro en este móvil?</span>
          <span
            className="act"
            style={{ cursor: 'pointer', color: 'var(--miss)' }}
            onClick={() => { if (window.confirm('Esto borra los datos locales de ESTE móvil (el documento compartido no se toca). ¿Seguir?')) dispatch({ type: 'RESET_LOCAL' }) }}
          >
            Reiniciar
          </span>
        </div>
      </section>

      <section className="card">
        <h2>Actualizaciones</h2>
        <UpdateRow />
        <div className="row"><span className="sub grow">Trae la última versión de la app sin esperas.</span></div>
      </section>
    </>
  )
}
