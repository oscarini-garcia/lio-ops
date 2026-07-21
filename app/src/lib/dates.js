// Todas las fechas del documento son claves locales 'YYYY-MM-DD'.

export const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export function dateKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayKey() {
  return dateKey(new Date())
}

// Mediodía local: evita sorpresas de DST al sumar días
export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}

export function addDays(key, n) {
  const d = parseKey(key)
  d.setDate(d.getDate() + n)
  return dateKey(d)
}

export function weekdayOf(key) {
  return WEEKDAY_KEYS[parseKey(key).getDay()]
}

export function isWeekend(key) {
  const wd = parseKey(key).getDay()
  return wd === 0 || wd === 6
}

export function daysBetween(fromKey, toKey) {
  return Math.round((parseKey(toKey) - parseKey(fromKey)) / 86400000)
}

const DOW_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DOW_ES_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MONTH_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MONTH_ES_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function fmtShort(key) {
  const d = parseKey(key)
  return `${DOW_ES[d.getDay()]} ${d.getDate()}`
}

export function fmtDow(key) {
  return DOW_ES[parseKey(key).getDay()]
}

export function fmtLong(key) {
  const d = parseKey(key)
  const dow = DOW_ES_LONG[d.getDay()]
  return `${dow.charAt(0).toUpperCase() + dow.slice(1)}, ${d.getDate()} de ${MONTH_ES[d.getMonth()]}`
}

export function fmtDayMonth(key) {
  const d = parseKey(key)
  return `${d.getDate()} ${MONTH_ES_SHORT[d.getMonth()]}`
}

export function fmtMonthYear(key) {
  const d = parseKey(key)
  const m = MONTH_ES[d.getMonth()]
  return `${m.charAt(0).toUpperCase() + m.slice(1)} ${d.getFullYear()}`
}

export function fmtTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function monthOf(key) {
  return key.slice(0, 7)
}
