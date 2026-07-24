import React, { lazy, Suspense } from 'react'
import { StoreProvider, useStore } from './hooks/useStore.jsx'
import AppShell from './components/AppShell.jsx'
import SyncBootstrap from './components/SyncBootstrap.jsx'
import ProfileModal from './components/ProfileModal.jsx'
import DaySheet from './components/DaySheet.jsx'
import TauntToast from './components/TauntToast.jsx'

const HiloScreen = lazy(() => import('./screens/HiloScreen.jsx'))
const RequestsScreen = lazy(() => import('./screens/RequestsScreen.jsx'))
const StatsScreen = lazy(() => import('./screens/StatsScreen.jsx'))
const SettingsScreen = lazy(() => import('./screens/SettingsScreen.jsx'))

function ScreenRouter() {
  const { activeScreen } = useStore()
  const screens = {
    hilo: <HiloScreen />,
    bandeja: <RequestsScreen />,
    datos: <StatsScreen />,
    familia: <SettingsScreen />,
  }
  return screens[activeScreen] ?? <HiloScreen />
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
