import React from 'react'
import { useStore } from '../hooks/useStore.jsx'
import {
  lioStreak, bestLioStreak, missedMornings, walkTotals, earlyBird, favoriteWalker, balances,
} from '../lib/stats.js'
import { todayKey, monthOf, fmtMonthYear, fmtDayMonth } from '../lib/dates.js'
import { SyncDot } from '../components/AppShell.jsx'

function memberName(doc, id) {
  return doc.members.find(m => m.id === id)?.name ?? '¿?'
}

export default function StatsScreen() {
  const { doc } = useStore()
  const today = todayKey()
  const month = monthOf(today)

  const streak = lioStreak(doc)
  const best = bestLioStreak(doc)
  const missed = missedMornings(doc, month)
  const totals = walkTotals(doc, month)
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1])
  const max = sorted[0]?.[1] ?? 1
  const early = earlyBird(doc, month)
  const fav = favoriteWalker(doc, month)
  const debts = balances(doc)

  return (
    <>
      <header className="app-head">
        <div>
          <h1>La libreta de Lio</h1>
          <p className="date">{fmtMonthYear(today)}</p>
        </div>
        <div className="spacer" />
        <SyncDot />
      </header>

      <div className="stat-grid">
        <section className="card stat">
          <h2>Racha de Lio 🔥</h2>
          <p className="big">{streak} <small>{streak === 1 ? 'día' : 'días'}</small></p>
          <p className="cap">Récord: {best} {best === 1 ? 'día' : 'días'}</p>
        </section>

        <section className="card stat">
          <h2>Se quedó en casa 😢</h2>
          <p className="big">{missed.length} <small>{missed.length === 1 ? 'mañana' : 'mañanas'}</small></p>
          <p className="cap">{missed.length > 0 ? missed.map(m => fmtDayMonth(m.date)).join(' · ') : 'Ninguna este mes 🎉'}</p>
        </section>

        <section className="card stat wide">
          <h2>Paseos este mes</h2>
          {sorted.length === 0 && <p className="cap">Aún no hay paseos registrados este mes.</p>}
          {sorted.map(([id, n]) => {
            const m = doc.members.find(x => x.id === id)
            return (
              <div className="bar-row" key={id}>
                <span className="nm">{m?.name ?? id}</span>
                <span className="bar" style={{ width: `${Math.max(8, (n / max) * 60)}%`, background: m?.color ?? 'var(--sunrise)' }} />
                <span className="n">{n}</span>
              </div>
            )
          })}
        </section>

        <section className="card stat">
          <h2>Madrugador/a 🌅</h2>
          {early ? (
            <>
              <p className="big" style={{ fontSize: '1.4rem' }}><span className="crown">👑</span> {memberName(doc, early.memberId)}</p>
              <p className="cap">Hora mediana: {early.time}</p>
            </>
          ) : <p className="cap">Sin datos aún.</p>}
        </section>

        <section className="card stat">
          <h2>Favorito/a de Lio 💕</h2>
          {fav ? (
            <>
              <p className="big" style={{ fontSize: '1.4rem' }}>🐾 {memberName(doc, fav.memberId)}</p>
              <p className="cap">{fav.walks} {fav.walks === 1 ? 'paseo' : 'paseos'} este mes</p>
            </>
          ) : <p className="cap">Lio aún no tiene favorito/a.</p>}
        </section>

        <section className="card stat wide">
          <h2>La deuda matutina ⚖️</h2>
          {debts.length === 0 && <p className="cap">Todas las cuentas en paz. Sospechoso… 🤨</p>}
          {debts.map(d => {
            const debtor = doc.members.find(m => m.id === d.debtorId)
            const creditor = doc.members.find(m => m.id === d.creditorId)
            return (
              <div key={`${d.debtorId}-${d.creditorId}`} style={{ marginBottom: '0.6rem' }}>
                <p className="cap" style={{ marginBottom: '0.2rem' }}>
                  <b>{debtor?.name} le debe {d.mornings} {d.mornings === 1 ? 'mañana' : 'mañanas'} a {creditor?.name}</b>
                </p>
                <div className="balance-meter">
                  <span style={{ flex: Math.max(d.mornings, 1), background: creditor?.color ?? 'var(--park)' }} />
                  <span style={{ flex: 1, background: debtor?.color ?? 'var(--miss)' }} />
                </div>
              </div>
            )
          })}
          <p className="cap">Los cambios van empatados — aquí solo cuentan los cubrimientos. Paga tus deudas en paseos o chuches 🦴</p>
        </section>
      </div>
    </>
  )
}
