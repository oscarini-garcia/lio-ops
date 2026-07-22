import React, { lazy, Suspense } from 'react'
import { StoreProvider, useStore } from './hooks/useStore.jsx'
import AppShell from './components/AppShell.jsx'
import SyncBootstrap from './components/SyncBootstrap.jsx'
import ProfileModal from './components/ProfileModal.jsx'
import DaySheet from './components/DaySheet.jsx'
import TauntToast from './components/TauntToast.jsx'

const TodayScreen = lazy(() => import('./screens/TodayScreen.jsx'))
const WeekScreen = lazy(() => import('./screens/WeekScreen.jsx'))
const RequestsScreen = lazy(() => import('./screens/RequestsScreen.jsx'))
const StatsScreen = lazy(() => import('./screens/StatsScreen.jsx'))
const SettingsScreen = lazy(() => import('./screens/SettingsScreen.jsx'))

function ScreenRouter() {
  const { activeScreen } = useStore()
  const screens = {
    today: <TodayScreen />,
    week: <WeekScreen />,
    requests: <RequestsScreen />,
    stats: <StatsScreen />,
    settings: <SettingsScreen />,
  }
  return screens[activeScreen] ?? <TodayScreen />
}

export default function App() {
  return (
    <StoreProvider>
      <SyncBootstrap />
      <AppShell>
        <Suspense fallback={<div style={{ textAlign: 'center', color: 'var(--ink-soft)', padding: '3rem 0' }}>Cargando… Lio ya está olisqueando 🐩</div>}>
          <ScreenRouter />
        </Suspense>
      </AppShell>
      <DaySheet />
      <ProfileModal />
      <TauntToast />
    </StoreProvider>
  )
}
