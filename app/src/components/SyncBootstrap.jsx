import { useEffect } from 'react'
import { useSync } from '../hooks/useSync.js'
import { useStore, useDispatch } from '../hooks/useStore.jsx'
import { useMember } from '../hooks/useMember.js'
import { pendingForMe } from '../lib/requests.js'
import { updateBadge, initPush } from '../lib/notify.js'

// Monta el ciclo de sync, barre caducadas al arrancar y mantiene el globo
// del icono con las peticiones que esperan tu respuesta
export default function SyncBootstrap() {
  useSync()
  const { doc } = useStore()
  const { memberId } = useMember()
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch({ type: 'SWEEP_EXPIRED' })
  }, [])

  useEffect(() => {
    if (memberId) initPush(memberId)
  }, [memberId])

  useEffect(() => {
    updateBadge(memberId ? pendingForMe(doc, memberId).length : 0)
  }, [doc, memberId])

  return null
}
