import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import '@coreui/coreui/dist/css/coreui.min.css'
import '@coreui/coreui/dist/css/coreui.min.css';
import './tableTheme.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
