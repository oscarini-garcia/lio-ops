import React from 'react'
import { useStore, useDispatch } from '../hooks/useStore.jsx'
import { useMember } from '../hooks/useMember.js'
import { pendingForMe } from '../lib/requests.js'
import { requestSync } from '../hooks/useSync.js'

const TABS = [
  {
    id: 'hilo', label: 'Hilo',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 5.5h16M4 12h16M4 18.5h10" />
      </svg>
    ),
  },
  {
    id: 'bandeja', label: 'Bandeja',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d="M3.5 5.5h17v13h-17z" /><path d="M3.5 13.5H8a2 2 0 0 0 4 0h0a2 2 0 0 0 4 0h4.5" />
      </svg>
    ),
  },
  {
    id: 'datos', label: 'Datos',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M5 20V12M12 20V6M19 20v-5" />
      </svg>
    ),
  },
  {
    id: 'familia', label: 'Familia',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0M15 6.5a3 3 0 0 1 0 6M20.5 19a5 5 0 0 0-3-4.6" />
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
            {tab.id === 'bandeja' && badge > 0 && <span className="bdg">{badge}</span>}
            {tab.icon}
            {tab.label}
          </a>
        ))}
      </nav>
    </>
  )
}
