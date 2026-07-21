import { mergeDocs } from './storage.js'

const BIN_ID = import.meta.env.VITE_JSONBIN_ID
const API_KEY = import.meta.env.VITE_JSONBIN_KEY
const BASE = `https://api.jsonbin.io/v3/b/${BIN_ID}`

export function syncConfigured() {
  return !!BIN_ID && !!API_KEY
}

async function request(method, body) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Master-Key': API_KEY,
    'X-Bin-Versioning': 'false',
  }
  const bodyStr = body ? JSON.stringify(body) : undefined
  const res = await fetch(BASE, { method, headers, body: bodyStr })
  if (!res.ok) {
    let responseText = ''
    try { responseText = await res.text() } catch { /* ignore */ }
    const err = new Error(`JSONBin ${method} ${res.status}`)
    err.status = res.status
    err.responseBody = responseText
    throw err
  }
  return res.json()
}

export async function pullRemote() {
  const data = await request('GET')
  return data.record ?? data
}

export async function pushRemote(doc) {
  await request('PUT', doc)
}

// pull → merge → push, como Counter Ops. El merge por entidad hace que dos
// móviles escribiendo a la vez converjan en el siguiente ciclo.
export async function syncCycle(localDoc) {
  if (!syncConfigured()) throw new Error('VITE_JSONBIN_ID / VITE_JSONBIN_KEY sin configurar')
  const remote = await pullRemote()
  const merged = mergeDocs(localDoc, remote)
  await pushRemote(merged)
  return merged
}
