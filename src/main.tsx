import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'
fetch(`${serverUrl}/health`).catch(() => {})

declare global { interface Window { Kakao: any } }
if (import.meta.env.VITE_KAKAO_JS_KEY && window.Kakao && !window.Kakao.isInitialized()) {
  window.Kakao.init(import.meta.env.VITE_KAKAO_JS_KEY)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
