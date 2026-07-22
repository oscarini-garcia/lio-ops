import React, { useEffect } from 'react'
import { useStore, useDispatch } from '../hooks/useStore.jsx'

export const TAUNTS = [
  '¡Lio aprueba este paseo! 🐾',
  'Caniche contento, casa en paz 🐩',
  'Otro amanecer conquistado 🌅',
  'Lio ya te quiere un 3% más 💕',
  'Huele a campeón/a de la mañana 🏆',
  '¡Chuche mental desbloqueada! 🦴',
  'El pipí matutino agradece tu servicio 🫡',
]

export default function TauntToast() {
  const { taunt } = useStore()
  const dispatch = useDispatch()

  useEffect(() => {
    if (!taunt) return
    const t = setTimeout(() => dispatch({ type: 'CLEAR_TAUNT' }), 3200)
    return () => clearTimeout(t)
  }, [taunt])

  if (!taunt) return null
  return (
    <div
      style={{
        position: 'fixed', bottom: 'calc(5.5rem + env(safe-area-inset-bottom))', left: 0, right: 0,
        display: 'flex', justifyContent: 'center', zIndex: 60, pointerEvents: 'none',
      }}
    >
      <div className="card" style={{ padding: '0.7rem 1.2rem', fontWeight: 700 }}>{taunt}</div>
    </div>
  )
}
