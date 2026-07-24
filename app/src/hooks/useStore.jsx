import React, { createContext, useContext, useReducer } from 'react'
import { loadStore, saveStore, mergeDocs, unionTombstones } from '../lib/storage.js'
import { assignedWalker } from '../lib/schedule.js'
import {
  createRequest, acceptRequest, declineRequest, cancelRequest, sweepExpired,
} from '../lib/requests.js'
import { todayKey } from '../lib/dates.js'

const StoreContext = createContext(null)
const DispatchContext = createContext(null)

function withDoc(state, doc) {
  return { ...state, doc }
}

function reducer(state, action) {
  let next

  switch (action.type) {

    // ── El paseo de hoy ──
    case 'LOG_WALK': {
      const date = action.date ?? todayKey()
      const memberId = action.memberId ?? assignedWalker(date, state.doc)
      if (!memberId) return state
      const now = new Date().toISOString()
      next = withDoc(state, {
        ...state.doc,
        walks: {
          ...state.doc.walks,
          [date]: { status: 'walked', memberId, walkedAt: now, loggedBy: state.currentMemberId, updatedAt: now },
        },
      })
      next = { ...next, celebration: { memberId, at: now } }
      break
    }

    case 'MARK_MISSED': {
      const date = action.date ?? todayKey()
      const now = new Date().toISOString()
      next = withDoc(state, {
        ...state.doc,
        walks: {
          ...state.doc.walks,
          [date]: { status: 'missed', markedBy: state.currentMemberId, updatedAt: now },
        },
      })
      break
    }

    // Deshacer el registro de hoy (toque accidental). 'cleared' se sincroniza
    // como cualquier entrada pero se trata como ausencia en toda la app.
    case 'CLEAR_TODAY': {
      const date = action.date ?? todayKey()
      const now = new Date().toISOString()
      next = withDoc(state, {
        ...state.doc,
        walks: { ...state.doc.walks, [date]: { status: 'cleared', updatedAt: now } },
      })
      next = { ...next, celebration: null }
      break
    }

    // ── Peticiones ──
    case 'CREATE_REQUEST': {
      const request = createRequest(action.request)
      next = withDoc(state, { ...state.doc, requests: [...state.doc.requests, request] })
      break
    }
    case 'ACCEPT_REQUEST':
      next = withDoc(state, acceptRequest(state.doc, action.id, state.currentMemberId))
      break
    case 'DECLINE_REQUEST':
      next = withDoc(state, declineRequest(state.doc, action.id, state.currentMemberId))
      break
    case 'CANCEL_REQUEST':
      next = withDoc(state, cancelRequest(state.doc, action.id, state.currentMemberId))
      break
    case 'SWEEP_EXPIRED':
      next = withDoc(state, sweepExpired(state.doc))
      if (next.doc === state.doc) return state
      break

    // ── Miembros ──
    case 'UPSERT_MEMBER': {
      const member = { ...action.member, updatedAt: new Date().toISOString() }
      const exists = state.doc.members.find(m => m.id === member.id)
      next = withDoc(state, {
        ...state.doc,
        members: exists
          ? state.doc.members.map(m => m.id === member.id ? { ...m, ...member } : m)
          : [...state.doc.members, member],
        deletedMemberIds: (state.doc.deletedMemberIds ?? []).filter(t => (t.id ?? t) !== member.id),
      })
      break
    }
    case 'REMOVE_MEMBER':
      next = withDoc(state, {
        ...state.doc,
        members: state.doc.members.filter(m => m.id !== action.id),
        deletedMemberIds: unionTombstones(state.doc.deletedMemberIds, [{ id: action.id, ts: new Date().toISOString() }]),
      })
      break

    // ── Horario ──
    case 'SET_SCHEDULE_DAY': {
      const now = new Date().toISOString()
      next = withDoc(state, {
        ...state.doc,
        schedule: {
          days: { ...state.doc.schedule.days, [action.weekday]: action.pattern },
          updatedAt: now,
        },
      })
      break
    }

    // ── Sync ──
    case 'MERGE_REMOTE':
      next = withDoc(state, mergeDocs(state.doc, action.doc))
      break
    case 'SET_SYNC_STATUS':
      return { ...state, syncStatus: action.status, lastSyncAt: action.ts ?? state.lastSyncAt }

    // ── Identidad ──
    case 'SET_CURRENT_MEMBER':
      next = { ...state, currentMemberId: action.id }
      break

    // ── UI (transitorio) ──
    case 'SET_ACTIVE_SCREEN':
      return { ...state, activeScreen: action.screen }
    case 'OPEN_DAY_SHEET':
      return { ...state, daySheet: action.date }
    case 'CLOSE_DAY_SHEET':
      return { ...state, daySheet: null }
    case 'SET_PROFILE_MODAL':
      return { ...state, profileModalOpen: action.open }
    case 'SET_TAUNT':
      return { ...state, taunt: action.taunt }
    case 'CLEAR_TAUNT':
      return { ...state, taunt: null }
    case 'CLEAR_CELEBRATION':
      return { ...state, celebration: null }

    case 'RESET_LOCAL':
      localStorage.clear()
      return buildInitialState()

    default:
      return state
  }

  saveStore(next)
  return next
}

function buildInitialState() {
  const persisted = loadStore()
  return {
    ...persisted,
    // estado de UI, nunca se persiste
    syncStatus: 'pending',
    lastSyncAt: null,
    activeScreen: 'hilo',
    daySheet: null,
    profileModalOpen: false,
    taunt: null,
    celebration: null,
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, buildInitialState)
  return (
    <DispatchContext.Provider value={dispatch}>
      <StoreContext.Provider value={state}>
        {children}
      </StoreContext.Provider>
    </DispatchContext.Provider>
  )
}

export function useStore() {
  return useContext(StoreContext)
}

export function useDispatch() {
  return useContext(DispatchContext)
}
