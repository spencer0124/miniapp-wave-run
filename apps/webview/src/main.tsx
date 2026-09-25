import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MiniappRoot } from '@skkuverse/miniapp/react';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MiniappRoot id="wave-run" dev={import.meta.env.DEV}>
      <App />
    </MiniappRoot>
  </StrictMode>,
);
