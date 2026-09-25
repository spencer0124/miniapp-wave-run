import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Root-absolute, like the sibling miniapps: a Pages deploy answers a missing
  // relative asset with index.html at 200, which fails silently.
  base: '/',
  // Its own port, so it can run beside the other miniapps' dev servers; `host`
  // exposes it on the LAN for testing on a phone.
  server: { port: 5191, strictPort: true, host: true },
});
