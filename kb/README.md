# Agent memory — portfolio

Read this first; use `LOG.md` for history. Source code and `ASSETS.md` remain authoritative. Keep this file short; append work to `LOG.md` after meaningful changes.

## Current state

- Stack: Next.js 16 App Router, React 19, Tailwind CSS 4, Three.js. `npm run dev` serves port 3020.
- `/` is the portfolio landing page. `/coffee-chat` is a walkable Jamsil/Seokchon Lake scene with a cinematic transition into a fictional tower cafe.
- Scene files: `JamsilScene.ts` builds the exterior; `PortfolioCity.tsx` owns camera, movement, UI, and phase changes; `TowerLobby.ts` builds the cafe; `LobbySkyline.ts` builds 3D geometry outside its window.
- Cafe host: `public/lobby-assets/fictional-host-seated.png` is a fictional transparent image on a camera-facing plane, seated on a 3D chair. It is not the owner's likeness or a full 3D human model.
- Coffee contact: `NEXT_PUBLIC_COFFEE_CHAT_URL` must be an `https://` or `mailto:` URL. Without it, the invitation is a preview.
- Asset provenance and location accuracy limits: `ASSETS.md`. Poly Haven downloader: `scripts/download-lobby-assets.mjs`. Local experiments excluded by `.gitignore` are not required by the app.
- Repository: `main` tracks `git@github.com:byoungyoon/pf.git`. Do not assume each future change should be pushed unless the current request or existing authorization covers it.

## Checks

`npm run lint`; `NEXT_BUILD_DIR=.next-build-check npm run build -- --webpack`. For visual work, inspect desktop and mobile `/coffee-chat`, including the cafe invitation and a clear view after closing it.
