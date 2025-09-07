import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import JagdStreckenliste from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <JagdStreckenliste />
  </StrictMode>,
)
