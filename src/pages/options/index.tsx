import '@pages/options/index.css'
import Options from '@pages/options/Options'
import { createRoot } from 'react-dom/client'

function init() {
  const appContainer = document.querySelector('#app-container')
  if (!appContainer) {
    throw new Error('Can not find #app-container')
  }
  const root = createRoot(appContainer)
  root.render(<Options />)
}

init()
