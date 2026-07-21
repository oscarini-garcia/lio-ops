import { useEffect } from 'react'
import { useStore, useDispatch } from './useStore.jsx'

// Resolución de identidad (mismo patrón que Counter Ops):
// 1. ?member= en la URL — solo si corresponde a un miembro real
// 2. la identidad recordada en este móvil (currentMemberId)
// 3. nada → la app pregunta "¿quién eres?"
export function useMember() {
  const { doc, currentMemberId } = useStore()
  const dispatch = useDispatch()
  const members = doc.members

  const urlId = new URLSearchParams(window.location.search).get('member') || ''
  const urlValid = urlId !== '' && members.some(m => m.id === urlId)
  const storedValid = !!currentMemberId && members.some(m => m.id === currentMemberId)

  const memberId = urlValid ? urlId : (storedValid ? currentMemberId : '')

  // Un enlace personal válido reclama este móvil: la identidad sobrevive
  // aunque luego se abra la app sin el enlace
  useEffect(() => {
    if (urlValid && currentMemberId !== urlId) {
      dispatch({ type: 'SET_CURRENT_MEMBER', id: urlId })
    }
  }, [urlValid, urlId, currentMemberId])

  const member = members.find(m => m.id === memberId) ?? null
  return { memberId, member }
}

// Cambiar identidad desde la UI: el parámetro de URL manda sobre la
// identidad guardada, así que hay que reescribirlo también
export function switchMember(dispatch, id) {
  const url = new URL(window.location)
  if (url.searchParams.has('member')) {
    url.searchParams.set('member', id)
    window.history.replaceState({}, '', url)
  }
  dispatch({ type: 'SET_CURRENT_MEMBER', id })
}
