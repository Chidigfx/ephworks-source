import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { configError } from './supabase'
import './styles.css'

// Shown when the deployment's Supabase settings are wrong, so visitors never get a blank page
function SetupNotice() {
  console.error(`Ephworks setup: ${configError}. Check the environment variables and redeploy.`)
  return (
    <main className="setup-notice">
      <img src="/logo.svg" alt="" width="56" height="56"/>
      <h1>Ephworks is being set up</h1>
      <p>Please check back in a few minutes.</p>
    </main>
  )
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {configError ? <SetupNotice/> : <App />}
  </React.StrictMode>
)
