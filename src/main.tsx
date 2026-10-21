import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Ancizar Serif is served from our own bundle (same origin, hashed and cached)
// instead of Google Fonts via a CSS @import - that chain (HTML -> CSS -> Google
// CSS -> font file) is why the page used to paint in the wider fallback font
// first and then jump when the real one arrived. latin-ext carries symbols
// like the rupee sign.
import '@fontsource/ancizar-serif/latin-400.css'
import '@fontsource/ancizar-serif/latin-500.css'
import '@fontsource/ancizar-serif/latin-600.css'
import '@fontsource/ancizar-serif/latin-700.css'
import '@fontsource/ancizar-serif/latin-ext-400.css'
import '@fontsource/ancizar-serif/latin-ext-500.css'
import '@fontsource/ancizar-serif/latin-ext-600.css'
import '@fontsource/ancizar-serif/latin-ext-700.css'
import './index.css'
import App from './App.tsx'

const root = createRoot(document.getElementById('root')!)

const render = () =>
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

// Hold the first paint until the weights the UI uses are in, so text never
// shows in the fallback font and then reflows. Capped, so a slow or failed
// font request can never keep the app from appearing (it just falls back to
// the old swap behaviour for that visit).
const FONT_WAIT_MS = 1500
const fontsReady = document.fonts
  ? Promise.all(['400', '500', '600', '700'].map((w) => document.fonts.load(`${w} 1em "Ancizar Serif"`)))
  : Promise.resolve()

Promise.race([fontsReady, new Promise((resolve) => setTimeout(resolve, FONT_WAIT_MS))])
  .catch(() => {})
  .then(render)
