import React from 'react'
import ReactDOM from 'react-dom/client'
import 'winesnob-design-system/styles.css'
import './styles/app.css'
import { App } from './App'
import { useStore } from './store/store'

// Dev-only handle for driving the app from the preview/debug console.
if (import.meta.env.DEV) {
  ;(window as unknown as { __store?: typeof useStore }).__store = useStore
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
