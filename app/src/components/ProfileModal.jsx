import React from 'react'
import { useStore, useDispatch } from '../hooks/useStore.jsx'
import { useMember, switchMember } from '../hooks/useMember.js'
import Avatar from './Avatar.jsx'
import LioMascot from './LioMascot.jsx'

// Primer arranque (o "Cambiar" en Ajustes): ¿quién eres?
export default function ProfileModal() {
  const { doc, profileModalOpen } = useStore()
  const { member } = useMember()
  const dispatch = useDispatch()

  const open = profileModalOpen || !member
  if (!open) return null

  function pick(id) {
    switchMember(dispatch, id)
    dispatch({ type: 'SET_PROFILE_MODAL', open: false })
  }

  return (
    <div className="sheet-wrap" style={{ alignItems: 'center' }}>
      <div className="sheet" style={{ borderRadius: 26, maxWidth: 340 }}>
        <div style={{ textAlign: 'center', marginBottom: '0.6rem' }}>
          <LioMascot size={88} />
        </div>
        <h3 style={{ textAlign: 'center' }}>¿Quién eres?</h3>
        <p className="sub" style={{ textAlign: 'center' }}>Lio necesita saber a quién ladrarle</p>
        {doc.members.map(m => (
          <button key={m.id} className="opt" onClick={() => pick(m.id)}>
            <Avatar member={m} />
            {m.status && <span className="s status-line">{m.status}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
