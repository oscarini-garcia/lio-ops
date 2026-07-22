import { useEffect, useRef } from 'react'
import { useStore, useDispatch } from './useStore.jsx'
import { syncCycle, syncConfigured } from '../lib/sync.js'

export function useSync() {
  const state = useStore()
  const dispatch = useDispatch()
  const syncing = useRef(false)

  async function doSync() {
    if (syncing.current) return
    if (!navigator.onLine) return
    if (!syncConfigured()) {
      dispatch({ type: 'SET_SYNC_STATUS', status: 'unconfigured' })
      return
    }
    syncing.current = true
    dispatch({ type: 'SET_SYNC_STATUS', status: 'syncing' })
    try {
      const merged = await syncCycle(state.doc)
      dispatch({ type: 'MERGE_REMOTE', doc: merged })
      dispatch({ type: 'SET_SYNC_STATUS', status: 'synced', ts: new Date().toISOString() })
    } catch {
      dispatch({ type: 'SET_SYNC_STATUS', status: 'pending' })
    } finally {
      syncing.current = false
    }
  }

  useEffect(() => { doSync() }, [])

  useEffect(() => {
    const handler = () => doSync()
    window.addEventListener('lio-ops:sync', handler)
    return () => window.removeEventListener('lio-ops:sync', handler)
  }, [state])

  useEffect(() => {
    window.addEventListener('online', doSync)
    return () => window.removeEventListener('online', doSync)
  }, [state])

  // iOS congela la PWA en segundo plano y no la remonta al volver: sin esto,
  // la app solo sincronizaría en arranque en frío o al registrar un paseo
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') doSync() }
    document.addEventListener('visibilitychange', onVisible)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') doSync()
    }, 60000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(interval)
    }
  }, [state])
}

export function requestSync() {
  window.dispatchEvent(new Event('lio-ops:sync'))
}
