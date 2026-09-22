import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthGate } from './components/AuthGate.tsx'
import { AuthProvider } from './state/auth.tsx'
import { LarderProvider } from './state/store.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AuthGate>
        <LarderProvider>
          <App />
        </LarderProvider>
      </AuthGate>
    </AuthProvider>
  </StrictMode>,
)
