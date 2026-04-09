Quick notes — EV Buddy client

Commands (run inside `client/`):

- Install deps: `npm install`
- Dev server: `npm run dev` (Vite)
- Build for production: `npm run build` -> produces `dist/`
- Preview build locally: `npm run preview`
- Test (single run): `npm run test`
- Test (watch): `npm run test:watch`
- Test coverage: `npm run test:coverage`

Once `dist/` exists, Flask will serve it from `client/dist` automatically at `/`.
