import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
// Import package.json - use local react-fe version for Docker compatibility
import packageJson from '../package.json'

console.log('App version:', packageJson.version)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
