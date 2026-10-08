# Work log

Append newest entries at the bottom. Format: `date — change; reason; files; verified`. Summarize outcomes, not the conversation.

- 2026-10-02 — Built the Next/Tailwind portfolio landing page and coffee chat route on port 3020; introduced a playable Three.js Jamsil/Seokchon Lake setting and tower arrival. Key files: `app/page.tsx`, `app/coffee-chat/*`.
- 2026-10-02 — Refined the exterior for a smaller, more recognizable Jamsil scene: OSM-based layout, separated road/sidewalk/lower lake path, local Seoul assets, moving cars, dusk sky. Key files: `JamsilScene.ts`, `public/data/jamsil.json`, `ASSETS.md`.
- 2026-10-02 — Rebuilt the tower interior as a warm cafe with marble, walnut, real furniture assets, coffee bar and props; replaced the flat window panorama with layered 3D skyline geometry. Added a fictional seated host image and a single coffee invitation. Key files: `TowerLobby.ts`, `LobbySkyline.ts`, `PortfolioCity.tsx`, `public/lobby-assets/`. Desktop/mobile visual checks, lint, and production build passed.
- 2026-10-02 — Added asset credits and setup docs, committed as `1c0f45a`, and pushed `main` to `git@github.com:byoungyoon/pf.git`.
- 2026-10-08 — Created this compact agent-only knowledge base and linked it from `AGENTS.md`; records current architecture and concise chronological changes. Files: `kb/README.md`, `kb/LOG.md`, `AGENTS.md`.
