import React from 'react'
import { useStore, useDispatch } from '../hooks/useStore.jsx'
import { useMember } from '../hooks/useMember.js'
import { pendingForMe } from '../lib/requests.js'
import { requestSync } from '../hooks/useSync.js'

const TABS = [
  {
    id: 'today', label: 'Hoy',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <circle cx="7" cy="8" r="2.2" /><circle cx="12" cy="6.4" r="2.2" /><circle cx="17" cy="8" r="2.2" />
        <ellipse cx="12" cy="15.5" rx="5" ry="4.2" />
      </svg>
    ),
  },
  {
    id: 'week', label: 'Semana',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3.5v3M16 3.5v3" />
      </svg>
    ),
  },
  {
    id: 'requests', label: 'Peticiones',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="5.5" width="18" height="13" rx="3" /><path d="m4 7 8 6 8-6" />
      </svg>
    ),
  },
  {
    id: 'stats', label: 'Datos',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 20V12M12 20V6M19 20v-5" />
      </svg>
    ),
  },
  {
    id: 'settings', label: 'Ajustes',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3.2" />
        <path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1" />
      </svg>
    ),
  },
]

export function SyncDot() {
  const { syncStatus, doc } = useStore()
  const label = {
    synced: '✓ al día',
    syncing: '⟳ sincronizando…',
    pending: '· sin conexión',
    unconfigured: '· solo local',
  }[syncStatus] ?? '·'
  return (
    <button className="sync-dot" onClick={requestSync} title="Sincronizar ahora">
      {label}
    </button>
  )
}

export default function AppShell({ children }) {
  const { activeScreen } = useStore()
  const { memberId } = useMember()
  const { doc } = useStore()
  const dispatch = useDispatch()
  const badge = memberId ? pendingForMe(doc, memberId).length : 0

  return (
    <>
      <main className="screen">{children}</main>
      <nav className="tabbar">
        {TABS.map(tab => (
          <a
            key={tab.id}
            href="#"
            className={activeScreen === tab.id ? 'on' : ''}
            onClick={e => { e.preventDefault(); dispatch({ type: 'SET_ACTIVE_SCREEN', screen: tab.id }) }}
          >
            {tab.id === 'requests' && badge > 0 && <span className="bdg">{badge}</span>}
            {tab.icon}
            {tab.label}
          </a>
        ))}
      </nav>
    </>
  )
}
