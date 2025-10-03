import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './App.css'

console.log('main.tsx: Starting React app...')
console.log('main.tsx: Root element:', document.getElementById('root'))

const root = ReactDOM.createRoot(document.getElementById('root')!)
console.log('main.tsx: React root created:', root)

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

console.log('main.tsx: React app rendered')
