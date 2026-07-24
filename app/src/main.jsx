import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './theme.css'
import { initNative } from './lib/native.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Arranca el puente nativo (OTA + hápticos). En web no hace nada.
initNative()
