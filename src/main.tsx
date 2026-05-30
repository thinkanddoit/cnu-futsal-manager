import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'
fetch(`${serverUrl}/health`).catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
